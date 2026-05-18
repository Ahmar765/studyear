import { redirect } from 'next/navigation';

/** Profile editor lives on onboarding flow with `?edit=1` (avoids redirect when already complete). */
export default function TutorProfilePage() {
  redirect('/tutor/onboarding?edit=1');
}
