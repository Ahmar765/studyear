import type {
  SchoolTutorAiInsight,
  SchoolTutorDashboardPayload,
  SchoolTutorStudentRow,
} from '@/types/school-tutor-dashboard';
import type { SchoolTutorContext } from '@/server/services/school-tutor-live-data';

function studentStatus(s: SchoolTutorContext['students'][0]): SchoolTutorStudentRow['status'] {
  if (s.riskLevel === 'CRITICAL' || s.riskLevel === 'HIGH' || s.progressScore < 40) return 'critical';
  if (s.pendingHomework >= 3 || s.progressScore < 55) return 'watch';
  return 'on_track';
}

export function buildSchoolTutorDashboardPayload(
  ctx: SchoolTutorContext,
  user: { name?: string; email?: string },
): SchoolTutorDashboardPayload {
  const now = new Date();
  const students: SchoolTutorStudentRow[] = ctx.students.map((s) => ({
    ...s,
    status: studentStatus(s),
  }));

  const atRiskCount = students.filter((s) => s.status === 'critical' || s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL').length;
  const needingIntervention = students.filter((s) => s.status !== 'on_track').length;

  const totalPending = students.reduce((a, s) => a + s.pendingHomework, 0);
  const totalTasks = students.reduce((a, s) => a + s.tasksCompleted + s.pendingHomework, 0);
  const homeworkCompletionPct =
    totalTasks > 0 ? Math.round((students.reduce((a, s) => a + s.tasksCompleted, 0) / totalTasks) * 100) : 0;

  const avgProgress =
    students.length > 0 ? Math.round(students.reduce((a, s) => a + s.progressScore, 0) / students.length) : 0;

  const upcomingAssessments = ctx.assessments.filter((a) => {
    if (!a.dueDate) return true;
    return new Date(a.dueDate) >= now;
  }).length;

  const yearBuckets = new Map<string, { sum: number; count: number }>();
  students.forEach((s) => {
    const b = yearBuckets.get(s.yearGroup) || { sum: 0, count: 0 };
    b.sum += s.progressScore;
    b.count += 1;
    yearBuckets.set(s.yearGroup, b);
  });

  const aiInsights: SchoolTutorAiInsight[] = [];

  if (!ctx.schoolId) {
    aiInsights.push({
      id: 'no-school',
      title: 'Awaiting school assignment',
      message:
        'Link your account using the School Join Code from Settings → Staff, or accept an email invite from your administrator.',
      severity: 'warning',
    });
  }

  students
    .filter((s) => s.status === 'critical')
    .slice(0, 3)
    .forEach((s) => {
      aiInsights.push({
        id: `risk-${s.id}`,
        title: `${s.name} needs intervention`,
        message: s.weakestSubject
          ? `${s.progressScore}% progress — ${s.weakestSubject} is the weakest area.`
          : `Progress at ${s.progressScore}% with elevated risk.`,
        severity: 'critical',
        studentId: s.id,
      });
    });

  students
    .filter((s) => s.pendingHomework >= 2)
    .slice(0, 2)
    .forEach((s) => {
      aiInsights.push({
        id: `hw-${s.id}`,
        title: 'Missing homework',
        message: `${s.name} has ${s.pendingHomework} pending study task(s).`,
        severity: 'warning',
        studentId: s.id,
      });
    });

  if (ctx.interventions.filter((i) => i.status === 'ACTIVE').length > 0) {
    aiInsights.push({
      id: 'active-interventions',
      title: 'Active interventions',
      message: `${ctx.interventions.filter((i) => i.status === 'ACTIVE').length} open intervention plan(s) for your school.`,
      severity: 'info',
    });
  }

  if (aiInsights.length === 0) {
    aiInsights.push({
      id: 'stable',
      title: 'Cohort stable',
      message: 'Live data synced. No critical alerts across your school cohort right now.',
      severity: 'info',
    });
  }

  return {
    generatedAt: now.toISOString(),
    dataSource: 'live',
    staff: {
      name: user.name ?? 'Staff',
      email: user.email,
      department: ctx.department,
      subjects: ctx.subjects,
      yearGroups: ctx.yearGroups,
      schoolName: ctx.schoolName,
      schoolId: ctx.schoolId,
    },
    overview: {
      classesToday: Math.min(6, Math.max(1, Math.ceil(students.length / 25))),
      studentsNeedingIntervention: needingIntervention,
      homeworkCompletionPct,
      atRiskCount,
      upcomingAssessments,
      totalStudents: students.length,
      avgProgress,
    },
    students,
    interventions: ctx.interventions,
    assessments: ctx.assessments,
    aiInsights: aiInsights.slice(0, 8),
    yearGroups: [...yearBuckets.entries()].map(([yearGroup, v]) => ({
      yearGroup,
      count: v.count,
      avgProgress: v.count ? Math.round(v.sum / v.count) : 0,
    })),
  };
}
