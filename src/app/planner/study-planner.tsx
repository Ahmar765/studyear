
'use client';

import { useState, useTransition, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createStudyPlan } from "@/server/actions/planner-actions";
import { useUserProfile } from "@/hooks/use-user-profile";
import { GenerateStudyPlanOutput } from "@/server/ai/flows/study-plan-generation";
import { Loader, Sparkles, Wand2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { parseProfileSubjectsList, normalizeSubjectTitle } from "@/lib/profile-academic";
import type { UserProfile } from "@/lib/firebase/services/user";

function subjectRowsFromProfile(profile: UserProfile | null): { name: string; currentGrade?: string }[] {
    if (!profile?.subjects) return [];
    const names = parseProfileSubjectsList(profile.subjects);
    const rawList = profile.subjects as unknown[];
    return names.map((name) => {
        const raw = rawList.find((s) => {
            if (typeof s === "string") return normalizeSubjectTitle(s.trim()) === name;
            if (s && typeof s === "object" && "name" in s) {
                return normalizeSubjectTitle(String((s as { name?: string }).name ?? "").trim()) === name;
            }
            return false;
        });
        let currentGrade: string | undefined;
        if (raw && typeof raw === "object" && "targetGrade" in (raw as object)) {
            const g = String((raw as { targetGrade?: string }).targetGrade ?? "").trim();
            currentGrade = g || undefined;
        }
        return { name, currentGrade };
    });
}

interface StudyPlannerProps {
    subjectsByLevel: Record<string, string[]>;
    grades: string[];
}

const getCellColor = (subject: string) => {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 60%, 90%)`;
};

const getCellTextColor = (subject: string) => {
     let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 80%, 25%)`;
}


export default function StudyPlanner({ subjectsByLevel, grades }: StudyPlannerProps) {
    const { user } = useAuth();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const [planScope, setPlanScope] = useState<"all" | "single">("all");
    const [singleSubjectName, setSingleSubjectName] = useState("");
    const [gradeOverrides, setGradeOverrides] = useState<Record<string, string>>({});
    const [examDate, setExamDate] = useState<Date>();
    const [generatedPlan, setGeneratedPlan] = useState<GenerateStudyPlanOutput | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const profileSubjectRows = useMemo(
        () => subjectRowsFromProfile(userProfile ?? null),
        [userProfile],
    );

    useEffect(() => {
        if (planScope !== "single") return;
        if (singleSubjectName) return;
        const first = profileSubjectRows[0]?.name;
        if (first) setSingleSubjectName(first);
    }, [planScope, singleSubjectName, profileSubjectRows]);

    const subjectDetails = useMemo(() => {
        const base =
            planScope === "single"
                ? singleSubjectName
                    ? profileSubjectRows.filter((r) => r.name === singleSubjectName)
                    : []
                : profileSubjectRows;
        return base.map((s) => ({
            ...s,
            currentGrade: gradeOverrides[s.name] ?? s.currentGrade,
        }));
    }, [planScope, singleSubjectName, profileSubjectRows, gradeOverrides]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        if (!examDate) {
            toast({ variant: "destructive", title: "Missing Date", description: "Please select an exam date." });
            return;
        }

        if (!user) {
            toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to create a plan." });
            return;
        }

        formData.append('subjects', JSON.stringify(subjectDetails));
        formData.append('examDate', format(examDate, 'yyyy-MM-dd'));
        formData.append('userId', user.uid);
        
        setGeneratedPlan(null);

        startTransition(async () => {
            const result = await createStudyPlan(formData);
            if (result.success && result.plan) {
                setGeneratedPlan(result.plan);
                toast({
                    title: "Plan Generated & Saved!",
                    description: "Your new study plan has been added to your calendar.",
                });
            } else {
                if (result.errorCode === 'PROFILE_INCOMPLETE') {
                    toast({
                        variant: 'destructive',
                        title: 'Profile Incomplete',
                        description: result.error,
                        action: <ToastAction altText="Complete Profile" onClick={() => router.push('/profile-setup')}>Complete Profile</ToastAction>,
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Couldn\'t create your plan',
                        description: result.error ?? 'Please try again in a moment.',
                    });
                }
            }
        });
    };
    
    const timeSlots = ["Morning", "Afternoon", "Evening"];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    return (
        <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Plan your studies</CardTitle>
                        <CardDescription>
                            Tell the AI about your goals. You can plan for <strong>all</strong> profile subjects or{" "}
                            <strong>one subject</strong> (e.g. before a single exam).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {profileLoading ? <Skeleton className="h-64 w-full" /> : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                           <div className="space-y-2">
                                <Label>Subjects in this plan</Label>
                                {profileSubjectRows.length > 0 ? (
                                    <>
                                        <Select
                                            value={planScope}
                                            onValueChange={(v) => setPlanScope(v as "all" | "single")}
                                            disabled={isPending}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All my profile subjects</SelectItem>
                                                <SelectItem value="single">One subject only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {planScope === "single" && (
                                            <Select
                                                value={singleSubjectName || undefined}
                                                onValueChange={setSingleSubjectName}
                                                disabled={isPending}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose subject" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {profileSubjectRows.map((r) => (
                                                        <SelectItem key={r.name} value={r.name}>
                                                            {r.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <div className="space-y-2 rounded-md border p-2">
                                            {subjectDetails.map((s, i) => (
                                                <div key={`${s.name}-${i}`} className="flex items-center gap-2">
                                                    <Input value={s.name} readOnly className="flex-1" />
                                                    <Select
                                                        value={s.currentGrade || undefined}
                                                        onValueChange={(grade) =>
                                                            setGradeOverrides((prev) => ({ ...prev, [s.name]: grade }))
                                                        }
                                                    >
                                                        <SelectTrigger className="w-[120px] shrink-0">
                                                            <SelectValue placeholder="Grade" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {grades.map((g) => (
                                                                <SelectItem key={g} value={g}>
                                                                    {g}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground p-2 rounded-md border">
                                        Add subjects in your{" "}
                                        <Link href="/profile-setup" className="underline">
                                            profile
                                        </Link>
                                        .
                                    </p>
                                )}
                           </div>

                             <div className="space-y-2">
                                <Label htmlFor="examDate">Primary Exam Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !examDate && "text-muted-foreground"
                                        )}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {examDate ? format(examDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={examDate}
                                            onSelect={setExamDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="hoursPerWeek">Study hours per week</Label>
                                <Input id="hoursPerWeek" name="hoursPerWeek" type="number" min="1" max="50" placeholder="e.g. 15" required disabled={isPending} />
                            </div>

                             <div className="space-y-2">
                                <Label htmlFor="targetGrade">Overall Target Grade</Label>
                                <Select name="targetGrade" required>
                                    <SelectTrigger id="targetGrade"><SelectValue placeholder="Select a grade" /></SelectTrigger>
                                    <SelectContent>{grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weaknesses">What are your weak areas? (optional)</Label>
                                <Textarea id="weaknesses" name="weaknesses" placeholder="e.g. Algebra in Maths, essay structure in History..." disabled={isPending} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="strengths">What are your strong areas? (optional)</Label>
                                <Textarea id="strengths" name="strengths" placeholder="e.g. Essay writing in English, trigonometry in Maths..." disabled={isPending} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="learningStyle">Preferred Learning Style (optional)</Label>
                                <Select name="learningStyle" disabled={isPending}>
                                    <SelectTrigger id="learningStyle"><SelectValue placeholder="Select a style" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visual">Visual (diagrams, videos)</SelectItem>
                                        <SelectItem value="auditory">Auditory (podcasts, lectures)</SelectItem>
                                        <SelectItem value="reading_writing">Reading/Writing (notes, books)</SelectItem>
                                        <SelectItem value="kinaesthetic">Kinaesthetic (practice, hands-on)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" disabled={isPending || subjectDetails.length === 0} className="w-full">
                                {isPending ? <><Loader className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Plan
                                </>}
                            </Button>
                        </form>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-3">
                <Card className="min-h-full">
                    <CardHeader>
                        <CardTitle>Your AI-Generated Study Plan</CardTitle>
                        <CardDescription>Your personalized schedule will appear here. Click on any session to find relevant resources.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isPending ? (
                            <div className="flex items-center justify-center h-96">
                                <Loader className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : generatedPlan ? (
                            <div className="space-y-8">
                                <Card className="bg-muted/50">
                                    <CardHeader>
                                        <CardTitle>Plan Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{generatedPlan.planSummary}</p>
                                    </CardContent>
                                </Card>

                                {generatedPlan.weeklyPlans.map(week => (
                                    <div key={week.week}>
                                        <h3 className="text-2xl font-bold mb-2">Week {week.week}</h3>
                                        <p className="text-muted-foreground mb-4 font-semibold">{week.weeklyGoal}</p>
                                        <div className="overflow-x-auto border rounded-lg">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[100px]">Time</TableHead>
                                                        {days.map(day => <TableHead key={day}>{day}</TableHead>)}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                {timeSlots.map(time => (
                                                    <TableRow key={time}>
                                                        <TableCell className="font-medium">{time}</TableCell>
                                                        {days.map(day => {
                                                            const dayPlan = week.dailyPlans.find(p => p.day === day);
                                                            const session = dayPlan?.sessions.find(s => s.time === time);
                                                            return (
                                                                <TableCell key={day} className="p-1 w-[120px]">
                                                                    {session && session.subject !== 'Free' ? (
                                                                        <Link href={`/search?subject=${encodeURIComponent(session.subject)}&query=${encodeURIComponent(session.topic || '')}`}>
                                                                            <div
                                                                                className="p-2 rounded-md h-full flex flex-col justify-between hover:ring-2 hover:ring-primary transition-all"
                                                                                style={{ backgroundColor: getCellColor(session.subject), color: getCellTextColor(session.subject) }}
                                                                            >
                                                                                <div>
                                                                                    <div className="flex justify-between items-center">
                                                                                        <p className="font-semibold text-sm">{session.subject}</p>
                                                                                        <Badge variant={session.priority === 'High' ? 'destructive' : session.priority === 'Medium' ? 'secondary' : 'outline'} className="text-xs">{session.priority}</Badge>
                                                                                    </div>
                                                                                    <p className="text-xs mt-1">{session.topic}</p>
                                                                                </div>
                                                                                <p className="text-xs font-medium mt-2 flex items-center gap-1 opacity-80"><Wand2 className="h-3 w-3"/> {session.revisionMethod}</p>
                                                                            </div>
                                                                        </Link>
                                                                    ) : session ? (
                                                                         <div className="p-2 rounded-md h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/50">
                                                                            <p className="font-semibold text-sm text-slate-500">{session.subject}</p>
                                                                        </div>
                                                                    ) : null}
                                                                </TableCell>
                                                            )
                                                        })}
                                                    </TableRow>
                                                ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-16">
                                <p>Fill out the form to generate your personalized study plan!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
