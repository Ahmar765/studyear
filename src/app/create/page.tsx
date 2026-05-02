
"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Newspaper, Puzzle, FilePen, Wand2, Copy, BookCopy, PlusCircle, Lock, BrainCircuit, Sigma, ListChecks, FileSignature, Image, BarChartHorizontal, Palette } from "lucide-react";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { PLAN_ENTITLEMENTS } from "@/data/entitlements";

const tools = [
  {
    title: "AI Course Generator",
    description: "Let our AI build a structured course with modules, topics, and quizzes.",
    href: "/create/ai-course",
    icon: Wand2,
    entitlement: "AI_COURSE_GENERATOR",
    enabled: true,
  },
  {
    title: "AI Essay Plan",
    description: "Generate a structured essay plan with a thesis, body paragraphs, and conclusion.",
    href: "/create/essay-plan",
    icon: FilePen,
    entitlement: "AI_STUDY_PLAN",
    enabled: true,
  },
  {
    title: "Flashcards",
    description: "Create sets of cards with questions on the front and answers on the back.",
    href: "/create/flashcards",
    icon: Copy,
    entitlement: "AI_QUIZ_GENERATION",
    enabled: true,
  },
  {
    title: "Quizzes",
    description: "Create fun, educational quizzes to test yourself and friends on any topic.",
    href: "/create/quizzes",
    icon: Puzzle,
    entitlement: "AI_QUIZ_GENERATION",
    enabled: true,
  },
  {
    title: "Topic Summary / Notes",
    description: "Generate concise summaries or revision notes from a piece of text.",
    href: "/summarizer",
    icon: FileSignature,
    entitlement: "AI_EXPLANATION",
    enabled: true,
  },
  {
    title: "Formula Sheets",
    description: "Generate a sheet of essential formulas for a science or maths subject.",
    href: "/create/formula-sheets",
    icon: Sigma,
    entitlement: "FORMULA_SHEET",
    enabled: true,
  },
  {
    title: "Mind Maps",
    description: "Visually organize information and show relationships between concepts.",
    href: "/create/mind-maps",
    icon: BrainCircuit,
    entitlement: "AI_MIND_MAP",
    enabled: true,
  },
   {
    title: "Visual Tools & Graphs",
    description: "Create custom diagrams, educational images, and data charts like bar graphs.",
    href: "/create/visual-tool",
    icon: Palette,
    entitlement: "EDUCATIONAL_IMAGE",
    enabled: true,
  },
  {
    title: "AI Blog Post",
    description: "For Admins: Generate a complete, SEO-friendly blog post from a topic.",
    href: "/create/blog",
    icon: Newspaper,
    entitlement: "ADMIN_ONLY",
    enabled: true,
  },
];


export default function CreatePage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-4 text-center items-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Create a Revision Resource</h2>
        <p className="text-muted-foreground max-w-3xl">
         Use one of our tools to create a great revision resources. Not only does the process of making your resource help you to learn but re-using it and testing yourself helps too. You can also share your resource with others to help them learn.
        </p>
         {!user && (
            <>
                <p className="text-muted-foreground max-w-3xl">
                You'll need to sign up to create your own resources, why not get started now? It's quick, easy and free to create resources!
                </p>
                <Button asChild>
                    <Link href="/signup">Sign up <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </>
         )}
      </div>

       <div className="space-y-6">
        <h3 className="text-2xl font-bold tracking-tight text-center">Pick a tool to get started</h3>
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map((tool) => {
              const isAdminTool = tool.entitlement === "ADMIN_ONLY";
              if (isAdminTool && userProfile?.role !== 'ADMIN') {
                return null;
              }

              const userSubscription = userProfile?.subscription || 'FREE';
              const userEntitlements = PLAN_ENTITLEMENTS[userSubscription as keyof typeof PLAN_ENTITLEMENTS] || [];
              const hasAccess = !tool.entitlement || isAdminTool || userEntitlements.includes(tool.entitlement as any);
              const isEnabled = tool.enabled;
              const isPremium = !!tool.entitlement && tool.entitlement !== "ADMIN_ONLY";

              return (
                <Card key={tool.title} className="flex flex-col">
                    <CardHeader className="flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-full">
                          <tool.icon className="h-6 w-6" />
                        </div>
                         <CardTitle>{tool.title}</CardTitle>
                       </div>
                       {isPremium && <Badge variant="outline" className="border-accent text-accent">Premium</Badge>}
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <CardDescription>{tool.description}</CardDescription>
                    </CardContent>
                    <div className="p-6 pt-0">
                         <Button asChild className="w-full" disabled={!isEnabled || (!hasAccess && !!user)}>
                            <Link href={user && isEnabled ? hasAccess ? tool.href : "/checkout" : "/signup"}>
                              {!user
                                ? "Sign up to Create"
                                : !isEnabled
                                ? "Coming Soon"
                                : !hasAccess
                                ? <><Lock className="mr-2"/> Upgrade to use</>
                                : <>Create <ArrowRight className="ml-2 h-4 w-4" /></>
                              }
                            </Link>
                        </Button>
                    </div>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  );
}
