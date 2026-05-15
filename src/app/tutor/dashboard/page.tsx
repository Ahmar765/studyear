'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getTutorDashboardDataAction } from '@/server/actions/tutor-actions';
import type { TutorDashboardPayload } from '@/types/tutor-dashboard';
import { TutorDashboardView } from '@/components/tutor/tutor-dashboard-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TutorDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TutorDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent?: boolean) => {
      if (!user) return;
      if (!silent) setLoading(true);
      try {
        const token = await user.getIdToken();
        const result = await getTutorDashboardDataAction(token);
        if (result.success && result.data) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error ?? 'Could not load dashboard');
        }
      } catch {
        setError('Session error — try refreshing.');
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || !data) return;
    const refresh = () => void load(true);
    const id = window.setInterval(refresh, 45_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, [user, data, load]);

  if (loading) {
    return (
      <div className="tutor-dashboard flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="tutor-dashboard flex-1 space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-200">
            <Briefcase className="mr-1 h-3 w-3" />
            Teaching operator
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Tutor Command Centre</h1>
          <p className="max-w-2xl text-muted-foreground">
            Revenue, students, and session intelligence — built for professional tutors, not learners.
          </p>
        </div>
        {!data.onboardingComplete && (
          <Button asChild>
            <Link href="/tutor/onboarding">Complete profile setup</Link>
          </Button>
        )}
        {data.approvalStatus === 'PENDING' && (
          <Badge className="bg-amber-600">Awaiting StudYear approval</Badge>
        )}
      </header>
      <TutorDashboardView data={data} onRefresh={() => void load(true)} />
    </div>
  );
}
