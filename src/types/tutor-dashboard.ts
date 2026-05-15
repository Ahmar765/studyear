export type TutorApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TutorIdentityType =
  | 'ACADEMIC'
  | 'EXAM_SPECIALIST'
  | 'STEM'
  | 'LANGUAGE'
  | 'UNIVERSITY_MENTOR'
  | 'SEN_SUPPORT'
  | 'HOMEWORK_COACH';

export type TutorPipelineStage =
  | 'NEW_ENQUIRY'
  | 'TRIAL'
  | 'ACTIVE'
  | 'AT_RISK'
  | 'INACTIVE'
  | 'PREMIUM';

export type SessionStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TutorTrustBadge {
  id: string;
  label: string;
  active: boolean;
}

export interface TutorSessionSummary {
  id: string;
  studentId: string;
  studentName: string;
  status: SessionStatus;
  scheduledAt: string;
  subject?: string;
  aiSupported?: boolean;
  studentMessage?: string;
  createdAt?: string;
}

export interface TutorLiveStudentRow {
  id: string;
  name: string;
  avatarSrc?: string;
  yearGroup?: string;
  progressScore: number;
  weakestSubject?: string;
  strongestSubject?: string;
  subjects: string[];
  pendingStudyTasks: number;
  quizAttempts30d: number;
  avgQuizScore30d: number;
  dashboardUpdatedAt?: string;
}

export interface TutorPipelineStudent {
  id: string;
  name: string;
  stage: TutorPipelineStage;
  subject: string;
  lastSessionAt?: string;
  retentionScore: number;
}

export interface TutorAiInsight {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionLabel?: string;
}

export interface TutorDashboardPayload {
  generatedAt: string;
  approvalStatus: TutorApprovalStatus;
  onboardingComplete: boolean;
  profile: {
    name: string;
    headline?: string;
    bio?: string;
    hourlyRate?: number;
    tutorType?: TutorIdentityType;
    subjects: string[];
    levels: string[];
    rating: number;
    reviewCount: number;
    improvementClaim?: string;
  };
  today: {
    sessionsToday: number;
    upcomingLessons: number;
    pendingRequests: number;
    homeworkReviews: number;
    unreadMessages: number;
  };
  revenue: {
    earningsToday: number;
    earningsMonth: number;
    pendingPayout: number;
    aiCommissionRevenue: number;
    conversionRate: number;
  };
  performance: {
    rating: number;
    retention: number;
    completionRate: number;
    avgSessionScore: number;
    parentSatisfaction: number;
  };
  aiInsights: TutorAiInsight[];
  upcomingSessions: TutorSessionSummary[];
  pipeline: TutorPipelineStudent[];
  trustBadges: TutorTrustBadge[];
  marketplaceInsight?: string;
  liveStudents: TutorLiveStudentRow[];
  recentSessions: TutorSessionSummary[];
  profileUpdatedAt?: string;
  dataSource: 'live';
}

export interface TutorListingCard {
  uid: string;
  name: string;
  profileImageUrl?: string;
  headline?: string;
  bio?: string;
  hourlyRate?: number;
  subjects: string[];
  levels: string[];
  tutorType?: TutorIdentityType;
  rating: number;
  reviewCount: number;
  improvementClaim?: string;
  aiEnabled: boolean;
  instantBooking: boolean;
  badges: string[];
  availabilityLabel?: string;
}
