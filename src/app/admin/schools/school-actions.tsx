
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, Loader, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reviewSchoolAccountAction, type SchoolAccountData } from '@/server/actions/admin-actions';
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

export default function SchoolActions({ account }: { account: SchoolAccountData }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleReview = (decision: 'APPROVED' | 'REJECTED') => {
        startTransition(async () => {
            const result = await reviewSchoolAccountAction({ schoolId: account.id, decision });
            if (result.success) {
                toast({
                    title: `Account ${decision.toLowerCase()}`,
                    description: `${account.name}'s status has been updated.`,
                });
                router.refresh();
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: result.error,
                });
            }
        });
    }

    if (account.approvalStatus !== 'PENDING') {
        return null; // No actions needed if already reviewed
    }

    return (
        <div className="flex gap-2 justify-end">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isPending}>
                        {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Approve
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve School Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will grant admins from {account.name} access to the School Dashboard. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleReview('APPROVED')}>
                            Approve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isPending}>
                        {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Reject
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject School Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will mark the account as rejected. This cannot be easily undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleReview('REJECTED')}>
                            Reject
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
