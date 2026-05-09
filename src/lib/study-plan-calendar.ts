import { eachDayOfInterval, format, parseISO, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";

export type StudyPlanDaySkeleton = { calendarDate: string; weekday: string };
export type StudyPlanWeekSkeleton = { week: number; days: StudyPlanDaySkeleton[] };

/**
 * Calendar days from today through exam date (inclusive). If the exam is in the past,
 * only "today" is used so the plan stays a single day.
 * Weeks are rolling 7-day chunks starting at day 1 (not ISO calendar weeks).
 */
export function buildStudyPlanSkeleton(examDateYYYYMMDD: string): {
  planDaysInclusive: number;
  planStartDate: string;
  examDate: string;
  planSkeleton: StudyPlanWeekSkeleton[];
} {
  const exam = startOfDay(parseISO(examDateYYYYMMDD));
  const today = startOfDay(new Date());
  const start = today;
  const end = exam < today ? today : exam;
  const allDays = eachDayOfInterval({ start, end });

  const planSkeleton: StudyPlanWeekSkeleton[] = [];
  let weekNum = 1;
  for (let i = 0; i < allDays.length; i += 7) {
    const chunk = allDays.slice(i, i + 7).map((d) => ({
      calendarDate: format(d, "yyyy-MM-dd"),
      weekday: format(d, "EEEE", { locale: enUS }),
    }));
    planSkeleton.push({ week: weekNum++, days: chunk });
  }

  return {
    planDaysInclusive: allDays.length,
    planStartDate: format(start, "yyyy-MM-dd"),
    examDate: format(end, "yyyy-MM-dd"),
    planSkeleton,
  };
}
