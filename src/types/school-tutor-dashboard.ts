export type StudentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;

export interface SchoolTutorStaffProfile {
  name: string;
  email?: string;
  department?: string;
  subjects: string[];
  yearGroups: string[];
  assignedYearGroups?: string[];
  staffId?: string;
  tutorType?: string;
  schoolName: string;
  schoolId: string;
}

export interface SchoolTutorStudentRow {
  id: string;
  name: string;
  avatarSrc?: string;
  yearGroup: string;
  progressScore: number;
  predictedGrade?: string;
  riskLevel?: StudentRiskLevel;
  weakestSubject?: string;
  strongestSubject?: string;
  tasksCompleted: number;
  pendingHomework: number;
  avgQuizScore30d: number;
  quizAttempts30d: number;
  status: 'on_track' | 'watch' | 'critical';
}

export interface SchoolTutorInterventionRow {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  notes: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
}

export interface SchoolTutorAssessmentRow {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
}

export interface SchoolTutorAiInsight {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  studentId?: string;
}

export interface SchoolTutorDashboardPayload {
  generatedAt: string;
  dataSource: 'live';
  staff: SchoolTutorStaffProfile;
  overview: {
    classesToday: number;
    studentsNeedingIntervention: number;
    homeworkCompletionPct: number;
    atRiskCount: number;
    upcomingAssessments: number;
    totalStudents: number;
    avgProgress: number;
  };
  students: SchoolTutorStudentRow[];
  interventions: SchoolTutorInterventionRow[];
  assessments: SchoolTutorAssessmentRow[];
  aiInsights: SchoolTutorAiInsight[];
  yearGroups: { yearGroup: string; count: number; avgProgress: number }[];
}
