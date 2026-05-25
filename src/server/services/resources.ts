import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { stripUndefinedDeep } from '@/server/lib/strip-undefined-deep';

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
  subject?: string | null;
  level?: string | null;
  topic?: string | null;
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
    topic:
      (input.topic?.trim() || title).length > 120
        ? `${(input.topic?.trim() || title).slice(0, 117)}…`
        : input.topic?.trim() || title,
    subject: input.subject?.trim() || 'General',
    level: input.level?.trim() || 'All levels',
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
    subject?: string | null;
    level?: string | null;
    topic?: string | null;
    /** When true, do not add to the global `resources` feed (e.g. copying an existing public item into “my library”). */
    skipGlobalPublish?: boolean;
  }) {
    const savedResourceRef = adminDb.collection('users').doc(input.studentId).collection('saved_resources').doc();

    const safeContent =
      input.content === undefined || input.content === null
        ? null
        : stripUndefinedDeep(input.content);

    await savedResourceRef.set(
      stripUndefinedDeep({
        studentId: input.studentId,
        type: input.type,
        title: input.title,
        content: safeContent,
        sourceInput: input.sourceInput || null,
        fileUrl: input.fileUrl || null,
        videoUrl: input.videoUrl || null,
        linkedEntityId: input.linkedEntityId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    );

    const skip =
      input.skipGlobalPublish === true ||
      !shouldPublishGlobally(input.type);

    if (!skip) {
      try {
        await publishToGlobalLibrary({
          type: input.type,
          title: input.title,
          content: safeContent,
          sourceInput: input.sourceInput ?? null,
          fileUrl: input.fileUrl ?? null,
          videoUrl: input.videoUrl ?? null,
          subject: input.subject ?? null,
          level: input.level ?? null,
          topic: input.topic ?? null,
        });
      } catch (e) {
        console.error('publishToGlobalLibrary failed (saved_resources still stored):', e);
      }
    }

    return { success: true, savedResourceId: savedResourceRef.id };
  },
};

/** @deprecated Prefer `savedResourceService.save`; kept for existing imports. */
export function saveStudentResource(
  input: Parameters<typeof savedResourceService.save>[0],
) {
  return savedResourceService.save(input);
}
