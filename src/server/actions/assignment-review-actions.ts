
'use server';

import { z } from "zod";
import {
  generateAssignmentReview,
  AssignmentReviewOutput,
  AssignmentSubmissionInput,
  AssignmentSubmissionInputSchema,
} from "../ai/flows/assignment-review-generation";
import { assignmentReviewErrorForUser } from "../lib/study-plan-errors";
import { runStudYearAction } from "../services/pipeline";
import { adminDb } from "@/lib/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

const assignmentTypes = ["HOMEWORK", "ASSIGNMENT", "ESSAY", "COURSEWORK", "REPORT", "DISSERTATION", "THESIS", "PERSONAL_STATEMENT", "OTHER"];

const ActionSchema = z
  .object({
    userId: z.string(),
    studentId: z.string(),
    title: z.string().min(5),
    type: z.enum(assignmentTypes as [string, ...string[]]),
    subject: z.string().min(1, "Choose a subject."),
    studyLevel: z.string().min(1, "Choose your study level."),
    pastedText: z.string().optional(),
    attachmentUrl: z.string().url().optional().or(z.literal('')),
    attachmentName: z.string().optional(),
  })
  .refine(
    (d) => (d.pastedText?.trim().length ?? 0) >= 100 || Boolean(d.attachmentUrl?.trim()),
    { message: 'Paste at least 100 characters or attach a file.' },
  );

export type { AssignmentReviewOutput };

export async function submitAssignmentForReviewAction(input: z.infer<typeof ActionSchema>): Promise<{ success: boolean; review?: AssignmentReviewOutput; error?: string; }> {
    const validatedData = ActionSchema.safeParse(input);
    if (!validatedData.success) {
        return {
            success: false,
            error: assignmentReviewErrorForUser(validatedData.error),
        };
    }

    const { userId, studentId, type } = validatedData.data;

    const pastedText = validatedData.data.pastedText?.trim() ?? '';
    const attachmentUrl = validatedData.data.attachmentUrl?.trim() || undefined;

    const aiPayload: AssignmentSubmissionInput = {
        title: validatedData.data.title.trim(),
        type: validatedData.data.type,
        subject: validatedData.data.subject.trim(),
        studyLevel: validatedData.data.studyLevel.trim(),
        pastedText:
          pastedText.length >= 100
            ? pastedText
            : `[See attached file: ${attachmentUrl ?? 'uploaded document'}]\n\n${pastedText}`.trim(),
    };

    const aiParsed = AssignmentSubmissionInputSchema.safeParse(aiPayload);
    if (!aiParsed.success) {
        return {
            success: false,
            error: assignmentReviewErrorForUser(aiParsed.error),
        };
    }
    
    let featureKey: "AI_ASSIGNMENT_REVIEW" | "AI_ESSAY_REVIEW" | "AI_DISSERTATION_REVIEW" = "AI_ASSIGNMENT_REVIEW";
    if (type === "ESSAY") featureKey = "AI_ESSAY_REVIEW";
    if (type === "DISSERTATION" || type === "THESIS") featureKey = "AI_DISSERTATION_REVIEW";

    try {
        const submissionRef = adminDb.collection("assignment_submissions").doc();
        await submissionRef.set({
            ...validatedData.data,
            pastedText,
            attachmentUrl: attachmentUrl ?? null,
            attachmentName: validatedData.data.attachmentName ?? null,
            status: "PROCESSING",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        
        const result = await runStudYearAction({
            userId,
            studentId,
            featureKey,
            entityType: 'ASSIGNMENT_REVIEW',
            action: 'SUBMIT_ASSIGNMENT',
            eventType: 'RESOURCE_GENERATED',
            stage: 'PRACTISE',
            payload: validatedData.data,
            execute: () => generateAssignmentReview(aiParsed.data),
        });

        const reviewData = result.result;

        const reviewRef = adminDb.collection('assignment_reviews').doc(submissionRef.id);
        await reviewRef.set({
            submissionId: submissionRef.id,
            studentId,
            userId,
            ...reviewData,
            createdAt: Timestamp.now(),
        });

        await submissionRef.update({ status: "COMPLETED", updatedAt: Timestamp.now() });

        return { success: true, review: reviewData };
    } catch (error: unknown) {
        const detail =
            error instanceof Error ? error.stack ?? error.message : String(error);
        console.error("Error in submitAssignmentForReviewAction:", detail);
        return { success: false, error: assignmentReviewErrorForUser(error) };
    }
}
