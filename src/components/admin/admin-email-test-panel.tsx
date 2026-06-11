'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getMailDeliveryStatusAction,
  sendTestEmailAction,
} from '@/server/actions/settings-actions';

export function AdminEmailTestPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [testEmail, setTestEmail] = useState('');
  const [mailStatus, setMailStatus] = useState<{
    configured: boolean;
    connectionOk: boolean;
    connectionError?: string;
    fromAddress?: string;
    contactInbox?: string;
    host?: string;
    port?: number;
    username?: string;
    passwordLength?: number;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await getMailDeliveryStatusAction(token);
    if (res.success) {
      setMailStatus({
        configured: res.configured,
        connectionOk: res.connectionOk ?? false,
        connectionError: res.connectionError,
        fromAddress: res.fromAddress,
        contactInbox: res.contactInbox,
        host: res.host,
        port: res.port,
        username: res.username,
        passwordLength: res.passwordLength,
      });
      setTestEmail((prev) => prev || res.contactInbox || '');
    }
  }, [user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const sendTest = () => {
    if (!user || !testEmail.trim()) return;
    startTransition(async () => {
      const token = await user.getIdToken();
      const res = await sendTestEmailAction(token, testEmail);
      if (res.success) {
        toast({
          title: 'Test email sent',
          description: `Check ${testEmail} (and your spam folder).`,
        });
      } else {
        toast({ variant: 'destructive', title: 'Test failed', description: res.error });
      }
    });
  };

  return (
    <Card className="border-primary/25 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Mail className="h-5 w-5 text-primary" />
          Email delivery &amp; test
        </CardTitle>
        <CardDescription>
          Welcome emails, top-up receipts, and contact form notifications all use SMTP. Send a test
          message to confirm your server can deliver mail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mailStatus?.configured ? (
          <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
            <strong className="text-foreground">Server env (live):</strong>{' '}
            {mailStatus.host}:{mailStatus.port} · user {mailStatus.username ?? '—'} · password{' '}
            {mailStatus.passwordLength ?? 0} characters (compare with local — should match exactly)
          </p>
        ) : null}

        {mailStatus ? (
          mailStatus.configured && mailStatus.connectionOk ? (
            <Alert className="border-emerald-500/40 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>SMTP connected</AlertTitle>
              <AlertDescription className="text-sm">
                Sending from <strong>{mailStatus.fromAddress}</strong>. Contact form inbox:{' '}
                <strong>{mailStatus.contactInbox}</strong>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {mailStatus.configured ? 'SMTP connection failed' : 'SMTP not configured on server'}
              </AlertTitle>
              <AlertDescription className="text-sm space-y-2">
                {!mailStatus.configured ? (
                  <p>
                    Add <code className="text-xs">MAIL_SMTP_HOST</code>,{' '}
                    <code className="text-xs">MAIL_USERNAME</code>, and{' '}
                    <code className="text-xs">MAIL_PASSWORD</code> in Firebase App Hosting environment
                    variables, then redeploy.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p>{mailStatus.connectionError ?? 'Could not connect to SMTP.'}</p>
                    {mailStatus.connectionError?.includes('535') ||
                    mailStatus.connectionError?.toLowerCase().includes('authentication') ? (
                      <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                        <li>
                          Log in at Hostinger webmail with the same email/password — if that fails, reset
                          the mailbox password in hPanel → Emails.
                        </li>
                        <li>
                          After changing Firebase env vars, trigger a <strong>new rollout</strong> —
                          old containers keep the previous password until redeployed.
                        </li>
                        <li>
                          Check <strong>Server env (live)</strong> above: password length must match
                          your mailbox password exactly (often 11 chars for this account).
                        </li>
                        <li>
                          Re-save <code>MAIL_PASSWORD</code> with no spaces or quotes; prefer Firebase{' '}
                          <strong>Secret Manager</strong> for passwords containing <code>@</code>.
                        </li>
                        <li>
                          Try <code>MAIL_SMTP_HOST=smtp.titan.email</code> if your mailbox uses Titan.
                        </li>
                      </ul>
                    ) : null}
                  </div>
                )}
                <p>
                  Contact form submissions still appear in{' '}
                  <Link href="/admin/contact-inbox" className="underline font-medium">
                    Contact inbox
                  </Link>
                  .
                </p>
              </AlertDescription>
            </Alert>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Checking mail configuration…</p>
        )}

        <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/[0.03] p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="admin-test-email" className="text-base font-medium">
              Send test email to
            </Label>
            <Input
              id="admin-test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="contact@studyear.com"
              className="bg-background"
            />
          </div>
          <Button
            type="button"
            size="lg"
            onClick={sendTest}
            disabled={isPending || !testEmail.trim() || !user}
            className="shrink-0"
          >
            <Send className="mr-2 h-4 w-4" />
            {isPending ? 'Sending…' : 'Send test email'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadStatus()}>
            Refresh status
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/contact-inbox">Contact inbox</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
