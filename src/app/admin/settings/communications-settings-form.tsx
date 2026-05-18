'use client';

import { useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getSystemSettings, updateSystemSettingsAction } from '@/server/actions/settings-actions';
import type { SystemSettings } from '@/server/schemas/system-settings';
import { useState } from 'react';
import { Mail } from 'lucide-react';

export default function CommunicationsSettingsForm({
  initialSettings,
}: {
  initialSettings: SystemSettings;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const c = initialSettings.communications ?? {};

  const [form, setForm] = useState({
    supportEmail: c.supportEmail ?? 'support@studyear.ai',
    contactEmail: c.contactEmail ?? 'contact@studyear.ai',
    noreplyEmail: c.noreplyEmail ?? 'noreply@studyear.ai',
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
        toast({ title: 'Communications saved', description: 'User-facing messages and emails updated.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email & user messages
        </CardTitle>
        <CardDescription>
          Platform addresses and copy for forgot password, contact form, and signup toasts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <Label>Support email</Label>
            <Input
              value={form.supportEmail}
              onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact email (displayed)</Label>
            <Input
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>No-reply email</Label>
            <Input
              value={form.noreplyEmail}
              onChange={(e) => setForm((f) => ({ ...f, noreplyEmail: e.target.value }))}
            />
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
            <Label>Signup toast — title</Label>
            <Input
              value={form.signupTitle}
              onChange={(e) => setForm((f) => ({ ...f, signupTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Signup toast — message</Label>
            <Textarea
              value={form.signupDescription}
              onChange={(e) => setForm((f) => ({ ...f, signupDescription: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save communications'}
        </Button>
      </CardContent>
    </Card>
  );
}
