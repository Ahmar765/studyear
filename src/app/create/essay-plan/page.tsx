
import EssayPlanGenerator from "./essay-plan-generator";
import { getLevels, getSubjectsByLevel } from "@/server/actions/academic-actions";

export default async function EssayPlanPage() {
    const [levels, subjectsByLevel] = await Promise.all([
        getLevels(),
        getSubjectsByLevel(),
    ]);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Essay Plan Generator</h2>
                <p className="text-muted-foreground max-w-2xl">
                   Enter your essay title or question and get a structured plan with a thesis statement, introduction, body paragraphs, and conclusion.
                </p>
            </div>
            <EssayPlanGenerator 
                levels={levels}
                subjectsByLevel={subjectsByLevel}
            />
        </div>
    );
}
