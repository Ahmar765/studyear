
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '../lib/errors';
import { getCurrentUser } from '../lib/auth';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { savedResourceService } from '../services/resources';

export async function getResourceCountsAction(): Promise<Record<string, number>> {
  try {
    const countsSnapshot = await adminDb.collection('resourceCounts').get();
    if (countsSnapshot.empty) {
      return {};
    }
    const counts: Record<string, number> = {};
    countsSnapshot.forEach(doc => {
      counts[doc.id] = doc.data().total || 0;
    });
    return counts;
  } catch (error) {
    console.error("Error fetching resource counts:", error);
    return {};
  }
}

export async function getResourcesByTypeAction(type: string): Promise<{ success: boolean; resources?: any[]; error?: string }> {
  try {
    const q = adminDb.collection('resources')
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(50);
      
    const snapshot = await q.get();
    if (snapshot.empty) {
      return { success: true, resources: [] };
    }

    const resources = snapshot.docs.map(doc => {
      const data = doc.data();
      // Strip creator identity for privacy
      const { createdBy, ...safeResource } = data;
      return {
        id: doc.id,
        ...safeResource,
        createdAt: (data.createdAt as admin.firestore.Timestamp).toDate().toISOString(),
      };
    });
    
    return { success: true, resources };
  } catch (error: any) {
    console.error(`Error fetching resources of type ${type}:`, error);
    return { success: false, error: error.message };
  }
}

export async function saveUserResourceAction(resourceId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!userId) {
            throw new HttpsError('unauthenticated', 'You must be logged in to save a resource.');
        }

        const resourceRef = adminDb.collection('resources').doc(resourceId);
        const resourceSnap = await resourceRef.get();

        if (!resourceSnap.exists) {
            throw new HttpsError('not-found', 'The resource you are trying to save does not exist.');
        }

        const resourceData = resourceSnap.data()!;

        await savedResourceService.save({
            studentId: userId,
            type: resourceData.type,
            title: resourceData.title,
            content: resourceData,
            linkedEntityId: resourceId,
            skipGlobalPublish: true,
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error saving resource for user:", error);
        return { success: false, error: error.message };
    }
}

const ContributionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  description: z.string().optional(),
  url: z.string().url("Please provide a valid URL."),
  type: z.enum(["PAST_PAPER", "VIDEO"]),
  subjectId: z.string().min(1, "Please select a subject."),
  examBoard: z.string().min(1, "Please select an exam board."),
  level: z.string().min(1, "Please select a level."),
});

export async function contributeResourceAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'You must be logged in to contribute.' };
    }

    const validation = ContributionSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        url: formData.get('url'),
        type: formData.get('type'),
        subjectId: formData.get('subjectId'),
        examBoard: formData.get('examBoard'),
        level: formData.get('level'),
    });

    if (!validation.success) {
        return { success: false, error: validation.error.flatten().formErrors.join(', ') };
    }

    const { title, description, url, type, subjectId, examBoard, level } = validation.data;

    try {
        const uploadRef = adminDb.collection('resource_uploads').doc();
        await uploadRef.set({
            uploadedById: user.uid,
            type,
            title,
            description,
            videoUrl: type === 'VIDEO' ? url : null,
            fileUrl: type === 'PAST_PAPER' ? url : null, // Using URL for now
            subject: subjectId, // Use subjectId from form as the main subject identifier
            examBoard,
            level,
            approvalStatus: 'PENDING',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error creating resource contribution:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}
