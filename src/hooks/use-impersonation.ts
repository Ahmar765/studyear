
'use client';

import { useAuth } from './use-auth';
import { useState, useEffect } from 'react';

interface ImpersonationState {
  isImpersonating: boolean;
  adminUid: string | null;
}

export const useImpersonation = (): ImpersonationState => {
  const { user, loading } = useAuth();
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    adminUid: null,
  });

  useEffect(() => {
    if (loading) {
        return;
    }
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => { // Force refresh token
        const claims = idTokenResult.claims;
        const isCurrentlyImpersonating = sessionStorage.getItem('impersonationLogId') !== null;
        
        if (claims.impersonating === true && claims.adminUid && isCurrentlyImpersonating) {
          setState({
            isImpersonating: true,
            adminUid: claims.adminUid as string,
          });
        } else {
          // Clean up session storage if claims are not present but storage item is
          if (isCurrentlyImpersonating) {
              sessionStorage.removeItem('impersonationLogId');
              sessionStorage.removeItem('impersonationTargetUid');
          }
          setState({ isImpersonating: false, adminUid: null });
        }
      });
    } else {
      setState({ isImpersonating: false, adminUid: null });
    }
  }, [user, loading]);

  return state;
};
