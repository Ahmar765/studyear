
'use client';
import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Sigma, Bot } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GenerateFormulaSheetOutput } from "@/server/ai/flows/formula-sheet-generation";
import { generateFormulaSheetAction } from "@/server/actions/formula-sheet-actions";
import { SaveGeneratedResourceButton } from "@/components/save-generated-resource-button";

interface FormulaSheetGeneratorProps {
    levels: string[];
    subjectsByLevel: Record<string, string[]>;
}

export default function FormulaSheetGenerator({ levels, subjectsByLevel }: FormulaSheetGeneratorProps) {
  const [generatedSheet, setGeneratedSheet] = useState<GenerateFormulaSheetOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setGeneratedSheet(null);

    startTransition(async () => {
      if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create a formula sheet." });
        return;
      }
      formData.append('userId', user.uid);
      const result = await generateFormulaSheetAction(formData);

      if (result.success && result.sheet) {
        setGeneratedSheet(result.sheet);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "An unexpected error occurred while generating the sheet.",
        });
      }
    });
  };
  
  const subjectsForLevel = selectedLevel ? subjectsByLevel[selectedLevel] || [] : [];
  const mathAndScienceSubjects = subjectsForLevel.filter(s => ['Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'Biology', 'Combined Science'].includes(s));


  return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Generate Sheet</CardTitle>
                        <CardDescription>Select a subject and level.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="level">Study Level</Label>
                                <Select name="level" required disabled={isPending} onValueChange={setSelectedLevel}>
                                    <SelectTrigger id="level"><SelectValue placeholder="Select a level" /></SelectTrigger>
                                    <SelectContent>
                                        {levels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedLevel && (
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Select name="subject" required disabled={isPending || mathAndScienceSubjects.length === 0}>
                                        <SelectTrigger id="subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                                        <SelectContent>
                                            {mathAndScienceSubjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <Button type="submit" disabled={isPending || !selectedLevel || mathAndScienceSubjects.length === 0} className="w-full">
                                {isPending ? "Generating..." : <><Sparkles className="mr-2 h-4 w-4" /> Generate Sheet</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card className="min-h-full">
                    <CardHeader>
                        <CardTitle>Generated Formula Sheet</CardTitle>
                        <CardDescription>Your AI-generated sheet will appear below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isPending ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : generatedSheet ? (
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                  <h2 className="text-2xl font-bold">{generatedSheet.title}</h2>
                                  <SaveGeneratedResourceButton
                                    resourceType="FORMULA_SHEET"
                                    title={generatedSheet.title}
                                    content={generatedSheet}
                                  />
                                </div>
                                <Accordion type="multiple" className="w-full">
                                    {generatedSheet.formulas.map((item, index) => (
                                    <AccordionItem value={`item-${index}`} key={index}>
                                        <AccordionTrigger>
                                            <span className="flex items-center gap-2 text-lg"><Sigma className="h-5 w-5"/> {item.formula}</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pl-4 space-y-2">
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                            <p className="text-sm"><strong className="font-semibold">Variables:</strong> {item.variables}</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-16">
                                <Bot className="mx-auto h-12 w-12" />
                                <p className="mt-4">Your formula sheet is waiting to be generated.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
  );
}
