
'use server';

// In a real production app, these functions would fetch data from a Firestore database.
// For now, they read from the static data file to establish the correct architecture.
import { subjects, levels, examBoards, subjectsByLevel, universityCourses } from '@/data/academic';
import { BookOpen } from 'lucide-react';

export async function getSubjects() {
    // To maintain compatibility with components expecting { code, name }, we transform the string array.
    return subjects.map(s => ({
        code: s.replace(/ /g, '_').toUpperCase(), // Create a code from the name
        name: s,
        icon: BookOpen, // Provide a default icon
    }));
}

export async function getLevels() {
    return levels;
}

export async function getExamBoards() {
    return examBoards;
}

export async function getSubjectsByLevel() {
    return subjectsByLevel;
}

export async function getUniversityCourses() {
    return universityCourses;
}
