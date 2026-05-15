import { getTutorPublicProfileAction } from '@/server/actions/tutor-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BookSessionForm } from './book-session-form';
import { BadgeCent, Bot, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';

export default async function TutorProfilePage({ params }: { params: { id: string } }) {
  const { tutor, error } = await getTutorPublicProfileAction(params.id);
  if (!tutor || error) notFound();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/tutors">← Back to marketplace</Link>
      </Button>

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

        <BookSessionForm tutorId={tutor.uid} defaultSubject={tutor.subjects[0]} />
      </div>
    </div>
  );
}
