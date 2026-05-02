import { Suspense } from 'react';
import ResourceBrowser from './resource-browser';
import { Skeleton } from '@/components/ui/skeleton';

function Loading() {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResourceBrowser />
    </Suspense>
  );
}
