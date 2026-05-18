
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, UserPlus, Sparkles } from "lucide-react";
import { getAnalyticsDataAction } from "@/server/actions/admin-actions";
import AnalyticsCharts from "./analytics-charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AdminAnalyticsPage() {
  const { newUsersData, studyTimeData, kpi, kpiWarnings, error } = await getAnalyticsDataAction();

  const kpiCards = [
    {
      title: "Total users",
      value: kpi.totalUsers.toLocaleString(),
      hint: "Documents in users",
      icon: Users,
    },
    {
      title: "Returning (30d)",
      value: kpi.returningApprox30d.toLocaleString(),
      hint: "Users with lastLoginAt in the last 30 days",
      icon: Activity,
    },
    {
      title: "New sign-ups (30d)",
      value: kpi.newSignups30d.toLocaleString(),
      hint: "Users with createdAt in the last 30 days",
      icon: UserPlus,
    },
    {
      title: "AI requests logged (30d)",
      value: kpi.aiRequestsLogged30d.toLocaleString(),
      hint: "Rows in aiUsageLogs",
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics & Reporting</h2>
        <p className="text-muted-foreground">
          Sign-up trends, returning activity (via last login), and AI usage volume from Firestore.
        </p>
      </div>

      {error ? (
        <p className="text-destructive">Error loading analytics: {error}</p>
      ) : null}

      {kpiWarnings.length > 0 ? (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTitle>Partial metrics</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {kpiWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((row) => (
          <Card key={row.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{row.title}</CardTitle>
              <row.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{row.value}</div>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnalyticsCharts newUsersData={newUsersData} studyTimeData={studyTimeData} />
    </div>
  );
}
