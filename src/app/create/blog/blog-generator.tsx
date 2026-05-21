"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Newspaper, Save } from "lucide-react";
import { GenerateBlogPostOutput } from "@/server/ai/flows/blog-post-generation";
import { createAiBlogPost } from "@/server/actions/blog-actions";
import { publishBlogPostAction, saveBlogPostAction } from "@/server/actions/blog-post-actions";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { SimpleMarkdown } from "@/components/blog/simple-markdown";


export default function BlogGenerator() {
  const [generatedPost, setGeneratedPost] = useState<GenerateBlogPostOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveDraftPending, startSaveDraft] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const isAdmin = userProfile?.role === "ADMIN";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a blog post.'});
        return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append('userId', user.uid);
    setGeneratedPost(null);

    startTransition(async () => {
      const result = await createAiBlogPost(formData);
      if (result.success && result.blogPost) {
        setGeneratedPost(result.blogPost);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  };

  const savePost = (andPublish: boolean) => {
    if (!user || !generatedPost) return;
    startSaveDraft(async () => {
      const result = await saveBlogPostAction({
        title: generatedPost.title,
        metaDescription: generatedPost.metaDescription,
        content: generatedPost.content,
        authorId: user.uid,
      });
      if (!result.success || !result.id) {
        toast({
          variant: "destructive",
          title: "Could not save",
          description: result.error,
        });
        return;
      }
      if (andPublish) {
        const pub = await publishBlogPostAction(result.id);
        if (!pub.success) {
          toast({ variant: "destructive", title: "Publish failed", description: pub.error });
          router.push(`/admin/blog/${result.id}/edit`);
          return;
        }
        toast({ title: "Published", description: "Post is live on /blog." });
        router.push("/admin/blog");
        return;
      }
      toast({
        title: "Draft saved",
        description: "Opening the editor — use Save & publish when ready.",
      });
      router.push(`/admin/blog/${result.id}/edit`);
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Generate a Blog Post</CardTitle>
            <CardDescription>
              Let AI write a complete, well-structured blog post from a single topic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-input">Blog Post Topic</Label>
                <Input
                  id="topic-input"
                  name="topic"
                  placeholder="e.g. 'The benefits of spaced repetition'"
                  required
                  disabled={isPending}
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Generating..." : <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Post
                  </>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
          <Card className="min-h-full">
            <CardHeader>
                <CardTitle>Generated Blog Post</CardTitle>
                <CardDescription>
                    Your AI-generated article will appear below, ready to be copied or published.
                </CardDescription>
            </CardHeader>
            <CardContent>
            {isPending ? (
                <div className="space-y-6">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <div className="space-y-4 pt-4">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                         <Skeleton className="h-6 w-1/2 mt-4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            ) : generatedPost ? (
                <article className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{generatedPost.title}</h1>
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={saveDraftPending}
                            onClick={() => savePost(false)}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {saveDraftPending ? "Saving…" : "Save draft"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={saveDraftPending}
                            onClick={() => savePost(true)}
                          >
                            {saveDraftPending ? "Publishing…" : "Save & publish"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Meta Description:</p>
                        <p className="text-sm p-2 bg-muted rounded-md italic">{generatedPost.metaDescription}</p>
                    </div>
                    <SimpleMarkdown content={generatedPost.content} />
                </article>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <Newspaper className="mx-auto h-12 w-12" />
                    <p className="mt-4">Your blog post is waiting to be generated.</p>
                </div>
            )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
