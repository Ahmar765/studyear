import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Users,
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  Search,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { type Metadata } from 'next';
import { generateSeoMetadata } from '@/server/ai/flows/seo-generation';
import SystemVisual from '@/components/system-visual';
import {
  getPublicHomeStats,
  formatHomeStatCount,
} from '@/server/lib/public-home-stats';

/** Homepage counters refresh periodically; avoids stale builds claiming fictitious scale. */
export const revalidate = 300;

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

const platformValueProps = [
  {
    title: 'Visibility across the learner journey',
    description:
      'Diagnostics, plans, and activity stay linked so tutors and families see progress without stitching spreadsheets together.',
  },
  {
    title: 'Planning that reacts to real weakness',
    description:
      'Study priorities adapt when mastery shifts — supporting interventions before gaps snowball into grade shocks.',
  },
  {
    title: 'Built for trusted partnerships',
    description:
      'StudYear is designed alongside schools and parents with transparent roles, permissions, and audit-friendly workflows.',
  },
];

export default async function Page() {
  const live = await getPublicHomeStats();
  const heroStats = [
    {
      value: formatHomeStatCount(live.studentAccounts),
      label: 'Student accounts',
      icon: Users,
    },
    {
      value: formatHomeStatCount(live.partnerSchools),
      label: 'Partner organisations',
      icon: GraduationCap,
    },
    {
      value: formatHomeStatCount(live.communityResources),
      label: 'Study resources shared',
      icon: BookOpen,
    },
    {
      value: formatHomeStatCount(live.totalUserProfiles),
      label: 'User profiles created',
      icon: LayoutDashboard,
    },
  ];

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
            <div className="container mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {heroStats.map((stat) => (
                    <div key={stat.label} className="flex flex-col items-center gap-2">
                        <stat.icon className="h-8 w-8 text-primary" />
                        <p className="text-3xl font-bold tabular-nums">{stat.value}</p>
                        <p className="text-sm text-slate-400">{stat.label}</p>
                    </div>
                ))}
              </div>
              <p className="mt-6 text-center text-xs text-slate-500">
                Live totals from StudYear&apos;s database (student role count, registered organisations, shared catalogue items, all user profiles).
                Figures refresh about every five minutes. Em dash (—) means zero or unavailable.
              </p>
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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Designed for measurable improvement</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We share live usage totals above instead of invented benchmarks. Outcomes depend on your context —
                StudYear focuses on consistent workflows, safer visibility, and faster coordination between students, schools, and families.
              </p>
            </div>
            <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              {platformValueProps.map((item) => (
                <Card key={item.title} className="bg-background">
                  <CardHeader>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
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
