'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Loader } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import {
  getSchoolProgressOverviewAction,
  type SchoolProgressOverview,
} from '@/server/actions/school-actions';

export default function SchoolProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<SchoolProgressOverview | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError('Not authenticated.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await getSchoolProgressOverviewAction(token);
        if (!cancelled) {
          setOverview(res.overview);
          setError(res.error);
        }
      } catch {
        if (!cancelled) setError('Failed to load analytics.');
      } finally {
        if (!cancelled) setPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || pending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData =
    overview?.byYearGroup.map((r) => ({
      name: r.yearGroup,
      students: r.count,
      progress: r.avgProgress,
    })) ?? [];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Progress Analytics</h2>
        <p className="text-muted-foreground">
          Aggregated from linked student profiles and dashboard progress scores.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students on roll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.studentCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">School avg. progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.avgProgress ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">At-risk (HIGH/CRITICAL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {overview?.atRiskCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Progress by year group
          </CardTitle>
          <CardDescription>Mean progress score per cohort label on student profiles.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-lg">
              <LineChart className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-semibold">No cohort data yet</p>
              <p className="text-sm max-w-md">
                Link students with year groups on their profiles to populate this chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8 }}
                  formatter={(value: number, name: string) => [
                    name === 'progress' ? `${value}%` : value,
                    name === 'progress' ? 'Avg progress' : 'Students',
                  ]}
                />
                <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
