
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function SchoolProgressPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Progress Analytics</h2>
        <p className="text-muted-foreground">
          Monitor real-time progress data for individuals, cohorts, and the entire school.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overall School Progress</CardTitle>
          <CardDescription>Aggregated progress metrics across all subjects and year groups.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <LineChart className="h-12 w-12 mb-4" />
            <p className="font-semibold">Analytics Not Yet Available</p>
            <p className="text-sm">Link student accounts and track their quiz/assessment results to populate these charts.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
