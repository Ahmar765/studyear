
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { HttpsError } from '../lib/errors';
import { getVerifiedUser } from '../lib/auth';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { savedResourceService } from '../services/resources';
import { getPastPaperPdfUrl } from '@/lib/past-paper-url';
import { VISUAL_TOOL_RESOURCE_TYPES } from '@/data/public-library';
import { formatResourceSubject } from '@/lib/resource-labels';
import { subjects } from '@/data/academic';
import { LIBRARY_HUB_SECTIONS } from '@/data/public-library';
import { displayResourceCatalogFields } from '@/server/lib/resource-catalog-meta';

export async function getResourceCountsAction(): Promise<Record<string, number>> {
  try {
    const counts: Record<string, number> = {};
    const countsSnapshot = await adminDb.collection('resourceCounts').get();
    countsSnapshot.forEach((doc) => {
      counts[doc.id] = doc.data().total || 0;
    });

    /** Reconcile from live `resources` when counters are missing. */
    const typesToReconcile = new Set<string>();
    for (const section of LIBRARY_HUB_SECTIONS) {
      for (const t of section.resourceTypes) typesToReconcile.add(t);
    }

    await Promise.all(
      [...typesToReconcile].map(async (type) => {
        if ((counts[type] ?? 0) > 0) return;
        try {
          const snap = await adminDb
            .collection('resources')
            .where('type', '==', type)
            .count()
            .get();
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

async function fetchResourceRowsForTypes(
  types: string[],
  limit = 120,
): Promise<admin.firestore.QueryDocumentSnapshot[]> {
  const batches: string[][] = [];
  for (let i = 0; i < types.length; i += 10) {
    batches.push(types.slice(i, i + 10));
  }

  const allDocs: admin.firestore.QueryDocumentSnapshot[] = [];
  for (const batch of batches) {
    if (batch.length === 1) {
      try {
        const snap = await adminDb
          .collection('resources')
          .where('type', '==', batch[0])
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();
        allDocs.push(...snap.docs);
      } catch {
        const snap = await adminDb
          .collection('resources')
          .where('type', '==', batch[0])
          .limit(limit)
          .get();
        allDocs.push(...snap.docs);
      }
      continue;
    }

    try {
      const snap = await adminDb
        .collection('resources')
        .where('type', 'in', batch)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      allDocs.push(...snap.docs);
    } catch {
      const snap = await adminDb
        .collection('resources')
        .where('type', 'in', batch)
        .limit(limit)
        .get();
      allDocs.push(...snap.docs);
    }
  }

  return allDocs;
}

export async function getResourcesByTypeAction(
  type: string,
): Promise<{ success: boolean; resources?: any[]; error?: string }> {
  try {
    const limit = 120;
    const types =
      type === 'VISUAL_TOOLS' ? [...VISUAL_TOOL_RESOURCE_TYPES] : [type];

    const docs = await fetchResourceRowsForTypes(types, limit);

    if (docs.length === 0) {
      return { success: true, resources: [] };
    }

    const rows = docs.map((doc) => {
      const data = doc.data();
      const catalog = displayResourceCatalogFields(data);
      const { createdBy: _c, content: _big, sourceInput: _s, ...meta } = data;
      return {
        ...meta,
        id: doc.id,
        displaySubject: catalog.subject,
        displayLevel: catalog.level,
        displayTopic: catalog.topic,
        createdAtMillis: millisFromFirestoreTimestamp(data.createdAt),
      };
    });

    rows.sort((a, b) => b.createdAtMillis - a.createdAtMillis);

    const resources = rows.map(({ createdAtMillis: _m, displaySubject, displayLevel, displayTopic, ...rest }) => {
      const data = rest as Record<string, unknown>;
      return {
        id: String(data.id ?? ""),
        title: String(data.title ?? "Untitled"),
        topic: displayTopic || String(data.topic ?? ""),
        subject: displaySubject,
        level: displayLevel,
        createdAt: isoFromFirestoreTimestamp(data.createdAt),
        videoUrl:
          typeof data.videoUrl === "string"
            ? data.videoUrl
            : typeof data.url === "string" && type === "VIDEO"
              ? data.url
              : undefined,
        fileUrl:
          typeof data.fileUrl === "string"
            ? type === "PAST_PAPER"
              ? getPastPaperPdfUrl(data.fileUrl)
              : data.fileUrl
            : typeof data.url === "string" && type === "PAST_PAPER"
              ? getPastPaperPdfUrl(data.url)
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
    const storedUrl = type === 'PAST_PAPER' ? getPastPaperPdfUrl(url) || url : url;
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
            url: storedUrl,
            videoUrl: type === 'VIDEO' ? storedUrl : null,
            fileUrl: type === 'PAST_PAPER' ? storedUrl : null,
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
