'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Fuel, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { subscriptionTypeDisplayName } from '@/data/subscription-plans';
import { useEffectiveRole } from '@/hooks/use-effective-role';
import { useAcuWallet } from '@/hooks/use-acu-wallet';
import { useAuth } from '@/hooks/use-auth';
import { getSchoolAcuPoolForTeacherAction } from '@/server/actions/teacher-actions';

/** Student-style accounts pay per AI use via ACU wallet; parents use subscriptions. */
function usesAcuBilling(role: string): boolean {
  return role === 'STUDENT' || role === 'PRIVATE_TUTOR';
}

export default function PlanSummaryNav() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { role: effectiveRole } = useEffectiveRole();
  const { wallet, loading: walletLoading } = useAcuWallet();
  const [schoolBalance, setSchoolBalance] = useState<number | null>(null);

  const acuMode = usesAcuBilling(effectiveRole);
  const schoolPoolMode = effectiveRole === 'SCHOOL_TUTOR';
  const loading =
    profileLoading ||
    (acuMode && walletLoading) ||
    (schoolPoolMode && schoolBalance === null);

  useEffect(() => {
    if (!user || !schoolPoolMode) return;
    void (async () => {
      const token = await user.getIdToken();
      const res = await getSchoolAcuPoolForTeacherAction(token);
      setSchoolBalance(res.success ? (res.balance ?? 0) : 0);
    })();
  }, [user, schoolPoolMode]);

  if (loading) {
    return <Skeleton className="h-9 w-44" />;
  }

  if (!userProfile) return null;

  const isPlatformAdmin =
    effectiveRole === 'ADMIN' || userProfile.subscription === 'ADMIN';

  if (isPlatformAdmin) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm font-medium">
        <Crown className="h-4 w-4 shrink-0 text-primary" />
        <span>Platform Admin</span>
      </div>
    );
  }

  if (schoolPoolMode) {
    const balance = Number(schoolBalance ?? 0);
    return (
      <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm font-medium">
        <Fuel className="h-4 w-4 shrink-0 text-primary" />
        <span>{balance.toLocaleString()} school ACUs</span>
      </div>
    );
  }

  if (acuMode) {
    const balance = Number(wallet?.balance ?? 0);
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm font-medium">
          <Fuel className="h-4 w-4 shrink-0 text-primary" />
          <span>{balance.toLocaleString()} ACUs</span>
        </div>
        <Button asChild size="sm">
          <Link href="/top-up">
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
