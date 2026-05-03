"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Loader } from "lucide-react";
import {
  createSchoolStaffInviteAction,
  getSchoolStaffAction,
  listSchoolStaffInvitesAction,
  type SchoolStaffMember,
  type SchoolStaffInviteRow,
} from "@/server/actions/school-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function SchoolStaffPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<SchoolStaffMember[]>([]);
  const [invites, setInvites] = useState<SchoolStaffInviteRow[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SCHOOL_TUTOR" | "SCHOOL_ADMIN">("SCHOOL_TUTOR");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [sRes, iRes] = await Promise.all([
      getSchoolStaffAction(token),
      listSchoolStaffInvitesAction(token),
    ]);
    setStaff(sRes.staff);
    setInvites(iRes.invites);
    setError(sRes.error || iRes.error);
    setPending(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError("Not authenticated.");
      return;
    }
    load();
  }, [user, authLoading]);

  const handleInvite = async () => {
    if (!user || !email.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await createSchoolStaffInviteAction(token, { email, intendedRole: role });
      if (res.success) {
        toast({ title: "Invite recorded", description: "They can be onboarded when auth exists for that email." });
        setOpen(false);
        setEmail("");
        await load();
      } else {
        toast({ variant: "destructive", title: "Could not save invite", description: res.error });
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">
            Onboard teachers and other staff members and assign them to student cohorts.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Invite staff member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite by email</DialogTitle>
              <DialogDescription>
                Stores a pending invite on your school. Full email delivery can be wired to Firebase / SendGrid
                later.
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
                <Label>Intended role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as "SCHOOL_TUTOR" | "SCHOOL_ADMIN")}
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
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleInvite} disabled={saving || !email.includes("@")}>
                {saving ? "Saving…" : "Save invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
          <CardDescription>Queued invitations for your institution.</CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              No pending invites.
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
                      <Badge variant="outline">{inv.intendedRole.replace("SCHOOL_", "")}</Badge>
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
          <CardTitle>Staff list</CardTitle>
          <CardDescription>Accounts linked via school_staff.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center">{error}</p>}
          {!error && staff.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <UserCog className="h-12 w-12 mb-4" />
              <p className="font-semibold">No staff accounts yet</p>
              <p className="text-sm">Use Invite staff member or ask platform admin to link accounts.</p>
            </div>
          )}
          {!error && staff.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
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
                      <Badge variant="secondary">{member.role.replace("SCHOOL_", "")}</Badge>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
