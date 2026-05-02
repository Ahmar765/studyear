
'use client';
import { useAcuWallet } from '@/hooks/use-acu-wallet';
import { Button } from '@/components/ui/button';
import { Fuel, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function AcuBalance() {
    const { wallet, loading } = useAcuWallet();

    if (loading) {
        return <Skeleton className="h-9 w-44" />;
    }
    
    if (!wallet) return null;

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm font-medium">
                <Fuel className="h-4 w-4 text-accent" />
                <span>{wallet.balance.toLocaleString()} ACUs</span>
            </div>
            <Button asChild size="sm">
                <Link href="/checkout">
                    <PlusCircle className="mr-2 h-4 w-4" /> Top Up
                </Link>
            </Button>
        </div>
    );
}
