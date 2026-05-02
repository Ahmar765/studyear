export function calculateMasteryScore(input: {
  correctAnswers: number;
  totalAttempts: number;
  difficulty: number;
  maxDifficulty?: number;
  daysSinceLastAttempt: number;
}) {
  if (input.totalAttempts === 0) return 0;

  const lambda = 0.08;
  const weightRecency = Math.exp(-lambda * input.daysSinceLastAttempt);
  const difficultyFactor = input.difficulty / (input.maxDifficulty ?? 5);

  return (
    (input.correctAnswers / input.totalAttempts) *
    weightRecency *
    difficultyFactor
  );
}

export function calculateStruggleScore(input: {
  wrongStreak: number;
  timeTakenSec: number;
  expectedTimeSec: number;
  hintUsageCount: number;
}) {
  const wrongScore = Math.min(input.wrongStreak / 3, 1) * 0.4;
  const timeScore = Math.min(input.timeTakenSec / input.expectedTimeSec, 2) / 2 * 0.3;
  const hintScore = Math.min(input.hintUsageCount / 3, 1) * 0.3;

  return wrongScore + timeScore + hintScore;
}


export function shouldTriggerIntervention(struggleScore: number) {
  return struggleScore > 0.6;
}

export async function buildIntervention(input: {
  struggleScore: number;
  errorPattern: string;
  subject: string;
  topic: string;
  studentLevel: string;
}) {
  if (input.struggleScore <= 0.6) {
    return null;
  }

  return {
    type: "MICRO_RETEACH",
    durationSeconds: 90,
    instruction: `
The student is struggling with ${input.topic}.
Do not give the final answer immediately.
Rebuild the concept from first principles.
Use one guided example.
Then ask the student to complete the next step.
Error pattern: ${input.errorPattern}
Student level: ${input.studentLevel}
`
  };
}
