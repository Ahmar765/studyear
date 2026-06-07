export type ParentPlanTier = 'PARENT_VIEW' | 'PARENT_PRO' | 'PARENT_PRO_PLUS' | 'PARENT_ELITE';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AlertSeverity = 'success' | 'info' | 'warning' | 'critical';
export type StabilityStatus = 'stable' | 'warning' | 'critical';
export type ConsistencyLevel = 'High' | 'Moderate' | 'Low';

export interface LiveAlert {
  id: string;
  message: string;
  severity: AlertSeverity;
  studentName?: string;
  timestamp: string;
}

export interface LiveSubject {
  name: string;
  targetGrade: string;
  currentGrade?: string;
  progressPercent: number;
  momentum: number;
}

export interface ParentSavedResource {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

export interface ChildSnapshot {
  id: string;
  name: string;
  avatarSrc: string;
  yearGroup: string;
  mood: 'focused' | 'steady' | 'stressed' | 'recovering';
  academicHealth: number;
  engagement: ConsistencyLevel;
  focusStability: ConsistencyLevel;
  examRisk: RiskLevel;
  weeklyGrowth: number;
  stabilityScore: number;
  weakestSubject: string;
  strongestSubject: string;
  progress: number;
  consistency: 'Good' | 'Fair' | 'Poor';
  lastDiagnostic?: { date: string; title: string };
  subjectMomentum: { subject: string; change: number }[];
  aiRiskLevel: RiskLevel;
  subjects: LiveSubject[];
  savedResources: ParentSavedResource[];
  dashboardUpdatedAt?: string;
  predictedGrade?: string;
}

export interface EarlyWarning {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  probability: number;
  forecastDays: number;
  causes: string[];
  recommendation: string;
  severity: 'warning' | 'critical';
}

export interface StudyBehaviourInsight {
  id: string;
  studentId: string;
  studentName: string;
  insight: string;
  category: 'timing' | 'focus' | 'method' | 'fatigue';
}

export interface VerifiedStudyHours {
  studentId: string;
  studentName: string;
  loggedHours: number;
  verifiedHours: number;
  verifiedScore: number;
  sessionQuality: 'Excellent' | 'Good' | 'Fair';
}

export interface HomeworkItem {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  subject: string;
  dueInDays: number;
  completionProbability: number;
  lateRisk: RiskLevel;
}

export interface GradeProbability {
  studentId: string;
  grade: string;
  likelihood: number;
}

export interface UniversityPathway {
  studentId: string;
  course: string;
  fitScore: number;
  rationale: string;
  entryRequirements: string[];
  nextSteps: string[];
}

export interface MicroWeakness {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  areas: string[];
  recoveryWeeks: number;
  intensity: 'light' | 'moderate' | 'intensive';
}

export interface EmotionalSignal {
  id: string;
  studentId: string;
  studentName: string;
  signal: string;
  state: 'positive' | 'neutral' | 'concern';
  action?: string;
}

export interface PerformanceSeries {
  studentId: string;
  studentName: string;
  momentum: { week: string; score: number }[];
  subjectHeatmap: { subject: string; intensity: number }[];
  examReadiness: { subject: string; readiness: number }[];
}

export interface FamilyIntelligence {
  householdConsistency: number;
  combinedMomentum: number;
  weeklyImprovement: number;
  activeChildren: number;
  sharedMilestones: string[];
}

export interface WeeklyBriefing {
  summary: string;
  wins: string[];
  risks: string[];
  recoveries: string[];
  nextWeekPriorities: string[];
  generatedAt: string;
}

export interface ParentDashboardPayload {
  planTier: ParentPlanTier;
  stability: {
    overallScore: number;
    weeklyMomentum: number;
    focusConsistency: ConsistencyLevel;
    status: StabilityStatus;
  };
  liveAlerts: LiveAlert[];
  children: ChildSnapshot[];
  earlyWarnings: EarlyWarning[];
  studyInsights: StudyBehaviourInsight[];
  verifiedHours: VerifiedStudyHours[];
  homework: HomeworkItem[];
  gradeProbabilities: GradeProbability[];
  universityPathways: UniversityPathway[];
  microWeaknesses: MicroWeakness[];
  emotionalSignals: EmotionalSignal[];
  performance: PerformanceSeries[];
  family: FamilyIntelligence | null;
  weeklyBriefing: WeeklyBriefing;
  features: {
    earlyWarnings: boolean;
    verifiedStudyHours: boolean;
    weeklyBriefing: boolean;
    performanceOverview: boolean;
    homeworkCentre: boolean;
    studyBehaviourEngine: boolean;
    emotionalIntelligence: boolean;
    pathwayEngine: boolean;
    microWeaknesses: boolean;
    parentAdvisor: boolean;
    aiIntervention: boolean;
    familyIntelligence: boolean;
    fullLiveAlerts: boolean;
  };
}

/** Legacy shape kept for backward compatibility */
export interface StudentData {
  id: string;
  name: string;
  avatarSrc: string;
  yearGroup: string;
  consistency: 'Good' | 'Fair' | 'Poor';
  progress: number;
  weakestSubject: string;
  strongestSubject: string;
  lastDiagnostic?: { date: string; title: string };
  savedResources: { id: string; title: string; type: string; createdAt: string }[];
}
