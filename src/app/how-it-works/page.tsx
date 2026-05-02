
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit, CalendarCheck, GraduationCap, LineChart, Fuel, ShieldCheck, UserCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const howItWorksSteps = [
    {
        icon: BrainCircuit,
        title: "1. Assess: Find Your Academic Baseline",
        description: "Our AI starts by understanding your academic position. It analyzes your subjects, current grades, and confidence levels to identify your unique strengths and weaknesses, generating a personal diagnostic report."
    },
    {
        icon: CalendarCheck,
        title: "2. Plan: Get Your Personalised AI Roadmap",
        description: "Based on your assessment, the AI generates a personalised, week-by-week study plan. It prioritizes topics that will have the biggest impact on your grades and tells you not just *what* to revise, but *how* to revise it effectively."
    },
    {
        icon: GraduationCap,
        title: "3. Learn: Use AI-Powered Tools",
        description: "Execute your plan using our suite of AI tools. Generate interactive lessons, create flashcards and quizzes, get instant feedback on your essays, and ask our AI Tutor questions 24/7. Each action uses a small amount of your ACU balance."
    },
    {
        icon: LineChart,
        title: "4. Improve: Track & Adapt",
        description: "Your dashboard updates in real-time with every quiz you take and every lesson you complete. The platform constantly refines your predicted grades and adapts your study plan to keep you on the fastest path to success."
    },
];

const acuExplanationSteps = [
    {
        title: "What are ACUs?",
        description: "ACU stands for AI Credit Unit. Think of it as the currency you use to power the AI features on the StudYear platform. Every time you use an AI tool—like generating a course or getting essay feedback—it consumes a small number of ACUs."
    },
    {
        title: "Why Use Credits?",
        description: "This system ensures you have direct control over your usage and costs. Instead of a high, flat subscription fee, our prepaid model means you only pay for the AI you actually use. There are no surprise bills, ever."
    },
    {
        title: "How It Works",
        description: "You top up your ACU Wallet by purchasing a credit pack from the Checkout page. Your ACU balance is always visible in the top navigation bar. When your balance runs low, simply top up to continue using the AI features."
    }
];

export default function HowItWorksPage() {
  return (
    <div className="flex-1 space-y-12 p-4 md:p-8 bg-background">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-primary">How StudYear Delivers Better Grades</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A simple, powerful four-step loop designed to turn academic stress into ambitious results.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {howItWorksSteps.map((step) => (
            <Card key={step.title} className="overflow-hidden">
                 <div className="grid md:grid-cols-3 items-center">
                    <div className="p-8 bg-primary/5 flex items-center justify-center md:h-full">
                        <step.icon className="w-16 h-16 text-primary" />
                    </div>
                    <div className="md:col-span-2 p-6">
                        <CardTitle className="text-2xl mb-2">{step.title}</CardTitle>
                        <CardDescription className="text-base">{step.description}</CardDescription>
                    </div>
                </div>
            </Card>
        ))}
      </div>

      <Separator className="my-16" />

      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">The AI Credit Unit (ACU) System</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          The fuel that powers your AI learning engine, designed for transparency and control.
        </p>
      </div>

      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {acuExplanationSteps.map((step, index) => (
              <Card key={index}>
                  <CardHeader>
                      <div className="flex items-center gap-3">
                          <div className="bg-accent/10 text-accent p-3 rounded-full">
                              <Fuel className="w-6 h-6"/>
                          </div>
                          <CardTitle>{step.title}</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
              </Card>
          ))}
      </div>

      <Separator className="my-16" />

       <Card className="max-w-4xl mx-auto bg-muted/50 border-dashed">
            <CardHeader className="text-center">
                <CardTitle>What You Remain Responsible For</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-8 text-center">
                <div className="flex flex-col items-center gap-2">
                    <UserCheck className="w-8 h-8 text-primary" />
                    <h3 className="font-semibold">Final Review</h3>
                    <p className="text-sm text-muted-foreground">AI outputs are powerful aids, not final answers. You are always responsible for reviewing, editing, and verifying the accuracy of AI-generated content before submission or use.</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    <h3 className="font-semibold">Account Security</h3>
                    <p className="text-sm text-muted-foreground">You are responsible for safeguarding your account credentials and for all activity that occurs under your account. Do not share your login details with others.</p>
                </div>
            </CardContent>
        </Card>

        <div className="text-center max-w-2xl mx-auto pt-8">
            <h2 className="text-3xl font-bold tracking-tight">Ready to Start?</h2>
            <p className="mt-4 text-muted-foreground">
                Take the first step towards better grades. Generate your free, personalized AI diagnostic report and see your path to success.
            </p>
            <Button asChild size="lg" className="mt-6">
                <Link href="/signup">Start My Free Assessment <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>

    </div>
  );
}
