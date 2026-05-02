
'use server';

import { getCurrentUser } from '../lib/auth';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

export interface TeacherStudent {
  id: string;
  name: string;
  profileImageUrl?: string;
  yearGroup: string;
  progressScore: number;
  weakestSubject: string;
  strongestSubject: string;
  tasksCompleted: number;
}

export async function getTeacherStudentsAction(): Promise<{ students: TeacherStudent[], error?: string }> {
  try {
    const teacherUser = await getCurrentUser();
    if (!teacherUser) {
      throw new Error("User is not authenticated.");
    }

    // Find which school the teacher belongs to
    const staffSnapshot = await adminDb.collection('school_staff')
        .where('userId', '==', teacherUser.uid)
        .limit(1)
        .get();

    if (staffSnapshot.empty) {
        return { students: [] }; // Not assigned to any school
    }
    const schoolId = staffSnapshot.docs[0].data().schoolId;

    // Get all students linked to that school
    const studentProfilesSnapshot = await adminDb.collection('student_profiles')
        .where('schoolAccountId', '==', schoolId)
        .get();
        
    if (studentProfilesSnapshot.empty) {
        return { students: [] };
    }

    const studentIds = studentProfilesSnapshot.docs.map(doc => doc.id);

    // Fetch user and dashboard data for all students in parallel
    const [usersSnapshot, dashboardStatesSnapshot] = await Promise.all([
        adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', studentIds).get(),
        adminDb.collection('student_dashboard_states').where(admin.firestore.FieldPath.documentId(), 'in', studentIds).get()
    ]);
    
    const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));
    const dashboardsMap = new Map(dashboardStatesSnapshot.docs.map(doc => [doc.id, doc.data()]));

    const students: TeacherStudent[] = studentProfilesSnapshot.docs.map(profileDoc => {
        const studentId = profileDoc.id;
        const profileData = profileDoc.data();
        const userData = usersMap.get(studentId) || {};
        const dashboardData = dashboardsMap.get(studentId) || {};

        return {
            id: studentId,
            name: userData.name || 'Unknown Student',
            profileImageUrl: userData.profileImageUrl,
            yearGroup: profileData.yearGroup || 'N/A',
            progressScore: dashboardData.progressScore || 0,
            weakestSubject: dashboardData.weakSubjects?.[0]?.name || 'N/A',
            strongestSubject: dashboardData.strongSubjects?.[0]?.name || 'N/A',
            tasksCompleted: dashboardData.tasksCompleted || 0,
        };
    });

    return { students };

  } catch (error: any) {
    console.error("Error fetching teacher's students:", error);
    return { students: [], error: error.message };
  }
}
