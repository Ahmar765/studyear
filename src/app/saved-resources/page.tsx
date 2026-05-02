"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, PlusCircle } from "lucide-react";
import {
  fetchMySavedResources,
  type SavedResourceListItem,
} from "@/server/actions/saved-resources-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { resourceMetadata, ResourceType } from "@/data/academic";

export default function SavedResourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const [resources, setResources] = useState<SavedResourceListItem[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setResources([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetchMySavedResources(token);
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
          setResources([]);
          return;
        }
        setError(null);
        setResources(res.resources);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(
          e instanceof Error ? e.message : "Failed to load saved resources.",
        );
        setResources([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || (user && resources === null)) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">My Saved Resources</h2>
        <p className="text-muted-foreground">
          Sign in to view resources you&apos;ve saved.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Saved Resources</h2>
        <p className="text-muted-foreground">
          All your saved and generated resources in one place.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error === "Unauthorized"
            ? "Your session could not be verified. Try signing out and back in."
            : error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Resource Library</CardTitle>
        </CardHeader>
        <CardContent>
          {resources && resources.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => {
                const meta =
                  resource.typeKey in resourceMetadata
                    ? resourceMetadata[resource.typeKey as ResourceType]
                    : { title: resource.typeKey, icon: Bookmark };
                const Icon = meta.icon;
                return (
                  <Card
                    key={resource.id}
                    className="p-4 flex flex-col gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline">{meta.title}</Badge>
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold">{resource.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Saved on {resource.createdAt}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" className="w-full">
                      View
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Bookmark className="h-12 w-12 mb-4" />
              <p className="font-semibold">No Saved Resources</p>
              <p className="text-sm">
                Create or find resources to add them to your personal library.
              </p>
              <Button asChild className="mt-4">
                <Link href="/create">
                  <PlusCircle className="h-4 w-4 mr-2 inline" />
                  Create a Resource
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
