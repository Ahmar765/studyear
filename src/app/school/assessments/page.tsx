
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function SchoolAssessmentsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Assessments</h2>
        <p className="text-muted-foreground">
          Create, assign, and track school-wide or cohort-specific assessments.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assessment Library</CardTitle>
          <CardDescription>An overview of all assessments created by your institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 mb-4" />
            <p className="font-semibold">Feature Coming Soon</p>
            <p className="text-sm">The assessment creation and tracking module is currently in development.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
