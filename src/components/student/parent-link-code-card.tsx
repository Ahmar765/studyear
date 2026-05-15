'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useEffectiveRole } from '@/hooks/use-effective-role';
import { useToast } from '@/hooks/use-toast';
import { deriveParentLinkCode, isStudentRole } from '@/lib/parent-link-code';
import { getStudentParentLinkCodeAction } from '@/server/actions/parent-actions';
import { Check, Copy, KeyRound, Users } from 'lucide-react';

type ParentLinkCodeCardProps = {
  id?: string;
  compact?: boolean;
};

export default function ParentLinkCodeCard({ id = 'parent-link-code', compact = false }: ParentLinkCodeCardProps) {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { role, tokenRoleResolved } = useEffectiveRole();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const showForStudent = role === 'STUDENT' || isStudentRole(userProfile?.role);

  const code = useMemo(() => {
    if (!user?.uid || !showForStudent) return null;
    return deriveParentLinkCode(user.uid);
  }, [user?.uid, showForStudent]);

  useEffect(() => {
    if (!user || !showForStudent) return;
    user.getIdToken().then((token) => {
      void getStudentParentLinkCodeAction(token);
    });
  }, [user, showForStudent]);

  if (profileLoading || !tokenRoleResolved) {
    return (
      <Card id={id} className="border-primary/20 animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="mt-2 h-4 w-full max-w-md rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-24 rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!showForStudent || !code) {
    return null;
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({ title: 'Copied', description: 'Parent Link Code copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Please copy the code manually.' });
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(code)}`;

  return (
    <Card
      id={id}
      className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 shadow-md"
    >
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Connect a parent
        </CardTitle>
        <CardDescription>
          Works on <strong>Free</strong> and <strong>Premium</strong> — your plan does not affect linking. Share this
          code so a parent can connect in their Command Centre (they subscribe separately to view your progress).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={compact ? 'flex flex-col gap-4 sm:flex-row sm:items-center' : 'flex flex-col gap-6 sm:flex-row sm:items-center'}>
          <div className="mx-auto shrink-0 rounded-xl border bg-white p-3 shadow-sm sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR code for Parent Link Code" width={160} height={160} className="h-32 w-32 sm:h-40 sm:w-40" />
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:justify-start">
                <KeyRound className="h-3.5 w-3.5" />
                Your Parent Link Code
              </p>
              <p className="font-mono text-3xl font-bold tracking-[0.35em] text-foreground sm:text-4xl">{code}</p>
            </div>
            <Button type="button" variant="default" className="gap-2" onClick={copyCode}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy code for parent
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Parents: Command Centre → <strong>Link a child</strong> → enter this code. Free students can link too — no
              Premium required on your account.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
