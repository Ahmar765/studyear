import { redirect } from 'next/navigation';

/** Legacy route — people management is unified at /school/people */
export default function SchoolStudentsRedirectPage() {
  redirect('/school/people#students');
}
