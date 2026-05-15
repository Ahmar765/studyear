'use client';

import type { SchoolRiskAlert } from '@/types/school-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const severityVariant = {
  info: 'outline' as const,
  warning: 'secondary' as const,
  critical: 'destructive' as const,
};

export function SchoolRiskPanel({ alerts }: { alerts: SchoolRiskAlert[] }) {
  return (
    <Card className="school-ops-panel border-red-500/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Live Risk Intelligence
          </CardTitle>
          <CardDescription>AI-detected academic and operational risk signals</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/school/alerts">War room</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <p className="font-medium text-sm">{a.title}</p>
              <Badge variant={severityVariant[a.severity]}>{a.severity}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
