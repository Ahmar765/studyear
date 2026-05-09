
'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import { buildPersonalRecoveryPlanAction } from "@/server/actions/recovery-plan-actions";
import type { DiagnosticReport } from "@/server/ai/flows/diagnostic-report-generation";
import { Loader, Sparkles, AlertTriangle, BookCheck, Plus, Trash2, ShieldAlert, CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { parseProfileSubjectsList, normalizeSubjectTitle } from "@/lib/profile-academic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SubjectConfidenceSchema = z.object({
  subjectId: z.string().min(1, 'Subject name required.'),
  confidence: z.number().min(0).max(100),
});

const DiagnosticFormSchema = z.object({
  subjects: z.array(SubjectConfidenceSchema).min(1).max(24),
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

interface DiagnosticFormProps {
  catalogSubjects: string[];
}

export default function DiagnosticForm({ catalogSubjects }: DiagnosticFormProps) {
    const { user } = useAuth();
    const { userProfile, loading } = useUserProfile();
    const [isPending, startTransition] = useTransition();
    const [isRecoveryPending, startRecoveryTransition] = useTransition();
    const [report, setReport] = useState<DiagnosticReport | null>(null);
    const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const [catalogPickKey, setCatalogPickKey] = useState(0);
    const [customSubject, setCustomSubject] = useState('');
    const seededProfileRef = useRef(false);

    const form = useForm<z.infer<typeof DiagnosticFormSchema>>({
        resolver: zodResolver(DiagnosticFormSchema),
        defaultValues: { subjects: [] },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "subjects",
    });

    const watchedSubjects = useWatch({ control: form.control, name: 'subjects' }) ?? [];

    useEffect(() => {
        if (loading || seededProfileRef.current) return;
        const names = parseProfileSubjectsList(userProfile?.subjects);
        if (names.length === 0) return;
        const current = form.getValues('subjects');
        if (current.length > 0) {
            seededProfileRef.current = true;
            return;
        }
        form.reset({
            subjects: names.map((name) => ({ subjectId: name, confidence: 50 })),
        });
        seededProfileRef.current = true;
    }, [loading, userProfile, form]);

    const takenLower = useMemo(() => {
        return new Set(
            watchedSubjects.map((s) => String(s?.subjectId ?? '').trim().toLowerCase()).filter(Boolean),
        );
    }, [watchedSubjects]);

    const catalogOptions = useMemo(() => {
        return catalogSubjects.filter((s) => !takenLower.has(s.trim().toLowerCase()));
    }, [catalogSubjects, takenLower]);

    const onSubmit = (values: z.infer<typeof DiagnosticFormSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Sign in required", description: "Sign in to run the diagnostic." });
            return;
        }
        startTransition(async () => {
            const result = await generateDiagnosticReportAction({ userId: user.uid, subjects: values.subjects });
            if (result.success && result.report) {
                setReport(result.report);
                setDiagnosticId(result.diagnosticId ?? null);
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

    const addFromCatalog = (raw: string) => {
        if (!raw) return;
        const name = normalizeSubjectTitle(raw.trim());
        const key = name.toLowerCase();
        if (!key || takenLower.has(key)) return;
        append({ subjectId: name, confidence: 50 });
        setCatalogPickKey((k) => k + 1);
    };

    const addCustomSubject = () => {
        const name = normalizeSubjectTitle(customSubject.trim());
        const key = name.toLowerCase();
        if (!key || takenLower.has(key)) {
            toast({ variant: 'destructive', title: 'Duplicate or empty', description: 'Enter a subject you have not already added.' });
            return;
        }
        append({ subjectId: name, confidence: 50 });
        setCustomSubject('');
    };

    const handleBuildRecoveryPlan = () => {
        if (!user?.uid || !diagnosticId) {
            toast({
                variant: "destructive",
                title: "Can't build recovery plan",
                description: "Missing diagnostic reference. Generate the report again or open it from Diagnostic results.",
            });
            return;
        }
        startRecoveryTransition(async () => {
            const response = await buildPersonalRecoveryPlanAction({
                userId: user.uid,
                studentId: user.uid,
                diagnosticId,
            });
            if (response.success && response.recoveryPlanId) {
                toast({
                    title: "Recovery plan ready",
                    description: "Your personal recovery plan has been created.",
                });
                router.push(`/recovery-plan/${response.recoveryPlanId}`);
            } else {
                toast({
                    variant: "destructive",
                    title: "Couldn't build recovery plan",
                    description: response.error ?? "Please try again in a moment.",
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
                     <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            className="flex-1"
                            disabled={!diagnosticId || isRecoveryPending}
                            onClick={handleBuildRecoveryPlan}
                        >
                            {isRecoveryPending ? (
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldAlert className="mr-2 h-4 w-4" />
                            )}
                            Build personal recovery plan
                        </Button>
                        <Button type="button" variant="outline" className="flex-1" asChild>
                            <Link href="/planner">
                                <CalendarCheck className="mr-2 h-4 w-4" />
                                Open AI study planner
                            </Link>
                        </Button>
                     </div>
                     {!diagnosticId ? (
                        <p className="text-xs text-center text-muted-foreground">
                            If recovery plan stays unavailable, complete the diagnostic again or use{" "}
                            <Link href="/diagnostic-results" className="underline">
                                Past diagnostics
                            </Link>
                            .
                        </p>
                     ) : null}
                </div>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl">Academic diagnostic</CardTitle>
                <CardDescription>
                    Rate your confidence for each subject you want assessed—your profile subjects appear automatically when available, and you can add any others from the catalog or type a custom name.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8">
                        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Add from catalog</Label>
                                    <Select
                                        key={catalogPickKey}
                                        onValueChange={(v) => addFromCatalog(v)}
                                        disabled={isPending || catalogOptions.length === 0 || fields.length >= 24}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                catalogOptions.length === 0
                                                    ? 'All catalog subjects added'
                                                    : 'Choose a subject to add…'
                                            } />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-72">
                                            {catalogOptions.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="custom-subject">Or add custom subject</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="custom-subject"
                                            placeholder="e.g. Latin, Astronomy…"
                                            value={customSubject}
                                            onChange={(e) => setCustomSubject(e.target.value)}
                                            disabled={isPending || fields.length >= 24}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addCustomSubject();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={isPending || fields.length >= 24 || !customSubject.trim()}
                                            onClick={addCustomSubject}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {fields.length} subject{fields.length === 1 ? '' : 's'} in this run (max 24). Remove rows you do not want assessed.
                            </p>
                        </div>

                        {fields.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                Add at least one subject above to run your diagnostic.
                            </p>
                        ) : (
                            fields.map((field, index) => (
                                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-base font-semibold flex-1 pt-1">
                                            {form.getValues(`subjects.${index}.subjectId`)}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            disabled={isPending}
                                            onClick={() => remove(index)}
                                            aria-label="Remove subject"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name={`subjects.${index}.confidence`}
                                        render={({ field: { value, onChange } }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-muted-foreground">Confidence</span>
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
                                </div>
                            ))
                        )}
                    </CardContent>
                    <div className="p-6 border-t">
                        <Button type="submit" className="w-full" disabled={isPending || fields.length === 0}>
                            {isPending ? <Loader className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {isPending ? "Analyzing…" : "Generate my diagnostic report"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Card>
    );
}
