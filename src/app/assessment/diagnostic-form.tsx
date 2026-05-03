
'use client';

import { useState, useTransition, useMemo } from "react";
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useAuth } from "@/hooks/use-auth";
import { generateDiagnosticReportAction } from "@/server/actions/assessment-actions";
import type { DiagnosticReport } from "@/server/ai/flows/diagnostic-report-generation";
import { Loader, Sparkles, AlertTriangle, BookCheck, Target, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { parseProfileSubjectsList } from "@/lib/profile-academic";

const SubjectConfidenceSchema = z.object({
  subjectId: z.string(),
  confidence: z.number().min(0).max(100),
});

const DiagnosticFormSchema = z.object({
  subjects: z.array(SubjectConfidenceSchema),
});

function riskBadgeVariant(risk: DiagnosticReport['riskLevel']): "default" | "secondary" | "destructive" | "outline" {
  switch (risk) {
    case "CRITICAL":
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "secondary";
    default:
      return "outline";
  }
}

export default function DiagnosticForm() {
    const { user } = useAuth();
    const { userProfile, loading } = useUserProfile();
    const [isPending, startTransition] = useTransition();
    const [report, setReport] = useState<DiagnosticReport | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const subjectNames = useMemo(
        () => parseProfileSubjectsList(userProfile?.subjects),
        [userProfile?.subjects],
    );

    const subjectRows = useMemo(
        () => subjectNames.map((name) => ({ subjectId: name, confidence: 50 })),
        [subjectNames],
    );

    const form = useForm<z.infer<typeof DiagnosticFormSchema>>({
        resolver: zodResolver(DiagnosticFormSchema),
        defaultValues: { subjects: [] },
        values: { subjects: subjectRows },
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "subjects",
    });

    const onSubmit = (values: z.infer<typeof DiagnosticFormSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Sign in required", description: "Sign in to run the diagnostic." });
            return;
        }
        startTransition(async () => {
            const result = await generateDiagnosticReportAction({ userId: user.uid, subjects: values.subjects });
            if (result.success && result.report) {
                setReport(result.report);
                 toast({
                    title: "Diagnostic complete",
                    description: "Your academic baseline has been generated.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error generating report",
                    description: result.error,
                });
            }
        });
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader className="animate-spin" /></div>;
    }

    if (report) {
        return (
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Your academic diagnostic report</CardTitle>
                    <CardDescription>
                        This AI-generated report summarizes your self-reported confidence and suggested next steps.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="p-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Predicted position</CardTitle>
                            <p className="text-xl font-semibold mt-1">{report.predictedCurrentPosition}</p>
                        </Card>
                        <Card className="p-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Risk level</CardTitle>
                            <div className="mt-2">
                                <Badge variant={riskBadgeVariant(report.riskLevel)}>{report.riskLevel}</Badge>
                            </div>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><BookCheck className="h-5 w-5" /> Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm leading-relaxed">{report.aiSummary}</p>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Strengths</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    {report.strengths.map((s) => (
                                        <li key={s}>{s}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Weaknesses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    {report.weaknesses.map((w) => (
                                        <li key={w}>{w}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Likely weak topics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                {report.weakTopics.map((t) => (
                                    <li key={t}>{t}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                                {report.recommendations.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {report.priorityActions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Priority actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {report.priorityActions.map((pa) => (
                                    <div key={pa.action} className="border rounded-lg p-3 text-sm">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-medium">{pa.action}</span>
                                            <Badge variant="outline">{pa.urgency}</Badge>
                                        </div>
                                        <p className="text-muted-foreground">{pa.reason}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-muted/40">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">For parents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{report.parentSummary}</p>
                        </CardContent>
                    </Card>

                </CardContent>
                <div className="p-6 border-t space-y-3">
                     <p className="text-sm text-center text-muted-foreground font-medium">{report.nextBestAction}</p>
                     <Button onClick={() => router.push('/planner')} className="w-full">
                        <Target className="mr-2 h-4 w-4"/> Build my personal recovery plan
                    </Button>
                </div>
            </Card>
        );
    }

    if (!subjectNames.length) {
        return (
            <Alert className="max-w-2xl mx-auto">
                <AlertTitle>Add subjects first</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                    <span>
                        The diagnostic needs at least one subject name from your profile. If you already added
                        subjects, open profile setup and save once so they are stored in the expected format.
                    </span>
                    <Button asChild variant="link" className="p-0 h-auto sm:ml-1">
                        <Link href="/profile-setup">Go to profile setup <ArrowRight className="h-4 w-4 ml-1 inline" /></Link>
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto" key={subjectNames.join("|")}>
            <CardHeader>
                <CardTitle className="text-2xl">Academic diagnostic</CardTitle>
                <CardDescription>
                    Rate your confidence in each subject to generate your baseline report. Subjects from your profile ({subjectNames.length} subject{subjectNames.length === 1 ? "" : "s"}).
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8">
                        {fields.map((field, index) => (
                            <FormField
                                key={field.id}
                                control={form.control}
                                name={`subjects.${index}.confidence`}
                                render={({ field: { value, onChange } }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2">
                                            <FormLabel className="text-base">{form.getValues(`subjects.${index}.subjectId`)}</FormLabel>
                                            <span className="text-sm font-medium text-primary">{value}%</span>
                                        </div>
                                        <FormControl>
                                            <Slider
                                                value={[value]}
                                                max={100}
                                                step={1}
                                                onValueChange={(vals) => onChange(vals[0])}
                                                disabled={isPending}
                                            />
                                        </FormControl>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Not confident</span>
                                            <span>Very confident</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </CardContent>
                    <div className="p-6 border-t">
                        <Button type="submit" className="w-full" disabled={isPending || subjectNames.length === 0}>
                            {isPending ? <Loader className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {isPending ? "Analyzing…" : "Generate my diagnostic report"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Card>
    );
}
