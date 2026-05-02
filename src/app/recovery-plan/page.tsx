"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import {
  fetchMyRecoveryPlans,
  type RecoveryPlanListItem,
} from "@/server/actions/recovery-plan-queries";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function RecoveryPlanListPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<RecoveryPlanListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPlans([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetchMyRecoveryPlans(token);
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
          setPlans([]);
          return;
        }
        setError(null);
        setPlans(res.plans);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(
          e instanceof Error ? e.message : "Failed to load recovery plans.",
        );
        setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || (user && plans === null)) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-48 w-full max-w-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">My Recovery Plans</h2>
          <p className="text-muted-foreground">
            Sign in to view your personal recovery plans.
          </p>
        </div>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Recovery Plans</h2>
        <p className="text-muted-foreground">
          Review your AI-generated personal recovery plans designed to fix weak areas.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error === "Unauthorized"
            ? "Your session could not be verified. Try signing out and back in."
            : error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {plans && plans.length > 0 ? (
            <div className="space-y-4">
              {plans.map((plan) => (
                <Link key={plan.id} href={`/recovery-plan/${plan.id}`}>
                  <div className="border p-4 rounded-lg hover:bg-muted/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{plan.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Created on {plan.createdAt} • Risk Level: {plan.riskLevel}
                      </p>
                    </div>
                    <Button variant="outline">View Plan</Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShieldAlert className="h-12 w-12 mb-4" />
              <p className="font-semibold">No Recovery Plans Found</p>
              <p className="text-sm">
                Generate a recovery plan from a diagnostic report to get started.
              </p>
              <Button asChild className="mt-4">
                <Link href="/diagnostic-results">View My Diagnostics</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
