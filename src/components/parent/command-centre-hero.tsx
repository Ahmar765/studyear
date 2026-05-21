'use client';

import { cn } from '@/lib/utils';
import type { LiveAlert, ParentDashboardPayload } from '@/types/parent-dashboard';
import { Activity, Sparkles, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const severityStyles: Record<LiveAlert['severity'], string> = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  critical: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300 parent-alert-pulse',
};

function StabilityRing({ score, status }: { score: number; status: string }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const stroke =
    status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981';

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="parent-ring-glow transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-white">{score}</span>
        <span className="text-xs uppercase tracking-widest text-slate-400">Stability</span>
      </div>
    </div>
  );
}

const planLabels = {
  PARENT_PRO: 'Parent Pro',
  PARENT_PRO_PLUS: 'Parent Pro+',
  PARENT_ELITE: 'Parent Elite',
} as const;

export function CommandCentreHero({ data }: { data: ParentDashboardPayload }) {
  const { stability, liveAlerts, planTier, features } = data;
  const visibleAlerts = features.fullLiveAlerts ? liveAlerts : liveAlerts.slice(0, 3);
  const statusLabel =
    stability.status === 'stable'
      ? 'Stable'
      : stability.status === 'warning'
        ? 'Watch closely'
        : 'Intervention required';

  return (
    <section className="parent-glass-grid overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl md:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
          <Sparkles className="h-3.5 w-3.5" />
          Academic Command Centre
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          Live intelligence
        </span>
        <span className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
          {planLabels[planTier]}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Academic Stability</h2>
            <p className="mt-1 text-sm text-slate-400">{statusLabel} — AI monitoring active across linked learners</p>
          </div>
          <StabilityRing score={stability.overallScore} status={stability.status} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-slate-400">Weekly momentum</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-semibold text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                {stability.weeklyMomentum >= 0 ? '+' : ''}
                {stability.weeklyMomentum}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-slate-400">Focus consistency</p>
              <p className="mt-1 text-xl font-semibold text-violet-300">{stability.focusConsistency}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-white/10 bg-black/20 backdrop-blur">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              {features.fullLiveAlerts ? 'Live AI Alerts' : 'Priority alerts'}
            </h3>
          </div>
          <ScrollArea className="h-[280px] px-4 py-3">
            <ul className="space-y-2">
              {visibleAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-sm transition-transform hover:scale-[1.01]',
                    severityStyles[alert.severity] ?? severityStyles.info,
                  )}
                >
                  {alert.message}
                </li>
              ))}
            </ul>
            {!features.fullLiveAlerts && liveAlerts.length > 3 && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Upgrade to Parent Pro+ for the full live alert feed.
              </p>
            )}
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}