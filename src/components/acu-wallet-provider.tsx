'use client';

import { useState, useEffect, ReactNode, useCallback } from 'react';
import { AcuWalletContext } from '@/hooks/use-acu-wallet';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useEffectiveRole } from '@/hooks/use-effective-role';
import { AcuWallet, getAcuWallet } from '@/lib/firebase/services/wallet';
import { getSchoolAcuPoolForTeacherAction } from '@/server/actions/teacher-actions';
import { Timestamp } from 'firebase/firestore';

export function AcuWalletProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { role: effectiveRole, tokenRoleResolved } = useEffectiveRole();
  const [wallet, setWallet] = useState<AcuWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const isSchoolStaff =
    tokenRoleResolved &&
    (userProfile?.role === 'SCHOOL_TUTOR' ||
      userProfile?.role === 'SCHOOL_ADMIN' ||
      effectiveRole === 'SCHOOL_TUTOR' ||
      effectiveRole === 'SCHOOL_ADMIN');

  const loadSchoolPool = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await getSchoolAcuPoolForTeacherAction(token);
    const balance = res.success ? Number(res.balance ?? 0) : 0;
    const now = Timestamp.now();
    setWallet({
      id: res.linked ? `school-pool-${user.uid}` : user.uid,
      userId: user.uid,
      balance,
      locked: false,
      ownerType: 'SCHOOL',
      createdAt: now,
      updatedAt: now,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading || (user && !tokenRoleResolved) || (user && profileLoading)) {
      setLoading(true);
      return;
    }

    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    if (isSchoolStaff) {
      setLoading(true);
      void loadSchoolPool();
      const interval = setInterval(() => void loadSchoolPool(), 45_000);
      return () => clearInterval(interval);
    }

    setLoading(true);
    const unsubscribe = getAcuWallet(user.uid, (walletData) => {
      setWallet(walletData);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading, profileLoading, tokenRoleResolved, isSchoolStaff, loadSchoolPool]);

  return (
    <AcuWalletContext.Provider value={{ wallet, loading }}>
      {children}
    </AcuWalletContext.Provider>
  );
}
