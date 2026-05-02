
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Users, DollarSign, BrainCircuit, BookCopy, Settings, BarChart, ShieldAlert, UserSearch, Building, Activity, Award, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAdminDashboardStatsAction } from "@/server/actions/admin-actions";


const adminSections = [
    { title: "User Management", description: "View, edit, and manage user wallets and roles.", icon: Users, href: "/admin/users" },
    { title: "Tutor Management", description: "Review tutor applications and manage tutor profiles.", icon: UserCheck, href: "/admin/tutors" },
    { title: "School Management", description: "Review and approve new school partner accounts.", icon: Building, href: "/admin/schools" },
    { title: "Support Tools", description: "Access support features like 'View as User' to assist customers.", icon: UserSearch, href: "/admin/support" },
    { title: "Content Management", description: "Manage subjects, topics, and moderate generated content.", icon: BookCopy, href: "/admin/content" },
    { title: "Billing & Subscriptions", description: "Edit subscription plans and view revenue metrics.", icon: DollarSign, href: "/admin/billing" },
    { title: "Analytics & Reporting", description: "View generation volumes and student engagement metrics.", icon: BarChart, href: "/admin/analytics" },
    { title: "System & AI Settings", description: "Control AI rate limits, feature flags, and other global settings.", icon: Settings, href: "/admin/settings" },
    { title: "Fraud Monitoring", description: "Review accounts flagged for suspicious activity.", icon: ShieldAlert, href: "/admin/fraud" },
];

export default async function AdminDashboardPage() {
  const { stats, error } = await getAdminDashboardStatsAction();
  
  const kpiData = [
    { title: "Total Students", value: stats.totalStudents.toLocaleString(), icon: Users, href: "/admin/users" },
    { title: "Active Users", value: stats.activeUsers.toLocaleString(), icon: Activity, href: "/admin/users" },
    { title: "High-Risk Students", value: stats.highRiskStudents.toLocaleString(), icon: ShieldAlert, href: "/admin/fraud" },
    { title: "Sponsored Students", value: stats.sponsoredStudents.toLocaleString(), icon: Award, href: "/admin/billing" },
    { title: "School Partners", value: stats.schoolCount.toLocaleString(), icon: Building, href: "/admin/users" },
    { title: "AI Usage", value: "View Costs", icon: BrainCircuit, href: "/admin/ai-usage" },
  ];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground">
                Welcome, Admin! Here is an overview of the platform's performance.
            </p>
        </div>
         {error && <p className="text-destructive">Error loading stats: {error}</p>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiData.map(kpi => (
                <Link href={kpi.href} key={kpi.title}>
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {adminSections.map(section => (
                 <Card key={section.title} className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                <section.icon className="h-6 w-6" />
                            </div>
                            <CardTitle>{section.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <CardDescription>{section.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
                         <Button asChild className="w-full">
                            <Link href={section.href}>Manage</Link>
                        </Button>
                    </CardFooter>
                </Card>
             ))}
        </div>
    </div>
  );
}
