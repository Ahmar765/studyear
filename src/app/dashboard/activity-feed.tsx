
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle, Bookmark, CalendarCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getActivityFeedAction, ActivityFeedItem } from '@/server/actions/activity-actions';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

const iconMap: Record<string, typeof Activity> = {
    QUIZ_COMPLETED: CheckCircle,
    QUIZ_SUBMITTED: CheckCircle,
    LESSON_COMPLETED: CheckCircle,
    RESOURCE_SAVED: Bookmark,
    RESOURCE_GENERATED: Bookmark,
    PLAN_GENERATED: CalendarCheck,
    STUDY_PLAN_GENERATED: CalendarCheck,
    DIAGNOSTIC_COMPLETED: Activity,
    QUESTION_ASKED: Activity,
    INTERVENTION_TRIGGERED: CalendarCheck,
};

export default function ActivityFeed() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setActivities([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const idToken = await user.getIdToken();
                const result = await getActivityFeedAction(idToken);
                if (!cancelled && result.activities) {
                    setActivities(result.activities);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Feed</CardTitle>
                    <CardDescription>Your recent platform activity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity /> Activity Feed</CardTitle>
                <CardDescription>A log of your recent actions on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                {activities.length > 0 ? (
                    <div className="space-y-4">
                        {activities.map(item => {
                            const Icon = iconMap[item.type] || Activity;
                            return (
                                <div key={item.id} className="flex items-start gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{item.title}</p>
                                        {item.description ? (
                                          <p className="text-xs text-muted-foreground">{item.description}</p>
                                        ) : null}
                                        <p className="text-xs text-muted-foreground/70 mt-0.5">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground h-48 flex items-center justify-center">
                        <p>Your recent activity will appear here once you start using the platform.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
