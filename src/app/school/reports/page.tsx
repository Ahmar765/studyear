
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function SchoolReportsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reporting Suite</h2>
        <p className="text-muted-foreground">
          Generate comprehensive reports for individual students, cohorts, staff, and parents.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate a Report</CardTitle>
          <CardDescription>Select a report type and configure its parameters.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <BarChart className="h-12 w-12 mb-4" />
            <p className="font-semibold">Feature Coming Soon</p>
            <p className="text-sm">The reporting module is currently under development.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
