'use client';

/** Lightweight markdown-ish renderer for AI blog bodies (headings, basic lists, paragraphs). */
export function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none">
      {lines.map((line, index) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="mt-6 mb-3 text-2xl font-bold">
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith('* ')) {
          return (
            <li key={index} className="ml-5 list-disc">
              {line.substring(2)}
            </li>
          );
        }
        if (line.startsWith('1. ')) {
          return (
            <li key={index} className="ml-5 list-decimal">
              {line.substring(3)}
            </li>
          );
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
