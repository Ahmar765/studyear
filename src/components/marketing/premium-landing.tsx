import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  CalendarCheck,
  BarChart3,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SystemVisual from '@/components/system-visual';
import { LandingMarquee } from '@/components/marketing/landing-marquee';
import { LandingReveal } from '@/components/marketing/landing-reveal';
import type { PublicHomeStats } from '@/server/lib/public-home-stats';
import { formatHomeStatCount } from '@/server/lib/public-home-stats';

type PremiumLandingProps = {
  stats: PublicHomeStats;
};

const audiences = [
  {
    title: 'Students',
    tagline: 'Study smarter, not harder',
    description:
      'AI tutor, personalised plans, quizzes, flashcards, and instant feedback — one workspace built around your grades.',
    icon: GraduationCap,
    href: '/signup',
    accent: 'from-sky-500/20 to-blue-600/5',
    iconClass: 'text-sky-400',
  },
  {
    title: 'Parents',
    tagline: 'Clarity without micromanaging',
    description:
      'Live progress, risk alerts, and intervention insights so you support your child with confidence.',
    icon: HeartHandshake,
    href: '/signup',
    accent: 'from-emerald-500/20 to-teal-600/5',
    iconClass: 'text-emerald-400',
  },
  {
    title: 'Schools',
    tagline: 'Executive academic operations',
    description:
      'Cohort health maps, staff deployment, at-risk intelligence, and shared ACU pools for your institution.',
    icon: Building2,
    href: '/signup',
    accent: 'from-violet-500/20 to-purple-600/5',
    iconClass: 'text-violet-400',
  },
  {
    title: 'Tutors',
    tagline: 'Professional command centre',
    description:
      'Marketplace listings, session pipeline, AI teaching tools, and earnings — built for independent educators.',
    icon: Users,
    href: '/signup',
    accent: 'from-amber-500/20 to-orange-600/5',
    iconClass: 'text-amber-400',
  },
];

const features = [
  {
    title: 'AI Tutor',
    description: '24/7 conversational support with diagrams, quizzes, and step-by-step explanations.',
    icon: Bot,
    span: 'md:col-span-2 md:row-span-1',
  },
  {
    title: 'Diagnostic Engine',
    description: 'Pinpoint weak topics before they become grade shocks.',
    icon: Search,
    span: '',
  },
  {
    title: 'Adaptive Study Plans',
    description: 'Week-by-week priorities that shift as mastery improves.',
    icon: CalendarCheck,
    span: '',
  },
  {
    title: 'Assignment Review',
    description: 'Predicted grades, structured feedback, and educational visuals.',
    icon: BrainCircuit,
    span: 'md:col-span-2',
  },
  {
    title: 'Visual Learning Tools',
    description: 'Charts, graphs, and diagrams generated from your data.',
    icon: BarChart3,
    span: '',
  },
  {
    title: 'Progress Intelligence',
    description: 'Real-time dashboards for students, families, and leaders.',
    icon: LineChart,
    span: '',
  },
];

const steps = [
  {
    step: '01',
    title: 'Assess & diagnose',
    body: 'Ingest academic data and confidence signals to establish a precise baseline and risk profile.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Plan & automate',
    body: 'AI generates prioritised study schedules and interventions aligned to exam timelines.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Execute & improve',
    body: 'Every interaction updates mastery metrics — plans adapt in real time as grades move.',
    icon: TrendingUp,
  },
];

const proofPoints = [
  {
    quote:
      'Finally one place where diagnostics, planning, and progress aren’t scattered across five different tools.',
    role: 'Designed for modern learners',
  },
  {
    quote:
      'School leaders get cohort visibility without waiting for end-of-term reports to spot who needs help.',
    role: 'Built for institutions',
  },
  {
    quote:
      'Parents see momentum and risk early — not just a report card surprise.',
    role: 'Trusted by families',
  },
];

export function PremiumLanding({ stats }: PremiumLandingProps) {
  const heroStats = [
    { value: formatHomeStatCount(stats.studentAccounts), label: 'Student accounts', icon: GraduationCap },
    { value: formatHomeStatCount(stats.partnerSchools), label: 'Partner organisations', icon: Building2 },
    { value: formatHomeStatCount(stats.communityResources), label: 'Resources shared', icon: BookOpen },
    { value: formatHomeStatCount(stats.totalUserProfiles), label: 'Profiles created', icon: LayoutDashboard },
  ];

  return (
    <div className="landing-page w-full max-w-[100vw] overflow-x-clip bg-slate-950 text-slate-50">
      {/* ── Hero ── */}
      <section className="landing-hero relative isolate w-full overflow-x-clip">
        <div className="landing-orb landing-orb-1" aria-hidden />
        <div className="landing-orb landing-orb-2" aria-hidden />
        <div className="landing-orb landing-orb-3" aria-hidden />
        <div className="landing-grid-fade absolute inset-0" aria-hidden />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 pb-16 pt-12 sm:pb-20 sm:pt-16 md:pb-32 md:pt-24 lg:pt-28">
          <div className="grid w-full min-w-0 grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-12">
            <div className="flex w-full min-w-0 max-w-full flex-col items-start space-y-6 sm:space-y-8">
              <Badge
                variant="outline"
                className="landing-hero-in landing-hero-in-1 max-w-full border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur-sm sm:px-4 sm:text-sm"
              >
                <Sparkles className="mr-2 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">The UK&apos;s AI-Powered Education OS</span>
              </Badge>

              <h1 className="landing-hero-in landing-hero-in-2 w-full min-w-0 max-w-full break-words text-[clamp(1.75rem,8vw,4.5rem)] font-bold leading-[1.12] tracking-tight">
                Turn data into{' '}
                <span className="landing-gradient-text">better grades.</span>
              </h1>

              <p className="landing-hero-in landing-hero-in-3 w-full min-w-0 max-w-full break-words text-base leading-relaxed text-slate-400 sm:text-lg md:max-w-xl md:text-xl">
                StudYear unifies diagnostics, AI tutoring, study planning, and live progress into one
                premium command centre — for students, parents, schools, and tutors.
              </p>

              <div className="landing-hero-in landing-hero-in-4 flex w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="landing-cta-primary h-12 w-full px-6 text-base shadow-lg shadow-primary/25 sm:w-auto sm:px-8"
                >
                  <Link href="/signup">
                    Start free today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-white/20 bg-white/5 px-6 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white sm:w-auto sm:px-8"
                >
                  <Link href="/how-it-works">See how it works</Link>
                </Button>
              </div>

              <div className="landing-hero-in landing-hero-in-5 flex w-full flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 sm:text-sm">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  GDPR-conscious design
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  AI-native workflows
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-sky-400" />
                  Live progress sync
                </span>
              </div>
            </div>

            <div className="landing-hero-visual relative hidden w-full min-w-0 max-w-full lg:block">
              <div className="landing-visual-frame landing-float relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/50 shadow-2xl shadow-primary/10 backdrop-blur-sm">
                <div className="absolute inset-0 z-10 bg-gradient-to-tr from-primary/20 via-transparent to-violet-500/10 pointer-events-none" />
                <div className="absolute inset-0">
                  <SystemVisual
                    module="hero"
                    user_role="ADMIN"
                    intent="control"
                    className="object-cover opacity-95"
                    priority
                    fill
                  />
                </div>
              </div>
              <div className="landing-float-delay absolute -bottom-6 -left-4 hidden rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur-md md:block">
                <p className="text-xs font-medium text-slate-400">Avg. study plan adherence</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-400">↑ Live tracking</p>
              </div>
              <div className="landing-float absolute -right-4 -top-4 hidden rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur-md md:block">
                <p className="text-xs font-medium text-slate-400">AI interventions</p>
                <p className="text-2xl font-bold tabular-nums text-primary">Real-time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingMarquee />

      {/* ── Live stats ── */}
      <section className="w-full border-b border-white/5 bg-slate-950 py-10 sm:py-14">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:gap-8 md:grid-cols-4">
            {heroStats.map((stat, i) => (
              <LandingReveal key={stat.label} delay={i * 80}>
                <div className="landing-stat-card group min-w-0 text-center">
                  <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary transition-transform group-hover:scale-110 sm:mb-3 sm:h-7 sm:w-7" />
                  <p className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl md:text-4xl">{stat.value}</p>
                  <p className="mt-1 break-words px-1 text-[0.65rem] leading-snug text-slate-500 sm:px-0 sm:text-sm">{stat.label}</p>
                </div>
              </LandingReveal>
            ))}
          </div>
          <p className="mt-6 px-2 text-center text-[0.65rem] leading-relaxed text-slate-600 sm:mt-8 sm:text-xs">
            Live totals from StudYear — refreshed every few minutes. Em dash (—) when zero or unavailable.
          </p>
        </div>
      </section>

      {/* ── Audiences ── */}
      <section className="relative w-full py-16 sm:py-24 md:py-32">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <LandingReveal className="mx-auto mb-10 max-w-3xl text-center sm:mb-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary sm:text-sm">One platform</p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              Built for every role in education
            </h2>
            <p className="mt-4 text-base text-slate-400 sm:text-lg">
              Whether you&apos;re learning, leading, teaching, or supporting — StudYear gives you a
              dedicated command centre with shared intelligence.
            </p>
          </LandingReveal>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {audiences.map((item, i) => (
              <LandingReveal key={item.title} delay={i * 90}>
                <Link
                  href={item.href}
                  className={`landing-glass-card group relative min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br ${item.accent} p-5 transition-all duration-300 sm:p-6 sm:hover:-translate-y-1 sm:hover:border-primary/30 sm:hover:shadow-lg sm:hover:shadow-primary/5`}
                >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ${item.iconClass}`}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.tagline}</p>
                <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  Get started <ArrowRight className="ml-1 h-4 w-4" />
                </span>
                </Link>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature bento ── */}
      <section className="w-full border-y border-white/5 bg-slate-900/50 py-16 sm:py-24 md:py-32">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <LandingReveal className="mx-auto mb-10 max-w-3xl text-center sm:mb-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-400 sm:text-sm">
              Platform capabilities
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              Everything you need to win academically
            </h2>
            <p className="mt-4 text-base text-slate-400 sm:text-lg">
              A closed-loop system — not a loose collection of apps. Assess, plan, execute, and
              measure in one continuous flow.
            </p>
          </LandingReveal>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {features.map((f, i) => (
              <LandingReveal key={f.title} delay={i * 70}>
                <div
                  className={`landing-glass-card min-w-0 rounded-xl sm:rounded-2xl border border-white/10 p-5 sm:p-6 md:p-8 ${f.span}`}
                >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
                </div>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="w-full py-16 sm:py-24 md:py-32">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <LandingReveal className="mx-auto mb-10 max-w-3xl text-center sm:mb-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">How the system operates</h2>
            <p className="mt-4 text-base text-slate-400 sm:text-lg">
              Three phases. One measurable outcome: academic improvement you can see on a dashboard.
            </p>
          </LandingReveal>

          <div className="grid min-w-0 gap-6 sm:gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <LandingReveal key={s.step} delay={i * 120}>
                <div className="relative min-w-0">
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-1/2 top-12 hidden h-px w-full bg-gradient-to-r from-primary/50 to-transparent lg:block"
                    aria-hidden
                  />
                )}
                <div className="landing-glass-card relative rounded-xl sm:rounded-2xl border border-white/10 p-6 sm:p-8">
                  <span className="text-5xl font-black text-white/5">{s.step}</span>
                  <div className="relative -mt-6 mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
                </div>
                </div>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="w-full border-t border-white/5 bg-slate-900/30 py-16 sm:py-24">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
            {proofPoints.map((p, i) => (
              <LandingReveal key={p.role} delay={i * 100}>
                <blockquote
                  className="landing-glass-card min-w-0 rounded-xl sm:rounded-2xl border border-white/10 p-6 sm:p-8"
                >
                <Sparkles className="mb-4 h-6 w-6 text-amber-400/80" />
                <p className="text-base leading-relaxed text-slate-300 sm:text-lg">&ldquo;{p.quote}&rdquo;</p>
                <footer className="mt-6 text-sm font-medium text-primary">{p.role}</footer>
                </blockquote>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative w-full overflow-hidden py-16 sm:py-24 md:py-32">
        <div className="landing-orb landing-orb-cta absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <LandingReveal>
            <div className="landing-cta-panel mx-auto max-w-4xl rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-primary/20 via-slate-900 to-violet-950/80 p-6 text-center shadow-2xl sm:p-10 md:p-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              Ready to upgrade your academic operations?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
              Join StudYear free. Students, parents, schools, and tutors — pick your role and deploy
              in minutes.
            </p>
            <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <Button asChild size="lg" className="landing-cta-primary h-12 w-full px-8 text-base sm:w-auto sm:px-10">
                <Link href="/signup">
                  Create your account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10 sm:w-auto sm:px-10"
              >
                <Link href="/contact">Talk to our team</Link>
              </Button>
            </div>
            </div>
          </LandingReveal>
        </div>
      </section>
    </div>
  );
}
