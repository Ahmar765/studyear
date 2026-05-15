'use client';

import { SchoolTutorCommandHero } from '@/components/school-tutor/school-tutor-command-hero';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SchoolTutorDashboardPayload, SchoolTutorStudentRow } from '@/types/school-tutor-dashboard';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList,
  FileText,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const statusStyle: Record<SchoolTutorStudentRow['status'], string> = {
  on_track: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  watch: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
  critical: 'bg-red-500/15 text-red-800 dark:text-red-200',
};

export function SchoolTutorDashboardView({ data }: { data: SchoolTutorDashboardPayload }) {
  return (
    <div className="school-dashboard space-y-8">
      <div className="flex justify-end">
        <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
          <Activity className="h-3 w-3 animate-pulse" />
          Live · {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
        </Badge>
      </div>

      <SchoolTutorCommandHero data={data} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi icon={Users} label="Students" value={data.overview.totalStudents} />
        <Kpi icon={Target} label="Need attention" value={data.overview.studentsNeedingIntervention} highlight />
        <Kpi icon={AlertTriangle} label="At risk" value={data.overview.atRiskCount} highlight={data.overview.atRiskCount > 0} />
        <Kpi icon={ClipboardList} label="Homework %" value={data.overview.homeworkCompletionPct} />
        <Kpi icon={Calendar} label="Assessments" value={data.overview.upcomingAssessments} />
        <Kpi icon={BookOpen} label="Classes today" value={data.overview.classesToday} />
        <Kpi icon={FileText} label="Interventions" value={data.interventions.filter((i) => i.status === 'ACTIVE').length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="school-panel lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Student intervention engine</CardTitle>
              <CardDescription>Live from dashboard states, homework & quiz data</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/teacher/interventions">
                All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students linked to your school yet. School admins assign students via the school portal.
              </p>
            ) : (
              <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {data.students
                  .slice()
                  .sort((a, b) => (a.status === 'critical' ? -1 : 0) - (b.status === 'critical' ? -1 : 0))
                  .map((student) => (
                    <li key={student.id} className="flex gap-3 rounded-lg border p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.avatarSrc} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{student.name}</p>
                          <Badge className={statusStyle[student.status]}>{student.status.replace('_', ' ')}</Badge>
                        </div>
                        <Progress value={student.progressScore} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {student.yearGroup}
                          {student.weakestSubject ? ` · weak: ${student.weakestSubject}` : ''}
                          {student.pendingHomework > 0 ? ` · ${student.pendingHomework} pending tasks` : ''}
                          {student.quizAttempts30d > 0 ? ` · quiz avg ${student.avgQuizScore30d}%` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="school-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              AI alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-lg border p-3 text-sm ${
                  insight.severity === 'critical'
                    ? 'border-red-500/30 bg-red-500/5'
                    : insight.severity === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'bg-muted/30'
                }`}
              >
                <p className="font-medium">{insight.title}</p>
                <p className="mt-1 text-muted-foreground">{insight.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="school-panel">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">School assessments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/teacher/assignments">Centre</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessments scheduled by leadership yet.</p>
            ) : (
              data.assessments.slice(0, 6).map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.dueDate ? `Due ${a.dueDate}` : 'No due date'} · {a.description || 'No description'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="school-panel">
          <CardHeader>
            <CardTitle className="text-base">Active interventions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.interventions.filter((i) => i.status === 'ACTIVE').length === 0 ? (
              <p className="text-sm text-muted-foreground">No active intervention plans.</p>
            ) : (
              data.interventions
                .filter((i) => i.status === 'ACTIVE')
                .slice(0, 6)
                .map((i) => (
                  <div key={i.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.studentName} · {formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Button asChild className="h-auto flex-col gap-1 py-4">
          <Link href="/create/ai-course">
            <Sparkles className="h-5 w-5" />
            AI lesson builder
          </Link>
        </Button>
        <Button variant="secondary" asChild className="h-auto flex-col gap-1 py-4">
          <Link href="/ai-tutor">
            Live AI teaching tools
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col gap-1 py-4">
          <Link href="/teacher/analytics">Classroom analytics</Link>
        </Button>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'school-panel border-amber-500/40' : 'school-panel'}>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-indigo-600" />
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
