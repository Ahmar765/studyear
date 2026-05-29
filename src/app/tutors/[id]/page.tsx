import { TutorProfileView } from './tutor-profile-view';

export default function TutorProfilePage({ params }: { params: { id: string } }) {
  return <TutorProfileView tutorId={params.id} />;
}
