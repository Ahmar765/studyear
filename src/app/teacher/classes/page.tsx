'use client';

import { SchoolTutorSubPage } from '@/components/school-tutor/school-tutor-sub-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';

export default function TeacherClassesPage() {
  return (
    <SchoolTutorSubPage
      title="My classes"
      description="Students in your assigned year groups (school admin sets cohorts under Staff deployment). Empty assignment shows all school students."
      icon={Users}
    >
      {(data) => (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.yearGroups.map((yg) => (
            <Card key={yg.yearGroup} className="school-panel">
              <CardHeader>
                <CardTitle className="text-base">{yg.yearGroup}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{yg.count} students</p>
                <Progress value={yg.avgProgress} className="mt-2 h-2" />
                <p className="mt-1 text-xs">Avg progress {yg.avgProgress}%</p>
              </CardContent>
            </Card>
          ))}
          {data.yearGroups.length === 0 && (
            <p className="text-muted-foreground">No year groups with enrolled students yet.</p>
          )}
        </div>
      )}
    </SchoolTutorSubPage>
  );
}
