'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase/client-app';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Kind = 'profile' | 'cover';

interface ProfileImageUploadProps {
  label: string;
  kind: Kind;
  value: string;
  onChange: (url: string) => void;
  variant: 'avatar' | 'banner';
  disabled?: boolean;
}

export function ProfileImageUpload({
  label,
  kind,
  value,
  onChange,
  variant,
  disabled,
}: ProfileImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please choose an image (JPEG, PNG, WebP, or GIF).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Images must be 5 MB or smaller.' });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Please sign in to upload images.' });
      return;
    }

    setUploading(true);
    try {
      const token = await user.getIdToken();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind === 'cover' ? 'cover' : 'profile');

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed');
      }
      if (!data.url || typeof data.url !== 'string') {
        throw new Error('Invalid response from server');
      }
      onChange(data.url);
      toast({ title: 'Image uploaded', description: 'Saved to your profile.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const showUrl = Boolean(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          'relative overflow-hidden border bg-muted/40',
          variant === 'avatar' ? 'h-28 w-28 shrink-0 rounded-full' : 'h-36 w-full rounded-lg'
        )}
      >
        {showUrl ? (
          <Image
            src={value}
            alt=""
            fill
            className="object-cover"
            sizes={variant === 'avatar' ? '112px' : '(max-width: 896px) 100vw, 896px'}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            No image yet
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <Input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleFile}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled || uploading} onClick={handlePick}>
          <ImagePlus className="mr-2 h-4 w-4" />
          {showUrl ? 'Replace' : 'Upload'}
        </Button>
        {showUrl && (
          <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={clearImage}>
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF · max 5 MB · stored securely on Cloudinary</p>
    </div>
  );
}
