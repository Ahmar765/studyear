
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
  Users,
  Building,
  Target,
  ShieldAlert,
  BarChart,
  BookCopy,
  Bookmark,
  FileClock,
  FileCheck2,
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
import { useEffect } from "react";
import SplashScreen from "../splash-screen";
import { logout } from "@/server/actions/auth-actions";
import AcuBalance from "./acu-balance";
import placeholderImages from "@/app/lib/placeholder-images.json";
import ImpersonationBanner from "../impersonation-banner";
import { useImpersonation } from "@/hooks/use-impersonation";

const studentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assessment", label: "Academic Diagnostic", icon: Target },
  { href: "/diagnostic-results", label: "Diagnostic Results", icon: FileClock },
  { href: "/recovery-plan", label: "Personal Recovery Plan", icon: ShieldAlert },
  { href: "/planner", label: "AI Study Planner", icon: CalendarCheck },
  { href: "/assignment-review", label: "Assignment Review", icon: FileCheck2 },
  { href: "/saved-resources", label: "Saved Resources", icon: Bookmark },
  { href: "/create", label: "Create Resource", icon: PlusCircle },
  { href: "/search", label: "Find Resources", icon: Search },
];

const adminNavItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/content", label: "Content", icon: FileText },
    { href: "/admin/billing", label: "Billing", icon: UserCog },
    { href: "/admin/ai-usage", label: "AI Usage", icon: Bot },
    { href: "/admin/analytics", label: "Analytics", icon: LineChart },
    { href: "/admin/fraud", label: "Fraud", icon: UserCog },
    { href: "/admin/support", label: "Support", icon: MessageSquareText },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];

const parentNavItems = [
    { href: "/parent/dashboard", label: "Parent Dashboard", icon: BookUser },
];

const teacherNavItems = [
    { href: "/teacher/dashboard", label: "Teacher Dashboard", icon: GraduationCap },
];

const schoolNavItems = [
    { href: "/school/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/school/students", label: "Students", icon: Users },
    { href: "/school/staff", label: "Staff", icon: UserCog },
    { href: "/school/assessments", label: "Assessments", icon: FileText },
    { href: "/school/progress", label: "Progress", icon: LineChart },
    { href: "/school/alerts", label: "Risk Alerts", icon: ShieldAlert },
    { href: "/school/reports", label: "Reports", icon: BarChart },
    { href: "/school/interventions", label: "Interventions", icon: Target },
    { href: "/school/resources", label: "Resources", icon: BookCopy },
    { href: "/school/settings", label: "Settings", icon: Settings },
];


const navItemsByRole = {
    STUDENT: studentNavItems,
    ADMIN: adminNavItems,
    PARENT: parentNavItems,
    SCHOOL_TUTOR: teacherNavItems,
    PRIVATE_TUTOR: studentNavItems, // Tutors might have a student-like view for resources
    SCHOOL_ADMIN: schoolNavItems,
};


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { isImpersonating } = useImpersonation();
  const router = useRouter();

  const loading = authLoading || profileLoading;

  const onboardingComplete = userProfile?.onboardingComplete === true;


  useEffect(() => {
    if (loading) return;

    const publicPages = ['/', '/login', '/signup', '/how-it-works', '/terms-of-service', '/about', '/forgot-password', '/privacy-policy', '/disclaimer', '/cookies', '/contact'];
    const isPublicPage = publicPages.some(page => pathname === page);
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

    if (user && userProfile && userProfile.role === 'STUDENT' && !onboardingComplete && pathname !== '/profile-setup') {
        router.replace('/profile-setup');
        return;
    }

    // Route staff/parent dashboards by role whenever we have a profile. Do not require
    // onboardingComplete here — admins often never set student onboarding flags, and would
    // otherwise stay on /dashboard (student) forever after login.
    if (userProfile) {
        const role = userProfile.role;
        const isAdminDashboard = pathname.startsWith('/admin');
        const isTeacherDashboard = pathname.startsWith('/teacher');
        const isSchoolDashboard = pathname.startsWith('/school');
        const isParentDashboard = pathname.startsWith('/parent');

        if (role === 'ADMIN' && !isAdminDashboard) router.replace('/admin/dashboard');
        else if (role === 'SCHOOL_ADMIN' && !isSchoolDashboard) router.replace('/school/dashboard');
        else if (role === 'SCHOOL_TUTOR' && !isTeacherDashboard) router.replace('/teacher/dashboard');
        else if (role === 'PARENT' && !isParentDashboard) router.replace('/parent/dashboard');
        else if (['STUDENT', 'PRIVATE_TUTOR'].includes(role) && (isAdminDashboard || isTeacherDashboard || isSchoolDashboard || isParentDashboard)) {
            router.replace('/dashboard');
        } else if (role === 'STUDENT' && pathname === '/') {
            router.replace('/dashboard');
        }
    }
  }, [pathname, user, userProfile, loading, router, onboardingComplete]);


  const handleLogout = async () => {
    if (user) {
      const sessionId = sessionStorage.getItem('sessionId');
      await logout(user.uid, sessionId);
      sessionStorage.removeItem('sessionId');
      router.push('/login');
    }
  }

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

  const noLayoutPages = ['/login', '/signup', '/profile-setup', '/forgot-password', '/auth/impersonate'];
  if (noLayoutPages.includes(pathname)) {
    return <main>{children}</main>;
  }

  if (loading && !noLayoutPages.includes(pathname)) {
    return (
      <SplashScreen />
    );
  }

  const role = userProfile?.role || 'STUDENT';
  const currentNavItems = navItemsByRole[role] || studentNavItems;
  const showSidebar = !!user;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
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
                        isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
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
        <SidebarInset className="flex flex-col">
          { isImpersonating && <ImpersonationBanner /> }
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
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
                  <AcuBalance />
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
                      <DropdownMenuLabel>{userProfile?.name || user.email}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/account">My Account</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href="/profile-setup">Edit Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                  <div className="flex items-center gap-2">
                      <Button asChild variant="ghost">
                          <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild>
                          <Link href="/signup">Sign Up</Link>
                      </Button>
                  </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
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
