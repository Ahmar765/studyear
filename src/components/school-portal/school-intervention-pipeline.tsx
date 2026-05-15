'use client';

import type { SchoolInterventionPipeline } from '@/types/school-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const stages = [
  { key: 'identified', label: 'Identified' },
  { key: 'active', label: 'Active' },
  { key: 'improving', label: 'Improving' },
  { key: 'closed', label: 'Closed' },
] as const;

export function SchoolInterventionPipeline({ pipeline }: { pipeline: SchoolInterventionPipeline }) {
  const values: Record<string, number> = pipeline;

  return (
    <Card className="school-ops-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Intervention war room
          </CardTitle>
          <CardDescription>Academic recovery pipeline</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/school/interventions">Manage</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stages.map((s) => (
            <div key={s.key} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{values[s.key] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
