
'use client';

import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/use-auth';
import { endImpersonationAction } from '@/server/actions/admin-actions';
import { useToast } from '@/hooks/use-toast';

export default function ImpersonationBanner() {
    const { user } = useAuth();
    const { toast } = useToast();

    const handleExit = async () => {
        const logId = sessionStorage.getItem('impersonationLogId');
        if (!logId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find impersonation session ID.' });
            return;
        }

        // Clean up session storage immediately for a faster UI response
        sessionStorage.removeItem('impersonationLogId');
        sessionStorage.removeItem('impersonationTargetUid');

        try {
            // This is a fire-and-forget call to the backend to log the session end.
            // The user will be signed out on the client regardless of the outcome.
            await endImpersonationAction(logId);
            toast({ title: 'Session Ended', description: 'You have exited the "View as User" session.' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error ending session on backend', description: error.message });
        } finally {
            // Close the window to return to the admin's original tab.
            window.close();
            // As a fallback if the window doesn't close, sign out and redirect.
            await auth.signOut();
            window.location.href = '/login';
        }
    };
    
    if (!user) return null;

    return (
        <div className="sticky top-0 z-50 flex w-full items-center justify-center gap-x-6 bg-yellow-500 px-6 py-2.5 sm:px-3.5">
            <div className="flex items-center gap-2 text-sm leading-6 text-yellow-900">
                <ShieldAlert className="h-5 w-5" />
                <p>
                    <strong className="font-semibold">Viewing as User:</strong>
                    <span className="ml-1">{user.email}</span>
                </p>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleExit}
                className="h-7 bg-yellow-100/50 text-yellow-900 hover:bg-yellow-100"
            >
                <LogOut className="mr-2 h-4 w-4" /> Exit Session
            </Button>
        </div>
    );
}
