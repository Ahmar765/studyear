
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createAiQuiz, logQuizAttempt } from '@/server/actions/quiz-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Bot, HelpCircle, CheckCircle, Lightbulb, XCircle, BookCheck } from 'lucide-react';
import { GenerateQuizOutput, QuizQuestion } from '@/server/ai/flows/quiz-generation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { SaveGeneratedResourceButton } from '@/components/save-generated-resource-button';
import { Textarea } from '@/components/ui/textarea';

interface QuizGeneratorProps {
    levels: string[];
    subjectsByLevel: Record<string, string[]>;
}

interface QuizWithId extends GenerateQuizOutput {
    id: string;
}

export default function QuizGenerator({ levels, subjectsByLevel }: QuizGeneratorProps) {
  const { user } = useAuth();
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizWithId | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const { toast } = useToast();

  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const subjectsForLevel = selectedLevel ? subjectsByLevel[selectedLevel] || [] : [];

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  const handleQuizSubmit = () => {
    if (!generatedQuiz || !user) return;
    const mcQuestions = generatedQuiz.questions.filter(q => q.questionType === 'multiple-choice');
    let correctAnswers = 0;
    generatedQuiz.questions.forEach((q, index) => {
      if (q.questionType === 'multiple-choice' && userAnswers[index] === q.answer) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    setSubmitted(true);
    
    if (mcQuestions.length > 0) {
        logQuizAttempt({
            quizId: generatedQuiz.id,
            studentId: user.uid,
            subjectId: generatedQuiz.subject,
            score: correctAnswers,
            outOf: mcQuestions.length
        });
    }
  };

  const resetQuiz = () => {
    setGeneratedQuiz(null);
    setUserAnswers({});
    setSubmitted(false);
    setScore(0);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    resetQuiz();

    if (!user) {
        toast({ variant: 'destructive', title: "Authentication Error", description: "You must be logged in to create a quiz." });
        return;
    }
    formData.append('userId', user.uid);

    startTransition(async () => {
      const result = await createAiQuiz(formData);
      if (result.success && result.quiz) {
        setGeneratedQuiz(result.quiz as QuizWithId);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  };

  const allQuestionsAnswered = generatedQuiz ? Object.keys(userAnswers).length === generatedQuiz.questions.length : false;
  
  const mcqCount = generatedQuiz?.questions.filter(q => q.questionType === 'multiple-choice').length || 0;


  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Generate a Practice Quiz</CardTitle>
            <CardDescription>Let our AI create a mix of multiple-choice and short-answer questions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="level">Study Level</Label>
                <Select name="level" required disabled={isPending} onValueChange={setSelectedLevel}>
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedLevel && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select name="subject" required disabled={isPending || subjectsForLevel.length === 0}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsForLevel.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="topic-input">Topic</Label>
                <Input id="topic-input" name="topic" placeholder="e.g. The Cold War" required disabled={isPending} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfQuestions">Number of Questions (3-10)</Label>
                <Input
                  id="numberOfQuestions"
                  name="numberOfQuestions"
                  type="number"
                  min="3"
                  max="10"
                  defaultValue="5"
                  required
                  disabled={isPending}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  'Generating...'
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="min-h-full">
          <CardHeader>
            <CardTitle>Practice Mode</CardTitle>
            <CardDescription>Your AI-generated quiz will appear below. Answer all questions to submit.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="space-y-6">
                <Skeleton className="h-8 w-3/4" />
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ) : generatedQuiz ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">{generatedQuiz.quizTitle}</h2>

                {submitted && (
                    <Alert variant={mcqCount > 0 && score / mcqCount >= 0.7 ? "default" : "destructive"}>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Quiz Complete!</AlertTitle>
                        <AlertDescription>
                             {mcqCount > 0 
                                ? `You scored ${score} out of ${mcqCount} on the multiple-choice questions. Review the model answers for the short-answer questions below.`
                                : "Quiz complete! Review the model answers for the short-answer questions below."
                            }
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-8">
                  {generatedQuiz.questions.map((q, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <p className="font-semibold mb-4 flex items-start gap-2">
                        <HelpCircle className="h-5 w-5 mt-0.5 shrink-0" />
                        <span>{`Question ${index + 1}: ${q.question}`}</span>
                      </p>
                      
                      {q.questionType === 'multiple-choice' && q.options ? (
                          <RadioGroup 
                            disabled={submitted} 
                            value={userAnswers[index]}
                            onValueChange={(value) => handleAnswerChange(index, value)}
                          >
                            <div className="space-y-2">
                              {q.options.map((option, i) => {
                                const isCorrect = option === q.answer;
                                const isSelected = userAnswers[index] === option;
                                
                                return (
                                    <div
                                    key={i}
                                    className={cn(
                                        "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                        submitted && isCorrect && "bg-green-100 dark:bg-green-900/50",
                                        submitted && isSelected && !isCorrect && "bg-red-100 dark:bg-red-900/50"
                                    )}
                                    >
                                    <RadioGroupItem value={option} id={`q${index}-option${i}`} />
                                    <Label htmlFor={`q${index}-option${i}`}>{option}</Label>
                                    {submitted && isCorrect && <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />}
                                    {submitted && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600 ml-auto" />}
                                    </div>
                                )
                              })}
                            </div>
                          </RadioGroup>
                      ) : (
                        <>
                            <Textarea
                                placeholder="Type your answer here..."
                                disabled={submitted}
                                value={userAnswers[index] || ''}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                            />
                            {submitted && (
                                <Card className="mt-4 bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2"><BookCheck className="h-5 w-5 text-primary"/> Model Answer</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-wrap">{q.answer}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                 <div className="flex flex-wrap items-center gap-4 mt-6">
                    <SaveGeneratedResourceButton
                      resourceType="QUIZ"
                      title={generatedQuiz.quizTitle || 'Practice quiz'}
                      content={generatedQuiz}
                      linkedEntityId={generatedQuiz.id}
                    />
                    {!submitted ? (
                    <Button onClick={handleQuizSubmit} disabled={!allQuestionsAnswered}>
                        Submit Quiz
                    </Button>
                    ) : (
                    <Button onClick={resetQuiz} variant="outline">
                        Create Another Quiz
                    </Button>
                    )}
                 </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <Bot className="mx-auto h-12 w-12" />
                <p className="mt-4">Your quiz is waiting to be generated.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
