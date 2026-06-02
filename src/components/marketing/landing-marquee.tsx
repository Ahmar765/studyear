'use client';

const TAGS = [
  'AI Tutor',
  'Smart Diagnostics',
  'Study Plans',
  'Grade Prediction',
  'Assignment Review',
  'Visual Charts',
  'Past Papers',
  'School Command Centre',
  'Parent Dashboard',
  'Tutor Marketplace',
  'Interactive Lessons',
  'Recovery Plans',
];

export function LandingMarquee() {
  const row = [...TAGS, ...TAGS];
  return (
    <div
      className="landing-marquee-root landing-marquee-mask border-y border-white/10 bg-slate-950/80 py-3 sm:py-4"
      aria-hidden
    >
      <div className="landing-marquee-track flex w-max gap-6 sm:gap-8">
        {row.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-medium tracking-wide text-slate-400 sm:text-sm"
          >
            <span className="landing-marquee-dot h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
