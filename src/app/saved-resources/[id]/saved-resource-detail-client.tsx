"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchSavedResourceById,
  type SavedResourceDetail,
} from "@/server/actions/saved-resources-actions";
import { ArrowLeft } from "lucide-react";
import { resourceMetadata, ResourceType } from "@/data/academic";
import { Badge } from "@/components/ui/badge";

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

function RenderSavedBody({
  resource,
}: {
  resource: SavedResourceDetail;
}) {
  const { typeKey, content, sourceInput } = resource;

  if (content === null || content === undefined) {
    return (
      <p className="text-sm text-muted-foreground">
        No snapshot content was stored for this resource.
      </p>
    );
  }

  if (typeKey === "QUIZ" && isRecord(content)) {
    const title =
      typeof content.quizTitle === "string" ? content.quizTitle : resource.title;
    const questions = Array.isArray(content.questions) ? content.questions : [];
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

  if (typeKey === "FLASHCARD" && isRecord(content)) {
    const cards = Array.isArray(content.flashcards) ? content.flashcards : [];
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

  if (typeKey === "ESSAY_PLAN" && isRecord(content)) {
    const bodyParagraphs = Array.isArray(content.bodyParagraphs)
      ? content.bodyParagraphs
      : [];
    return (
      <div className="space-y-4 text-sm">
        {typeof content.title === "string" ? (
          <h3 className="text-xl font-semibold">{content.title}</h3>
        ) : null}
        {typeof content.thesisStatement === "string" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thesis</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap">
              {content.thesisStatement}
            </CardContent>
          </Card>
        ) : null}
        {typeof content.introduction === "string" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Introduction</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap">
              {content.introduction}
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
        {typeof content.conclusion === "string" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conclusion</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap">
              {content.conclusion}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  if (typeKey === "TOPIC_SUMMARY" && isRecord(content)) {
    const summary =
      typeof content.summary === "string" ? content.summary : null;
    if (summary) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {summary}
        </div>
      );
    }
  }

  if (typeKey === "MIND_MAP" && isRecord(content)) {
    const root = content.rootNode;
    const centralTitle =
      typeof content.title === "string" ? content.title : resource.title;
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
  if (visualTypes.has(typeKey) && isRecord(content)) {
    const imageUrl =
      typeof content.imageUrl === "string" ? content.imageUrl : null;
    const svg = typeof content.svg === "string" ? content.svg : null;
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
          <div
            className="overflow-auto rounded-lg border bg-background p-4"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
        {!imageUrl && !svg ? (
          <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }

  if (
    (typeKey === "RECOVERY_PLAN" || typeKey === "STUDY_PLAN") &&
    isRecord(content)
  ) {
    return (
      <pre className="max-h-[560px] overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
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
        {typeof content === "string"
          ? content
          : JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
}

export default function SavedResourceDetailClient({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<
    Awaited<ReturnType<typeof fetchSavedResourceById>> | null
  >(null);

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
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
        <Link href="/saved-resources">
          <ArrowLeft className="h-4 w-4" />
          Back to saved resources
        </Link>
      </Button>

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

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <RenderSavedBody resource={resource} />
        </CardContent>
      </Card>
    </div>
  );
}
