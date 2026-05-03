'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import {
  createSchoolInterventionAction,
  getSchoolStudentsAction,
  listSchoolInterventionsAction,
  type SchoolInterventionRow,
  type SchoolStudent,
} from '@/server/actions/school-actions';
import { useToast } from '@/hooks/use-toast';

export default function SchoolInterventionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SchoolInterventionRow[]>([]);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [iRes, sRes] = await Promise.all([
      listSchoolInterventionsAction(token),
      getSchoolStudentsAction(token),
    ]);
    setRows(iRes.interventions);
    setStudents(sRes.students);
    setError(iRes.error || sRes.error);
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

  const handleCreate = async () => {
    if (!user || !studentId || !title.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await createSchoolInterventionAction(token, {
        studentUserId: studentId,
        title,
        notes,
      });
      if (res.success) {
        toast({ title: 'Intervention logged' });
        setOpen(false);
        setStudentId('');
        setTitle('');
        setNotes('');
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Interventions</h2>
          <p className="text-muted-foreground">
            Track structured support plans for students on your school roll.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={students.length === 0}>Log intervention</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New intervention</DialogTitle>
              <DialogDescription>
                Choose a linked student and summarise the intervention focus.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.yearGroup}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="int-title">Title</Label>
                <Input
                  id="int-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Maths booster — 6 weeks"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="int-notes">Notes</Label>
                <Textarea
                  id="int-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={saving || !studentId || !title.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active intervention plans
          </CardTitle>
          <CardDescription>Recorded for your institution (extend with workflows later).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No students linked to your school yet — interventions attach to linked student accounts.
            </p>
          )}
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-semibold">No interventions logged</p>
              <p className="text-sm">Use “Log intervention” to create the first entry.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.studentName}{' '}
                      <span className="font-mono text-xs opacity-70">({r.studentId})</span>
                    </p>
                    {r.notes && <p className="text-sm mt-2">{r.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
