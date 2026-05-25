
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, Loader, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { reviewTutorApplicationAction, type TutorApplication } from '@/server/actions/admin-actions';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function TutorActions({ application }: { application: TutorApplication }) {
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleReview = (decision: 'APPROVED' | 'REJECTED') => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not signed in', description: 'Log in as admin to review applications.' });
            return;
        }
        startTransition(async () => {
            const idToken = await user.getIdToken();
            const result = await reviewTutorApplicationAction({
                idToken,
                tutorId: application.userId,
                decision,
            });
            if (result.success) {
                toast({
                    title: `Application ${decision.toLowerCase()}`,
                    description: `${application.displayName}'s status has been updated.`,
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

    const isApproved = application.approvalStatus === 'APPROVED';
    const isRejected = application.approvalStatus === 'REJECTED';

    return (
        <div className="flex gap-2 justify-end">
            {/* Approve / Re-approve button — shown when not already approved */}
            {!isApproved && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isPending}>
                            {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            {isRejected ? 'Re-approve' : 'Approve'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{isRejected ? 'Re-approve' : 'Approve'} tutor application?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will grant {application.displayName} full access to their tutor dashboard and make their profile visible in the marketplace.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                            <Button type="button" disabled={isPending} onClick={() => handleReview('APPROVED')}>
                                {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isRejected ? 'Re-approve' : 'Approve'}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Reject button — shown when not already rejected */}
            {!isRejected && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isPending}>
                            {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                            Reject
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reject tutor application?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {application.displayName} will lose access to their dashboard and receive a rejection email. You can re-approve later if needed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                            <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleReview('REJECTED')}>
                                {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Reject
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Both already decided — show inert label */}
            {isApproved && isRejected === false && (
                <span className="text-xs text-muted-foreground py-1">Approved</span>
            )}
        </div>
    );
}
