'use client';

import { SchoolTutorSubPage } from '@/components/school-tutor/school-tutor-sub-page';
import { TeacherLiveClassroom } from '@/components/school-tutor/teacher-live-classroom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bot, Video } from 'lucide-react';

export default function TeacherClassroomPage() {
  return (
    <SchoolTutorSubPage
      title="Classroom"
      description="Launch live video lessons with your class, then review at-risk learners before you teach."
      icon={Video}
    >
      {(data) => (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/ai-tutor">
                <Bot className="mr-2 h-4 w-4" />
                Explain with AI
              </Link>
            </Button>
          </div>

          <TeacherLiveClassroom />

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
