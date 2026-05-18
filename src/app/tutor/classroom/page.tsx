import { TutorSubPage } from '@/components/tutor/tutor-sub-page';
import { TutorLiveClassroom } from '@/components/tutor/tutor-live-classroom';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bot, Video } from 'lucide-react';

export default function TutorClassroomPage() {
  return (
    <TutorSubPage
      title="Tutor classroom"
      description="Video, whiteboard, AI explanations, live quizzes, and session recording."
      icon={Video}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/ai-tutor">
            <Bot className="mr-2 h-4 w-4" />
            Explain with AI
          </Link>
        </Button>
      </div>
      <TutorLiveClassroom />
    </TutorSubPage>
  );
}
