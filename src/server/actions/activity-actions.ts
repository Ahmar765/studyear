
'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import { getCurrentUser } from '../lib/auth';
import * as admin from 'firebase-admin';

export interface ActivityFeedItem {
    id: string;
    type: 'QUIZ_COMPLETED' | 'LESSON_COMPLETED' | 'RESOURCE_SAVED' | 'PLAN_GENERATED' | string;
    title: string;
    description: string;
    timestamp: string;
}

const eventTypeToTitleMap: Record<string, (payload: any) => string> = {
    QUIZ_SUBMITTED: (p) => `Quiz Completed: ${p.subjectId || 'General'}`,
    LESSON_COMPLETED: (p) => `Lesson Completed: ${p.topic || 'General'}`,
    RESOURCE_GENERATED: (p) => `Resource Created: ${p.entityType || 'New Resource'}`,
    DIAGNOSTIC_COMPLETED: () => 'Academic Diagnostic Completed',
    default: (p) => `New activity: ${p.eventType}`,
};

const eventTypeToDescriptionMap: Record<string, (payload: any) => string> = {
    QUIZ_SUBMITTED: (p) => `Scored ${p.scoreRaw}/${p.outOf}`,
    RESOURCE_GENERATED: (p) => `A new ${p.entityType?.toLowerCase().replace(/_/g, ' ')} was added to your library.`,
    DIAGNOSTIC_COMPLETED: (p) => `Your academic baseline report is ready.`,
    default: (p) => ``,
};

export async function getActivityFeedAction(): Promise<{ activities: ActivityFeedItem[], error?: string }> {
    const user = await getCurrentUser();
    if (!user) {
        return { activities: [], error: 'User not authenticated' };
    }
    
    try {
        const eventsSnapshot = await adminDb
            .collection('learning_events')
            .where('studentId', '==', user.uid)
            .limit(80)
            .get();

        const sorted = [...eventsSnapshot.docs].sort((a, b) => {
            const ta = a.data().createdAt?.toMillis?.() ?? 0;
            const tb = b.data().createdAt?.toMillis?.() ?? 0;
            return tb - ta;
        });

        if (sorted.length === 0) {
            return { activities: [] };
        }

        const activities = sorted.slice(0, 10).map((doc) => {
            const data = doc.data();
            const payload = data.payload || {};
            const eventType = data.type || 'UNKNOWN';

            const titleFn = eventTypeToTitleMap[eventType] || eventTypeToTitleMap.default;
            const descriptionFn = eventTypeToDescriptionMap[eventType] || eventTypeToDescriptionMap.default;
            
            return {
                id: doc.id,
                type: eventType,
                title: titleFn(payload),
                description: descriptionFn(payload),
                timestamp: (data.createdAt as admin.firestore.Timestamp).toDate().toISOString(),
            } as ActivityFeedItem;
        });
        
        return { activities };

    } catch (error: any) {
        console.error("Error fetching activity feed:", error);
        return { activities: [], error: error.message };
    }
}
