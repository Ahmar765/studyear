'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function SchoolInsightSnapshot({ insights }: { insights: string[] }) {
  return (
    <Card className="school-ops-panel border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-amber-600" />
          School insight snapshot
        </CardTitle>
        <CardDescription>AI analysis from live cohort data</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-amber-600">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
