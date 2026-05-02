"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DiagnosticResultActions from "./diagnostic-result-actions";
import { fetchMyDiagnosticResult } from "@/server/actions/diagnostic-results-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function DiagnosticResultPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<
    Awaited<ReturnType<typeof fetchMyDiagnosticResult>> | null
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
        const res = await fetchMyDiagnosticResult(token, id);
        if (!cancelled) setPayload(res);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setPayload({
          ok: false,
          error:
            e instanceof Error ? e.message : "Failed to load diagnostic report.",
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
        <p className="text-muted-foreground">Invalid report link.</p>
        <Button asChild variant="outline">
          <Link href="/diagnostic-results">Back to diagnostic results</Link>
        </Button>
      </div>
    );
  }

  if (authLoading || (user && payload === null)) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="h-[480px] w-full max-w-4xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Academic Diagnostic Report</h2>
        <p className="text-muted-foreground">Sign in to view this report.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!payload?.ok) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Report unavailable</h2>
        <p className="text-muted-foreground">
          {payload?.error === "Unauthorized"
            ? "Your session could not be verified. Try signing out and back in."
            : payload?.error === "Not found"
              ? "This report does not exist or you do not have access."
              : "Something went wrong loading this report."}
        </p>
        <Button asChild variant="outline">
          <Link href="/diagnostic-results">Back to diagnostic results</Link>
        </Button>
      </div>
    );
  }

  const { result } = payload;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-start space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Academic Diagnostic Report</h2>
        <p className="text-muted-foreground">
          An AI-generated analysis of your academic standing from{" "}
          {new Date(result.createdAt).toLocaleDateString()}.
        </p>
      </div>

      <DiagnosticResultActions
        userId={payload.uid}
        studentId={payload.uid}
        diagnosticId={result.id}
        result={result}
      />
    </div>
  );
}
