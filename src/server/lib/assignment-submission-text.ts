import { ai } from '@/server/ai';
import { toGoogleAiGenkitModel } from '@/server/ai/genkit-model';

function isImageAttachment(url: string, name?: string): boolean {
  const hint = `${name ?? ''} ${url}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(hint) || hint.includes('/image/upload');
}

function isPdfAttachment(url: string, name?: string): boolean {
  const hint = `${name ?? ''} ${url}`.toLowerCase();
  return /\.pdf(\?|$)/i.test(hint) || hint.includes('.pdf') || hint.includes('raw/upload');
}

async function extractPdfTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not download PDF (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  return (parsed.text ?? '').trim();
}

async function extractWithVision(url: string, isPdf: boolean): Promise<string> {
  const response = await ai.generate({
    model: toGoogleAiGenkitModel(),
    prompt: [
      {
        text: isPdf
          ? 'Extract ALL readable text from this student assignment PDF. If there are charts or diagrams, describe them briefly. Output plain text only — no markdown code fences.'
          : 'Transcribe all visible text from this assignment image. Describe any charts, graphs, axes, or diagrams. Output plain text only — no markdown code fences.',
      },
      { media: { url } },
    ],
  });

  const text = typeof response.text === 'string' ? response.text.trim() : '';
  return text;
}

/**
 * Build submission text for AI review from pasted content and/or an uploaded attachment URL.
 */
export async function resolveAssignmentSubmissionText(params: {
  pastedText?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}): Promise<{ text: string; source: 'paste' | 'attachment' | 'combined' }> {
  const pasted = params.pastedText?.trim() ?? '';
  const url = params.attachmentUrl?.trim();

  if (!url) {
    return { text: pasted, source: 'paste' };
  }

  let attachmentText = '';

  try {
    if (isPdfAttachment(url, params.attachmentName)) {
      attachmentText = await extractPdfTextFromUrl(url);
      if (attachmentText.length < 80) {
        const visionText = await extractWithVision(url, true);
        if (visionText.length > attachmentText.length) {
          attachmentText = visionText;
        }
      }
    } else if (isImageAttachment(url, params.attachmentName)) {
      attachmentText = await extractWithVision(url, false);
    } else {
      const res = await fetch(url);
      if (res.ok) {
        attachmentText = (await res.text()).trim();
      }
    }
  } catch (err) {
    console.error('[resolveAssignmentSubmissionText] attachment extract failed:', err);
    try {
      attachmentText = await extractWithVision(url, isPdfAttachment(url, params.attachmentName));
    } catch {
      attachmentText = '';
    }
  }

  if (pasted.length >= 100 && attachmentText.length >= 50) {
    return {
      text: `${pasted}\n\n--- From attachment (${params.attachmentName ?? 'file'}) ---\n${attachmentText}`,
      source: 'combined',
    };
  }

  if (attachmentText.length >= 50) {
    return { text: attachmentText, source: 'attachment' };
  }

  if (pasted.length > 0) {
    return {
      text:
        pasted.length >= 100
          ? pasted
          : `${pasted}\n\n[Attachment could not be fully read — add more text above or try a clearer PDF/image.]`,
      source: 'paste',
    };
  }

  throw new Error(
    'Could not read enough text from your attachment. Paste your assignment text or try a clearer PDF/image.',
  );
}
