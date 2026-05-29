'use client';

import { useAuth } from '@/hooks/use-auth';
import { getTutorPublicProfileAction } from '@/server/actions/tutor-actions';
import type { TutorListingCard } from '@/types/tutor-dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookSessionForm } from './book-session-form';
import { BadgeCent, Bot, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

export function TutorProfileView({ tutorId }: { tutorId: string }) {
  const { user } = useAuth();
  const [tutor, setTutor] = useState<TutorListingCard | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = user ? await user.getIdToken() : null;
        const result = await getTutorPublicProfileAction(tutorId, token);
        if (cancelled) return;
        if (result.tutor) {
          setTutor(result.tutor);
          setIsPreview(result.isPreview === true);
        } else {
          setError(result.error ?? 'Tutor not found');
        }
      } catch {
        if (!cancelled) setError('Could not load tutor profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tutorId, user]);

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/tutors">← Back to marketplace</Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Tutor not found</AlertTitle>
          <AlertDescription>{error ?? 'This profile is not available.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/tutors">← Back to marketplace</Link>
      </Button>

      {isPreview && (
        <Alert>
          <AlertTitle>Preview only</AlertTitle>
          <AlertDescription>
            Your marketplace listing goes live after StudYear approves your tutor application.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 border-2 border-amber-500/30">
              <AvatarImage src={tutor.profileImageUrl} />
              <AvatarFallback className="text-2xl">{tutor.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{tutor.name}</h1>
              {tutor.headline && <p className="mt-2 text-lg text-muted-foreground">{tutor.headline}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  {tutor.rating} · {tutor.reviewCount} reviews
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <BadgeCent className="h-4 w-4" />£{tutor.hourlyRate}/hr
                </Badge>
                {tutor.aiEnabled && (
                  <Badge className="gap-1 bg-sky-600">
                    <Bot className="h-4 w-4" /> AI-enabled sessions
                  </Badge>
                )}
              </div>
              {tutor.improvementClaim && (
                <p className="mt-3 flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  Students improved average by {tutor.improvementClaim}
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-2 text-muted-foreground">{tutor.bio}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Subjects & levels</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {tutor.subjects.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
              {tutor.levels.map((l) => (
                <Badge key={l} variant="secondary">
                  {l}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tutor.badges.map((b) => (
              <Badge key={b}>{b}</Badge>
            ))}
          </div>
        </div>

        {!isPreview ? (
          <BookSessionForm tutorId={tutor.uid} defaultSubject={tutor.subjects[0]} />
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Booking opens once your profile is approved on the marketplace.
          </div>
        )}
      </div>
    </div>
  );
}
