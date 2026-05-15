'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSchoolTutorDashboardDataAction } from '@/server/actions/teacher-actions';
import type { SchoolTutorDashboardPayload } from '@/types/school-tutor-dashboard';
import type { LucideIcon } from 'lucide-react';
import { SchoolLinkSchoolCard } from '@/components/school-tutor/school-link-school-card';

export function SchoolTutorSubPage({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children: (data: SchoolTutorDashboardPayload) => React.ReactNode;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<SchoolTutorDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const result = await getSchoolTutorDashboardDataAction(token);
    if (result.success && result.data) setData(result.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="school-dashboard p-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="school-dashboard flex-1 space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          {Icon && <Icon className="h-8 w-8 text-indigo-600" />}
          {title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{description}</p>
      </header>
      <SchoolLinkSchoolCard onLinked={() => void load()} />
      {children(data)}
    </div>
  );
}

export function SchoolPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <Card className="school-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
