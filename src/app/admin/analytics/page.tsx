
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Activity, ShoppingCart } from "lucide-react";
import { getAnalyticsDataAction } from "@/server/actions/admin-actions";
import AnalyticsCharts from "./analytics-charts";


const kpiData = [
    { title: "Monthly Active Users (MAU)", value: "0", icon: Users, change: "Live data unavailable" },
    { title: "Customer Lifetime Value (LTV)", value: "$0.00", icon: DollarSign, change: "Live data unavailable" },
    { title: "Daily Active Users (DAU)", value: "0", icon: Activity, change: "Live data unavailable" },
    { title: "Conversion Rate", value: "0%", icon: ShoppingCart, change: "Live data unavailable" },
];


export default async function AdminAnalyticsPage() {
    const { newUsersData, error } = await getAnalyticsDataAction();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Analytics & Reporting</h2>
            <p className="text-muted-foreground">
                View generation volumes and student engagement metrics.
            </p>
        </div>
        {error && <p className="text-destructive">Error loading analytics: {error}</p>}
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiData.map(kpi => (
                <Card key={kpi.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <p className="text-xs text-muted-foreground">{kpi.change}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <AnalyticsCharts newUsersData={newUsersData} />
    </div>
  );
}

