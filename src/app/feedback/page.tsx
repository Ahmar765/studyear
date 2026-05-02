import FeedbackForm from "./feedback-form";
import { getSubjectsByLevel } from "@/server/actions/academic-actions";

export default async function FeedbackPage() {
    const subjectsByLevelData = await getSubjectsByLevel();

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Feedback Engine</h2>
                <p className="text-muted-foreground max-w-2xl">
                   Paste in an exam question and your written answer to get instant, detailed feedback from your personal AI examiner.
                </p>
            </div>
            <FeedbackForm subjectsByLevel={subjectsByLevelData} />
        </div>
    );
}
