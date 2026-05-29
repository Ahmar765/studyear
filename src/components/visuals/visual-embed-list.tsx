'use client';

import Image from 'next/image';
import { BarChart3 } from 'lucide-react';
import { normalizeSvgForDisplay } from '@/lib/normalize-svg-for-display';

export type EmbeddedVisual = {
  title: string;
  rationale?: string;
  svg?: string;
  imageUrl?: string;
};

export function VisualEmbedList({
  visuals,
  className,
}: {
  visuals: EmbeddedVisual[];
  className?: string;
}) {
  if (!visuals.length) return null;

  return (
    <div className={className ?? 'space-y-4'}>
      {visuals.map((visual, index) => (
        <div key={`${visual.title}-${index}`} className="rounded-lg border bg-background p-3">
          <p className="mb-1 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-violet-500" />
            {visual.title}
          </p>
          {visual.rationale ? (
            <p className="mb-2 text-xs text-muted-foreground">{visual.rationale}</p>
          ) : null}
          {visual.svg?.trim().startsWith('<svg') ? (
            <div
              className="w-full overflow-x-auto rounded-md border bg-white p-2 [&_svg]:mx-auto [&_svg]:block [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: normalizeSvgForDisplay(visual.svg) }}
            />
          ) : null}
          {visual.imageUrl ? (
            <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md border bg-muted">
              <Image
                src={visual.imageUrl}
                alt={visual.title}
                fill
                className="object-contain"
                unoptimized={
                  visual.imageUrl.startsWith('data:') || visual.imageUrl.startsWith('blob:')
                }
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
