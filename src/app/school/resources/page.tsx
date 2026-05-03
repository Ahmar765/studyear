'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, PlusCircle, Search, Bookmark, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiles = [
  {
    title: 'Create a resource',
    description: 'Generate quizzes, flashcards, visuals, and more with AI.',
    href: '/create',
    icon: PlusCircle,
  },
  {
    title: 'Find resources',
    description: 'Search the public library by subject, level, and topic.',
    href: '/search',
    icon: Search,
  },
  {
    title: 'Saved resources',
    description: 'Open resources you or your students have bookmarked.',
    href: '/saved-resources',
    icon: Bookmark,
  },
];

export default function SchoolResourcesPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Shared Resources</h2>
        <p className="text-muted-foreground">
          Curate learning materials using the same creation and discovery tools as students — ideal for
          whole-school consistency.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.href} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <t.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{t.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <CardDescription>{t.description}</CardDescription>
              <Button asChild className="w-full gap-2">
                <Link href={t.href}>
                  Open <ExternalLink className="h-4 w-4 opacity-70" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookCopy className="h-5 w-5" />
            School resource library
          </CardTitle>
          <CardDescription>
            Central catalogue views can be extended later with school-only collections. For now, use
            Create / Search / Saved to manage materials your institution promotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Tip: align subjects with your cohort structure in student profiles so recommendations stay
            consistent across diagnostics and planners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
