import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

/** Types that should stay private (not listed on Find Study Resources). */
const SKIP_GLOBAL_PUBLISH_TYPES = new Set<string>([
  'DIAGNOSTIC_REPORT',
  'RECOVERY_PLAN',
  'AI_TUTOR_SESSION',
  'ASSIGNMENT_REVIEW',
  'ESSAY_REVIEW',
  'DISSERTATION_REVIEW',
]);

function shouldPublishGlobally(type: string): boolean {
  return !SKIP_GLOBAL_PUBLISH_TYPES.has(type);
}

async function publishToGlobalLibrary(input: {
  type: string;
  title: string;
  content?: unknown;
  sourceInput?: string | null;
  fileUrl?: string | null;
  videoUrl?: string | null;
}): Promise<void> {
  let safeContent: unknown = null;
  if (input.content !== undefined && input.content !== null) {
    try {
      safeContent = JSON.parse(JSON.stringify(input.content));
    } catch {
      safeContent = { _note: 'Content could not be serialized for the library.' };
    }
  }

  const title = input.title.trim();
  const batch = adminDb.batch();
  const resourceRef = adminDb.collection('resources').doc();

  batch.set(resourceRef, {
    type: input.type,
    title,
    content: safeContent,
    sourceInput: input.sourceInput ?? null,
    fileUrl: input.fileUrl ?? null,
    videoUrl: input.videoUrl ?? null,
    topic: title.length > 120 ? `${title.slice(0, 117)}…` : title,
    subject: 'Community',
    level: 'Various',
    origin: 'student_generated',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const countRef = adminDb.collection('resourceCounts').doc(input.type);
  batch.set(
    countRef,
    {
      total: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

// Universal save function for student-generated resources
export const savedResourceService = {
  async save(input: {
    studentId: string;
    type: string;
    title: string;
    content?: any;
    sourceInput?: string;
    fileUrl?: string;
    videoUrl?: string;
    linkedEntityId?: string;
    /** When true, do not add to the global `resources` feed (e.g. copying an existing public item into “my library”). */
    skipGlobalPublish?: boolean;
  }) {
    const savedResourceRef = adminDb.collection('users').doc(input.studentId).collection('saved_resources').doc();

    await savedResourceRef.set({
      studentId: input.studentId,
      type: input.type,
      title: input.title,
      content: input.content || null,
      sourceInput: input.sourceInput || null,
      fileUrl: input.fileUrl || null,
      videoUrl: input.videoUrl || null,
      linkedEntityId: input.linkedEntityId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const skip =
      input.skipGlobalPublish === true ||
      !shouldPublishGlobally(input.type);

    if (!skip) {
      try {
        await publishToGlobalLibrary({
          type: input.type,
          title: input.title,
          content: input.content,
          sourceInput: input.sourceInput ?? null,
          fileUrl: input.fileUrl ?? null,
          videoUrl: input.videoUrl ?? null,
        });
      } catch (e) {
        console.error('publishToGlobalLibrary failed (saved_resources still stored):', e);
      }
    }

    return { success: true, savedResourceId: savedResourceRef.id };
  },
};

    