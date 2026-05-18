
'use client';

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader, FileCheck2, Lightbulb, TrendingUp, AlertTriangle, Lock, Paperclip } from "lucide-react";
import { uploadPastPaperPdf } from '@/lib/upload-past-paper-client';
import { AssignmentReviewOutput, submitAssignmentForReviewAction } from "@/server/actions/assignment-review-actions";
import { Separator } from "@/components/ui/separator";
import { useUserProfile } from "@/hooks/use-user-profile";
import { canUsePremiumFeature } from "@/data/entitlements";
import type { SubscriptionType } from "@/server/schemas";

const assignmentTypes = ["HOMEWORK", "ASSIGNMENT", "ESSAY", "COURSEWORK", "REPORT", "DISSERTATION", "THESIS", "PERSONAL_STATEMENT", "OTHER"];

const FormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  type: z.enum(assignmentTypes as [string, ...string[]]),
  subject: z.string().min(1, "Please select a subject."),
  studyLevel: z.string().min(1, "Please select a level."),
  pastedText: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
}).refine(
  (d) => (d.pastedText?.trim().length ?? 0) >= 100 || Boolean(d.attachmentUrl?.trim()),
  { message: 'Paste at least 100 characters or attach a .txt / .pdf file.', path: ['pastedText'] },
);

interface AssignmentReviewFormProps {
    subjectsByLevel: Record<string, string[]>;
    levels: string[];
}

export default function AssignmentReviewForm({ subjectsByLevel, levels }: AssignmentReviewFormProps) {
    const [review, setReview] = useState<AssignmentReviewOutput | null>(null);
    const [isPending, startTransition] = useTransition();
    const [uploadingFile, setUploadingFile] = useState(false);
    const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
    const { user } = useAuth();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const { toast } = useToast();

    const subscription = (userProfile?.subscription ?? "FREE") as SubscriptionType;
    const hasPremiumAssignmentReview =
        userProfile?.role === "ADMIN" ||
        canUsePremiumFeature(subscription, "AI_ASSIGNMENT_REVIEW");

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            title: "",
            type: "ASSIGNMENT",
            subject: "",
            studyLevel: "",
            pastedText: "",
            attachmentUrl: "",
            attachmentName: "",
        }
    });

    const onSubmit = (values: z.infer<typeof FormSchema>) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }

        setReview(null);
        startTransition(async () => {
            const result = await submitAssignmentForReviewAction({
              ...values,
              userId: user.uid,
              studentId: user.uid,
              attachmentUrl: attachment?.url,
              attachmentName: attachment?.name,
            });
            if (result.success && result.review) {
                setReview(result.review);
                toast({ title: 'Review Complete!', description: 'Your feedback has been generated.' });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Couldn\'t complete review',
                    description: result.error ?? 'Please try again in a moment.',
                });
            }
        });
    }
    
    const subjectsForLevel = subjectsByLevel[form.watch('studyLevel')] || [];

    if (user && profileLoading) {
        return (
            <div className="grid lg:grid-cols-2 gap-8">
                <Skeleton className="min-h-[480px] w-full rounded-lg" />
                <Skeleton className="min-h-[480px] w-full rounded-lg" />
            </div>
        );
    }

    if (user && !hasPremiumAssignmentReview) {
        return (
            <Card className="max-w-lg mx-auto border-accent/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Premium: AI Assignment Review
                    </CardTitle>
                    <CardDescription>
                        Detailed AI feedback and predicted grades for homework, essays, dissertations, and other written work are included with Premium and Premium Plus.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Upgrade to unlock this tool. Each review still uses ACUs from your wallet.
                    </p>
                    <Button asChild>
                        <Link href="/checkout">View plans & upgrade</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Submit for Review</CardTitle>
                    <CardDescription>Enter the details of your assignment and paste the text below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Assignment Title</FormLabel><FormControl><Input {...field} placeholder="e.g., The Causes of World War 1 Essay" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Type</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{assignmentTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="studyLevel" render={({ field }) => (
                                    <FormItem><FormLabel>Level</FormLabel><Select
                                      value={field.value}
                                      onValueChange={(v) => {
                                        field.onChange(v);
                                        form.setValue('subject', '');
                                      }}
                                    ><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="subject" render={({ field }) => (
                                <FormItem><FormLabel>Subject</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={subjectsForLevel.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{subjectsForLevel.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )}/>
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4" />
                                Attach file (optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept=".txt,text/plain,application/pdf"
                                  disabled={uploadingFile || isPending}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file || !user) return;
                                    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                                      const text = await file.text();
                                      form.setValue('pastedText', text);
                                      setAttachment({ url: '', name: file.name });
                                      toast({ title: 'Text loaded', description: 'Review the pasted text below before submitting.' });
                                      return;
                                    }
                                    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                                      setUploadingFile(true);
                                      try {
                                        const token = await user.getIdToken();
                                        const r = await uploadPastPaperPdf(file, token);
                                        if (r.error || !r.url) {
                                          toast({ variant: 'destructive', title: 'Upload failed', description: r.error });
                                          return;
                                        }
                                        setAttachment({ url: r.url, name: file.name });
                                        form.setValue('attachmentUrl', r.url);
                                        form.setValue('attachmentName', file.name);
                                        toast({
                                          title: 'PDF attached',
                                          description: 'Also paste key excerpts in the text box if the PDF is long.',
                                        });
                                      } finally {
                                        setUploadingFile(false);
                                      }
                                      return;
                                    }
                                    toast({ variant: 'destructive', title: 'Unsupported file', description: 'Use .txt or .pdf' });
                                  }}
                                />
                              </FormControl>
                              {attachment?.name ? (
                                <p className="text-xs text-muted-foreground">Attached: {attachment.name}</p>
                              ) : null}
                            </FormItem>
                            <FormField control={form.control} name="pastedText" render={({ field }) => (
                                <FormItem><FormLabel>Assignment Text</FormLabel><FormControl><Textarea {...field} placeholder="Paste your full written assignment here (min. 100 characters), or attach a file above." className="min-h-[250px]" /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <Button type="submit" disabled={isPending} className="w-full">
                                {isPending ? <Loader className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                                Get Feedback
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>AI Review & Feedback</CardTitle>
                    <CardDescription>Your comprehensive feedback will appear below.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isPending ? (
                        <div className="space-y-4">
                             <Skeleton className="h-24 w-full" />
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                        </div>
                    ) : review ? (
                        <div className="space-y-6">
                            <Card className="bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="text-xl">Executive Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground italic">"{review.summary}"</p>
                                    <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground">PREDICTED GRADE (AS-IS)</p>
                                            <p className="text-3xl font-bold">{review.predictedCurrentGrade}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground">POTENTIAL GRADE (WITH CHANGES)</p>
                                            <p className="text-3xl font-bold text-green-600">{review.predictedGradeAfterImprovement}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Separator />
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><TrendingUp /> Strengths</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-green-700 dark:text-green-400">
                                    {review.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><AlertTriangle /> Areas for Improvement</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                                    {review.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Lightbulb /> Actionable Recommendations</h3>
                                <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                                    {review.improvementRecommendations.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-24 flex flex-col items-center">
                            <FileCheck2 className="h-16 w-16 mb-4" />
                            <p>Submit your assignment to begin the review process.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
