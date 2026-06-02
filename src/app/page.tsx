import { type Metadata } from 'next';
import { generateSeoMetadata } from '@/server/ai/flows/seo-generation';
import { getPublicHomeStats } from '@/server/lib/public-home-stats';
import { PremiumLanding } from '@/components/marketing/premium-landing';

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
    console.error('Failed to generate SEO for homepage, using fallback.', error);
    return {
      title: 'StudYear - The AI-Powered Education Operating System',
      description:
        'Unifying student data, diagnostics, planning, and progress tracking into one intelligent command center.',
    };
  }
}

export default async function Page() {
  const stats = await getPublicHomeStats();
  return <PremiumLanding stats={stats} />;
}
