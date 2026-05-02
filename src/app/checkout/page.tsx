
'use client';

import { useState, useTransition } from 'react';
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
import { ACU_PACKAGES } from '@/data/acu-packages';
import { PLAN_ENTITLEMENTS } from '@/data/entitlements';
import { SubscriptionType } from '@/server/schemas';

const parentPlans = [
    {
        name: 'Parent Pro',
        price: '9.99',
        priceSuffix: '/ month',
        productCode: 'sub_parent_pro',
        features: ['Parent Dashboard Access', 'Child Progress View', 'Weekly Email Summaries'],
        popular: true,
    },
    {
        name: 'Parent Pro Plus',
        price: '19.99',
        priceSuffix: '/ month',
        productCode: 'sub_parent_pro_plus',
        features: ['All Pro features', 'Real-time Smart Alerts', 'Behaviour & Engagement Insights', 'Includes 1,650 ACUs per month'],
        popular: false,
    }
];

function AcuPackageCard({ gbp, acus, popular, productCode }: { gbp: string; acus: number; popular: boolean; productCode: string }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const { user } = useAuth();

    const handlePurchase = () => {
        startTransition(async () => {
            const { success, sessionId, error } = await createCheckoutSession(productCode, user?.uid);

            if (!success || !sessionId) {
                toast({ variant: 'destructive', title: 'Error', description: error || 'Could not initiate checkout.' });
                return;
            }

            const stripe = await getStripe();
            if (!stripe) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Stripe is not available.' });
                return;
            }

            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
            if (stripeError) {
                 toast({ variant: 'destructive', title: 'Stripe Error', description: stripeError.message });
            }
        });
    }

    return (
        <Card className={popular ? "border-primary" : ""}>
            <CardHeader className="text-center">
                {popular && <p className="font-semibold text-primary mb-2">Most Popular</p>}
                <CardTitle className="text-4xl font-bold">{acus.toLocaleString()} <span className="text-2xl font-medium text-muted-foreground">ACUs</span></CardTitle>
                <CardDescription>For £{gbp}.00 GBP</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={handlePurchase} disabled={isPending || !user}>
                    {isPending ? <Loader className="animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    {isPending ? 'Processing...' : 'Purchase Now'}
                </Button>
            </CardContent>
        </Card>
    );
}

function SubscriptionCard({ name, price, priceSuffix, productCode, features, popular }: { name: string; price: string; priceSuffix: string; productCode: string; features: string[]; popular: boolean; }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const { user } = useAuth();

    const handlePurchase = () => {
        startTransition(async () => {
            const { success, sessionId, error } = await createCheckoutSession(productCode, user?.uid);
            if (!success || !sessionId) {
                toast({ variant: 'destructive', title: 'Error', description: error || 'Could not initiate checkout.' });
                return;
            }
            const stripe = await getStripe();
            if (!stripe) return;
            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
            if (stripeError) toast({ variant: 'destructive', title: 'Stripe Error', description: stripeError.message });
        });
    };

    return (
        <Card className={cn("flex flex-col", popular ? "border-primary" : "")}>
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
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handlePurchase} disabled={isPending || !user}>
                    {isPending ? <Loader className="animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    {isPending ? 'Processing...' : 'Subscribe Now'}
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
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    const acuPackages = Object.values(ACU_PACKAGES).map(pkg => ({
        gbp: (pkg.pricePence / 100).toString(),
        acus: pkg.totalACUs,
        popular: pkg.code === 'GROWTH',
        productCode: pkg.code,
    }));

    const isParent = userProfile?.role === 'PARENT';
    const title = isParent ? "Upgrade to Parent Pro" : "Top Up Your Wallet";
    const description = isParent ? "Unlock powerful tools to monitor and support your child's academic journey." : "Purchase AI Credit Units (ACUs) to power your learning experience. £5 gives a student roughly 10-15 hours of AI-supported study.";

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
             <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    {description}
                </p>
            </div>

            {isParent ? (
                 <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                    {parentPlans.map(plan => (
                        <SubscriptionCard key={plan.productCode} {...plan} />
                    ))}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {acuPackages.map(pkg => (
                        <AcuPackageCard key={pkg.gbp} {...pkg} />
                    ))}
                </div>
            )}
            
             <div className="text-center text-muted-foreground text-sm max-w-md mx-auto mt-8">
                <p className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    Secure payments processed by Stripe. Your card details are never stored on our servers.
                </p>
            </div>
        </div>
    )
}
