'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Gift, Loader, TrendingUp, Users } from 'lucide-react';
import { getGrowthPartnerDashboardAction } from '@/server/actions/growth-partner-actions';
import {
  GROWTH_PARTNER_PROGRAMME,
  GROWTH_PARTNER_PUBLIC_COPY,
} from '@/data/growth-partner-programme';

type DashboardData = NonNullable<
  Awaited<ReturnType<typeof getGrowthPartnerDashboardAction>>['data']
>;

export function GrowthPartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const token = await user.getIdToken();
        const result = await getGrowthPartnerDashboardAction(token);
        if (result.error || !result.data) {
          setError(result.error ?? 'Could not load dashboard.');
        } else {
          setData(result.data);
        }
      } catch {
        setError('Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const copyLink = async () => {
    if (!data?.referralUrl) return;
    await navigator.clipboard.writeText(data.referralUrl);
    toast({ title: 'Link copied', description: 'Share it with families, tutors, or schools.' });
  };

  const copyCode = async () => {
    if (!data?.profile.referralCode) return;
    await navigator.clipboard.writeText(data.profile.referralCode);
    toast({ title: 'Code copied', description: data.profile.referralCode });
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <PublicHero />
        <Card>
          <CardHeader>
            <CardTitle>Sign in to get your referral link</CardTitle>
            <CardDescription>
              Create a free account, then return here to copy your personal Growth Partner link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">{error ?? 'Something went wrong.'}</p>;
  }

  const { profile, tierLabel } = data;
  const rules = GROWTH_PARTNER_PROGRAMME;
  const referralsToGrowth =
    rules.growthReferrer.requiredSuccessfulReferrals -
    (profile.successfulPaidReferrals ?? 0);

  return (
    <div className="space-y-8">
      <PublicHero compact />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Successful paid referrals"
          value={String(profile.successfulPaidReferrals ?? 0)}
        />
        <StatCard
          icon={Gift}
          label="Pending ACU rewards"
          value={String(data.pendingAcus)}
        />
        <StatCard
          icon={TrendingUp}
          label="Payable commission"
          value={`£${data.payableCommissionGbp.toFixed(2)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Pending commission"
          value={`£${data.pendingCommissionGbp.toFixed(2)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Your referral link</CardTitle>
            <Badge variant="secondary">{tierLabel}</Badge>
          </div>
          <CardDescription>
            {GROWTH_PARTNER_PROGRAMME.positioning}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={data.referralUrl} className="font-mono text-sm" />
            <Button type="button" variant="outline" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Code:
            <button
              type="button"
              className="font-mono font-medium text-foreground underline-offset-2 hover:underline"
              onClick={copyCode}
            >
              {profile.referralCode}
            </button>
          </div>
          {profile.tier === 'STANDARD_REFERRER' && referralsToGrowth > 0 && (
            <p className="text-sm text-muted-foreground">
              {referralsToGrowth} more successful paid referral
              {referralsToGrowth === 1 ? '' : 's'} to unlock Growth Referrer status (
              {rules.growthReferrer.commissionRate * 100}% net eligible revenue).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <RulesCard title="Standard referral rewards">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              {rules.standardReferrer.acusPerPaidReferral} ACUs when a referred user spends at
              least £{rules.standardReferrer.minimumReferralSpendGbp} (paid, not trial).
            </li>
            <li>
              Rewards release after {rules.standardReferrer.acuReleaseDays} days if the payment
              remains valid.
            </li>
            <li>No reward for free sign-ups, trials, or refunded payments.</li>
          </ul>
        </RulesCard>
        <RulesCard title="Influencer commission (Growth Referrer &amp; above)">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Commission on net eligible revenue only — never gross, never free ACUs or discounts.
            </li>
            <li>
              £{rules.influencer.monthlyCapGbp.toLocaleString()}/month cap; £
              {rules.influencer.customerLifetimeCapGbp.toLocaleString()} lifetime cap per customer.
            </li>
            <li>
              Paid monthly after a {rules.influencer.commissionReviewDays}-day fraud and refund
              review window.
            </li>
          </ul>
        </RulesCard>
      </div>

      {data.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent referrals</CardTitle>
            <CardDescription>Attribution status for users who joined via your link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Qualifying spend</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentReferrals.map((ref) => (
                  <TableRow key={ref.referredUserId}>
                    <TableCell className="font-mono text-xs">
                      {ref.referredUserId.slice(0, 8)}…
                    </TableCell>
                    <TableCell>£{Number(ref.qualifyingSpendGbp).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={ref.status === 'FLAGGED' ? 'destructive' : 'secondary'}>
                        {ref.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RulesCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PublicHero({ compact }: { compact?: boolean }) {
  const copy = GROWTH_PARTNER_PUBLIC_COPY;
  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {!compact && (
        <Badge variant="outline" className="w-fit">
          {GROWTH_PARTNER_PROGRAMME.name}
        </Badge>
      )}
      <h1 className={compact ? 'text-2xl font-bold' : 'text-3xl font-bold tracking-tight'}>
        {GROWTH_PARTNER_PROGRAMME.tagline}
      </h1>
      {!compact && (
        <>
          <p className="max-w-2xl text-muted-foreground">{copy.everydayUsers.headline}</p>
          <p className="max-w-2xl text-muted-foreground">{copy.everydayUsers.reward}</p>
          <p className="max-w-2xl text-sm text-muted-foreground">{copy.everydayUsers.upgrade}</p>
        </>
      )}
    </div>
  );
}

export { PublicHero as GrowthPartnerPublicHero };
