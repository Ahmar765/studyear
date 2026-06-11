
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  FileText,
  PlusCircle,
  Bot,
  FileSignature,
  LineChart,
  UserCog,
  BookUser,
  Settings,
  Loader,
  GraduationCap,
  MessageSquareText,
  Mail,
  Users,
  Building,
  Target,
  ShieldAlert,
  BarChart,
  BookCopy,
  Bookmark,
  FileClock,
  FileCheck2,
  MessageSquare,
  TrendingUp,
  PlayCircle,
  Wand2,
  Newspaper,
  Briefcase,
  PoundSterling,
  Video,
  ClipboardList,
  Fuel,
  Sparkles,
} from "lucide-react";
import Logo from "../logo";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useEffectiveRole } from "@/hooks/use-effective-role";
import { useEffect } from "react";
import SplashScreen from "../splash-screen";
import { logout as endServerSession } from "@/server/actions/auth-actions";
import PlanSummaryNav from "./plan-summary-nav";
import placeholderImages from "@/app/lib/placeholder-images.json";
import ImpersonationBanner from "../impersonation-banner";
import { useImpersonation } from "@/hooks/use-impersonation";

const studentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutors", label: "Find tutors", icon: GraduationCap },
  { href: "/account#parent-link-code", label: "Parent link code", icon: Users },
  { href: "/assessment", label: "Academic Diagnostic", icon: Target },
  { href: "/diagnostic-results", label: "Diagnostic Results", icon: FileClock },
  { href: "/recovery-plan", label: "Personal Recovery Plan", icon: ShieldAlert },
  { href: "/planner", label: "AI Study Planner", icon: CalendarCheck },
  { href: "/ai-tutor", label: "AI Tutor", icon: MessageSquare },
  { href: "/interactive-lesson", label: "Interactive Lesson", icon: PlayCircle },
  { href: "/create/ai-course", label: "AI Course", icon: Wand2 },
  { href: "/progress", label: "My Progress", icon: LineChart },
  { href: "/predict-grade", label: "Predicted Grade", icon: TrendingUp },
  { href: "/assignment-review", label: "Assignment Review", icon: FileCheck2 },
  { href: "/saved-resources", label: "Saved Resources", icon: Bookmark },
  { href: "/create", label: "Create Resource", icon: PlusCircle },
  { href: "/search", label: "Find Resources", icon: Search },
  { href: "/contribute", label: "Submit video / paper", icon: FileText },
];

const adminNavItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/tutors", label: "Tutor applications", icon: GraduationCap },
    { href: "/admin/blog", label: "Blog", icon: Newspaper },
    { href: "/admin/content", label: "Content", icon: FileText },
    { href: "/admin/billing", label: "Revenue & billing", icon: UserCog },
    { href: "/admin/ai-usage", label: "AI costs", icon: Bot },
    { href: "/admin/analytics", label: "Analytics", icon: LineChart },
    { href: "/admin/fraud", label: "Fraud", icon: UserCog },
    { href: "/admin/support", label: "Support", icon: MessageSquareText },
    { href: "/admin/contact-inbox", label: "Contact inbox", icon: Mail },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];

const parentNavItems = [
    { href: "/parent/dashboard", label: "Command Centre", icon: BookUser },
];

const schoolTutorNavItems = [
  { href: "/teacher/dashboard", label: "Command Centre", icon: Briefcase },
  { href: "/teacher/classes", label: "Classes", icon: Users },
  { href: "/teacher/interventions", label: "Interventions", icon: Target },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/classroom", label: "Classroom", icon: Video },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart },
  { href: "/teacher/communications", label: "Communications", icon: MessageSquareText },
  { href: "/ai-tutor", label: "AI Teaching Assistant", icon: Bot },
  { href: "/create/ai-course", label: "AI lesson builder", icon: Sparkles },
];

const privateTutorNavItems = [
  { href: "/tutor/dashboard", label: "Command Centre", icon: Briefcase },
  { href: "/tutor/calendar", label: "Calendar", icon: CalendarCheck },
  { href: "/tutor/students", label: "Student pipeline", icon: Users },
  { href: "/tutor/classroom", label: "Classroom", icon: Video },
  { href: "/tutor/earnings", label: "Earnings", icon: PoundSterling },
  { href: "/tutor/profile", label: "Authority profile", icon: UserCog },
  { href: "/checkout", label: "Top up ACUs", icon: Fuel },
  { href: "/ai-tutor", label: "AI Teaching Assistant", icon: Bot },
  { href: "/tutors", label: "My marketplace listing", icon: GraduationCap },
];

const schoolNavItems = [
  { href: "/school/dashboard", label: "Command Centre", icon: Briefcase },
  { href: "/school/alerts", label: "Risk intelligence", icon: ShieldAlert },
  { href: "/school/interventions", label: "Intervention war room", icon: Target },
  { href: "/school/people", label: "People management", icon: Users },
  { href: "/school/progress", label: "Analytics", icon: LineChart },
  { href: "/school/acu", label: "ACU command", icon: Bot },
  { href: "/school/assessments", label: "Assessments", icon: FileText },
  { href: "/school/reports", label: "Executive reports", icon: BarChart },
  { href: "/school/resources", label: "Knowledge hub", icon: BookCopy },
  { href: "/checkout", label: "Top up ACUs", icon: Fuel },
  { href: "/school/settings", label: "Settings", icon: Settings },
];


/** Student-only learning paths — tutors are redirected away, except shared marketplace routes. */
const studentShellPrefixes = [
  '/dashboard',
  '/assessment',
  '/diagnostic-results',
  '/recovery-plan',
  '/planner',
  '/interactive-lesson',
  '/create',
  '/progress',
  '/predict-grade',
  '/assignment-review',
  '/saved-resources',
  '/search',
  '/profile-setup',
  '/resources',
  '/contribute',
  '/past-papers',
];

function isTutorMarketplacePath(pathname: string): boolean {
  return pathname === '/tutors' || pathname.startsWith('/tutors/');
}

function isOwnTutorMarketplacePath(pathname: string, uid: string | undefined): boolean {
  if (!uid) return false;
  return pathname === `/tutors/${uid}` || pathname.startsWith(`/tutors/${uid}/`);
}

function isStudentShellPath(pathname: string): boolean {
  return studentShellPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isBlogPath(pathname: string): boolean {
  return pathname === '/blog' || pathname.startsWith('/blog/');
}

const navItemsByRole = {
    STUDENT: studentNavItems,
    ADMIN: adminNavItems,
    PARENT: parentNavItems,
    SCHOOL_TUTOR: schoolTutorNavItems,
    PRIVATE_TUTOR: privateTutorNavItems,
    SCHOOL_ADMIN: schoolNavItems,
};

/** Sidebar highlight: `/create` hub vs `/create/ai-course`, dashboard exact match. */
function navItemIsActive(pathname: string, itemHref: string): boolean {
  if (itemHref === '/dashboard') return pathname === '/dashboard';
  if (itemHref === '/create') return pathname === '/create';
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

function accountRoleLabel(role: string): string {
  switch (role) {
    case 'STUDENT':
      return 'Student';
    case 'PARENT':
      return 'Parent';
    case 'PRIVATE_TUTOR':
      return 'Private tutor';
    case 'SCHOOL_ADMIN':
      return 'School admin';
    case 'SCHOOL_TUTOR':
      return 'School tutor';
    case 'ADMIN':
      return 'Platform admin';
    default:
      return role;
  }
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading, firebaseInitError, logout: firebaseLogout } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { role: effectiveRole, tokenRoleResolved } = useEffectiveRole();
  const { isImpersonating } = useImpersonation();
  const router = useRouter();

  const loading =
    authLoading ||
    profileLoading ||
    (!!user && !tokenRoleResolved);

  const onboardingComplete = userProfile?.onboardingComplete === true;


  useEffect(() => {
    if (loading) return;

    const publicPages = ['/', '/login', '/signup', '/how-it-works', '/terms-of-service', '/about', '/forgot-password', '/privacy-policy', '/disclaimer', '/cookies', '/contact', '/blog'];
    const isPublicPage = publicPages.some(page => pathname === page) || isBlogPath(pathname);
    const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname);
    const isImpersonationPage = pathname === '/auth/impersonate';

    if (!user && !isPublicPage && !isImpersonationPage) {
      router.replace('/login');
      return;
    }

    if (user && isAuthPage) {
      // Land on home so role-based redirects send admins/staff to the right dashboard
      // without a flash of /dashboard (student shell).
      router.replace('/');
      return;
    }

    // Public blog — readable by anyone; skip onboarding and role-based redirects.
    if (isBlogPath(pathname)) {
      return;
    }

    if (
      user &&
      userProfile &&
      effectiveRole === 'STUDENT' &&
      !onboardingComplete &&
      pathname !== '/profile-setup' &&
      !pathname.startsWith('/account')
    ) {
      router.replace('/profile-setup');
      return;
    }

    // Route staff/parent dashboards using effective role (JWT claims + Firestore).
    // Do not require userProfile: missing `users/{uid}` would otherwise block redirects while JWT is correct.
    if (user && tokenRoleResolved) {
        const role =
          userProfile?.role === 'PRIVATE_TUTOR'
            ? 'PRIVATE_TUTOR'
            : userProfile?.role === 'SCHOOL_TUTOR'
              ? 'SCHOOL_TUTOR'
              : effectiveRole;
        const isAdminDashboard = pathname.startsWith('/admin');
        const isTeacherDashboard = pathname.startsWith('/teacher');
        const isSchoolDashboard = pathname.startsWith('/school');
        const isParentDashboard = pathname.startsWith('/parent');
        /** `/tutors` must not match — only private tutor shell under `/tutor` or `/tutor/…`. */
        const isTutorDashboard =
          pathname === '/tutor' || pathname.startsWith('/tutor/');
        /** Billing / account live outside role dashboards; allow checkout without bouncing back. */
        const parentAllowedOutsideParentRoutes =
          pathname.startsWith('/checkout') ||
          pathname === '/account' ||
          pathname.startsWith('/account/') ||
          pathname === '/profile-setup' ||
          pathname.startsWith('/contribute') ||
          pathname.startsWith('/search') ||
          pathname.startsWith('/resources') ||
          pathname.startsWith('/tutors');
        const tutorAllowedOutsideTutorRoutes =
          pathname.startsWith('/checkout') ||
          pathname === '/account' ||
          pathname.startsWith('/account/') ||
          pathname === '/profile-setup' ||
          pathname.startsWith('/top-up') ||
          pathname.startsWith('/ai-tutor') ||
          pathname.startsWith('/tutors');
        const teacherAllowedOutsideTeacherRoutes =
          pathname === '/account' ||
          pathname.startsWith('/account/') ||
          pathname === '/profile-setup' ||
          pathname.startsWith('/create/') ||
          pathname.startsWith('/ai-tutor') ||
          pathname.startsWith('/contribute') ||
          pathname.startsWith('/search') ||
          pathname.startsWith('/resources');

        const adminAllowedOutsideAdmin =
          pathname.startsWith('/blog') ||
          pathname.startsWith('/create') ||
          pathname === '/account' ||
          pathname.startsWith('/account/') ||
          pathname === '/profile-setup' ||
          pathname.startsWith('/contribute') ||
          pathname.startsWith('/search') ||
          pathname.startsWith('/resources');

        if (role === 'ADMIN' && !isAdminDashboard && !adminAllowedOutsideAdmin) {
          router.replace('/admin/dashboard');
        }
        else if (role === 'SCHOOL_ADMIN') {
          const schoolOnboarding = pathname === '/school/onboarding';
          const schoolAllowedOutside =
            pathname.startsWith('/checkout') ||
            pathname.startsWith('/top-up') ||
            pathname === '/account' ||
            pathname.startsWith('/account/') ||
            pathname === '/profile-setup' ||
            pathname.startsWith('/contribute') ||
            pathname.startsWith('/search') ||
            pathname.startsWith('/resources') ||
            pathname.startsWith('/create') ||
            pathname.startsWith('/saved-resources') ||
            pathname.startsWith('/past-papers');
          if (!isSchoolDashboard && !schoolOnboarding && !schoolAllowedOutside) {
            router.replace('/school/dashboard');
          } else if (pathname === '/') {
            router.replace('/school/dashboard');
          }
        }
        else if (role === 'SCHOOL_TUTOR') {
          if (pathname === '/') {
            router.replace('/teacher/dashboard');
          } else if (isTeacherDashboard || teacherAllowedOutsideTeacherRoutes) {
            // Allow profile edit, AI lesson builder, account, etc.
          } else if (
            isAdminDashboard ||
            isSchoolDashboard ||
            isParentDashboard ||
            isTutorDashboard ||
            isStudentShellPath(pathname)
          ) {
            router.replace('/teacher/dashboard');
          } else {
            router.replace('/teacher/dashboard');
          }
        }
        else if (role === 'PARENT' && !isParentDashboard && !parentAllowedOutsideParentRoutes) {
            router.replace('/parent/dashboard');
        }
        else if (role === 'PRIVATE_TUTOR') {
          const tutorApproved = (userProfile as { tutorApproved?: boolean } | null)?.tutorApproved;
          // tutorApproved === true → approved; false → rejected; undefined → pending
          const tutorAccountAllowed =
            pathname.startsWith('/account') ||
            pathname === '/account';
          const isOnPendingPage = pathname === '/tutor/pending';
          const isOnRejectedPage = pathname === '/tutor/rejected';

          if (
            isAdminDashboard ||
            isTeacherDashboard ||
            isSchoolDashboard ||
            isParentDashboard ||
            (isStudentShellPath(pathname) && !isTutorMarketplacePath(pathname))
          ) {
            // Redirect to the right holding or main page
            if (tutorApproved === false) router.replace('/tutor/rejected');
            else if (tutorApproved !== true && onboardingComplete) router.replace('/tutor/pending');
            else router.replace('/tutor/dashboard');
          } else if (
            !onboardingComplete &&
            pathname !== '/tutor/onboarding' &&
            !pathname.startsWith('/tutor/onboarding') &&
            !tutorAccountAllowed
          ) {
            router.replace('/tutor/onboarding');
          } else if (onboardingComplete && tutorApproved === false && !isOnRejectedPage && !tutorAccountAllowed) {
            // Rejected — lock to rejection page
            router.replace('/tutor/rejected');
          } else if (
            onboardingComplete &&
            tutorApproved !== true &&
            !isOnPendingPage &&
            !isOnRejectedPage &&
            !tutorAccountAllowed &&
            !isOwnTutorMarketplacePath(pathname, user.uid)
          ) {
            // Pending — lock to pending page (own marketplace preview still allowed)
            router.replace('/tutor/pending');
          } else if (
            tutorApproved === true &&
            !isTutorDashboard &&
            !tutorAllowedOutsideTutorRoutes &&
            pathname !== '/tutor/onboarding' &&
            !pathname.startsWith('/tutor/onboarding')
          ) {
            router.replace('/tutor/dashboard');
          } else if (pathname === '/') {
            if (tutorApproved === false) router.replace('/tutor/rejected');
            else if (tutorApproved !== true && onboardingComplete) router.replace('/tutor/pending');
            else router.replace('/tutor/dashboard');
          }
        }
        else if (role === 'STUDENT' && (isAdminDashboard || isTeacherDashboard || isSchoolDashboard || isParentDashboard || isTutorDashboard)) {
            router.replace('/dashboard');
        } else if (role === 'STUDENT' && pathname === '/') {
            router.replace('/dashboard');
        }
    }
  }, [pathname, user, userProfile, loading, router, onboardingComplete, effectiveRole, tokenRoleResolved]);


  const handleLogout = async () => {
    if (!user) return;
    const sessionId = sessionStorage.getItem('sessionId');
    try {
      await endServerSession(user.uid, sessionId);
    } catch (e) {
      console.error("Failed to end server session:", e);
    }
    sessionStorage.removeItem('sessionId');
    await firebaseLogout();
  };

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (user && !sessionStorage.getItem('impersonationLogId')) {
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
          const data = JSON.stringify({ uid: user.uid, sessionId });
          navigator.sendBeacon('/api/session/end', data);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const noLayoutPages = ['/login', '/signup', '/profile-setup', '/tutor/onboarding', '/school/onboarding', '/forgot-password', '/auth/impersonate'];
  const publicMarketingPages = [
    '/',
    '/how-it-works',
    '/about',
    '/terms-of-service',
    '/privacy-policy',
    '/disclaimer',
    '/cookies',
    '/contact',
    '/blog',
  ];
  const isPublicMarketingPage =
    publicMarketingPages.includes(pathname) || isBlogPath(pathname);

  if (noLayoutPages.includes(pathname)) {
    return <main>{children}</main>;
  }

  if (loading && !isPublicMarketingPage) {
    return <SplashScreen />;
  }

  const resolvedRole =
    userProfile?.role === 'PRIVATE_TUTOR'
      ? 'PRIVATE_TUTOR'
      : userProfile?.role === 'SCHOOL_TUTOR'
        ? 'SCHOOL_TUTOR'
        : effectiveRole;
  const currentNavItems = (navItemsByRole[resolvedRole] || studentNavItems).map((item) => {
    if (resolvedRole === 'PRIVATE_TUTOR' && item.href === '/tutors' && user?.uid) {
      return { ...item, href: `/tutors/${user.uid}`, label: 'My marketplace listing' };
    }
    return item;
  });
  const showSidebar = !!user;

  return (
    <SidebarProvider className="min-w-0 overflow-x-clip">
      {firebaseInitError ? (
        <div
          className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
          role="alert"
        >
          Firebase is not configured on this deployment. Marketing pages work, but sign-in and
          dashboards need NEXT_PUBLIC_FIREBASE_* (and server admin credentials) in Firebase App
          Hosting → Environment variables, then redeploy.
        </div>
      ) : null}
      <div className="flex min-h-screen min-w-0 w-full max-w-full overflow-x-clip">
        { showSidebar && (
          <Sidebar>
            <SidebarContent>
              <SidebarHeader>
                <Logo />
              </SidebarHeader>
              <SidebarMenu>
                {currentNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={navItemIsActive(pathname, item.href)}
                        tooltip={item.label}
                      >
                        <span>
                          <item.icon />
                          <span>{item.label}</span>
                        </span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        )}
        <SidebarInset className="flex min-w-0 w-full max-w-full flex-col overflow-x-clip">
          { isImpersonating && <ImpersonationBanner /> }
          <header className="sticky top-0 z-10 flex h-16 min-w-0 w-full max-w-full items-center justify-between overflow-x-clip border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-4">
              { showSidebar ? (
                <div className="md:hidden">
                  <SidebarTrigger />
                </div>
              ) : null}
               <div className={showSidebar ? "hidden md:flex" : "flex"}>
                  <Logo />
              </div>
            </div>
            <div className="flex-1">
            </div>
            <div className="flex items-center gap-4">
              { user ? (
                <>
                  <PlanSummaryNav />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar>
                          <AvatarImage src={userProfile?.profileImageUrl ?? placeholderImages.defaultUserAvatar.src} alt="User Avatar" data-ai-hint={placeholderImages.defaultUserAvatar.hint} />
                          <AvatarFallback><UserIcon /></AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="space-y-0.5">
                        <span className="block font-medium">{userProfile?.name || user.email}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {accountRoleLabel(resolvedRole)}
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => router.push('/account')}
                      >
                        My Account
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() =>
                          router.push(
                            resolvedRole === 'ADMIN'
                              ? '/profile-setup'
                              : resolvedRole === 'PRIVATE_TUTOR'
                                ? '/tutor/profile'
                                : '/profile-setup',
                          )
                        }
                      >
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <Button asChild variant="ghost" size="sm" className="px-2 sm:px-4">
                          <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild size="sm" className="px-2 sm:px-4">
                          <Link href="/signup">Sign Up</Link>
                      </Button>
                  </div>
              )}
            </div>
          </header>
          <main className="flex-1 min-w-0 w-full max-w-full overflow-x-clip overflow-y-auto">
            {children}
          </main>
           <footer className="border-t bg-background text-muted-foreground">
              <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="md:col-span-1 space-y-4">
                    <Logo />
                    <p className="text-sm">
                      StudYear is an AI-powered academic command centre, unifying student data, learning, teaching, and communication in one intelligent platform.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:col-span-3">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Platform</h4>
                      <ul className="space-y-2 text-sm">
                        <li><Link href="/how-it-works" className="hover:text-primary">How It Works</Link></li>
                        <li><Link href="/create" className="hover:text-primary">Create</Link></li>
                        <li><Link href="/search" className="hover:text-primary">Find Resources</Link></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Company</h4>
                      <ul className="space-y-2 text-sm">
                        <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                        <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                        <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Legal</h4>
                      <ul className="space-y-2 text-sm">
                        <li><Link href="/terms-of-service" className="hover:text-primary">Terms</Link></li>
                        <li><Link href="/privacy-policy" className="hover:text-primary">Privacy</Link></li>
                        <li><Link href="/disclaimer" className="hover:text-primary">Disclaimer</Link></li>
                        <li><Link href="/cookies" className="hover:text-primary">Cookies</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="mt-8 border-t pt-4 text-center text-xs">
                  <p>&copy; {new Date().getFullYear()} StudYear Ltd. All rights reserved. Use of this platform is subject to our Terms of Service, Privacy Policy, Disclaimer, and Cookies Policy.</p>
                </div>
              </div>
            </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
