
import AiCourseGenerator from "./ai-course-generator";
import { getLevels, getSubjectsByLevel, getExamBoards } from '@/server/actions/academic-actions';

export default async function AiCoursePage() {
    const [levels, subjectsByLevel, examBoards] = await Promise.all([
        getLevels(),
        getSubjectsByLevel(),
        getExamBoards(),
    ]);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Course Generator</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Let our AI build a structured course with modules, topics, and quizzes based on any topic you choose.
                </p>
            </div>
            <AiCourseGenerator 
                levels={levels}
                subjectsByLevel={subjectsByLevel}
                examBoards={examBoards}
            />
        </div>
    );
}
