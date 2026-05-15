'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  acceptSchoolStaffInviteAction,
  getSchoolTeacherLinkStatusAction,
  linkSchoolTeacherByCodeAction,
  type SchoolTeacherLinkStatus,
} from '@/server/actions/teacher-actions';
import { Building2, KeyRound, Loader, Mail } from 'lucide-react';

export function SchoolLinkSchoolCard({ onLinked }: { onLinked?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<SchoolTeacherLinkStatus | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await getSchoolTeacherLinkStatusAction(token);
      if (res.success && res.status) setStatus(res.status);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleLinked = (schoolName?: string) => {
    toast({
      title: 'Linked to school',
      description: schoolName
        ? `You are now connected to ${schoolName}. Live cohort data will load shortly.`
        : 'Your school workspace is connected.',
    });
    void loadStatus();
    onLinked?.();
  };

  const submitCode = () => {
    startTransition(async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const result = await linkSchoolTeacherByCodeAction(token, code);
      if (result.success) {
        setCode('');
        handleLinked(result.schoolName);
      } else {
        toast({ variant: 'destructive', title: 'Could not link', description: result.error });
      }
    });
  };

  const acceptInvite = () => {
    startTransition(async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const result = await acceptSchoolStaffInviteAction(token);
      if (result.success) {
        handleLinked(result.schoolName);
      } else {
        toast({ variant: 'destructive', title: 'No invite found', description: result.error });
      }
    });
  };

  if (loading) {
    return (
      <Card className="school-panel border-indigo-500/30">
        <CardContent className="flex items-center justify-center py-10">
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (status?.linked) return null;

  return (
    <Card className="school-panel border-indigo-500/40 bg-indigo-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-indigo-600" />
          Link to your school
        </CardTitle>
        <CardDescription>
          Connect your teacher account to your school&apos;s StudYear workspace to see live student cohorts,
          interventions, and assessments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {status?.pendingInvite && (
          <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-emerald-700" />
              Invitation pending for {status.pendingInvite.schoolName}
            </p>
            <p className="text-sm text-muted-foreground">
              Your administrator invited you as {status.pendingInvite.intendedRole.replace('_', ' ').toLowerCase()}.
              Accept to join without a join code.
            </p>
            <Button type="button" onClick={acceptInvite} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Accepting…
                </>
              ) : (
                'Accept invitation'
              )}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            Enter the 8-character School Join Code from your school admin (Settings → Staff in the school portal).
          </p>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="school-join-code">School Join Code</Label>
            <Input
              id="school-join-code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .replace(/[^A-Za-z0-9]/g, '')
                    .toUpperCase()
                    .slice(0, 8),
                )
              }
              placeholder="AB12CD34"
              className="font-mono text-center text-lg uppercase tracking-[0.25em]"
              maxLength={8}
              autoComplete="off"
            />
          </div>
          <Button type="button" onClick={submitCode} disabled={isPending || code.length !== 8}>
            {isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Linking…
              </>
            ) : (
              'Link to school'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
