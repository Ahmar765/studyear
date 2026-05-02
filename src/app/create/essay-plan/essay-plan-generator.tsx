
'use client';

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, FilePen, Lightbulb } from "lucide-react";
import { GenerateEssayPlanOutput } from "@/server/ai/flows/essay-plan-generation";
import { createAiEssayPlan } from "@/server/actions/essay-plan-actions";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { SaveGeneratedResourceButton } from "@/components/save-generated-resource-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EssayPlanGeneratorProps {
    levels: string[];
    subjectsByLevel: Record<string, string[]>;
}

export default function EssayPlanGenerator({ levels, subjectsByLevel }: EssayPlanGeneratorProps) {
  const [generatedPlan, setGeneratedPlan] = useState<GenerateEssayPlanOutput | null>(null);
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
    setGeneratedPlan(null);

    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        return;
    }
    formData.append('userId', user.uid);

    startTransition(async () => {
      const result = await createAiEssayPlan(formData);
      if (result.success && result.plan) {
        setGeneratedPlan(result.plan);
        toast({
          title: "Essay plan ready",
          description: "Scroll down and tap Save to keep it in your library.",
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
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Create an Essay Plan</CardTitle>
            <CardDescription>
              Let AI structure your argument for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="level">Study Level</Label>
                <Select name="level" required disabled={isPending} onValueChange={setSelectedLevel}>
                  <SelectTrigger id="level"><SelectValue placeholder="Select a level" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedLevel && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select name="subject" required disabled={isPending || subjects.length === 0}>
                    <SelectTrigger id="subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="topic-input">Essay Topic or Question</Label>
                <Textarea
                  id="topic-input"
                  name="topic"
                  placeholder="e.g. 'To what extent was the Cold War inevitable?'"
                  required
                  disabled={isPending}
                  className="min-h-[100px]"
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Generating..." : <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Plan
                  </>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
          <Card className="min-h-full">
            <CardHeader>
                <CardTitle>Generated Essay Plan</CardTitle>
                <CardDescription>
                    Your AI-generated plan will appear below.
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
            ) : generatedPlan ? (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">{generatedPlan.title}</h2>
                    
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="text-accent"/> Thesis Statement</h3>
                        <p className="text-muted-foreground italic border-l-4 border-accent pl-4 py-2">{generatedPlan.thesisStatement}</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Introduction</h3>
                        <p className="text-sm text-muted-foreground">{generatedPlan.introduction}</p>
                    </div>

                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Body Paragraphs</h3>
                        {generatedPlan.bodyParagraphs.map((para, index) => (
                            <Card key={index} className="bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="text-base">Paragraph {index + 1}: {para.point}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground">Evidence:</h4>
                                        <p>{para.evidence}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground">Explanation:</h4>
                                        <p>{para.explanation}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Separator />
                    
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Conclusion</h3>
                        <p className="text-sm text-muted-foreground">{generatedPlan.conclusion}</p>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                      <SaveGeneratedResourceButton
                        resourceType="ESSAY_PLAN"
                        title={generatedPlan.title}
                        content={generatedPlan}
                      />
                    </div>

                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <FilePen className="mx-auto h-12 w-12" />
                    <p className="mt-4">Your essay plan is waiting to be generated.</p>
                </div>
            )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
