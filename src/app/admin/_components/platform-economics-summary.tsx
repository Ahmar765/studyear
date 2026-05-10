import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { PlatformEconomicsOverview } from '@/server/actions/admin-actions';
import { AI_USAGE_AGG_ROW_CAP } from '@/server/lib/platform-economics-constants';
import { USD_TO_GBP_ASSUMED } from '@/server/lib/ai-provider-cost-estimate';

type Props = {
  overview: PlatformEconomicsOverview | null;
  error: string | null;
  compact?: boolean;
};

export function PlatformEconomicsSummary({ overview, error, compact }: Props) {
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!overview) {
    return null;
  }

  const indicativeMargin30d =
    Math.round((overview.stripeGrossGbpLast30d - overview.aiEstSpendGbpLast30d) * 100) / 100;

  const formatGbp = (n: number) =>
    `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const summaryFoot =
    'Stripe totals come from successful Checkout payments logged in Firestore. Estimated AI spend uses token-based provider list prices (USD) × a fixed USD→GBP hint — verify against OpenAI / Google Cloud invoices. ACU £ value assumes the Entry pack (£5 / 500 ACU). Older logs may show £0 API cost until new requests run after this update.';

  return (
    <div className="space-y-4">
      <div
        className={
          compact
            ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid gap-4 md:grid-cols-2 xl:grid-cols-4'
        }
      >
        <Card>
          <CardHeader className={compact ? 'pb-2' : undefined}>
            <CardTitle className={compact ? 'text-base' : undefined}>Stripe gross (30d)</CardTitle>
            <CardDescription>Gross payments recorded</CardDescription>
          </CardHeader>
          <CardContent className={compact ? 'pt-0' : undefined}>
            <div className={compact ? 'text-xl font-bold' : 'text-2xl font-bold'}>
              {formatGbp(overview.stripeGrossGbpLast30d)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview.stripePaymentCountLast30d} payments ·{' '}
              <Link href="/admin/billing" className="underline underline-offset-4">
                Billing detail
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={compact ? 'pb-2' : undefined}>
            <CardTitle className={compact ? 'text-base' : undefined}>Stripe gross (90d)</CardTitle>
            <CardDescription>Rolling quarter-style window</CardDescription>
          </CardHeader>
          <CardContent className={compact ? 'pt-0' : undefined}>
            <div className={compact ? 'text-xl font-bold' : 'text-2xl font-bold'}>
              {formatGbp(overview.stripeGrossGbpLast90d)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview.stripePaymentCountLast90d} payments in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={compact ? 'pb-2' : undefined}>
            <CardTitle className={compact ? 'text-base' : undefined}>Est. AI API spend (30d)</CardTitle>
            <CardDescription>Provider-side token estimate</CardDescription>
          </CardHeader>
          <CardContent className={compact ? 'pt-0' : undefined}>
            <div className={compact ? 'text-xl font-bold' : 'text-2xl font-bold'}>
              {formatGbp(overview.aiEstSpendGbpLast30d)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ≈ $
              {overview.aiEstSpendUsdLast30d.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              USD list-price hint @ 1 USD ≈ {USD_TO_GBP_ASSUMED} GBP ·{' '}
              <Link href="/admin/ai-usage" className="underline underline-offset-4">
                Usage log
              </Link>
            </p>
            {overview.aiLogsHitCap ? (
              <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
                Totals capped at {AI_USAGE_AGG_ROW_CAP.toLocaleString()} recent AI rows — real usage may be higher.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={compact ? 'pb-2' : undefined}>
            <CardTitle className={compact ? 'text-base' : undefined}>ACUs consumed (30d)</CardTitle>
            <CardDescription>Debit volume · Entry-pack £ hint</CardDescription>
          </CardHeader>
          <CardContent className={compact ? 'pt-0' : undefined}>
            <div className={compact ? 'text-xl font-bold' : 'text-2xl font-bold'}>
              {overview.aiAcusDebitedLast30d.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ≈ {formatGbp(overview.aiAcuValueGbpLast30d)} · {overview.aiSuccessfulRequestsLast30d}{' '}
              successful AI calls
            </p>
          </CardContent>
        </Card>
      </div>

      {!compact ? (
        <Card className="border-dashed bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Indicative margin (30d)</CardTitle>
            <CardDescription>Stripe gross (30d) minus estimated AI spend (GBP hint)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <span className="text-lg font-semibold">{formatGbp(indicativeMargin30d)}</span>
            <p className="mt-2 text-muted-foreground">{summaryFoot}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
