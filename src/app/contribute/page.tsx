import ContributeResourceForm from '@/components/contribute-resource-form';
import { getExamBoards, getLevels, getSubjects } from '@/server/actions/academic-actions';

export default async function ContributePage() {
  const [subjects, examBoards, levels] = await Promise.all([
    getSubjects(),
    getExamBoards(),
    getLevels(),
  ]);

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit a resource</h1>
        <p className="text-muted-foreground max-w-2xl">
          Share an educational video or past paper with the StudYear community. All roles can submit;
          items are reviewed before they appear in Find Study Resources.
        </p>
      </div>
      <ContributeResourceForm subjects={subjects} examBoards={examBoards} levels={levels} />
    </div>
  );
}
