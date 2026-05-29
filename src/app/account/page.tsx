'use client';

import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Loader, Edit, LayoutDashboard, KeyRound, Trash2, Crown, PlusCircle, AlertTriangle, Fuel } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTransition, useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { subscriptionTypeDisplayName } from '@/data/subscription-plans';
import { useAcuWallet } from '@/hooks/use-acu-wallet';
import { useImpersonation } from '@/hooks/use-impersonation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase/client-app';
import Image from 'next/image';
import { Suspense } from 'react';
import {
  finalizeAcuCheckoutSessionAction,
  finalizeSubscriptionCheckoutSessionAction,
} from '@/server/actions/billing-actions';
import ParentLinkCodeCard from '@/components/student/parent-link-code-card';
import { isDisplayableImageUrl } from '@/lib/format-safe-date';
import { getSchoolAcuPoolForTeacherAction } from '@/server/actions/teacher-actions';


function AccountPageInner() {
  const { user, loading: authLoading, logout } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { wallet, loading: walletLoading } = useAcuWallet();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isImpersonating } = useImpersonation();
  const checkoutFinalizedRef = useRef<string | null>(null);

  const isStudentLike =
    userProfile?.role === 'STUDENT' || userProfile?.role === 'PRIVATE_TUTOR';
  const isParent = userProfile?.role === 'PARENT';
  const isSchoolAdmin = userProfile?.role === 'SCHOOL_ADMIN';
  const isSchoolTeacher = userProfile?.role === 'SCHOOL_TUTOR';
  const usesSchoolAcuPool = isSchoolAdmin || isSchoolTeacher;
  const [schoolPool, setSchoolPool] = useState<{
    linked: boolean;
    schoolName?: string;
    balance?: number;
  } | null>(null);
  const isPlatformAdmin =
    userProfile?.role === 'ADMIN' || userProfile?.subscription === 'ADMIN';

  const loading =
    profileLoading ||
    (!!userProfile && (isStudentLike || isParent) && walletLoading) ||
    (!!userProfile && usesSchoolAcuPool && schoolPool === null);

  useEffect(() => {
    if (!user || !usesSchoolAcuPool) return;
    void (async () => {
      const token = await user.getIdToken();
      const res = await getSchoolAcuPoolForTeacherAction(token);
      if (res.success) {
        setSchoolPool({
          linked: res.linked ?? false,
          schoolName: res.schoolName,
          balance: res.balance,
        });
      } else {
        setSchoolPool({ linked: false, balance: 0 });
      }
    })();
  }, [user, usesSchoolAcuPool]);

  useEffect(() => {
    if (searchParams.get('purchase') !== 'success') return;
    if (authLoading) return;
    if (!user) return;
    if (userProfile?.role === 'ADMIN' || userProfile?.subscription === 'ADMIN') {
      router.replace('/account');
      return;
    }

    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      toast({
        title: 'Purchase successful',
        description:
          'Your ACU balance or subscription will update shortly. Refresh the page if you do not see changes.',
      });
      router.replace('/account', { scroll: false });
      return;
    }

    if (checkoutFinalizedRef.current === sessionId) return;
    checkoutFinalizedRef.current = sessionId;

    let cancelled = false;

    void (async () => {
      try {
        const token = await user.getIdToken();
        const subResult = await finalizeSubscriptionCheckoutSessionAction(token, sessionId);
        const acuResult = await finalizeAcuCheckoutSessionAction(token, sessionId);
        if (cancelled) return;

        if (subResult.ok && subResult.activated) {
          toast({
            title: 'Subscription active',
            description:
              'Your plan is now active. Refresh once if something still looks locked.',
          });
        } else if (!subResult.ok) {
          toast({
            variant: 'destructive',
            title: 'Could not confirm subscription',
            description: subResult.error,
          });
        }

        if (acuResult.ok && !acuResult.skipped) {
          toast({
            title: acuResult.duplicate ? 'Payment already recorded' : 'Top-up complete',
            description: acuResult.duplicate
              ? 'Your ACU balance is already up to date.'
              : 'Your ACU balance has been updated.',
          });
        } else if (!acuResult.ok) {
          toast({
            variant: 'destructive',
            title: 'Could not confirm ACU top-up',
            description:
              acuResult.error ??
              'If you were charged but do not see ACUs, refresh shortly or contact support with your Stripe receipt.',
          });
        }

        if (
          subResult.ok &&
          subResult.skipped &&
          acuResult.ok &&
          acuResult.skipped
        ) {
          toast({
            title: 'Purchase successful',
            description:
              'If nothing updated yet, wait a minute for Stripe webhooks or confirm your price IDs in .env.',
          });
        }
      } catch {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Could not confirm checkout',
            description:
              'Refresh the page. If your plan is still missing, contact support with your Stripe receipt.',
          });
        }
      } finally {
        if (!cancelled) {
          router.replace('/account', { scroll: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, user, authLoading, userProfile, toast, router]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null; // Or redirect to login
  }

  const handleDeleteAccount = async () => {
    if (isImpersonating) {
        toast({ variant: 'destructive', title: 'Action Disabled', description: 'Cannot delete account during an impersonation session.' });
        return;
    }

    startTransition(async () => {
        try {
            const user = getFirebaseAuth().currentUser;
            if (!user) {
                throw new Error('You must be logged in to delete your account.');
            }
            
            const userForDeletion = user;
            const uid = userForDeletion.uid;

            // 1. Delete user from Firestore
            await deleteDoc(doc(getFirestoreDb(), 'users', uid));
            
            // 2. Delete user from Firebase Auth
            await deleteUser(userForDeletion);
            
            // 3. The onAuthStateChanged listener in AuthProvider will handle the rest.
            await logout();

            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted.",
            });

        } catch (error: any) {
            let errorMessage = error.message;
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'This operation is sensitive and requires a recent login. Please log in again before deleting your account.';
            }
            toast({
                variant: "destructive",
                title: "Error Deleting Account",
                description: errorMessage,
            });
        }
    });
  }

  const getDashboardLink = () => {
    switch (userProfile.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SCHOOL_ADMIN':
        return '/school/dashboard';
      case 'SCHOOL_TUTOR':
        return '/teacher/dashboard';
      case 'PARENT':
        return '/parent/dashboard';
      case 'PRIVATE_TUTOR':
        return '/tutor/dashboard';
      case 'STUDENT':
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-start space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Account</h2>
        <p className="text-muted-foreground max-w-2xl">
          View your account details, manage your settings, and top up your credits.
        </p>
      </div>
        {isImpersonating && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Impersonation Mode Active</AlertTitle>
                <AlertDescription>
                    Sensitive actions like deleting accounts or changing passwords are disabled.
                </AlertDescription>
            </Alert>
        )}
      <div className='max-w-4xl mx-auto space-y-8'>
        {isStudentLike ? <ParentLinkCodeCard id="parent-link-code" /> : null}

        <Card className="overflow-hidden">
            <div className="relative h-48 w-full bg-muted">
                {isDisplayableImageUrl(userProfile.coverImageUrl) ? (
                  <Image
                    src={userProfile.coverImageUrl!}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 896px) 100vw, 896px"
                    priority
                    unoptimized={
                      userProfile.coverImageUrl!.startsWith('data:') ||
                      userProfile.coverImageUrl!.startsWith('blob:')
                    }
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/30 via-muted to-violet-600/20" aria-hidden />
                )}
            </div>
            <CardContent className="relative p-6">
                <Avatar className="h-24 w-24 border-4 border-background absolute -top-12">
                    <AvatarImage src={userProfile.profileImageUrl ?? ''} />
                    <AvatarFallback>
                        <UserIcon className="h-12 w-12" />
                    </AvatarFallback>
                </Avatar>
                <div className="pt-14">
                    <CardTitle className="text-2xl">{userProfile.name || 'User'}</CardTitle>
                    <CardDescription>{userProfile.email}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-6">
                    <Button asChild className="w-full sm:w-auto">
                        <Link
                          href={
                            userProfile.role === 'PRIVATE_TUTOR'
                              ? '/tutor/onboarding?edit=1'
                              : '/profile-setup'
                          }
                        >
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href={getDashboardLink()}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> View Dashboard
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto" disabled={isImpersonating}>
                        <Link href="/account/change-password">
                        <KeyRound className="mr-2 h-4 w-4" /> Change Password
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        <div className={`grid gap-8 ${isPlatformAdmin ? '' : 'md:grid-cols-2'}`}>
            {(isStudentLike || isParent) && !isPlatformAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fuel /> ACU wallet
                  </CardTitle>
                  <CardDescription>
                    {isParent
                      ? 'ACUs power AI Parent Advisor, intervention mode, and other AI tools on your Command Centre.'
                      : 'AI Credit Units power tutor sessions, diagnostics, generated courses, and most AI tools.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{Number(wallet?.balance ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">ACUs available</p>
                </CardContent>
                <CardFooter>
                  {isParent ? (
                    <Button asChild variant="outline">
                      <Link href="/checkout">
                        <PlusCircle className="mr-2 h-4 w-4" /> Parent plans & ACUs
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link href="/top-up">
                        <PlusCircle className="mr-2 h-4 w-4" /> Top up ACUs
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ) : null}
            {usesSchoolAcuPool && !isPlatformAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fuel /> School ACU pool
                  </CardTitle>
                  <CardDescription>
                    {schoolPool?.linked
                      ? isSchoolAdmin
                        ? `Shared wallet for ${schoolPool.schoolName ?? 'your school'}. Top up with the same £5 / £10 / £15 packs as students — credits land in this pool for all staff and students.`
                        : `Shared wallet for ${schoolPool.schoolName ?? 'your school'}. AI tools debit this balance — contact your school admin to top up.`
                      : isSchoolAdmin
                        ? 'Complete school onboarding to activate your workspace ACU pool.'
                        : 'Link your school from the Command Centre to use the shared ACU pool.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {Number(schoolPool?.balance ?? 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">ACUs available (school pool)</p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  {isSchoolAdmin ? (
                    <Button asChild>
                      <Link href="/top-up">
                        <PlusCircle className="mr-2 h-4 w-4" /> Top up school ACUs
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link href={isSchoolAdmin ? '/school/dashboard' : '/teacher/dashboard'}>
                      Command Centre
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}
            {!isPlatformAdmin ? (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Crown /> Subscription</CardTitle>
                    <CardDescription>
                      {isSchoolAdmin
                        ? 'School workspace ACUs power AI across your cohort. Top up with the same £5 / £10 / £15 packs as students, or add Premium for creator tools.'
                        : isStudentLike
                          ? 'Premium (£10/mo) unlocks creator tools; many AI features still spend ACUs. Premium Plus includes a monthly ACU bundle on each paid renewal.'
                          : isParent
                            ? 'Parent plans are billed in GBP (£). Pro+ and Elite unlock AI advisor, intervention mode, and monthly ACU bundles.'
                            : 'Your current StudYear plan. Manage upgrades via Stripe checkout.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{subscriptionTypeDisplayName(userProfile.subscription)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isStudentLike
                        ? 'Top up ACUs anytime from Plans & top-up — Premium Plus adds ACUs automatically when Stripe bills successfully.'
                        : isParent
                          ? 'Upgrade from checkout — Parent Elite includes family intelligence and live alerts.'
                          : 'Premium features unlock automatically when payment completes.'}
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                      <Link href="/checkout">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {isStudentLike || isParent ? 'Plans & top-up' : 'View plans'}
                      </Link>
                    </Button>
                </CardFooter>
            </Card>
            ) : (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Crown /> Platform access</CardTitle>
                    <CardDescription>Internal administrator — unlimited AI tools, no billing or ACU wallet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">Platform Admin</p>
                    <p className="text-sm text-muted-foreground mt-1">Manage users, content, and platform settings from the admin dashboard.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline"><Link href="/admin/dashboard">Open admin dashboard</Link></Button>
                </CardFooter>
            </Card>
            )}
        </div>

        <Card className="border-destructive/50 max-w-4xl mx-auto mt-8">
              <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={isPending || isImpersonating}>
                              <Trash2 className="mr-2 h-4 w-4" /> {isPending ? "Deleting..." : "Delete My Account"}
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your
                              account and remove your data from our servers.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                              Continue
                          </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-xs text-muted-foreground mt-2">Permanently delete your account and all associated data.</p>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AccountPageInner />
    </Suspense>
  );
}
