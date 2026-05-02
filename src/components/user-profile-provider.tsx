
'use client';

import {useState, useEffect, ReactNode} from 'react';
import {UserProfileContext} from '@/hooks/use-user-profile';
import {useAuth} from '@/hooks/use-auth';
import {UserProfile, getUserProfile} from '@/lib/firebase/services/user';

export function UserProfileProvider({children}: {children: ReactNode}) {
  const {user, loading: authLoading} = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = getUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
      setLoading(false);
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    
  }, [user, authLoading]);

  return (
    <UserProfileContext.Provider value={{userProfile, loading}}>
      {children}
    </UserProfileContext.Provider>
  );
}
