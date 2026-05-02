
import QuizGenerator from './quiz-generator';
import { getLevels, getSubjectsByLevel } from "@/server/actions/academic-actions";

export default async function QuizzesPage() {
    const [levels, subjectsByLevel] = await Promise.all([
        getLevels(),
        getSubjectsByLevel(),
    ]);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Quiz Generator</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Create fun, educational quizzes to test yourself and your friends on any topic.
                </p>
            </div>
            <QuizGenerator 
                levels={levels}
                subjectsByLevel={subjectsByLevel}
            />
        </div>
    );
}
