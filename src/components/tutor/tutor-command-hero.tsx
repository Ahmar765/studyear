'use client';

import type { TutorDashboardPayload } from '@/types/tutor-dashboard';
import { Briefcase, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TutorCommandHero({ data }: { data: TutorDashboardPayload }) {
  const statusLabel =
    data.approvalStatus === 'APPROVED'
      ? 'Marketplace live'
      : data.approvalStatus === 'PENDING'
        ? 'Awaiting approval'
        : 'Profile needs attention';

  return (
    <section className="tutor-glass-grid overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-slate-900 to-amber-950/40 p-6 text-white shadow-2xl md:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
          <Briefcase className="h-3.5 w-3.5" />
          Tutor Command Centre
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          <Sparkles className="h-3.5 w-3.5" />
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome back, {data.profile.name.split(' ')[0]}
          </h2>
          <p className="max-w-xl text-sm text-slate-400">
            {data.profile.headline ||
              'Run your teaching business — sessions, earnings, and student outcomes in one place.'}
          </p>
          {data.marketplaceInsight && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100/90">
              <Sparkles className="mb-1 inline h-4 w-4 text-amber-400" /> {data.marketplaceInsight}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          <StatTile label="Today" value={`£${data.revenue.earningsToday}`} icon={Wallet} />
          <StatTile label="This month" value={`£${data.revenue.earningsMonth}`} icon={TrendingUp} accent />
          <StatTile label="Rating" value={String(data.performance.rating)} sub="/ 5" />
          <StatTile label="Retention" value={`${data.performance.retention}%`} />
        </div>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof Wallet;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 backdrop-blur',
        accent ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/5',
      )}
    >
      {Icon && <Icon className="mb-2 h-4 w-4 text-amber-400" />}
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {sub && <span className="text-sm font-normal text-slate-400">{sub}</span>}
      </p>
    </div>
  );
}
