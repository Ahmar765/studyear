'use client';

import { SchoolTutorSubPage } from '@/components/school-tutor/school-tutor-sub-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart } from 'lucide-react';

export default function TeacherAnalyticsPage() {
  return (
    <SchoolTutorSubPage
      title="Analytics"
      description="Cohort progress, risk distribution, and quiz performance (live)."
      icon={BarChart}
    >
      {(data) => (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="school-panel">
            <CardHeader>
              <CardTitle className="text-base">Cohort overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Average progress</p>
                <p className="text-3xl font-bold">{data.overview.avgProgress}%</p>
                <Progress value={data.overview.avgProgress} className="mt-2 h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">At risk</p>
                  <p className="text-2xl font-semibold text-red-600">{data.overview.atRiskCount}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Homework done</p>
                  <p className="text-2xl font-semibold">{data.overview.homeworkCompletionPct}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="school-panel">
            <CardHeader>
              <CardTitle className="text-base">Year groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.yearGroups.map((yg) => (
                <div key={yg.yearGroup}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{yg.yearGroup}</span>
                    <span className="text-muted-foreground">
                      {yg.count} students · {yg.avgProgress}%
                    </span>
                  </div>
                  <Progress value={yg.avgProgress} className="h-2" />
                </div>
              ))}
              {data.yearGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">No cohort data yet.</p>
              )}
            </CardContent>
          </Card>
          <Card className="school-panel lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Quiz activity (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                {data.students
                  .slice()
                  .sort((a, b) => b.avgQuizScore30d - a.avgQuizScore30d)
                  .map((s) => (
                    <li key={s.id} className="flex justify-between rounded border px-3 py-2">
                      <span>{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.avgQuizScore30d}% avg · {s.quizAttempts30d} attempts
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </SchoolTutorSubPage>
  );
}
