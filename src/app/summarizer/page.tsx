
import SummarizerForm from "./summarizer-form";
import { getLevels, getSubjectsByLevel } from "@/server/actions/academic-actions";

export default async function SummarizerPage() {
    const [levels, subjectsByLevel] = await Promise.all([
        getLevels(),
        getSubjectsByLevel(),
    ]);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Topic Summarizer</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Generate concise summaries of complex topics from any text.
                </p>
            </div>
            <SummarizerForm 
                levels={levels}
                subjectsByLevel={subjectsByLevel}
            />
        </div>
    );
}
