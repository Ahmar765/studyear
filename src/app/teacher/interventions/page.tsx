'use client';

import { SchoolTutorSubPage } from '@/components/school-tutor/school-tutor-sub-page';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TeacherInterventionsPage() {
  return (
    <SchoolTutorSubPage
      title="Interventions"
      description="Live intervention plans from your school leadership."
      icon={Target}
    >
      {(data) => (
        <ul className="space-y-3">
          {data.interventions.map((i) => (
            <li key={i.id} className="school-panel rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{i.title}</p>
                <Badge variant={i.status === 'ACTIVE' ? 'default' : 'secondary'}>{i.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{i.studentName}</p>
              <p className="mt-2 text-sm">{i.notes || 'No notes'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}
              </p>
            </li>
          ))}
          {data.interventions.length === 0 && (
            <p className="text-muted-foreground">No interventions recorded for your school.</p>
          )}
        </ul>
      )}
    </SchoolTutorSubPage>
  );
}
