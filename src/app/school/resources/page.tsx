
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookCopy } from "lucide-react";

export default function SchoolResourcesPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Shared Resources</h2>
        <p className="text-muted-foreground">
          Curate and share learning resources with specific cohorts or the entire institution.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>School Resource Library</CardTitle>
          <CardDescription>A central place for all resources shared within your school.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <BookCopy className="h-12 w-12 mb-4" />
            <p className="font-semibold">Feature Coming Soon</p>
            <p className="text-sm">Functionality to upload and manage shared school resources is in development.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
