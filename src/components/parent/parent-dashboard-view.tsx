'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommandCentreHero } from '@/components/parent/command-centre-hero';
import { LiveSubjectsPanel, SavedResourcesPanel } from '@/components/parent/parent-live-data-panels';
import type { ChildSnapshot, ParentDashboardPayload, ParentPlanTier } from '@/types/parent-dashboard';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Brain,
  Calendar,
  Clock,
  GraduationCap,
  Heart,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

const moodEmoji: Record<ChildSnapshot['mood'], string> = {
  focused: '🎯',
  steady: '✨',
  stressed: '⚡',
  recovering: '🌱',
};

const planLabels: Record<ParentPlanTier, string> = {
  PARENT_PRO: 'Parent Pro',
  PARENT_PRO_PLUS: 'Parent Pro+',
  PARENT_ELITE: 'Parent Elite',
};

function LockedOverlay({ label, href = '/checkout' }: { label: string; href?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
      <Lock className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="mb-3 text-sm text-muted-foreground">{label}</p>
      <Button size="sm" asChild>
        <Link href={href}>Upgrade plan</Link>
      </Button>
    </div>
  );
}

function ChildSnapshotCard({
  child,
  selected,
  onSelect,
}: {
  child: ChildSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  const riskColor =
    child.examRisk === 'low'
      ? 'text-emerald-600'
      : child.examRisk === 'moderate'
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'parent-child-card w-full rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/30'
          : 'border-border bg-card hover:border-primary/40 hover:shadow-md',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={child.avatarSrc} />
          <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{child.name}</p>
            <span title={child.mood}>{moodEmoji[child.mood]}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {child.yearGroup}
            {(child.subjects?.length ?? 0) > 0 && (
              <span> · {child.subjects.length} live subject{child.subjects.length === 1 ? '' : 's'}</span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {child.academicHealth}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Engagement</p>
          <p className="font-medium">{child.engagement}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Focus</p>
          <p className="font-medium">{child.focusStability}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Exam risk</p>
          <p className={cn('font-medium capitalize', riskColor)}>{child.examRisk}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Weekly growth</p>
          <p className={cn('font-medium', child.weeklyGrowth >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {child.weeklyGrowth >= 0 ? '+' : ''}
            {child.weeklyGrowth}%
          </p>
        </div>
      </div>
    </button>
  );
}

export function ParentDashboardView({ data }: { data: ParentDashboardPayload }) {
  const [selectedId, setSelectedId] = useState(data.children[0]?.id ?? '');
  const selected = useMemo(
    () => data.children.find((c) => c.id === selectedId) ?? data.children[0],
    [data.children, selectedId],
  );

  const perf = useMemo(
    () => data.performance.find((p) => p.studentId === selected?.id),
    [data.performance, selected?.id],
  );

  const advisorQuestions = [
    'Why is my child struggling?',
    'What subject needs urgent attention?',
    'Is burnout likely?',
    'Should revision intensity increase?',
  ];

  if (data.children.length === 0) return null;

  return (
    <div className="parent-dashboard space-y-8">
      <CommandCentreHero data={data} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Live child snapshots</h3>
          <Badge variant="secondary">{data.children.length} linked</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.children.map((child) => (
            <ChildSnapshotCard
              key={child.id}
              child={child}
              selected={child.id === selected?.id}
              onSelect={() => setSelectedId(child.id)}
            />
          ))}
        </div>
      </section>

      {selected && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live">Subjects & resources</TabsTrigger>
            <TabsTrigger value="warnings">Early warnings</TabsTrigger>
            <TabsTrigger value="study">Study intelligence</TabsTrigger>
            <TabsTrigger value="pathway">Future pathway</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="parent-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                    Performance momentum
                  </CardTitle>
                  <CardDescription>Growth trajectory for {selected.name}</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {perf && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={perf.momentum}>
                        <defs>
                          <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="url(#momGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="parent-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-violet-500" />
                    Subject heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {perf && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={perf.subjectHeatmap} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="subject" width={90} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="intensity" radius={[0, 4, 4, 0]}>
                          {perf.subjectHeatmap.map((_, i) => (
                            <Cell key={i} fill={`hsl(${220 + i * 25}, 70%, 55%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <LiveSubjectsPanel child={selected} />
              <SavedResourcesPanel child={selected} />
            </div>

            <Card className="parent-panel relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Homework & deadline command centre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.homework
                  .filter((h) => h.studentId === selected.id)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.subject} · due in {item.dueInDays} days
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="min-w-[120px]">
                          <p className="mb-1 text-xs text-muted-foreground">Completion probability</p>
                          <Progress value={item.completionProbability} className="h-2" />
                          <p className="mt-1 text-right text-xs font-medium">{item.completionProbability}%</p>
                        </div>
                        <Badge variant={item.lateRisk === 'low' ? 'secondary' : 'destructive'}>
                          {item.lateRisk} late risk
                        </Badge>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <LiveSubjectsPanel child={selected} />
              <SavedResourcesPanel child={selected} />
            </div>
            {selected.predictedGrade && (
              <Card className="parent-panel">
                <CardHeader>
                  <CardTitle className="text-base">AI grade forecast</CardTitle>
                  <CardDescription>Latest prediction from your child&apos;s dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{selected.predictedGrade}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="warnings" className="space-y-4">
            {data.earlyWarnings
              .filter((w) => w.studentId === selected.id)
              .map((warning) => (
                <Card
                  key={warning.id}
                  className={cn(
                    'parent-panel overflow-hidden',
                    warning.severity === 'critical' && 'parent-risk-pulse border-red-500/50',
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{warning.title}</CardTitle>
                      <Badge variant="destructive">{warning.probability}% probability</Badge>
                    </div>
                    <CardDescription>
                      Forecast window: {warning.forecastDays} days · {warning.studentName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Primary causes</p>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {warning.causes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                        <Sparkles className="h-3 w-3" /> AI recommendation
                      </p>
                      <p className="text-sm">{warning.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {data.earlyWarnings.filter((w) => w.studentId === selected.id).length === 0 && (
              <Card className="parent-panel border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="flex items-center gap-3 py-8">
                  <Shield className="h-8 w-8 text-emerald-600" />
                  <p>No elevated risks detected — the system is protecting {selected.name}.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="study" className="space-y-6">
            {data.verifiedHours
              .filter((v) => v.studentId === selected.id)
              .map((hours) => (
                <Card key={hours.studentId} className="parent-panel border-emerald-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      Real Verified Study Hours™
                    </CardTitle>
                    <CardDescription>Genuine participation — not passive tab time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-muted/50 p-4 text-center">
                        <p className="text-2xl font-bold">{hours.loggedHours}h</p>
                        <p className="text-xs text-muted-foreground">Logged</p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                          {hours.verifiedHours}h
                        </p>
                        <p className="text-xs text-muted-foreground">Verified productive</p>
                      </div>
                      <div className="rounded-lg bg-violet-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                          {hours.verifiedScore}%
                        </p>
                        <p className="text-xs text-muted-foreground">Verified score · {hours.sessionQuality}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            <Card className="parent-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-4 w-4 text-violet-500" />
                  AI study behaviour engine
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {data.studyInsights
                  .filter((i) => i.studentId === selected.id)
                  .map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4 text-sm"
                    >
                      {insight.insight}
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="parent-panel relative">
              {!data.features.emotionalIntelligence && (
                <LockedOverlay label="Emotional intelligence — Parent Pro+ and Elite" />
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Emotional & motivation intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.emotionalSignals
                  .filter((e) => e.studentId === selected.id)
                  .map((signal) => (
                    <div
                      key={signal.id}
                      className={cn(
                        'rounded-lg border p-3 text-sm',
                        signal.state === 'concern'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-emerald-500/30 bg-emerald-500/5',
                      )}
                    >
                      <p className="font-medium">{signal.signal}</p>
                      {signal.action && <p className="mt-1 text-muted-foreground">{signal.action}</p>}
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pathway" className="space-y-6">
            <Card className="parent-panel relative">
              {!data.features.pathwayEngine && <LockedOverlay label="Predictive grade engine — Parent Pro+ and Elite" />}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  University & future pathway engine
                </CardTitle>
                <CardDescription>GCSE trajectory · predictive certainty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.gradeProbabilities.map((g) => (
                  <div key={g.grade}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{g.grade} likelihood</span>
                      <span className="font-semibold">{g.likelihood}%</span>
                    </div>
                    <Progress value={g.likelihood} className="h-3" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="parent-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Micro weakness detection
                </CardTitle>
                <CardDescription>Precision interventions — not generic “weak in Maths”</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.microWeaknesses
                  .filter((m) => m.studentId === selected.id)
                  .map((mw) => (
                    <div key={mw.id} className="rounded-lg border p-4">
                      <p className="font-medium">{mw.subject}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mw.areas.map((area) => (
                          <Badge key={area} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Recovery timeline: ~{mw.recoveryWeeks} weeks · {mw.intensity} intensity
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {perf && (
              <Card className="parent-panel">
                <CardHeader>
                  <CardTitle className="text-base">Exam readiness radar</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={perf.examReadiness}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <Radar dataKey="readiness" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {data.family && data.features.familyIntelligence && (
        <Card className="parent-panel border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
          <CardHeader>
            <CardTitle>Family learning intelligence</CardTitle>
            <CardDescription>Household overview — no toxic ranking</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{data.family.householdConsistency}</p>
              <p className="text-xs text-muted-foreground">Household consistency</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">+{data.family.combinedMomentum}%</p>
              <p className="text-xs text-muted-foreground">Combined momentum</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">+{data.family.weeklyImprovement}%</p>
              <p className="text-xs text-muted-foreground">Weekly improvement</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{data.family.activeChildren}</p>
              <p className="text-xs text-muted-foreground">Active learners</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="parent-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Weekly AI parent briefing
            </CardTitle>
            <CardDescription>
              Executive summary · {new Date(data.weeklyBriefing.generatedAt).toLocaleDateString('en-GB')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{data.weeklyBriefing.summary}</p>
            {data.weeklyBriefing.wins.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-emerald-600">Wins</p>
                <ul className="space-y-1 text-sm">
                  {data.weeklyBriefing.wins.map((w) => (
                    <li key={w}>✓ {w}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.weeklyBriefing.risks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-amber-600">Risks</p>
                <ul className="space-y-1 text-sm">
                  {data.weeklyBriefing.risks.map((r) => (
                    <li key={r}>⚠ {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="parent-panel relative">
          {!data.features.parentAdvisor && <LockedOverlay label="AI Parent Advisor — Parent Pro+ and Elite" />}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-sky-500" />
              AI parent advisor
            </CardTitle>
            <CardDescription>Your co-pilot for parenting education</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              Ask anything about {selected?.name ?? 'your child'}&apos;s learning — personalised to live data.
            </div>
            <div className="flex flex-wrap gap-2">
              {advisorQuestions.map((q) => (
                <Button key={q} variant="outline" size="sm" className="text-xs">
                  {q}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.features.aiIntervention && (
        <Card className="parent-panel border-sky-500/40 bg-gradient-to-r from-sky-500/10 via-transparent to-violet-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-500" />
              AI intervention mode
              <Badge>{planLabels[data.planTier]}</Badge>
            </CardTitle>
            <CardDescription>
              The system actively protects your child — schedules, workloads, and recovery plans adjust automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {[
              'Rebuilds schedules',
              'Increases weak-area intensity',
              'Optimises revision timing',
              'Reduces burnout risk',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border bg-background/60 p-3">
                <Sparkles className="h-4 w-4 shrink-0 text-sky-500" />
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Plan: {planLabels[data.planTier]} · StudYear protects outcomes, not just displays data
      </p>
    </div>
  );
}
