'use client';

import { SchoolTutorSubPage, SchoolPlaceholder } from '@/components/school-tutor/school-tutor-sub-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Video } from 'lucide-react';

export default function TeacherClassroomPage() {
  return (
    <SchoolTutorSubPage
      title="Classroom"
      description="Launch live teaching sessions and review at-risk learners before class."
      icon={Video}
    >
      {(data) => (
        <div className="space-y-6">
          <SchoolPlaceholder
            title="Live classroom"
            body="Connect your video provider to run synchronous lessons. Until then, use the AI Teaching Assistant for guided sessions."
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/ai-tutor">Open AI Teaching Assistant</Link>
            </Button>
          </div>
          <section className="space-y-3">
            <h2 className="font-semibold">Students to brief before session</h2>
            <ul className="space-y-2">
              {data.students
                .filter((s) => s.status !== 'on_track')
                .slice(0, 12)
                .map((s) => (
                  <li key={s.id} className="school-panel flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>{s.name}</span>
                    <Badge variant={s.status === 'critical' ? 'destructive' : 'secondary'}>{s.status}</Badge>
                  </li>
                ))}
              {data.students.filter((s) => s.status !== 'on_track').length === 0 && (
                <p className="text-muted-foreground">All students are on track this week.</p>
              )}
            </ul>
          </section>
        </div>
      )}
    </SchoolTutorSubPage>
  );
}
