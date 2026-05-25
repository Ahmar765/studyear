'use client';

import { XCircle, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { logout as endServerSession } from '@/server/actions/auth-actions';
import { useRouter } from 'next/navigation';

export default function TutorRejectedPage() {
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Application not approved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>
            After reviewing your application, the StudYear team was unable to approve your tutor
            account at this time.
          </p>
          <p>
            If you believe this is a mistake, or would like to discuss your application further, please
            reach out to our team — we're happy to help.
          </p>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-left">
            <p className="font-medium text-foreground mb-2">Get in touch</p>
            <p>
              Email us at{' '}
              <a href="mailto:contact@studyear.com" className="text-primary underline underline-offset-4">
                contact@studyear.com
              </a>{' '}
              and include your registered email address:{' '}
              <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="mailto:contact@studyear.com">
                <Mail className="mr-2 h-4 w-4" />
                Appeal decision
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
