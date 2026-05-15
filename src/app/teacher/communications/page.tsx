'use client';

import { SchoolTutorSubPage } from '@/components/school-tutor/school-tutor-sub-page';
import { Badge } from '@/components/ui/badge';
import { MessageSquareText, Sparkles } from 'lucide-react';

export default function TeacherCommunicationsPage() {
  return (
    <SchoolTutorSubPage
      title="Communications"
      description="AI-generated briefing notes and priority outreach for your cohort."
      icon={MessageSquareText}
    >
      {(data) => (
        <ul className="space-y-4">
          {data.aiInsights.map((insight) => (
            <li key={insight.id} className="school-panel rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <p className="font-medium">{insight.title}</p>
                <Badge
                  variant={
                    insight.severity === 'critical'
                      ? 'destructive'
                      : insight.severity === 'warning'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {insight.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{insight.message}</p>
            </li>
          ))}
          {data.aiInsights.length === 0 && (
            <p className="text-muted-foreground">
              No briefing insights yet — they appear when your school has live student activity.
            </p>
          )}
        </ul>
      )}
    </SchoolTutorSubPage>
  );
}
