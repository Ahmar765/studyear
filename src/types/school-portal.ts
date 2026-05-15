export type SchoolHealthStatus = 'strong' | 'watch' | 'critical';

export interface SchoolPortalKpi {
  id: string;
  label: string;
  value: string | number;
  status: SchoolHealthStatus;
  hint?: string;
}

export interface SchoolHealthCell {
  id: string;
  label: string;
  studentCount: number;
  avgProgress: number;
  atRiskCount: number;
  status: SchoolHealthStatus;
}

export interface SchoolRiskAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  category: string;
}

export interface SchoolTimelineEvent {
  id: string;
  type: 'assessment' | 'intervention' | 'ai' | 'staff' | 'insight';
  title: string;
  detail: string;
  at: string;
}

export interface SchoolInterventionPipeline {
  identified: number;
  active: number;
  improving: number;
  closed: number;
}

export interface SchoolAcuSnapshot {
  balance: number;
  consumed7d: number;
  dailyBurnRate: number;
  predictedDaysRemaining: number | null;
  topSubjects: { subject: string; acus: number }[];
  recommendation: string;
}

export interface SchoolOnboardingProfile {
  schoolType?: string;
  country?: string;
  curriculum?: string;
  studentCountEstimate?: number;
  staffCountEstimate?: number;
  examBoards?: string[];
  academicPriorities?: string[];
  existingSystems?: string[];
  departments?: string[];
  yearGroups?: string[];
  classes?: string[];
  aiStudentAccess?: boolean;
  aiTeacherTools?: boolean;
  aiParentVisibility?: boolean;
  safeguardingNotes?: string;
}

export interface SchoolCommandCentrePayload {
  generatedAt: string;
  dataSource: 'live';
  schoolId: string;
  schoolName: string;
  onboardingComplete: boolean;
  kpis: SchoolPortalKpi[];
  yearGroupHealth: SchoolHealthCell[];
  subjectHealth: SchoolHealthCell[];
  riskAlerts: SchoolRiskAlert[];
  timeline: SchoolTimelineEvent[];
  interventionPipeline: SchoolInterventionPipeline;
  acu: SchoolAcuSnapshot;
  insightSnapshot: string[];
  staffCount: number;
  activeInterventions: number;
  upcomingAssessments: number;
}

export const SCHOOL_ONBOARDING_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'structure', label: 'Structure' },
  { id: 'staff', label: 'Staff' },
  { id: 'students', label: 'Students' },
  { id: 'ai', label: 'AI setup' },
  { id: 'live', label: 'Go live' },
] as const;
