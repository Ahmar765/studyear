'use client';

import type { SchoolAcuSnapshot } from '@/types/school-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function SchoolAcuPanel({ acu }: { acu: SchoolAcuSnapshot }) {
  const burnPct = acu.balance > 0 ? Math.min(100, Math.round((acu.consumed7d / (acu.balance + acu.consumed7d)) * 100)) : 0;

  return (
    <Card className="school-ops-panel border-violet-500/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-violet-600" />
            ACU command centre
          </CardTitle>
          <CardDescription>Live AI consumption infrastructure</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/checkout">Top up ACUs</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/school/acu">Full view</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold tabular-nums">{acu.balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">7-day burn</p>
            <p className="text-2xl font-bold tabular-nums">{acu.consumed7d.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Daily rate</p>
            <p className="text-2xl font-bold tabular-nums">{acu.dailyBurnRate}</p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>Consumption intensity</span>
            <span>{burnPct}%</span>
          </div>
          <Progress value={burnPct} className="h-2" />
        </div>
        {acu.predictedDaysRemaining !== null && (
          <p className="text-sm text-muted-foreground">
            Predicted runway: <strong>{acu.predictedDaysRemaining} days</strong> at current burn
          </p>
        )}
        <p className="rounded-lg border bg-violet-500/5 p-3 text-sm">{acu.recommendation}</p>
      </CardContent>
    </Card>
  );
}
