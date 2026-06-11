'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, UserCog, Users, ArrowRight } from 'lucide-react';

type SchoolPeopleSetupPanelProps = {
  studentCount: number;
  staffCount: number;
};

export function SchoolPeopleSetupPanel({ studentCount, staffCount }: SchoolPeopleSetupPanelProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">People management</h2>
          <p className="text-sm text-muted-foreground">
            Add teachers and students, assign classes, and manage your school roll — all in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="tabular-nums">
            <UserCog className="mr-1 h-3 w-3" />
            {staffCount} staff
          </Badge>
          <Badge variant="secondary" className="tabular-nums">
            <GraduationCap className="mr-1 h-3 w-3" />
            {studentCount} students
          </Badge>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Teachers &amp; students</CardTitle>
              <CardDescription className="text-xs">
                Invite teachers, link students, assign cohorts — one page
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/school/people">
              Open people management
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/school/people#teachers">Add teachers</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/school/people#students">Add students</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
