'use client';

import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ContactInboxReplyDialog } from '@/components/admin/contact-inbox-reply-dialog';
import type { ContactSubmissionRow } from '@/server/actions/settings-actions';
import { Calendar, Mail, Tag, User } from 'lucide-react';

function enquiryLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ContactInboxDetailDialog({
  submission,
  open,
  onOpenChange,
  onMarkRead,
  onReplied,
}: {
  submission: ContactSubmissionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkRead?: (id: string) => void;
  onReplied?: () => void;
}) {
  useEffect(() => {
    if (open && submission?.status === 'NEW' && onMarkRead) {
      onMarkRead(submission.id);
    }
  }, [open, submission, onMarkRead]);

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{submission.fullName}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 pt-1">
              <a
                href={`mailto:${submission.email}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
              >
                <Mail className="h-3.5 w-3.5" />
                {submission.email}
              </a>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={submission.status === 'NEW' ? 'default' : 'secondary'}>
            {submission.status}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Tag className="h-3 w-3" />
            {enquiryLabel(submission.enquiryType)}
          </Badge>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(submission.createdAt).toLocaleString()}
          </span>
        </div>

        <Separator />

        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            Message
          </p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{submission.message}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <ContactInboxReplyDialog
            submission={submission}
            onSent={() => {
              onReplied?.();
              onOpenChange(false);
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function truncateMessage(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}
