'use server';

import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';

// This is a simplified version for the listing. A full profile would be more detailed.
export interface TutorListing {
    uid: string;
    name?: string;
    profileImageUrl?: string;
    bio?: string;
    hourlyRate?: number;
    subjects: string[];
}

export async function getTutorListingsAction(filters: { query?: string; }): Promise<{ tutors: TutorListing[], error?: string }> {
    try {
        const query: admin.firestore.Query = adminDb.collection('tutor_profiles').where('approvalStatus', '==', 'APPROVED');
        
        const approvedTutorsSnapshot = await query.get();

        if (approvedTutorsSnapshot.empty) {
            return { tutors: [] };
        }

        const tutorIds = approvedTutorsSnapshot.docs.map(doc => doc.id);
        const usersSnapshot = await adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', tutorIds).get();
        const usersMap = new Map<string, any>();
        usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()));

        let listings: TutorListing[] = [];
        approvedTutorsSnapshot.forEach(doc => {
            const profileData = doc.data();
            const userData = usersMap.get(doc.id);
            if (userData) {
                // The subjects field can be a map, so we flatten it into an array of strings.
                const subjectList = profileData.subjects ? Object.values(profileData.subjects).flat() as string[] : [];
                
                listings.push({
                    uid: doc.id,
                    name: userData.name,
                    profileImageUrl: userData.profileImageUrl,
                    bio: profileData.bio,
                    hourlyRate: profileData.hourlyRate,
                    subjects: subjectList,
                });
            }
        });

        // For a production app with many tutors, a dedicated search service like Algolia or Typesense is recommended.
        // For now, we filter in-memory, which is acceptable for a moderate number of tutors.
        if (filters.query) {
            const searchTerm = filters.query.toLowerCase();
            listings = listings.filter(tutor => 
                tutor.name?.toLowerCase().includes(searchTerm) ||
                tutor.subjects.some(s => s.toLowerCase().includes(searchTerm))
            );
        }
        
        return { tutors: listings };

    } catch (error: any) {
        console.error('Error fetching tutor listings:', error);
        return { tutors: [], error: error.message };
    }
}
