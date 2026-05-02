
'use server';

import { generateProgressReport, GenerateProgressReportInput } from "@/server/ai/flows/progress-report-generation";
import { adminDb } from '@/lib/firebase/admin-app';
import { getUserProfileServer } from "@/server/services/user";
import { AIGatewayService } from "../services/ai-gateway";
import { randomUUID } from "crypto";
import { AIRequestContext, AIUserInput } from "../ai/gateway-schema";

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
            const score = data.scorePercent;
            if (subject && typeof score === 'number') {
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


export async function generateProgressReportAction(input: GenerateProgressReportInput) {
    try {
        const gateway = new AIGatewayService();
        const context: AIRequestContext = {
            requestId: randomUUID(),
            userId: input.studentName, // Assuming studentName is userId for now
            taskType: 'AI_STUDY_PLAN', // Re-using this for cost
            featureName: 'ai-grade-improvement-plan',
            entitlement: 'AI_STUDY_PLAN',
            role: 'STUDENT',
            subscriptionTier: 'free', // Assume free for now, can be enhanced later
            idempotencyKey: randomUUID(),
            estimatedInputTokens: Math.ceil((JSON.stringify(input).length) / 4),
        };

        const gatewayInput: AIUserInput<GenerateProgressReportInput> = { promptPayload: input };

        const result = await gateway.execute(context, gatewayInput, generateProgressReport);
        return { success: true, report: result.output };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate progress report.";
        return { success: false, error: errorMessage };
    }
}
