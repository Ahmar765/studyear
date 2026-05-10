import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { enUS } from "date-fns/locale";

export type StudyPlanDaySkeleton = { calendarDate: string; weekday: string };
export type StudyPlanWeekSkeleton = { week: number; days: StudyPlanDaySkeleton[] };

/**
 * Study days from today through the **last day before the exam** (revision window).
 * The exam date itself is not scheduled as a study day—students typically sit the exam that day.
 * If the exam is today or in the past, the interval collapses to today only.
 *
 * The skeleton uses **one** weekly block (`week: 1`) listing every study day in order so the UI
 * can show a continuous schedule instead of artificial Mon–Sun “Week 1 / Week 2” splits.
 */
export function buildStudyPlanSkeleton(examDateYYYYMMDD: string): {
  planDaysInclusive: number;
  planStartDate: string;
  planLastStudyDate: string;
  examDate: string;
  planSkeleton: StudyPlanWeekSkeleton[];
} {
  const exam = startOfDay(parseISO(examDateYYYYMMDD));
  const today = startOfDay(new Date());
  const start = today;

  let lastStudyDay: Date;
  if (exam < today) {
    lastStudyDay = today;
  } else if (exam.getTime() === today.getTime()) {
    lastStudyDay = exam;
  } else {
    lastStudyDay = subDays(exam, 1);
    if (lastStudyDay < today) {
      lastStudyDay = today;
    }
  }

  const end = lastStudyDay < start ? start : lastStudyDay;
  const allDays = eachDayOfInterval({ start, end });

  const planSkeleton: StudyPlanWeekSkeleton[] = [];
  if (allDays.length > 0) {
    planSkeleton.push({
      week: 1,
      days: allDays.map((d) => ({
        calendarDate: format(d, "yyyy-MM-dd"),
        weekday: format(d, "EEEE", { locale: enUS }),
      })),
    });
  }

  return {
    planDaysInclusive: allDays.length,
    planStartDate: format(start, "yyyy-MM-dd"),
    planLastStudyDate: format(end, "yyyy-MM-dd"),
    examDate: format(exam, "yyyy-MM-dd"),
    planSkeleton,
  };
}
