
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Flag, TrendingUp, Search, AlertTriangle, Lock, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getParentDashboardDataAction, StudentData } from "@/server/actions/parent-actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import { resourceMetadata, ResourceType } from "@/data/academic";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import LinkStudentDialog from './link-student-dialog';


type PageState = {
    isLoading: boolean;
    data: StudentData[] | null;
    error: { message: string; code?: string } | null;
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<PageState>({ isLoading: true, data: null, error: null });

  useEffect(() => {
    if (user) {
        setState({ isLoading: true, data: null, error: null });
        getParentDashboardDataAction().then(result => {
            if (result.success) {
                setState({ isLoading: false, data: result.data || [], error: null });
            } else {
                setState({ isLoading: false, data: null, error: { message: result.error!, code: result.errorCode } });
            }
        });
    } else {
        // AuthProvider should handle redirect, but as a fallback:
        setState({ isLoading: false, data: null, error: null });
    }
  }, [user]);

  const renderContent = () => {
    if (state.isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
        );
    }
    
    if (state.error) {
        if (state.error.code === 'failed-precondition') {
            return (
                <Card className="text-center">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-2">
                           <Lock className="h-6 w-6"/>
                        </div>
                        <CardTitle>Upgrade to Parent Pro</CardTitle>
                        <CardDescription>{state.error.message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Unlock real-time progress monitoring, AI-powered insights, and more.</p>
                    </CardContent>
                    <CardContent>
                        <Button asChild>
                            <Link href="/checkout">View Upgrade Options</Link>
                        </Button>
                    </CardContent>
                </Card>
            );
        }
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{state.error.message}</AlertDescription>
            </Alert>
        );
    }

    if (state.data?.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <p className="mb-4">When you link a student account, their progress overview will appear here.</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button><UserPlus className="mr-2 h-4 w-4" /> Link Your First Student</Button>
                  </DialogTrigger>
                  <LinkStudentDialog />
                </Dialog>
            </div>
        );
    }

    return (
         <div className="space-y-6">
            {state.data?.map(student => (
                <Card key={student.id} className="p-4 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4 w-full">
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={student.avatarSrc} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <CardTitle className="text-lg">{student.name}</CardTitle>
                            <CardDescription>{student.yearGroup}</CardDescription>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Consistency</p>
                                <Badge variant={student.consistency === 'Good' ? 'secondary' : 'destructive'}>{student.consistency}</Badge>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Overall Progress</p>
                                <p className="font-bold text-lg">{student.progress}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Weakest Subject</p>
                                <p className="font-semibold flex items-center justify-center gap-1"><Flag className="h-3 w-3 text-destructive" /> {student.weakestSubject}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Strongest Subject</p>
                                <p className="font-semibold flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3 text-green-600"/> {student.strongestSubject}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Last Diagnostic</p>
                                <p className="font-semibold flex items-center justify-center gap-1">
                                    <Search className="h-3 w-3 text-primary"/> 
                                    {student.lastDiagnostic ? new Date(student.lastDiagnostic.date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                     {student.savedResources && student.savedResources.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Recently Saved Resources</h4>
                                <div className="space-y-2">
                                    {student.savedResources.map(resource => {
                                        const meta = resourceMetadata[resource.type.toUpperCase() as ResourceType] || null;
                                        const Icon = meta?.icon || BookOpen;
                                        return (
                                            <div key={resource.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                                                <div className="flex items-center gap-3">
                                                    <Icon className="h-4 w-4 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-medium">{resource.title}</p>
                                                        <p className="text-xs text-muted-foreground">{meta?.title || resource.type}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline">{new Date(resource.createdAt).toLocaleDateString()}</Badge>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            ))}
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Parent Dashboard</h2>
                <p className="text-muted-foreground">
                    Monitor your child's progress and stay informed about their study habits.
                </p>
            </div>
             <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" /> Link a New Student
                    </Button>
                </DialogTrigger>
                <LinkStudentDialog />
            </Dialog>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Linked Students</CardTitle>
                <CardDescription>An overview of your linked children's progress.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    </div>
  );
}
