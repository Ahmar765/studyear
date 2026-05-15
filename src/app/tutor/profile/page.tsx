import Link from 'next/link';
import { TutorSubPage } from '@/components/tutor/tutor-sub-page';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';

export default function TutorProfilePage() {
  return (
    <TutorSubPage
      title="Authority profile"
      description="Edit headline, bio, rates, verification badges, and marketplace positioning."
      icon={UserCog}
    >
      <Button asChild>
        <Link href="/tutor/onboarding">Open profile editor</Link>
      </Button>
    </TutorSubPage>
  );
}
