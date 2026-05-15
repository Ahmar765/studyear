'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { TutorListingCard } from '@/types/tutor-dashboard';
import { BadgeCent, Bot, Sparkles, Star, TrendingUp } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function MarketplaceFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [subject, setSubject] = useState(params.get('subject') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');
  const [aiOnly, setAiOnly] = useState(params.get('ai') === '1');
  const [examSpecialist, setExamSpecialist] = useState(params.get('exam') === '1');
  const [topRated, setTopRated] = useState(params.get('top') === '1');

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (subject) next.set('subject', subject);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (aiOnly) next.set('ai', '1');
    if (examSpecialist) next.set('exam', '1');
    if (topRated) next.set('top', '1');
    router.push(`/tutors?${next.toString()}`);
  };

  return (
    <form onSubmit={apply} className="space-y-4 rounded-xl border bg-card/80 p-4 backdrop-blur">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="q">Search</Label>
          <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or subject" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="maxPrice">Max £/hr</Label>
          <Input id="maxPrice" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="mt-1" />
        </div>
        <div className="flex flex-col justify-end gap-3 pt-6 md:pt-0">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={aiOnly} onCheckedChange={(v) => setAiOnly(v === true)} />
            AI-enabled tutor
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={examSpecialist} onCheckedChange={(v) => setExamSpecialist(v === true)} />
            Exam specialist
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={topRated} onCheckedChange={(v) => setTopRated(v === true)} />
            Top rated (4.8+)
          </label>
        </div>
      </div>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}

export function TutorMarketplaceCard({ tutor }: { tutor: TutorListingCard }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-xl">
      <CardHeader className="flex-row items-start gap-4 pb-2">
        <Avatar className="h-16 w-16 border-2 border-amber-500/20">
          <AvatarImage src={tutor.profileImageUrl} />
          <AvatarFallback>{tutor.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg leading-tight">{tutor.name}</CardTitle>
          {tutor.headline && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{tutor.headline}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1 tabular-nums">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {tutor.rating} ({tutor.reviewCount})
            </Badge>
            <Badge variant="outline" className="gap-1">
              <BadgeCent className="h-3.5 w-3.5" />£{tutor.hourlyRate ?? '—'}/hr
            </Badge>
            {tutor.aiEnabled && (
              <Badge className="gap-1 bg-sky-600">
                <Bot className="h-3 w-3" /> AI
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{tutor.bio || 'Professional StudYear tutor.'}</p>
        {tutor.improvementClaim && (
          <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Students improved average by {tutor.improvementClaim}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {tutor.subjects.slice(0, 4).map((s) => (
            <Badge key={s} variant="outline" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {tutor.badges.map((b) => (
            <Badge key={b} variant="secondary" className="text-[10px]">
              {b}
            </Badge>
          ))}
        </div>
        {tutor.availabilityLabel && (
          <p className="text-xs text-muted-foreground">Availability: {tutor.availabilityLabel}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="w-full">
          <Link href={`/tutors/${tutor.uid}`}>View profile</Link>
        </Button>
        <Button variant="secondary" asChild className="w-full">
          <Link href={`/tutors/${tutor.uid}#book`}>
            <Sparkles className="mr-2 h-4 w-4" />
            {tutor.instantBooking ? 'Book session' : 'Request session'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TutorMarketplaceGrid({ tutors }: { tutors: TutorListingCard[] }) {
  if (tutors.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
        <p className="text-lg font-semibold">No tutors match your filters</p>
        <p className="mt-2 text-sm">Try broadening subject or price range.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tutors.map((tutor) => (
        <TutorMarketplaceCard key={tutor.uid} tutor={tutor} />
      ))}
    </div>
  );
}
