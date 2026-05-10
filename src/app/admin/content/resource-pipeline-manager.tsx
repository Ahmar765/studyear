
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { addResourceUploadAction, reviewResourceAction, type UploadedResource } from '@/server/actions/admin-actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, FileUp, Loader, PlusCircle, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { resourceMetadata, ResourceType } from '@/data/academic';
import { useAuth } from '@/hooks/use-auth';
import { uploadPastPaperPdf } from '@/lib/upload-past-paper-client';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  url: z.string().optional(),
  type: z.enum(Object.keys(resourceMetadata) as [ResourceType, ...ResourceType[]]),
  subject: z.string().min(1, 'Subject is required.'),
  topic: z.string().min(1, 'Topic is required.'),
  level: z.string().min(1, 'Level is required.'),
  licenseType: z.enum(['Standard YouTube', 'Creative Commons', 'Other']),
  attributionText: z.string().optional(),
});

interface ResourcePipelineManagerProps {
    initialResources: UploadedResource[];
    subjects: { code: string, name: string }[];
    levels: string[];
}

export default function ResourcePipelineManager({ initialResources, subjects, levels }: ResourcePipelineManagerProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      url: '',
      type: 'VIDEO',
      subject: '',
      topic: '',
      level: '',
      licenseType: 'Standard YouTube',
      attributionText: '',
    },
  });

  const resourceType = form.watch('type');

  useEffect(() => {
    if (resourceType !== 'PAST_PAPER') {
      setUploadedPdfUrl(null);
    }
  }, [resourceType]);

  function validateHttpsUrl(raw: string): boolean {
    try {
      const u = new URL(raw.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  const onPdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Upload requires an authenticated session.' });
      return;
    }
    setUploadingPdf(true);
    try {
      const token = await user.getIdToken();
      const r = await uploadPastPaperPdf(file, token);
      if (r.error) {
        toast({ variant: 'destructive', title: 'Upload failed', description: r.error });
        return;
      }
      setUploadedPdfUrl(r.url!);
      toast({ title: 'PDF uploaded', description: 'Use “Add to Pipeline” to submit with this file.' });
    } finally {
      setUploadingPdf(false);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
        const urlTrim = (values.url ?? '').trim();

        let effectiveUrl = urlTrim;
        if (values.type === 'PAST_PAPER') {
          effectiveUrl = (uploadedPdfUrl || urlTrim).trim();
          if (!effectiveUrl) {
            toast({
              variant: 'destructive',
              title: 'PDF or link required',
              description: 'Upload a PDF or paste a direct https link to the paper.',
            });
            return;
          }
          if (!validateHttpsUrl(effectiveUrl)) {
            toast({ variant: 'destructive', title: 'Invalid link', description: 'Use a valid http(s) URL or upload a PDF.' });
            return;
          }
        } else {
          if (!urlTrim) {
            form.setError('url', { type: 'manual', message: 'URL is required.' });
            return;
          }
          if (!validateHttpsUrl(urlTrim)) {
            form.setError('url', { type: 'manual', message: 'Must be a valid http(s) URL.' });
            return;
          }
          effectiveUrl = urlTrim;
        }

        form.clearErrors('url');

        const result = await addResourceUploadAction({ ...values, url: effectiveUrl });
        if (result.success) {
            toast({ title: 'Resource Added', description: 'The resource is now pending review.' });
            form.reset();
            setUploadedPdfUrl(null);
            router.refresh(); // Refresh server component data
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    });
  };

  const handleStatusUpdate = (resourceId: string, decision: 'APPROVED' | 'REJECTED') => {
    startTransition(async () => {
        const result = await reviewResourceAction({ resourceId, decision, rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined });
        if (result.success) {
            toast({ title: `Resource ${decision.toLowerCase()}`, description: `The resource status has been updated.` });
            router.refresh();
        } else {
             toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Resource</CardTitle>
                    <CardDescription>Add a new resource to the ingestion pipeline.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Resource Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(resourceMetadata).map(([key, meta]) => <SelectItem key={key} value={key}>{meta.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="url" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {resourceType === 'PAST_PAPER'
                                      ? 'Direct link (optional if you upload a PDF)'
                                      : 'URL'}
                                  </FormLabel>
                                  <FormControl><Input type="url" placeholder="https://…" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                            )} />
                            {resourceType === 'PAST_PAPER' ? (
                              <div className="space-y-2 rounded-lg border border-dashed p-3">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <FileUp className="h-4 w-4" /> Upload PDF
                                </p>
                                <Input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  disabled={uploadingPdf || isPending}
                                  className="cursor-pointer"
                                  onChange={onPdfSelected}
                                />
                                {uploadingPdf ? (
                                  <p className="text-xs text-muted-foreground">Uploading…</p>
                                ) : null}
                                {uploadedPdfUrl ? (
                                  <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                                    <p className="flex items-center gap-2 text-sm text-foreground">
                                      <Check className="h-4 w-4 shrink-0 text-green-600" />
                                      PDF attached — it will be used when you add this resource to the pipeline.
                                    </p>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 w-fit px-2" onClick={() => setUploadedPdfUrl(null)}>
                                      Remove uploaded file
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Max 25 MB. Stored securely for review.</p>
                                )}
                              </div>
                            ) : null}
                            <FormField control={form.control} name="subject" render={({ field }) => (
                                <FormItem><FormLabel>Subject</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger></FormControl><SelectContent>{subjects.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="level" render={({ field }) => (
                                <FormItem><FormLabel>Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger></FormControl><SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="topic" render={({ field }) => (
                                <FormItem><FormLabel>Topic</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="licenseType" render={({ field }) => (
                                <FormItem><FormLabel>License Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Standard YouTube">Standard YouTube</SelectItem><SelectItem value="Creative Commons">Creative Commons</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="attributionText" render={({ field }) => (
                                <FormItem><FormLabel>Attribution (if required)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Add to Pipeline
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Resource Ingestion Pipeline</CardTitle>
                    <CardDescription>Review and approve curated content.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialResources.map(resource => (
                                <TableRow key={resource.uploadId}>
                                    <TableCell className="font-medium">{resource.title}</TableCell>
                                    <TableCell>{resourceMetadata[resource.type as ResourceType]?.title || resource.type}</TableCell>
                                    <TableCell>{resource.subject}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            resource.approvalStatus === 'APPROVED' ? 'secondary' : 
                                            resource.approvalStatus === 'REJECTED' ? 'destructive' : 'default'
                                        }>{resource.approvalStatus}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {resource.approvalStatus === 'PENDING' && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(resource.uploadId, 'APPROVED')} disabled={isPending}>
                                                    <Check className="h-4 w-4" /> Approve
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(resource.uploadId, 'REJECTED')} disabled={isPending}>
                                                    <X className="h-4 w-4" /> Reject
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                             {initialResources.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No resources in the pipeline.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
