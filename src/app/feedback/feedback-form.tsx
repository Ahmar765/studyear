
'use client';

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareCheck, Sparkles, Bot, Check, X, BookText, Lock, Award, BookOpen, UserCheck, MessageCircle, BarChartHorizontal } from "lucide-react";
import { WrittenFeedbackOutput } from "@/server/ai/flows/written-answer-feedback";
import { generateAnswerFeedback } from "@/server/actions/feedback-actions";
import { Separator } from "@/components/ui/separator";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FeedbackFormProps {
    subjectsByLevel: Record<string, string[]>;
}

const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none">
        {content.split('\n').map((line, index) => {
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-lg font-bold mt-3 mb-1">{line.substring(3)}</h2>;
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


export default function FeedbackForm({ subjectsByLevel }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState<WrittenFeedbackOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();
  const { user } = useAuth();
  const isPremium = userProfile?.subscription === 'premium';


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setFeedback(null);
    
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to use this feature.' });
        return;
    }
    formData.append('userId', user.uid);

    if (!userProfile?.target?.level) {
        toast({ variant: 'destructive', title: 'Profile Incomplete', description: 'Please set your study level in your profile.' });
        return;
    }
    formData.set('level', userProfile.target.level);

    startTransition(async () => {
      const result = await generateAnswerFeedback(formData);
      if (result.success && result.feedback) {
        setFeedback(result.feedback);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  };
  
  const subjectsForLevel = userProfile?.target?.level ? subjectsByLevel[userProfile.target.level] || [] : [];
  const formDisabled = isPending || !isPremium || subjectsForLevel.length === 0 || !user;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit Your Answer</CardTitle>
          <CardDescription>
            Enter the question and your answer below to receive feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select name="subject" required disabled={formDisabled}>
                    <SelectTrigger id="subject">
                        <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {subjectsForLevel.map(subject => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-input">Exam Question</Label>
              <Textarea
                id="question-input"
                name="question"
                placeholder="Paste the full exam question here..."
                className="min-h-[100px]"
                required
                disabled={formDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer-input">Your Answer</Label>
              <Textarea
                id="answer-input"
                name="studentAnswer"
                placeholder="Paste your full written answer here..."
                className="min-h-[200px]"
                required
                disabled={formDisabled}
              />
            </div>

            {user && !isPremium && (
                <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Premium Feature</AlertTitle>
                    <AlertDescription>
                        Upgrade to StudYear Pro to get feedback on your answers.
                    </AlertDescription>
                </Alert>
            )}
             {subjectsForLevel.length === 0 && user && (
                <Alert variant="destructive">
                    <AlertDescription>
                        Please set your study level and subjects in your profile to use this feature.
                    </AlertDescription>
                </Alert>
            )}

            <Button type="submit" disabled={formDisabled}>
                 {user && !isPremium ? (
                    <>
                        <Lock className="mr-2 h-4 w-4" />
                        Upgrade to Use
                    </>
                 ) : isPending ? (
                    "Getting Feedback..."
                 ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Mark My Answer
                    </>
                 )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="min-h-[600px]">
        <CardHeader>
          <CardTitle>AI Examiner's Feedback</CardTitle>
          <CardDescription>
            Your detailed feedback and estimated mark will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-6 w-1/4 mt-4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-6 w-1/4 mt-4" />
                <Skeleton className="h-20 w-full" />
            </div>
          ) : feedback ? (
            <div className="space-y-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Estimated Mark / Grade</p>
                    <p className="text-3xl font-bold">{feedback.estimatedMark}</p>
                </div>
                
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-lg">Overall Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{feedback.overallSummary}</p>
                    </CardContent>
                </Card>

                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                    <AccordionItem value="item-0">
                        <AccordionTrigger>
                            <span className="flex items-center gap-2 font-semibold"><BarChartHorizontal/> Detailed Feedback</span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                             <div className="p-3 rounded-md bg-muted/50">
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><MessageCircle/> Structure & Clarity</h4>
                                <p className="text-sm text-muted-foreground">{feedback.detailedFeedback.structureAndClarity}</p>
                             </div>
                             <div className="p-3 rounded-md bg-muted/50">
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><BookOpen/> Knowledge & Understanding</h4>
                                <p className="text-sm text-muted-foreground">{feedback.detailedFeedback.knowledgeAndUnderstanding}</p>
                             </div>
                             <div className="p-3 rounded-md bg-muted/50">
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><UserCheck/> Use of Evidence</h4>
                                <p className="text-sm text-muted-foreground">{feedback.detailedFeedback.useOfEvidence}</p>
                             </div>
                             <div className="p-3 rounded-md bg-muted/50">
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><Award/> Exam Technique</h4>
                                <p className="text-sm text-muted-foreground">{feedback.detailedFeedback.examTechnique}</p>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                 <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><BookText className="text-primary"/> Redrafted Example</h3>
                    <blockquote className="border-l-4 border-primary pl-4 py-2 italic text-sm bg-primary/10">
                        {feedback.redraftedExample}
                    </blockquote>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Sparkles className="text-accent"/> Improvement Tips</h3>
                     <div className="text-sm text-muted-foreground">
                        <SimpleMarkdown content={feedback.improvementTips} />
                     </div>
                </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground pt-24">
              <Bot className="mx-auto h-12 w-12" />
              <p className="mt-4">Your feedback is waiting to be generated.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
