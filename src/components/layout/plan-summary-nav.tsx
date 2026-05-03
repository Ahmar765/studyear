'use client';

import { Button } from '@/components/ui/button';
import { Crown, Fuel, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { subscriptionTypeDisplayName } from '@/data/subscription-plans';
import { useEffectiveRole } from '@/hooks/use-effective-role';
import { useAcuWallet } from '@/hooks/use-acu-wallet';

/** Student-style accounts pay per AI use via ACU wallet; parents use subscriptions. */
function usesAcuBilling(role: string): boolean {
  return role === 'STUDENT' || role === 'PRIVATE_TUTOR';
}

export default function PlanSummaryNav() {
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { role: effectiveRole } = useEffectiveRole();
  const { wallet, loading: walletLoading } = useAcuWallet();

  const acuMode = usesAcuBilling(effectiveRole);
  const loading = profileLoading || (acuMode && walletLoading);

  if (loading) {
    return <Skeleton className="h-9 w-44" />;
  }

  if (!userProfile) return null;

  if (acuMode) {
    const balance = Number(wallet?.balance ?? 0);
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm font-medium">
          <Fuel className="h-4 w-4 shrink-0 text-primary" />
          <span>{balance.toLocaleString()} ACUs</span>
        </div>
        <Button asChild size="sm">
          <Link href="/checkout">
            <PlusCircle className="mr-2 h-4 w-4" />
            Top up
          </Link>
        </Button>
      </div>
    );
  }

  const tierLabel = subscriptionTypeDisplayName(userProfile.subscription);
  const isPaid = userProfile.subscription && userProfile.subscription !== 'FREE';

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm font-medium">
        <Crown className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate max-w-[10rem] sm:max-w-none">{tierLabel}</span>
      </div>
      <Button asChild size="sm">
        <Link href="/checkout">
          <PlusCircle className="mr-2 h-4 w-4" />
          {isPaid ? 'Plans' : 'Upgrade'}
        </Link>
      </Button>
    </div>
  );
}
