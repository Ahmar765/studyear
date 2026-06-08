'use client';

import Link from 'next/link';
import { Suspense, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader, ShieldCheck, Check, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { getStripe } from '@/lib/stripe';
import { createCheckoutSession } from '@/server/actions/billing-actions';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useEffectiveRole } from '@/hooks/use-effective-role';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  PARENT_SUBSCRIPTION_PLANS,
  SCHOOL_SUBSCRIPTION_PLANS,
  STUDENT_SUBSCRIPTION_PLANS,
} from '@/data/subscription-plans';
import { ACU_PACKAGES } from '@/data/acu-packages';
import { Separator } from '@/components/ui/separator';
import {
  CheckoutDiscountCode,
  type AppliedDiscount,
} from '@/components/checkout/checkout-discount-code';
import { CheckoutDiscountBanner } from '@/components/checkout/checkout-discount-banner';
import { useCheckoutDiscount } from '@/hooks/use-checkout-discount';

function isStudentLikeRole(role: string | undefined): boolean {
  return role === 'STUDENT' || role === 'PRIVATE_TUTOR';
}

function AcuPackageCard({
  gbp,
  acus,
  baseAcus,
  bonusAcus,
  packLabel,
  popular,
  productCode,
  discountCode,
  appliedDiscountLabel,
}: {
  gbp: string;
  acus: number;
  baseAcus: number;
  bonusAcus: number;
  packLabel: string;
  popular: boolean;
  productCode: string;
  discountCode?: string | null;
  appliedDiscountLabel?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePurchase = () => {
    startTransition(async () => {
      const { success, sessionId, error } = await createCheckoutSession(
        productCode,
        user?.uid,
        user?.email ?? null,
        discountCode,
      );
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {packLabel} pack
        </p>
        <CardTitle className="text-4xl font-bold">
          {acus.toLocaleString()}{' '}
          <span className="text-2xl font-medium text-muted-foreground">ACUs</span>
        </CardTitle>
        <CardDescription className="space-y-1 pt-1">
          <span className="block text-base font-medium text-foreground">
            £{gbp}.00 one-time
          </span>
          {bonusAcus > 0 ? (
            <span className="block text-sm">
              {baseAcus.toLocaleString()} included +{' '}
              <span className="font-semibold text-primary">
                {bonusAcus.toLocaleString()} bonus
              </span>
            </span>
          ) : (
            <span className="block text-sm">{baseAcus.toLocaleString()} ACUs</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {appliedDiscountLabel ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <Tag className="h-4 w-4 shrink-0" />
            <span>
              Code <span className="font-mono font-medium">{discountCode}</span> — {appliedDiscountLabel} at Stripe
            </span>
          </div>
        ) : null}
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
  discountCode,
  appliedDiscountLabel,
}: {
  name: string;
  price: string;
  priceSuffix: string;
  productCode: string;
  features: string[];
  popular?: boolean;
  discountCode?: string | null;
  appliedDiscountLabel?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubscribe = () => {
    startTransition(async () => {
      const { success, sessionId, error } = await createCheckoutSession(
        productCode,
        user?.uid,
        user?.email ?? null,
        discountCode,
      );
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
        {appliedDiscountLabel ? (
          <Badge variant="secondary" className="mt-2 gap-1">
            <Tag className="h-3 w-3" />
            {discountCode} — {appliedDiscountLabel}
          </Badge>
        ) : null}
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

function buildAcuPackageCards() {
  return Object.values(ACU_PACKAGES).map((pkg) => ({
    gbp: (pkg.pricePence / 100).toString(),
    acus: pkg.totalACUs,
    baseAcus: pkg.baseACUs,
    bonusAcus: pkg.bonusACUs,
    packLabel: pkg.label,
    popular: pkg.code === 'CORE_BOOST',
    productCode: pkg.code,
  }));
}

function discountProps(applied: AppliedDiscount | null) {
  return {
    discountCode: applied?.code ?? null,
    appliedDiscountLabel: applied?.label ?? null,
  };
}

function CheckoutPageContent() {
  const { loading: profileLoading } = useUserProfile();
  const { role, tokenRoleResolved } = useEffectiveRole();
  const loading = profileLoading || !tokenRoleResolved;
  const { appliedDiscount, setAppliedDiscount } = useCheckoutDiscount();
  const discountCode = appliedDiscount?.code ?? null;
  const checkoutBottomPad = appliedDiscount ? 'pb-20' : '';

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

  const isParent = role === 'PARENT';
  const isSchoolTeacher = role === 'SCHOOL_TUTOR';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN';
  const isPlatformAdmin = role === 'ADMIN';
  const studentLike = isStudentLikeRole(role);

  if (isPlatformAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Platform administrator</CardTitle>
            <CardDescription>
              Admins have unlimited AI access — no personal ACU wallet or Stripe top-up is required.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/dashboard">Admin dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account">My account</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSchoolTeacher) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>School ACU wallet</CardTitle>
            <CardDescription>
              School teachers use AI credits from your institution&apos;s shared pool — not a personal top-up.
              Ask your school administrator to add ACUs from <strong>School → ACU command</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/account">View school balance</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/teacher/dashboard">Command Centre</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSchoolAdmin) {
    return (
      <div className={`flex-1 space-y-10 p-4 md:p-8 ${checkoutBottomPad}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">School subscription plans</h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Subscribe your institution through Stripe. Each plan includes a monthly shared ACU pool
            for all staff and students. Top up with additional ACU packs anytime.
          </p>
        </div>

        <CheckoutDiscountCode applied={appliedDiscount} onAppliedChange={setAppliedDiscount} />

        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {SCHOOL_SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard key={plan.productCode} {...plan} {...discountProps(appliedDiscount)} />
          ))}
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <Separator />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Top up your school ACU pool</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Need more AI credits mid-month? One-off packs are instantly added to your institution&apos;s shared wallet.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {buildAcuPackageCards().map((pkg) => (
              <AcuPackageCard key={pkg.productCode} {...pkg} {...discountProps(appliedDiscount)} />
            ))}
          </div>
        </div>

        <FooterNote subscriptions optionalAcu />
        {appliedDiscount ? (
          <CheckoutDiscountBanner applied={appliedDiscount} onClear={() => setAppliedDiscount(null)} />
        ) : null}
      </div>
    );
  }

  if (isParent) {
    return (
      <div className={`flex-1 space-y-8 p-4 md:p-8 ${checkoutBottomPad}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Parent subscriptions</h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Subscribe securely through Stripe to unlock the parent dashboard and linked-student insights.
          </p>
        </div>
        <CheckoutDiscountCode applied={appliedDiscount} onAppliedChange={setAppliedDiscount} />
        <div className="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PARENT_SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard key={plan.productCode} {...plan} {...discountProps(appliedDiscount)} />
          ))}
        </div>
        <FooterNote subscriptions />
        {appliedDiscount ? (
          <CheckoutDiscountBanner applied={appliedDiscount} onClear={() => setAppliedDiscount(null)} />
        ) : null}
      </div>
    );
  }

  const acuPackages = buildAcuPackageCards();

  return (
    <div className={`flex-1 space-y-10 p-4 md:p-8 ${checkoutBottomPad}`}>
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Top up your ACU wallet</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          One-off packs from <strong className="text-foreground">£3</strong> to{' '}
          <strong className="text-foreground">£30</strong> — ACUs power the AI tutor, diagnostics,
          planner, interactive lessons, predictions, and other metered tools. Premium unlocks tools;
          usage is always metered (no unlimited AI).
        </p>
      </div>

      <CheckoutDiscountCode applied={appliedDiscount} onAppliedChange={setAppliedDiscount} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-6xl mx-auto">
        {acuPackages.map((pkg) => (
          <AcuPackageCard key={pkg.productCode} {...pkg} {...discountProps(appliedDiscount)} />
        ))}
      </div>

      {studentLike ? (
        <div className="max-w-6xl mx-auto space-y-6">
          <Separator />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Student plans — monthly only
            </h2>
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
              <strong className="text-foreground">Child Free</strong> includes 100 ACUs every 3 months.
              Paid plans add monthly ACU allowances — from{' '}
              <strong className="text-foreground">£5 Student Access</strong> through to{' '}
              <strong className="text-foreground">£30 Student Max</strong> for daily heavy usage.
            </p>
          </div>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {STUDENT_SUBSCRIPTION_PLANS.map((plan) => (
              <SubscriptionCard key={plan.productCode} {...plan} {...discountProps(appliedDiscount)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          <Separator />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              School subscription plans
            </h2>
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
              Institutional plans for your school. Each plan includes a monthly shared ACU pool for all staff and students.
              ACU top-up packs above can also be used to supplement your pool at any time.
            </p>
          </div>
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6">
            {SCHOOL_SUBSCRIPTION_PLANS.map((plan) => (
              <SubscriptionCard key={plan.productCode} {...plan} {...discountProps(appliedDiscount)} />
            ))}
          </div>
        </div>
      )}

      <FooterNote subscriptions optionalAcu />
      {appliedDiscount ? (
        <CheckoutDiscountBanner applied={appliedDiscount} onClear={() => setAppliedDiscount(null)} />
      ) : null}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 space-y-8 p-4 md:p-8">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
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
