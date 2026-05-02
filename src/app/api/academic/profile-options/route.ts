
import { NextResponse } from "next/server";
import { levels, subjects, examBoards, universityCourses } from "@/data/academic";

export async function GET() {
  return NextResponse.json({
    success: true,
    studyLevels: levels,
    allSubjects: subjects,
    examBoards: examBoards,
    universityCourses: universityCourses,
  });
}
