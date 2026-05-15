'use client';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { updateTutorSessionStatusAction } from '@/server/actions/tutor-actions';
import type { TutorDashboardPayload, TutorSessionSummary } from '@/types/tutor-dashboard';
import { formatDistanceToNow } from 'date-fns';
import { Activity, BookOpen, Check, X } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-800',
  ACCEPTED: 'bg-emerald-500/15 text-emerald-800',
  COMPLETED: 'bg-sky-500/15 text-sky-800',
  DECLINED: 'bg-red-500/15 text-red-800',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export function LiveSyncBadge({ generatedAt }: { generatedAt: string }) {
  return (
    <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
      <Activity className="h-3 w-3 animate-pulse" />
      Live · synced {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
    </Badge>
  );
}

function SessionRow({
  session,
  onUpdated,
}: {
  session: TutorSessionSummary;
  onUpdated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED') => {
    if (!user) return;
    setLoading(status);
    const token = await user.getIdToken();
    const result = await updateTutorSessionStatusAction(token, { sessionId: session.id, status });
    setLoading(null);
    if (result.success) {
      toast({ title: `Session ${status.toLowerCase()}` });
      onUpdated();
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{session.studentName}</p>
          <p className="text-xs text-muted-foreground">
            {session.subject ?? 'General'} · {formatDistanceToNow(new Date(session.scheduledAt), { addSuffix: true })}
          </p>
          {session.studentMessage && (
            <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{session.studentMessage}&rdquo;</p>
          )}
        </div>
        <Badge className={statusColors[session.status] ?? ''}>{session.status}</Badge>
      </div>
      {session.status === 'REQUESTED' && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" disabled={!!loading} onClick={() => void updateStatus('ACCEPTED')}>
            <Check className="mr-1 h-3 w-3" />
            Accept
          </Button>
          <Button size="sm" variant="outline" disabled={!!loading} onClick={() => void updateStatus('DECLINED')}>
            <X className="mr-1 h-3 w-3" />
            Decline
          </Button>
        </div>
      )}
      {session.status === 'ACCEPTED' && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={!!loading}
          onClick={() => void updateStatus('COMPLETED')}
        >
          Mark completed
        </Button>
      )}
    </li>
  );
}

export function LiveSessionsPanel({
  data,
  onRefresh,
}: {
  data: TutorDashboardPayload;
  onRefresh: () => void;
}) {
  const sessions = data.recentSessions ?? [];

  return (
    <Card className="tutor-panel">
      <CardHeader>
        <CardTitle className="text-base">Live session feed</CardTitle>
        <CardDescription>Real bookings from tutor_sessions — accept or decline in place</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sessions yet. When students book you on the marketplace, requests appear here instantly.
          </p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} onUpdated={onRefresh} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function LiveStudentsPanel({ data }: { data: TutorDashboardPayload }) {
  const students = data.liveStudents ?? [];

  return (
    <Card className="tutor-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Linked students (live)
        </CardTitle>
        <CardDescription>Profile, dashboard progress, and quiz activity from Firestore</CardDescription>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Students appear here after their first session request or booking with you.
          </p>
        ) : (
          <ul className="space-y-4">
            {students.map((student) => (
              <li key={student.id} className="flex gap-3 rounded-lg border p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.avatarSrc} />
                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{student.name}</p>
                    {student.yearGroup && (
                      <span className="text-xs text-muted-foreground">{student.yearGroup}</span>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Dashboard progress</span>
                      <span>{student.progressScore}%</span>
                    </div>
                    <Progress value={student.progressScore} className="h-1.5" />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {student.weakestSubject && (
                      <Badge variant="outline">Weak: {student.weakestSubject}</Badge>
                    )}
                    {student.quizAttempts30d > 0 && (
                      <Badge variant="secondary">
                        {student.quizAttempts30d} quizzes · avg {student.avgQuizScore30d}%
                      </Badge>
                    )}
                    {student.pendingStudyTasks > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-900">
                        {student.pendingStudyTasks} pending tasks
                      </Badge>
                    )}
                  </div>
                  {student.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {student.subjects.slice(0, 4).map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {student.dashboardUpdatedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Dashboard updated{' '}
                      {formatDistanceToNow(new Date(student.dashboardUpdatedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
