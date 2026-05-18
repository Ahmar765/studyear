'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateBasicUserProfile, updateUserProfile } from '@/server/actions/auth-actions';
import { saveStudentAcademicClient } from '@/lib/firebase/save-student-profile';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Input } from '@/components/ui/input';
import { Loader, Trash2, Building } from 'lucide-react';
import { grades, subjects as allCatalogSubjects } from '@/data/academic';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProfileImageUpload } from '@/components/profile-image-upload';
import { normalizeSubjectTitle, resolveToCatalogValue } from '@/lib/profile-academic';
import { cn } from '@/lib/utils';

const nativeSelectClass = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
);

// This now reflects the detailed student profile data we need to manage
interface ProfileSubject {
  name: string;
  targetGrade: string;
}

interface ProfileData {
  fullName: string;
  dob: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  level: string;
  universityCourse?: string;
  preferences?: {
    examBoard?: string;
  };
  subjects: ProfileSubject[];
}

interface ProfileSetupFormProps {
    studyLevels: string[];
    examBoards: string[];
    subjectsByLevel: Record<string, string[]>;
    universityCourses: string[];
}

export default function ProfileSetupForm({ studyLevels, examBoards, subjectsByLevel, universityCourses }: ProfileSetupFormProps) {
    const { user, loading: authLoading, logout } = useAuth();
    const { userProfile, loading: profileLoading } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    /** Visible status — toasts alone can be missed (theme, TOAST_LIMIT=1, etc.) */
    const [saveBanner, setSaveBanner] = useState<{ variant: 'default' | 'destructive'; title: string; detail?: string } | null>(null);
    /** Radix Select breaks when `value=""`; remount after picking a subject to add. */
    const [subjectPickerKey, setSubjectPickerKey] = useState(0);
    /**
     * Split Firestore sync: if name/images/subscription change, we must not overwrite Study Level / Exam Board
     * the user already picked locally (still one combined `serverSig` would reset academics from stale snapshots).
     */
    const lastPersonalSigRef = useRef<string>('');
    const lastAcademicSigRef = useRef<string>('');

    const [profileData, setProfileData] = useState<Partial<ProfileData>>({
        fullName: '',
        dob: '',
        profileImageUrl: '',
        coverImageUrl: '',
        level: '',
        universityCourse: '',
        preferences: { examBoard: 'none' },
        subjects: [],
    });
    
    const loading = authLoading || profileLoading;

    useEffect(() => {
        if (!loading && !user) {
            lastPersonalSigRef.current = '';
            lastAcademicSigRef.current = '';
            router.push('/login');
            return;
        }
        const role = (userProfile?.role ?? '').toString().toUpperCase().trim();
        if (!loading && role === 'PRIVATE_TUTOR') {
            const edit = userProfile?.onboardingComplete ? '?edit=1' : '';
            router.replace(`/tutor/onboarding${edit}`);
            return;
        }
        if (!userProfile?.uid) return;

        /** `signup` / legacy rows may only populate `yearGroup`; saves mirror both. */
        const rawLevelSource = (userProfile.studyLevel || userProfile.yearGroup || '').trim();

        const subjectsKey = (userProfile.subjects || [])
            .map((s) => ({
                name: normalizeSubjectTitle(s.name),
                g: String(s.targetGrade ?? '').trim(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const personalSig = JSON.stringify({
            uid: userProfile.uid,
            name: userProfile.name ?? '',
            dob: userProfile.dob ?? '',
            profileImageUrl: userProfile.profileImageUrl ?? '',
            coverImageUrl: userProfile.coverImageUrl ?? '',
        });

        const academicSig = JSON.stringify({
            uid: userProfile.uid,
            studyLevel: rawLevelSource,
            examBoard: (userProfile.examBoard ?? '').trim(),
            course: userProfile.course ?? '',
            subjects: subjectsKey,
        });

        const personalChanged = lastPersonalSigRef.current !== personalSig;
        const academicChanged = lastAcademicSigRef.current !== academicSig;

        if (!personalChanged && !academicChanged) {
            return;
        }

        if (personalChanged) {
            lastPersonalSigRef.current = personalSig;
        }
        if (academicChanged) {
            lastAcademicSigRef.current = academicSig;
        }

        const levelResolved = resolveToCatalogValue(rawLevelSource, studyLevels);
        const levelFromServer =
            rawLevelSource && levelResolved && studyLevels.includes(levelResolved)
                ? levelResolved
                : rawLevelSource;

        const rawExam = (userProfile.examBoard ?? '').trim();
        let examPref = 'none';
        if (rawExam) {
            const examResolved = resolveToCatalogValue(rawExam, examBoards);
            examPref =
                examResolved && examBoards.includes(examResolved) ? examResolved : rawExam;
        }

        setProfileData((prev) => {
            const next = { ...prev };
            if (personalChanged) {
                next.fullName = userProfile.name || '';
                next.dob = userProfile.dob || '';
                next.profileImageUrl = userProfile.profileImageUrl || '';
                next.coverImageUrl = userProfile.coverImageUrl || '';
            }
            if (academicChanged) {
                next.level = levelFromServer;
                next.universityCourse = userProfile.course || '';
                next.preferences = { examBoard: examPref };
                next.subjects = (userProfile.subjects || []).map((s) => ({
                    ...s,
                    name: normalizeSubjectTitle(s.name),
                }));
            }
            return next;
        });
    }, [user, userProfile, loading, router, studyLevels, examBoards]);


    const handleAddSubject = (subjectName: string) => {
        if (subjectName && !profileData.subjects?.find(s => s.name === subjectName)) {
            const newSubjects = [...(profileData.subjects || []), { name: subjectName, targetGrade: '' }];
            setProfileData(prev => ({...prev, subjects: newSubjects}));
        }
    };

    const handleRemoveSubject = (subjectName: string) => {
        const newSubjects = profileData.subjects?.filter(s => s.name !== subjectName);
        setProfileData(prev => ({...prev, subjects: newSubjects}));
    };

    const handleTargetGradeChange = (subjectName: string, targetGrade: string) => {
        const newSubjects = profileData.subjects?.map(s => s.name === subjectName ? { ...s, targetGrade } : s);
        setProfileData(prev => ({...prev, subjects: newSubjects}));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveBanner(null);
        if (!user) {
            const msg = 'Please sign in to save your profile.';
            setSaveBanner({ variant: 'destructive', title: 'Sign in required', detail: msg });
            toast({ variant: 'destructive', title: 'Sign in required', description: msg });
            return;
        }
        if (!profileData.fullName?.trim()) {
            setSaveBanner({ variant: 'destructive', title: 'Name required', detail: 'Enter your full name above.' });
            toast({ variant: 'destructive', title: 'Name required', description: 'Enter your full name in Personal Details.' });
            return;
        }
        if (!profileData.dob?.trim()) {
            setSaveBanner({ variant: 'destructive', title: 'Date of birth required', detail: 'Choose your date of birth.' });
            toast({ variant: 'destructive', title: 'Date of birth required', description: 'Choose your date of birth.' });
            return;
        }
        if (!profileData.level?.trim()) {
            setSaveBanner({
                variant: 'destructive',
                title: 'Study level required',
                detail: 'Open “Study Level / Year Group” and pick your level before saving.',
            });
            toast({
                variant: 'destructive',
                title: 'Study level required',
                description: 'Select your study level / year group so we can save your academic details.',
            });
            return;
        }
        if (!(profileData.subjects || []).length) {
            setSaveBanner({ variant: 'destructive', title: 'Add subjects', detail: 'Use “Select a subject to add…” below.' });
            toast({ variant: 'destructive', title: 'Add subjects', description: 'Add at least one subject with a target grade.' });
            return;
        }
        const missingGrade = (profileData.subjects || []).some((s) => !String(s.targetGrade ?? '').trim());
        if (missingGrade) {
            setSaveBanner({
                variant: 'destructive',
                title: 'Target grades required',
                detail: 'Pick a target grade for every subject in the list.',
            });
            toast({
                variant: 'destructive',
                title: 'Target grades required',
                description: 'Choose a target grade for every subject before saving.',
            });
            return;
        }

        const payload = {
            fullName: profileData.fullName!,
            dob: profileData.dob!,
            profileImageUrl: profileData.profileImageUrl,
            coverImageUrl: profileData.coverImageUrl,
            level: profileData.level!.trim(),
            universityCourse: profileData.universityCourse,
            preferences: { examBoard: profileData.preferences?.examBoard },
            subjects: profileData.subjects || [],
        };

        setIsSaving(true);
        setSaveBanner({ variant: 'default', title: 'Saving…', detail: 'Step 1: academic details → Firestore.' });
        try {
            try {
                await saveStudentAcademicClient(user.uid, payload);
            } catch (academicErr: unknown) {
                const msg =
                    academicErr && typeof academicErr === 'object' && 'code' in academicErr
                        ? `Firestore ${String((academicErr as { code?: string }).code)}: ${String((academicErr as { message?: string }).message)}`
                        : String(academicErr);
                setSaveBanner({
                    variant: 'destructive',
                    title: 'Could not save academic profile',
                    detail: msg,
                });
                toast({ variant: 'destructive', title: 'Academic save failed', description: msg });
                return;
            }

            setSaveBanner({ variant: 'default', title: 'Saving…', detail: 'Step 2: account name & onboarding flag (server).' });
            try {
                const result = await updateUserProfile(user.uid, payload);
                if (result.success) {
                    const next = isEditingProfile ? '/account' : '/dashboard';
                    setSaveBanner({ variant: 'default', title: 'Saved', detail: isEditingProfile ? 'Returning to My Account.' : 'Redirecting to your dashboard.' });
                    toast({ title: 'Profile saved', description: 'Your profile has been saved.' });
                    router.push(next);
                    return;
                }
                setSaveBanner({
                    variant: 'destructive',
                    title: 'Academic saved; account update failed',
                    detail:
                        result.error ??
                        'Your subjects are in Firestore. Fix Admin SDK / server env to update name & onboarding.',
                });
                toast({
                    variant: 'destructive',
                    title: 'Partial save',
                    description: result.error ?? 'Academic data saved; server could not update user document.',
                });
            } catch (serverErr: unknown) {
                const serverMsg = serverErr instanceof Error ? serverErr.message : String(serverErr);
                setSaveBanner({
                    variant: 'destructive',
                    title: 'Academic saved; server error',
                    detail: serverMsg,
                });
                toast({
                    variant: 'destructive',
                    title: 'Partial save',
                    description: `Academic details saved. Server: ${serverMsg}`,
                });
            }
        } finally {
            setIsSaving(false);
        }
    };
    
    const availableSubjects = useMemo(() => {
        if (!profileData.level) return [];
        const subjectsForLevel =
            subjectsByLevel[profileData.level]?.length ? subjectsByLevel[profileData.level]! : allCatalogSubjects;
        return subjectsForLevel.filter((s) => !profileData.subjects?.some((st) => st.name === s));
    }, [profileData.level, profileData.subjects, subjectsByLevel]);
    
    if (loading || !user) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }
    
    /** Firestore / imports may use inconsistent casing; normalize before branching. */
    const normalizedRole = (userProfile?.role ?? '').toString().toUpperCase().trim();
    /** Missing or empty `role` must NOT send users to the “non‑student” screen — treat as student setup. */
    const isStudentSetup =
        !userProfile || !normalizedRole || normalizedRole === 'STUDENT';
    const isEditingProfile = Boolean(userProfile?.onboardingComplete);

    if (userProfile && normalizedRole === 'ADMIN') {
        const saveAdminProfile = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user) return;
            setIsSaving(true);
            try {
                const result = await updateBasicUserProfile(user.uid, {
                    fullName: profileData.fullName?.trim() || userProfile.name || '',
                    profileImageUrl: profileData.profileImageUrl ?? null,
                    coverImageUrl: profileData.coverImageUrl ?? null,
                });
                if (result.success) {
                    toast({ title: 'Profile saved', description: 'Your administrator profile has been updated.' });
                    router.push('/admin/dashboard');
                } else {
                    toast({ variant: 'destructive', title: 'Save failed', description: result.error });
                }
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4 py-8">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Edit administrator profile</CardTitle>
                        <CardDescription>Update your display name and profile images.</CardDescription>
                    </CardHeader>
                    <form onSubmit={saveAdminProfile}>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="admin-name">Full name</Label>
                                <Input
                                    id="admin-name"
                                    value={profileData.fullName ?? userProfile.name ?? ''}
                                    onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <ProfileImageUpload
                                label="Profile photo"
                                kind="profile"
                                variant="avatar"
                                value={profileData.profileImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, profileImageUrl: url }))}
                                disabled={isSaving}
                            />
                            <ProfileImageUpload
                                label="Cover image"
                                kind="cover"
                                variant="banner"
                                value={profileData.coverImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, coverImageUrl: url }))}
                                disabled={isSaving}
                            />
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save profile'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push('/account')}>
                                Cancel
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

    if (userProfile && normalizedRole === 'PARENT') {
        const saveParentProfile = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user) return;
            setIsSaving(true);
            try {
                const result = await updateBasicUserProfile(user.uid, {
                    fullName: profileData.fullName?.trim() || userProfile.name || '',
                    profileImageUrl: profileData.profileImageUrl ?? null,
                    coverImageUrl: profileData.coverImageUrl ?? null,
                });
                if (result.success) {
                    toast({ title: 'Profile saved', description: 'Your parent profile has been updated.' });
                    router.push('/parent/dashboard');
                } else {
                    toast({ variant: 'destructive', title: 'Save failed', description: result.error });
                }
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4 py-8">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Edit parent profile</CardTitle>
                        <CardDescription>Update your name and photo shown in the Command Centre.</CardDescription>
                    </CardHeader>
                    <form onSubmit={saveParentProfile}>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="parent-name">Full name</Label>
                                <Input
                                    id="parent-name"
                                    value={profileData.fullName ?? userProfile.name ?? ''}
                                    onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <ProfileImageUpload
                                label="Profile photo"
                                kind="profile"
                                variant="avatar"
                                value={profileData.profileImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, profileImageUrl: url }))}
                                disabled={isSaving}
                            />
                            <ProfileImageUpload
                                label="Cover image"
                                kind="cover"
                                variant="banner"
                                value={profileData.coverImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, coverImageUrl: url }))}
                                disabled={isSaving}
                            />
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save profile'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push('/account')}>
                                Cancel
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

    if (userProfile && normalizedRole === 'SCHOOL_TUTOR') {
        const saveTeacherProfile = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user) return;
            setIsSaving(true);
            try {
                const result = await updateBasicUserProfile(user.uid, {
                    fullName: profileData.fullName?.trim() || userProfile.name || '',
                    profileImageUrl: profileData.profileImageUrl ?? null,
                    coverImageUrl: profileData.coverImageUrl ?? null,
                });
                if (result.success) {
                    toast({ title: 'Profile saved', description: 'Your teacher profile has been updated.' });
                    router.push('/account');
                } else {
                    toast({ variant: 'destructive', title: 'Save failed', description: result.error });
                }
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4 py-8">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Edit teacher profile</CardTitle>
                        <CardDescription>
                            Update your display name and photos. Link your school from the Command Centre if you have
                            not already.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={saveTeacherProfile}>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="teacher-name">Full name</Label>
                                <Input
                                    id="teacher-name"
                                    value={profileData.fullName ?? userProfile.name ?? ''}
                                    onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <ProfileImageUpload
                                label="Profile photo"
                                kind="profile"
                                variant="avatar"
                                value={profileData.profileImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, profileImageUrl: url }))}
                                disabled={isSaving}
                            />
                            <ProfileImageUpload
                                label="Cover image"
                                kind="cover"
                                variant="banner"
                                value={profileData.coverImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, coverImageUrl: url }))}
                                disabled={isSaving}
                            />
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save profile'}
                            </Button>
                            <Button type="button" variant="secondary" asChild>
                                <Link href="/teacher/dashboard">Command Centre</Link>
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push('/account')}>
                                Cancel
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

    if (userProfile && normalizedRole === 'SCHOOL_ADMIN') {
        const saveSchoolAdminProfile = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user) return;
            setIsSaving(true);
            try {
                const result = await updateBasicUserProfile(user.uid, {
                    fullName: profileData.fullName?.trim() || userProfile.name || '',
                    profileImageUrl: profileData.profileImageUrl ?? null,
                    coverImageUrl: profileData.coverImageUrl ?? null,
                });
                if (result.success) {
                    toast({ title: 'Profile saved', description: 'Your administrator profile has been updated.' });
                    router.push('/school/dashboard');
                } else {
                    toast({ variant: 'destructive', title: 'Save failed', description: result.error });
                }
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4 py-8">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-6 w-6" />
                            School administrator profile
                        </CardTitle>
                        <CardDescription>
                            Update your display name and photo. Configure your school workspace separately.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={saveSchoolAdminProfile}>
                        <CardContent className="space-y-6">
                            <Alert>
                                <AlertTitle>Platform verification</AlertTitle>
                                <AlertDescription>
                                    Your institution may still show as pending in our records. You can use the Command
                                    Centre, onboarding, and ACU tools while setup is in progress.
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label htmlFor="school-admin-name">Full name</Label>
                                <Input
                                    id="school-admin-name"
                                    value={profileData.fullName ?? userProfile.name ?? ''}
                                    onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <ProfileImageUpload
                                label="Profile photo"
                                kind="profile"
                                variant="avatar"
                                value={profileData.profileImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, profileImageUrl: url }))}
                                disabled={isSaving}
                            />
                            <ProfileImageUpload
                                label="Cover image"
                                kind="cover"
                                variant="banner"
                                value={profileData.coverImageUrl ?? ''}
                                onChange={(url) => setProfileData((p) => ({ ...p, coverImageUrl: url }))}
                                disabled={isSaving}
                            />
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save profile'}
                            </Button>
                            <Button type="button" variant="secondary" asChild>
                                <Link href="/school/onboarding?edit=1">Edit school workspace</Link>
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push('/account')}>
                                Cancel
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

    // Non-students (parent, tutor, etc.) skip detailed academic fields here
    if (userProfile && !isStudentSetup) {
        const dashboardHref =
            normalizedRole === 'PRIVATE_TUTOR'
                ? '/tutor/dashboard'
                : normalizedRole === 'PARENT'
                  ? '/parent/dashboard'
                  : normalizedRole === 'SCHOOL_TUTOR'
                    ? '/teacher/dashboard'
                    : '/dashboard';
        return (
             <div className="flex items-center justify-center min-h-screen bg-background p-4 py-8">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Profile Complete</CardTitle>
                        <CardDescription>
                          Your profile as a {userProfile.role?.toLowerCase().replace(/_/g, ' ')} does not require detailed academic setup.
                          {normalizedRole === 'SCHOOL_TUTOR' && (
                            <> On your Command Centre, link to your school using the join code from your administrator or accept an email invite.</>
                          )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button onClick={() => router.push(dashboardHref)}>Go to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4 py-8">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle>{isEditingProfile ? 'Edit your profile' : 'Set Up Your Student Profile'}</CardTitle>
                    <CardDescription>
                        {isEditingProfile
                            ? 'Update your personal details, study level, subjects, and photos.'
                            : 'This helps us personalize your learning experience and generate your academic recovery plan.'}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit} noValidate>
                    <CardContent className="space-y-8">

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Personal Details</h3>
                             <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/50">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input id="fullName" value={profileData.fullName} onChange={(e) => setProfileData(p => ({...p, fullName: e.target.value}))} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input id="dob" type="date" value={profileData.dob} onChange={(e) => setProfileData(p => ({...p, dob: e.target.value}))} required />
                                </div>
                                <div className="md:col-span-2 grid gap-8 sm:grid-cols-2">
                                    <ProfileImageUpload
                                        label="Profile photo"
                                        kind="profile"
                                        variant="avatar"
                                        value={profileData.profileImageUrl ?? ''}
                                        onChange={(url) => setProfileData((p) => ({ ...p, profileImageUrl: url }))}
                                        disabled={isSaving}
                                    />
                                    <ProfileImageUpload
                                        label="Cover image"
                                        kind="cover"
                                        variant="banner"
                                        value={profileData.coverImageUrl ?? ''}
                                        onChange={(url) => setProfileData((p) => ({ ...p, coverImageUrl: url }))}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Academic Details</h3>
                             <div className="space-y-6 p-4 border rounded-lg bg-muted/50">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                            <Label htmlFor="year-group">Study Level / Year Group</Label>
                                            {/* Native select: Radix requires value === SelectItem exactly; catalog strings use special dashes. */}
                                            <select
                                                id="year-group"
                                                required
                                                className={nativeSelectClass}
                                                value={profileData.level ?? ''}
                                                onChange={(e) =>
                                                    setProfileData((p) => ({ ...p, level: e.target.value }))
                                                }
                                            >
                                                <option value="">Select a level</option>
                                                {profileData.level &&
                                                    !studyLevels.includes(profileData.level) && (
                                                        <option value={profileData.level}>
                                                            {profileData.level} (saved)
                                                        </option>
                                                    )}
                                                {studyLevels.map((level) => (
                                                    <option key={level} value={level}>
                                                        {level}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="exam-board">Primary Exam Board</Label>
                                            <select
                                                id="exam-board"
                                                className={nativeSelectClass}
                                                value={profileData.preferences?.examBoard ?? 'none'}
                                                onChange={(e) =>
                                                    setProfileData((p) => ({
                                                        ...p,
                                                        preferences: {
                                                            ...p.preferences,
                                                            examBoard: e.target.value,
                                                        },
                                                    }))
                                                }
                                            >
                                                <option value="none">Not selected</option>
                                                {profileData.preferences?.examBoard &&
                                                    profileData.preferences.examBoard !== 'none' &&
                                                    !examBoards.includes(profileData.preferences.examBoard) && (
                                                        <option value={profileData.preferences.examBoard}>
                                                            {profileData.preferences.examBoard} (saved)
                                                        </option>
                                                    )}
                                                {examBoards.map((board) => (
                                                    <option key={board} value={board}>
                                                        {board}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                </div>

                                {profileData.level === 'University / Degree' && (
                                     <div className="space-y-2">
                                        <Label htmlFor="university-course">Target University Course (if applicable)</Label>
                                        <Select onValueChange={(v) => setProfileData(p => ({...p, universityCourse: v}))} value={profileData.universityCourse}>
                                            <SelectTrigger id="university-course"><SelectValue placeholder="Select a course" /></SelectTrigger>
                                            <SelectContent>
                                                {universityCourses.map(course => (
                                                    <SelectItem key={course} value={course}>{course}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <Label>What subjects are you studying and what are your target grades?</Label>
                                    <div className="space-y-2 rounded-md border p-4 bg-background">
                                        {profileData.subjects?.map((subject) => (
                                        <div key={subject.name} className="grid grid-cols-[1fr_150px_auto] items-center gap-2">
                                            <Input value={subject.name} disabled />
                                            <Select
                                                value={subject.targetGrade?.trim() ? subject.targetGrade : undefined}
                                                onValueChange={(grade) => handleTargetGradeChange(subject.name, grade)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Target Grade" /></SelectTrigger>
                                                <SelectContent>
                                                    {grades.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSubject(subject.name)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        ))}
                                        {(profileData.subjects || []).length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center p-4">Add your subjects below.</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Select
                                            key={subjectPickerKey}
                                            onValueChange={(v) => {
                                                if (!v) return;
                                                handleAddSubject(v);
                                                setSubjectPickerKey((k) => k + 1);
                                            }}
                                            disabled={!profileData.level}
                                        >
                                            <SelectTrigger className="flex-1"><SelectValue placeholder="Select a subject to add..." /></SelectTrigger>
                                            <SelectContent>
                                                {availableSubjects.map((subject) => (
                                                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        {saveBanner && (
                            <Alert variant={saveBanner.variant === 'destructive' ? 'destructive' : 'default'}>
                                <AlertTitle>{saveBanner.title}</AlertTitle>
                                {saveBanner.detail ? (
                                    <AlertDescription className="text-sm whitespace-pre-wrap">{saveBanner.detail}</AlertDescription>
                                ) : null}
                            </Alert>
                        )}
                        <div className="flex w-full flex-col gap-2 sm:flex-row">
                            <Button type="submit" className="w-full sm:flex-1" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : isEditingProfile ? (
                                    'Save changes'
                                ) : (
                                    'Save Profile & Continue'
                                )}
                            </Button>
                            {isEditingProfile ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={isSaving}
                                    onClick={() => router.push('/account')}
                                >
                                    Cancel
                                </Button>
                            ) : null}
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
