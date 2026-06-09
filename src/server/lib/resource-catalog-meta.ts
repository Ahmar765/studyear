import { formatResourceLevel, formatResourceSubject } from '@/lib/resource-labels';
import { getUserProfileServer } from '@/server/services/user';

export type ResourceCatalogMeta = {
  subject: string;
  level: string;
  topic: string;
};

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function extractFromContent(type: string, content: unknown): Partial<ResourceCatalogMeta> {
  if (!content || typeof content !== 'object') return {};
  const c = content as Record<string, unknown>;

  if (type === 'AI_COURSE') {
    return {
      subject: pickString(c.subject),
      level: pickString(c.level),
      topic: pickString(c.topic, c.courseTitle),
    };
  }

  if (type === 'AI_INTERACTIVE_LESSON') {
    return {
      topic: pickString(c.lessonTitle, c.topic),
      level: pickString(c.academicLevel),
    };
  }

  if (type === 'QUIZ' || type === 'FLASHCARD') {
    return {
      subject: pickString(c.subject),
      level: pickString(c.level, c.academicLevel),
      topic: pickString(c.topic, c.title),
    };
  }

  if (type === 'STUDY_PLAN') {
    return {
      topic: pickString(c.title, c.examGoal),
      level: pickString(c.level),
    };
  }

  return {
    subject: pickString(c.subject, c.subjectId),
    level: pickString(c.level, c.academicLevel, c.studyLevel),
    topic: pickString(c.topic, c.title),
  };
}

async function profileDefaults(studentId: string): Promise<Partial<ResourceCatalogMeta>> {
  const profile = await getUserProfileServer(studentId);
  if (!profile) return {};

  const level = pickString(profile.studyLevel, profile.yearGroup);
  const subjects = profile.subjects;
  const subject =
    Array.isArray(subjects) && subjects[0]?.name
      ? String(subjects[0].name)
      : '';

  return { subject, level };
}

/** Resolve catalogue subject/level/topic for the shared resources library. */
export async function resolveResourceCatalogMeta(input: {
  studentId: string;
  type: string;
  title: string;
  content?: unknown;
  subject?: string | null;
  level?: string | null;
  topic?: string | null;
  sourceInput?: string | null;
}): Promise<ResourceCatalogMeta> {
  const fromContent = extractFromContent(input.type, input.content);
  const fromProfile = await profileDefaults(input.studentId);

  const rawSubject = pickString(
    input.subject,
    fromContent.subject,
    fromProfile.subject,
  );
  const rawLevel = pickString(
    input.level,
    fromContent.level,
    fromProfile.level,
  );
  const topic = pickString(
    input.topic,
    fromContent.topic,
    input.title,
  );

  const subject = formatResourceSubject(rawSubject);
  const level = formatResourceLevel(rawLevel);

  return {
    subject,
    level,
    topic: topic || input.title.trim(),
  };
}

/** Display labels for a resource row (handles legacy community/various values). */
export function displayResourceCatalogFields(data: {
  subject?: unknown;
  level?: unknown;
  topic?: unknown;
  title?: unknown;
  type?: unknown;
  content?: unknown;
}): ResourceCatalogMeta {
  const fromContent = extractFromContent(String(data.type ?? ''), data.content);

  const rawSubject = pickString(data.subject, fromContent.subject);
  const rawLevel = pickString(data.level, fromContent.level);
  const topic = pickString(data.topic, fromContent.topic, data.title);

  return {
    subject: formatResourceSubject(rawSubject),
    level: formatResourceLevel(rawLevel),
    topic: topic || String(data.title ?? 'Untitled'),
  };
}
