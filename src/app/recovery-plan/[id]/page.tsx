"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Target } from "lucide-react";
import { fetchMyRecoveryPlan } from "@/server/actions/recovery-plan-queries";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import type { RecoveryPlanWeek } from "@/server/actions/recovery-plan-queries";

export default function RecoveryPlanDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<
    Awaited<ReturnType<typeof fetchMyRecoveryPlan>> | null
  >(null);

  useEffect(() => {
    if (authLoading || !id) return;
    if (!user) {
      setPayload({ ok: false, error: "Unauthorized" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetchMyRecoveryPlan(token, id);
        if (!cancelled) setPayload(res);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setPayload({
          ok: false,
          error:
            e instanceof Error ? e.message : "Failed to load recovery plan.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, id]);

  if (!id) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <p className="text-muted-foreground">Invalid plan link.</p>
        <Button asChild variant="outline">
          <Link href="/recovery-plan">Back to recovery plans</Link>
        </Button>
      </div>
    );
  }

  if (authLoading || (user && payload === null)) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-6 w-2/3 max-w-lg" />
        <Skeleton className="min-h-[400px] w-full max-w-5xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Recovery plan</h2>
        <p className="text-muted-foreground">Sign in to view this plan.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!payload?.ok) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Plan unavailable</h2>
        <p className="text-muted-foreground">
          {payload?.error === "Unauthorized"
            ? "Your session could not be verified. Try signing out and back in."
            : payload?.error === "Not found"
              ? "This plan does not exist or you do not have access."
              : "Something went wrong loading this plan."}
        </p>
        <Button asChild variant="outline">
          <Link href="/recovery-plan">Back to recovery plans</Link>
        </Button>
      </div>
    );
  }

  const plan = payload.plan;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{plan.title}</h2>
        <p className="text-muted-foreground max-w-2xl">
          Your personal recovery plan created on{" "}
          {new Date(plan.createdAt).toLocaleDateString()}. Let&apos;s get you back on track.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg italic text-muted-foreground">
                &quot;{plan.recoveryObjective}&quot;
              </p>
            </CardContent>
          </Card>

          {plan.weeklyRecoveryPlan.map((week: RecoveryPlanWeek) => (
            <Card key={week.week}>
              <CardHeader>
                <CardTitle>
                  Week {week.week}: {week.focus}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {week.tasks.map((task, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{task.action}</h4>
                        <p className="text-sm text-muted-foreground">
                          {task.subject} - {task.topic}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {task.estimatedMinutes} min
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">
                      <strong>Outcome:</strong> {task.expectedOutcome}
                    </p>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-8 lg:sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle>Urgent Focus Areas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {plan.urgentFocusAreas.map((area: string) => (
                <Badge key={area} variant="destructive">
                  {area}
                </Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Daily Non-Negotiables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.dailyNonNegotiables.map((item: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Success Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.successMetrics.map((item: string, index: number) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
