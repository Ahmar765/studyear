'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function TutorOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
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

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const status = await getTutorOnboardingStatusAction(token);
    if (status.onboardingComplete) {
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
    }
    setLoading(false);
  }, [user, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStep = async (nextStep: number, complete = false) => {
    if (!user) return;
    setSaving(true);
    const token = await user.getIdToken();
    const subjectList = subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await saveTutorOnboardingAction(token, {
      step: nextStep,
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
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.error });
      return false;
    }
    if (complete) {
      toast({ title: 'Profile submitted', description: 'Welcome to your Tutor Command Centre.' });
      router.push('/tutor/dashboard');
    } else {
      setStep(nextStep);
      if (nextStep === 4) {
        const rate = parseFloat(hourlyRate) || 32;
        const sub = subjectList[0] ?? 'your subject';
        setAiInsight(
          `${sub} tutors in your region average £${rate}/hour. Your profile positioning suggests £${Math.round(rate * 1.08)}/hour potential.`,
        );
      }
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-slate-900 p-8">
        <p className="text-slate-400">Loading tutor setup…</p>
      </div>
    );
  }

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-slate-900 to-amber-950/20 p-4 text-white md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center space-y-3">
          <Badge className="bg-amber-600">Become a StudYear Tutor</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Build your teaching business</h1>
          <p className="text-slate-400">Professional onboarding — not a student signup</p>
          <Progress value={progress} className="h-2 max-w-md mx-auto" />
          <p className="text-xs text-slate-500">Step {step} of 5</p>
        </header>

        {step === 1 && (
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

        {step === 2 && (
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

        {step === 3 && (
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

        {step === 4 && (
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

        {step === 5 && (
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
      </div>
    </div>
  );
}
