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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  replyToContactSubmissionAction,
  type ContactSubmissionRow,
} from '@/server/actions/settings-actions';
import { Mail, Loader } from 'lucide-react';

function defaultSubject(row: ContactSubmissionRow): string {
  const type = row.enquiryType.replace(/_/g, ' ');
  return `Re: Your StudYear ${type} enquiry`;
}

export function ContactInboxReplyDialog({
  submission,
  onSent,
}: {
  submission: ContactSubmissionRow;
  onSent?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject(submission));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject(submission));
      setMessage('');
    }
  }, [open, submission]);

  const send = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await replyToContactSubmissionAction(token, {
        submissionId: submission.id,
        subject,
        message,
      });
      if (res.success) {
        toast({
          title: 'Reply sent',
          description: `Email sent to ${submission.email} from StudYear.`,
        });
        setOpen(false);
        onSent?.();
      } else {
        toast({ variant: 'destructive', title: 'Could not send reply', description: res.error });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reply to {submission.fullName}</DialogTitle>
          <DialogDescription>
            Sends to <strong>{submission.email}</strong> from StudYear support. If they reply, it goes to
            your contact inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground max-h-28 overflow-y-auto whitespace-pre-wrap">
            <p className="text-xs font-medium text-foreground mb-1">Original message</p>
            {submission.message}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reply-subject-${submission.id}`}>Subject</Label>
            <Input
              id={`reply-subject-${submission.id}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reply-body-${submission.id}`}>Your reply</Label>
            <Textarea
              id={`reply-body-${submission.id}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your response to the customer…"
              rows={6}
              disabled={saving}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={send}
            disabled={saving || !message.trim() || !subject.trim()}
          >
            {saving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
