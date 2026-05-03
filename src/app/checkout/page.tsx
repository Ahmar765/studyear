
'use client';

import { useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader, ShieldCheck, Check } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getStripe } from '@/lib/stripe';
import { createCheckoutSession } from '@/server/actions/billing-actions';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  PARENT_SUBSCRIPTION_PLANS,
  STUDENT_SUBSCRIPTION_PLANS,
} from '@/data/subscription-plans';
import { ACU_PACKAGES } from '@/data/acu-packages';
import { Separator } from '@/components/ui/separator';

function isStudentLikeRole(role: string | undefined): boolean {
  return role === 'STUDENT' || role === 'PRIVATE_TUTOR';
}

function AcuPackageCard({
  gbp,
  acus,
  popular,
  productCode,
}: {
  gbp: string;
  acus: number;
  popular: boolean;
  productCode: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePurchase = () => {
    startTransition(async () => {
      const { success, sessionId, error } = await createCheckoutSession(productCode, user?.uid);
      if (!success || !sessionId) {
        toast({ variant: 'destructive', title: 'Error', description: error || 'Could not start checkout.' });
        return;
      }
      const stripe = await getStripe();
      if (!stripe) {
        toast({ variant: 'destructive', title: 'Error', description: 'Stripe could not be loaded.' });
        return;
      }
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) {
        toast({ variant: 'destructive', title: 'Stripe error', description: stripeError.message });
      }
    });
  };

  return (
    <Card className={popular ? 'border-primary' : ''}>
      <CardHeader className="text-center">
        {popular && <p className="font-semibold text-primary mb-2">Most popular</p>}
        <CardTitle className="text-4xl font-bold">
          {acus.toLocaleString()}{' '}
          <span className="text-2xl font-medium text-muted-foreground">ACUs</span>
        </CardTitle>
        <CardDescription>For £{gbp}.00 GBP</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handlePurchase} disabled={isPending || !user}>
          {isPending ? <Loader className="animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          {isPending ? 'Processing…' : 'Purchase now'}
        </Button>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  name,
  price,
  priceSuffix,
  productCode,
  features,
  popular,
}: {
  name: string;
  price: string;
  priceSuffix: string;
  productCode: string;
  features: string[];
  popular: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubscribe = () => {
    startTransition(async () => {
      const { success, sessionId, error } = await createCheckoutSession(productCode, user?.uid);
      if (!success || !sessionId) {
        toast({ variant: 'destructive', title: 'Error', description: error || 'Could not start Stripe checkout.' });
        return;
      }
      const stripe = await getStripe();
      if (!stripe) {
        toast({ variant: 'destructive', title: 'Error', description: 'Stripe could not be loaded.' });
        return;
      }
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) {
        toast({ variant: 'destructive', title: 'Stripe error', description: stripeError.message });
      }
    });
  };

  return (
    <Card className={cn('flex flex-col', popular ? 'border-primary' : '')}>
      <CardHeader className="text-center">
        {popular && <p className="font-semibold text-primary mb-2">Recommended</p>}
        <CardTitle className="text-3xl font-bold">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold">£{price}</span>
          <span className="text-muted-foreground">{priceSuffix}</span>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSubscribe} disabled={isPending || !user}>
          {isPending ? <Loader className="animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          {isPending ? 'Redirecting…' : 'Subscribe with Stripe'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function CheckoutPage() {
  const { userProfile, loading } = useUserProfile();

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const isParent = userProfile?.role === 'PARENT';
  const studentLike = isStudentLikeRole(userProfile?.role);

  if (isParent) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Parent subscriptions</h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Subscribe securely through Stripe to unlock the parent dashboard and linked-student insights.
          </p>
        </div>
        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {PARENT_SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard key={plan.productCode} {...plan} />
          ))}
        </div>
        <FooterNote subscriptions />
      </div>
    );
  }

  if (studentLike) {
    const acuPackages = Object.values(ACU_PACKAGES).map((pkg) => ({
      gbp: (pkg.pricePence / 100).toString(),
      acus: pkg.totalACUs,
      popular: pkg.code === 'GROWTH',
      productCode: pkg.code,
    }));

    return (
      <div className="flex-1 space-y-10 p-4 md:p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Top up your ACU wallet</h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Student accounts use AI Credit Units (ACUs) for AI tutor, diagnostics, courses, and more.
            Buy a pack below — your balance updates after payment.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {acuPackages.map((pkg) => (
            <AcuPackageCard key={pkg.productCode} {...pkg} />
          ))}
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <Separator />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Optional: Premium monthly</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Unlock the full premium toolkit without paying ACUs per feature on included tools.
              Most students only need ACU top-ups above.
            </p>
          </div>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8">
            {STUDENT_SUBSCRIPTION_PLANS.map((plan) => (
              <SubscriptionCard key={plan.productCode} {...plan} />
            ))}
          </div>
        </div>

        <FooterNote subscriptions optionalAcu />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Billing</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose a subscription plan for your organisation account.
        </p>
      </div>
      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {STUDENT_SUBSCRIPTION_PLANS.map((plan) => (
          <SubscriptionCard key={plan.productCode} {...plan} />
        ))}
      </div>
      <FooterNote subscriptions />
    </div>
  );
}

function FooterNote({
  subscriptions,
  optionalAcu,
}: {
  subscriptions?: boolean;
  optionalAcu?: boolean;
}) {
  return (
    <div className="text-center text-muted-foreground text-sm max-w-lg mx-auto mt-8 space-y-2">
      <p className="flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
        Secure payments processed by Stripe.
      </p>
      {subscriptions ? (
        <p>
          {optionalAcu
            ? 'ACU packs are one-time payments. Subscriptions renew monthly until cancelled.'
            : 'Subscriptions renew monthly until you cancel in the Stripe customer portal.'}
        </p>
      ) : null}
    </div>
  );
}
