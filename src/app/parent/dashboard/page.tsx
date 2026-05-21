'use client';

import { useAuth } from '@/hooks/use-auth';
import { PARENT_STUDENT_LINKED_EVENT } from '@/lib/parent-dashboard-events';
import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getParentDashboardDataAction } from '@/server/actions/parent-actions';
import type { ParentDashboardPayload } from '@/types/parent-dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { AlertTriangle, Crown, Link2, Sparkles, UserPlus } from 'lucide-react';
import LinkStudentDialog from './link-student-dialog';
import { ParentDashboardView } from '@/components/parent/parent-dashboard-view';
import { Badge } from '@/components/ui/badge';

type PageState = {
  isLoading: boolean;
  data: ParentDashboardPayload | null;
  error: { message: string; code?: string } | null;
};

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<PageState>({ isLoading: true, data: null, error: null });

  const loadDashboard = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setState({ isLoading: false, data: null, error: null });
      return;
    }
    if (!options?.silent) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }
    try {
      const token = await user.getIdToken();
      const result = await getParentDashboardDataAction(token);
      if (result.success && result.data) {
        setState({ isLoading: false, data: result.data, error: null });
      } else {
        setState({
          isLoading: false,
          data: null,
          error: { message: result.error ?? 'Unknown error', code: result.errorCode },
        });
      }
    } catch {
      setState({
        isLoading: false,
        data: null,
        error: {
          message: 'Could not verify your session. Try refreshing the page.',
          code: 'UNAUTHENTICATED',
        },
      });
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onLinked = () => void loadDashboard();
    window.addEventListener(PARENT_STUDENT_LINKED_EVENT, onLinked);
    return () => window.removeEventListener(PARENT_STUDENT_LINKED_EVENT, onLinked);
  }, [loadDashboard]);

  useEffect(() => {
    if (!user || !state.data) return;
    const refresh = () => void loadDashboard({ silent: true });
    const interval = window.setInterval(refresh, 45_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [user, state.data, loadDashboard]);

  if (state.isLoading) {
    return (
      <div className="parent-dashboard flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-12 w-2/3 max-w-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (state.error) {
    if (state.error.code === 'failed-precondition') {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-lg border-primary/20 text-center shadow-xl">
            <CardHeader>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>Unlock the Academic Command Centre</CardTitle>
              <CardDescription>{state.error.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reduce academic risk, detect problems early, and gain AI-powered visibility — not another school
                portal.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">View Parent Plans</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasChildren = (state.data?.children.length ?? 0) > 0;

  return (
    <div className="parent-dashboard flex-1 space-y-8 p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-sky-500/40 text-sky-700 dark:text-sky-300">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-powered
            </Badge>
            {state.data && (
              <Badge className="bg-gradient-to-r from-violet-600 to-sky-600">
                {state.data.planTier === 'PARENT_PRO'
                  ? 'Parent Pro'
                  : state.data.planTier === 'PARENT_PRO_PLUS'
                    ? 'Parent Pro+'
                    : 'Parent Elite'}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Protect their future.
            <span className="block bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">
              Not just their grades.
            </span>
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Real-time academic intelligence — predictive, reassuring, and action-oriented. Built for parents who
            want control, not spreadsheets.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="shrink-0 shadow-lg">
              <UserPlus className="mr-2 h-4 w-4" />
              Link a child
            </Button>
          </DialogTrigger>
          <LinkStudentDialog />
        </Dialog>
      </header>

      {!hasChildren ? (
        <Card className="parent-panel border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Link2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Connect your first learner</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Ask your child for their 8-digit Parent Link Code on their dashboard — or scan their QR code. Instant
              pairing, unlimited children.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-6" size="lg">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Start premium linking
                </Button>
              </DialogTrigger>
              <LinkStudentDialog />
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        state.data && <ParentDashboardView data={state.data} />
      )}
    </div>
  );
}

