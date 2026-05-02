
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function SchoolInterventionsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Interventions</h2>
        <p className="text-muted-foreground">
          Manage and track academic intervention plans for at-risk students.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Intervention Plans</CardTitle>
          <CardDescription>An overview of all ongoing academic interventions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Target className="h-12 w-12 mb-4" />
            <p className="font-semibold">No Active Interventions</p>
            <p className="text-sm">Create intervention plans from student profiles or the risk alert dashboard.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
