
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SchoolSettingsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">School Settings</h2>
        <p className="text-muted-foreground">
          Manage your school's profile, billing, and technical integrations.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>MIS Integration</CardTitle>
          <CardDescription>Connect to your school's Management Information System.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Settings className="h-12 w-12 mb-4" />
            <p className="font-semibold">MIS Sync Coming Soon</p>
            <p className="text-sm">Automated synchronization with SIMS, Arbor, and other MIS providers is planned.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
