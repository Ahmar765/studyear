
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Rocket, BrainCircuit, Users, Zap, ShieldCheck } from "lucide-react";
import { type Metadata } from 'next';
import { generateSeoMetadata } from '@/server/ai/flows/seo-generation';

const pageContent = `
  About StudYear: We are building the academic command centre for students who are serious about their grades. Our mission is to replace study-related stress and uncertainty with a clear, AI-powered path to success.
  We solve the problem of "What do I revise?" by using AI to diagnose, plan, and support your learning journey from start to finish. Our platform is built on a prepaid ACU (AI Credit Unit) model, ensuring transparent, controlled costs for powerful AI features.
`;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seoData = await generateSeoMetadata({
      content: pageContent,
      existingTitle: 'About StudYear',
    });

    return {
      title: seoData.suggestedTitle,
      description: seoData.metaDescription,
      keywords: seoData.keywords,
    };
  } catch (error) {
    console.error("Failed to generate SEO for about page, using fallback.", error);
    return {
      title: 'About StudYear | The AI-Powered Academic Command Centre',
      description: 'Learn about StudYear\'s mission to replace study stress with a clear, AI-powered path to academic success. Discover our unique approach to learning.',
    };
  }
}

export default function AboutUsPage() {
  return (
    <div className="flex-1 space-y-12 p-4 md:p-8 bg-background">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Your Academic Command Centre</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          StudYear exists to solve one problem: turning the chaos of revision into a clear, measurable, and intelligent path to better grades.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full">
                        <Rocket className="w-6 h-6" />
                    </div>
                    <CardTitle>Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        To guide every student from "I don’t know what to revise" to "I have a personalized plan, AI support, and expert help," enabling them to measurably improve their grades and build lasting academic confidence.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full">
                        <Target className="w-6 h-6" />
                    </div>
                    <CardTitle>Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        A world where every student has access to personalized learning tools that adapt to their unique needs, eliminate study-related stress, and unlock their full academic potential.
                    </p>
                </CardContent>
            </Card>
        </div>

        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-2xl">What Makes StudYear Different?</CardTitle>
                <CardDescription>We are not another content library. We are an AI-powered operating system for your academic success.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <div className="flex flex-col items-center text-center p-4 rounded-lg">
                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-3"><Zap className="w-6 h-6"/></div>
                    <h3 className="font-semibold">Diagnostic First</h3>
                    <p className="text-sm text-muted-foreground">We start by understanding where you are, not just where you want to be.</p>
                </div>
                 <div className="flex flex-col items-center text-center p-4 rounded-lg">
                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-3"><BrainCircuit className="w-6 h-6"/></div>
                    <h3 className="font-semibold">Intelligent Automation</h3>
                    <p className="text-sm text-muted-foreground">Our AI builds and adapts your plan, saving you from manual, low-impact work.</p>
                </div>
                 <div className="flex flex-col items-center text-center p-4 rounded-lg">
                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-3"><Users className="w-6 h-6"/></div>
                    <h3 className="font-semibold">Built for You</h3>
                    <p className="text-sm text-muted-foreground">From GCSE and A-Level students to University undergraduates, the platform adapts to your level.</p>
                </div>
                 <div className="flex flex-col items-center text-center p-4 rounded-lg">
                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-3"><ShieldCheck className="w-6 h-6"/></div>
                    <h3 className="font-semibold">Trust & Transparency</h3>
                    <p className="text-sm text-muted-foreground">Our prepaid ACU model means no surprise bills. You are always in control of your usage and spending.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
