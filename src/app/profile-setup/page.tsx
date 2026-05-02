import { getLevels, getExamBoards, getSubjectsByLevel, getUniversityCourses } from '@/server/actions/academic-actions';
import ProfileSetupForm from './profile-setup-form';

// This is now a Server Component that fetches data and passes it to the client form.
export default async function ProfileSetupPage() {

    // Fetch all necessary data for the form in one go on the server.
    const [studyLevels, examBoardsData, subjectsByLevelData, universityCoursesData] = await Promise.all([
        getLevels(),
        getExamBoards(),
        getSubjectsByLevel(),
        getUniversityCourses(),
    ]);

    return (
        <ProfileSetupForm
            studyLevels={studyLevels}
            examBoards={examBoardsData}
            subjectsByLevel={subjectsByLevelData}
            universityCourses={universityCoursesData}
        />
    );
}
