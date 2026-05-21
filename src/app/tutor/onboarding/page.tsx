'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  getTutorOnboardingStatusAction,
  saveTutorOnboardingAction,
} from '@/server/actions/tutor-actions';
import type { TutorIdentityType } from '@/types/tutor-dashboard';
import {
  BookOpen,
  Brain,
  Calculator,
  Globe,
  GraduationCap,
  Heart,
  Sparkles,
  University,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileImageUpload } from '@/components/profile-image-upload';

const IDENTITY_OPTIONS: { id: TutorIdentityType; label: string; description: string; icon: typeof BookOpen }[] = [
  { id: 'ACADEMIC', label: 'Academic Tutor', description: 'Broad subject support across levels', icon: BookOpen },
  { id: 'EXAM_SPECIALIST', label: 'Exam Specialist', description: 'GCSE, A-Level, and exam technique', icon: GraduationCap },
  { id: 'STEM', label: 'STEM Tutor', description: 'Maths, sciences, and engineering', icon: Calculator },
  { id: 'LANGUAGE', label: 'Language Tutor', description: 'Modern languages and literacy', icon: Globe },
  { id: 'UNIVERSITY_MENTOR', label: 'University Mentor', description: 'Admissions and degree-level support', icon: University },
  { id: 'SEN_SUPPORT', label: 'SEN Support Tutor', description: 'Special educational needs', icon: Heart },
  { id: 'HOMEWORK_COACH', label: 'Homework Coach', description: 'Structure, accountability, and habits', icon: Brain },
];

const LEVEL_OPTIONS = ['KS3', 'GCSE', 'A-Level', 'University', 'Adult'];

function TutorOnboardingPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tutorType, setTutorType] = useState<TutorIdentityType>('ACADEMIC');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState('');
  const [levels, setLevels] = useState<string[]>(['GCSE', 'A-Level']);
  const [hourlyRate, setHourlyRate] = useState('32');
  const [teachingStyle, setTeachingStyle] = useState('');
  const [whyStudentsLove, setWhyStudentsLove] = useState('');
  const [availability, setAvailability] = useState('');
  const [verifiedId, setVerifiedId] = useState(false);
  const [verifiedDbs, setVerifiedDbs] = useState(false);
  const [verifiedQualifications, setVerifiedQualifications] = useState(false);
  const [aiTeachingCertified, setAiTeachingCertified] = useState(true);
  const [examSpecialist, setExamSpecialist] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const status = await getTutorOnboardingStatusAction(token);
    if (status.onboardingComplete && !isEditMode) {
      router.replace('/tutor/dashboard');
      return;
    }
    if (status.step) setStep(status.step);
    if (status.profile) {
      if (status.profile.tutorType) setTutorType(status.profile.tutorType);
      if (status.profile.headline) setHeadline(status.profile.headline);
      if (status.profile.bio) setBio(status.profile.bio);
      if (status.profile.hourlyRate) setHourlyRate(String(status.profile.hourlyRate));
      if (status.profile.levels) setLevels(status.profile.levels);
      if (status.profile.teachingStyle) setTeachingStyle(status.profile.teachingStyle);
      if (status.profile.whyStudentsLove) setWhyStudentsLove(status.profile.whyStudentsLove);
      if (status.profile.availability) setAvailability(status.profile.availability);
      if (status.profile.verifiedId) setVerifiedId(status.profile.verifiedId);
      if (status.profile.verifiedDbs) setVerifiedDbs(status.profile.verifiedDbs);
      if (status.profile.verifiedQualifications) setVerifiedQualifications(status.profile.verifiedQualifications);
      if (status.profile.aiTeachingCertified) setAiTeachingCertified(status.profile.aiTeachingCertified);
      if (status.profile.examSpecialist) setExamSpecialist(status.profile.examSpecialist);
      const subs = status.profile.subjects;
      if (Array.isArray(subs)) {
        setSubjects(subs.join(', '));
      } else if (subs && typeof subs === 'object') {
        setSubjects(Object.values(subs as Record<string, string[]>).flat().join(', '));
      }
    }
    if (status.account) {
      setFullName(status.account.fullName);
      setDob(status.account.dob);
      setProfileImageUrl(status.account.profileImageUrl);
      setCoverImageUrl(status.account.coverImageUrl);
    }
    setLoading(false);
  }, [user, router, isEditMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildOnboardingPayload = (nextStep: number, complete = false) => {
    const subjectList = subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      step: nextStep,
      fullName: fullName.trim() || undefined,
      dob: dob.trim() || undefined,
      profileImageUrl: profileImageUrl.trim() || null,
      coverImageUrl: coverImageUrl.trim() || null,
      tutorType,
      headline,
      bio,
      subjects: subjectList,
      levels,
      hourlyRate: parseFloat(hourlyRate) || 32,
      teachingStyle,
      whyStudentsLove,
      availability,
      verifiedId,
      verifiedDbs,
      verifiedQualifications,
      aiTeachingCertified,
      examSpecialist: examSpecialist || tutorType === 'EXAM_SPECIALIST',
      onboardingComplete: complete,
    };
  };

  const saveStep = async (nextStep: number, complete = false) => {
    if (!user) return;
    setSaving(true);
    const token = await user.getIdToken();
    const payload = buildOnboardingPayload(nextStep, complete);
    const result = await saveTutorOnboardingAction(token, payload);
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.error });
      return false;
    }
    if (complete) {
      if (isEditMode) {
        toast({ title: 'Profile saved', description: 'Your marketplace profile has been updated.' });
        router.push('/account');
      } else {
        toast({ title: 'Profile submitted', description: 'Welcome to your Tutor Command Centre.' });
        router.push('/tutor/dashboard');
      }
    } else {
      setStep(nextStep);
      if (nextStep === 4) {
        const rate = parseFloat(hourlyRate) || 32;
        const sub = payload.subjects[0] ?? 'your subject';
        setAiInsight(
          `${sub} tutors in your region average £${rate}/hour. Your profile positioning suggests £${Math.round(rate * 1.08)}/hour potential.`,
        );
      }
    }
    return true;
  };

  const saveAllEdit = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter your full name.' });
      return;
    }
    setSaving(true);
    const token = await user.getIdToken();
    const payload = buildOnboardingPayload(5, false);
    const result = await saveTutorOnboardingAction(token, payload);
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.error });
      return;
    }
    toast({ title: 'Profile saved', description: 'Your account and marketplace profile have been updated.' });
    router.push('/account');
  };

  const showSection = (n: number) => isEditMode || step === n;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-slate-900 p-8">
        <p className="text-slate-400">Loading tutor setup…</p>
      </div>
    );
  }

  const progress = isEditMode ? 100 : (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-slate-900 to-amber-950/20 p-4 text-white md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center space-y-3">
          <Badge className="bg-amber-600">{isEditMode ? 'Edit profile' : 'Become a StudYear Tutor'}</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {isEditMode ? 'Update your authority profile' : 'Build your teaching business'}
          </h1>
          <p className="text-slate-400">
            {isEditMode
              ? 'Changes apply to your marketplace listing and Command Centre.'
              : 'Professional onboarding — not a student signup'}
          </p>
          {!isEditMode ? <Progress value={progress} className="h-2 max-w-md mx-auto" /> : null}
          <p className="text-xs text-slate-500">
            {isEditMode ? 'All sections — scroll to review and save' : `Step ${step} of 5`}
          </p>
        </header>

        {isEditMode && (
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
              <CardDescription className="text-slate-400">
                Your name and date of birth on your StudYear account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-fullName">Full name</Label>
                  <Input
                    id="edit-fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 bg-slate-800 border-white/10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dob">Date of birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-1 bg-slate-800 border-white/10"
                  />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <ProfileImageUpload
                  label="Profile photo"
                  kind="profile"
                  variant="avatar"
                  value={profileImageUrl}
                  onChange={setProfileImageUrl}
                  disabled={saving}
                />
                <ProfileImageUpload
                  label="Cover image"
                  kind="cover"
                  variant="banner"
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showSection(1) && (
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader>
              <CardTitle>Choose your tutor identity</CardTitle>
              <CardDescription className="text-slate-400">
                Position yourself as a specialist — parents and students search by expertise.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {IDENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTutorType(opt.id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    tutorType === opt.id
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                      : 'border-white/10 hover:border-white/20',
                  )}
                >
                  <opt.icon className="mb-2 h-6 w-6 text-amber-400" />
                  <p className="font-semibold">{opt.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{opt.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {showSection(2) && (
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader>
              <CardTitle>Create your tutor brand</CardTitle>
              <CardDescription className="text-slate-400">
                This appears on the StudYear marketplace — trust drives conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="headline">Professional headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="GCSE Maths specialist · 8+ years experience"
                  className="mt-1 bg-slate-800 border-white/10"
                />
              </div>
              <div>
                <Label htmlFor="bio">Teaching bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="mt-1 bg-slate-800 border-white/10"
                />
              </div>
              <div>
                <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                <Input
                  id="subjects"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="Mathematics, Physics"
                  className="mt-1 bg-slate-800 border-white/10"
                />
              </div>
              <div>
                <Label>Levels taught</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map((lv) => (
                    <Badge
                      key={lv}
                      variant={levels.includes(lv) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        setLevels((prev) =>
                          prev.includes(lv) ? prev.filter((x) => x !== lv) : [...prev, lv],
                        )
                      }
                    >
                      {lv}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rate">Hourly rate (£)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="mt-1 bg-slate-800 border-white/10"
                  />
                </div>
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder="Evenings & weekends"
                    className="mt-1 bg-slate-800 border-white/10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="why">Why students love learning with you</Label>
                <Textarea
                  id="why"
                  value={whyStudentsLove}
                  onChange={(e) => setWhyStudentsLove(e.target.value)}
                  rows={2}
                  className="mt-1 bg-slate-800 border-white/10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showSection(3) && (
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader>
              <CardTitle>Verification layer</CardTitle>
              <CardDescription className="text-slate-400">
                Trust badges increase parent confidence and session conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'id', label: 'ID verification submitted', checked: verifiedId, set: setVerifiedId },
                { id: 'dbs', label: 'DBS check (optional)', checked: verifiedDbs, set: setVerifiedDbs },
                {
                  id: 'qual',
                  label: 'Qualifications uploaded',
                  checked: verifiedQualifications,
                  set: setVerifiedQualifications,
                },
                {
                  id: 'ai',
                  label: 'AI Teaching Certified (StudYear tools)',
                  checked: aiTeachingCertified,
                  set: setAiTeachingCertified,
                },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={(v) => item.set(v === true)}
                  />
                  <Label htmlFor={item.id} className="cursor-pointer flex-1">
                    {item.label}
                  </Label>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                <Checkbox
                  id="exam"
                  checked={examSpecialist}
                  onCheckedChange={(v) => setExamSpecialist(v === true)}
                />
                <Label htmlFor="exam" className="cursor-pointer flex-1">
                  Exam Specialist badge
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {showSection(4) && (
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Tutor performance intelligence
              </CardTitle>
              <CardDescription className="text-slate-400">
                StudYear AI analyses your market positioning before approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                {aiInsight ||
                  'Complete your rate and subjects to receive personalised pricing intelligence.'}
              </p>
              <div>
                <Label htmlFor="style">Teaching style</Label>
                <Textarea
                  id="style"
                  value={teachingStyle}
                  onChange={(e) => setTeachingStyle(e.target.value)}
                  placeholder="Visual explanations, active recall, exam technique drills…"
                  className="mt-1 bg-slate-800 border-white/10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showSection(5) && !isEditMode && (
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader>
              <CardTitle>Welcome to your business dashboard</CardTitle>
              <CardDescription className="text-slate-400">
                Your Command Centre is ready — sessions, earnings, CRM, and AI tools in one workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>✓ Marketplace profile queued for admin review</p>
              <p>✓ Student pipeline & calendar ready</p>
              <p>✓ AI teaching assistant enabled</p>
              <p>✓ Session intelligence will sync to parents automatically</p>
            </CardContent>
          </Card>
        )}

        {isEditMode ? (
          <div className="flex flex-wrap justify-end gap-4">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => router.push('/account')}
              className="border-white/20 bg-transparent text-white"
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() => void saveAllEdit()}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              disabled={step === 1 || saving}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="border-white/20 bg-transparent text-white"
            >
              Back
            </Button>
            <Button
              disabled={saving}
              onClick={() => {
                if (step < 5) void saveStep(step + 1);
                else void saveStep(5, true);
              }}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {saving ? 'Saving…' : step === 5 ? 'Launch Command Centre' : 'Continue'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-slate-900 p-8">
          <p className="text-slate-400">Loading tutor setup…</p>
        </div>
      }
    >
      <TutorOnboardingPageInner />
    </Suspense>
  );
}
