'use client';

import type { SchoolHealthCell } from '@/types/school-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const heatClass = {
  strong: 'from-emerald-600/80 to-emerald-800/90',
  watch: 'from-amber-500/80 to-amber-700/90',
  critical: 'from-red-600/80 to-red-900/90',
};

export function SchoolHealthMap({
  title,
  description,
  cells,
}: {
  title: string;
  description: string;
  cells: SchoolHealthCell[];
}) {
  return (
    <Card className="school-ops-panel">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {cells.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet — link students to populate the health map.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cells.map((cell) => (
              <div
                key={cell.id}
                className={cn(
                  'rounded-lg border border-white/10 bg-gradient-to-br p-4 text-white shadow-sm',
                  heatClass[cell.status],
                )}
              >
                <p className="font-semibold">{cell.label}</p>
                <p className="mt-1 text-xs text-white/80">{cell.studentCount} students</p>
                <Progress value={cell.avgProgress} className="mt-3 h-1.5 bg-black/20" />
                <p className="mt-2 text-xs">
                  {cell.avgProgress}% avg · {cell.atRiskCount} at risk
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
