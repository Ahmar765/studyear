
'use client'

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BrainCircuit, Loader, Sparkles, BookOpen, Target, GraduationCap, ArrowRight, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { generateProgressReportAction } from "@/server/actions/progress-actions";
import { GenerateProgressReportOutput } from "@/server/ai/flows/progress-report-generation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const chartConfig = {
  progress: {
    label: "Progress",
    color: "hsl(var(--primary))",
  },
};

const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
            {lines.map((line, index) => {
                 if (line.startsWith('* ')) {
                    return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>
                }
                return <p key={index}>{line}</p>;
            })}
        </div>
    );
};

interface ProgressClientPageProps {
    initialChartData: {
        name: string;
        progress: number;
        targetGrade: string;
    }[];
}

export default function ProgressClientPage({ initialChartData }: ProgressClientPageProps) {
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile();
  const { toast } = useToast();
  const [report, setReport] = useState<GenerateProgressReportOutput | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerateReport = () => {
    if (!userProfile || !user || !userProfile.subjects) return;
    
    startTransition(async () => {
        try {
            const subjectsWithProgress = userProfile.subjects?.map(s => {
                const chartEntry = initialChartData.find(cd => cd.name === s.name);
                return {
                    subjectId: s.name,
                    targetGrade: s.targetGrade || 'Not set',
                    progress: chartEntry?.progress || 0
                }
            }) || [];

            const studentActivity = `The student has completed ${initialChartData.length} quizzes with an average score calculated from their attempts.`;
            const overallTarget = userProfile.subjects?.find(s => s.targetGrade)?.targetGrade || "Not set";

            const result = await generateProgressReportAction({
                studentName: user.uid, // Pass UID, action will get name
                subjects: subjectsWithProgress,
                overallTargetGrade: overallTarget,
                activity: studentActivity,
            });

            if (result.success && result.report) {
                setReport(result.report);
                toast({ title: "Report Generated", description: "Your AI Grade Improvement Plan is ready." });
            } else {
                 toast({ variant: "destructive", title: "Error", description: result.error || "Failed to generate report." });
            }
            
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to generate report." });
        }
    });
  }

  const hasSubjectsInProfile = userProfile?.subjects && userProfile.subjects.length > 0;
  const hasProgressData = initialChartData.length > 0;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">My Progress</h2>
            <p className="text-muted-foreground max-w-2xl">
                Track your study progress and generate an AI-powered improvement plan to reach your target grades.
            </p>
        </div>
         <Button onClick={handleGenerateReport} disabled={isPending || !hasProgressData}>
              {isPending ? <><Loader className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : <><Sparkles className="mr-2 h-4 w-4"/> Generate AI Improvement Plan</>}
          </Button>
      </div>

       <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
             <Card>
                <CardHeader>
                <CardTitle>Subject Progress Chart</CardTitle>
                </CardHeader>
                <CardContent>
                {loading ? (
                     <Skeleton className="h-[300px] w-full" />
                ) : hasProgressData ? (
                    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                        <BarChart accessibilityLayer data={initialChartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="progress" fill="var(--color-progress)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="text-center min-h-[300px] flex flex-col justify-center items-center">
                        {!hasSubjectsInProfile ? (
                            <>
                                <p className="text-muted-foreground mb-2">Please set up your subjects to start tracking progress.</p>
                                <Button asChild variant="link" className="mt-2"><Link href="/profile-setup">Complete Your Profile</Link></Button>
                            </>
                        ) : (
                            <>
                                <p className="text-muted-foreground mb-2">No progress to show yet. Take a quiz or complete a lesson to get started!</p>
                                <Button asChild variant="link" className="mt-2"><Link href="/search">Find a Quiz</Link></Button>
                            </>
                        )}
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-3">
             <Card className="min-h-full">
                <CardHeader>
                    <CardTitle>AI Grade Improvement Plan</CardTitle>
                    <CardDescription>Your generated plan will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isPending ? (
                        <div className="flex items-center justify-center h-96"><Loader className="h-12 w-12 animate-spin text-primary" /></div>
                     ) : report ? (
                         <div className="space-y-6">
                            <Card className="bg-muted/50 border-dashed">
                                <CardHeader>
                                    <CardTitle className="text-xl">Executive Summary</CardTitle>
                                    <CardDescription>A high-level overview of your current academic standing and path forward.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex flex-col sm:flex-row sm:justify-around text-center gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5"><GraduationCap className="h-4 w-4"/> Predicted Grade</p>
                                            <p className="text-5xl font-bold text-destructive">{report.overallPredictedGrade}</p>
                                        </div>
                                        <div className="flex items-center justify-center text-muted-foreground"><ArrowRight className="h-8 w-8"/></div>
                                        <div>
                                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5"><Target className="h-4 w-4"/> Target Grade</p>
                                            <p className="text-5xl font-bold text-green-600">{report.overallTargetGrade}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-center text-muted-foreground italic pt-4">"{report.executiveSummary}"</p>
                                </CardContent>
                            </Card>
                            
                            <Accordion type="multiple" className="w-full">
                            {report.improvementPlans.map((plan, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-3 text-xl font-semibold">
                                            <BookOpen/>
                                            {plan.subject} Improvement Plan
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-6">
                                        <div className="grid md:grid-cols-3 gap-4 text-center">
                                            <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-base">Current Grade</CardTitle></CardHeader>
                                                <CardContent><p className="text-2xl font-bold">{plan.currentBaselineGrade}</p></CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-base">Predicted Grade</CardTitle></CardHeader>
                                                <CardContent><p className="text-2xl font-bold text-destructive">{plan.realisticPredictedGrade}</p></CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-base">Stretch Target</CardTitle></CardHeader>
                                                <CardContent><p className="text-2xl font-bold text-green-600">{plan.stretchTargetGrade}</p></CardContent>
                                            </Card>
                                        </div>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base flex items-center gap-2"><Flag/> Grade Barrier Diagnosis</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm italic text-muted-foreground">"{plan.gradeBarrierDiagnosis}"</p>
                                            </CardContent>
                                        </Card>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold mb-2">Top 5 Priority Topics</h4>
                                                <div className="flex flex-col gap-2">
                                                    {plan.top5PriorityTopics.map(topic => <Badge key={topic} variant="secondary" className="w-fit">{topic}</Badge>)}
                                                </div>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-2">Recommended Actions</h4>
                                                <SimpleMarkdown content={plan.recommendedActions}/>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                            </Accordion>
                         </div>
                     ) : (
                        <div className="text-center text-muted-foreground py-16">
                            <BrainCircuit className="mx-auto h-12 w-12" />
                            <p className="mt-4">Click the button to generate your detailed grade improvement plan.</p>
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
       </div>
    </div>
  );
}
