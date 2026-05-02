
'use client';

import { useState, useEffect, ReactNode } from 'react';
import { AcuWalletContext } from '@/hooks/use-acu-wallet';
import { useAuth } from '@/hooks/use-auth';
import { AcuWallet, getAcuWallet } from '@/lib/firebase/services/wallet';

export function AcuWalletProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<AcuWallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = getAcuWallet(user.uid, (walletData) => {
      setWallet(walletData);
      setLoading(false);
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    
  }, [user, authLoading]);

  return (
    <AcuWalletContext.Provider value={{ wallet, loading }}>
      {children}
    </AcuWalletContext.Provider>
  );
}
