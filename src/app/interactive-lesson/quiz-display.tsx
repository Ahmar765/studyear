
'use client';

import { GenerateQuizOutput } from "@/server/ai/flows/quiz-generation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { CheckCircle, HelpCircle, Lightbulb, XCircle } from "lucide-react";
import { useState } from "react";


interface QuizDisplayProps {
    quiz: GenerateQuizOutput;
    onQuizComplete: (score: number, total: number) => void;
}

export default function QuizDisplay({ quiz, onQuizComplete }: QuizDisplayProps) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  const handleQuizSubmit = () => {
    let correctAnswers = 0;
    quiz.questions.forEach((q, index) => {
      if (userAnswers[index] === q.answer) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    setSubmitted(true);
    onQuizComplete(correctAnswers, quiz.questions.length);
  };

  const allQuestionsAnswered = Object.keys(userAnswers).length === quiz.questions.length;

  return (
      <Card className="mt-8">
          <CardHeader>
              <CardTitle>{quiz.quizTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
              {submitted && (
                  <Alert variant={score / quiz.questions.length >= 0.7 ? "default" : "destructive"}>
                      <Lightbulb className="h-4 w-4" />
                      <AlertTitle>Quiz Complete!</AlertTitle>
                      <AlertDescription>
                          You scored {score} out of {quiz.questions.length}.
                      </AlertDescription>
                  </Alert>
              )}

              <div className="space-y-8">
                  {quiz.questions.map((q, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                          <p className="font-semibold mb-4 flex items-start gap-2">
                              <HelpCircle className="h-5 w-5 mt-0.5" />
                              <span>{`Question ${index + 1}: ${q.question}`}</span>
                          </p>
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
                      </div>
                  ))}
              </div>
              {!submitted && (
                  <Button onClick={handleQuizSubmit} disabled={!allQuestionsAnswered}>
                      Submit Quiz
                  </Button>
              )}
          </CardContent>
      </Card>
  )
}
