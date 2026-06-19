"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchSavedResourceById,
  type SavedResourceDetail,
} from "@/server/actions/saved-resources-actions";
import { VisualEmbedList } from '@/components/visuals/visual-embed-list';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  FileDown,
  HeartHandshake,
  Loader2,
  Moon,
  Presentation,
  Sparkles,
  Sun,
  Sunrise,
  Target,
} from "lucide-react";
import { resourceMetadata, ResourceType } from "@/data/academic";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { exportAsPdf, exportAsPptx } from "@/lib/export-resource";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function MindBranch({
  node,
}: {
  node: { title?: string; children?: unknown[] };
}) {
  const title = typeof node.title === "string" ? node.title : "Untitled";
  const children = Array.isArray(node.children) ? node.children : [];
  return (
    <li className="ml-4 list-disc text-sm">
      <span className="font-medium text-foreground">{title}</span>
      {children.length > 0 ? (
        <ul className="mt-1 space-y-1 border-l border-muted pl-3">
          {children.map((c, i) =>
            isRecord(c) ? (
              <MindBranch key={i} node={c as { title?: string; children?: unknown[] }} />
            ) : null,
          )}
        </ul>
      ) : null}
    </li>
  );
}

function getSubjectFriendlyColors(subject: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return {
    bg: `hsl(${h} 85% 92%)`,
    text: `hsl(${h} 65% 22%)`,
  };
}

function timeSlotIcon(slot: string) {
  const s = slot.toLowerCase();
  if (s.includes("morning")) return Sunrise;
  if (s.includes("evening")) return Moon;
  return Sun;
}

function priorityFriendlyClass(p: string): string {
  const x = p.toUpperCase();
  if (x === "HIGH") {
    return "border-rose-400/50 bg-rose-500/15 text-rose-950 dark:text-rose-50";
  }
  if (x === "MEDIUM") {
    return "border-amber-400/50 bg-amber-500/15 text-amber-950 dark:text-amber-50";
  }
  return "border-emerald-400/50 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50";
}

type ParsedStudyDay = {
  weekNum: number;
  weekdayLabel: string;
  calendarDate?: string;
  sessions: Array<{
    time: string;
    subject: string;
    topic: string;
    revisionMethod: string;
    priority: string;
  }>;
};

/** Readable layout for saved AI study plans (no raw JSON). */
function StudyPlanKidFriendlyView({
  content,
}: {
  content: Record<string, unknown>;
}) {
  const title =
    typeof content.title === "string" ? content.title : "Your study plan";
  const summary =
    typeof content.planSummary === "string" ? content.planSummary : "";

  const weeklyPlans = Array.isArray(content.weeklyPlans)
    ? content.weeklyPlans
    : [];

  const days: ParsedStudyDay[] = [];
  for (const w of weeklyPlans) {
    if (!isRecord(w)) continue;
    const weekNum = typeof w.week === "number" ? w.week : days.length + 1;
    const dailyPlans = Array.isArray(w.dailyPlans) ? w.dailyPlans : [];
    for (const dp of dailyPlans) {
      if (!isRecord(dp)) continue;
      const day =
        typeof dp.day === "string" ? dp.day : "Day";
      const calendarDate =
        typeof dp.calendarDate === "string" ? dp.calendarDate : undefined;
      const rawSessions = Array.isArray(dp.sessions) ? dp.sessions : [];
      const sessions = rawSessions.map((s) => {
        if (!isRecord(s)) {
          return {
            time: "",
            subject: "",
            topic: "",
            revisionMethod: "",
            priority: "MEDIUM",
          };
        }
        return {
          time: typeof s.time === "string" ? s.time : "",
          subject: typeof s.subject === "string" ? s.subject : "",
          topic: typeof s.topic === "string" ? s.topic : "",
          revisionMethod:
            typeof s.revisionMethod === "string" ? s.revisionMethod : "",
          priority: typeof s.priority === "string" ? s.priority : "MEDIUM",
        };
      });
      days.push({
        weekNum,
        weekdayLabel: day,
        calendarDate,
        sessions,
      });
    }
  }

  const sortedDays = [...days].sort((a, b) => {
    if (a.calendarDate && b.calendarDate) {
      return a.calendarDate.localeCompare(b.calendarDate);
    }
    return 0;
  });
  const allHaveDates =
    days.length > 0 && days.every((d) => Boolean(d.calendarDate));
  const displayDays = allHaveDates ? sortedDays : days;

  const timeOrder = ["Morning", "Afternoon", "Evening"];
  const weeklyGoals = weeklyPlans
    .map((w) =>
      isRecord(w) && typeof w.weeklyGoal === "string" ? w.weeklyGoal : null,
    )
    .filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-violet-500/10 p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Your timetable
            </p>
            <h3 className="text-2xl font-bold leading-tight md:text-3xl">{title}</h3>
            {summary ? (
              <p className="text-base leading-relaxed text-foreground/90 md:text-lg">
                {summary}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {weeklyGoals[0] ? (
        <Card className="rounded-3xl border-2 bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold md:text-xl">
              <Target className="h-5 w-5 text-primary" aria-hidden />
              Big goal for this stretch
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base leading-relaxed md:text-lg">
            {weeklyGoals[0]}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
          <CalendarDays className="h-6 w-6 text-primary" aria-hidden />
          Day by day
        </h4>
        <p className="text-muted-foreground text-sm md:text-base">
          Each card is one school day. Tap a coloured block to find videos and notes for that topic.
        </p>
      </div>

      <div className="space-y-5">
        {displayDays.length === 0 ? (
          <p className="text-muted-foreground">
            This plan doesn&apos;t have day-by-day sessions saved yet.
          </p>
        ) : (
          displayDays.map((d, idx) => (
            <Card
              key={`${d.calendarDate ?? d.weekdayLabel}-${idx}`}
              className="overflow-hidden rounded-3xl border-2 shadow-md"
            >
              <CardHeader className="bg-muted/60 pb-3">
                <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg md:text-xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-sm font-bold ring-2 ring-primary/20">
                    Day {idx + 1}
                  </span>
                  <span className="font-bold">
                    {d.calendarDate
                      ? (() => {
                          try {
                            return format(
                              parseISO(d.calendarDate),
                              "EEEE d MMMM yyyy",
                            );
                          } catch {
                            return d.weekdayLabel;
                          }
                        })()
                      : d.weekdayLabel}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
                {timeOrder.map((slot) => {
                  const session = d.sessions.find(
                    (s) => s.time.toLowerCase() === slot.toLowerCase(),
                  );
                  const Icon = timeSlotIcon(slot);
                  return (
                    <div key={slot} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {slot}
                      </div>
                      {session &&
                      session.subject &&
                      session.subject !== "Free" ? (
                        <Link
                          href={`/search?subject=${encodeURIComponent(session.subject)}&query=${encodeURIComponent(session.topic || "")}`}
                          className="block min-h-[110px] rounded-2xl border-2 border-transparent p-3 shadow-sm ring-offset-2 transition hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          style={{
                            ...(() => {
                              const c = getSubjectFriendlyColors(session.subject);
                              return { backgroundColor: c.bg, color: c.text };
                            })(),
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-base font-bold leading-tight">
                              {session.subject}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 border text-xs font-bold",
                                priorityFriendlyClass(session.priority),
                              )}
                            >
                              {session.priority}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-snug opacity-95">
                            {session.topic || "Study session"}
                          </p>
                          {session.revisionMethod ? (
                            <p className="mt-2 flex items-start gap-1 text-xs font-medium opacity-90">
                              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                              {session.revisionMethod}
                            </p>
                          ) : null}
                        </Link>
                      ) : session?.subject === "Free" ? (
                        <div className="flex min-h-[110px] items-center justify-center rounded-2xl border-2 border-dashed bg-muted/50 p-3 text-center text-sm font-medium text-muted-foreground">
                          Free time
                        </div>
                      ) : (
                        <div className="min-h-[110px] rounded-2xl border-2 border-dashed border-muted bg-muted/20" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function riskFriendlyClass(
  risk: string,
): "destructive" | "default" | "secondary" | "outline" {
  const r = risk.toUpperCase();
  if (r === "CRITICAL" || r === "HIGH") return "destructive";
  if (r === "MEDIUM") return "default";
  return "secondary";
}

/** Readable layout for saved recovery plans. */
function RecoveryPlanKidFriendlyView({
  content,
}: {
  content: Record<string, unknown>;
}) {
  const title =
    typeof content.title === "string" ? content.title : "Recovery plan";
  const objective =
    typeof content.recoveryObjective === "string"
      ? content.recoveryObjective
      : "";
  const risk =
    typeof content.riskLevel === "string" ? content.riskLevel : "MEDIUM";
  const urgent = Array.isArray(content.urgentFocusAreas)
    ? content.urgentFocusAreas.filter((x) => typeof x === "string")
    : [];
  const weekly = Array.isArray(content.weeklyRecoveryPlan)
    ? content.weeklyRecoveryPlan
    : [];
  const dailyNN = Array.isArray(content.dailyNonNegotiables)
    ? content.dailyNonNegotiables.filter((x) => typeof x === "string")
    : [];
  const parentActs = Array.isArray(content.parentSupportActions)
    ? content.parentSupportActions.filter((x) => typeof x === "string")
    : [];
  const metrics = Array.isArray(content.successMetrics)
    ? content.successMetrics.filter((x) => typeof x === "string")
    : [];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border-2 border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-background to-sky-500/10 p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={riskFriendlyClass(risk)} className="text-sm font-bold">
            Focus level: {risk}
          </Badge>
        </div>
        <h3 className="mt-4 text-2xl font-bold md:text-3xl">{title}</h3>
        {objective ? (
          <p className="mt-3 text-base leading-relaxed md:text-lg">{objective}</p>
        ) : null}
      </div>

      {urgent.length > 0 ? (
        <Card className="rounded-3xl border-2 border-amber-400/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Start here (most important)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-none space-y-3">
              {urgent.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-2xl bg-background/80 p-4 text-base leading-relaxed shadow-sm md:text-lg"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-1">{line}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <h4 className="text-xl font-bold md:text-2xl">Week by week</h4>
        {weekly.length === 0 ? (
          <p className="text-muted-foreground">No weekly steps were saved.</p>
        ) : (
          weekly.map((wk, wi) => {
            if (!isRecord(wk)) return null;
            const weekNum = typeof wk.week === "number" ? wk.week : wi + 1;
            const focus = typeof wk.focus === "string" ? wk.focus : "";
            const tasks = Array.isArray(wk.tasks) ? wk.tasks : [];
            return (
              <Card key={wi} className="rounded-3xl border-2">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-lg md:text-xl">
                    Week {weekNum}
                  </CardTitle>
                  {focus ? (
                    <p className="text-base font-medium text-muted-foreground">
                      {focus}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
                  {tasks.map((t, ti) => {
                    if (!isRecord(t)) return null;
                    const subject =
                      typeof t.subject === "string" ? t.subject : "";
                    const topic = typeof t.topic === "string" ? t.topic : "";
                    const action =
                      typeof t.action === "string" ? t.action : "";
                    const minutes =
                      typeof t.estimatedMinutes === "number"
                        ? t.estimatedMinutes
                        : null;
                    const outcome =
                      typeof t.expectedOutcome === "string"
                        ? t.expectedOutcome
                        : "";
                    const colors = subject
                      ? getSubjectFriendlyColors(subject)
                      : { bg: "hsl(210 40% 94%)", text: "hsl(210 40% 20%)" };
                    return (
                      <div
                        key={ti}
                        className="rounded-2xl border-2 p-4 shadow-sm"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        <p className="text-lg font-bold">{subject || "Task"}</p>
                        {topic ? (
                          <p className="mt-1 text-base font-semibold opacity-90">
                            {topic}
                          </p>
                        ) : null}
                        {minutes != null ? (
                          <p className="mt-2 text-sm font-bold opacity-90">
                            About {minutes} minutes
                          </p>
                        ) : null}
                        {action ? (
                          <p className="mt-2 text-sm leading-relaxed opacity-95">
                            {action}
                          </p>
                        ) : null}
                        {outcome ? (
                          <p className="mt-3 flex items-start gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            {outcome}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {dailyNN.length > 0 ? (
        <Card className="rounded-3xl border-2 border-sky-400/40 bg-sky-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">
              Every day habits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {dailyNN.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-2xl bg-background p-3 text-base md:text-lg"
                >
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sky-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {parentActs.length > 0 ? (
        <Card className="rounded-3xl border-2 border-pink-400/30 bg-pink-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <HeartHandshake className="h-5 w-5 text-pink-600" />
              Grown-ups can help by…
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-base md:text-lg">
              {parentActs.map((line, i) => (
                <li key={i} className="flex gap-2 rounded-xl bg-background/80 p-3">
                  <span className="font-bold text-primary">{i + 1}.</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {metrics.length > 0 ? (
        <Card className="rounded-3xl border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">
              How you&apos;ll know it&apos;s working
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {metrics.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-2xl bg-muted/60 p-4 text-base"
                >
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Saved from global library: `resources` doc stored wholesale — quiz payload lives in `.content`. */
function unwrapSavedLibraryPayload(typeKey: string, content: unknown): unknown {
  if (!isRecord(content)) return content;
  const inner = content.content;
  if (
    inner !== undefined &&
    isRecord(inner) &&
    typeof content.type === "string" &&
    content.type === typeKey
  ) {
    return inner;
  }
  return content;
}

function RenderSavedBody({
  resource,
}: {
  resource: SavedResourceDetail;
}) {
  const { typeKey, content, sourceInput } = resource;
  const body = unwrapSavedLibraryPayload(typeKey, content);

  if (body === null || body === undefined) {
    return (
      <p className="text-sm text-muted-foreground">
        No snapshot content was stored for this resource.
      </p>
    );
  }

  if (typeKey === "QUIZ" && isRecord(body)) {
    const title =
      typeof body.quizTitle === "string" ? body.quizTitle : resource.title;
    const questions = Array.isArray(body.questions) ? body.questions : [];
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">{title}</h3>
        {questions.map((q, idx) => {
          if (!isRecord(q)) return null;
          const questionText =
            typeof q.question === "string" ? q.question : "";
          const qType = q.questionType;
          const opts = Array.isArray(q.options) ? q.options : [];
          const answer = typeof q.answer === "string" ? q.answer : "";
          return (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Question {idx + 1}
                  <Badge variant="outline" className="ml-2 font-normal">
                    {String(qType ?? "question")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap">{questionText}</p>
                {opts.length > 0 ? (
                  <ul className="list-decimal pl-5 space-y-1">
                    {opts.map((o, j) => (
                      <li key={j}>{String(o)}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Model answer
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{answer}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  if (typeKey === "FLASHCARD" && isRecord(body)) {
    const cards = Array.isArray(body.flashcards) ? body.flashcards : [];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => {
          if (!isRecord(c)) return null;
          const q =
            typeof c.question === "string"
              ? c.question
              : typeof c.term === "string"
                ? c.term
                : "";
          const a =
            typeof c.answer === "string"
              ? c.answer
              : typeof c.definition === "string"
                ? c.definition
                : "";
          return (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Card {i + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Front
                  </p>
                  <p className="whitespace-pre-wrap">{q}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Back
                  </p>
                  <p className="whitespace-pre-wrap">{a}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  if (typeKey === "ESSAY_PLAN" && isRecord(body)) {
    const bodyParagraphs = Array.isArray(body.bodyParagraphs)
      ? body.bodyParagraphs
      : [];
    return (
      <div className="space-y-4 text-sm">
        {typeof body.title === "string" ? (
          <h3 className="text-xl font-semibold">{body.title}</h3>
        ) : null}
        {typeof body.thesisStatement === "string" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thesis</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap">
              {body.thesisStatement}
            </CardContent>
          </Card>
        ) : null}
        {typeof body.introduction === "string" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Introduction</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap">
              {body.introduction}
            </CardContent>
          </Card>
        ) : null}
        {bodyParagraphs.map((p, i) => {
          if (!isRecord(p)) return null;
          return (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Body paragraph {i + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 whitespace-pre-wrap">
                {typeof p.point === "string" ? (
                  <p>
                    <span className="font-medium">Point: </span>
                    {p.point}
                  </p>
                ) : null}
                {typeof p.evidence === "string" ? (
                  <p>
                    <span className="font-medium">Evidence: </span>
                    {p.evidence}
                  </p>
                ) : null}
                {typeof p.explanation === "string" ? (
                  <p>
                    <span className="font-medium">Explanation: </span>
                    {p.explanation}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {typeof body.conclusion === "string" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conclusion</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap">
              {body.conclusion}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  if (typeKey === "TOPIC_SUMMARY" && isRecord(body)) {
    const summary =
      typeof body.summary === "string" ? body.summary : null;
    if (summary) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {summary}
        </div>
      );
    }
  }

  if (typeKey === "MIND_MAP" && isRecord(body)) {
    const root = body.rootNode;
    const centralTitle =
      typeof body.title === "string" ? body.title : resource.title;
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{centralTitle}</h3>
        {isRecord(root) ? (
          <ul className="space-y-2">
            <MindBranch node={root as { title?: string; children?: unknown[] }} />
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Invalid mind map data.</p>
        )}
      </div>
    );
  }

  if (typeKey === "FORMULA_SHEET" && isRecord(content)) {
    const formulas = Array.isArray(content.formulas) ? content.formulas : [];
    const sheetTitle =
      typeof content.title === "string" ? content.title : resource.title;
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{sheetTitle}</h3>
        <div className="space-y-3">
          {formulas.map((f, i) => {
            if (!isRecord(f)) return null;
            return (
              <Card key={i}>
                <CardContent className="pt-6 space-y-2 text-sm">
                  {typeof f.formula === "string" ? (
                    <code className="block rounded bg-muted px-2 py-1 font-mono text-base">
                      {f.formula}
                    </code>
                  ) : null}
                  {typeof f.description === "string" ? (
                    <p className="text-muted-foreground">{f.description}</p>
                  ) : null}
                  {typeof f.variables === "string" ? (
                    <p className="text-xs">{f.variables}</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const visualTypes = new Set([
    "VISUAL_DRAWING",
    "EDUCATIONAL_IMAGE",
    "BAR_GRAPH",
    "LINE_GRAPH",
    "PIE_CHART",
    "SCATTER_PLOT",
    "HISTOGRAM",
    "PICTOGRAPH",
    "COORDINATE_GRAPH",
    "GEOMETRY_DIAGRAM",
    "FUNCTION_GRAPH",
    "GRAPH_THEORY_DIAGRAM",
  ]);
  if (visualTypes.has(typeKey) && isRecord(body)) {
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl : null;
    const svg = typeof body.svg === "string" ? body.svg : null;
    return (
      <div className="space-y-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={resource.title}
            className="max-w-full rounded-lg border"
          />
        ) : null}
        {svg?.trim().startsWith("<svg") ? (
          <div className="overflow-auto rounded-lg border bg-background p-4">
            <VisualEmbedList visuals={[{ title: resource.title, svg }]} />
          </div>
        ) : null}
        {!imageUrl && !svg ? (
          <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap">
            {JSON.stringify(body, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }

  if (typeKey === "AI_COURSE" && isRecord(body)) {
    const courseTitle =
      typeof body.courseTitle === "string" ? body.courseTitle : resource.title;
    const courseObjective =
      typeof body.courseObjective === "string" ? body.courseObjective : "";
    const levelLabel = typeof body.level === "string" ? body.level : "";
    const estimatedDuration =
      typeof body.estimatedDuration === "string" ? body.estimatedDuration : "";
    const modules = Array.isArray(body.modules) ? body.modules : [];

    return (
      <div className="space-y-8">
        <div className="rounded-xl border bg-muted/40 p-6 space-y-3">
          <h3 className="text-2xl font-bold">{courseTitle}</h3>
          <div className="flex flex-wrap gap-2">
            {levelLabel ? (
              <Badge variant="secondary">{levelLabel}</Badge>
            ) : null}
            {estimatedDuration ? (
              <Badge variant="outline">{estimatedDuration}</Badge>
            ) : null}
          </div>
          {courseObjective ? (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {courseObjective}
            </p>
          ) : null}
        </div>

        {modules.map((mod, mi) => {
          if (!isRecord(mod)) return null;
          const moduleTitle =
            typeof mod.moduleTitle === "string"
              ? mod.moduleTitle
              : `Module ${mi + 1}`;
          const moduleObjective =
            typeof mod.moduleObjective === "string"
              ? mod.moduleObjective
              : "";
          const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];

          return (
            <Card key={mi}>
              <CardHeader>
                <CardTitle className="text-lg">{moduleTitle}</CardTitle>
                {moduleObjective ? (
                  <CardDescription>{moduleObjective}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-6">
                {lessons.map((lesson, li) => {
                  if (!isRecord(lesson)) return null;
                  const lessonTitle =
                    typeof lesson.lessonTitle === "string"
                      ? lesson.lessonTitle
                      : `Lesson ${li + 1}`;
                  const lessonContent =
                    typeof lesson.lessonContent === "string"
                      ? lesson.lessonContent
                      : "";
                  const workedExample =
                    typeof lesson.workedExample === "string"
                      ? lesson.workedExample
                      : "";
                  const practiceQuestions = Array.isArray(
                    lesson.practiceQuestions,
                  )
                    ? lesson.practiceQuestions
                    : [];
                  const miniQuiz = Array.isArray(lesson.miniQuiz)
                    ? lesson.miniQuiz
                    : [];

                  return (
                    <div
                      key={li}
                      className="rounded-lg border bg-background p-4 space-y-4"
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                        {lessonTitle}
                      </div>
                      {lessonContent ? (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {lessonContent}
                        </div>
                      ) : null}
                      {workedExample ? (
                        <Card className="bg-muted/30 border-dashed">
                          <CardHeader className="py-3 pb-1">
                            <CardTitle className="text-sm">Worked example</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-1 text-sm whitespace-pre-wrap">
                            {workedExample}
                          </CardContent>
                        </Card>
                      ) : null}
                      {practiceQuestions.length > 0 ? (
                        <div className="text-sm">
                          <p className="font-medium mb-2">Practice questions</p>
                          <ul className="list-decimal pl-5 space-y-1">
                            {practiceQuestions.map((pq, i) => (
                              <li key={i}>{String(pq)}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {miniQuiz.length > 0 ? (
                        <div className="text-sm space-y-2">
                          <p className="font-medium">Mini quiz</p>
                          {miniQuiz.map((qz, qi) => {
                            if (!isRecord(qz)) return null;
                            const qq =
                              typeof qz.question === "string"
                                ? qz.question
                                : "";
                            const qa =
                              typeof qz.answer === "string" ? qz.answer : "";
                            return (
                              <div
                                key={qi}
                                className="rounded-md border bg-muted/20 p-3 space-y-1"
                              >
                                <p className="font-medium">{qq}</p>
                                <p className="text-muted-foreground">{qa}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  if (typeKey === "STUDY_PLAN" && isRecord(body)) {
    return <StudyPlanKidFriendlyView content={body} />;
  }

  if (typeKey === "RECOVERY_PLAN" && isRecord(body)) {
    return <RecoveryPlanKidFriendlyView content={body} />;
  }

  return (
    <div className="space-y-4">
      {sourceInput ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Source input</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-auto text-xs whitespace-pre-wrap">
              {sourceInput}
            </pre>
          </CardContent>
        </Card>
      ) : null}
      <pre className="max-h-[560px] overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap">
        {typeof body === "string"
          ? body
          : JSON.stringify(body, null, 2)}
      </pre>
    </div>
  );
}

export default function SavedResourceDetailClient({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<
    Awaited<ReturnType<typeof fetchSavedResourceById>> | null
  >(null);
  const [isPptxPending, startPptxTransition] = useTransition();

  useEffect(() => {
    if (authLoading || !id) return;
    if (!user) {
      setPayload({ ok: false, error: "Unauthorized" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetchSavedResourceById(token, id);
        if (!cancelled) setPayload(res);
      } catch (e) {
        if (!cancelled) {
          setPayload({
            ok: false,
            error:
              e instanceof Error ? e.message : "Failed to load resource.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, id]);

  if (authLoading || (user && payload === null)) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
          <Link href="/saved-resources">
            <ArrowLeft className="h-4 w-4" />
            Back to saved resources
          </Link>
        </Button>
        <p className="text-muted-foreground">Sign in to view this resource.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!payload?.ok) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
          <Link href="/saved-resources">
            <ArrowLeft className="h-4 w-4" />
            Back to saved resources
          </Link>
        </Button>
        <p className="text-destructive text-sm" role="alert">
          {payload?.error === "Not found"
            ? "This resource is missing or was removed."
            : payload?.error ?? "Something went wrong."}
        </p>
      </div>
    );
  }

  const resource = payload.resource;
  const meta =
    resource.typeKey in resourceMetadata
      ? resourceMetadata[resource.typeKey as ResourceType]
      : null;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8" data-print-body>
      <div className="flex items-center justify-between gap-4 flex-wrap" data-print-hide>
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
          <Link href="/saved-resources">
            <ArrowLeft className="h-4 w-4" />
            Back to saved resources
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportAsPdf()}
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isPptxPending}
            onClick={() =>
              startPptxTransition(() => exportAsPptx(resource))
            }
          >
            {isPptxPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="h-4 w-4" />
            )}
            {isPptxPending ? "Generating…" : "Export PowerPoint"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">{resource.title}</h2>
          {meta ? (
            <Badge variant="outline">{meta.title}</Badge>
          ) : (
            <Badge variant="outline">{resource.typeKey}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Saved on {resource.createdAt || "unknown date"}
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">
            {resource.typeKey === "STUDY_PLAN"
              ? "Easy-read timetable"
              : resource.typeKey === "RECOVERY_PLAN"
                ? "Easy-read steps"
                : "Content"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <RenderSavedBody resource={resource} />
        </CardContent>
      </Card>
    </div>
  );
}
