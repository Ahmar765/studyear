'use client';

import type { SchoolTutorDashboardPayload } from '@/types/school-tutor-dashboard';
import { Building2, Shield } from 'lucide-react';

export function SchoolTutorCommandHero({ data }: { data: SchoolTutorDashboardPayload }) {
  return (
    <section className="school-glass-grid overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
          <Building2 className="h-3.5 w-3.5" />
          School Tutor Command Centre
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          <Shield className="h-3.5 w-3.5" />
          {data.staff.schoolName}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {data.staff.name.split(' ')[0]}, your academic operations hub
          </h2>
          <p className="max-w-xl text-sm text-slate-400">
            {data.staff.department ? `${data.staff.department} · ` : ''}
            Live cohort monitoring for {data.overview.totalStudents} students
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Cohort avg" value={`${data.overview.avgProgress}%`} />
          <Stat label="At risk" value={String(data.overview.atRiskCount)} highlight={data.overview.atRiskCount > 0} />
          <Stat label="Homework done" value={`${data.overview.homeworkCompletionPct}%`} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 backdrop-blur ${highlight ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/5'}`}
    >
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
