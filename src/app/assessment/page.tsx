import DiagnosticForm from "./diagnostic-form";
import { subjects } from "@/data/academic";

export default function AssessmentPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <DiagnosticForm catalogSubjects={subjects} />
    </div>
  );
}
