
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSchoolAccountsAction } from "@/server/actions/admin-actions";
import SchoolActions from './school-actions';

export default async function AdminSchoolsPage() {
    const { accounts, error } = await getSchoolAccountsAction();

    if (error) {
        return <div className="p-8">Error loading school accounts: {error}</div>;
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">School Management</h2>
                <p className="text-muted-foreground">
                    Review and approve new school accounts.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>School Accounts</CardTitle>
                    <CardDescription>A list of all institutions that have registered on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>School Name</TableHead>
                                <TableHead>Date Registered</TableHead>
                                <TableHead>Approval Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map(acc => (
                                <TableRow key={acc.id}>
                                    <TableCell>{acc.name}</TableCell>
                                    <TableCell>{new Date(acc.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            acc.approvalStatus === 'APPROVED' ? 'secondary' : 
                                            acc.approvalStatus === 'REJECTED' ? 'destructive' : 'default'
                                        }>{acc.approvalStatus}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <SchoolActions account={acc} />
                                    </TableCell>
                                </TableRow>
                            ))}
                             {accounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No school accounts found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
