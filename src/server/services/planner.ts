import { adminDb } from '@/lib/firebase/admin-app';
import { GenerateStudyPlanOutput, GenerateStudyPlanInput } from '@/server/ai/flows/study-plan-generation';
import { addDays, Day } from 'date-fns';
import * as admin from 'firebase-admin';

// Maps day names from the AI output to date-fns Day index (0=Sun, 1=Mon, ...)
const dayNameToIndex: { [key: string]: Day } = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

export async function saveStudyPlanTasks(
    userId: string,
    planId: string,
    planOutput: GenerateStudyPlanOutput
) {
    const batch = adminDb.batch();

    const generationDate = new Date();

    planOutput.weeklyPlans.forEach(week => {
        const weekOffset = week.week - 1;
        week.dailyPlans.forEach(dayPlan => {
            const dayIndex = dayNameToIndex[dayPlan.day];
            if (dayIndex === undefined) return;

            const dayDifference = (dayIndex - generationDate.getDay() + 7) % 7;
            const daysFromToday = (weekOffset * 7) + dayDifference;
            const taskDate = addDays(generationDate, daysFromToday);

            dayPlan.sessions.forEach(session => {
                if (session.subject === 'Free') return;

                const taskRef = adminDb.collection('study_tasks').doc();
                const taskData = {
                    studyTaskId: taskRef.id,
                    studyPlanId: planId,
                    userId,
                    subjectId: session.subject,
                    topic: session.topic,
                    taskType: session.revisionMethod.toLowerCase().replace(/ /g, '_'),
                    title: `${session.revisionMethod} for ${session.topic}`,
                    description: `Study ${session.topic} in ${session.subject}.`,
                    scheduledAt: taskDate,
                    priority: session.priority.toLowerCase(),
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                batch.set(taskRef, taskData);
            });
        });
    });
    
    await batch.commit();
}
