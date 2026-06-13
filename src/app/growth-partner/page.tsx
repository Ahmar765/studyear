import { GrowthPartnerDashboard } from '@/components/growth-partner/growth-partner-dashboard';

export const metadata = {
  title: 'Growth Partner Programme | StudYear',
  description:
    'Refer learning. Earn rewards. StudYear only rewards verified, retained, revenue-generating referrals.',
};

export default function GrowthPartnerPage() {
  return (
    <div className="container max-w-5xl py-8 md:py-12">
      <GrowthPartnerDashboard />
    </div>
  );
}
