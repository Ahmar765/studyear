
import AssignmentReviewForm from "./assignment-review-form";
import { getSubjectsByLevel, getLevels } from "@/server/actions/academic-actions";

export default async function AssignmentReviewPage() {
    const subjectsByLevelData = await getSubjectsByLevel();
    const levels = await getLevels();

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Assignment Review</h2>
                <p className="text-muted-foreground max-w-2xl">
                   Paste or attach homework, essays, or past papers for AI feedback, predicted grades, and learning visuals. Available to all signed-in roles; each review uses ACUs from your wallet (school teachers use the school pool).
                </p>
            </div>
            <AssignmentReviewForm subjectsByLevel={subjectsByLevelData} levels={levels} />
        </div>
    );
}
