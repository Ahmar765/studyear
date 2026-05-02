
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Users, UserCog, FileText, LineChart, ShieldAlert, BarChart, Target, BookCopy, Settings } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const schoolSections = [
    { title: "Student Management", description: "View and manage student data, progress, and reports.", icon: Users, href: "/school/students" },
    { title: "Staff Management", description: "Onboard teachers and assign them to student cohorts.", icon: UserCog, href: "/school/staff" },
    { title: "Assessments", description: "Create, assign, and track school-wide assessments.", icon: FileText, href: "/school/assessments" },
    { title: "Progress Analytics", description: "Monitor real-time progress data across the school.", icon: LineChart, href: "/school/progress" },
    { title: "Risk Alerts", description: "Review AI-generated alerts for at-risk students.", icon: ShieldAlert, href: "/school/alerts" },
    { title: "Reporting", description: "Generate comprehensive reports for staff and parents.", icon: BarChart, href: "/school/reports" },
    { title: "Interventions", description: "Manage and track academic intervention plans.", icon: Target, href: "/school/interventions" },
    { title: "Shared Resources", description: "Curate and share resources across your institution.", icon: BookCopy, href: "/school/resources" },
    { title: "School Settings", description: "Configure MIS integration and platform settings.", icon: Settings, href: "/school/settings" },
];

export default function SchoolDashboardPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">School Dashboard</h2>
            <p className="text-muted-foreground">
                An overview of your school's performance and management tools.
            </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {schoolSections.map(section => (
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
