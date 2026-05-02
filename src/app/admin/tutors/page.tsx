
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTutorApplicationsAction } from "@/server/actions/admin-actions";
import TutorActions from './tutor-actions';

export default async function AdminTutorsPage() {
    const { applications, error } = await getTutorApplicationsAction();

    if (error) {
        return <div className="p-8">Error loading tutor applications: {error}</div>;
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tutor Management</h2>
                <p className="text-muted-foreground">
                    Review and approve new tutor applications.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Tutor Applications</CardTitle>
                    <CardDescription>A list of all tutors who have registered on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Onboarding Fee Paid</TableHead>
                                <TableHead>Approval Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {applications.map(app => (
                                <TableRow key={app.userId}>
                                    <TableCell>{app.displayName}</TableCell>
                                    <TableCell>{app.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={app.onboardingPaid ? 'secondary' : 'outline'}>
                                            {app.onboardingPaid ? 'Paid' : 'Unpaid'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            app.approvalStatus === 'APPROVED' ? 'secondary' : 
                                            app.approvalStatus === 'REJECTED' ? 'destructive' : 'default'
                                        }>{app.approvalStatus}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TutorActions application={app} />
                                    </TableCell>
                                </TableRow>
                            ))}
                             {applications.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No tutor applications found.
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
