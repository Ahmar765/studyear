'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  updateSchoolStaffAssignmentsAction,
  type SchoolStaffMember,
  type SchoolStudent,
} from '@/server/actions/school-actions';
import { UserCheck } from 'lucide-react';

export function StaffStudentAssignDialog({
  member,
  students,
  onSaved,
}: {
  member: SchoolStaffMember;
  students: SchoolStudent[];
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(member.assignedStudentIds);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.yearGroup.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q),
    );
  }, [students, query]);

  const openDialog = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelected(member.assignedStudentIds);
      setQuery('');
    }
    setOpen(nextOpen);
  };

  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelected((prev) =>
      checked ? [...new Set([...prev, studentId])] : prev.filter((id) => id !== studentId),
    );
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await updateSchoolStaffAssignmentsAction(token, {
        staffLinkId: member.staffLinkId,
        assignedYearGroups: member.assignedYearGroups,
        assignedClassNames: member.assignedClassNames,
        assignedStudentIds: selected,
      });
      if (res.success) {
        toast({
          title: 'Students assigned',
          description: `${member.name} will see ${selected.length} individually assigned student${selected.length === 1 ? '' : 's'}.`,
        });
        setOpen(false);
        onSaved?.();
      } else {
        toast({ variant: 'destructive', title: 'Save failed', description: res.error });
      }
    } finally {
      setSaving(false);
    }
  };

  if (member.role !== 'SCHOOL_TUTOR') return null;

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          Assign students
          {member.assignedStudentIds.length > 0 ? ` (${member.assignedStudentIds.length})` : ''}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign students — {member.name}</DialogTitle>
          <DialogDescription>
            Pick individual students for this teacher. They will always see these students, plus any who
            match their year-group cohorts. If you only pick students here (no cohorts), the teacher
            sees only the selected students.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Search by name or year group…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              No students on your school roll yet. Add students in the Students section first.
            </p>
          ) : (
            <ScrollArea className="h-64 rounded-md border p-3">
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const checked = selected.includes(student.id);
                  return (
                    <div key={student.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`student-${member.id}-${student.id}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleStudent(student.id, v === true)}
                      />
                      <Label
                        htmlFor={`student-${member.id}-${student.id}`}
                        className="flex-1 cursor-pointer text-sm font-normal leading-snug"
                      >
                        <span className="font-medium text-foreground">{student.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {student.yearGroup || 'No year group set'}
                        </span>
                      </Label>
                    </div>
                  );
                })}
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No matches.</p>
                ) : null}
              </div>
            </ScrollArea>
          )}
          <p className="text-xs text-muted-foreground">
            {selected.length} student{selected.length === 1 ? '' : 's'} selected
          </p>
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || students.length === 0}>
            {saving ? 'Saving…' : 'Save assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
