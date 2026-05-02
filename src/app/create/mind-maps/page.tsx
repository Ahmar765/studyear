
'use client';

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, BrainCircuit, Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { GenerateMindMapOutput, MindMapNode } from "@/server/ai/flows/mind-map-generation";
import { generateMindMapAction } from "@/server/actions/mind-map-actions";
import { SaveGeneratedResourceButton } from "@/components/save-generated-resource-button";

const MindMapNodeDisplay: React.FC<{ node: MindMapNode }> = ({ node }) => {
    return (
        <li className="ml-6">
            <span className="font-semibold">{node.title}</span>
            {node.children && node.children.length > 0 && (
                <ul className="list-disc pl-5">
                    {node.children.map((child, index) => (
                        <MindMapNodeDisplay key={index} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export default function MindMapsPage() {
    const [generatedMap, setGeneratedMap] = useState<GenerateMindMapOutput | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setGeneratedMap(null);

        startTransition(async () => {
            if (!user) {
                toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create a mind map." });
                return;
            }
            formData.append('userId', user.uid);
            const result = await generateMindMapAction(formData);

            if (result.success && result.map) {
                setGeneratedMap(result.map);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "An unexpected error occurred while generating the mind map.",
                });
            }
        });
    };

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Mind Map Generator</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Visually organize information and show relationships between concepts.
                </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Mind Map</CardTitle>
                            <CardDescription>Enter a central topic.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="topic">Central Topic</Label>
                                    <Input id="topic" name="topic" placeholder="e.g., The Causes of World War I" required disabled={isPending} />
                                </div>
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending ? "Generating..." : <><Sparkles className="mr-2 h-4 w-4" /> Generate Map</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="min-h-full">
                        <CardHeader>
                            <CardTitle>Generated Mind Map</CardTitle>
                            <CardDescription>Your AI-generated mind map will appear below.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isPending ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-8 w-1/2" />
                                    <Skeleton className="h-4 w-3/4 ml-6" />
                                    <Skeleton className="h-4 w-2/3 ml-12" />
                                    <Skeleton className="h-4 w-3/4 ml-6" />
                                </div>
                            ) : generatedMap ? (
                                <div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                      <h2 className="text-2xl font-bold">{generatedMap.title}</h2>
                                      <SaveGeneratedResourceButton
                                        resourceType="MIND_MAP"
                                        title={generatedMap.title}
                                        content={generatedMap}
                                      />
                                    </div>
                                    <ul className="list-none">
                                        <MindMapNodeDisplay node={generatedMap.rootNode} />
                                    </ul>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-16">
                                    <Bot className="mx-auto h-12 w-12" />
                                    <p className="mt-4">Your mind map is waiting to be generated.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
