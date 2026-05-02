
import { Suspense } from 'react';
import { getStudentProgressAction } from '@/server/actions/progress-actions';
import { auth } from 'firebase-admin'; // Using admin auth for server-side user
import ProgressClientPage from './progress-client';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/server/lib/auth';

async function ProgressData() {
    const user = await getCurrentUser();
    if (!user) {
        // This should be handled by middleware, but as a safeguard
        return <ProgressClientPage initialChartData={[]} />;
    }
    const chartData = await getStudentProgressAction(user.uid);
    return <ProgressClientPage initialChartData={chartData} />;
}

function Loading() {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    <Skeleton className="h-96 w-full" />
                </div>
                <div className="lg:col-span-3">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        </div>
    )
}

export default function ProgressPage() {
    return (
        <Suspense fallback={<Loading />}>
            <ProgressData />
        </Suspense>
    );
}
