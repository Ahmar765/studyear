
"use client";

import { useState, useTransition } from "react";
import { buildPersonalRecoveryPlanAction } from "@/server/actions/recovery-plan-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader, ShieldAlert, Target, BookOpen, AlertTriangle } from "lucide-react";
import { createStudyPlan } from "@/server/actions/planner-actions";
import { Badge } from "@/components/ui/badge";

export default function DiagnosticResultActions({
  userId,
  studentId,
  diagnosticId,
  result
}: {
  userId: string;
  studentId: string;
  diagnosticId: string;
  result: any;
}) {
  const [isRecoveryLoading, startRecoveryTransition] = useTransition();
  const [isStudyPlanLoading, startStudyPlanTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function buildRecoveryPlan() {
    startRecoveryTransition(async () => {
      const response = await buildPersonalRecoveryPlanAction({
        userId,
        studentId,
        diagnosticId
      });

      if (response.success && response.recoveryPlanId) {
        toast({ title: "Success!", description: "Your Personal Recovery Plan has been created." });
        router.push(`/recovery-plan/${response.recoveryPlanId}`);
      } else {
        toast({ variant: "destructive", title: "Error", description: response.error });
      }
    });
  }

  async function createExamStudyPlan() {
    startStudyPlanTransition(async () => {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('studentId', studentId);
        formData.append('diagnosticId', diagnosticId);
        formData.append('examGoal', result?.nextBestAction || 'Improve my grades');

        const response = await createStudyPlan(formData);

        if (response.success) {
            toast({ title: "Success!", description: "Your AI Exam Study Plan has been created." });
            router.push(`/planner`); // Navigate to the main planner view to see the new plan
        } else {
            toast({
                variant: "destructive",
                title: "Couldn't create study plan",
                description: response.error ?? "Please try again in a moment.",
            });
        }
    });
  }

  const getUrgencyVariant = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      default: return 'outline';
    }
  }

  return (
    <div className="space-y-8">
        <Card className="bg-muted/30">
            <CardHeader>
                <CardTitle className="text-2xl">AI Summary & Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground italic">"{result.aiSummary}"</p>
                 <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <Card className="p-4">
                        <CardDescription>Risk Level</CardDescription>
                        <p className="text-2xl font-bold">{result.riskLevel}</p>
                    </Card>
                    <Card className="p-4">
                        <CardDescription>Current Position</CardDescription>
                        <p className="text-2xl font-bold">{result.predictedCurrentPosition}</p>
                    </Card>
                    <Card className="p-4">
                        <CardDescription>Next Best Action</CardDescription>
                        <p className="text-lg font-bold">{result.nextBestAction}</p>
                    </Card>
                </div>
            </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> Weak Topics Identified</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                    {result.weakTopics?.map((item: string, index: number) => (
                        <Badge key={index} variant="outline">{item}</Badge>
                    ))}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/> Core Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                    {result.strengths?.map((item: string, index: number) => (
                        <Badge key={index} variant="secondary">{item}</Badge>
                    ))}
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div>
            <h3 className="text-2xl font-bold mb-4">Priority Actions</h3>
            <div className="space-y-4">
                {result.priorityActions?.map((item: any, index: number) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                             <CardTitle className="text-lg">{item.action}</CardTitle>
                             <Badge variant={getUrgencyVariant(item.urgency)}>Urgency: {item.urgency}</Badge>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{item.reason}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle>Generate Your Plan</CardTitle>
                <CardDescription>Based on this diagnostic, the AI can build a corrective recovery plan or a full exam study plan.</CardDescription>
            </CardHeader>
             <CardFooter className="flex flex-wrap gap-4">
                <Button
                    onClick={buildRecoveryPlan}
                    disabled={isRecoveryLoading || isStudyPlanLoading}
                    variant="destructive"
                    >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    {isRecoveryLoading ? "Building Recovery Plan..." : "Build Personal Recovery Plan"}
                </Button>

                <Button
                    onClick={createExamStudyPlan}
                    disabled={isRecoveryLoading || isStudyPlanLoading}
                    >
                    <Target className="mr-2 h-4 w-4" />
                    {isStudyPlanLoading ? "Creating Study Plan..." : "Create AI Exam Study Plan"}
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
