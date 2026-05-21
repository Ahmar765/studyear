
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '../lib/errors';
import { getVerifiedUser } from '../lib/auth';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { savedResourceService } from '../services/resources';
import { formatResourceSubject } from '@/lib/resource-labels';
import { subjects } from '@/data/academic';

export async function getResourceCountsAction(): Promise<Record<string, number>> {
  try {
    const counts: Record<string, number> = {};
    const countsSnapshot = await adminDb.collection('resourceCounts').get();
    countsSnapshot.forEach((doc) => {
      counts[doc.id] = doc.data().total || 0;
    });

    /** Reconcile from live `resources` when counters are missing (e.g. legacy VIDEO rows). */
    const types = ['VIDEO', 'PAST_PAPER', 'QUIZ', 'FLASHCARD'];
    await Promise.all(
      types.map(async (type) => {
        if ((counts[type] ?? 0) > 0) return;
        try {
          const snap = await adminDb.collection('resources').where('type', '==', type).count().get();
          const n = snap.data().count;
          if (n > 0) counts[type] = n;
        } catch {
          /* index may be missing — ignore */
        }
      }),
    );

    return counts;
  } catch (error) {
    console.error("Error fetching resource counts:", error);
    return {};
  }
}

function millisFromFirestoreTimestamp(v: unknown): number {
  if (v && typeof (v as admin.firestore.Timestamp).toMillis === "function") {
    return (v as admin.firestore.Timestamp).toMillis();
  }
  return 0;
}

function isoFromFirestoreTimestamp(v: unknown): string {
  if (v && typeof (v as admin.firestore.Timestamp).toDate === "function") {
    try {
      return (v as admin.firestore.Timestamp).toDate().toISOString();
    } catch {
      return "";
    }
  }
  return "";
}

export async function getResourcesByTypeAction(
  type: string,
): Promise<{ success: boolean; resources?: any[]; error?: string }> {
  try {
    const limit = 120;
    let snapshot: admin.firestore.QuerySnapshot;
    try {
      snapshot = await adminDb
        .collection("resources")
        .where("type", "==", type)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    } catch {
      snapshot = await adminDb
        .collection("resources")
        .where("type", "==", type)
        .limit(limit)
        .get();
    }

    if (snapshot.empty) {
      return { success: true, resources: [] };
    }

    const rows = snapshot.docs.map((doc) => {
      const data = doc.data();
      const { createdBy: _c, content: _big, sourceInput: _s, ...meta } = data;
      return {
        ...meta,
        id: doc.id,
        createdAtMillis: millisFromFirestoreTimestamp(data.createdAt),
      };
    });

    rows.sort((a, b) => b.createdAtMillis - a.createdAtMillis);

    const resources = rows.map(({ createdAtMillis: _m, ...rest }) => {
      const data = rest as Record<string, unknown>;
      return {
        id: String(data.id ?? ""),
        title: String(data.title ?? "Untitled"),
        topic: String(data.topic ?? ""),
        subject: formatResourceSubject(String(data.subject ?? "")),
        level: String(data.level ?? ""),
        createdAt: isoFromFirestoreTimestamp(data.createdAt),
        videoUrl:
          typeof data.videoUrl === "string"
            ? data.videoUrl
            : typeof data.url === "string" && type === "VIDEO"
              ? data.url
              : undefined,
        fileUrl:
          typeof data.fileUrl === "string"
            ? data.fileUrl
            : typeof data.url === "string" && type === "PAST_PAPER"
              ? data.url
              : undefined,
      };
    });

    return { success: true, resources };
  } catch (error: unknown) {
    console.error(`Error fetching resources of type ${type}:`, error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
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
  url: z.string().min(1, "Please provide a valid URL."),
  type: z.enum(["PAST_PAPER", "VIDEO"]),
  subjectId: z.string().min(1, "Please select a subject."),
  examBoard: z.string().min(1, "Please select an exam board."),
  level: z.string().min(1, "Please select a level."),
});

export async function contributeResourceAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const idTokenRaw = formData.get('idToken');
    const user = await getVerifiedUser(typeof idTokenRaw === 'string' ? idTokenRaw : null);
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
    const subjectName =
      subjects.find((s) => s.replace(/ /g, '_').toUpperCase() === subjectId.toUpperCase()) ??
      subjectId.replace(/_/g, ' ');

    try {
        const uploadRef = adminDb.collection('resource_uploads').doc();
        await uploadRef.set({
            uploadedById: user.uid,
            type,
            title,
            description,
            url,
            videoUrl: type === 'VIDEO' ? url : null,
            fileUrl: type === 'PAST_PAPER' ? url : null,
            subject: subjectName,
            topic: title,
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
