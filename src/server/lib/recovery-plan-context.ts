import type { UserProfile } from "@/lib/firebase/services/user";
import { normalizeSubjectTitle } from "@/lib/profile-academic";

export type RecoverySubjectGradeDetail = {
  subjectName: string;
  targetGrade?: string;
  currentGrade?: string;
  diagnosticConfidencePercent?: number;
};

export type RecoveryStudentAcademicContext = {
  /** Stage label from profile, e.g. Key Stage 2, GCSE, Year 5 */
  studyLevel?: string;
  yearGroup?: string;
  overallCurrentGrade?: string;
  overallTargetGrade?: string;
  examBoard?: string;
  subjectGradeDetails?: RecoverySubjectGradeDetail[];
};

function matchSubjectKey(name: string): string {
  return normalizeSubjectTitle(name.trim()).toLowerCase();
}

function gradesForProfileSubject(
  profile: UserProfile,
  subjectName: string,
): { targetGrade?: string; currentGrade?: string } {
  const subs = profile.subjects as
    | { name?: string; targetGrade?: string; currentGrade?: string }[]
    | undefined;
  if (!subs?.length) return {};
  const key = matchSubjectKey(subjectName);
  for (const row of subs) {
    const n = row?.name != null ? matchSubjectKey(String(row.name)) : "";
    if (n === key) {
      const targetGrade = String(row.targetGrade ?? "").trim() || undefined;
      const currentGrade = String(row.currentGrade ?? "").trim() || undefined;
      return { targetGrade, currentGrade };
    }
  }
  return {};
}

/**
 * Snapshot of the student's stated stage and grades so recovery plans match how /
 * where they study (e.g. Year 5 vs GCSE) and each subject's target/current grade.
 */
export function buildRecoveryStudentAcademicContext(
  profile: UserProfile | null | undefined,
  diagnosticDoc: Record<string, unknown>,
): RecoveryStudentAcademicContext {
  const studyLevel = String(profile?.studyLevel ?? "").trim() || undefined;
  const yearGroup = String(profile?.yearGroup ?? "").trim() || undefined;
  const overallCurrentGrade = String(profile?.currentGrade ?? "").trim() || undefined;
  const overallTargetGrade = String(profile?.targetGrade ?? "").trim() || undefined;
  const examBoardRaw = profile?.examBoard;
  const examBoard =
    examBoardRaw != null && String(examBoardRaw).trim() !== ""
      ? String(examBoardRaw).trim()
      : undefined;

  const rawSubjects = diagnosticDoc.subjects;
  const diagRows = Array.isArray(rawSubjects) ? rawSubjects : [];

  let subjectGradeDetails: RecoverySubjectGradeDetail[];

  if (diagRows.length > 0) {
    subjectGradeDetails = [];
    for (const row of diagRows) {
      if (!row || typeof row !== "object") continue;
      const r = row as { subjectId?: unknown; confidence?: unknown };
      const subjectId = String(r.subjectId ?? "").trim();
      if (!subjectId) continue;
      const canon = normalizeSubjectTitle(subjectId);
      const grades = profile ? gradesForProfileSubject(profile, canon) : {};
      const conf = typeof r.confidence === "number" ? r.confidence : undefined;
      subjectGradeDetails.push({
        subjectName: canon,
        ...grades,
        ...(conf !== undefined ? { diagnosticConfidencePercent: conf } : {}),
      });
    }
  } else if (profile?.subjects?.length) {
    const subs = profile.subjects as { name?: string; targetGrade?: string; currentGrade?: string }[];
    subjectGradeDetails = subs
      .map((s) => {
        const name = String(s?.name ?? "").trim();
        if (!name) return null;
        return {
          subjectName: normalizeSubjectTitle(name),
          targetGrade: String(s.targetGrade ?? "").trim() || undefined,
          currentGrade: String(s.currentGrade ?? "").trim() || undefined,
        } satisfies RecoverySubjectGradeDetail;
      })
      .filter((x): x is RecoverySubjectGradeDetail => x != null);
  } else {
    subjectGradeDetails = [];
  }

  return {
    studyLevel: studyLevel || undefined,
    yearGroup: yearGroup || undefined,
    overallCurrentGrade,
    overallTargetGrade,
    examBoard,
    subjectGradeDetails: subjectGradeDetails.length ? subjectGradeDetails : undefined,
  };
}
