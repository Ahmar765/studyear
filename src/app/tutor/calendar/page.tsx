import { TutorSubPage } from '@/components/tutor/tutor-sub-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

const LEGEND = [
  { color: 'bg-emerald-500', label: 'Confirmed' },
  { color: 'bg-amber-500', label: 'Pending' },
  { color: 'bg-red-500', label: 'Missed' },
  { color: 'bg-sky-500', label: 'AI-supported' },
];

export default function TutorCalendarPage() {
  return (
    <TutorSubPage
      title="Live calendar"
      description="Professional scheduling — availability, recurring lessons, and parent approvals."
      icon={Calendar}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {LEGEND.map((item) => (
          <Badge key={item.label} variant="outline" className="gap-2">
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </Badge>
        ))}
      </div>
      <Card className="tutor-panel min-h-[320px]">
        <CardHeader>
          <CardTitle className="text-base">Week view</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="rounded-lg border border-dashed p-8">
              {d}
              <p className="mt-2 text-[10px]">Drag sessions here</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </TutorSubPage>
  );
}
