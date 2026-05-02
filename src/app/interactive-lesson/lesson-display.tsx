
'use client';

import { GenerateInteractiveLessonOutput } from "@/server/ai/flows/ai-lesson-generation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BrainCircuit, Check, CheckCircle, Loader, Sparkles } from "lucide-react";
import React from "react";

interface LessonDisplayProps {
    lesson: GenerateInteractiveLessonOutput;
    lessonContent: string[];
    currentStep: number;
    isPending: boolean;
    onNextStep: () => void;
    onStartQuiz: () => void;
    children: React.ReactNode;
}

const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="prose prose-stone dark:prose-invert max-w-none">
        {content.split('\n').map((line, index) => {
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(3)}</h2>;
            }
            if (line.startsWith('* ')) {
                return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
            }
            if (line.trim() === '') {
                return <br key={index} />;
            }
            return <p key={index} className="mb-2">{line}</p>;
        })}
        </div>
    );
};

export default function LessonDisplay({
    lesson,
    lessonContent,
    currentStep,
    isPending,
    onNextStep,
    onStartQuiz,
    children,
}: LessonDisplayProps) {

  const isLessonComplete = currentStep >= lesson.lessonPlan.length;

  return (
    <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
            <Card className="sticky top-20">
                <CardHeader>
                    <CardTitle>Lesson Plan</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {lesson.lessonPlan.map(step => (
                             <li key={step.step} className="flex items-start gap-3">
                                <div className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-full mt-0.5",
                                    currentStep > step.step ? "bg-green-600 text-white" :
                                    currentStep === step.step ? "bg-primary text-primary-foreground" :
                                    "bg-muted border"
                                )}>
                                    {currentStep > step.step ? <Check className="h-4 w-4" /> : step.step}
                                </div>
                                <div>
                                    <p className={cn(
                                        "font-semibold",
                                        currentStep >= step.step && "text-foreground",
                                        currentStep < step.step && "text-muted-foreground"
                                    )}>{step.title}</p>
                                    <p className="text-xs text-muted-foreground">{step.concept}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-3 space-y-4">
            <Card>
                 <CardHeader>
                    <h1 className="text-3xl font-bold tracking-tight">{lesson.lessonTitle}</h1>
                </CardHeader>
                <CardContent>
                    {lessonContent.map((content, index) => (
                        <React.Fragment key={index}>
                            <SimpleMarkdown content={content} />
                            {index < lessonContent.length - 1 && <Separator className="my-6" />}
                        </React.Fragment>
                    ))}
                    
                    {isPending && (
                        <div className="flex items-center gap-3 p-4">
                             <Loader className="h-5 w-5 animate-spin" />
                             <p className="text-muted-foreground">Generating next step...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {!isLessonComplete ? (
                 <Button onClick={onNextStep} disabled={isPending} className="w-full lg:w-auto">
                    {isPending ? "Loading..." : "Continue to Next Step"}
                </Button>
            ) : (
                <Button onClick={onStartQuiz} disabled={isPending} className="w-full lg:w-auto">
                    {isPending ? "Loading..." : <><CheckCircle className="mr-2 h-4 w-4" />Take the Quiz!</>}
                </Button>
            )}

            {children}
        </div>
    </div>
  )
}
