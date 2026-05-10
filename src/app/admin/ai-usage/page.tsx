import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAiUsageLogsAction, getPlatformEconomicsOverviewAction } from "@/server/actions/admin-actions";
import { fetchUserLabelsByIds } from "@/server/lib/admin-user-labels";
import { PlatformEconomicsSummary } from "@/app/admin/_components/platform-economics-summary";
import { USD_TO_GBP_ASSUMED } from "@/server/lib/ai-provider-cost-estimate";

export default async function AdminAiUsagePage() {
  const [{ logs, error }, { overview: economicsOverview, error: economicsError }] = await Promise.all([
    getAiUsageLogsAction(100),
    getPlatformEconomicsOverviewAction(),
  ]);

  const userMap =
    logs.length > 0 ? await fetchUserLabelsByIds([...new Set(logs.map((log) => log.userId))]) : {};

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">AI usage & API costs</h2>
            <p className="text-muted-foreground">
                Estimated API spend is shown in GBP (USD list-price hint × {USD_TO_GBP_ASSUMED} FX). ACU £ uses the Entry-pack rule (£5 / 500 ACU). Confirm against real vendor invoices.
            </p>
        </div>

        <PlatformEconomicsSummary overview={economicsOverview} error={economicsError} />

        <Card>
            <CardHeader>
                <CardTitle>Recent AI requests</CardTitle>
                <CardDescription>Latest rows from Firestore <code className="text-xs">aiUsageLogs</code>.</CardDescription>
            </CardHeader>
            <CardContent>
                {error && <p className="text-destructive">{error}</p>}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Feature</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>ACUs</TableHead>
                            <TableHead>Est. API (£)</TableHead>
                            <TableHead>ACU value (£)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Latency</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map(log => (
                            <TableRow key={log.requestId}>
                                <TableCell>
                                    <div className="font-medium">{userMap[log.userId]?.displayName || 'Unknown User'}</div>
                                    <div className="text-sm text-muted-foreground">{userMap[log.userId]?.email}</div>
                                </TableCell>
                                <TableCell><Badge variant="outline">{log.featureKey}</Badge></TableCell>
                                <TableCell>
                                  <div>{log.model}</div>
                                  <div className="text-xs text-muted-foreground">{log.provider}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-destructive">{(log.chargedAcus ?? 0).toLocaleString()}</div>
                                </TableCell>
                                <TableCell className="tabular-nums">
                                    £
                                    {(Number(log.realCost ?? 0) * USD_TO_GBP_ASSUMED).toFixed(4)}
                                    <span className="block text-[10px] text-muted-foreground font-normal">
                                      (${Number(log.realCost ?? 0).toFixed(4)} USD hint)
                                    </span>
                                </TableCell>
                                <TableCell className="tabular-nums">
                                    £{Number(log.customerChargeEquivalent ?? 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'}>{log.status}</Badge>
                                </TableCell>
                                <TableCell>{log.latencyMs}ms</TableCell>
                                <TableCell>
                                  {log.createdAt
                                    ? log.createdAt.toLocaleString('en-GB')
                                    : '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                         {logs.length === 0 && !error && (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">No usage logs found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
