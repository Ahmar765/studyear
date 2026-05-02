
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { getUsersAction } from "@/server/actions/admin-actions";
import FraudActions from "./fraud-actions";

export default async function AdminFraudPage() {
  const { users, error } = await getUsersAction();
  const flaggedUsers = users.filter(u => u.isFlagged);

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Fraud Monitoring</h2>
            <p className="text-muted-foreground">
                Review accounts flagged for suspicious activity.
            </p>
        </div>
        <Card>
             <CardHeader>
                <CardTitle>Flagged Accounts</CardTitle>
                <CardDescription>These accounts have been flagged by the system for manual review.</CardDescription>
            </CardHeader>
            <CardContent>
                 {error && <p className="text-destructive">{error}</p>}
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Reason for Flag</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {flaggedUsers.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell>
                                    <div className="font-medium">{user.displayName}</div>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </TableCell>
                                <TableCell>{user.flagReason}</TableCell>
                                <TableCell>
                                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                        <ShieldAlert className="h-3 w-3" />
                                        Needs Review
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                     <FraudActions user={user} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {flaggedUsers.length === 0 && !error && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No flagged users found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
