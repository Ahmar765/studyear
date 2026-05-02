
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Users, Zap, Clock, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import placeholderImages from "@/app/lib/placeholder-images.json";
import { type Metadata } from 'next';
import { generateSeoMetadata } from '@/server/ai/flows/seo-generation';
import SystemVisual from "@/components/system-visual";
import { Search, CalendarCheck, TrendingUp } from "lucide-react";

const pageContent = `
  StudYear: The AI-Powered Education Operating System. We unify student data, AI-driven diagnostics, automated planning, and real-time progress tracking into a single command center for students, schools, and parents.
  Features: AI-powered planning, smarter assessments, real-time insights, automated interventions.
  Keywords: education platform, AI operating system, student data, school management system, real-time insights, smarter assessments, parent communication, student progress tracking, grade improvement.
`;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seoData = await generateSeoMetadata({
      content: pageContent,
      existingTitle: 'StudYear - The AI-Powered Education Operating System',
    });

    return {
      title: seoData.suggestedTitle,
      description: seoData.metaDescription,
      keywords: seoData.keywords,
    };
  } catch (error) {
    console.error("Failed to generate SEO for homepage, using fallback.", error);
    return {
      title: 'StudYear - The AI-Powered Education Operating System',
      description: "Unifying student data, diagnostics, planning, and progress tracking into one intelligent command center.",
    };
  }
}

const stats = [
    { value: "1.2M+", label: "Learners", icon: Users },
    { value: "2,500+", label: "Institutions", icon: GraduationCap },
    { value: "45%", label: "Avg. Time Saved", icon: Zap },
    { value: "98.6%", label: "Uptime", icon: Clock },
];

const systemOperationBlocks = [
  {
    title: "1. Assess & Diagnose",
    icon: Search,
    description: "The system ingests academic data and confidence scores to create a precise diagnostic report, identifying a student's true academic baseline and risk areas."
  },
  {
    title: "2. Plan & Automate",
    icon: CalendarCheck,
    description: "Based on the diagnostic, the AI generates a personalized, week-by-week study plan, prioritizing tasks that will have the maximum impact on grade improvement."
  },
  {
    title: "3. Execute & Improve",
    icon: TrendingUp,
    description: "Students execute their plan using AI-powered tools. The system tracks every interaction, updating progress metrics and adapting the plan in real-time."
  }
];

const testimonials = [
  {
    name: "Westwood Academy",
    location: "Manchester",
    avatar: placeholderImages.userAvatar1,
    quote: "StudYear has transformed how we track progress and support students. Our attendance improved by 12% in one term.",
    stat: "12%",
    statLabel: "Increase in Attendance",
  },
  {
    name: "Riverside College",
    location: "Bristol",
    avatar: placeholderImages.userAvatar2,
    quote: "The insights help us identify at-risk students earlier and improve outcomes. A game changer for our staff and students.",
    stat: "18%",
    statLabel: "Improvement in Outcomes",
  },
  {
    name: "Northfield Sixth Form",
    location: "Leeds",
    avatar: placeholderImages.userAvatar3,
    quote: "Communication with parents is seamless and saves us hours every week. Highly recommended.",
    stat: "45%",
    statLabel: "Time Saved Weekly",
  },
];

export default function Page() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <main className="flex-1">
        
        <section className="relative w-full py-20 md:py-32 lg:py-40">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background"></div>
          <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(hsl(var(--muted))_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col items-start space-y-8 text-left">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-medium border">The UK's AI-Powered Education OS</div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tighter">
                Turn Data Into
                <br />
                <span className="text-primary">Better Grades.</span>
              </h1>
              <p className="max-w-xl text-lg md:text-xl text-muted-foreground">
                StudYear is the command center for academic achievement. We unify diagnostics, planning, and progress tracking to create a clear, measurable path to success for every learner.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="shadow-lg shadow-primary/30">
                  <Link href="/signup">Request a Demo <ArrowRight className="ml-2" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/how-it-works">Explore Platform</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block relative aspect-video">
                 <SystemVisual
                    module="hero"
                    user_role="ADMIN"
                    intent="control"
                    className="rounded-xl shadow-2xl border object-cover"
                    priority
                    fill
                 />
            </div>
          </div>
        </section>

        <section className="w-full py-12 bg-slate-900 text-slate-50 dark:bg-slate-800">
            <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {stats.map(stat => (
                    <div key={stat.label} className="flex flex-col items-center gap-2">
                        <stat.icon className="h-8 w-8 text-primary" />
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="text-sm text-slate-400">{stat.label}</p>
                    </div>
                ))}
            </div>
        </section>

        <section className="w-full py-20 md:py-24 lg:py-32">
            <div className="container mx-auto space-y-16">
                 <div className="space-y-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How The System Operates</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">StudYear is not just a collection of tools; it's a closed-loop system designed for one purpose: measurable academic improvement.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {systemOperationBlocks.map(block => (
                        <Card key={block.title}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                                    <block.icon className="h-6 w-6"/>
                                </div>
                                <CardTitle>{block.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{block.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
        
        <section className="w-full py-20 md:py-24 lg:py-32 bg-muted/50">
          <div className="container mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Proven by Results</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">We partner with schools and colleges to deliver tangible improvements in student outcomes and operational efficiency.</p>
            </div>
            <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="text-left flex flex-col bg-background">
                  <CardContent className="p-6 space-y-4 flex-grow">
                     <blockquote className="text-muted-foreground italic border-l-2 border-primary pl-4">
                      "{testimonial.quote}"
                    </blockquote>
                     <div className="flex items-center pt-4">
                      <Image 
                        src={testimonial.avatar.src} 
                        alt={testimonial.name}
                        width={64}
                        height={64}
                        className="rounded-full mr-4"
                        data-ai-hint={testimonial.avatar.hint}
                      />
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardHeader className="p-6 bg-primary/5 rounded-b-lg border-t">
                      <p className="text-4xl font-bold text-primary">{testimonial.stat}</p>
                      <p className="text-sm font-medium text-muted-foreground">{testimonial.statLabel}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32">
          <div className="container mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
              Ready to Upgrade Your Academic Operations?
            </h2>
            <p className="max-w-xl mx-auto text-lg text-muted-foreground">
              Book a demo to see how the StudYear OS can deliver measurable results for your students or institution.
            </p>
             <div className="flex justify-center gap-4">
                <Button asChild size="lg" className="text-lg py-7 px-10">
                    <Link href="/signup">Request a Demo</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="text-lg py-7 px-10">
                    <Link href="/how-it-works">How It Works</Link>
                </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
