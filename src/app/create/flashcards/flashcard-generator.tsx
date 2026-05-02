
"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createAiFlashcards } from "@/server/actions/flashcard-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SaveGeneratedResourceButton } from "@/components/save-generated-resource-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FlashcardGeneratorProps {
    levels: string[];
    subjectsByLevel: Record<string, string[]>;
}

interface Flashcard {
    question: string;
    answer: string;
}

function Flashcard({ card }: { card: Flashcard }) {
    const [isFlipped, setIsFlipped] = useState(false);
    
    return (
        <div 
            className="w-full h-48 [perspective:1000px] cursor-pointer" 
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div 
                className={`relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
                {/* Front */}
                <div className="absolute w-full h-full p-4 rounded-lg bg-card border flex items-center justify-center [backface-visibility:hidden]">
                    <p className="text-lg font-semibold">{card.question}</p>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full p-4 rounded-lg bg-card border flex items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <p className="text-sm">{card.answer}</p>
                </div>
            </div>
        </div>
    );
}


export default function FlashcardGenerator({ levels, subjectsByLevel }: FlashcardGeneratorProps) {
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [saveTitle, setSaveTitle] = useState("");
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
    setGeneratedFlashcards([]);
    setSaveTitle("");
    
    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        return;
    }
    formData.append('userId', user.uid);

    startTransition(async () => {
      const result = await createAiFlashcards(formData);
      if (result.success && result.flashcards) {
        setGeneratedFlashcards(result.flashcards);
        const topic = String(formData.get("topic") ?? "").trim();
        setSaveTitle(topic ? `${topic.slice(0, 120)} — Flashcards` : "Flashcards");
        toast({
          title: "Flashcards ready",
          description: "Scroll down and tap Save to keep them in your library.",
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
            <CardTitle>Generate Flashcards</CardTitle>
            <CardDescription>
              Let AI create a set of flashcards for any topic.
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
                <Label htmlFor="topic-input">Topic</Label>
                <Input
                  id="topic-input"
                  name="topic"
                  placeholder="e.g. The Krebs Cycle"
                  required
                  disabled={isPending}
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Generating..." : <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Flashcards
                  </>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
          <Card className="min-h-full">
            <CardHeader>
                <CardTitle>Generated Flashcards</CardTitle>
                <CardDescription>
                    Your AI-generated flashcards will appear below. Click a card to flip it.
                </CardDescription>
            </CardHeader>
            <CardContent>
            {isPending ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            ) : generatedFlashcards.length > 0 ? (
                <div className="space-y-4">
                <div className="flex justify-end">
                  <SaveGeneratedResourceButton
                    resourceType="FLASHCARD"
                    title={saveTitle || "Flashcards"}
                    content={{ cards: generatedFlashcards }}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {generatedFlashcards.map((card, index) => (
                        <Flashcard key={index} card={card} />
                    ))}
                </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <Bot className="mx-auto h-12 w-12" />
                    <p className="mt-4">Your flashcards are waiting to be generated.</p>
                </div>
            )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
