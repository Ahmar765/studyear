'use client';

import { SchoolTutorSubPage } from '@/components/school-tutor/school-tutor-sub-page';
import { ClipboardList } from 'lucide-react';

export default function TeacherAssignmentsPage() {
  return (
    <SchoolTutorSubPage
      title="Assignment command centre"
      description="School assessments and student homework completion (live)."
      icon={ClipboardList}
    >
      {(data) => (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-semibold">School assessments</h2>
            {data.assessments.map((a) => (
              <div key={a.id} className="school-panel rounded-lg border p-4 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">{a.dueDate ? `Due ${a.dueDate}` : 'No due date'}</p>
              </div>
            ))}
            {data.assessments.length === 0 && <p className="text-muted-foreground">No assessments yet.</p>}
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">Homework snapshot</h2>
            <p className="text-3xl font-bold">{data.overview.homeworkCompletionPct}%</p>
            <p className="text-sm text-muted-foreground">Cohort completion rate from study tasks</p>
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
              {data.students
                .filter((s) => s.pendingHomework > 0)
                .map((s) => (
                  <li key={s.id} className="rounded border p-2">
                    {s.name} — {s.pendingHomework} pending
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}
    </SchoolTutorSubPage>
  );
}
