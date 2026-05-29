'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TutorCommandHero } from '@/components/tutor/tutor-command-hero';
import { LiveSessionsPanel, LiveStudentsPanel, LiveSyncBadge } from '@/components/tutor/tutor-live-panels';
import type { TutorDashboardPayload, TutorPipelineStage } from '@/types/tutor-dashboard';
import Link from 'next/link';
import {
  Bot,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  MessageSquare,
  PoundSterling,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const pipelineColors: Record<TutorPipelineStage, string> = {
  NEW_ENQUIRY: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  TRIAL: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  AT_RISK: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  INACTIVE: 'bg-muted text-muted-foreground',
  PREMIUM: 'bg-amber-500/20 text-amber-900 dark:text-amber-100',
};

const pipelineLabels: Record<TutorPipelineStage, string> = {
  NEW_ENQUIRY: 'New enquiry',
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  AT_RISK: 'At risk',
  INACTIVE: 'Inactive',
  PREMIUM: 'Premium',
};

export function TutorDashboardView({
  data,
  tutorId,
  onRefresh,
}: {
  data: TutorDashboardPayload;
  tutorId?: string;
  onRefresh?: () => void;
}) {
  const refresh = onRefresh ?? (() => {});

  return (
    <div className="tutor-dashboard space-y-8">
      <div className="flex flex-wrap items-center justify-end">
        <LiveSyncBadge generatedAt={data.generatedAt} />
      </div>
      <TutorCommandHero data={data} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Calendar} label="Sessions today" value={data.today.sessionsToday} />
        <MetricCard icon={Clock} label="Upcoming" value={data.today.upcomingLessons} />
        <MetricCard icon={MessageSquare} label="Pending requests" value={data.today.pendingRequests} highlight />
        <MetricCard icon={GraduationCap} label="Pending study tasks" value={data.today.homeworkReviews} />
        <MetricCard icon={Users} label="Linked students" value={data.liveStudents?.length ?? 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <LiveSessionsPanel data={data} onRefresh={refresh} />
        <LiveStudentsPanel data={data} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="tutor-panel lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Revenue & performance (live)</CardTitle>
              <CardDescription>From sessions, rates, and student dashboard data</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tutor/earnings">Full analytics</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <div className="space-y-3">
                <Row label="Pending payout" value={`£${data.revenue.pendingPayout}`} />
                <Row label="AI commission" value={`£${data.revenue.aiCommissionRevenue}`} />
                <Row label="Conversion rate" value={`${data.revenue.conversionRate}%`} />
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Performance</p>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Session completion</span>
                    <span>{data.performance.completionRate}%</span>
                  </div>
                  <Progress value={data.performance.completionRate} className="h-2" />
                </div>
                <Row
                  label="Avg quiz score (30d)"
                  value={data.performance.avgSessionScore > 0 ? data.performance.avgSessionScore.toFixed(1) : '—'}
                />
                <Row label="Avg student progress" value={`${data.performance.parentSatisfaction}%`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="tutor-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.aiInsights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <p className="font-medium">{insight.title}</p>
                <p className="mt-1 text-muted-foreground">{insight.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="tutor-panel">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Upcoming sessions
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tutor/calendar">
                Calendar <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming sessions. Share your profile to get bookings.</p>
            ) : (
              <ul className="space-y-3">
                {data.upcomingSessions.map((session) => (
                  <li key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{session.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.subject ?? 'General'} · {session.status}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.scheduledAt), { addSuffix: true })}
                      {session.aiSupported && (
                        <Badge variant="secondary" className="mt-1 block">
                          <Bot className="mr-1 inline h-3 w-3" /> AI
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="tutor-panel">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Student pipeline
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tutor/students">CRM</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your pipeline fills as students book sessions.</p>
            ) : (
              <ul className="space-y-2">
                {data.pipeline.map((student) => (
                  <li key={student.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.subject}</p>
                    </div>
                    <Badge className={pipelineColors[student.stage]}>{pipelineLabels[student.stage]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="tutor-panel">
        <CardHeader>
          <CardTitle className="text-base">Trust & authority</CardTitle>
          <CardDescription>Badges shown on your marketplace profile</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.trustBadges.map((badge) => (
            <Badge key={badge.id} variant={badge.active ? 'default' : 'outline'} className="gap-1">
              <Star className="h-3 w-3" />
              {badge.label}
            </Badge>
          ))}
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link href="/tutor/profile">Edit profile</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Button asChild className="h-auto flex-col items-start gap-1 py-4">
          <Link href="/tutor/classroom">
            <Bot className="h-5 w-5" />
            <span className="font-semibold">AI Teaching Assistant</span>
            <span className="text-xs font-normal opacity-80">Explain, diagram, quiz in-session</span>
          </Link>
        </Button>
        <Button variant="secondary" asChild className="h-auto flex-col items-start gap-1 py-4">
          <Link href="/tutor/earnings">
            <PoundSterling className="h-5 w-5" />
            <span className="font-semibold">Earnings forecast</span>
            <span className="text-xs font-normal opacity-80">Payouts & commission</span>
          </Link>
        </Button>
        {tutorId ? (
          <Button variant="outline" asChild className="h-auto flex-col items-start gap-1 py-4">
            <Link href={`/tutors/${tutorId}`}>
              <span className="font-semibold">View marketplace listing</span>
              <span className="text-xs font-normal opacity-80">
                {data.approvalStatus === 'APPROVED'
                  ? 'How students see you'
                  : 'Preview before approval'}
              </span>
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            className="h-auto flex-col items-start gap-1 py-4 opacity-70"
          >
            <span className="font-semibold">View marketplace listing</span>
            <span className="text-xs font-normal opacity-80">Sign in to preview</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Calendar;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'tutor-panel border-amber-500/40' : 'tutor-panel'}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
          <Icon className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
