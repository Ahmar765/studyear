
'use server';

import { z } from "zod";
import { generateDiagnosticReport, DiagnosticReport } from "@/server/ai/flows/diagnostic-report-generation";
import { adminDb } from "@/lib/firebase/admin-app";
import * as admin from 'firebase-admin';
import { savedResourceService } from "../services/resources";
import { runStudYearAction } from "../services/pipeline";

const SubjectConfidenceSchema = z.object({
  subjectId: z.string(),
  confidence: z.number().min(0).max(100),
});

const GenerateDiagnosticBodySchema = z.object({
  userId: z.string().min(1, 'User ID is required.'),
  subjects: z.array(SubjectConfidenceSchema).min(1, 'Add at least one subject in profile setup.'),
});

export async function generateDiagnosticReportAction(
  input: z.infer<typeof GenerateDiagnosticBodySchema>,
): Promise<{ success: boolean; report?: DiagnosticReport; diagnosticId?: string; error?: string }> {
    const parsed = GenerateDiagnosticBodySchema.safeParse(input);
    if (!parsed.success) {
        const msg = parsed.error.flatten().fieldErrors.subjects?.[0]
            ?? parsed.error.flatten().fieldErrors.userId?.[0]
            ?? 'Invalid request.';
        return { success: false, error: msg };
    }
    const { userId, subjects } = parsed.data;

    try {
        const result = await runStudYearAction({
            userId,
            studentId: userId,
            entityType: 'DIAGNOSTIC_REPORT',
            action: 'DIAGNOSTIC_COMPLETED',
            eventType: 'DIAGNOSTIC_COMPLETED',
            stage: 'ASSESS',
            featureKey: 'AI_STUDY_PLAN', // Diagnostics are part of the planning feature set
            payload: { subjects },
            execute: async () => {
                const report = await generateDiagnosticReport({ subjects });
                
                const diagnosticRef = adminDb.collection('diagnostic_results').doc();
                await diagnosticRef.set({
                    userId: userId,
                    studentId: userId,
                    subjects: subjects,
                    ...report,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                await savedResourceService.save({
                    studentId: userId,
                    type: 'DIAGNOSTIC_REPORT',
                    title: 'My Academic Diagnostic Report',
                    content: report,
                    sourceInput: JSON.stringify(subjects),
                    linkedEntityId: diagnosticRef.id,
                });
                
                await adminDb.collection('users').doc(userId).update({
                    diagnosticComplete: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                return { report, diagnosticId: diagnosticRef.id };
            }
        });
        
        return { success: true, ...result.result };

    } catch (error: any) {
        console.error("Error generating diagnostic report:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}

    