'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import {
  createSchoolAssessmentAction,
  listSchoolAssessmentsAction,
  type SchoolAssessmentRow,
} from '@/server/actions/school-actions';
import { useToast } from '@/hooks/use-toast';

export default function SchoolAssessmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SchoolAssessmentRow[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await listSchoolAssessmentsAction(token);
    setRows(res.assessments);
    setError(res.error);
    setPending(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError('Not authenticated.');
      return;
    }
    load();
  }, [user, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await createSchoolAssessmentAction(token, {
        title,
        description,
        dueDate: dueDate || null,
      });
      if (res.success) {
        toast({ title: 'Assessment saved' });
        setTitle('');
        setDescription('');
        setDueDate('');
        await load();
      } else {
        toast({ variant: 'destructive', title: 'Could not save', description: res.error });
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Assessments</h2>
        <p className="text-muted-foreground">
          Record school-wide or cohort assessments; assignment distribution can plug in later.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New assessment</CardTitle>
            <CardDescription>Add an entry to your school assessment library.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Autumn maths checkpoint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Scope, cohort, format…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due date (optional)</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save assessment'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assessment library
            </CardTitle>
            <CardDescription>Recently added records for your school.</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No assessments yet — create one on the left.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.title}</div>
                        {r.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.dueDate ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
