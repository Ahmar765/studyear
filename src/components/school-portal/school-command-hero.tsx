'use client';

import type { SchoolCommandCentrePayload } from '@/types/school-portal';
import { Activity, Building2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SchoolCommandHero({ data }: { data: SchoolCommandCentrePayload }) {
  return (
    <section className="school-ops-hero overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 p-6 text-white shadow-2xl md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          <Building2 className="h-3.5 w-3.5" />
          AI Academic Operations Centre
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          Live · {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.schoolName}</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Executive visibility across {data.kpis.find((k) => k.id === 'students')?.value ?? 0} students,{' '}
            {data.staffCount} staff, and {data.activeInterventions} active interventions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <span className="text-slate-300">Mission-critical intelligence</span>
        </div>
      </div>
    </section>
  );
}
