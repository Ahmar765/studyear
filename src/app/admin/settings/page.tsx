
import { getSystemSettings } from '@/server/actions/settings-actions';
import type { SystemSettings } from '@/server/schemas/system-settings';
import SettingsForms from './settings-forms';
import CommunicationsSettingsForm from './communications-settings-form';
import { AdminEmailTestPanel } from '@/components/admin/admin-email-test-panel';

export default async function AdminSettingsPage() {
  const initialSettings: SystemSettings = await getSystemSettings();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">System & AI Settings</h2>
            <p className="text-muted-foreground">
                Control AI rate limits, feature flags, email delivery, and other global settings.
            </p>
        </div>
        <AdminEmailTestPanel />
        <CommunicationsSettingsForm initialSettings={initialSettings} />
        <SettingsForms initialSettings={initialSettings} />
    </div>
  );
}
