import { TutorSubPage } from '@/components/tutor/tutor-sub-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PoundSterling } from 'lucide-react';

export default function TutorEarningsPage() {
  return (
    <TutorSubPage
      title="Earnings & analytics"
      description="Forecasting, churn prediction, peak booking times, and AI usage revenue."
      icon={PoundSterling}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {['Earnings forecast', 'Student churn risk', 'Peak booking times'].map((title) => (
          <Card key={title} className="tutor-panel">
            <CardHeader>
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-24 text-xs text-muted-foreground">Analytics sync from sessions & payouts</CardContent>
          </Card>
        ))}
      </div>
    </TutorSubPage>
  );
}
