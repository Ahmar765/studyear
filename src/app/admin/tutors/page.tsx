
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTutorApplicationsAction } from "@/server/actions/admin-actions";
import TutorActions from './tutor-actions';
import { Clock, CheckCircle2, XCircle, Users } from 'lucide-react';

function statusBadge(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    if (status === 'APPROVED') {
        return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
    }
    if (status === 'REJECTED') {
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
    }
    return <Badge className="bg-amber-500 text-white gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default async function AdminTutorsPage() {
    const { applications, error } = await getTutorApplicationsAction();

    const pending = applications.filter((a) => a.approvalStatus === 'PENDING');
    const approved = applications.filter((a) => a.approvalStatus === 'APPROVED');
    const rejected = applications.filter((a) => a.approvalStatus === 'REJECTED');

    if (error) {
        return <div className="p-8 text-destructive">Error loading tutor applications: {error}</div>;
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tutor applications</h2>
                <p className="text-muted-foreground">
                    Review, approve, or reject private tutor registrations. Tutors cannot access their dashboard until approved.
                </p>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{applications.length}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={pending.length > 0 ? 'border-amber-400' : ''}>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <Clock className={`h-5 w-5 shrink-0 ${pending.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <div>
                            <p className="text-2xl font-bold">{pending.length}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{approved.length}</p>
                            <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{rejected.length}</p>
                            <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All applications</CardTitle>
                    <CardDescription>Sorted by status — pending first. Approve or reject to unlock / block dashboard access.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tutor</TableHead>
                                <TableHead>Subjects</TableHead>
                                <TableHead>Hourly rate</TableHead>
                                <TableHead>Fee paid</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {applications.map(app => (
                                <TableRow key={app.userId}>
                                    <TableCell>
                                        <div className="font-medium">{app.displayName}</div>
                                        <div className="text-xs text-muted-foreground">{app.email}</div>
                                        {app.headline && (
                                            <div className="text-xs text-muted-foreground italic mt-0.5 max-w-[220px] truncate">{app.headline}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                                            {Array.isArray(app.subjects) && app.subjects.length > 0
                                                ? app.subjects.slice(0, 4).map((s) => (
                                                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                                ))
                                                : <span className="text-xs text-muted-foreground">—</span>
                                            }
                                            {Array.isArray(app.subjects) && app.subjects.length > 4 && (
                                                <Badge variant="outline" className="text-xs">+{app.subjects.length - 4}</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {app.hourlyRate != null ? `£${app.hourlyRate}/hr` : <span className="text-muted-foreground text-xs">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={app.onboardingPaid ? 'secondary' : 'outline'}>
                                            {app.onboardingPaid ? 'Paid' : 'Unpaid'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{statusBadge(app.approvalStatus)}</TableCell>
                                    <TableCell className="text-right">
                                        <TutorActions application={app} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {applications.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
