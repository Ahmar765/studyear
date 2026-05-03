'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import {
  getSchoolSettingsAction,
  updateSchoolSettingsAction,
  type SchoolAccountSettings,
} from '@/server/actions/school-actions';
import { useToast } from '@/hooks/use-toast';

const TIMEZONES = ['Europe/London', 'Europe/Dublin', 'UTC', 'America/New_York'];

const MIS_PROVIDERS = [
  { value: 'none', label: 'Not connected' },
  { value: 'sims', label: 'SIMS' },
  { value: 'arbor', label: 'Arbor' },
  { value: 'bromcom', label: 'Bromcom' },
  { value: 'isegment', label: 'iSAMS' },
  { value: 'other', label: 'Other (see notes)' },
];

export default function SchoolSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SchoolAccountSettings | null>(null);
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    misProvider: 'none',
    misNotes: '',
    timezone: 'Europe/London',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await user.getIdToken();
      const res = await getSchoolSettingsAction(token);
      if (!cancelled && res.settings) {
        setSettings(res.settings);
        setForm({
          name: res.settings.name,
          misProvider: res.settings.misProvider || 'none',
          misNotes: res.settings.misNotes,
          timezone: res.settings.timezone,
        });
      }
      if (!cancelled) setPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await updateSchoolSettingsAction(token, {
        ...form,
        misProvider: form.misProvider === 'none' ? '' : form.misProvider,
      });
      if (res.success) {
        toast({ title: 'Settings saved' });
      } else {
        toast({ variant: 'destructive', title: 'Could not save', description: res.error });
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">School Settings</h2>
        <p className="text-muted-foreground">
          Update your school profile and record MIS integration plans (automated sync remains optional).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School profile & MIS
          </CardTitle>
          <CardDescription>
            Firestore document: <span className="font-mono text-xs">{settings?.id ?? '—'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="name">School display name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(timezone) => setForm((f) => ({ ...f, timezone }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>MIS provider (planned / current)</Label>
              <Select
                value={form.misProvider || 'none'}
                onValueChange={(misProvider) => setForm((f) => ({ ...f, misProvider }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {MIS_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Integration notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={form.misNotes}
                onChange={(e) => setForm((f) => ({ ...f, misNotes: e.target.value }))}
                placeholder="API keys, contact at vendor, data mapping decisions…"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
