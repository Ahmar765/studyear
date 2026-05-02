
'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { startImpersonationAction } from '@/server/actions/admin-actions';
import { UserProfile } from '@/lib/firebase/services/user';
import { Loader } from 'lucide-react';

interface ImpersonationDialogProps {
  user: UserProfile;
  onSessionStart: () => void;
}

export default function ImpersonationDialog({ user, onSessionStart }: ImpersonationDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleImpersonate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const reason = formData.get('reason') as string;

        if (!reason || reason.length < 10) {
            toast({ variant: 'destructive', title: 'Reason required', description: 'Please provide a reason of at least 10 characters.' });
            return;
        }

        startTransition(async () => {
            const { success, customToken, impersonationLogId, error } = await startImpersonationAction(user.uid, reason);

            if (success && customToken && impersonationLogId) {
                toast({
                    title: 'Impersonation Session Starting',
                    description: `A new tab will open for user ${user.email}.`,
                });
                const impersonateUrl = `/auth/impersonate?token=${customToken}&logId=${impersonationLogId}&targetUid=${user.uid}`;
                window.open(impersonateUrl, '_blank');
                onSessionStart();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Failed to start session',
                    description: error,
                });
            }
        });
    }

    return (
        <DialogContent>
            <form onSubmit={handleImpersonate}>
                <DialogHeader>
                    <DialogTitle>View as {user.displayName}</DialogTitle>
                    <DialogDescription>
                        You are about to start a secure viewing session for this user. Provide a reason for auditing purposes.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="reason">Reason for session</Label>
                    <Textarea id="reason" name="reason" placeholder="e.g., Investigating user report of..." required />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <><Loader className="animate-spin mr-2"/>Starting...</> : 'Start Session'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
