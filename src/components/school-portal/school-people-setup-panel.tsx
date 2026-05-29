'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, UserCog, UserPlus, Users, ArrowRight, KeyRound } from 'lucide-react';

type SchoolPeopleSetupPanelProps = {
  studentCount: number;
  staffCount: number;
};

export function SchoolPeopleSetupPanel({ studentCount, staffCount }: SchoolPeopleSetupPanelProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">People &amp; cohorts</h2>
          <p className="text-sm text-muted-foreground">
            Add teachers to your workspace, link students to your school roll, then assign year groups to
            each teacher.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Add teachers</CardTitle>
                  <CardDescription className="text-xs">Staff deployment hub</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {staffCount} linked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="font-medium text-foreground">Invite by email</strong> — teachers
                  accept on their Command Centre.
                </span>
              </li>
              <li className="flex gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="font-medium text-foreground">Share School Join Code</strong> — for
                  teachers who already have accounts.
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/school/staff">
                  Invite teachers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/school/settings">Join code in Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Add students</CardTitle>
                  <CardDescription className="text-xs">Student roster &amp; linking</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {studentCount} on roll
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Students need a StudYear account first, then are linked to your school to appear on
                  the roster.
                </span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  After linking, use <strong className="font-medium text-foreground">Staff → Assign
                  cohorts</strong> so each teacher sees the right classes.
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/school/students">
                  Manage student roster
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/school/onboarding?edit=1">Set year groups &amp; classes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
