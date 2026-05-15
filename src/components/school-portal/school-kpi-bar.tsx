'use client';

import type { SchoolPortalKpi } from '@/types/school-portal';
import { cn } from '@/lib/utils';

const statusStyles = {
  strong: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  watch: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  critical: 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
};

const dotStyles = {
  strong: 'bg-emerald-500',
  watch: 'bg-amber-500 animate-pulse',
  critical: 'bg-red-500 animate-pulse',
};

export function SchoolKpiBar({ kpis }: { kpis: SchoolPortalKpi[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className={cn('school-ops-panel rounded-xl border p-4 transition-shadow hover:shadow-md', statusStyles[kpi.status])}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{kpi.label}</p>
            <span className={cn('h-2 w-2 rounded-full', dotStyles[kpi.status])} />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{kpi.value}</p>
          {kpi.hint && <p className="mt-1 text-[10px] opacity-70">{kpi.hint}</p>}
        </div>
      ))}
    </section>
  );
}
