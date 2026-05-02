
'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getPersonalizedRecommendations, PersonalizedRecommendationsInput } from "@/server/ai/flows/personalized-recommendations";
import { AIGatewayService } from "../services/ai-gateway";
import { randomUUID } from "crypto";
import type { AIRequestContext, AIUserInput } from "../ai/gateway-schema";
import { getUserProfileServer } from "../services/user";
import { HttpsError } from "../lib/errors";
import { getStudentProgressAction } from "./progress-actions";
import { adminDb } from "@/lib/firebase/admin-app";
import { differenceInCalendarDays } from 'date-fns';

// This is the new structure for the recommendation object
interface Recommendation {
  title: string;
  reason: string;
}

// This is the new return type for our action
export interface DashboardRecommendations {
    status: 'READY' | 'PROFILE_INCOMPLETE' | 'DIAGNOSTIC_REQUIRED';
    recommendations: Recommendation[];
    savedAt?: string | null;
    fromCache?: boolean;
}

const dashboardUserIdSchema = z.object({
    userId: z.string().min(1, 'User ID is required.'),
    regenerate: z.boolean().optional(),
});

/** User-facing detail when the Gemini / gateway pipeline fails (server logs keep full error). */
function intelligenceBriefingFailureReason(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV === 'development') {
        return raw;
    }
    const lower = raw.toLowerCase();
    if (/api key|api_key|401|403|permission|denied|unauthorized|invalid[_ ]key/i.test(lower)) {
        return 'The AI provider rejected the request (check GEMINI_API_KEY and API access on the server).';
    }
    if (/model|not found|404|deprecated|shutdown|does not exist|unsupported/i.test(lower)) {
        return 'The configured AI model may be unavailable. Update Gemini model IDs in Admin → Settings (system_settings) or use current defaults (e.g. gemini-2.5-flash).';
    }
    if (/quota|resource_exhausted|429|rate/i.test(lower)) {
        return 'The AI provider quota or rate limit was hit. Try again in a few minutes.';
    }
    return 'There was an issue connecting to the AI service. Please try again later.';
}

async function persistIntelligenceBriefing(
    userId: string,
    payload: { status: DashboardRecommendations['status']; recommendations: Recommendation[] },
): Promise<void> {
    if (payload.status !== 'READY' || payload.recommendations.length === 0) return;
    await adminDb.collection('intelligence_briefings').doc(userId).set(
        {
            status: payload.status,
            recommendations: payload.recommendations,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
    );
}

export async function getDashboardRecommendationsAction(
    params: { userId: string; regenerate?: boolean },
): Promise<DashboardRecommendations> {
    const parsed = dashboardUserIdSchema.safeParse(params);
    if (!parsed.success) {
        throw new HttpsError('invalid-argument', parsed.error.flatten().fieldErrors.userId?.[0] ?? 'Invalid request.');
    }
    const { userId, regenerate } = parsed.data;

    const studentProfile = await getUserProfileServer(userId);
    if (!studentProfile) {
        return {
            status: 'READY',
            recommendations: [{
                title: 'Could not load your profile',
                reason:
                    'The server could not read your Firestore profile (often missing or invalid Admin credentials locally). ' +
                    'Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path or add FIREBASE_SERVICE_ACCOUNT_JSON to .env, then restart the dev server.',
            }],
            savedAt: null,
            fromCache: false,
        };
    }

    // Check 1: Profile Incomplete
    if (!studentProfile.studyLevel || !studentProfile.subjects || studentProfile.subjects.length === 0) {
        return {
            status: 'PROFILE_INCOMPLETE',
            recommendations: [{
                title: "Complete your academic profile",
                reason: "StudYear needs your study level and subjects to personalise recommendations."
            }]
        };
    }
    
    // Check 2: Diagnostic Required
    if (!studentProfile.diagnosticComplete) {
         return {
            status: 'DIAGNOSTIC_REQUIRED',
            recommendations: [{
                title: "Complete your diagnostic assessment",
                reason: "This allows our AI to identify your strengths and weaknesses to create a baseline."
            }]
        };
    }

    if (!regenerate) {
        const cached = await adminDb.collection('intelligence_briefings').doc(userId).get();
        if (cached.exists) {
            const data = cached.data();
            const recs = data?.recommendations as Recommendation[] | undefined;
            const st = data?.status as DashboardRecommendations['status'] | undefined;
            if (st === 'READY' && Array.isArray(recs) && recs.length > 0) {
                const updatedAt = data?.updatedAt as admin.firestore.Timestamp | undefined;
                const savedAt = updatedAt?.toDate?.()?.toISOString() ?? null;
                return { status: 'READY', recommendations: recs, savedAt, fromCache: true };
            }
        }
    }

    // All checks passed, generate AI recommendations
    try {
        const progressData = await getStudentProgressAction(userId);
        if (progressData.length === 0) {
            const payload: DashboardRecommendations = {
                status: 'READY',
                recommendations: [{
                    title: "Start Learning!",
                    reason: "Complete some quizzes or study tasks so our AI can learn about your progress and provide better recommendations."
                }],
                savedAt: new Date().toISOString(),
                fromCache: false,
            };
            await persistIntelligenceBriefing(userId, payload);
            return payload;
        }

        // Find weakest subject
        const weakestSubjectData = progressData.reduce((weakest, current) => {
            return (current.progress < weakest.progress) ? current : weakest;
        }, progressData[0]);


        const gateway = new AIGatewayService();
        const context: AIRequestContext = {
            requestId: randomUUID(),
            userId,
            taskType: 'recommendation',
            featureName: 'personalized-recommendations',
            role: 'student',
            subscriptionTier: studentProfile.subscription || 'free',
            idempotencyKey: randomUUID(),
            estimatedInputTokens: 100, // Small input
        };
        const gatewayInput: AIUserInput<PersonalizedRecommendationsInput> = {
            promptPayload: {
                subject: weakestSubjectData.name,
                level: studentProfile.studyLevel
            },
        };

        const result = await gateway.execute(context, gatewayInput, getPersonalizedRecommendations);

        const mappedRecommendations = result.output.recommendations.map(rec => ({
            title: rec.recommendation,
            reason: rec.reasoning,
        }));

        const payload: DashboardRecommendations = {
            status: 'READY',
            recommendations: mappedRecommendations,
            savedAt: new Date().toISOString(),
            fromCache: false,
        };
        await persistIntelligenceBriefing(userId, payload);
        return payload;

    } catch (error: unknown) {
        console.error('Intelligence briefing AI error:', error);
        return {
            status: 'READY',
            recommendations: [{
                title: 'Could not generate AI recommendations',
                reason: intelligenceBriefingFailureReason(error),
            }],
        };
    }
}

export async function getStudentDashboardStatsAction(params: {
    userId: string;
}): Promise<{
    stats: {
        studyStreak: number;
        lessonsCompleted: number;
        weakestSubject: string;
        predictedGrade: string;
    };
    error: string | null;
}> {
    const parsed = dashboardUserIdSchema.safeParse(params);
    if (!parsed.success) {
        return {
            stats: { studyStreak: 0, lessonsCompleted: 0, weakestSubject: 'N/A', predictedGrade: 'N/A' },
            error: parsed.error.flatten().fieldErrors.userId?.[0] ?? 'Invalid request.',
        };
    }
    const { userId } = parsed.data;

    try {
        const [dashboardStateSnap, lessonsCompletedSnap, sessionsSnap] = await Promise.all([
            adminDb.collection('student_dashboard_states').doc(userId).get(),
            adminDb.collection('learning_events').where('studentId', '==', userId).where('type', '==', 'LESSON_COMPLETED').count().get(),
            adminDb.collection('users').doc(userId).collection('sessions').orderBy('startedAt', 'desc').get()
        ]);
        
        const dashboardState = dashboardStateSnap.exists ? dashboardStateSnap.data() : {};
        const weakestSubject = dashboardState?.weakSubjects?.[0]?.name || 'N/A';
        const lessonsCompleted = lessonsCompletedSnap.data().count;

        // Calculate study streak
        let studyStreak = 0;
        if (!sessionsSnap.empty) {
            const sessionDates = sessionsSnap.docs
                .map(doc => doc.data().startedAt.toDate())
                .filter((date, index, self) => 
                    index === self.findIndex(d => 
                        d.getFullYear() === date.getFullYear() &&
                        d.getMonth() === date.getMonth() &&
                        d.getDate() === date.getDate()
                    )
                );

            if (sessionDates.length > 0) {
                const today = new Date();
                const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                let lastDate = todayUTC;

                // Check if there's a session today or yesterday
                if (differenceInCalendarDays(todayUTC, sessionDates[0]) <= 1) {
                    studyStreak = 1;
                    lastDate = sessionDates[0];

                    for (let i = 1; i < sessionDates.length; i++) {
                        const diff = differenceInCalendarDays(lastDate, sessionDates[i]);
                        if (diff === 1) {
                            studyStreak++;
                            lastDate = sessionDates[i];
                        } else if (diff > 1) {
                            break; // Gap in days
                        }
                        // If diff is 0, it's the same day, so we continue
                    }
                }
            }
        }

        return {
            stats: {
                studyStreak,
                lessonsCompleted,
                weakestSubject,
                predictedGrade: dashboardState?.predictedGrade || 'N/A'
            },
            error: null
        };
    } catch (error: any) {
        console.error('Error fetching student dashboard stats:', error);
        return { stats: { studyStreak: 0, lessonsCompleted: 0, weakestSubject: 'N/A', predictedGrade: 'N/A' }, error: error.message };
    }
}
