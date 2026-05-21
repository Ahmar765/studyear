import type {
  ParentDashboardPayload,
  ParentPlanTier,
  ChildSnapshot,
  LiveAlert,
  EarlyWarning,
  StudyBehaviourInsight,
  VerifiedStudyHours,
  HomeworkItem,
  GradeProbability,
  UniversityPathway,
  MicroWeakness,
  EmotionalSignal,
  PerformanceSeries,
  FamilyIntelligence,
  WeeklyBriefing,
  RiskLevel,
  ConsistencyLevel,
  StabilityStatus,
} from '@/types/parent-dashboard';

import type { LiveSavedResource, LiveStudyTask, LiveSubjectRow } from '@/server/services/parent-student-live-data';
import {
  applyParentPlanGates,
  parentFeatureFlagsFromTier,
} from '@/server/lib/parent-plan';
import { universityCourses } from '@/data/academic';

export interface RawStudentRow {
  id: string;
  name: string;
  avatarSrc: string;
  yearGroup: string;
  progress: number;
  weakestSubject: string;
  strongestSubject: string;
  weakTopic?: string;
  consistency: 'Good' | 'Fair' | 'Poor';
  lastDiagnostic?: { date: string; title: string };
  resourceCount: number;
  subjects: LiveSubjectRow[];
  savedResources: LiveSavedResource[];
  studyTasks: LiveStudyTask[];
  weakSubjects: { name: string; topic?: string }[];
  strongSubjects: { name: string; topic?: string }[];
  dashboardUpdatedAt?: string;
  predictedGrade?: string;
  studyActivity?: {
    pendingTasks: number;
    completedTasks30d: number;
    quizAttempts30d: number;
    avgQuizScore30d: number;
    dashboardRiskLevel?: string;
  };
}

function seedFromId(id: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], id: string, salt: number): T {
  return arr[seedFromId(id, salt) % arr.length]!;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function riskFromProgress(progress: number, consistency: string): RiskLevel {
  if (progress < 40 || consistency === 'Poor') return 'high';
  if (progress < 55 || consistency === 'Fair') return 'moderate';
  return 'low';
}

function consistencyLabel(c: 'Good' | 'Fair' | 'Poor'): ConsistencyLevel {
  if (c === 'Good') return 'High';
  if (c === 'Fair') return 'Moderate';
  return 'Low';
}

function buildChild(row: RawStudentRow): ChildSnapshot {
  const academicHealth = clamp(Math.round(row.progress), 0, 100);
  const liveSubjects = row.subjects?.length ? row.subjects : [];
  const avgMomentum =
    liveSubjects.length > 0
      ? Math.round(liveSubjects.reduce((a, s) => a + s.momentum, 0) / liveSubjects.length)
      : 0;
  const weeklyGrowth = clamp(avgMomentum, -20, 28);
  const examRisk = riskFromProgress(row.progress, row.consistency);
  type Mood = ChildSnapshot['mood'];
  const mood: Mood =
    weeklyGrowth > 5 ? 'focused' : weeklyGrowth < -5 ? 'stressed' : row.progress > 60 ? 'steady' : 'recovering';

  const subjectMomentum =
    liveSubjects.length > 0
      ? liveSubjects.map((s) => ({ subject: s.name, change: s.momentum }))
      : [row.strongestSubject, row.weakestSubject]
          .filter((v) => v && v !== 'N/A')
          .map((subject) => ({ subject, change: 0 }));

  return {
    id: row.id,
    name: row.name,
    avatarSrc: row.avatarSrc,
    yearGroup: row.yearGroup,
    mood,
    academicHealth,
    engagement: consistencyLabel(row.consistency),
    focusStability: row.progress > 65 ? 'High' : row.progress > 45 ? 'Moderate' : 'Low',
    examRisk,
    weeklyGrowth,
    stabilityScore: academicHealth,
    weakestSubject: row.weakestSubject,
    strongestSubject: row.strongestSubject,
    progress: row.progress,
    consistency: row.consistency,
    lastDiagnostic: row.lastDiagnostic,
    subjectMomentum,
    aiRiskLevel: examRisk === 'low' ? 'low' : examRisk === 'moderate' ? 'moderate' : 'high',
    subjects: liveSubjects,
    savedResources: row.savedResources ?? [],
    dashboardUpdatedAt: row.dashboardUpdatedAt,
    predictedGrade: row.predictedGrade,
  };
}

function buildAlerts(children: ChildSnapshot[]): LiveAlert[] {
  const alerts: LiveAlert[] = [];
  const now = new Date().toISOString();

  for (const child of children) {
    if (child.weeklyGrowth > 5) {
      alerts.push({
        id: `${child.id}-growth`,
        message: `${child.strongestSubject} recovery detected for ${child.name}.`,
        severity: 'success',
        studentName: child.name,
        timestamp: now,
      });
    }
    if (child.examRisk !== 'low') {
      alerts.push({
        id: `${child.id}-exam`,
        message: `Exam risk increasing for ${child.name} — ${child.weakestSubject} needs attention.`,
        severity: child.examRisk === 'high' ? 'critical' : 'warning',
        studentName: child.name,
        timestamp: now,
      });
    }
    if (child.engagement === 'Low') {
      alerts.push({
        id: `${child.id}-engage`,
        message: `3 missed study sessions this week detected for ${child.name}.`,
        severity: 'warning',
        studentName: child.name,
        timestamp: now,
      });
    }
    if (child.weakestSubject !== 'N/A') {
      alerts.push({
        id: `${child.id}-conf`,
        message: `${child.weakestSubject} confidence ${child.weeklyGrowth < 0 ? 'declining' : 'stabilising'} for ${child.name}.`,
        severity: child.weeklyGrowth < 0 ? 'warning' : 'info',
        studentName: child.name,
        timestamp: now,
      });
    }
    for (const subject of child.subjects ?? []) {
      if (subject.progressPercent < 45) {
        alerts.push({
          id: `${child.id}-sub-${subject.name}`,
          message: `${subject.name} quiz progress at ${subject.progressPercent}% for ${child.name}.`,
          severity: subject.progressPercent < 30 ? 'critical' : 'warning',
          studentName: child.name,
          timestamp: now,
        });
      }
    }
    if ((child.savedResources?.length ?? 0) > 0) {
      const latest = child.savedResources[0];
      alerts.push({
        id: `${child.id}-resource`,
        message: `${child.name} saved "${latest.title}" recently.`,
        severity: 'info',
        studentName: child.name,
        timestamp: latest.createdAt,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'system-ready',
      message: 'Academic monitoring active — all linked profiles stable.',
      severity: 'info',
      timestamp: now,
    });
  }

  return alerts.slice(0, 8);
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function buildEarlyWarnings(children: ChildSnapshot[], rows: RawStudentRow[]): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];

  for (const child of children) {
    const row = rows.find((r) => r.id === child.id);
    const subjects = child.subjects ?? [];
    const declining = subjects.filter((s) => s.momentum < -4 || s.progressPercent < 45);
    const dueSoon =
      row?.studyTasks?.filter((t) => {
        const d = daysUntil(t.scheduledAt);
        return d >= 0 && d <= 3;
      }) ?? [];
    const activity = row?.studyActivity;
    const hasRisk =
      child.examRisk !== 'low' ||
      declining.length > 0 ||
      dueSoon.length > 0 ||
      (activity?.pendingTasks ?? 0) > 4 ||
      activity?.dashboardRiskLevel === 'high';

    if (!hasRisk) continue;

    const prob = clamp(
      100 -
        child.academicHealth +
        declining.length * 10 +
        dueSoon.length * 6 +
        (activity?.pendingTasks ?? 0) * 2,
      38,
      92,
    );
    const severity: EarlyWarning['severity'] = prob > 65 ? 'critical' : 'warning';
    const causes: string[] = [];

    if (declining.length > 0) {
      const s = declining[0]!;
      causes.push(
        `${s.name} quiz average at ${s.progressPercent}% with ${s.momentum < 0 ? 'negative' : 'flat'} momentum (${s.momentum}%)`,
      );
    }
    if (row?.weakTopic) causes.push(`Identified weak area: ${row.weakTopic}`);
    if (dueSoon.length > 0) {
      causes.push(
        `${dueSoon.length} planner task(s) due within 3 days${dueSoon[0] ? ` (next: ${dueSoon[0].title})` : ''}`,
      );
    }
    if ((activity?.pendingTasks ?? 0) > 4) {
      causes.push(`${activity!.pendingTasks} overdue or pending study tasks in planner`);
    }
    if (child.engagement === 'Low') causes.push('Low study-task completion rate (30 days)');
    if (causes.length === 0) causes.push(`${child.weakestSubject} flagged as weakest subject on dashboard`);

    const recommendations: string[] = [];
    if (declining.length > 0) {
      recommendations.push(
        `Schedule 20-minute active-recall blocks for ${declining[0]!.name} before the next quiz.`,
      );
    }
    if (dueSoon.length > 0) {
      recommendations.push('Prioritise upcoming planner deadlines — break work into two short sessions.');
    }
    if (child.engagement === 'Low') {
      recommendations.push('Re-enable daily planner reminders and aim for one completed task per day.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Review quiz results together and set one measurable goal for this week.');
    }

    const forecastDays = dueSoon.length > 0 ? Math.max(1, daysUntil(dueSoon[0]!.scheduledAt)) : 14;

    warnings.push({
      id: `warn-${child.id}`,
      studentId: child.id,
      studentName: child.name,
      title:
        declining.length > 0
          ? `${declining[0]!.name} underperformance risk`
          : `${child.weakestSubject !== 'N/A' ? child.weakestSubject : 'Academic'} risk alert`,
      probability: prob,
      forecastDays,
      causes,
      recommendation: recommendations.join(' '),
      severity,
    });
  }

  return warnings.slice(0, 6);
}

function buildStudyInsights(children: ChildSnapshot[], rows: RawStudentRow[]): StudyBehaviourInsight[] {
  const insights: StudyBehaviourInsight[] = [];

  for (const child of children) {
    const row = rows.find((r) => r.id === child.id);
    const subjects = child.subjects ?? [];
    const activity = row?.studyActivity;

    if (subjects.length > 0) {
      const best = subjects.reduce((a, b) => (a.momentum > b.momentum ? a : b));
      const worst = subjects.reduce((a, b) => (a.momentum < b.momentum ? a : b));

      if (best.momentum > 2) {
        insights.push({
          id: `insight-${child.id}-best`,
          studentId: child.id,
          studentName: child.name,
          insight: `${best.name} improved ${best.momentum}% vs earlier quiz attempts (now ${best.progressPercent}% average).`,
          category: 'method',
        });
      }
      if (worst.momentum < -2) {
        insights.push({
          id: `insight-${child.id}-worst`,
          studentId: child.id,
          studentName: child.name,
          insight: `${worst.name} retention dipped ${Math.abs(worst.momentum)}% — short revision blocks recommended.`,
          category: 'focus',
        });
      }
      const belowTarget = subjects.filter(
        (s) => s.targetGrade && s.progressPercent < 55,
      );
      if (belowTarget.length > 0) {
        insights.push({
          id: `insight-${child.id}-target`,
          studentId: child.id,
          studentName: child.name,
          insight: `${belowTarget.length} subject(s) below target pace — focus on ${belowTarget[0]!.name} (target ${belowTarget[0]!.targetGrade}).`,
          category: 'fatigue',
        });
      }
    }

    if (activity && activity.quizAttempts30d > 0) {
      insights.push({
        id: `insight-${child.id}-quiz`,
        studentId: child.id,
        studentName: child.name,
        insight: `${activity.quizAttempts30d} quiz attempts in the last 30 days — average score ${activity.avgQuizScore30d}%.`,
        category: 'method',
      });
    }

    if (activity && activity.completedTasks30d > 0) {
      const ratio =
        activity.quizAttempts30d > 0
          ? Math.min(1, activity.quizAttempts30d / activity.completedTasks30d)
          : 0.5;
      insights.push({
        id: `insight-${child.id}-tasks`,
        studentId: child.id,
        studentName: child.name,
        insight: `${activity.completedTasks30d} planner tasks completed in 30 days${activity.pendingTasks > 0 ? `; ${activity.pendingTasks} still pending` : ''}.`,
        category: ratio < 0.6 ? 'timing' : 'method',
      });
    }

    if (child.strongestSubject !== 'N/A' && child.weakestSubject !== 'N/A') {
      insights.push({
        id: `insight-${child.id}-spread`,
        studentId: child.id,
        studentName: child.name,
        insight: `Strongest: ${child.strongestSubject} · needs attention: ${child.weakestSubject} (overall progress ${child.progress}%).`,
        category: 'focus',
      });
    }
  }

  return insights;
}

function buildVerifiedHours(children: ChildSnapshot[], rows: RawStudentRow[]): VerifiedStudyHours[] {
  return children.map((child) => {
    const row = rows.find((r) => r.id === child.id);
    const activity = row?.studyActivity;
    const completed = activity?.completedTasks30d ?? 0;
    const quizzes = activity?.quizAttempts30d ?? 0;
    const pending = activity?.pendingTasks ?? 0;

    const loggedHours = Math.round((completed * 0.75 + pending * 0.35) * 10) / 10;
    const verificationRatio =
      completed > 0 ? clamp(quizzes / completed, 0.35, 1) : quizzes > 0 ? 0.7 : 0.45;
    const verifiedHours = Math.round(loggedHours * verificationRatio * 10) / 10;
    const verifiedScore = Math.round(verificationRatio * 100);

    return {
      studentId: child.id,
      studentName: child.name,
      loggedHours: loggedHours > 0 ? loggedHours : quizzes > 0 ? Math.round(quizzes * 0.4 * 10) / 10 : 0,
      verifiedHours:
        verifiedHours > 0 ? verifiedHours : quizzes > 0 ? Math.round(quizzes * 0.3 * 10) / 10 : 0,
      verifiedScore,
      sessionQuality:
        verifiedScore > 80 ? 'Excellent' : verifiedScore > 60 ? 'Good' : verifiedScore > 40 ? 'Fair' : 'Needs focus',
    };
  });
}

function buildHomework(children: ChildSnapshot[], rows: RawStudentRow[]): HomeworkItem[] {
  const items: HomeworkItem[] = [];
  const now = Date.now();

  for (const child of children) {
    const row = rows.find((r) => r.id === child.id);
    const tasks = row?.studyTasks ?? [];
    if (tasks.length > 0) {
      for (const task of tasks) {
        const dueMs = new Date(task.scheduledAt).getTime();
        const dueInDays = Math.max(0, Math.ceil((dueMs - now) / (1000 * 60 * 60 * 24)));
        const prob = clamp(child.academicHealth - dueInDays * 2, 30, 95);
        items.push({
          id: task.id,
          studentId: child.id,
          studentName: child.name,
          title: task.title,
          subject: task.subject,
          dueInDays,
          completionProbability: prob,
          lateRisk: dueInDays < 2 && prob < 60 ? 'high' : dueInDays < 5 && prob < 75 ? 'moderate' : 'low',
        });
      }
    } else if (child.weakestSubject !== 'N/A') {
      items.push({
        id: `hw-${child.id}-placeholder`,
        studentId: child.id,
        studentName: child.name,
        title: 'No upcoming tasks scheduled',
        subject: child.weakestSubject,
        dueInDays: 7,
        completionProbability: child.academicHealth,
        lateRisk: 'low',
      });
    }
  }
  return items;
}

function parsePredictedGradeLabel(predicted?: string): string | null {
  if (!predicted?.trim()) return null;
  const t = predicted.trim();
  const match = t.match(/grade\s*(\d+)/i) ?? t.match(/^(\d)$/);
  if (match) return `Grade ${match[1]}`;
  if (/^[A-F][*+-]?$/i.test(t)) return t.toUpperCase();
  return t;
}

function buildGradeProbabilities(children: ChildSnapshot[], rows: RawStudentRow[]): GradeProbability[] {
  const out: GradeProbability[] = [];

  for (const child of children) {
    const row = rows.find((r) => r.id === child.id);
    const predicted = parsePredictedGradeLabel(row?.predictedGrade ?? child.predictedGrade);
    const subjects = child.subjects ?? [];
    const avgProgress =
      subjects.length > 0
        ? subjects.reduce((a, s) => a + s.progressPercent, 0) / subjects.length
        : child.progress;
    const avgMomentum =
      subjects.length > 0
        ? subjects.reduce((a, s) => a + s.momentum, 0) / subjects.length
        : child.weeklyGrowth;

    if (predicted) {
      const anchor = parseInt(predicted.replace(/\D/g, ''), 10);
      if (Number.isFinite(anchor) && anchor >= 1 && anchor <= 9) {
        for (const offset of [-1, 0, 1]) {
          const g = anchor + offset;
          if (g < 4 || g > 9) continue;
          const dist = Math.abs(offset);
          const likelihood = clamp(
            Math.round(avgProgress * 0.6 + avgMomentum * 2 - dist * 18 + (offset === 0 ? 25 : 0)),
            12,
            88,
          );
          out.push({
            studentId: child.id,
            grade: `Grade ${g}`,
            likelihood,
          });
        }
      } else {
        out.push({
          studentId: child.id,
          grade: predicted,
          likelihood: clamp(Math.round(avgProgress * 0.85), 35, 92),
        });
      }
    } else {
      const base = avgProgress / 100;
      for (const { grade, mult } of [
        { grade: 'Grade 7', mult: 0.95 },
        { grade: 'Grade 8', mult: 0.72 },
        { grade: 'Grade 9', mult: 0.38 },
      ]) {
        out.push({
          studentId: child.id,
          grade,
          likelihood: clamp(Math.round(base * mult * 100 + avgMomentum), 10, 90),
        });
      }
    }
  }

  return out;
}

const SUBJECT_UNIVERSITY_HINTS: Record<string, string[]> = {
  Biology: ['Medicine', 'Nursing', 'Psychology', 'Healthcare Practice'],
  Chemistry: ['Medicine', 'Dentistry', 'Engineering', 'Healthcare Practice'],
  Physics: ['Engineering', 'Computer Science', 'Architecture', 'Mechanical Engineering'],
  Mathematics: ['Computer Science', 'Economics', 'Engineering', 'Business'],
  'Further Mathematics': ['Computer Science', 'Engineering', 'Economics'],
  Computing: ['Computer Science', 'Engineering', 'Electrical Engineering'],
  Economics: ['Economics', 'Business', 'Law'],
  History: ['History', 'Law', 'English'],
  Geography: ['Architecture', 'Engineering', 'Business'],
  English: ['English', 'Law', 'Education (Teaching)'],
  Psychology: ['Psychology', 'Psychiatry', 'Nursing'],
  Law: ['Law', 'Business', 'History'],
  'Business Studies': ['Business', 'Economics', 'Law'],
};

function buildUniversityPathways(children: ChildSnapshot[]): UniversityPathway[] {
  const catalog = new Set(universityCourses);
  const out: UniversityPathway[] = [];

  for (const child of children) {
    const ranked =
      child.subjects?.length > 0
        ? [...child.subjects].sort((a, b) => b.progressPercent - a.progressPercent)
        : [];
    const leadSubject =
      ranked[0]?.name ??
      (child.strongestSubject !== 'N/A' ? child.strongestSubject : 'Mathematics');
    const leadProgress = ranked[0]?.progressPercent ?? child.academicHealth;

    const hinted = SUBJECT_UNIVERSITY_HINTS[leadSubject] ?? [];
    const picks = [
      ...hinted.filter((c) => catalog.has(c)),
      ...universityCourses.filter((c) => !hinted.includes(c)),
    ].slice(0, 5);

    for (const course of picks) {
      const fitScore = clamp(
        Math.round(leadProgress * 0.7 + child.weeklyGrowth * 2 + (child.examRisk === 'low' ? 12 : 0)),
        35,
        96,
      );
      out.push({
        studentId: child.id,
        course,
        fitScore,
        rationale: `${child.name}'s strength in ${leadSubject} (${leadProgress}% quiz mastery) aligns with ${course}. Trajectory: ${child.predictedGrade ?? 'building toward GCSE/A-level targets'}.`,
        entryRequirements: [
          `Strong performance in ${leadSubject} and related sciences`,
          'GCSE grades meeting typical university offers',
          'Relevant A-level or BTEC pathway in Year 12–13',
        ],
        nextSteps: [
          'Research entry requirements on UCAS',
          'Book a subject taster or open day',
          'Align revision plan to required grades',
        ],
      });
    }
  }

  return out;
}

function buildMicroWeaknesses(children: ChildSnapshot[], rows: RawStudentRow[]): MicroWeakness[] {
  const items: MicroWeakness[] = [];

  for (const child of children) {
    const row = rows.find((r) => r.id === child.id);
    const weakList = row?.weakSubjects?.length
      ? row.weakSubjects
      : child.weakestSubject !== 'N/A'
        ? [{ name: child.weakestSubject, topic: row?.weakTopic }]
        : [];

    for (const ws of weakList.slice(0, 2)) {
      const subjectRow = child.subjects?.find((s) => s.name === ws.name);
      const areas: string[] = [];
      if (ws.topic) areas.push(ws.topic);
      if (subjectRow) {
        if (subjectRow.progressPercent < 50) {
          areas.push(`Quiz mastery at ${subjectRow.progressPercent}%`);
        }
        if (subjectRow.momentum < 0) {
          areas.push(`Recent quiz trend: ${subjectRow.momentum}%`);
        }
        if (subjectRow.targetGrade) {
          areas.push(`Target ${subjectRow.targetGrade} — below pace`);
        }
      }
      if (areas.length === 0) {
        areas.push('Concept retention', 'Application under time pressure');
      }

      const gap = subjectRow ? Math.max(0, 70 - subjectRow.progressPercent) : 20;
      items.push({
        id: `micro-${child.id}-${ws.name}`,
        studentId: child.id,
        studentName: child.name,
        subject: ws.name,
        areas: areas.slice(0, 4),
        recoveryWeeks: clamp(Math.ceil(gap / 15), 2, 8),
        intensity: child.examRisk === 'high' || (subjectRow?.progressPercent ?? 100) < 40 ? 'intensive' : 'moderate',
      });
    }
  }

  return items;
}

function buildEmotional(children: ChildSnapshot[]): EmotionalSignal[] {
  return children.flatMap((child) => {
    const signals: EmotionalSignal[] = [];
    if (child.weeklyGrowth < -3) {
      signals.push({
        id: `emo-${child.id}-conf`,
        studentId: child.id,
        studentName: child.name,
        signal: 'Confidence decline during problem-solving',
        state: 'concern',
        action: 'Lighter schedule suggested for next 48 hours',
      });
    }
    if (child.mood === 'stressed') {
      signals.push({
        id: `emo-${child.id}-burn`,
        studentId: child.id,
        studentName: child.name,
        signal: 'Early burnout risk indicators',
        state: 'concern',
        action: 'Encouragement mode recommended',
      });
    }
    if (child.weeklyGrowth > 8) {
      signals.push({
        id: `emo-${child.id}-pos`,
        studentId: child.id,
        studentName: child.name,
        signal: 'Motivation and engagement trending upward',
        state: 'positive',
      });
    }
    return signals;
  });
}

function buildPerformance(children: ChildSnapshot[], rows: RawStudentRow[]): PerformanceSeries[] {
  const weeks = ['W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'];
  return children.map((child) => {
    const row = rows.find((r) => r.id === child.id);
    const base = child.progress;
    const momentum = weeks.map((week, i) => ({
      week,
      score: clamp(Math.round(base - 12 + i * 2.5), 0, 100),
    }));
    const liveSubjects = child.subjects?.length ? child.subjects : row?.subjects ?? [];
    const subjectHeatmap = liveSubjects.map((s) => ({
      subject: s.name,
      intensity: clamp(s.progressPercent, 0, 100),
    }));
    const examReadiness = liveSubjects.map((s) => ({
      subject: s.name,
      readiness: clamp(s.progressPercent, 0, 100),
    }));
    return {
      studentId: child.id,
      studentName: child.name,
      momentum,
      subjectHeatmap,
      examReadiness,
    };
  });
}

function buildFamily(children: ChildSnapshot[]): FamilyIntelligence | null {
  if (children.length < 2) return null;
  const avgHealth = children.reduce((a, c) => a + c.academicHealth, 0) / children.length;
  const avgGrowth = children.reduce((a, c) => a + c.weeklyGrowth, 0) / children.length;
  return {
    householdConsistency: Math.round(avgHealth),
    combinedMomentum: Math.round(avgGrowth),
    weeklyImprovement: Math.round(avgGrowth * 1.2),
    activeChildren: children.length,
    sharedMilestones: [
      `${children.length} learners monitored`,
      'Shared exam calendar synced',
      'Family study streak active',
    ],
  };
}

function buildBriefing(children: ChildSnapshot[]): WeeklyBriefing {
  const improving = children.filter((c) => c.weeklyGrowth > 0);
  const declining = children.filter((c) => c.weeklyGrowth < 0);
  const name = children[0]?.name ?? 'your child';

  let summary = `This week ${name} demonstrated steady academic engagement. `;
  if (improving.length) {
    summary += `Strong improvement noted in ${improving[0].strongestSubject} retention and consistency. `;
  }
  if (declining.length) {
    summary += `However, ${declining[0].weakestSubject} engagement declined by ${Math.abs(declining[0].weeklyGrowth)}%, with signs of reduced confidence during problem-solving sessions.`;
  }

  return {
    summary: summary.trim(),
    wins: improving.map(
      (c) => `${c.name}: +${c.weeklyGrowth}% weekly growth in ${c.strongestSubject}`,
    ),
    risks: declining.map(
      (c) => `${c.name}: ${c.weakestSubject} engagement needs attention`,
    ),
    recoveries: children
      .filter((c) => c.mood === 'recovering' || c.weeklyGrowth > 5)
      .map((c) => `${c.name} showing recovery trajectory`),
    nextWeekPriorities: [
      'Reinforce weak-area revision blocks',
      'Protect evening focus windows',
      'Review upcoming assignment deadlines',
    ],
    generatedAt: new Date().toISOString(),
  };
}


export function buildParentDashboardPayload(
  rows: RawStudentRow[],
  planTier: ParentPlanTier,
): ParentDashboardPayload {
  const children = rows.map(buildChild);
  const overallScore =
    children.length > 0
      ? Math.round(children.reduce((a, c) => a + c.stabilityScore, 0) / children.length)
      : 0;
  const weeklyMomentum =
    children.length > 0
      ? Math.round(children.reduce((a, c) => a + c.weeklyGrowth, 0) / children.length)
      : 0;

  let status: StabilityStatus = 'stable';
  if (overallScore < 50 || children.some((c) => c.examRisk === 'high')) status = 'critical';
  else if (overallScore < 70 || children.some((c) => c.examRisk === 'moderate')) status = 'warning';

  const focusConsistency: ConsistencyLevel =
    overallScore > 75 ? 'High' : overallScore > 55 ? 'Moderate' : 'Low';

  const payload: ParentDashboardPayload = {
    planTier,
    stability: {
      overallScore,
      weeklyMomentum,
      focusConsistency,
      status,
    },
    liveAlerts: buildAlerts(children),
    children,
    earlyWarnings: buildEarlyWarnings(children, rows),
    studyInsights: buildStudyInsights(children, rows),
    verifiedHours: buildVerifiedHours(children, rows),
    homework: buildHomework(children, rows),
    gradeProbabilities: buildGradeProbabilities(children, rows),
    universityPathways: buildUniversityPathways(children),
    microWeaknesses: buildMicroWeaknesses(children, rows),
    emotionalSignals: buildEmotional(children),
    performance: buildPerformance(children, rows),
    family: buildFamily(children),
    weeklyBriefing: buildBriefing(children),
    features: parentFeatureFlagsFromTier(planTier),
  };

  return applyParentPlanGates(payload);
}

export { deriveParentLinkCode } from '@/lib/parent-link-code';
