'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ChildSnapshot } from '@/types/parent-dashboard';
import { resourceMetadata, type ResourceType } from '@/data/academic';
import { BookOpen, Bookmark, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ResourceIcon({ type }: { type: string }) {
  const key = type.toUpperCase() as ResourceType;
  const Icon = resourceMetadata[key]?.icon ?? BookOpen;
  return <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function LiveSubjectsPanel({ child }: { child: ChildSnapshot }) {
  const subjects = child.subjects ?? [];

  return (
    <Card className="parent-panel">
      <CardHeader>
        <CardTitle className="text-base">Live subjects</CardTitle>
        <CardDescription>
          From profile & quiz activity
          {child.dashboardUpdatedAt && (
            <span className="block text-xs">
              Dashboard synced {formatDistanceToNow(new Date(child.dashboardUpdatedAt), { addSuffix: true })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subjects on this profile yet. Ask your child to complete profile setup and diagnostics.
          </p>
        ) : (
          <ul className="space-y-4">
            {subjects.map((subject) => (
              <li key={subject.name} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{subject.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {subject.momentum >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span className={subject.momentum >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                      {subject.momentum >= 0 ? '+' : ''}
                      {subject.momentum}% momentum
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {subject.currentGrade && <Badge variant="outline">Current: {subject.currentGrade}</Badge>}
                  <Badge variant="secondary">Target: {subject.targetGrade}</Badge>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Quiz progress</span>
                    <span className="font-medium">{subject.progressPercent}%</span>
                  </div>
                  <Progress value={subject.progressPercent} className="h-2" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SavedResourcesPanel({ child }: { child: ChildSnapshot }) {
  const resources = child.savedResources ?? [];

  return (
    <Card className="parent-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="h-4 w-4" />
          Saved resources
        </CardTitle>
        <CardDescription>Live from your child&apos;s library — updates when they save new work</CardDescription>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved resources yet.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {resources.map((resource) => (
              <li
                key={resource.id}
                className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <ResourceIcon type={resource.type} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{resource.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {resourceMetadata[resource.type.toUpperCase() as ResourceType]?.title ?? resource.type} ·{' '}
                    {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
