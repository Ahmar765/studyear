import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { uploadImageFileClient } from '@/lib/cloudinary-client';
import { uploadPastPaperPdf } from '@/lib/upload-past-paper-client';

export type AssignmentAttachmentKind = 'text' | 'pdf' | 'image';

export type AssignmentUploadResult = {
  kind: AssignmentAttachmentKind;
  url?: string;
  name: string;
  extractedText?: string;
  error?: string;
};

/** Upload assignment files: .txt (inline), .pdf, or images for review. */
export async function uploadAssignmentAttachment(file: File): Promise<AssignmentUploadResult> {
  const name = file.name || 'attachment';

  if (file.type === 'text/plain' || name.toLowerCase().endsWith('.txt')) {
    const extractedText = await file.text();
    return { kind: 'text', name, extractedText };
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return { kind: 'pdf', name, error: 'Please sign in to upload files.' };
  }

  const token = await user.getIdToken();

  if (file.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    const r = await uploadPastPaperPdf(file, token);
    if (r.error || !r.url) {
      return { kind: 'pdf', name, error: r.error ?? 'PDF upload failed.' };
    }
    return { kind: 'pdf', name, url: r.url };
  }

  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
    if (file.size > 8 * 1024 * 1024) {
      return { kind: 'image', name, error: 'Images must be 8 MB or smaller.' };
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', 'profile');

    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

    if (res.ok && data.url) {
      return { kind: 'image', name, url: data.url };
    }

    if (res.status === 503 || res.status === 500) {
      try {
        const url = await uploadImageFileClient(file, {
          folder: `studyear/assignments/${user.uid}`,
          publicId: `assignment_${Date.now()}`,
        });
        return { kind: 'image', name, url };
      } catch (clientErr: unknown) {
        const msg = clientErr instanceof Error ? clientErr.message : 'Upload failed';
        return { kind: 'image', name, error: data.error ?? msg };
      }
    }

    return { kind: 'image', name, error: typeof data.error === 'string' ? data.error : 'Image upload failed.' };
  }

  return {
    kind: 'text',
    name,
    error: 'Supported formats: .txt, .pdf, .png, .jpg, .webp',
  };
}
