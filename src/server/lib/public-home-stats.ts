import { adminDb } from '@/lib/firebase/admin-app';

export type PublicHomeStats = {
  studentAccounts: number;
  partnerSchools: number;
  communityResources: number;
  totalUserProfiles: number;
};

const EMPTY: PublicHomeStats = {
  studentAccounts: 0,
  partnerSchools: 0,
  communityResources: 0,
  totalUserProfiles: 0,
};

/**
 * Lightweight aggregates for the public homepage — best-effort; failures return zeros.
 */
export async function getPublicHomeStats(): Promise<PublicHomeStats> {
  try {
    const [studentsR, schoolsR, resourcesR, usersR] = await Promise.allSettled([
      adminDb.collection('users').where('role', '==', 'STUDENT').count().get(),
      adminDb.collection('school_accounts').count().get(),
      adminDb.collection('resources').count().get(),
      adminDb.collection('users').count().get(),
    ]);

    const studentAccounts =
      studentsR.status === 'fulfilled' ? studentsR.value.data().count : 0;
    const partnerSchools =
      schoolsR.status === 'fulfilled' ? schoolsR.value.data().count : 0;
    const communityResources =
      resourcesR.status === 'fulfilled' ? resourcesR.value.data().count : 0;
    const totalUserProfiles = usersR.status === 'fulfilled' ? usersR.value.data().count : 0;

    return {
      studentAccounts,
      partnerSchools,
      communityResources,
      totalUserProfiles,
    };
  } catch {
    return EMPTY;
  }
}

export function formatHomeStatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString('en-GB');
}
