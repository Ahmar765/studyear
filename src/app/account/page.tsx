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
import { useTransition, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { subscriptionTypeDisplayName } from '@/data/subscription-plans';
import { useAcuWallet } from '@/hooks/use-acu-wallet';
import { useImpersonation } from '@/hooks/use-impersonation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase/client-app';
import placeholderImages from '@/lib/placeholder-images.json';
import SystemVisual from '@/components/system-visual';
import Image from 'next/image';


export default function AccountPage() {
  const { user, logout } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { wallet, loading: walletLoading } = useAcuWallet();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isImpersonating } = useImpersonation();

  const isStudentLike =
    userProfile?.role === 'STUDENT' || userProfile?.role === 'PRIVATE_TUTOR';

  const loading = profileLoading || (!!userProfile && isStudentLike && walletLoading);

  useEffect(() => {
    if (searchParams.get('purchase') === 'success') {
      toast({
        title: 'Purchase successful',
        description:
          'Your ACU balance or subscription will update shortly. Refresh the page if you do not see changes.',
      });
      // Clean the URL
      router.replace('/account', { scroll: false });
    }
  }, [searchParams, toast, router]);


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
      case 'STUDENT':
      case 'PRIVATE_TUTOR':
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
        <Card className="overflow-hidden">
            <div className="relative h-48 w-full bg-muted">
                {userProfile.coverImageUrl ? (
                  <Image
                    src={userProfile.coverImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 896px) 100vw, 896px"
                    priority
                  />
                ) : (
                  <SystemVisual
                    module="accountHeader"
                    user_role={userProfile.role}
                    intent="control"
                    className="object-cover"
                    fill
                  />
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
                        <Link href="/profile-setup">
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
        
        <div className="grid md:grid-cols-2 gap-8">
            {isStudentLike ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fuel /> ACU wallet
                  </CardTitle>
                  <CardDescription>
                    AI Credit Units power tutor sessions, diagnostics, generated courses, and most AI tools.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{Number(wallet?.balance ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">ACUs available</p>
                </CardContent>
                <CardFooter>
                  <Button asChild>
                    <Link href="/checkout">
                      <PlusCircle className="mr-2 h-4 w-4" /> Top up ACUs
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Crown /> Subscription</CardTitle>
                    <CardDescription>
                      {isStudentLike
                        ? 'Optional Premium monthly plan — broader toolkit without per-feature ACU usage on included tools.'
                        : 'Your current StudYear plan. Manage upgrades via Stripe checkout.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{subscriptionTypeDisplayName(userProfile.subscription)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isStudentLike
                        ? 'Most students use ACUs only; Premium is optional.'
                        : 'Premium features unlock automatically when payment completes.'}
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild><Link href="/checkout"><PlusCircle className="mr-2 h-4 w-4"/> {isStudentLike ? 'Plans & top-up' : 'View plans'}</Link></Button>
                </CardFooter>
            </Card>
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
