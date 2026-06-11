'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  Loader,
  UserCog,
  UserPlus,
  Users,
  ArrowRight,
  Link2,
} from 'lucide-react';
import {
  createSchoolStaffInviteAction,
  getSchoolStaffAction,
  getSchoolStudentsAction,
  listSchoolStaffInvitesAction,
  type SchoolStaffMember,
  type SchoolStaffInviteRow,
  type SchoolStudent,
} from '@/server/actions/school-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SchoolStaffJoinCodePanel } from '@/components/school/school-staff-join-code-panel';
import { StaffCohortAssignDialog } from '@/components/school/staff-cohort-assign-dialog';
import { StaffStudentAssignDialog } from '@/components/school/staff-student-assign-dialog';
import { LinkStudentForm } from '@/components/school-portal/link-student-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function SchoolPeopleManagement() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [staff, setStaff] = useState<SchoolStaffMember[]>([]);
  const [invites, setInvites] = useState<SchoolStaffInviteRow[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'SCHOOL_TUTOR' | 'SCHOOL_ADMIN'>('SCHOOL_TUTOR');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setPending(true);
    try {
      const token = await user.getIdToken();
      const [sRes, stRes, iRes] = await Promise.all([
        getSchoolStudentsAction(token),
        getSchoolStaffAction(token),
        listSchoolStaffInvitesAction(token),
      ]);
      setStudents(sRes.students);
      setStaff(stRes.staff);
      setInvites(iRes.invites);
      setError(sRes.error || stRes.error || iRes.error);
    } catch {
      setError('Failed to load people data.');
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError('Not authenticated.');
      return;
    }
    void load();
  }, [user, authLoading]);

  const handleInvite = async () => {
    if (!user || !email.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await createSchoolStaffInviteAction(token, { email, intendedRole: role });
      if (res.success) {
        toast({
          title: 'Invite recorded',
          description: 'They can accept on their teacher dashboard or use your School Join Code below.',
        });
        setInviteOpen(false);
        setEmail('');
        await load();
      } else {
        toast({ variant: 'destructive', title: 'Could not save invite', description: res.error });
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

  const teacherCount = staff.filter((m) => m.role === 'SCHOOL_TUTOR').length;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">People management</h2>
        <p className="text-muted-foreground max-w-3xl">
          Add teachers and students, assign classes to teachers, and manage your whole school roll from
          this page.
        </p>
      </div>

      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertTitle>How to set up your school in three steps</AlertTitle>
        <AlertDescription>
          <ol className="mt-2 list-decimal list-inside space-y-1.5 text-sm">
            <li>
              <strong>Invite teachers</strong> below (email invite or School Join Code).
            </li>
            <li>
              <strong>Add students</strong> by email — they must already have a StudYear account.
            </li>
            <li>
              <strong>Assign students</strong> individually to each teacher, or use <strong>Assign
              cohorts</strong> for whole year groups and classes.
            </li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Teachers linked</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{teacherCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students on roll</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{students.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending teacher invites</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{invites.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section id="teachers" className="space-y-6 scroll-mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Teachers</h3>
              <p className="text-sm text-muted-foreground">
                Invite staff, share your join code, then assign year groups and classes.
              </p>
            </div>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite teacher by email</DialogTitle>
                <DialogDescription>
                  Stores a pending invite. Teachers accept on their dashboard or use the School Join Code
                  on this page.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.org"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as 'SCHOOL_TUTOR' | 'SCHOOL_ADMIN')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL_TUTOR">Teacher / tutor</SelectItem>
                      <SelectItem value="SCHOOL_ADMIN">School admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" type="button" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleInvite} disabled={saving || !email.includes('@')}>
                  {saving ? 'Saving…' : 'Save invite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SchoolStaffJoinCodePanel />

        <Card>
          <CardHeader>
            <CardTitle>Pending teacher invites</CardTitle>
            <CardDescription>Waiting for teachers to accept and link to your school.</CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                No pending invites. Use &quot;Invite teacher&quot; above to add one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.intendedRole.replace('SCHOOL_', '')}</Badge>
                      </TableCell>
                      <TableCell>{inv.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher list &amp; student assignment</CardTitle>
            <CardDescription>
              Use <strong>Assign students</strong> to pick individuals, or <strong>Assign cohorts</strong>{' '}
              for whole year groups. Teachers see individually assigned students plus any cohort matches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-destructive text-center mb-4">{error}</p>}
            {staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <UserCog className="h-10 w-10 mb-3" />
                <p className="font-semibold">No teachers linked yet</p>
                <p className="text-sm">Invite a teacher or share your School Join Code.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned cohorts</TableHead>
                    <TableHead>Individual students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.profileImageUrl} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{member.role.replace('SCHOOL_', '')}</Badge>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[14rem]">
                        {member.role === 'SCHOOL_TUTOR'
                          ? member.assignedYearGroups.length
                            ? member.assignedYearGroups.join(', ')
                            : 'All year groups'
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.role === 'SCHOOL_TUTOR'
                          ? member.assignedStudentIds.length > 0
                            ? `${member.assignedStudentIds.length} assigned`
                            : 'None'
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.role === 'SCHOOL_TUTOR' ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <StaffStudentAssignDialog
                              member={member}
                              students={students}
                              onSaved={load}
                            />
                            <StaffCohortAssignDialog member={member} onSaved={load} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Admin access</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="students" className="space-y-6 scroll-mt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Students</h3>
            <p className="text-sm text-muted-foreground">
              Link existing StudYear accounts to your school roll.
            </p>
          </div>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Add a student</CardTitle>
            <CardDescription>
              Enter the email they used to sign up. They will appear in the roster and match teachers
              by year group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkStudentForm onLinked={() => void load()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student roster</CardTitle>
            <CardDescription>
              All students linked to your school. Year group must match a teacher&apos;s assigned cohort
              for them to appear on that teacher&apos;s dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mb-4" />
                <p className="font-semibold">No students linked yet</p>
                <p className="text-sm max-w-md">
                  Add a student by email above. They must already have signed up to StudYear.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Year group</TableHead>
                    <TableHead>Predicted grade</TableHead>
                    <TableHead className="w-[200px]">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={student.profileImageUrl} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{student.yearGroup ?? '—'}</TableCell>
                      <TableCell>{student.predictedGrade}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={student.progressScore} className="h-2" />
                          <span className="text-xs text-muted-foreground">{student.progressScore}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Quick reference: teacher ↔ student matching</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Assign students</strong> — pick specific students for a
            teacher. If you only use this (no cohorts), the teacher sees only those students.
          </p>
          <p>
            <strong className="text-foreground">Assign cohorts</strong> — assign whole year groups and
            optional class names. Students appear when their profile year group matches.
          </p>
          <p>
            You can use both together: individually assigned students always appear, plus any students
            matching the teacher&apos;s cohorts.
          </p>
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <a href="#teachers">
              Back to teacher assignment
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
