import { TutorSubPage } from '@/components/tutor/tutor-sub-page';
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Button asChild size="lg" className="h-auto flex-col gap-2 py-8">
          <Link href="/ai-tutor">
            <Bot className="h-8 w-8" />
            Explain with AI
          </Link>
        </Button>
        <Button variant="secondary" size="lg" className="h-auto flex-col gap-2 py-8" disabled>
          <Video className="h-8 w-8" />
          Live video room (coming soon)
        </Button>
      </div>
    </TutorSubPage>
  );
}
