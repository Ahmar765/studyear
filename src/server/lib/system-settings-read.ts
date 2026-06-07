import { adminDb } from '@/lib/firebase/admin-app';
import type { SystemSettings } from '@/server/schemas/system-settings';

const defaultCommunications = {
  supportEmail: 'support@studyear.ai',
  contactEmail: 'contact@studyear.ai',
  noreplyEmail: 'noreply@studyear.ai',
};

/** Read-only settings loader — avoids circular imports with mail.ts. */
export async function readSystemSettingsCommunications(): Promise<
  NonNullable<SystemSettings['communications']>
> {
  try {
    const snap = await adminDb.collection('system_settings').doc('global').get();
    const comm = snap.data()?.communications as SystemSettings['communications'] | undefined;
    return { ...defaultCommunications, ...comm };
  } catch {
    return defaultCommunications;
  }
}
