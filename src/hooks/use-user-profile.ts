'use client';

import {createContext, useContext} from 'react';
import {UserProfile} from '@/lib/firebase/services/user';

export interface UserProfileContextType {
  userProfile: UserProfile | null;
  loading: boolean;
}

export const UserProfileContext = createContext<
  UserProfileContextType | undefined
>(undefined);

export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
