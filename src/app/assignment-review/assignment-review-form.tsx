
'use client';

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
import { Sparkles, Loader, FileCheck2, Lightbulb, TrendingUp, AlertTriangle, BarChart3, ImageIcon } from "lucide-react";
import {
  type AssignmentReviewResult,
  submitAssignmentForReviewAction,
} from "@/server/actions/assignment-review-actions";
import { Separator } from "@/components/ui/separator";
import { useUserProfile } from "@/hooks/use-user-profile";
import { AssignmentUploadZone } from "@/components/assignment-upload-zone";
import Image from "next/image";

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
  (d) =>
    (d.pastedText?.trim().length ?? 0) >= 100 ||
    Boolean(d.attachmentUrl?.trim()) ||
    Boolean(d.attachmentName?.trim()),
  { message: 'Paste at least 100 characters or attach a file (.txt, .pdf, or image).', path: ['pastedText'] },
);

interface AssignmentReviewFormProps {
    subjectsByLevel: Record<string, string[]>;
    levels: string[];
}

export default function AssignmentReviewForm({ subjectsByLevel, levels }: AssignmentReviewFormProps) {
    const [review, setReview] = useState<AssignmentReviewResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const [attachment, setAttachment] = useState<{ url: string; name: string; kind: string } | null>(null);
    const { user } = useAuth();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const { toast } = useToast();

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
              attachmentUrl: attachment?.url?.trim() || undefined,
              attachmentName: attachment?.name,
            });
            if (result.success && result.review) {
                setReview(result.review);
                toast({
                  title: 'Review Complete!',
                  description: result.review.generatedVisuals?.length
                    ? `Feedback ready with ${result.review.generatedVisuals.length} learning visual(s).`
                    : 'Your feedback has been generated.',
                });
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

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Submit for Review</CardTitle>
                    <CardDescription>
                      Paste your work or attach a file — we read PDFs and photos of handwritten work, then generate charts and visuals where helpful.
                    </CardDescription>
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
                              <FormLabel>Attach file</FormLabel>
                              <AssignmentUploadZone
                                disabled={isPending}
                                attachment={attachment}
                                onAttachmentChange={(a) => {
                                  setAttachment(a);
                                  form.setValue('attachmentUrl', a?.url ?? '');
                                  form.setValue('attachmentName', a?.name ?? '');
                                }}
                                onTextExtracted={(text) => {
                                  form.setValue('pastedText', text);
                                  toast({ title: 'Text loaded from file', description: 'You can edit the text below before submitting.' });
                                }}
                                onError={(msg) => toast({ variant: 'destructive', title: 'Upload failed', description: msg })}
                              />
                            </FormItem>

                            <FormField control={form.control} name="pastedText" render={({ field }) => (
                                <FormItem><FormLabel>Assignment Text</FormLabel><FormControl><Textarea {...field} placeholder="Paste your assignment here (min. 100 characters), or attach a file above." className="min-h-[220px]" /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <Button type="submit" disabled={isPending} className="w-full">
                                {isPending ? <Loader className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                                {isPending ? 'Analysing & generating visuals…' : 'Get Feedback'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>AI Review & Feedback</CardTitle>
                    <CardDescription>Feedback, inline comments, and auto-generated learning visuals.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isPending ? (
                        <div className="space-y-4">
                             <Skeleton className="h-24 w-full" />
                             <Skeleton className="h-32 w-full" />
                             <Skeleton className="h-48 w-full" />
                        </div>
                    ) : review ? (
                        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
                            <Card className="bg-muted/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xl">Executive Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground italic">&ldquo;{review.summary}&rdquo;</p>
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

                            {review.generatedVisuals && review.generatedVisuals.length > 0 ? (
                              <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                                  <BarChart3 className="h-4 w-4 text-violet-500" />
                                  Learning visuals
                                </h3>
                                <div className="space-y-4">
                                  {review.generatedVisuals.map((v, i) => (
                                    <div key={i} className="rounded-lg border p-3">
                                      <p className="font-medium text-sm">{v.title}</p>
                                      <p className="text-xs text-muted-foreground mb-2">{v.rationale}</p>
                                      {v.svg ? (
                                        <div
                                          className="overflow-x-auto rounded-md border bg-white p-2 [&_svg]:max-w-full"
                                          dangerouslySetInnerHTML={{ __html: v.svg }}
                                        />
                                      ) : null}
                                      {v.imageUrl ? (
                                        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md border bg-muted">
                                          <Image
                                            src={v.imageUrl}
                                            alt={v.title}
                                            fill
                                            className="object-contain"
                                            unoptimized={v.imageUrl.startsWith('data:')}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <Separator />

                            <div>
                                <h3 className="text-sm font-semibold mb-2">Detailed feedback</h3>
                                <dl className="space-y-2 text-sm">
                                  <div><dt className="font-medium">Structure & argument</dt><dd className="text-muted-foreground">{review.overallFeedback.structureAndArgument}</dd></div>
                                  <div><dt className="font-medium">Use of evidence</dt><dd className="text-muted-foreground">{review.overallFeedback.useOfEvidence}</dd></div>
                                  <div><dt className="font-medium">Clarity & style</dt><dd className="text-muted-foreground">{review.overallFeedback.clarityAndWritingStyle}</dd></div>
                                  <div><dt className="font-medium">Knowledge & understanding</dt><dd className="text-muted-foreground">{review.overallFeedback.knowledgeAndUnderstanding}</dd></div>
                                </dl>
                            </div>

                            {review.inlineComments?.length > 0 ? (
                              <div>
                                <h3 className="text-lg font-semibold mb-2">Inline comments</h3>
                                <ul className="space-y-3">
                                  {review.inlineComments.map((c, i) => (
                                    <li key={i} className="rounded-md border-l-4 border-primary/40 bg-muted/30 pl-3 py-2 text-sm">
                                      <p className="text-xs italic text-muted-foreground mb-1">&ldquo;{c.originalText}&rdquo;</p>
                                      <p>{c.comment}</p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

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
                            {review.nextActions?.length > 0 ? (
                              <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><ImageIcon className="h-4 w-4" /> Next steps</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                  {review.nextActions.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                              </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-24 flex flex-col items-center">
                            <FileCheck2 className="h-16 w-16 mb-4" />
                            <p>Submit your assignment to begin the review process.</p>
                            <p className="mt-2 text-xs max-w-xs">Attach PDFs or photos of work — we generate bar charts, axis graphs, and illustrations when they help your learning.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
