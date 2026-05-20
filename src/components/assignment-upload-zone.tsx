'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader, Paperclip, Upload, X } from 'lucide-react';
import { uploadAssignmentAttachment, type AssignmentUploadResult } from '@/lib/upload-assignment-client';

type Props = {
  disabled?: boolean;
  attachment: { url: string; name: string; kind: string } | null;
  onAttachmentChange: (value: { url: string; name: string; kind: string } | null) => void;
  onTextExtracted?: (text: string) => void;
  onError?: (message: string) => void;
};

export function AssignmentUploadZone({
  disabled,
  attachment,
  onAttachmentChange,
  onTextExtracted,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const result: AssignmentUploadResult = await uploadAssignmentAttachment(file);
        if (result.error) {
          onError?.(result.error);
          return;
        }
        if (result.extractedText) {
          onTextExtracted?.(result.extractedText);
          onAttachmentChange({ url: '', name: result.name, kind: result.kind });
          return;
        }
        if (result.url) {
          onAttachmentChange({ url: result.url, name: result.name, kind: result.kind });
          return;
        }
        onError?.('Upload did not return a file URL.');
      } finally {
        setUploading(false);
      }
    },
    [onAttachmentChange, onError, onTextExtracted],
  );

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void processFile(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".txt,.pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf,text/plain"
        disabled={disabled || uploading}
        onChange={(e) => onFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled && !uploading) onFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
          (disabled || uploading) && 'pointer-events-none opacity-60',
        )}
      >
        {uploading ? (
          <>
            <Loader className="mb-2 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading…</p>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Attach assignment file</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag & drop or click — .txt, .pdf, .png, .jpg, .webp (max 25 MB PDF / 8 MB image)
            </p>
          </>
        )}
      </div>

      {attachment?.name ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2 truncate">
            <Paperclip className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{attachment.name}</span>
            {attachment.kind ? (
              <span className="shrink-0 text-xs text-muted-foreground">({attachment.kind})</span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={disabled || uploading}
            onClick={(e) => {
              e.stopPropagation();
              onAttachmentChange(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
