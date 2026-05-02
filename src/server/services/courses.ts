import { adminDb } from '@/lib/firebase/admin-app';
import { GenerateCourseOutput } from '@/server/ai/flows/course-generation';
import * as admin from 'firebase-admin';

// This combines the input and output of the course generation for a complete document
export interface CourseData extends GenerateCourseOutput {
    userId: string;
    subject: string;
    topic: string;
    level: string;
    examBoard?: string;
    title: string;
}

export async function saveCourse(courseData: Omit<CourseData, 'courseTitle'>) {
    try {
        const courseRef = adminDb.collection('courses').doc();
        await courseRef.set({
            ...courseData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, courseId: courseRef.id };
    } catch (error: any) {
        console.error("Error saving course:", error);
        return { success: false, error: error.message };
    }
}
