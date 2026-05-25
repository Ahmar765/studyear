'use client';

import { Clock, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { logout as endServerSession } from '@/server/actions/auth-actions';
import { useRouter } from 'next/navigation';

export default function TutorPendingPage() {
  const { user, logout: firebaseLogout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!user) return;
    const sessionId = sessionStorage.getItem('sessionId');
    try {
      await endServerSession(user.uid, sessionId);
    } catch {
      // ignore
    }
    await firebaseLogout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-lg w-full text-center shadow-lg">
        <CardHeader className="space-y-4 pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Application under review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>
            Thank you for completing your tutor profile. Your application has been submitted and is
            currently being reviewed by the <strong className="text-foreground">StudYear team</strong>.
          </p>
          <p>
            This typically takes <strong className="text-foreground">1–2 business days</strong>. You'll
            receive an email at{' '}
            <span className="font-medium text-foreground">{user?.email}</span> as soon as a decision has
            been made.
          </p>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-left space-y-2">
            <p className="font-medium text-foreground">While you wait you can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your inbox for the confirmation email</li>
              <li>Prepare your session materials</li>
              <li>
                Contact us at{' '}
                <a href="mailto:contact@studyear.com" className="text-primary underline underline-offset-4">
                  contact@studyear.com
                </a>{' '}
                if you have questions
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <a href="mailto:contact@studyear.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact support
              </a>
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
