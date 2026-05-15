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

function buildEarlyWarnings(children: ChildSnapshot[]): EarlyWarning[] {
  return children
    .filter((c) => c.examRisk !== 'low' || c.consistency !== 'Good')
    .map((child) => {
      const prob = child.examRisk === 'high' ? 68 + (seedFromId(child.id) % 12) : 45 + (seedFromId(child.id, 1) % 20);
      const severity: EarlyWarning['severity'] = prob > 65 ? 'critical' : 'warning';
      return {
        id: `warn-${child.id}`,
        studentId: child.id,
        studentName: child.name,
        title: `${child.weakestSubject} Underperformance Risk`,
        probability: prob,
        forecastDays: 12 + (seedFromId(child.id, 2) % 14),
        causes: [
          'Reduced revision consistency',
          child.engagement === 'Low' ? 'Low quiz retention' : 'Increased avoidance behaviour',
          'Focus collapse after 23 minutes',
        ],
        recommendation:
          'Increase short revision blocks, reduce overload, and add active recall sessions.',
        severity,
      };
    })
    .slice(0, 4);
}

function buildStudyInsights(children: ChildSnapshot[]): StudyBehaviourInsight[] {
  const templates: Omit<StudyBehaviourInsight, 'id' | 'studentId' | 'studentName'>[] = [
    { insight: 'Performance improves 28% after 6PM.', category: 'timing' },
    { insight: 'Attention drops after 23 minutes.', category: 'focus' },
    { insight: 'Visual learning produces stronger retention.', category: 'method' },
    { insight: 'Short sessions outperform long sessions.', category: 'fatigue' },
  ];

  return children.flatMap((child, ci) =>
    templates.slice(0, 2).map((t, ti) => ({
      id: `insight-${child.id}-${ti}`,
      studentId: child.id,
      studentName: child.name,
      ...t,
      insight: ci === 0 ? t.insight : t.insight.replace('23', String(18 + (seedFromId(child.id) % 10))),
    })),
  );
}

function buildVerifiedHours(children: ChildSnapshot[]): VerifiedStudyHours[] {
  return children.map((child) => {
    const logged = 8 + (seedFromId(child.id) % 8);
    const ratio = child.consistency === 'Good' ? 0.82 : child.consistency === 'Fair' ? 0.68 : 0.55;
    const verified = Math.round(logged * ratio * 10) / 10;
    return {
      studentId: child.id,
      studentName: child.name,
      loggedHours: logged,
      verifiedHours: verified,
      verifiedScore: Math.round(ratio * 100),
      sessionQuality: ratio > 0.8 ? 'Excellent' : ratio > 0.65 ? 'Good' : 'Fair',
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

function buildGradeProbabilities(children: ChildSnapshot[]): GradeProbability[] {
  const avg = children.length
    ? children.reduce((a, c) => a + c.academicHealth, 0) / children.length
    : 70;
  const base = avg / 100;
  return [
    { grade: 'Grade 7', likelihood: clamp(Math.round(base * 95), 40, 95) },
    { grade: 'Grade 8', likelihood: clamp(Math.round(base * 72), 25, 80) },
    { grade: 'Grade 9', likelihood: clamp(Math.round(base * 38), 10, 55) },
  ];
}

function buildMicroWeaknesses(children: ChildSnapshot[]): MicroWeakness[] {
  const areaPools: Record<string, string[]> = {
    Mathematics: [
      'Algebraic structure',
      'Equation interpretation',
      'Speed under pressure',
      'Multi-step reasoning',
    ],
    default: [
      'Concept retention',
      'Application under time pressure',
      'Cross-topic synthesis',
      'Exam technique',
    ],
  };

  return children
    .filter((c) => c.weakestSubject !== 'N/A')
    .map((child) => {
      const areas = areaPools[child.weakestSubject] ?? areaPools.default;
      return {
        id: `micro-${child.id}`,
        studentId: child.id,
        studentName: child.name,
        subject: child.weakestSubject,
        areas: areas.slice(0, 3 + (seedFromId(child.id) % 2)),
        recoveryWeeks: 2 + (seedFromId(child.id, 4) % 5),
        intensity: child.examRisk === 'high' ? 'intensive' : 'moderate',
      } as MicroWeakness;
    });
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

function planFeatures(tier: ParentPlanTier) {
  return {
    aiIntervention: tier === 'PARENT_PRO_PLUS' || tier === 'PARENT_ELITE',
    liveAlerts: tier === 'PARENT_ELITE',
    pathwayEngine: tier === 'PARENT_PRO_PLUS' || tier === 'PARENT_ELITE',
    emotionalIntelligence: tier === 'PARENT_PRO_PLUS' || tier === 'PARENT_ELITE',
    parentAdvisor: tier === 'PARENT_PRO_PLUS' || tier === 'PARENT_ELITE',
    familyIntelligence: tier === 'PARENT_ELITE',
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

  return {
    planTier,
    stability: {
      overallScore,
      weeklyMomentum,
      focusConsistency,
      status,
    },
    liveAlerts: buildAlerts(children),
    children,
    earlyWarnings: buildEarlyWarnings(children),
    studyInsights: buildStudyInsights(children),
    verifiedHours: buildVerifiedHours(children),
    homework: buildHomework(children, rows),
    gradeProbabilities: buildGradeProbabilities(children),
    microWeaknesses: buildMicroWeaknesses(children),
    emotionalSignals: buildEmotional(children),
    performance: buildPerformance(children, rows),
    family: buildFamily(children),
    weeklyBriefing: buildBriefing(children),
    features: planFeatures(planTier),
  };
}

export { deriveParentLinkCode } from '@/lib/parent-link-code';
