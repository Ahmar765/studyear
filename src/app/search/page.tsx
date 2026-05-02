import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getResourceCountsAction } from "@/server/actions/resource-actions";
import { resourceMetadata, ResourceType } from "@/data/academic";
import { ArrowRight } from "lucide-react";

export default async function SearchPage() {
  const counts = await getResourceCountsAction();
  const resourceTypes = Object.keys(resourceMetadata) as ResourceType[];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-center text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Find Study Resources</h2>
        <p className="text-muted-foreground max-w-2xl">
          Browse our global library of AI-generated and community-contributed study materials. Every time you or another student creates a resource, it's added here for everyone to benefit from.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {resourceTypes.map((type) => {
          const metadata = resourceMetadata[type];
          if (!metadata) return null;

          const Icon = metadata.icon;
          const count = counts[type] || 0;

          return (
            <Card
              key={type}
              className="flex flex-col hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-lg mt-1">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{metadata.title}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {count.toLocaleString()} resources
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{metadata.description}</CardDescription>
              </CardContent>
              <div className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href={`/resources?type=${type}`}>
                    Browse <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
