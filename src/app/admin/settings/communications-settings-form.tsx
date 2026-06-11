'use client';

import { useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getMailDeliveryStatusAction,
  getSystemSettings,
  sendTestEmailAction,
  updateSystemSettingsAction,
} from '@/server/actions/settings-actions';
import type { SystemSettings } from '@/server/schemas/system-settings';
import { useState } from 'react';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

export default function CommunicationsSettingsForm({
  initialSettings,
}: {
  initialSettings: SystemSettings;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const c = initialSettings.communications ?? {};

  const [mailStatus, setMailStatus] = useState<{
    configured: boolean;
    connectionOk: boolean;
    connectionError?: string;
    fromAddress?: string;
    contactInbox?: string;
  } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const [form, setForm] = useState({
    supportEmail: c.supportEmail ?? 'support@studyear.com',
    contactEmail: c.contactEmail ?? 'contact@studyear.com',
    noreplyEmail: c.noreplyEmail ?? 'contact@studyear.com',
    forgotTitle: c.forgotPassword?.title ?? 'Check your inbox',
    forgotDescription:
      c.forgotPassword?.description ??
      'If an account exists for that email, we sent a password reset link.',
    forgotBody:
      c.forgotPassword?.body ?? "Enter your email and we'll send you a link to reset your password.",
    contactTitle: c.contactForm?.title ?? 'Message sent',
    contactDescription:
      c.contactForm?.description ?? 'Thank you for contacting us. We will get back to you shortly.',
    signupTitle: c.signupWelcome?.title ?? 'Account created',
    signupDescription: c.signupWelcome?.description ?? 'You can now complete your profile.',
    companyName: c.businessDetails?.companyName ?? 'StudYear Ltd.',
    registeredAddress:
      c.businessDetails?.registeredAddress ?? '123 Learning Lane, London, UK, SW1A 0AA',
  });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const token = await user.getIdToken();
      const res = await getMailDeliveryStatusAction(token);
      if (res.success) {
        setMailStatus({
          configured: res.configured,
          connectionOk: res.connectionOk ?? false,
          connectionError: res.connectionError,
          fromAddress: res.fromAddress,
          contactInbox: res.contactInbox,
        });
        if (!testEmail && res.contactInbox) setTestEmail(res.contactInbox);
      }
    })();
  }, [user, testEmail]);

  const save = () => {
    startTransition(async () => {
      const current = await getSystemSettings();
      const result = await updateSystemSettingsAction({
        ...current,
        communications: {
          supportEmail: form.supportEmail.trim(),
          contactEmail: form.contactEmail.trim(),
          noreplyEmail: form.noreplyEmail.trim(),
          businessDetails: {
            companyName: form.companyName.trim(),
            registeredAddress: form.registeredAddress.trim(),
          },
          forgotPassword: {
            title: form.forgotTitle.trim(),
            description: form.forgotDescription.trim(),
            body: form.forgotBody.trim(),
          },
          contactForm: {
            title: form.contactTitle.trim(),
            description: form.contactDescription.trim(),
          },
          signupWelcome: {
            title: form.signupTitle.trim(),
            description: form.signupDescription.trim(),
          },
        },
      });
      if (result.success) {
        toast({ title: 'Communications saved', description: 'Contact inbox and message copy updated.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  const sendTest = () => {
    if (!user) return;
    startTransition(async () => {
      const token = await user.getIdToken();
      const res = await sendTestEmailAction(token, testEmail);
      if (res.success) {
        toast({ title: 'Test email sent', description: `Check ${testEmail} (and spam folder).` });
      } else {
        toast({ variant: 'destructive', title: 'Test failed', description: res.error });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email &amp; user messages
        </CardTitle>
        <CardDescription>
          Contact form notifications, welcome emails, and receipts use SMTP env vars. The contact email
          below is your inbox for form submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mailStatus ? (
          mailStatus.configured && mailStatus.connectionOk ? (
            <Alert className="border-emerald-500/40 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>SMTP connected</AlertTitle>
              <AlertDescription className="text-sm">
                Sending from <strong>{mailStatus.fromAddress}</strong>. Contact form →{' '}
                <strong>{mailStatus.contactInbox}</strong>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {mailStatus.configured ? 'SMTP connection failed' : 'SMTP not configured'}
              </AlertTitle>
              <AlertDescription className="text-sm space-y-1">
                {!mailStatus.configured ? (
                  <p>
                    Set <code className="text-xs">MAIL_SMTP_HOST</code>,{' '}
                    <code className="text-xs">MAIL_USERNAME</code>, and{' '}
                    <code className="text-xs">MAIL_PASSWORD</code> in your hosting environment (Firebase
                    App Hosting / Vercel). Submissions still save to{' '}
                    <Link href="/admin/contact-inbox" className="underline">
                      Admin → Contact inbox
                    </Link>
                    .
                  </p>
                ) : (
                  <p>{mailStatus.connectionError ?? 'Could not verify SMTP connection.'}</p>
                )}
              </AlertDescription>
            </Alert>
          )
        ) : null}

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label htmlFor="test-email">Send test email to</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="contact@studyear.com"
            />
          </div>
          <Button type="button" variant="secondary" onClick={sendTest} disabled={isPending || !testEmail}>
            {isPending ? 'Sending…' : 'Send test'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Company name (contact page)</Label>
            <Input
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Registered address (contact page)</Label>
            <Textarea
              value={form.registeredAddress}
              onChange={(e) => setForm((f) => ({ ...f, registeredAddress: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Support email (displayed)</Label>
            <Input
              value={form.supportEmail}
              onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact inbox email</Label>
            <Input
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Contact form notifications are sent here (unless CONTACT_INBOX_EMAIL env is set).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Outbound sender (reference)</Label>
            <Input
              value={form.noreplyEmail}
              onChange={(e) => setForm((f) => ({ ...f, noreplyEmail: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Actual From address is MAIL_FROM_ADDRESS in server env.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Forgot password — page description</Label>
          <Textarea
            value={form.forgotBody}
            onChange={(e) => setForm((f) => ({ ...f, forgotBody: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Forgot password — success title</Label>
            <Input
              value={form.forgotTitle}
              onChange={(e) => setForm((f) => ({ ...f, forgotTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Forgot password — success message</Label>
            <Textarea
              value={form.forgotDescription}
              onChange={(e) => setForm((f) => ({ ...f, forgotDescription: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Contact form — success title</Label>
            <Input
              value={form.contactTitle}
              onChange={(e) => setForm((f) => ({ ...f, contactTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact form — success message</Label>
            <Textarea
              value={form.contactDescription}
              onChange={(e) => setForm((f) => ({ ...f, contactDescription: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Signup welcome email — subject</Label>
            <Input
              value={form.signupTitle}
              onChange={(e) => setForm((f) => ({ ...f, signupTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Signup welcome email — body</Label>
            <Textarea
              value={form.signupDescription}
              onChange={(e) => setForm((f) => ({ ...f, signupDescription: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save communications'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/contact-inbox">View contact inbox</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
