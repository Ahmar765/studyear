
import FormulaSheetGenerator from "./formula-sheet-generator";
import { getLevels, getSubjectsByLevel } from '@/server/actions/academic-actions';

export default async function FormulaSheetsPage() {
    const [levels, subjectsByLevel] = await Promise.all([
        getLevels(),
        getSubjectsByLevel(),
    ]);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Formula Sheet Generator</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Generate a concise sheet of essential formulas for any science or maths subject.
                </p>
            </div>
            <FormulaSheetGenerator
                levels={levels}
                subjectsByLevel={subjectsByLevel}
            />
        </div>
    );
}
