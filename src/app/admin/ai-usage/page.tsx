
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Bot, DollarSign, FileClock } from "lucide-react";
import { getAiUsageLogsAction } from "@/server/actions/admin-actions";
import { adminDb } from "@/lib/firebase/admin-app";

export default async function AdminAiUsagePage() {
  const { logs, error } = await getAiUsageLogsAction();

  let userMap: { [key: string]: { displayName: string, email: string } } = {};
  if (logs.length > 0) {
    const userIds = [...new Set(logs.map(log => log.userId))];
     if (userIds.length > 0) {
        const userDocs = await adminDb.collection('users').where('__name__', 'in', userIds).get();
        userDocs.forEach(doc => {
            userMap[doc.id] = {
                displayName: doc.data().name || 'N/A',
                email: doc.data().email,
            }
        });
    }
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">AI Usage & Costs</h2>
            <p className="text-muted-foreground">
                Monitor AI model performance, costs, and consumption across the platform.
            </p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Recent AI Generations</CardTitle>
                <CardDescription>A log of the most recent AI generation requests.</CardDescription>
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
                                <TableCell>{log.model}</TableCell>
                                <TableCell>
                                    <div className="font-medium text-destructive">{log.chargedAcus.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground">(${log.customerChargeEquivalent.toFixed(4)})</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'}>{log.status}</Badge>
                                </TableCell>
                                <TableCell>{log.latencyMs}ms</TableCell>
                                <TableCell>{new Date(log.createdAt as any).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                         {logs.length === 0 && !error && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">No usage logs found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
