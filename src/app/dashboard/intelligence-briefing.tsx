
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Lightbulb, BrainCircuit, Target, ArrowRight, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDashboardRecommendationsAction } from '@/server/actions/dashboard-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Recommendation {
  title: string;
  reason: string;
}

interface RecommendationsState {
    status: 'LOADING' | 'READY' | 'PROFILE_INCOMPLETE' | 'DIAGNOSTIC_REQUIRED';
    recommendations: Recommendation[];
    savedAt?: string | null;
    fromCache?: boolean;
}

function formatSavedAt(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export default function IntelligenceBriefing() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<RecommendationsState>({ status: 'LOADING', recommendations: [] });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({
        status: 'READY',
        recommendations: [{
          title: 'Sign in required',
          reason: 'Sign in to see personalized insights.',
        }],
        savedAt: null,
        fromCache: false,
      });
      return;
    }

    let cancelled = false;
    setState({ status: 'LOADING', recommendations: [] });

    getDashboardRecommendationsAction({ userId: user.uid, regenerate: false })
      .then((result) => {
        if (cancelled) return;
        setState({
          status: result.status,
          recommendations: result.recommendations,
          savedAt: result.savedAt ?? null,
          fromCache: result.fromCache,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to fetch dashboard recommendations:', error);
        setState({
          status: 'READY',
          recommendations: [{
            title: 'Error fetching insights',
            reason: 'An unexpected error occurred. Please try again later.',
          }],
          savedAt: null,
          fromCache: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  function load(regenerate: boolean) {
    if (!user) return;
    if (regenerate) {
      setRefreshing(true);
    }

    getDashboardRecommendationsAction({ userId: user.uid, regenerate })
      .then((result) => {
        setState({
          status: result.status,
          recommendations: result.recommendations,
          savedAt: result.savedAt ?? null,
          fromCache: result.fromCache,
        });
      })
      .catch((error) => {
        console.error('Failed to fetch dashboard recommendations:', error);
        setState({
          status: 'READY',
          recommendations: [{
            title: 'Error fetching insights',
            reason: 'An unexpected error occurred. Please try again later.',
          }],
          savedAt: null,
          fromCache: false,
        });
      })
      .finally(() => {
        setRefreshing(false);
      });
  }

  const renderContent = () => {
    switch (state.status) {
        case 'LOADING':
            return (
                <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-6 w-3/4 mt-2" />
                    <Skeleton className="h-4 w-full" />
                </div>
            );

        case 'PROFILE_INCOMPLETE':
            return (
                 <Alert>
                    <Target className="h-4 w-4" />
                    <AlertTitle>{state.recommendations[0].title}</AlertTitle>
                    <AlertDescription>
                        {state.recommendations[0].reason}
                         <Button asChild variant="link" className="p-0 h-auto ml-1"><Link href="/profile-setup">Go to Profile Setup <ArrowRight className="h-4 w-4 ml-1"/></Link></Button>
                    </AlertDescription>
                </Alert>
            );

        case 'DIAGNOSTIC_REQUIRED':
             return (
                 <Alert>
                    <Target className="h-4 w-4" />
                    <AlertTitle>{state.recommendations[0].title}</AlertTitle>
                    <AlertDescription>
                         {state.recommendations[0].reason}
                         <Button asChild variant="link" className="p-0 h-auto ml-1"><Link href="/assessment">Start My Diagnostic <ArrowRight className="h-4 w-4 ml-1"/></Link></Button>
                    </AlertDescription>
                </Alert>
            );

        case 'READY':
            if (state.recommendations.length === 0) {
                 return (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No New Insights</AlertTitle>
                        <AlertDescription>
                        The system has no new insights for you at this time. Keep up the great work!
                        </AlertDescription>
                    </Alert>
                );
            }
            return (
                <Accordion type="single" collapsible className="w-full">
                    {state.recommendations.map((rec, index) => (
                    <AccordionItem value={`item-${index}`} key={`${rec.title}-${index}`}>
                        <AccordionTrigger>
                        <span className="flex items-center gap-2 text-left"><Lightbulb className="h-4 w-4 shrink-0"/> {rec.title}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                        {rec.reason}
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
            );
        default:
            return null;
    }
  };

  const savedLabel = formatSavedAt(state.savedAt);
  const showRegenerate =
    user &&
    !authLoading &&
    state.status === 'READY' &&
    state.recommendations.length > 0 &&
    state.recommendations[0].title !== 'Sign in required' &&
    state.recommendations[0].title !== 'Error fetching insights';

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="text-primary" />
              Intelligence Briefing
            </CardTitle>
            <CardDescription>
              System-generated insights to optimize your progress.
              {savedLabel ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {state.fromCache ? 'Showing saved briefing' : 'Briefing saved'}
                  {' · '}
                  {savedLabel}
                </span>
              ) : null}
            </CardDescription>
          </div>
          {showRegenerate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              disabled={refreshing || state.status === 'LOADING'}
              onClick={() => { load(true); }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={refreshing ? 'opacity-70 pointer-events-none transition-opacity' : ''}>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
