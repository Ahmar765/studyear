
"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateSummary } from "@/server/actions/summarizer-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSignature, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SaveGeneratedResourceButton } from "@/components/save-generated-resource-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SummarizerFormProps {
    levels: string[];
    subjectsByLevel: Record<string, string[]>;
}

export default function SummarizerForm({ levels, subjectsByLevel }: SummarizerFormProps) {
  const [summary, setSummary] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  
  useEffect(() => {
    if (selectedLevel) {
        setSubjects(subjectsByLevel[selectedLevel] || []);
    } else {
        setSubjects([]);
    }
  }, [selectedLevel, subjectsByLevel]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSummary("");
    setSummaryTitle("");
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "You must be logged in to use this feature.",
      });
      return;
    }
    formData.append('userId', user.uid);

    startTransition(async () => {
      const result = await generateSummary(formData);
      if (result.success && result.summary) {
        setSummary(result.summary);
        setSummaryTitle(String(formData.get("topicName") ?? "").trim() || "Topic summary");
        toast({
          title: "Summary ready",
          description: "Tap Save to add it to your Saved Resources library.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Enter Topic</CardTitle>
          <CardDescription>
            Paste the text you want to summarize and give it a topic name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Study Level</Label>
                  <Select name="level" required disabled={isPending} onValueChange={setSelectedLevel}>
                    <SelectTrigger id="level"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select name="subject" required disabled={isPending || subjects.length === 0}>
                    <SelectTrigger id="subject"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            <div className="space-y-2">
              <Label htmlFor="topic-name">Topic Name</Label>
              <Input
                id="topic-name"
                name="topicName"
                placeholder="e.g., The Function of Mitochondria"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-text">Text to Summarize</Label>
              <Textarea
                id="topic-text"
                name="topicText"
                placeholder="Paste the article, notes, or text you want to summarize here..."
                className="min-h-[200px]"
                required
                disabled={isPending}
              />
            </div>
            <Button type="submit" disabled={isPending}>
                {isPending ? "Summarizing..." : <>
                <Sparkles className="mr-2 h-4 w-4" />
                Summarize Topic
                </>}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
          <CardDescription>
            Your concise summary will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[260px]">
          {isPending ? (
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <SaveGeneratedResourceButton
                  resourceType="TOPIC_SUMMARY"
                  title={summaryTitle || "Topic summary"}
                  content={{ summary }}
                />
              </div>
              <p className="text-sm whitespace-pre-wrap">{summary}</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground pt-16">
              <FileSignature className="mx-auto h-12 w-12" />
              <p className="mt-4">Your summary is waiting.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
