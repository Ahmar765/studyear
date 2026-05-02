
'use client';

import { createContext, useContext } from 'react';
import { AcuWallet } from '@/lib/firebase/services/wallet';

export interface AcuWalletContextType {
  wallet: AcuWallet | null;
  loading: boolean;
}

export const AcuWalletContext = createContext<AcuWalletContextType | undefined>(
  undefined
);

export const useAcuWallet = (): AcuWalletContextType => {
  const context = useContext(AcuWalletContext);
  if (context === undefined) {
    throw new Error('useAcuWallet must be used within an AcuWalletProvider');
  }
  return context;
};
