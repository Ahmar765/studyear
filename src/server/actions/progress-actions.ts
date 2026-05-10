
'use server';

import {
  generateProgressReport,
  GenerateProgressReportInput,
  GenerateProgressReportOutputSchema,
  type GenerateProgressReportOutput,
} from "@/server/ai/flows/progress-report-generation";
import { adminDb } from '@/lib/firebase/admin-app';
import { getUserProfileServer } from "@/server/services/user";
import { AIGatewayService } from "../services/ai-gateway";
import { randomUUID } from "crypto";
import { AIRequestContext, AIUserInput } from "../ai/gateway-schema";
import { getVerifiedUser } from '@/server/lib/auth';
import * as admin from 'firebase-admin';

function coerceScorePercent(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function getStudentProgressAction(userId: string) {
    try {
        const [studentProfile, attemptsSnapshot] = await Promise.all([
            getUserProfileServer(userId),
            adminDb.collection('quiz_attempts').where('studentId', '==', userId).get()
        ]);

        const progressBySubject: Record<string, { totalScore: number, count: number }> = {};
        const allSubjects = new Set<string>();

        // Get all subjects from quiz attempts
        attemptsSnapshot.forEach(doc => {
            const data = doc.data();
            const subject = data.subjectId;
            const score = coerceScorePercent(data.scorePercent);
            if (subject && score !== null) {
                allSubjects.add(subject);
                if (!progressBySubject[subject]) {
                    progressBySubject[subject] = { totalScore: 0, count: 0 };
                }
                progressBySubject[subject].totalScore += score;
                progressBySubject[subject].count++;
            }
        });

        // Get subjects from profile to merge target grades and include subjects with 0 progress
        const profileSubjects = new Map<string, string>();
        if (studentProfile?.subjects) {
            studentProfile.subjects.forEach(s => {
                const subjectName = typeof s === 'string' ? s : (s as any).name || (s as any).subjectId;
                if (subjectName) {
                    allSubjects.add(subjectName);
                    profileSubjects.set(subjectName, (s as any).targetGrade || 'N/A');
                }
            });
        }
        
        const chartData = Array.from(allSubjects).map(subjectName => {
            const progressData = progressBySubject[subjectName];
            const progress = progressData ? Math.round(progressData.totalScore / progressData.count) : 0;
            const targetGrade = profileSubjects.get(subjectName) || 'N/A';
            return {
                name: subjectName,
                progress: progress,
                targetGrade: targetGrade
            };
        });

        return chartData;

    } catch(error) {
        console.error("Error getting student progress:", error);
        return [];
    }
}


export async function generateProgressReportAction(
    input: GenerateProgressReportInput,
    idToken?: string | null,
) {
    const authUser = await getVerifiedUser(idToken);
    if (!authUser || authUser.uid !== input.studentName) {
        return { success: false as const, error: 'Not authenticated.' };
    }

    try {
        const gateway = new AIGatewayService();
        const context: AIRequestContext = {
            requestId: randomUUID(),
            userId: input.studentName,
            taskType: 'AI_STUDY_PLAN', // Re-using this for cost
            featureName: 'ai-grade-improvement-plan',
            entitlement: 'AI_STUDY_PLAN',
            role: 'student',
            subscriptionTier: 'free', // Assume free for now, can be enhanced later
            idempotencyKey: randomUUID(),
            estimatedInputTokens: Math.ceil((JSON.stringify(input).length) / 4),
        };

        const gatewayInput: AIUserInput<GenerateProgressReportInput> = { promptPayload: input };

        const result = await gateway.execute(context, gatewayInput, generateProgressReport);
        const report = result.output;

        await adminDb
            .collection('grade_improvement_plans')
            .doc(authUser.uid)
            .set(
                {
                    report,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
            );

        return { success: true as const, report };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate progress report.";
        return { success: false as const, error: errorMessage };
    }
}

export async function getSavedGradeImprovementPlanAction(
    idToken?: string | null,
): Promise<{ report: GenerateProgressReportOutput | null; error?: string }> {
    const user = await getVerifiedUser(idToken);
    if (!user) {
        return { report: null, error: 'Not authenticated.' };
    }

    try {
        const snap = await adminDb.collection('grade_improvement_plans').doc(user.uid).get();

        if (!snap.exists) {
            return { report: null };
        }

        const raw = snap.data()?.report;
        const parsed = GenerateProgressReportOutputSchema.safeParse(raw);
        return { report: parsed.success ? parsed.data : null };
    } catch (error) {
        console.error('getSavedGradeImprovementPlanAction:', error);
        return { report: null, error: error instanceof Error ? error.message : 'Failed to load saved plan.' };
    }
}
