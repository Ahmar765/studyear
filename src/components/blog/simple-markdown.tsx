'use client';

import type { ReactNode } from 'react';

/** Normalize AI output that sometimes wraps markdown in JSON. */
export function normalizeBlogMarkdown(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return content;
  try {
    const parsed = JSON.parse(trimmed) as { content?: string; title?: string };
    if (typeof parsed.content === 'string' && parsed.content.length > 0) {
      return parsed.content;
    }
  } catch {
    /* plain markdown */
  }
  return content;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/** Readable markdown for AI blog bodies (headings, lists, paragraphs, bold). */
export function SimpleMarkdown({ content }: { content: string }) {
  const normalized = normalizeBlogMarkdown(content);
  const lines = normalized.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listItems: { ordered: boolean; text: string }[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const ordered = listItems[0].ordered;
    const Tag = ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag
        key={`list-${listKey++}`}
        className={ordered ? 'my-3 ml-6 list-decimal space-y-1' : 'my-3 ml-6 list-disc space-y-1'}
      >
        {listItems.map((item, i) => (
          <li key={i} className="text-foreground/90 leading-relaxed">
            {renderInline(item.text)}
          </li>
        ))}
      </Tag>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push(
        <h3 key={index} className="mt-5 mb-2 text-lg font-semibold text-foreground">
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2 key={index} className="mt-8 mb-3 text-2xl font-bold text-foreground border-b pb-2">
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      blocks.push(
        <h1 key={index} className="mt-6 mb-4 text-3xl font-extrabold tracking-tight text-foreground">
          {renderInline(trimmed.slice(2))}
        </h1>,
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push({ ordered: false, text: trimmed.slice(2) });
      return;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      listItems.push({ ordered: true, text: orderedMatch[2] });
      return;
    }

    flushList();
    blocks.push(
      <p key={index} className="my-3 leading-relaxed text-foreground/90">
        {renderInline(trimmed)}
      </p>,
    );
  });

  flushList();

  return (
    <div className="prose prose-stone dark:prose-invert max-w-none text-base">{blocks}</div>
  );
}
