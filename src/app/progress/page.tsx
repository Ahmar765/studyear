'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useRef, useState } from 'react';
import { getStudentProgressAction } from '@/server/actions/progress-actions';
import ProgressClientPage from './progress-client';
import { Skeleton } from '@/components/ui/skeleton';

function ProgressLoading() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const lastFetchedUidRef = useRef<string | null>(null);
  const [chartData, setChartData] = useState<
    { name: string; progress: number; targetGrade: string }[]
  >([]);
  const [progressFetchDone, setProgressFetchDone] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      lastFetchedUidRef.current = null;
      setChartData([]);
      setProgressFetchDone(true);
      return;
    }

    const uid = user.uid;
    const uidChanged = lastFetchedUidRef.current !== uid;
    lastFetchedUidRef.current = uid;

    // Only block the whole page on first load or account switch. Re-fetching for the same uid
    // (e.g. Firebase auth object refresh) must not unmount ProgressClientPage — that wiped AI plan state.
    if (uidChanged) {
      setChartData([]);
      setProgressFetchDone(false);
    }

    let cancelled = false;
    getStudentProgressAction(uid)
      .then((data) => {
        if (!cancelled) setChartData(data);
      })
      .finally(() => {
        if (!cancelled) setProgressFetchDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || !progressFetchDone) {
    return <ProgressLoading />;
  }

  return <ProgressClientPage initialChartData={chartData} />;
}
