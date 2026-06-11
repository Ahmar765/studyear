'use client';

import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getSchoolCohortOptionsAction,
  updateSchoolStaffAssignmentsAction,
  type SchoolStaffMember,
} from '@/server/actions/school-actions';

export function StaffCohortAssignDialog({
  member,
  onSaved,
}: {
  member: SchoolStaffMember;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [yearGroups, setYearGroups] = useState(member.assignedYearGroups.join(', '));
  const [classes, setClasses] = useState(member.assignedClassNames.join(', '));
  const [suggestions, setSuggestions] = useState<{ yearGroups: string[]; classes: string[] }>({
    yearGroups: [],
    classes: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    void (async () => {
      const token = await user.getIdToken();
      const res = await getSchoolCohortOptionsAction(token);
      setSuggestions({ yearGroups: res.yearGroups, classes: res.classes });
    })();
  }, [open, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await updateSchoolStaffAssignmentsAction(token, {
        staffLinkId: member.staffLinkId,
        assignedYearGroups: yearGroups.split(',').map((s) => s.trim()).filter(Boolean),
        assignedClassNames: classes.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        assignedStudentIds: member.assignedStudentIds,
      });
      if (res.success) {
        toast({ title: 'Assignments saved', description: `${member.name} will see the assigned cohorts.` });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Assign cohorts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign cohorts — {member.name}</DialogTitle>
          <DialogDescription>
            Year groups match each student&apos;s study level / year on their profile. Class names
            match the optional class field (e.g. 10A) when set. Leave both empty to show all school
            students on this teacher&apos;s Command Centre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`yg-${member.id}`}>Year groups / cohorts</Label>
            <Input
              id={`yg-${member.id}`}
              value={yearGroups}
              onChange={(e) => setYearGroups(e.target.value)}
              placeholder="e.g. Year 10, Year 11, GCSE"
            />
            {suggestions.yearGroups.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Suggestions: {suggestions.yearGroups.slice(0, 8).join(' · ')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cl-${member.id}`}>Class names (optional labels)</Label>
            <Input
              id={`cl-${member.id}`}
              value={classes}
              onChange={(e) => setClasses(e.target.value)}
              placeholder="10A, 11B Science"
            />
            {suggestions.classes.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                From school setup: {suggestions.classes.slice(0, 6).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
