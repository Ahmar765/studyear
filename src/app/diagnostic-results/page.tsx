"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import {
  fetchMyDiagnosticResults,
  type DiagnosticListItem,
} from "@/server/actions/diagnostic-results-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function DiagnosticResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<DiagnosticListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetchMyDiagnosticResults(token);
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
          setResults([]);
          return;
        }
        setError(null);
        setResults(res.results);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(
          e instanceof Error ? e.message : "Failed to load diagnostic results.",
        );
        setResults([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || (user && results === null)) {
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
          <h2 className="text-3xl font-bold tracking-tight">My Diagnostic Results</h2>
          <p className="text-muted-foreground">
            Sign in to view your past academic diagnostic reports.
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
        <h2 className="text-3xl font-bold tracking-tight">My Diagnostic Results</h2>
        <p className="text-muted-foreground">
          Review your past academic diagnostic reports.
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
          {results && results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <Link key={result.id} href={`/diagnostic-results/${result.id}`}>
                  <div className="border p-4 rounded-lg hover:bg-muted/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{result.subject} Diagnostic</p>
                      <p className="text-sm text-muted-foreground">
                        Taken on {result.createdAt} • Risk Level: {result.riskLevel}
                      </p>
                    </div>
                    <Button variant="outline">View Report</Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <FileQuestion className="h-12 w-12 mb-4" />
              <p className="font-semibold">No Diagnostic Results Found</p>
              <p className="text-sm">
                Complete your first academic diagnostic to see your results here.
              </p>
              <Button asChild className="mt-4">
                <Link href="/assessment">Start a Diagnostic</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
