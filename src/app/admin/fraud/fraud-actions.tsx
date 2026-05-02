
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader, ShieldAlert, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dismissUserFlagAction, suspendUserAction } from '@/server/actions/admin-actions';
import { UserProfile } from '@/lib/firebase/services/user';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function FraudActions({ user }: { user: UserProfile }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleAction = (action: 'suspend' | 'dismiss') => {
        startTransition(async () => {
            const result = action === 'suspend'
                ? await suspendUserAction(user.uid)
                : await dismissUserFlagAction(user.uid);

            if (result.success) {
                toast({
                    title: `Action Successful`,
                    description: `User ${user.email} has been ${action === 'suspend' ? 'suspended' : 'cleared'}.`,
                });
                router.refresh();
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Action Failed',
                    description: result.error,
                });
            }
        });
    }

    return (
        <div className="flex gap-2 justify-end">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isPending}>
                        {isPending ? <Loader className="animate-spin" /> : <XCircle />}
                        Suspend
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Suspend User Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will immediately disable the user's account, preventing them from logging in. This action can be reversed later. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleAction('suspend')}>
                            Suspend User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="secondary" size="sm" disabled={isPending}>
                        {isPending ? <Loader className="animate-spin" /> : <CheckCircle />}
                        Dismiss Flag
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Dismiss Fraud Flag?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will remove the flag from the user's account. The user will no longer appear in this list unless flagged again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('dismiss')}>
                            Dismiss Flag
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
