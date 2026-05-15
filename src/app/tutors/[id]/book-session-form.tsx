'use client';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { requestTutorSessionAction } from '@/server/actions/tutor-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BookSessionForm({ tutorId, defaultSubject }: { tutorId: string; defaultSubject?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [message, setMessage] = useState('');
  const [preferredAt, setPreferredAt] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const token = await user.getIdToken();
    const result = await requestTutorSessionAction(token, {
      tutorId,
      subject,
      message,
      preferredAt: preferredAt || undefined,
    });
    setLoading(false);
    if (result.success) {
      toast({
        title: 'Session requested',
        description: 'Your tutor will confirm shortly. Parents can track this on their dashboard.',
      });
    } else {
      toast({ variant: 'destructive', title: 'Request failed', description: result.error });
    }
  };

  return (
    <form id="book" onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6">
      <h3 className="text-lg font-semibold">Request a session</h3>
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="when">Preferred date/time</Label>
        <Input
          id="when"
          type="datetime-local"
          value={preferredAt}
          onChange={(e) => setPreferredAt(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="message">Message to tutor</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Goals, exam board, availability…"
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Sending…' : 'Send booking request'}
      </Button>
    </form>
  );
}
