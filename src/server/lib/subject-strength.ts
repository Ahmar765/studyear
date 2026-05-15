/** Shared weakest/strongest resolution from live subject progress (quiz-backed). */

export interface SubjectProgressRow {
  name: string;
  progressPercent: number;
  momentum?: number;
  topic?: string;
}

export interface SubjectStrengthResult {
  weakestSubject: string;
  strongestSubject: string;
  weakTopic?: string;
  weakSubjects: { name: string; topic?: string }[];
  strongSubjects: { name: string; topic?: string }[];
}

export function resolveWeakestStrongestSubjects(
  subjects: SubjectProgressRow[],
): SubjectStrengthResult {
  const empty: SubjectStrengthResult = {
    weakestSubject: 'N/A',
    strongestSubject: 'N/A',
    weakSubjects: [],
    strongSubjects: [],
  };

  if (!subjects.length) return empty;

  const withQuizData = subjects.filter((s) => s.progressPercent > 0);
  const pool = withQuizData.length > 0 ? withQuizData : subjects;

  const sorted = [...pool].sort((a, b) => {
    if (a.progressPercent !== b.progressPercent) {
      return a.progressPercent - b.progressPercent;
    }
    return (a.momentum ?? 0) - (b.momentum ?? 0);
  });

  const weakest = sorted[0]!;
  const strongest = sorted[sorted.length - 1]!;

  if (
    sorted.length > 1 &&
    weakest.progressPercent === strongest.progressPercent &&
    withQuizData.length === 0
  ) {
    return {
      weakestSubject: 'N/A',
      strongestSubject: 'N/A',
      weakSubjects: [],
      strongSubjects: [],
    };
  }

  const weakSubjects = sorted
    .filter((s) => s.progressPercent <= weakest.progressPercent + 2)
    .slice(0, 3)
    .map((s) => ({ name: s.name, topic: s.topic }));

  const strongSubjects = sorted
    .filter((s) => s.progressPercent >= strongest.progressPercent - 2)
    .slice(-3)
    .reverse()
    .map((s) => ({ name: s.name, topic: s.topic }));

  return {
    weakestSubject: weakest.name,
    strongestSubject: strongest.name,
    weakTopic: weakest.topic,
    weakSubjects: weakSubjects.length ? weakSubjects : [{ name: weakest.name, topic: weakest.topic }],
    strongSubjects: strongSubjects.length ? strongSubjects : [{ name: strongest.name, topic: strongest.topic }],
  };
}
