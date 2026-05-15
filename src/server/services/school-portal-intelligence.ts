import type {
  SchoolCommandCentrePayload,
  SchoolHealthCell,
  SchoolHealthStatus,
  SchoolPortalKpi,
  SchoolRiskAlert,
  SchoolTimelineEvent,
} from '@/types/school-portal';
import type { SchoolPortalRawContext } from '@/server/services/school-portal-live-data';

function healthFromProgress(avg: number, atRiskPct: number): SchoolHealthStatus {
  if (atRiskPct >= 25 || avg < 40) return 'critical';
  if (atRiskPct >= 12 || avg < 55) return 'watch';
  return 'strong';
}

function cellStatus(avg: number, atRisk: number, count: number): SchoolHealthStatus {
  const pct = count ? (atRisk / count) * 100 : 0;
  return healthFromProgress(avg, pct);
}

export function buildSchoolCommandCentrePayload(ctx: SchoolPortalRawContext): SchoolCommandCentrePayload {
  const now = new Date();
  const studentCount = ctx.students.length;
  const atRisk = ctx.students.filter(
    (s) => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL' || s.progressScore < 45,
  );
  const avgProgress =
    studentCount > 0
      ? Math.round(ctx.students.reduce((a, s) => a + s.progressScore, 0) / studentCount)
      : 0;

  const totalPending = ctx.students.reduce((a, s) => a + s.pendingHomework, 0);
  const totalTasks = ctx.students.reduce((a, s) => a + s.tasksCompleted + s.pendingHomework, 0);
  const homeworkPct =
    totalTasks > 0
      ? Math.round((ctx.students.reduce((a, s) => a + s.tasksCompleted, 0) / totalTasks) * 100)
      : 0;

  const activeInterventions = ctx.interventions.filter((i) => i.status === 'ACTIVE').length;
  const upcomingAssessments = ctx.assessments.filter((a) => {
    if (!a.dueDate) return true;
    return new Date(a.dueDate) >= now;
  }).length;

  const overallStatus = healthFromProgress(
    avgProgress,
    studentCount ? (atRisk.length / studentCount) * 100 : 0,
  );

  const kpis: SchoolPortalKpi[] = [
    {
      id: 'students',
      label: 'Active students',
      value: studentCount,
      status: studentCount > 0 ? 'strong' : 'watch',
    },
    {
      id: 'at-risk',
      label: 'At risk',
      value: atRisk.length,
      status: atRisk.length > 5 ? 'critical' : atRisk.length > 0 ? 'watch' : 'strong',
      hint: 'Live from dashboard states',
    },
    {
      id: 'progress',
      label: 'Cohort progress',
      value: `${avgProgress}%`,
      status: overallStatus,
    },
    {
      id: 'homework',
      label: 'Homework completion',
      value: `${homeworkPct}%`,
      status: homeworkPct < 50 ? 'critical' : homeworkPct < 70 ? 'watch' : 'strong',
    },
    {
      id: 'interventions',
      label: 'Active interventions',
      value: activeInterventions,
      status: activeInterventions > 10 ? 'watch' : 'strong',
    },
    {
      id: 'assessments',
      label: 'Upcoming assessments',
      value: upcomingAssessments,
      status: 'strong',
    },
    {
      id: 'staff',
      label: 'Staff deployed',
      value: ctx.staffCount,
      status: ctx.staffCount < 2 ? 'watch' : 'strong',
    },
    {
      id: 'parents',
      label: 'Parent links',
      value: ctx.parentLinksCount,
      status: ctx.parentLinksCount === 0 && studentCount > 0 ? 'watch' : 'strong',
    },
    {
      id: 'acu',
      label: 'ACU balance',
      value: ctx.acuBalance.toLocaleString(),
      status: ctx.acuBalance < 500 ? 'critical' : ctx.acuBalance < 2000 ? 'watch' : 'strong',
    },
  ];

  const yearBuckets = new Map<string, { sum: number; count: number; atRisk: number }>();
  ctx.students.forEach((s) => {
    const b = yearBuckets.get(s.yearGroup) || { sum: 0, count: 0, atRisk: 0 };
    b.sum += s.progressScore;
    b.count += 1;
    if (s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL' || s.progressScore < 45) b.atRisk += 1;
    yearBuckets.set(s.yearGroup, b);
  });

  const yearGroupHealth: SchoolHealthCell[] = [...yearBuckets.entries()].map(([label, v]) => ({
    id: label,
    label,
    studentCount: v.count,
    avgProgress: v.count ? Math.round(v.sum / v.count) : 0,
    atRiskCount: v.atRisk,
    status: cellStatus(v.count ? v.sum / v.count : 0, v.atRisk, v.count),
  }));

  const subjectBuckets = new Map<string, { sum: number; count: number; atRisk: number }>();
  ctx.students.forEach((s) => {
    const subjects = s.subjects.length ? s.subjects : s.weakestSubject ? [s.weakestSubject] : ['General'];
    subjects.forEach((sub) => {
      const b = subjectBuckets.get(sub) || { sum: 0, count: 0, atRisk: 0 };
      b.sum += s.progressScore;
      b.count += 1;
      if (s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL') b.atRisk += 1;
      subjectBuckets.set(sub, b);
    });
  });

  const subjectHealth: SchoolHealthCell[] = [...subjectBuckets.entries()]
    .map(([label, v]) => ({
      id: label,
      label,
      studentCount: v.count,
      avgProgress: v.count ? Math.round(v.sum / v.count) : 0,
      atRiskCount: v.atRisk,
      status: cellStatus(v.count ? v.sum / v.count : 0, v.atRisk, v.count),
    }))
    .sort((a, b) => a.avgProgress - b.avgProgress)
    .slice(0, 12);

  const riskAlerts: SchoolRiskAlert[] = [];

  if (studentCount === 0) {
    riskAlerts.push({
      id: 'no-students',
      title: 'No students linked',
      message: 'Import students or link accounts to activate live intelligence.',
      severity: 'warning',
      category: 'onboarding',
    });
  }

  atRisk.slice(0, 4).forEach((s) => {
    riskAlerts.push({
      id: `risk-${s.id}`,
      title: `${s.name} — intervention urgency`,
      message: s.weakestSubject
        ? `${s.progressScore}% progress · weakest: ${s.weakestSubject}`
        : `Progress at ${s.progressScore}% with elevated risk signals.`,
      severity: s.riskLevel === 'CRITICAL' ? 'critical' : 'warning',
      category: 'student',
    });
  });

  const year10 = yearGroupHealth.find((y) => y.label.toLowerCase().includes('10'));
  if (year10 && year10.atRiskCount >= 3) {
    riskAlerts.push({
      id: 'year10-cluster',
      title: 'Year group pressure cluster',
      message: `${year10.atRiskCount} students in ${year10.label} showing exam-risk patterns.`,
      severity: 'warning',
      category: 'cohort',
    });
  }

  const lowHw = ctx.students.filter((s) => s.pendingHomework >= 3);
  if (lowHw.length >= 5) {
    riskAlerts.push({
      id: 'homework-gap',
      title: 'Homework completion gap widening',
      message: `${lowHw.length} students have 3+ pending study tasks.`,
      severity: 'warning',
      category: 'homework',
    });
  }

  if (ctx.acuBalance < 1000 && ctx.acuConsumed7d > 200) {
    riskAlerts.push({
      id: 'acu-pressure',
      title: 'ACU consumption accelerating',
      message: `${ctx.acuConsumed7d} ACUs consumed in 7 days. Review allocation before depletion.`,
      severity: 'critical',
      category: 'acu',
    });
  }

  if (riskAlerts.length === 0) {
    riskAlerts.push({
      id: 'stable',
      title: 'Operations stable',
      message: 'No critical risk clusters detected in the last sync.',
      severity: 'info',
      category: 'system',
    });
  }

  const timeline: SchoolTimelineEvent[] = [
    ...ctx.interventions.slice(0, 4).map((i) => ({
      id: `int-${i.id}`,
      type: 'intervention' as const,
      title: i.title,
      detail: `${i.studentName} · ${i.status}`,
      at: i.createdAt,
    })),
    ...ctx.assessments.slice(0, 3).map((a) => ({
      id: `asm-${a.id}`,
      type: 'assessment' as const,
      title: a.title,
      detail: a.dueDate ? `Due ${a.dueDate}` : 'No due date set',
      at: a.createdAt,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const dailyBurn = Math.round(ctx.acuConsumed7d / 7);
  const predictedDays =
    dailyBurn > 0 && ctx.acuBalance > 0 ? Math.max(1, Math.round(ctx.acuBalance / dailyBurn)) : null;

  const insightSnapshot: string[] = [];
  if (studentCount > 0) {
    const atRiskPct = Math.round((atRisk.length / studentCount) * 100);
    if (atRiskPct > 0) {
      insightSnapshot.push(
        `${atRiskPct}% of enrolled students flagged at academic risk — ${atRisk.length} require intervention review.`,
      );
    }
    if (homeworkPct < 65) {
      insightSnapshot.push(
        `Cohort homework completion at ${homeworkPct}% — below institutional target benchmarks.`,
      );
    }
    const weakestSubject = subjectHealth[0];
    if (weakestSubject && weakestSubject.avgProgress < 50) {
      insightSnapshot.push(
        `${weakestSubject.label} shows weakest average progress (${weakestSubject.avgProgress}%) across ${weakestSubject.studentCount} learners.`,
      );
    }
    if (activeInterventions > 0) {
      insightSnapshot.push(`${activeInterventions} active intervention plan(s) in progress.`);
    }
  }

  if (insightSnapshot.length === 0) {
    insightSnapshot.push('Deploy students and staff to unlock AI-powered school insight snapshots.');
  }

  return {
    generatedAt: now.toISOString(),
    dataSource: 'live',
    schoolId: ctx.schoolId,
    schoolName: ctx.schoolName,
    onboardingComplete: ctx.onboardingComplete,
    kpis,
    yearGroupHealth,
    subjectHealth,
    riskAlerts,
    timeline,
    interventionPipeline: {
      identified: atRisk.length,
      active: activeInterventions,
      improving: ctx.interventions.filter((i) => i.status !== 'ACTIVE' && i.status !== 'CLOSED').length,
      closed: ctx.interventions.filter((i) => i.status === 'CLOSED').length,
    },
    acu: {
      balance: ctx.acuBalance,
      consumed7d: ctx.acuConsumed7d,
      dailyBurnRate: dailyBurn,
      predictedDaysRemaining: predictedDays,
      topSubjects: subjectHealth.slice(0, 3).map((s) => ({
        subject: s.label,
        acus: Math.round(ctx.acuConsumed7d * (s.studentCount / Math.max(studentCount, 1))),
      })),
      recommendation:
        predictedDays !== null && predictedDays < 14
          ? `Current burn rate suggests ACU top-up within ${predictedDays} days for uninterrupted AI operations.`
          : 'AI consumption is within sustainable range for current cohort size.',
    },
    insightSnapshot,
    staffCount: ctx.staffCount,
    activeInterventions,
    upcomingAssessments,
  };
}
