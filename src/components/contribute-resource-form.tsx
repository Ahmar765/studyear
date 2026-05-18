'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { contributeResourceAction } from '@/server/actions/resource-actions';
import { uploadPastPaperPdf } from '@/lib/upload-past-paper-client';
import { Loader, Upload, Link as LinkIcon } from 'lucide-react';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().optional(),
  url: z.string().optional(),
  type: z.enum(['VIDEO', 'PAST_PAPER']),
  subjectId: z.string().min(1, 'Select a subject.'),
  examBoard: z.string().min(1, 'Select an exam board.'),
  level: z.string().min(1, 'Select a level.'),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  subjects: { code: string; name: string }[];
  examBoards: string[];
  levels: string[];
};

export default function ContributeResourceForm({ subjects, examBoards, levels }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      type: 'VIDEO',
      subjectId: '',
      examBoard: '',
      level: '',
    },
  });

  const resourceType = form.watch('type');

  const onPdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploading(true);
    try {
      const token = await user.getIdToken();
      const r = await uploadPastPaperPdf(file, token);
      if (r.error || !r.url) {
        toast({ variant: 'destructive', title: 'Upload failed', description: r.error });
        return;
      }
      setUploadedUrl(r.url);
      toast({ title: 'PDF uploaded', description: 'Submit the form to send for review.' });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in required' });
      return;
    }

    const url =
      values.type === 'PAST_PAPER'
        ? (uploadedUrl || values.url || '').trim()
        : (values.url || '').trim();

    if (!url) {
      toast({
        variant: 'destructive',
        title: 'Link or file required',
        description:
          values.type === 'PAST_PAPER'
            ? 'Upload a PDF or paste a direct https link.'
            : 'Paste a YouTube or video URL.',
      });
      return;
    }

    startTransition(async () => {
      const token = await user.getIdToken();
      const fd = new FormData();
      fd.set('idToken', token);
      fd.set('title', values.title);
      fd.set('description', values.description ?? '');
      fd.set('url', url);
      fd.set('type', values.type);
      fd.set('subjectId', values.subjectId);
      fd.set('examBoard', values.examBoard);
      fd.set('level', values.level);

      const result = await contributeResourceAction(fd);
      if (result.success) {
        toast({
          title: 'Submitted for review',
          description: 'Our team will review your contribution before it appears in the library.',
        });
        form.reset();
        setUploadedUrl(null);
      } else {
        toast({ variant: 'destructive', title: 'Could not submit', description: result.error });
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Submit a video or past paper</CardTitle>
        <CardDescription>
          Available to students, parents, private tutors, and school staff. Contributions are reviewed
          before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={resourceType}
              onValueChange={(v) => {
                form.setValue('type', v as 'VIDEO' | 'PAST_PAPER');
                setUploadedUrl(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIDEO">Educational video (URL)</SelectItem>
                <SelectItem value="PAST_PAPER">Past paper (PDF or link)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...form.register('title')} placeholder="e.g. AQA Biology Paper 1 2023" />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={form.watch('subjectId')} onValueChange={(v) => form.setValue('subjectId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam board</Label>
              <Select value={form.watch('examBoard')} onValueChange={(v) => form.setValue('examBoard', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Board" />
                </SelectTrigger>
                <SelectContent>
                  {examBoards.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={form.watch('level')} onValueChange={(v) => form.setValue('level', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea {...form.register('description')} rows={2} />
          </div>

          {resourceType === 'PAST_PAPER' ? (
            <div className="space-y-3 rounded-lg border p-4">
              <Label>PDF file</Label>
              <Input type="file" accept="application/pdf" onChange={onPdfSelected} disabled={uploading} />
              {uploadedUrl ? (
                <p className="text-xs text-muted-foreground break-all">Uploaded: {uploadedUrl}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">Or paste a direct https link below.</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {resourceType === 'VIDEO' ? <LinkIcon className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {resourceType === 'VIDEO' ? 'Video URL' : 'PDF link (if not uploaded)'}
            </Label>
            <Input
              {...form.register('url')}
              placeholder={
                resourceType === 'VIDEO'
                  ? 'https://www.youtube.com/watch?v=…'
                  : 'https://…'
              }
            />
          </div>

          <Button type="submit" disabled={isPending || uploading} className="w-full">
            {isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit for review'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
