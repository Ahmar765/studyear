'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getSchoolStaffJoinCodeAction,
  regenerateSchoolStaffJoinCodeAction,
} from '@/server/actions/school-actions';
import { Copy, KeyRound, Loader, RefreshCw } from 'lucide-react';

export function SchoolStaffJoinCodePanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await getSchoolStaffJoinCodeAction(token);
      if (res.code) setCode(res.code);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Copied', description: 'School Join Code copied to clipboard.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy' });
    }
  };

  const regenerate = () => {
    startTransition(async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await regenerateSchoolStaffJoinCodeAction(token);
      if (res.code) {
        setCode(res.code);
        toast({
          title: 'New code generated',
          description: 'Share the updated code with teachers who have not linked yet.',
        });
      } else {
        toast({ variant: 'destructive', title: 'Could not regenerate', description: res.error });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-5 w-5" />
          School Join Code
        </CardTitle>
        <CardDescription>
          Teachers enter this code on their Command Centre to link their account to your school. You can also invite
          them by email on the Staff page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {loading ? (
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span className="rounded-lg border bg-muted px-4 py-2 font-mono text-xl tracking-[0.2em]">
              {code ?? '—'}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={copyCode} disabled={!code}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={regenerate} disabled={isPending}>
              {isPending ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
