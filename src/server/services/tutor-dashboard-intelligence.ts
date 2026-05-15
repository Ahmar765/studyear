import type {
  TutorAiInsight,
  TutorDashboardPayload,
  TutorIdentityType,
  TutorListingCard,
  TutorPipelineStage,
  TutorPipelineStudent,
  TutorSessionSummary,
  TutorTrustBadge,
} from '@/types/tutor-dashboard';
import type { LiveTutorContext, LiveTutorSession } from '@/server/services/tutor-live-data';

export interface RawTutorProfile {
  userId: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  onboardingComplete?: boolean;
  tutorType?: TutorIdentityType;
  headline?: string;
  bio?: string;
  subjects?: string[] | Record<string, string[]>;
  levels?: string[];
  languages?: string[];
  hourlyRate?: number;
  teachingStyle?: string;
  whyStudentsLove?: string;
  successStories?: string;
  availability?: string;
  verifiedId?: boolean;
  verifiedDbs?: boolean;
  verifiedQualifications?: boolean;
  aiTeachingCertified?: boolean;
  topRated?: boolean;
  examSpecialist?: boolean;
  rating?: number;
  reviewCount?: number;
  commissionRate?: number;
}

function flattenSubjects(subjects: RawTutorProfile['subjects']): string[] {
  if (!subjects) return [];
  if (Array.isArray(subjects)) return subjects.filter(Boolean);
  return Object.values(subjects).flat().filter(Boolean) as string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function derivePipelineStage(studentSessions: LiveTutorSession[]): TutorPipelineStage {
  const hasRequested = studentSessions.some((s) => s.status === 'REQUESTED');
  const hasAccepted = studentSessions.some((s) => s.status === 'ACCEPTED');
  const completed = studentSessions.filter((s) => s.status === 'COMPLETED').length;
  if (hasAccepted) return 'ACTIVE';
  if (completed >= 3) return 'PREMIUM';
  if (completed >= 1) return completed < 3 && !hasAccepted ? 'AT_RISK' : 'TRIAL';
  if (hasRequested) return 'NEW_ENQUIRY';
  return 'INACTIVE';
}

function retentionFromLive(progress: number, quizAvg: number, sessionCount: number): number {
  const progressPart = progress * 0.5;
  const quizPart = quizAvg * 0.35;
  const sessionPart = Math.min(sessionCount * 8, 24);
  return clamp(Math.round(progressPart + quizPart + sessionPart), 0, 100);
}

export function buildTrustBadges(profile: RawTutorProfile): TutorTrustBadge[] {
  return [
    { id: 'verified', label: 'Verified Tutor', active: !!profile.verifiedId },
    { id: 'dbs', label: 'DBS Checked', active: !!profile.verifiedDbs },
    { id: 'qual', label: 'Qualifications Verified', active: !!profile.verifiedQualifications },
    { id: 'ai', label: 'AI Teaching Certified', active: !!profile.aiTeachingCertified },
    { id: 'exam', label: 'Exam Specialist', active: !!profile.examSpecialist },
    { id: 'top', label: 'Top Rated', active: !!profile.topRated },
  ];
}

export function buildMarketplaceInsight(profile: RawTutorProfile): string | undefined {
  const subjects = flattenSubjects(profile.subjects);
  const subject = subjects[0] ?? 'your subject';
  const rate = profile.hourlyRate ?? 28;
  const suggested = Math.round(rate * 1.08);
  return `${subject} tutors in your region average £${rate}/hour. Your profile positioning suggests £${suggested}/hour potential.`;
}

export function buildTutorDashboardPayload(
  profile: RawTutorProfile,
  user: { name?: string; profileImageUrl?: string },
  live: LiveTutorContext,
): TutorDashboardPayload {
  const now = new Date();
  const sessions = live.sessions;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const upcoming = sessions.filter((s) => ['REQUESTED', 'ACCEPTED'].includes(s.status));
  const completed = sessions.filter((s) => s.status === 'COMPLETED');
  const declined = sessions.filter((s) => s.status === 'DECLINED');
  const requested = sessions.filter((s) => s.status === 'REQUESTED');

  const sessionsToday = sessions.filter((s) => {
    if (!s.scheduledAt) return false;
    const d = new Date(s.scheduledAt);
    return d >= todayStart && d < todayEnd && s.status !== 'CANCELLED' && s.status !== 'DECLINED';
  }).length;

  const rate = profile.hourlyRate ?? 32;
  const commission = (live.commissionRate ?? profile.commissionRate ?? 20) / 100;
  const netRate = rate * (1 - commission);

  const completedThisMonth = completed.filter((s) => {
    const t = s.scheduledAt ?? s.createdAt;
    return t && new Date(t) >= monthStart;
  });
  const completedToday = completed.filter((s) => {
    const t = s.scheduledAt ?? s.createdAt;
    if (!t) return false;
    const d = new Date(t);
    return d >= todayStart && d < todayEnd;
  });

  const earningsMonth = Math.round(completedThisMonth.length * netRate);
  const earningsToday = Math.round(completedToday.length * netRate);

  const homeworkReviews = live.students.reduce((a, s) => a + s.pendingStudyTasks, 0);

  const decided = sessions.filter((s) => ['ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED'].includes(s.status));
  const accepted = sessions.filter((s) => ['ACCEPTED', 'COMPLETED'].includes(s.status)).length;
  const conversionRate =
    decided.length > 0 ? Math.round((accepted / Math.max(requested.length + accepted + declined.length, 1)) * 100) : 0;

  const pipeline: TutorPipelineStudent[] = live.students.map((student) => {
    const studentSessions = sessions.filter((s) => s.studentId === student.id);
    const last = studentSessions
      .map((s) => s.scheduledAt ?? s.createdAt)
      .filter(Boolean)
      .sort()
      .pop();
    return {
      id: student.id,
      name: student.name,
      stage: derivePipelineStage(studentSessions),
      subject: studentSessions[0]?.subject ?? student.weakestSubject ?? student.subjects[0] ?? 'General',
      lastSessionAt: last,
      retentionScore: retentionFromLive(student.progressScore, student.avgQuizScore30d, studentSessions.length),
    };
  });

  const studentsWithQuizzes = live.students.filter((s) => s.quizAttempts30d > 0);
  const avgQuiz =
    studentsWithQuizzes.length > 0
      ? studentsWithQuizzes.reduce((a, s) => a + s.avgQuizScore30d, 0) / studentsWithQuizzes.length
      : 0;

  const avgProgress =
    live.students.length > 0
      ? Math.round(live.students.reduce((a, s) => a + s.progressScore, 0) / live.students.length)
      : 0;

  const completionRate =
    sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0;

  const retentionAvg =
    pipeline.length > 0
      ? Math.round(pipeline.reduce((a, p) => a + p.retentionScore, 0) / pipeline.length)
      : 0;

  const rating = profile.rating ?? 0;
  const reviewCount = profile.reviewCount ?? completed.length;

  const aiInsights: TutorAiInsight[] = [];

  if (requested.length > 0) {
    aiInsights.push({
      id: 'pending',
      title: 'Pending session requests',
      message: `${requested.length} booking request(s) awaiting your response.`,
      severity: 'warning',
      actionLabel: 'Review calendar',
    });
  }

  const atRisk = pipeline.filter((p) => p.stage === 'AT_RISK');
  if (atRisk.length > 0) {
    aiInsights.push({
      id: 'at-risk',
      title: 'Students at risk',
      message: `${atRisk.map((p) => p.name).join(', ')} — low follow-up after trial sessions.`,
      severity: 'critical',
      actionLabel: 'View pipeline',
    });
  }

  const weakStudents = live.students.filter((s) => s.progressScore > 0 && s.progressScore < 45);
  if (weakStudents.length > 0) {
    aiInsights.push({
      id: 'weak-progress',
      title: 'Weak-performing students (live)',
      message: `${weakStudents[0]!.name} at ${weakStudents[0]!.progressScore}% dashboard progress${weakStudents[0]!.weakestSubject ? ` — focus ${weakStudents[0]!.weakestSubject}` : ''}.`,
      severity: 'warning',
      actionLabel: 'View students',
    });
  }

  if (homeworkReviews > 0) {
    aiInsights.push({
      id: 'homework',
      title: 'Homework to review',
      message: `${homeworkReviews} pending study task(s) across your linked students.`,
      severity: 'info',
      actionLabel: 'Open classroom',
    });
  }

  if (profile.approvalStatus === 'PENDING') {
    aiInsights.push({
      id: 'approval',
      title: 'Profile under review',
      message: 'Awaiting StudYear approval to appear on the marketplace.',
      severity: 'info',
    });
  }

  if (aiInsights.length === 0) {
    aiInsights.push({
      id: 'ready',
      title: 'All systems live',
      message: 'Session and student data synced from Firestore. Share your marketplace link to get bookings.',
      severity: 'info',
    });
  }

  const improvementPct =
    live.students.length > 0
      ? Math.round(
          live.students.reduce((a, s) => a + Math.max(0, s.avgQuizScore30d - 50), 0) / live.students.length,
        )
      : undefined;

  const toSessionSummary = (s: LiveTutorSession): TutorSessionSummary => ({
    id: s.id,
    studentId: s.studentId,
    studentName: s.studentName,
    status: s.status as TutorSessionSummary['status'],
    scheduledAt: s.scheduledAt ?? s.createdAt ?? now.toISOString(),
    subject: s.subject,
    aiSupported: s.aiSupported,
    studentMessage: s.studentMessage,
    createdAt: s.createdAt,
  });

  return {
    generatedAt: now.toISOString(),
    approvalStatus: profile.approvalStatus,
    onboardingComplete: profile.onboardingComplete === true,
    profile: {
      name: user.name ?? 'Tutor',
      headline: profile.headline,
      bio: profile.bio,
      hourlyRate: profile.hourlyRate,
      tutorType: profile.tutorType,
      subjects: flattenSubjects(profile.subjects),
      levels: profile.levels ?? [],
      rating: rating > 0 ? Math.round(rating * 10) / 10 : 0,
      reviewCount,
      improvementClaim: improvementPct && improvementPct > 0 ? `+${improvementPct}%` : undefined,
    },
    today: {
      sessionsToday,
      upcomingLessons: upcoming.length,
      pendingRequests: requested.length,
      homeworkReviews,
      unreadMessages: requested.length,
    },
    revenue: {
      earningsToday,
      earningsMonth,
      pendingPayout: Math.round(earningsMonth * 0.15),
      aiCommissionRevenue: Math.round(
        sessions.filter((s) => s.aiSupported).length * netRate * 0.25,
      ),
      conversionRate,
    },
    performance: {
      rating: rating > 0 ? Math.round(rating * 10) / 10 : 0,
      retention: retentionAvg,
      completionRate,
      avgSessionScore: avgQuiz > 0 ? Math.round(avgQuiz * 10) / 10 : 0,
      parentSatisfaction: avgProgress,
    },
    aiInsights: aiInsights.slice(0, 6),
    upcomingSessions: upcoming.slice(0, 8).map(toSessionSummary),
    recentSessions: sessions.slice(0, 12).map(toSessionSummary),
    pipeline,
    trustBadges: buildTrustBadges(profile),
    marketplaceInsight: buildMarketplaceInsight(profile),
    liveStudents: live.students,
    profileUpdatedAt: live.profileUpdatedAt,
    dataSource: 'live',
  };
}

export function profileToListing(
  profile: RawTutorProfile,
  user: { name?: string; profileImageUrl?: string },
): TutorListingCard {
  const subjects = flattenSubjects(profile.subjects);
  const rating = profile.rating ?? 0;
  const badges: string[] = [];
  if (profile.verifiedId) badges.push('Verified');
  if (profile.aiTeachingCertified) badges.push('AI Teaching');
  if (profile.examSpecialist) badges.push('Exam Specialist');
  if (profile.topRated) badges.push('Top Rated');

  return {
    uid: profile.userId,
    name: user.name ?? 'Tutor',
    profileImageUrl: user.profileImageUrl,
    headline: profile.headline,
    bio: profile.bio,
    hourlyRate: profile.hourlyRate,
    subjects,
    levels: profile.levels ?? [],
    tutorType: profile.tutorType,
    rating: rating > 0 ? Math.round(rating * 10) / 10 : 4.8,
    reviewCount: profile.reviewCount ?? 0,
    improvementClaim: undefined,
    aiEnabled: !!profile.aiTeachingCertified,
    instantBooking: profile.approvalStatus === 'APPROVED',
    badges,
    availabilityLabel: profile.availability ?? 'Flexible',
  };
}
