
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Wallet, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getAcuTransactionsAction, getRecentPaymentsAction } from "@/server/actions/admin-actions";
import { adminDb } from "@/lib/firebase/admin-app";

export default async function AdminBillingPage() {
  const [{ transactions, error: acuError }, { payments, error: paymentsError }] = await Promise.all([
    getAcuTransactionsAction(),
    getRecentPaymentsAction()
  ]);

  const userIds = [...new Set([...transactions.map(t => t.userId), ...payments.map(p => p.userId)])];
  let userMap: { [key: string]: { displayName: string, email: string } } = {};
  if (userIds.length > 0) {
    const userDocs = await adminDb.collection('users').where('__name__', 'in', userIds).get();
    userDocs.forEach(doc => {
        userMap[doc.id] = {
            displayName: doc.data().name || 'N/A',
            email: doc.data().email,
        }
    });
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Billing & Revenue</h2>
            <p className="text-muted-foreground">
                View revenue metrics, manage subscriptions, and track payments.
            </p>
        </div>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
             <Card>
                <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                    <CardDescription>A log of recent transactions processed via Stripe.</CardDescription>
                </CardHeader>
                <CardContent>
                     {paymentsError && <p className="text-destructive">{paymentsError}</p>}
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {payments.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <div className="font-medium">{userMap[p.userId]?.displayName || 'Unknown'}</div>
                                        <div className="text-sm text-muted-foreground">{userMap[p.userId]?.email}</div>
                                    </TableCell>
                                     <TableCell>
                                        <div className="font-medium">£{(p.amount / 100).toFixed(2)}</div>
                                    </TableCell>
                                    <TableCell>{new Date(p.createdAt as any).toLocaleDateString()}</TableCell>
                                </TableRow>
                             ))}
                             {payments.length === 0 && !paymentsError && (
                                 <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">No payment history found.</TableCell>
                                </TableRow>
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent ACU Debits</CardTitle>
                    <CardDescription>High-value AI credit consumptions from the ledger.</CardDescription>
                </CardHeader>
                <CardContent>
                    {acuError && <p className="text-destructive">{acuError}</p>}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Feature</TableHead>
                                <TableHead>ACUs</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {transactions.filter(t => t.type === 'DEBIT').map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="font-medium">{userMap[t.userId]?.displayName || 'Unknown'}</div>
                                        <div className="text-sm text-muted-foreground">{userMap[t.userId]?.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{t.featureKey?.replace(/_/g, ' ') || 'N/A'}</Badge>
                                    </TableCell>
                                     <TableCell>
                                        <div className="font-medium text-destructive">{t.amount?.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">(${t.platformChargeGBP?.toFixed(2)})</div>
                                    </TableCell>
                                    <TableCell>{new Date(t.createdAt as any).toLocaleDateString()}</TableCell>
                                </TableRow>
                             ))}
                             {transactions.filter(t => t.type === 'DEBIT').length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No debit transactions found.</TableCell>
                                </TableRow>
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Discount Codes</CardTitle>
                    <CardDescription>Create and manage discount codes for promotions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form className="space-y-4">
                        <div>
                            <Label htmlFor="discount-code">New Code</Label>
                            <Input id="discount-code" placeholder="e.g., SUMMER25" disabled />
                        </div>
                        <div>
                            <Label htmlFor="discount-type">Type</Label>
                            <Select disabled>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="discount-value">Value</Label>
                            <Input id="discount-value" type="number" placeholder="e.g., 25" disabled />
                        </div>
                        <Button className="w-full" disabled>Create Discount Code</Button>
                         <p className="text-xs text-muted-foreground text-center pt-2">
                            This feature requires a dedicated backend function with Stripe secret key access.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
