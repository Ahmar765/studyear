
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { Loader } from 'lucide-react';

export default function ImpersonatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const logId = searchParams.get('logId');
    const targetUid = searchParams.get('targetUid');

    if (!token || !logId || !targetUid) {
      setError('Missing token or log ID for impersonation session.');
      return;
    }

    signInWithCustomToken(getFirebaseAuth(), token)
      .then((userCredential) => {
        // The custom token automatically signs the user in.
        // We now store the log ID to manage the session state.
        sessionStorage.setItem('impersonationLogId', logId);
        sessionStorage.setItem('impersonationTargetUid', targetUid);
        
        // After successful sign-in, redirect to the dashboard.
        router.replace('/');
      })
      .catch((err) => {
        console.error("Impersonation sign-in failed:", err);
        setError(`Failed to start session: ${err.message}`);
      });
  }, [searchParams, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader className="h-12 w-12 animate-spin text-primary" />
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <p className="text-muted-foreground">Starting secure viewing session...</p>
      )}
    </div>
  );
}
