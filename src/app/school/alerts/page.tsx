
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAtRiskStudentsAction, type AtRiskStudent } from "@/server/actions/school-actions";
import { ShieldAlert, User, TrendingDown, Loader } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useAuth } from "@/hooks/use-auth";

export default function SchoolAlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError("Not authenticated.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await getAtRiskStudentsAction(token);
        if (!cancelled) {
          setStudents(res.students);
          setError(res.error);
        }
      } catch {
        if (!cancelled) setError("Failed to load alerts.");
      } finally {
        if (!cancelled) setPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || pending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Risk Alerts</h2>
        <p className="text-muted-foreground">
          Review AI-generated alerts for students who are at risk of falling behind.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>A prioritized list of students requiring intervention, based on their latest dashboard state.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center">{error}</p>}
          {!error && students.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShieldAlert className="h-12 w-12 mb-4" />
              <p className="font-semibold">No Active Alerts</p>
              <p className="text-sm">The system will automatically flag students based on performance data.</p>
            </div>
          )}
          {!error && students.length > 0 && (
            <div className="space-y-4">
              {students.map(student => (
                <Card key={student.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={student.profileImageUrl} />
                            <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-sm text-muted-foreground">Risk Level: <Badge variant="destructive">{student.riskLevel}</Badge></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        Weakest Subject: <span className="font-semibold">{student.weakestSubject}</span>
                    </div>
                    <Button asChild variant="secondary">
                        <Link href={`/school/students/${student.id}`}>View Profile</Link>
                    </Button>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
