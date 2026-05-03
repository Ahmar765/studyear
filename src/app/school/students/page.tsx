
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader } from "lucide-react";
import { getSchoolStudentsAction, type SchoolStudent } from "@/server/actions/school-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";

export default function SchoolStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
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
        const res = await getSchoolStudentsAction(token);
        if (!cancelled) {
          setStudents(res.students);
          setError(res.error);
        }
      } catch {
        if (!cancelled) setError("Failed to load students.");
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
        <h2 className="text-3xl font-bold tracking-tight">Student Management</h2>
        <p className="text-muted-foreground">
          View student progress, manage cohorts, and access individual reports.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
          <CardDescription>A list of all students associated with your school.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center">{error}</p>}
          {!error && students.length === 0 && (
             <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mb-4" />
                <p className="font-semibold">Student Data Not Yet Available</p>
                <p className="text-sm">Students need to be linked to your school account by a platform admin to appear here.</p>
            </div>
          )}
          {!error && students.length > 0 && (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Year Group</TableHead>
                        <TableHead>Predicted Grade</TableHead>
                        <TableHead className="w-[200px]">Overall Progress</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.map(student => (
                        <TableRow key={student.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={student.profileImageUrl} />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{student.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>{student.yearGroup}</TableCell>
                            <TableCell>{student.predictedGrade}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Progress value={student.progressScore} className="h-2" />
                                    <span className="text-xs text-muted-foreground">{student.progressScore}%</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
