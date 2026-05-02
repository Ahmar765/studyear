
'use client';

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Bot, GraduationCap, Target, AlertCircle, BarChart, BrainCircuit, Flag, Zap } from "lucide-react";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useAuth } from "@/hooks/use-auth";
import { GenerateExamPredictionOutput } from "@/server/ai/flows/exam-prediction-generation";
import { generateGradePredictionAction } from "@/server/actions/prediction-actions";
import { getStudentProgressAction } from "@/server/actions/progress-actions";

interface SubjectProgress {
    name: string;
    progress: number;
    targetGrade: string;
}

export default function PredictGradePage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [prediction, setPrediction] = useState<GenerateExamPredictionOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [progressData, setProgressData] = useState<SubjectProgress[]>([]);
  const [isFetchingProgress, setIsFetchingProgress] = useState(true);

  useEffect(() => {
    if (user) {
      setIsFetchingProgress(true);
      getStudentProgressAction(user.uid).then(data => {
        setProgressData(data);
        setIsFetchingProgress(false);
      });
    } else {
      setIsFetchingProgress(false);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !selectedSubject) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a subject.' });
        return;
    }
    
    const subjectData = userProfile.subjects?.find(s => s.name === selectedSubject);
    if (!subjectData) {
         toast({ variant: 'destructive', title: 'Error', description: 'Subject data not found in your profile.' });
        return;
    }

    const currentProgress = progressData.find(p => p.name === selectedSubject);

    if (!currentProgress || currentProgress.progress < 10) {
        toast({
            variant: 'destructive',
            title: 'Not Enough Data',
            description: `There is not enough activity recorded for ${selectedSubject} to generate an accurate prediction. Please complete some quizzes or lessons first.`
        });
        return;
    }

    setPrediction(null);
    startTransition(async () => {
        const result = await generateGradePredictionAction({
            userId: user.uid,
            subject: selectedSubject,
            progress: currentProgress.progress,
            targetGrade: subjectData.targetGrade || "N/A",
        });

        if (result.success && result.prediction) {
            setPrediction(result.prediction);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    });
  }

  const loading = profileLoading || isFetchingProgress;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-start space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Grade Predictor</h2>
        <p className="text-muted-foreground max-w-2xl">
          Select a subject to get an AI-powered grade prediction and analysis based on your current progress.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Generate Prediction</CardTitle>
              <CardDescription>Select one of your subjects to analyze.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40" /> : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject} required>
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {userProfile?.subjects?.map(s => (
                          <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isPending || !selectedSubject}>
                    {isPending ? "Predicting..." : <><Sparkles className="mr-2 h-4 w-4" /> Predict My Grade</>}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="min-h-full">
            <CardHeader>
              <CardTitle>Prediction Analysis</CardTitle>
              <CardDescription>Your grade prediction will appear below.</CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="space-y-6">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-6 w-1/3 mt-4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : prediction ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <Card className="p-4">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"><GraduationCap/> Predicted Grade</CardTitle>
                      <p className="text-5xl font-bold">{prediction.predictedGrade}</p>
                    </Card>
                     <Card className="p-4 bg-muted/50">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"><Zap/> Risk Score</CardTitle>
                      <p className="text-5xl font-bold">{prediction.riskScore}%</p>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Flag /> Explanation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground italic">"{prediction.explanation}"</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <Bot className="mx-auto h-12 w-12" />
                  <p className="mt-4">Your prediction is waiting to be generated.</p>
                  <p className="text-xs mt-2">(This requires recorded activity like quiz scores for the selected subject).</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
