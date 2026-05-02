import StudyPlanner from "./study-planner";
import { getSubjectsByLevel } from "@/server/actions/academic-actions";
import { grades } from "@/data/academic";

export default async function PlannerPage() {

  const subjectsByLevelData = await getSubjectsByLevel();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-start space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">AI Study Planner</h2>
          <p className="text-muted-foreground max-w-2xl">
            Take the stress out of homework and exams. Tell us what you're studying and get a personalised study plan in under 5 minutes.
          </p>
      </div>
      <StudyPlanner subjectsByLevel={subjectsByLevelData} grades={grades} />
    </div>
  );
}
