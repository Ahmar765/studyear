'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { getSchoolCommandCentreAction } from '@/server/actions/school-portal-actions';
import type { SchoolCommandCentrePayload } from '@/types/school-portal';
import { SchoolCommandCentreView } from '@/components/school-portal/school-command-centre-view';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SchoolDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SchoolCommandCentrePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent?: boolean) => {
      if (!user) return;
      if (!silent) setLoading(true);
      try {
        const token = await user.getIdToken();
        const result = await getSchoolCommandCentreAction(token);
        if (result.success && result.data) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error ?? 'Could not load command centre');
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
      <div className="school-ops-dashboard flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Command centre unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="school-ops-dashboard flex-1 space-y-6 p-4 md:p-8">
      {!data.onboardingComplete && (
        <Alert>
          <AlertTitle>Complete your school workspace deployment</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>Finish enterprise onboarding to unlock full operational intelligence.</span>
            <Button size="sm" asChild>
              <Link href="/school/onboarding">Continue setup</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <SchoolCommandCentreView data={data} />
    </div>
  );
}
