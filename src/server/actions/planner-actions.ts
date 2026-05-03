
"use server";

import {
  generateStudyPlan,
  GenerateStudyPlanInput,
  GenerateStudyPlanInputSchema,
  GenerateStudyPlanOutput,
} from "@/server/ai/flows/study-plan-generation";
import { DiagnosticReportSchema } from "@/server/ai/flows/diagnostic-report-generation";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin-app";
import * as admin from 'firebase-admin';
import type { DocumentData } from 'firebase-admin/firestore';
import { HttpsError } from "../lib/errors";
import { getUserProfileServer } from '../services/user';
import { runPaidAIFeature } from "../services/run-paid-ai-feature";
import { savedResourceService } from "../services/resources";
import { studyPlanErrorForUser } from "../lib/study-plan-errors";

const GeneratePlanSchema = z.object({
  subjects: z.array(z.object({
    name: z.string(),
    currentGrade: z.string().optional(),
  })).optional(),
  examDate: z.string().min(1, "Please select an exam date.").optional(),
  hoursPerWeek: z.coerce.number().int().min(1, "Please enter a valid number of hours.").optional(),
  targetGrade: z.string().min(1, "Please select a target grade.").optional(),
  weaknesses: z.string().optional(),
  strengths: z.string().optional(),
  learningStyle: z.string().optional(),
  userId: z.string().min(1, "User ID is required."),
  diagnosticId: z.string().optional(),
  examGoal: z.string().optional(),
});

export async function createStudyPlan(formData: FormData): Promise<{ success: boolean; plan?: GenerateStudyPlanOutput; error?: string; errorCode?: string }> {
  try {
    const subjects = formData.get("subjects") ? JSON.parse(formData.get("subjects") as string) : undefined;

    const validatedData = GeneratePlanSchema.parse({
      subjects,
      examDate: formData.get("examDate") || undefined,
      hoursPerWeek: formData.get("hoursPerWeek") || undefined,
      targetGrade: formData.get("targetGrade") || undefined,
      weaknesses: formData.get("weaknesses") || undefined,
      strengths: formData.get("strengths") || undefined,
      learningStyle: formData.get("learningStyle") || undefined,
      userId: formData.get("userId"),
      diagnosticId: formData.get("diagnosticId") || undefined,
      examGoal: formData.get("examGoal") || undefined,
    });

    const userProfile = await getUserProfileServer(validatedData.userId);
    if (!userProfile) {
        return {
            success: false,
            error: "We couldn't load your profile. Sign out and sign back in, then try again.",
            errorCode: 'USER_NOT_FOUND',
        };
    }

    let diagnosticRaw: DocumentData | null = null;
    if (validatedData.diagnosticId) {
        const diagnosticSnap = await adminDb.collection('diagnostic_results').doc(validatedData.diagnosticId).get();
        if (diagnosticSnap.exists) {
            diagnosticRaw = diagnosticSnap.data() ?? null;
        }
    } else {
        // Equality-only query — avoids composite index requirement; sort in memory.
        const snap = await adminDb.collection('diagnostic_results')
            .where('studentId', '==', validatedData.userId)
            .get();
        if (!snap.empty) {
            const sorted = snap.docs.slice().sort((a, b) => {
                const ta = (a.data().createdAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ?? 0;
                const tb = (b.data().createdAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ?? 0;
                return tb - ta;
            });
            diagnosticRaw = sorted[0]?.data() ?? null;
        }
    }

    let diagnosticForPlan: GenerateStudyPlanInput["diagnostic"];
    if (diagnosticRaw) {
        const parsedDiag = DiagnosticReportSchema.safeParse(diagnosticRaw);
        diagnosticForPlan = parsedDiag.success ? parsedDiag.data : undefined;
    }

    const hasSubjectList = Array.isArray(validatedData.subjects) && validatedData.subjects.length > 0;
    if (!diagnosticRaw && !hasSubjectList) {
      return {
        success: false,
        error:
          "Add your subjects in profile setup or complete an academic diagnostic first—then we can build a study plan.",
        errorCode: 'PROFILE_INCOMPLETE',
      };
    }

    const studyPlanInput: GenerateStudyPlanInput = {
        diagnostic: diagnosticForPlan,
        examDate: validatedData.examDate,
        availableHoursPerWeek: validatedData.hoursPerWeek,
        examGoal: validatedData.examGoal,
        subjects: hasSubjectList ? validatedData.subjects : undefined,
    };

    const inputParsed = GenerateStudyPlanInputSchema.safeParse(studyPlanInput);
    if (!inputParsed.success) {
        return {
            success: false,
            error: studyPlanErrorForUser(inputParsed.error),
            errorCode: "INVALID_PLAN_INPUT",
        };
    }

    const result = await runPaidAIFeature({
      userId: validatedData.userId,
      featureKey: 'AI_STUDY_PLAN',
      metadata: { studentId: validatedData.userId, action: 'createStudyPlan' },
      action: () => generateStudyPlan(inputParsed.data),
    });
    
    const planOutput = result.result;

    const studyPlanRef = adminDb.collection('study_plans').doc();
    await studyPlanRef.set({
        userId: validatedData.userId,
        studentId: validatedData.userId,
        diagnosticId: validatedData.diagnosticId || null,
        examDate: validatedData.examDate || null,
        availableHoursPerWeek: validatedData.hoursPerWeek || null,
        examGoal: validatedData.examGoal || null,
        ...planOutput,
        status: 'ACTIVE',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await savedResourceService.save({
        studentId: validatedData.userId,
        type: 'STUDY_PLAN',
        title: planOutput.title,
        content: planOutput,
        linkedEntityId: studyPlanRef.id
    });

    return { success: true, plan: planOutput };

  } catch (error: unknown) {
    const logDetail =
      error instanceof z.ZodError
        ? JSON.stringify(error.flatten())
        : error instanceof Error
          ? error.stack ?? error.message
          : String(error);
    console.error("Error creating study plan:", logDetail);
    return { success: false, error: studyPlanErrorForUser(error) };
  }
}

const GetTasksSchema = z.object({
  userId: z.string().min(1, 'User ID is required.'),
  startDate: z.string().pipe(z.coerce.date()),
  endDate: z.string().pipe(z.coerce.date()),
});

export async function getUpcomingTasksAction(params: {
  userId: string;
  startDate: string;
  endDate: string;
}): Promise<{ tasks: any[]; error: string | null }> {
    const validation = GetTasksSchema.safeParse(params);
    if (!validation.success) {
      return { tasks: [], error: validation.error.flatten().formErrors.join(', ') };
    }

    const { userId, startDate, endDate } = validation.data;

    try {
        const tasksSnapshot = await adminDb.collection('study_tasks')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .where('scheduledAt', '>=', startDate)
            .where('scheduledAt', '<=', endDate)
            .orderBy('scheduledAt', 'asc')
            .get();

        const tasks = tasksSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                subjectId: data.subjectId,
                scheduledAt: (data.scheduledAt as admin.firestore.Timestamp).toDate().toISOString(),
                priority: data.priority,
            };
        });

        return { tasks, error: null };
    } catch (error: any) {
        console.error("Error fetching upcoming tasks:", error);
        return { tasks: [], error: error.message };
    }
}
