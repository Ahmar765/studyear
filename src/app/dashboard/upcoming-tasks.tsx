
'use client';

import { useEffect, useState, useTransition } from 'react';
import { getUpcomingTasksAction } from '@/server/actions/planner-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths, isSameMonth, getDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

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
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

    // date-fns' getDay: 0=Sun, 1=Mon, ..., 6=Sat
    const startingDayIndex = getDay(firstDayOfMonth);

    useEffect(() => {
        if (!user) return;
        startFetching(async () => {
            const result = await getUpcomingTasksAction({
                userId: user.uid,
                startDate: firstDayOfMonth.toISOString(),
                endDate: lastDayOfMonth.toISOString(),
            });
            if (result.tasks) {
                setTasks(result.tasks);
            } else if (result.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }, [currentMonth, toast, user]);

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };
    
    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Study Calendar</CardTitle>
                        <CardDescription>Your AI-generated study plan at a glance.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold text-lg w-32 text-center">{format(currentMonth, "MMMM yyyy")}</span>
                        <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isFetching ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader className="animate-spin h-8 w-8 text-primary" />
                    </div>
                ) : (
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
                )}
                 {tasks.length === 0 && !isFetching && (
                     <div className="text-center text-muted-foreground py-16">
                        <p className="mb-4">No tasks scheduled for this month. Generate a study plan to get started!</p>
                        <Button asChild><Link href="/planner">Go to Planner</Link></Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
