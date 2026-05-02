
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, User, TrendingUp, Flag, CheckCircle } from "lucide-react";
import Link from "next/link";
import { getTeacherStudentsAction, TeacherStudent } from "@/server/actions/teacher-actions";
import { Progress } from "@/components/ui/progress";

export default async function TeacherDashboardPage() {
    const { students, error } = await getTeacherStudentsAction();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h2>
                <p className="text-muted-foreground">
                    Welcome! Here you can monitor the progress of your assigned students.
                </p>
            </div>
            <Button asChild>
                <Link href="/create">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Resource
                </Link>
            </Button>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>My Students</CardTitle>
                <CardDescription>An overview of your assigned students' progress and activity.</CardDescription>
            </CardHeader>
            <CardContent>
                {error && <p className="text-destructive text-center">{error}</p>}
                {!error && students.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <User className="h-12 w-12 mb-4" />
                        <p className="font-semibold">No students assigned</p>
                        <p className="text-sm">Once a school administrator assigns you to students, they will appear here.</p>
                    </div>
                )}
                {!error && students.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {students.map(student => (
                            <Card key={student.id}>
                                <CardHeader className="flex flex-row items-center gap-4">
                                     <Avatar className="h-12 w-12">
                                        <AvatarImage src={student.profileImageUrl} />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle>{student.name}</CardTitle>
                                        <CardDescription>{student.yearGroup}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Overall Progress</p>
                                        <div className="flex items-center gap-2">
                                            <Progress value={student.progressScore} className="h-2" />
                                            <span>{student.progressScore}%</span>
                                        </div>
                                    </div>
                                    <div className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Strongest Subject: <span className="font-semibold">{student.strongestSubject}</span></div>
                                    <div className="text-sm flex items-center gap-2"><Flag className="h-4 w-4 text-red-500" /> Weakest Subject: <span className="font-semibold">{student.weakestSubject}</span></div>
                                    <div className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500" /> Tasks Completed: <span className="font-semibold">{student.tasksCompleted}</span></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
