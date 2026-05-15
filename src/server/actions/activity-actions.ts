'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { getVerifiedUser } from '../lib/auth';
import * as admin from 'firebase-admin';

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

type EventContext = {
  eventType: string;
  payload: Record<string, unknown>;
  stage?: string;
};

function flattenPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const inner = payload?.input;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return { ...payload, ...(inner as Record<string, unknown>) };
  }
  return payload;
}

function humanizeType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resourceGeneratedTitle(p: Record<string, unknown>): string {
  const topic = String(p.topic ?? p.title ?? '').trim();
  const subject = String(p.subject ?? p.subjectId ?? '').trim();

  if (p.numberOfQuestions != null) {
    const label = topic || subject || 'Practice';
    return `Quiz created: ${label}`;
  }
  if (p.assignmentText || p.assignmentType) {
    return `Assignment reviewed${subject ? `: ${subject}` : ''}`;
  }
  if (p.courseTitle || p.moduleTitle) {
    return `AI course: ${p.courseTitle || p.moduleTitle}`;
  }
  if (topic) {
    return `${subject ? `${subject} — ` : ''}${topic}`;
  }
  if (subject) {
    return `Study resource: ${subject}`;
  }
  return 'Study resource created';
}

function resourceGeneratedDescription(p: Record<string, unknown>): string {
  const level = p.level ? `Level: ${p.level}. ` : '';
  const topic = String(p.topic ?? p.title ?? '').trim();
  if (p.numberOfQuestions != null) {
    return `${level}${p.numberOfQuestions} questions generated.`;
  }
  if (topic) {
    return `${level}Saved to your library.`;
  }
  return 'Added to your StudYear library.';
}

const eventTypeToTitleMap: Record<string, (ctx: EventContext) => string> = {
  DIAGNOSTIC_COMPLETED: () => 'Academic Diagnostic Completed',
  QUIZ_SUBMITTED: (ctx) => {
    const p = flattenPayload(ctx.payload);
    const subject = String(p.subjectId ?? p.subject ?? 'General');
    return `Quiz completed: ${subject}`;
  },
  RESOURCE_GENERATED: (ctx) => resourceGeneratedTitle(flattenPayload(ctx.payload)),
  QUESTION_ASKED: (ctx) => {
    const p = flattenPayload(ctx.payload);
    const q = String(p.query ?? '').trim();
    const preview = q.length > 48 ? `${q.slice(0, 48)}…` : q;
    return preview ? `AI Tutor: ${preview}` : 'AI Tutor question';
  },
  INTERVENTION_TRIGGERED: () => 'Recovery plan generated',
  STUDY_PLAN_GENERATED: (ctx) => {
    const p = flattenPayload(ctx.payload);
    return p.title ? `Study plan: ${p.title}` : 'Study plan created';
  },
  LESSON_COMPLETED: (ctx) => {
    const p = flattenPayload(ctx.payload);
    return `Lesson completed: ${p.topic || p.subject || 'Session'}`;
  },
};

const eventTypeToDescriptionMap: Record<string, (ctx: EventContext) => string> = {
  DIAGNOSTIC_COMPLETED: () => 'Your academic baseline report is ready.',
  QUIZ_SUBMITTED: (ctx) => {
    const p = flattenPayload(ctx.payload);
    const raw = p.scoreRaw ?? p.score;
    const outOf = p.outOf;
    if (raw != null && outOf != null) {
      return `Scored ${raw}/${outOf}`;
    }
    const pct = p.scorePercent;
    if (pct != null) {
      return `Score: ${Math.round(Number(pct))}%`;
    }
    return 'Quiz attempt recorded.';
  },
  RESOURCE_GENERATED: (ctx) => resourceGeneratedDescription(flattenPayload(ctx.payload)),
  QUESTION_ASKED: () => 'You asked the AI teaching assistant a question.',
  INTERVENTION_TRIGGERED: () => 'A personalised recovery plan was added to your account.',
  STUDY_PLAN_GENERATED: () => 'Your schedule is ready in the planner.',
  LESSON_COMPLETED: () => 'Nice work — keep your streak going.',
};

function titleForEvent(ctx: EventContext): string {
  const fn = eventTypeToTitleMap[ctx.eventType];
  if (fn) return fn(ctx);
  const p = flattenPayload(ctx.payload);
  const hint = p.topic || p.subject || p.title || p.query;
  if (hint) {
    return `${humanizeType(ctx.eventType)}: ${String(hint).slice(0, 60)}`;
  }
  return humanizeType(ctx.eventType);
}

function descriptionForEvent(ctx: EventContext): string {
  const fn = eventTypeToDescriptionMap[ctx.eventType];
  if (fn) return fn(ctx);
  return '';
}

export async function getActivityFeedAction(
  idToken?: string | null,
): Promise<{ activities: ActivityFeedItem[]; error?: string }> {
  const user = await getVerifiedUser(idToken);
  if (!user) {
    return { activities: [], error: 'User not authenticated' };
  }

  try {
    const eventsSnapshot = await adminDb
      .collection('learning_events')
      .where('studentId', '==', user.uid)
      .limit(80)
      .get();

    const sorted = [...eventsSnapshot.docs].sort((a, b) => {
      const ta = a.data().createdAt?.toMillis?.() ?? 0;
      const tb = b.data().createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    if (sorted.length === 0) {
      return { activities: [] };
    }

    const activities = sorted
      .slice(0, 15)
      .map((doc) => {
        const data = doc.data();
        const payload = (data.payload as Record<string, unknown>) || {};
        const eventType = String(data.type || 'ACTIVITY');

        const ctx: EventContext = {
          eventType,
          payload,
          stage: data.stage as string | undefined,
        };

        const createdAt = data.createdAt as admin.firestore.Timestamp | undefined;
        const timestamp =
          createdAt && typeof createdAt.toDate === 'function'
            ? createdAt.toDate().toISOString()
            : new Date(0).toISOString();

        return {
          id: doc.id,
          type: eventType,
          title: titleForEvent(ctx),
          description: descriptionForEvent(ctx),
          timestamp,
        } satisfies ActivityFeedItem;
      })
      .filter((a) => !a.title.toLowerCase().includes('undefined'));

    return { activities };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching activity feed:', error);
    return { activities: [], error: message };
  }
}
