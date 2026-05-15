'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect, useState } from 'react';
import { getSchoolCommandCentreAction } from '@/server/actions/school-portal-actions';
import type { SchoolCommandCentrePayload } from '@/types/school-portal';
import { SchoolAcuPanel } from '@/components/school-portal/school-acu-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';

export default function SchoolAcuPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SchoolCommandCentrePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await getSchoolCommandCentreAction(token);
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="school-ops-dashboard p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="school-ops-dashboard flex-1 space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Bot className="h-8 w-8 text-violet-600" />
          School ACU command centre
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          AI consumption is infrastructure. Monitor burn rate, departmental load, and runway before depletion.
        </p>
      </header>

      <SchoolAcuPanel acu={data.acu} />

      <Card className="school-ops-panel">
        <CardHeader>
          <CardTitle className="text-base">Department AI load (estimated)</CardTitle>
          <CardDescription>Based on cohort size and 7-day consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.acu.topSubjects.map((row) => (
              <li key={row.subject} className="flex justify-between rounded border px-3 py-2 text-sm">
                <span>{row.subject}</span>
                <span className="font-mono text-muted-foreground">~{row.acus} ACUs</span>
              </li>
            ))}
            {data.acu.topSubjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No consumption data yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
