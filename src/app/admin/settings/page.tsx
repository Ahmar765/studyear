
import { getSystemSettings } from '@/server/actions/settings-actions';
import type { SystemSettings } from '@/server/schemas/system-settings';
import SettingsForms from './settings-forms';
import CommunicationsSettingsForm from './communications-settings-form';

export default async function AdminSettingsPage() {
  const initialSettings: SystemSettings = await getSystemSettings();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">System & AI Settings</h2>
            <p className="text-muted-foreground">
                Control AI rate limits, feature flags, and other global settings. Changes may require a server restart.
            </p>
        </div>
        <CommunicationsSettingsForm initialSettings={initialSettings} />
        <SettingsForms initialSettings={initialSettings} />
    </div>
  );
}
