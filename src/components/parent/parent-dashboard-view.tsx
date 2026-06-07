'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { askParentAdvisorAction } from '@/server/actions/parent-advisor-actions';
import { triggerInterventionAction } from '@/server/actions/intervention-actions';
import { unlinkParentStudentAction } from '@/server/actions/parent-actions';
import { notifyParentDashboardRefresh } from '@/lib/parent-dashboard-events';
import { Textarea } from '@/components/ui/textarea';
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
  Loader,
  Unlink,
} from 'lucide-react';
import Link from 'next/link';
import { PARENT_ELITE_MONTHLY_ACUS, PARENT_PRO_PLUS_MONTHLY_ACUS } from '@/data/subscription-plans';

const moodEmoji: Record<ChildSnapshot['mood'], string> = {
  focused: '🎯',
  steady: '✨',
  stressed: '⚡',
  recovering: '🌱',
};

const planLabels: Record<ParentPlanTier, string> = {
  PARENT_VIEW: 'Parent View',
  PARENT_PRO: 'Parent Pro',
  PARENT_PRO_PLUS: 'Parent Pro+',
  PARENT_ELITE: 'Parent Elite',
};

const PRO_INCLUDES = [
  'Live child snapshots & stability score',
  'Early warnings & weekly AI briefing',
  'Verified study hours & homework centre',
];
const PRO_PLUS_INCLUDES = [
  'AI Parent Advisor & intervention mode',
  'Future pathway & university suggestions',
  'Predictive grades & micro-weakness detection',
  `${PARENT_PRO_PLUS_MONTHLY_ACUS.toLocaleString('en-GB')} ACUs per month`,
];

function ParentPlanBanner({ data }: { data: ParentDashboardPayload }) {
  const tier = data.planTier;
  const upgradeHint =
    tier === 'PARENT_PRO'
      ? `Upgrade to Parent Pro+ for AI tools, university pathways, and monthly ACUs.`
      : tier === 'PARENT_PRO_PLUS'
        ? `Parent Elite adds family intelligence, full live alerts, and ${PARENT_ELITE_MONTHLY_ACUS.toLocaleString('en-GB')} ACUs/month.`
        : null;
  const includes = tier === 'PARENT_PRO' ? PRO_INCLUDES : PRO_PLUS_INCLUDES;

  return (
    <Card className="parent-panel border-primary/25 bg-primary/5">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your subscription</p>
          <p className="text-lg font-semibold">{planLabels[tier]}</p>
          <ul className="mt-2 max-w-xl space-y-0.5 text-sm text-muted-foreground">
            {includes.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          {upgradeHint ? <p className="mt-2 max-w-xl text-sm font-medium text-foreground">{upgradeHint}</p> : null}
        </div>
        {tier !== 'PARENT_ELITE' ? (
          <Button size="sm" asChild className="shrink-0">
            <Link href="/checkout">Upgrade plan</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

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
  onUnlink,
  unlinking,
}: {
  child: ChildSnapshot;
  selected: boolean;
  onSelect: () => void;
  onUnlink: () => void;
  unlinking: boolean;
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive"
        disabled={unlinking}
        onClick={(e) => {
          e.stopPropagation();
          onUnlink();
        }}
      >
        {unlinking ? <Loader className="mr-1 h-3 w-3 animate-spin" /> : <Unlink className="mr-1 h-3 w-3" />}
        Unlink child
      </Button>
    </button>
  );
}

export function ParentDashboardView({ data }: { data: ParentDashboardPayload }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(data.children[0]?.id ?? '');
  const [advisorAnswer, setAdvisorAnswer] = useState<string | null>(null);
  const [advisorActions, setAdvisorActions] = useState<string[]>([]);
  const [advisorPending, startAdvisor] = useTransition();
  const [advisorQuestion, setAdvisorQuestion] = useState('');
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [interventionPending, startIntervention] = useTransition();
  const [interventionResult, setInterventionResult] = useState<{
    studentMessage: string;
    microLesson: string;
    practiceStep: string;
  } | null>(null);

  const selected = useMemo(
    () => data.children.find((c) => c.id === selectedId) ?? data.children[0],
    [data.children, selectedId],
  );

  const perf = useMemo(
    () => data.performance.find((p) => p.studentId === selected?.id),
    [data.performance, selected?.id],
  );

  const childWarnings = useMemo(
    () => data.earlyWarnings.filter((w) => w.studentId === selected?.id),
    [data.earlyWarnings, selected?.id],
  );

  const childMicro = useMemo(
    () => data.microWeaknesses.filter((m) => m.studentId === selected?.id),
    [data.microWeaknesses, selected?.id],
  );

  useEffect(() => {
    setAdvisorAnswer(null);
    setAdvisorActions([]);
    setInterventionResult(null);
  }, [selectedId]);

  const advisorQuestions = [
    'Why is my child struggling?',
    'What subject needs urgent attention?',
    'Is burnout likely?',
    'Should revision intensity increase?',
  ];

  const childSummaryForAi = (child: ChildSnapshot) =>
    JSON.stringify(
      {
        academicHealth: child.academicHealth,
        engagement: child.engagement,
        examRisk: child.examRisk,
        weeklyGrowth: child.weeklyGrowth,
        weakestSubject: child.weakestSubject,
        strongestSubject: child.strongestSubject,
        mood: child.mood,
        subjects: child.subjects?.slice(0, 8),
      },
      null,
      0,
    );

  const askAdvisor = (question: string) => {
    if (!user || !selected || !data.features.parentAdvisor) return;
    setAdvisorAnswer(null);
    setAdvisorActions([]);
    startAdvisor(async () => {
      const token = await user.getIdToken();
      const result = await askParentAdvisorAction({
        idToken: token,
        studentId: selected.id,
        question,
        childName: selected.name,
        childSummary: childSummaryForAi(selected),
      });
      if (result.success && result.response) {
        setAdvisorAnswer(result.response.answer);
        setAdvisorActions(result.response.suggestedActions);
      } else {
        toast({
          variant: 'destructive',
          title: 'Advisor unavailable',
          description: result.error ?? 'Please try again.',
        });
      }
    });
  };

  const runIntervention = () => {
    if (!user || !selected || !data.features.aiIntervention) return;
    setInterventionResult(null);
    const topic =
      childMicro[0]?.areas[0] ??
      childWarnings[0]?.title ??
      (selected.weakestSubject && selected.weakestSubject !== 'N/A'
        ? selected.weakestSubject
        : 'Core revision focus');
    startIntervention(async () => {
      const result = await triggerInterventionAction({
        studentId: selected.id,
        subject: selected.weakestSubject || 'General',
        topic,
        mistakePattern:
          childWarnings[0]?.causes?.join('; ') ??
          `Low momentum in ${selected.weakestSubject}`,
        struggleScore: selected.examRisk === 'high' ? 0.85 : 0.65,
        userId: user.uid,
      });
      if (result.success && result.output) {
        setInterventionResult({
          studentMessage: result.output.studentMessage,
          microLesson: result.output.microLesson,
          practiceStep: result.output.practiceStep,
        });
        toast({ title: 'Intervention generated', description: 'A recovery plan was created for your child.' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Intervention failed',
          description: result.error ?? 'Could not generate intervention.',
        });
      }
    });
  };

  const handleUnlinkChild = (childId: string, childName: string) => {
    if (!user) return;
    if (!window.confirm(`Unlink ${childName} from your Command Centre? You can link them again with their Parent Link Code.`)) {
      return;
    }
    setUnlinkingId(childId);
    void (async () => {
      const token = await user.getIdToken();
      const result = await unlinkParentStudentAction(token, childId);
      setUnlinkingId(null);
      if (result.success) {
        toast({ title: 'Child unlinked', description: `${childName} was removed from your dashboard.` });
        notifyParentDashboardRefresh();
      } else {
        toast({ variant: 'destructive', title: 'Could not unlink', description: result.error });
      }
    })();
  };

  if (data.children.length === 0) return null;

  return (
    <div className="parent-dashboard space-y-8">
      <CommandCentreHero data={data} />
      <ParentPlanBanner data={data} />

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
              onUnlink={() => handleUnlinkChild(child.id, child.name)}
              unlinking={unlinkingId === child.id}
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
            <TabsTrigger value="study" className="gap-1">
              Study intelligence
              {!data.features.studyBehaviourEngine && <Lock className="h-3 w-3 opacity-60" />}
            </TabsTrigger>
            <TabsTrigger value="pathway" className="gap-1">
              Future pathway
              {!data.features.pathwayEngine && <Lock className="h-3 w-3 opacity-60" />}
            </TabsTrigger>
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

            <Card className="parent-panel relative">
              {!data.features.studyBehaviourEngine && (
                <LockedOverlay label="AI study behaviour engine — Parent Pro+ and Elite" />
              )}
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
                {data.features.studyBehaviourEngine &&
                  data.studyInsights.filter((i) => i.studentId === selected.id).length === 0 && (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Insights appear as your child completes quizzes and planner tasks.
                    </p>
                  )}
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

          <TabsContent value="pathway" className="relative space-y-6">
            {!data.features.pathwayEngine && (
              <LockedOverlay label="Future pathway & predictive grades — Parent Pro+ and Elite" />
            )}
            <Card className="parent-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  University & future pathway engine
                </CardTitle>
                <CardDescription>GCSE trajectory · predictive certainty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected.predictedGrade && (
                  <p className="text-sm text-muted-foreground">
                    Latest AI forecast:{' '}
                    <span className="font-semibold text-foreground">{selected.predictedGrade}</span>
                  </p>
                )}
                {data.gradeProbabilities.filter((g) => g.studentId === selected.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Predictive grade bands appear once your child completes diagnostics or quizzes.
                  </p>
                ) : (
                  data.gradeProbabilities
                    .filter((g) => g.studentId === selected.id)
                    .map((g) => (
                      <div key={`${g.studentId}-${g.grade}`}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{g.grade} likelihood</span>
                          <span className="font-semibold">{g.likelihood}%</span>
                        </div>
                        <Progress value={g.likelihood} className="h-3" />
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            <Card className="parent-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-violet-500" />
                  University & career pathways
                </CardTitle>
                <CardDescription>
                  AI-matched degree routes based on live subject strength for {selected.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data.universityPathways ?? [])
                  .filter((p) => p.studentId === selected.id)
                  .slice(0, 5)
                  .map((path) => (
                    <div key={`${path.studentId}-${path.course}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{path.course}</p>
                        <Badge variant="secondary">{path.fitScore}% fit</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{path.rationale}</p>
                      <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Entry requirements</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                        {path.entryRequirements.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Next steps</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                        {path.nextSteps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                {(data.universityPathways ?? []).filter((p) => p.studentId === selected.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Link a child and complete profile setup to see university pathway suggestions.
                  </p>
                )}
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
            <Textarea
              placeholder="Ask a question about your child's learning…"
              value={advisorQuestion}
              onChange={(e) => setAdvisorQuestion(e.target.value)}
              disabled={advisorPending || !data.features.parentAdvisor}
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={
                  advisorPending || !data.features.parentAdvisor || advisorQuestion.trim().length < 3
                }
                onClick={() => askAdvisor(advisorQuestion.trim())}
              >
                {advisorPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ask advisor
              </Button>
              {advisorQuestions.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={advisorPending || !data.features.parentAdvisor}
                  onClick={() => askAdvisor(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
            {advisorAnswer ? (
              <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
                <p className="whitespace-pre-wrap leading-relaxed">{advisorAnswer}</p>
                {advisorActions.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {advisorActions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="parent-panel relative border-sky-500/40 bg-gradient-to-r from-sky-500/10 via-transparent to-violet-500/10">
          {!data.features.aiIntervention && (
            <LockedOverlay label="AI intervention mode — Parent Pro+ and Elite" />
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-500" />
              AI intervention mode
              <Badge>{planLabels[data.planTier]}</Badge>
            </CardTitle>
            <CardDescription>
              Live signals for {selected?.name ?? 'your child'} — generate a recovery plan when risk is elevated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(childWarnings.length > 0 || childMicro.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {childWarnings.slice(0, 2).map((w) => (
                  <div
                    key={w.id}
                    className={cn(
                      'rounded-lg border p-3 text-sm',
                      w.severity === 'critical' ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/40 bg-amber-500/5',
                    )}
                  >
                    <p className="font-medium">{w.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{w.recommendation}</p>
                  </div>
                ))}
                {childMicro.slice(0, 2).map((m) => (
                  <div key={m.id} className="rounded-lg border bg-background/60 p-3 text-sm">
                    <p className="font-medium">{m.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Focus: {m.areas.join(', ') || 'General review'} · {m.recoveryWeeks} week recovery
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={runIntervention}
                disabled={interventionPending || !data.features.aiIntervention}
              >
                {interventionPending ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate intervention for {selected?.name ?? 'child'}
              </Button>
            </div>
            {interventionResult ? (
              <div className="space-y-3 rounded-lg border bg-background p-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Message for student</p>
                  <p className="mt-1 whitespace-pre-wrap">{interventionResult.studentMessage}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Micro-lesson</p>
                  <p className="mt-1 whitespace-pre-wrap">{interventionResult.microLesson}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Practice step</p>
                  <p className="mt-1 whitespace-pre-wrap">{interventionResult.practiceStep}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-muted-foreground">
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
              </div>
            )}
          </CardContent>
        </Card>

      <p className="text-center text-xs text-muted-foreground">
        Plan: {planLabels[data.planTier]} · StudYear protects outcomes, not just displays data
      </p>
    </div>
  );
}
