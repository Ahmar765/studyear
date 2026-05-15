'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getSchoolTutorDashboardDataAction } from '@/server/actions/teacher-actions';
import type { SchoolTutorDashboardPayload } from '@/types/school-tutor-dashboard';
import { SchoolTutorDashboardView } from '@/components/school-tutor/school-tutor-dashboard-view';
import { SchoolLinkSchoolCard } from '@/components/school-tutor/school-link-school-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Building2 } from 'lucide-react';

export default function SchoolTutorDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SchoolTutorDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent?: boolean) => {
      if (!user) return;
      if (!silent) setLoading(true);
      try {
        const token = await user.getIdToken();
        const result = await getSchoolTutorDashboardDataAction(token);
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
      <div className="school-dashboard flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-24" />
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
    <div className="school-dashboard flex-1 space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-indigo-500/40 text-indigo-800 dark:text-indigo-200">
          <Building2 className="mr-1 h-3 w-3" />
          Institutional staff
        </Badge>
      </header>
      <SchoolLinkSchoolCard onLinked={() => void load(true)} />
      <SchoolTutorDashboardView data={data} />
    </div>
  );
}
