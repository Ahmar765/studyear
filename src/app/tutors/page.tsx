import { Suspense } from 'react';
import { getTutorListingsAction } from '@/server/actions/tutor-actions';
import { MarketplaceFilters, TutorMarketplaceGrid } from '@/components/tutor/marketplace-grid';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    subject?: string;
    maxPrice?: string;
    ai?: string;
    exam?: string;
    top?: string;
  };
}) {
  const { tutors, error } = await getTutorListingsAction({
    query: searchParams.q,
    subject: searchParams.subject,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    aiOnly: searchParams.ai === '1',
    examSpecialist: searchParams.exam === '1',
    topRated: searchParams.top === '1',
  });

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <header className="space-y-3">
        <Badge variant="outline" className="border-sky-500/40 text-sky-700 dark:text-sky-300">
          <Sparkles className="mr-1 h-3 w-3" />
          StudYear Academic Network
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Find your perfect tutor</h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse verified tutors like Airbnb meets Superprof — AI-enabled specialists, real ratings, and instant
          booking requests.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
        <MarketplaceFilters />
      </Suspense>

      {error && <p className="text-destructive">{error}</p>}
      <TutorMarketplaceGrid tutors={tutors} />
    </div>
  );
}
