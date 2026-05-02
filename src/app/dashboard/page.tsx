
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Activity, Flag, Target, ArrowRight, Bell, GraduationCap } from 'lucide-react';
import IntelligenceBriefing from './intelligence-briefing';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import UpcomingTasks from './upcoming-tasks';
import { getStudentDashboardStatsAction } from '@/server/actions/dashboard-actions';
import ActivityFeed from './activity-feed';

interface DashboardStats {
    studyStreak: number;
    lessonsCompleted: number;
    weakestSubject: string;
    predictedGrade: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
        getStudentDashboardStatsAction({ userId: user.uid }).then(result => {
            if (result.stats) {
                setStats(result.stats);
            }
            setStatsLoading(false);
        });
    }
  }, [user]);

  const loading = profileLoading || statsLoading;

  const kpiData = useMemo(() => {
    return [
      { title: "Predicted Grade", value: stats?.predictedGrade || 'N/A', icon: GraduationCap },
      { title: "Study Streak", value: `${stats?.studyStreak || 0} Days`, icon: Activity },
      { title: "Lessons Completed", value: stats?.lessonsCompleted || 0, icon: BookOpen },
      { title: "Weakest Subject", value: stats?.weakestSubject || 'N/A', icon: Flag },
    ];
  }, [stats]);


  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <Skeleton className="h-9 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
             <Skeleton className="lg:col-span-2 h-64" />
             <Skeleton className="h-64" />
        </div>
    </div>
    );
  }

  if (!userProfile) {
    // This case should be handled by AppLayout redirecting to profile setup, but as a fallback:
    return <div className="flex h-full w-full items-center justify-center">Redirecting...</div>;
  }

  const diagnosticComplete = userProfile.diagnosticComplete;
  
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back, {userProfile.name?.split(' ')[0] || 'Student'}!</h2>
            <p className="text-muted-foreground">
                Here's your academic command centre. Let's make today productive.
            </p>
        </div>

        {!diagnosticComplete && (
            <Alert className="border-primary bg-primary/5">
                <Target className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-bold">Your First Step to Better Grades</AlertTitle>
                <AlertDescription>
                    Generate your AI-powered Academic Diagnostic report. It's the essential first step to building your personal recovery plan.
                </AlertDescription>
                 <div className="mt-4">
                    <Button asChild>
                        <Link href="/assessment">
                            Start My Diagnostic Now <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiData.map(kpi => (
                <Card key={kpi.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-8">
              <UpcomingTasks />
            </div>
            <div className="md:col-span-1 space-y-8">
              <IntelligenceBriefing />
              <ActivityFeed />
            </div>
        </div>
    </div>
  );
}
