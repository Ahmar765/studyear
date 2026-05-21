
'use server';

import { z } from "zod";
import {
  generateAssignmentReview,
  AssignmentReviewOutput,
  AssignmentSubmissionInput,
  AssignmentSubmissionInputSchema,
} from "../ai/flows/assignment-review-generation";
import { assignmentReviewErrorForUser } from "../lib/study-plan-errors";
import { resolveAssignmentSubmissionText } from "../lib/assignment-submission-text";
import { runStudYearAction } from "../services/pipeline";
import {
  generateAssignmentReviewVisuals,
  type GeneratedReviewVisual,
  type GeneratedReviewVisual,
} from "../services/assignment-review-visuals";
import { adminDb } from "@/lib/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { storeGeneratedImageUrl, stripNonPersistableImageFields } from "../lib/visual-image-storage";

async function persistReviewVisualImages(
  visuals: GeneratedReviewVisual[],
  userId: string,
  submissionId: string,
): Promise<{ client: GeneratedReviewVisual[]; firestore: GeneratedReviewVisual[] }> {
  const client: GeneratedReviewVisual[] = [];
  const firestore: GeneratedReviewVisual[] = [];

  for (let index = 0; index < visuals.length; index++) {
    const visual = visuals[index];
    if (!visual.imageUrl) {
      client.push(visual);
      firestore.push(visual);
      continue;
    }
    const stored = await storeGeneratedImageUrl(visual.imageUrl, {
      userId,
      id: `${submissionId}-visual-${index}`,
      folder: `studyear/assignment-review/${userId}`,
    });
    client.push({
      ...visual,
      imageUrl: stored.displayUrl ?? stored.firestoreUrl ?? undefined,
    });
    firestore.push(stripNonPersistableImageFields(visual, stored.firestoreUrl));
  }

  return { client, firestore };
}

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
    (d) =>
      (d.pastedText?.trim().length ?? 0) >= 100 ||
      Boolean(d.attachmentUrl?.trim()) ||
      Boolean(d.attachmentName?.trim()),
    { message: 'Paste at least 100 characters or attach a file.' },
  );

export type { AssignmentReviewOutput };

export type AssignmentReviewResult = AssignmentReviewOutput & {
  generatedVisuals?: GeneratedReviewVisual[];
};

export async function submitAssignmentForReviewAction(input: z.infer<typeof ActionSchema>): Promise<{ success: boolean; review?: AssignmentReviewResult; error?: string; }> {
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
    const attachmentName = validatedData.data.attachmentName?.trim();

    let submissionText: string;
    try {
        const resolved = await resolveAssignmentSubmissionText({
          pastedText,
          attachmentUrl,
          attachmentName,
        });
        submissionText = resolved.text;
    } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Could not read your submission.',
        };
    }

    const aiPayload: AssignmentSubmissionInput = {
        title: validatedData.data.title.trim(),
        type: validatedData.data.type,
        subject: validatedData.data.subject.trim(),
        studyLevel: validatedData.data.studyLevel.trim(),
        pastedText: submissionText,
    };

    const aiParsed = AssignmentSubmissionInputSchema.safeParse(aiPayload);
    if (!aiParsed.success) {
        return {
            success: false,
            error: assignmentReviewErrorForUser(aiParsed.error),
        };
    }

    if (submissionText.length < 100) {
        return {
          success: false,
          error: 'We need at least 100 characters of assignment text. Paste more content or attach a clearer file.',
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

        const rawVisuals = await generateAssignmentReviewVisuals({
          specs: reviewData.recommendedVisuals ?? [],
          userId,
          studentId,
          subject: validatedData.data.subject.trim(),
          studyLevel: validatedData.data.studyLevel.trim(),
        });

        const { client: clientVisuals, firestore: firestoreVisuals } =
          await persistReviewVisualImages(rawVisuals, userId, submissionRef.id);

        const reviewRef = adminDb.collection('assignment_reviews').doc(submissionRef.id);
        await reviewRef.set({
            submissionId: submissionRef.id,
            studentId,
            userId,
            ...reviewData,
            generatedVisuals: firestoreVisuals,
            createdAt: Timestamp.now(),
        });

        await submissionRef.update({ status: "COMPLETED", updatedAt: Timestamp.now() });

        return {
          success: true,
          review: {
            ...reviewData,
            generatedVisuals: clientVisuals,
          },
        };
    } catch (error: unknown) {
        const detail =
            error instanceof Error ? error.stack ?? error.message : String(error);
        console.error("Error in submitAssignmentForReviewAction:", detail);
        return { success: false, error: assignmentReviewErrorForUser(error) };
    }
}
