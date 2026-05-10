import { adminDb } from '@/lib/firebase/admin-app';
import { GenerateStudyPlanOutput } from '@/server/ai/flows/study-plan-generation';
import { addDays, Day, parseISO, startOfDay } from 'date-fns';
import * as admin from 'firebase-admin';

// Maps day names from the AI output to date-fns Day index (0=Sun, 1=Mon, ...)
const dayNameToIndex: { [key: string]: Day } = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

type DailyPlanSlice = {
    day: string;
    calendarDate?: string;
    sessions: GenerateStudyPlanOutput['weeklyPlans'][number]['dailyPlans'][number]['sessions'];
};

function resolveTaskDate(
    dayPlan: DailyPlanSlice,
    weekOffset: number,
    generationDate: Date,
): Date | null {
    if (dayPlan.calendarDate) {
        try {
            return startOfDay(parseISO(dayPlan.calendarDate));
        } catch {
            return null;
        }
    }
    const dayIndex = dayNameToIndex[dayPlan.day];
    if (dayIndex === undefined) return null;

    const dayDifference = (dayIndex - generationDate.getDay() + 7) % 7;
    const daysFromToday = weekOffset * 7 + dayDifference;
    return addDays(generationDate, daysFromToday);
}

/** Writes `study_tasks` so the dashboard Study Calendar can show AI planner sessions. */
export async function saveStudyPlanTasks(
    userId: string,
    planId: string,
    planOutput: GenerateStudyPlanOutput,
) {
    const batch = adminDb.batch();
    const generationDate = new Date();

    planOutput.weeklyPlans.forEach((week) => {
        const weekOffset = week.week - 1;
        week.dailyPlans.forEach((dayPlan) => {
            const taskDate = resolveTaskDate(dayPlan, weekOffset, generationDate);
            if (!taskDate) return;

            dayPlan.sessions.forEach((session) => {
                if (session.subject === 'Free') return;

                const taskRef = adminDb.collection('study_tasks').doc();
                const topic = session.topic?.trim() || 'Study session';
                const title = `${session.time}: ${topic}`;
                batch.set(taskRef, {
                    studyTaskId: taskRef.id,
                    studyPlanId: planId,
                    userId,
                    subjectId: session.subject,
                    topic: session.topic,
                    taskType: session.revisionMethod.toLowerCase().replace(/ /g, '_'),
                    title,
                    description: `Study ${topic} in ${session.subject}.`,
                    scheduledAt: taskDate,
                    priority: session.priority.toLowerCase(),
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
        });
    });

    await batch.commit();
}
