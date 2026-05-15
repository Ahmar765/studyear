import { TutorSubPage } from '@/components/tutor/tutor-sub-page';
import { Users } from 'lucide-react';

const STAGES = ['New enquiry', 'Trial', 'Active', 'At risk', 'Inactive', 'Premium'];

export default function TutorStudentsPage() {
  return (
    <TutorSubPage
      title="Student pipeline"
      description="CRM for leads, trials, active learners, and premium conversions."
      icon={Users}
    >
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((stage) => (
          <div key={stage} className="tutor-panel rounded-xl border p-4 min-h-[140px]">
            <p className="text-sm font-semibold">{stage}</p>
            <p className="mt-8 text-xs text-muted-foreground">Drop students here</p>
          </div>
        ))}
      </div>
    </TutorSubPage>
  );
}
