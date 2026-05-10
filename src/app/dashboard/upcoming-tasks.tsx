
'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
    clearPendingStudyTasksAction,
    getUpcomingTasksAction,
} from '@/server/actions/planner-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths, getDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Task {
    id: string;
    title: string;
    subjectId: string;
    scheduledAt: string;
    priority: 'high' | 'medium' | 'low';
}

const getCellColor = (subject: string) => {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 95%)`;
};

const getCellTextColor = (subject: string) => {
     let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 80%, 20%)`;
}

export default function UpcomingTasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isFetching, startFetching] = useTransition();
    const [isClearing, startClearing] = useTransition();
    const [calendarClearOpen, setCalendarClearOpen] = useState(false);
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

    // date-fns' getDay: 0=Sun, 1=Mon, ..., 6=Sat
    const startingDayIndex = getDay(firstDayOfMonth);

    /**
     * `firstDayOfMonth` changes identity every render — never put it in hook deps (infinite fetch loop).
     * `getTime()` is stable while the visible month is unchanged.
     */
    const monthEpoch = currentMonth.getTime();

    const loadTasks = useCallback(() => {
        if (!user) return;
        const rangeStart = startOfMonth(currentMonth);
        const rangeEnd = endOfMonth(currentMonth);
        startFetching(async () => {
            const result = await getUpcomingTasksAction({
                userId: user.uid,
                startDate: rangeStart.toISOString(),
                endDate: rangeEnd.toISOString(),
            });
            if (result.tasks) {
                setTasks(result.tasks);
            } else if (result.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- monthEpoch tracks `currentMonth`; avoid Date identity churn
    }, [monthEpoch, user, toast]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const handleConfirmClearCalendar = () => {
        if (!user) return;
        startClearing(async () => {
            const result = await clearPendingStudyTasksAction({ userId: user.uid });
            if (!result.success) {
                toast({
                    variant: 'destructive',
                    title: 'Could not clear calendar',
                    description: result.error ?? 'Try again in a moment.',
                });
                return;
            }
            setCalendarClearOpen(false);
            toast({
                title: 'Calendar cleared',
                description:
                    result.cleared === 0
                        ? 'There were no pending sessions to remove.'
                        : `Removed ${result.cleared} scheduled session${result.cleared === 1 ? '' : 's'}.`,
            });
            loadTasks();
        });
    };

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                            <CardTitle>Study Calendar</CardTitle>
                            <CardDescription>
                                Sessions from your latest AI study plan appear here by date. Generate or refresh a plan
                                in{" "}
                                <Link href="/planner" className="font-medium text-primary underline-offset-4 hover:underline">
                                    AI Study Planner
                                </Link>
                                .
                            </CardDescription>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                            <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="min-w-[9rem] text-center text-base font-semibold tabular-nums sm:text-lg">
                                {format(currentMonth, 'MMMM yyyy')}
                            </span>
                            <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-start sm:justify-end">
                        <AlertDialog open={calendarClearOpen} onOpenChange={setCalendarClearOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isFetching || isClearing || !user}
                                    aria-label="Clear study calendar"
                                    className={cn(
                                        'gap-2 border-red-500/35 bg-background font-medium',
                                        'text-red-700 hover:bg-red-500/10 hover:text-red-800',
                                        'dark:border-red-400/35 dark:text-red-300 dark:hover:bg-red-500/15 dark:hover:text-red-200',
                                    )}
                                >
                                    <Trash2 className="h-4 w-4 shrink-0" />
                                    Clear calendar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Clear study calendar?</AlertDialogTitle>
                                    <AlertDialogDescription asChild>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <p>
                                                This removes every pending session created from your AI study planner
                                                from this calendar.
                                            </p>
                                            <p>
                                                Your saved study plan in{" "}
                                                <Link href="/saved-resources" className="underline text-foreground">
                                                    Saved resources
                                                </Link>{" "}
                                                is not deleted. Generate a new plan anytime in{" "}
                                                <Link href="/planner" className="underline text-foreground">
                                                    AI Study Planner
                                                </Link>
                                                .
                                            </p>
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                                    <Button
                                        variant="destructive"
                                        disabled={isClearing}
                                        onClick={handleConfirmClearCalendar}
                                    >
                                        {isClearing ? (
                                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Clear calendar
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isFetching ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader className="animate-spin h-8 w-8 text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                                No sessions this month. Generate a study plan in{' '}
                                <Link href="/planner" className="font-medium text-primary underline-offset-4 hover:underline">
                                    AI Study Planner
                                </Link>{' '}
                                to fill your calendar.
                            </div>
                        ) : null}
                        <div className="grid grid-cols-7 border-t border-l">
                         {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="p-2 text-center font-semibold text-xs text-muted-foreground border-b border-r bg-muted/50">{day}</div>
                        ))}
                        {Array.from({ length: startingDayIndex }).map((_, i) => (
                            <div key={`empty-start-${i}`} className="border-b border-r bg-muted/20 min-h-36"></div>
                        ))}
                        {daysInMonth.map(day => {
                            const dayTasks = tasks.filter(task => format(new Date(task.scheduledAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                            return (
                                <div key={day.toString()} className="min-h-36 relative p-1 pt-6 border-b border-r">
                                    <time dateTime={format(day, 'yyyy-MM-dd')} className={cn("absolute top-1 right-1 h-6 w-6 text-xs flex items-center justify-center rounded-full", isToday(day) && "bg-primary text-primary-foreground font-bold")}>
                                        {format(day, 'd')}
                                    </time>
                                    <div className="space-y-1">
                                        {dayTasks.map(task => (
                                            <Link href="/planner" key={task.id} title={task.title}>
                                                <div 
                                                    className="p-1 rounded-md text-xs transition-transform hover:scale-105"
                                                    style={{ backgroundColor: getCellColor(task.subjectId), color: getCellTextColor(task.subjectId) }}
                                                >
                                                    <p className="font-bold truncate">{task.subjectId}</p>
                                                    <p className="truncate">{task.title}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                         {Array.from({ length: (42 - daysInMonth.length - startingDayIndex) > 0 ? (42 - daysInMonth.length - startingDayIndex) : (35 - daysInMonth.length - startingDayIndex) }).map((_, i) => (
                             <div key={`empty-end-${i}`} className="border-b border-r bg-muted/20 min-h-36"></div>
                        ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
