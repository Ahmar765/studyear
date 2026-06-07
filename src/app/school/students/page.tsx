
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader, ArrowRight } from "lucide-react";
import { getSchoolStudentsAction, type SchoolStudent } from "@/server/actions/school-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LinkStudentForm } from "@/components/school-portal/link-student-form";

export default function SchoolStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);

  const loadStudents = async () => {
    if (!user) return;
    setPending(true);
    try {
      const token = await user.getIdToken();
      const res = await getSchoolStudentsAction(token);
      setStudents(res.students);
      setError(res.error);
    } catch {
      setError("Failed to load students.");
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError("Not authenticated.");
      return;
    }
    void loadStudents();
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
        <p className="text-muted-foreground max-w-2xl">
          Add students by email, view your roster, then assign teachers to year groups and classes from{" "}
          <Link href="/school/staff" className="text-primary underline">
            Staff
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Add a student</CardTitle>
            <CardDescription>
              Link an existing StudYear student account to your school using their signup email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkStudentForm onLinked={() => void loadStudents()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign students to teachers</CardTitle>
            <CardDescription>How cohort assignment works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Invite teachers from <strong className="text-foreground">School → Staff</strong> (email invite or join code).</li>
              <li>Open <strong className="text-foreground">Assign cohorts</strong> on each teacher and set year groups / class names.</li>
              <li>Ensure each student&apos;s <strong className="text-foreground">year group</strong> is set in their profile — teachers only see matching students.</li>
            </ol>
            <Button asChild variant="outline" size="sm">
              <Link href="/school/staff">
                Manage staff & cohorts <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
          <CardDescription>All students linked to your school workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center">{error}</p>}
          {!error && students.length === 0 && (
             <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mb-4" />
                <p className="font-semibold">No students linked yet</p>
                <p className="text-sm max-w-md">Add a student by email above. They must already have signed up to StudYear.</p>
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
