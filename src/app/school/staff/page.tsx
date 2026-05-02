
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import { getSchoolStaffAction, SchoolStaffMember } from "@/server/actions/school-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function SchoolStaffPage() {
  const { staff, error } = await getSchoolStaffAction();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
            <p className="text-muted-foreground">
              Onboard teachers and other staff members and assign them to student cohorts.
            </p>
          </div>
          <Button disabled>Invite New Staff Member</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
          <CardDescription>A list of all staff members at your school.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center">{error}</p>}
          {!error && staff.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <UserCog className="h-12 w-12 mb-4" />
                <p className="font-semibold">No staff members found.</p>
                <p className="text-sm">Use the "Invite" button to add teachers to your school.</p>
            </div>
          )}
          {!error && staff.length > 0 && (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {staff.map(member => (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.profileImageUrl} />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{member.name}</span>
                                </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary">{member.role.replace('SCHOOL_', '')}</Badge></TableCell>
                            <TableCell>{member.email}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
