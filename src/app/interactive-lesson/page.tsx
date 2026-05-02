
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Bot, Loader, Sparkles } from 'lucide-react';
import { createLesson, getNextStep, createQuiz } from '@/server/actions/interactive-lesson-actions';
import { GenerateInteractiveLessonOutput } from '@/server/ai/flows/ai-lesson-generation';
import LessonDisplay from './lesson-display';
import QuizDisplay from './quiz-display';
import { GenerateQuizOutput } from '@/server/ai/flows/quiz-generation';
import { useAuth } from '@/hooks/use-auth';

type LessonState = 'idle' | 'generating_lesson' | 'in_lesson' | 'generating_quiz' | 'in_quiz' | 'complete';

export default function InteractiveLessonPage() {
  const [topic, setTopic] = useState('');
  const [lesson, setLesson] = useState<GenerateInteractiveLessonOutput | null>(null);
  const [lessonContent, setLessonContent] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [quiz, setQuiz] = useState<GenerateQuizOutput | null>(null);
  const [lessonState, setLessonState] = useState<LessonState>('idle');
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleStartLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    if (!user) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to create a lesson.' });
        return;
    }

    setLesson(null);
    setLessonContent([]);
    setCurrentStep(0);
    setQuiz(null);
    setLessonState('generating_lesson');

    startTransition(async () => {
      const result = await createLesson(topic, user.uid);
      if (result.success && result.lesson) {
        setLesson(result.lesson);
        setLessonContent([result.lesson.firstStepContent]);
        setCurrentStep(1);
        setLessonState('in_lesson');
        toast({ title: 'Lesson Saved', description: 'This lesson has been saved to your personal library.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
        setLessonState('idle');
      }
    });
  };

  const handleNextStep = async () => {
      if (!lesson || currentStep >= lesson.lessonPlan.length) return;

      startTransition(async () => {
          const result = await getNextStep(lesson.lessonPlan, currentStep, topic);
          if (result.success && result.response) {
              setLessonContent(prev => [...prev, result.response]);
              setCurrentStep(prev => prev + 1);
          } else {
              toast({ variant: 'destructive', title: 'Error', description: "Could not load the next step."})
          }
      })
  }

  const handleStartQuiz = async () => {
      if (!lesson) return;
      setLessonState('generating_quiz');
      startTransition(async () => {
          const result = await createQuiz(lesson.lessonTitle, "A-Level"); // Assuming a level for now
          if (result.success && result.quiz) {
              setQuiz(result.quiz);
              setLessonState('in_quiz');
          } else {
              toast({ variant: 'destructive', title: 'Error', description: 'Could not generate the quiz.' });
              setLessonState('in_lesson'); // Revert state
          }
      });
  }

  const handleQuizComplete = (score: number, total: number) => {
      setLessonState('complete');
      toast({
          title: "Lesson Complete!",
          description: `You scored ${score}/${total} on the quiz. Great work!`
      })
  }
  
  const handleReset = () => {
      setTopic('');
      setLesson(null);
      setLessonContent([]);
      setCurrentStep(0);
      setQuiz(null);
      setLessonState('idle');
  }

  const isLoading = lessonState === 'generating_lesson' || lessonState === 'generating_quiz' || isPending;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-start space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Interactive Lesson</h2>
        <p className="text-muted-foreground max-w-2xl">
          Enter any topic and our AI will generate a structured lesson, walk you through the material, and quiz you at the end.
        </p>
      </div>

      {lessonState === 'idle' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Start a New Lesson</CardTitle>
            <CardDescription>What would you like to learn about today?</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartLesson} className="flex items-center gap-2">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Quantum Physics, The French Revolution..."
                disabled={isLoading}
                autoComplete="off"
              />
              <Button type="submit" disabled={isLoading || !topic.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Lesson
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(lessonState === 'generating_lesson' || lessonState === 'generating_quiz') && (
        <div className="flex flex-col items-center justify-center text-center gap-4 p-8">
            <Loader className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-xl font-semibold">
                {lessonState === 'generating_lesson' ? `Building your lesson on "${topic}"...` : 'Preparing your quiz...'}
            </h3>
            <p className="text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
      )}

      {lesson && (lessonState === 'in_lesson' || lessonState === 'in_quiz' || lessonState === 'complete') && (
        <LessonDisplay
            lesson={lesson}
            lessonContent={lessonContent}
            currentStep={currentStep}
            isPending={isPending}
            onNextStep={handleNextStep}
            onStartQuiz={handleStartQuiz}
        >
            {lessonState === 'in_quiz' && quiz && (
                <QuizDisplay quiz={quiz} onQuizComplete={handleQuizComplete} />
            )}
            {lessonState === 'complete' && (
                 <Card className="mt-8 text-center">
                    <CardHeader>
                        <CardTitle>Congratulations!</CardTitle>
                        <CardDescription>You have completed the lesson on "{lesson.lessonTitle}".</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleReset}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Start a New Lesson
                        </Button>
                    </CardContent>
                </Card>
            )}
        </LessonDisplay>
      )}
    </div>
  );
}
