
'use client';
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Bot, BookOpen, CheckCircle, HelpCircle, Lightbulb, Activity, VideoIcon, ClipboardList, BookCopy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { generateCourseAction, getSimilarContentAction } from "@/server/actions/ai-course-actions";
import { GenerateCourseOutput } from "@/server/ai/flows/course-generation";
import { Separator } from "@/components/ui/separator";
import { SaveGeneratedResourceButton } from "@/components/save-generated-resource-button";

interface AiCourseGeneratorProps {
    levels: string[];
    subjectsByLevel: Record<string, string[]>;
    examBoards: string[];
}

interface Recommendation {
    title: string;
    reasoning: string;
}

/** Radix Select forbids `value=""` on items; server treats this as “no exam board”. */
const EXAM_BOARD_ANY = "__exam_board_any__";

const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    return (
        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none">
            {lines.map((line, index) => {
                if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(3)}</h2>;
                }
                if (line.startsWith('* ')) {
                    return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>
                }
                 if (line.trim() === '') {
                    return <br key={index} />;
                }
                return <p key={index} className="mb-1">{line}</p>;
            })}
        </div>
    );
};


export default function AiCourseGenerator({ levels, subjectsByLevel, examBoards }: AiCourseGeneratorProps) {
  const [generatedCourse, setGeneratedCourse] = useState<GenerateCourseOutput | null>(null);
  const [similarContent, setSimilarContent] = useState<Recommendation[]>([]);
  const [isGeneratingCourse, startCourseTransition] = useTransition();
  const [isFetchingSimilar, startSimilarTransition] = useTransition();
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [optionalExamBoard, setOptionalExamBoard] = useState<string>(EXAM_BOARD_ANY);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isPending = isGeneratingCourse || isFetchingSimilar;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (optionalExamBoard === EXAM_BOARD_ANY) {
      formData.delete("examBoard");
    } else {
      formData.set("examBoard", optionalExamBoard);
    }
    setGeneratedCourse(null);
    setSimilarContent([]);

    startCourseTransition(async () => {
      if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create a course." });
        return;
      }
      formData.append('userId', user.uid);
      const result = await generateCourseAction(formData);

      if (result.success && result.course) {
        setGeneratedCourse(result.course);

        startSimilarTransition(async () => {
          if (!user) return;
          const similarResult = await getSimilarContentAction(formData, user.uid);
          if (similarResult.success && similarResult.recommendations) {
            setSimilarContent(similarResult.recommendations);
          }
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "An unexpected error occurred while generating the course.",
        });
      }
    });
  };

  const subjectsForLevel = selectedLevel ? subjectsByLevel[selectedLevel] || [] : [];

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Generate a Course</CardTitle>
            <CardDescription>
              Let our AI create a structured course for any topic.
            </CardDescription>
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
                      {levels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
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
                                {subjectsForLevel.map(subject => (
                                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
              <div className="space-y-2">
                <Label htmlFor="topic-input">Topic</Label>
                <Input
                  id="topic-input"
                  name="topic"
                  placeholder="e.g. The Cold War"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-board">Exam Board (Optional)</Label>
                <Select
                  value={optionalExamBoard}
                  onValueChange={setOptionalExamBoard}
                  disabled={isPending}
                >
                  <SelectTrigger id="exam-board">
                    <SelectValue placeholder="Select an exam board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EXAM_BOARD_ANY}>Any</SelectItem>
                    {examBoards.map(board => (
                      <SelectItem key={board} value={board}>{board}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Generating..." : <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Course
                  </>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2 space-y-8">
        <Card className="min-h-full">
            <CardHeader>
                <CardTitle>Generated Course Outline</CardTitle>
                <CardDescription>
                    Your AI-generated course will appear below.
                </CardDescription>
            </CardHeader>
            <CardContent>
            {isGeneratingCourse ? (
                <div className="space-y-6">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            ) : generatedCourse ? (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">{generatedCourse.courseTitle}</h2>
                    <p className="text-muted-foreground italic">"{generatedCourse.courseObjective}"</p>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Level: {generatedCourse.level}</Badge>
                        <Badge variant="outline">Duration: {generatedCourse.estimatedDuration}</Badge>
                    </div>
                    
                    <Separator />
                    
                    <h3 className="text-xl font-semibold">Modules</h3>
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                        {generatedCourse.modules.map((module, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger>
                                <span className="flex items-center gap-3 text-lg"><BookCopy className="h-5 w-5 text-primary"/> Module {index + 1}: {module.moduleTitle}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pl-4 space-y-6 border-l-2 ml-3">
                                <p className="italic text-muted-foreground">{module.moduleObjective}</p>
                                
                                <h4 className="font-semibold text-base mt-4">Lessons</h4>
                                <Accordion type="multiple" className="w-full">
                                    {module.lessons.map((lesson, lessonIndex) => (
                                        <AccordionItem value={`lesson-${lessonIndex}`} key={lessonIndex}>
                                            <AccordionTrigger className="text-base">{lesson.lessonTitle}</AccordionTrigger>
                                            <AccordionContent className="pl-4 space-y-4 text-sm">
                                                <div>
                                                    <h5 className="font-semibold mb-2">Content</h5>
                                                    <SimpleMarkdown content={lesson.lessonContent} />
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold mb-2">Worked Example</h5>
                                                    <pre className="bg-muted/50 p-3 rounded-md text-xs whitespace-pre-wrap font-mono">{lesson.workedExample}</pre>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold mb-2">Practice Questions</h5>
                                                    <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                                                        {lesson.practiceQuestions.map((q, i) => <li key={i}>{q}</li>)}
                                                    </ul>
                                                </div>
                                                {lesson.miniQuiz.length > 0 && (
                                                    <div>
                                                        <h5 className="font-semibold mb-2">Mini Quiz</h5>
                                                        {lesson.miniQuiz.map((q, i) => (
                                                            <div key={i} className="p-3 bg-muted/50 rounded-md mb-2">
                                                                <p className="font-semibold flex items-start gap-2"><HelpCircle className="h-4 w-4 mt-0.5 shrink-0"/>{q.question}</p>
                                                                <p className="text-muted-foreground flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 shrink-0"/>{q.answer}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                                
                                <Separator />
                                
                                <div>
                                    <h4 className="font-semibold mb-2 text-base">Module Assessment</h4>
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-semibold">Questions:</h5>
                                        <ul className="list-decimal pl-5 text-sm text-muted-foreground">
                                            {module.moduleAssessment.questions.map((q, i) => <li key={i}>{q}</li>)}
                                        </ul>
                                    </div>
                                     <div className="space-y-2 mt-4">
                                        <h5 className="text-sm font-semibold">Mark Scheme:</h5>
                                         <ul className="list-decimal pl-5 text-sm text-muted-foreground">
                                            {module.moduleAssessment.markScheme.map((m, i) => <li key={i}>{m}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                    
                    {generatedCourse.finalAssessment && (
                        <Card className="mt-8 bg-muted/50">
                            <CardHeader>
                                <CardTitle>Final Course Assessment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <h5 className="font-semibold">Questions:</h5>
                                    <ul className="list-decimal pl-5 text-sm text-muted-foreground">
                                        {generatedCourse.finalAssessment.questions.map((q, i) => <li key={i}>{q}</li>)}
                                    </ul>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <h5 className="font-semibold">Mark Scheme:</h5>
                                    <ul className="list-decimal pl-5 text-sm text-muted-foreground">
                                        {generatedCourse.finalAssessment.markScheme.map((m, i) => <li key={i}>{m}</li>)}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                      <SaveGeneratedResourceButton
                        resourceType="AI_COURSE"
                        title={generatedCourse.courseTitle}
                        content={generatedCourse}
                      />
                    </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <Bot className="mx-auto h-12 w-12" />
                    <p className="mt-4">Your course outline is waiting to be generated.</p>
                </div>
            )}
            </CardContent>
        </Card>
        
        {(isFetchingSimilar || similarContent.length > 0) && (
            <Card>
                <CardHeader>
                    <CardTitle>Related Topics & Recommendations</CardTitle>
                    <CardDescription>Broaden your understanding with these related topics.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isFetchingSimilar ? (
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-6 w-1/2 mt-4" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {similarContent.map((rec, index) => (
                                <li key={index} className="p-3 bg-muted/50 rounded-lg">
                                    <p className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-accent" /> {rec.title}</p>
                                    <p className="text-sm text-muted-foreground pl-6">{rec.reasoning}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
