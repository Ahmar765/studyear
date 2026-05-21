'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  getSchoolOnboardingStateAction,
  saveSchoolOnboardingStepAction,
} from '@/server/actions/school-portal-actions';
import { SCHOOL_ONBOARDING_STEPS, type SchoolOnboardingProfile } from '@/types/school-portal';
import { Building2, Loader, Sparkles } from 'lucide-react';
import Link from 'next/link';

const EMPTY: SchoolOnboardingProfile = {};

function SchoolOnboardingInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<SchoolOnboardingProfile>(EMPTY);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const token = await user.getIdToken();
    const res = await getSchoolOnboardingStateAction(token);
    if (res.success) {
      setLoadError(null);
      if (res.onboardingComplete && !isEditMode) {
        router.replace('/school/dashboard');
        return;
      }
      setStep(res.onboardingStep ?? 0);
      setProfile(res.profile ?? EMPTY);
      setSchoolName(res.schoolName ?? '');
    } else {
      setLoadError(res.error ?? 'Could not load school workspace.');
    }
    setLoading(false);
  }, [user, router, isEditMode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    void load();
  }, [authLoading, user, load, router]);

  const progressPct = ((step + 1) / SCHOOL_ONBOARDING_STEPS.length) * 100;

  const save = (nextStep: number, patch: SchoolOnboardingProfile, complete?: boolean) => {
    startTransition(async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await saveSchoolOnboardingStepAction(
        token,
        nextStep,
        { ...patch, schoolName: schoolName.trim() || undefined },
        complete,
      );
      if (res.success) {
        if (complete) {
          toast({
            title: isEditMode ? 'Workspace updated' : 'Workspace deployed',
            description: isEditMode
              ? 'Your school profile has been saved.'
              : 'Your AI operations centre is live.',
          });
          router.replace(isEditMode ? '/school/settings' : '/school/dashboard');
        } else {
          setStep(nextStep);
        }
      } else {
        toast({ variant: 'destructive', title: 'Could not save', description: res.error });
      }
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="school-ops-dashboard min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-800 dark:text-cyan-200">
            <Building2 className="h-3.5 w-3.5" />
            Enterprise school deployment
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit school AI workspace' : 'Build your school AI workspace'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update structure, safeguarding, and deployment settings for your institution.'
              : 'Deploy institutional infrastructure — not just another admin account.'}
          </p>
        </header>

        {loadError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            {SCHOOL_ONBOARDING_STEPS.map((s, i) => (
              <span key={s.id} className={i <= step ? 'font-medium text-foreground' : ''}>
                {s.label}
              </span>
            ))}
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <Card className="school-ops-panel">
          <CardHeader>
            <CardTitle>
              Step {step + 1}: {SCHOOL_ONBOARDING_STEPS[step]?.label}
            </CardTitle>
            <CardDescription>
              {step === 0 && 'School identity and strategic context'}
              {step === 1 && 'Organisational structure engine'}
              {step === 2 && 'Staff deployment hub'}
              {step === 3 && 'Student cohort import'}
              {step === 4 && 'AI activation & safeguarding'}
              {step === 5 && 'Go live — insight snapshot'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>School name</Label>
                  <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>School type</Label>
                    <Input
                      placeholder="Academy, Independent…"
                      value={profile.schoolType ?? ''}
                      onChange={(e) => setProfile((p) => ({ ...p, schoolType: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={profile.country ?? ''}
                      onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Curriculum</Label>
                  <Input
                    placeholder="GCSE, A-Level, IB…"
                    value={profile.curriculum ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, curriculum: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Students (estimate)</Label>
                    <Input
                      type="number"
                      value={profile.studentCountEstimate ?? ''}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          studentCountEstimate: parseInt(e.target.value, 10) || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Staff (estimate)</Label>
                    <Input
                      type="number"
                      value={profile.staffCountEstimate ?? ''}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          staffCountEstimate: parseInt(e.target.value, 10) || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Exam boards (comma-separated)</Label>
                  <Input
                    value={(profile.examBoards ?? []).join(', ')}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        examBoards: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic priorities</Label>
                  <Textarea
                    value={(profile.academicPriorities ?? []).join('\n')}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        academicPriorities: e.target.value.split('\n').filter(Boolean),
                      }))
                    }
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Departments (comma-separated)</Label>
                  <Input
                    value={(profile.departments ?? []).join(', ')}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        departments: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year groups</Label>
                  <Input
                    placeholder="Year 7, Year 8, Year 9…"
                    value={(profile.yearGroups ?? []).join(', ')}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        yearGroups: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Classes / forms</Label>
                  <Textarea
                    placeholder="7A, 7B, 8A…"
                    value={(profile.classes ?? []).join('\n')}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        classes: e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">School staff deployment</p>
                <p className="text-muted-foreground">
                  Invite teachers via email, share your School Join Code, or bulk CSV (coming soon). MIS sync can be
                  configured in Settings.
                </p>
                <Button asChild variant="secondary">
                  <Link href="/school/staff">Open staff deployment hub</Link>
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Student import & AI analysis</p>
                <p className="text-muted-foreground">
                  Link students to your school account. Once imported, StudYear generates cohort risk and intervention
                  insights on your Command Centre.
                </p>
                <Button asChild variant="secondary">
                  <Link href="/school/students">Manage students</Link>
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={profile.aiStudentAccess ?? true}
                    onCheckedChange={(v) => setProfile((p) => ({ ...p, aiStudentAccess: v === true }))}
                  />
                  Student AI access enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={profile.aiTeacherTools ?? true}
                    onCheckedChange={(v) => setProfile((p) => ({ ...p, aiTeacherTools: v === true }))}
                  />
                  Teacher AI teaching tools
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={profile.aiParentVisibility ?? true}
                    onCheckedChange={(v) => setProfile((p) => ({ ...p, aiParentVisibility: v === true }))}
                  />
                  Parent visibility layer
                </label>
                <div className="space-y-2">
                  <Label>Safeguarding notes</Label>
                  <Textarea
                    value={profile.safeguardingNotes ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, safeguardingNotes: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  Ready to go live
                </p>
                <p className="text-sm text-muted-foreground">
                  Your AI Academic Operations Centre will activate with live KPIs, risk intelligence, intervention
                  pipeline, and ACU monitoring.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || isPending}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {step < SCHOOL_ONBOARDING_STEPS.length - 1 ? (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => save(step + 1, profile)}
                >
                  {isPending ? 'Saving…' : 'Continue'}
                </Button>
              ) : (
                <Button type="button" disabled={isPending} onClick={() => save(step, profile, true)}>
                  {isPending ? 'Deploying…' : 'Go live'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SchoolOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SchoolOnboardingInner />
    </Suspense>
  );
}
