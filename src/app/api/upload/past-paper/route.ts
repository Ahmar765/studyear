import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { adminAuth } from '@/lib/firebase/admin-app';
import { isCloudinaryConfigured, uploadBufferToCloudinary } from '@/lib/cloudinary-server';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/** Local dev often sets only GOOGLE_APPLICATION_CREDENTIALS (path); read project_id from that JSON. */
function tryProjectIdFromAdcCredentialsFile(): string | undefined {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim().replace(/^["']|["']$/g, '');
  if (!raw || !existsSync(raw)) return undefined;
  try {
    const j = JSON.parse(readFileSync(raw, 'utf8')) as { project_id?: string };
    return typeof j.project_id === 'string' ? j.project_id.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Project IDs from env + service account JSON (may differ from NEXT_PUBLIC_FIREBASE_PROJECT_ID). */
function resolveGcpProjectIds(): string[] {
  const ids = new Set<string>();
  const add = (s?: string | null) => {
    const t = s?.trim();
    if (t) ids.add(t);
  };
  add(process.env.GOOGLE_CLOUD_PROJECT);
  add(process.env.GCLOUD_PROJECT);
  add(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  add(tryProjectIdFromAdcCredentialsFile());
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const j = JSON.parse(raw) as { project_id?: string };
      add(j.project_id);
    } catch {
      /* ignore */
    }
  }
  return [...ids];
}

/**
 * GCS bucket IDs differ from the Storage “domain” shown in Firebase web config.
 * Admin SDK often needs `{projectId}.appspot.com` even when NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is `*.firebasestorage.app`.
 */
function getFirebaseStorageBucketCandidates(projectIds: string[]): string[] {
  const configured =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

  const candidates: string[] = [];
  const add = (name: string | undefined) => {
    if (!name || candidates.includes(name)) return;
    candidates.push(name);
  };

  for (const projectId of projectIds) {
    if (!projectId) continue;
    add(`${projectId}.appspot.com`);
    add(`${projectId}.firebasestorage.app`);
  }
  add(configured);
  return candidates;
}

function isBucketMissingOrNotFound(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (/does not exist|NoSuchBucket|Not Found|404/i.test(msg)) return true;
  const code = (e as { code?: number })?.code;
  return code === 404;
}

/** Merge buckets from GCP API using ADC / explicit projects (handles SA project ≠ NEXT_PUBLIC). */
async function discoverGcsBucketNames(projectIds: string[]): Promise<{ names: string[]; errorHint?: string }> {
  const names = new Set<string>();
  let lastFailure: string | undefined;

  const tryList = async (label: string, factory: () => Storage) => {
    try {
      const storage = factory();
      const [buckets] = await storage.getBuckets({ maxResults: 500 });
      buckets.forEach((b) => names.add(b.name));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastFailure = `${label}: ${msg}`;
      console.warn('[past-paper upload] listBuckets', lastFailure);
    }
  };

  for (const pid of projectIds) {
    if (!pid) continue;
    await tryList(`project=${pid}`, () => new Storage({ projectId: pid }));
  }
  await tryList('ADC defaults', () => new Storage());

  return {
    names: [...names],
    errorHint: names.size === 0 ? lastFailure : undefined,
  };
}

function mergeBucketCandidates(staticCandidates: string[], discovered: string[], projectIds: string[]): string[] {
  const scoreBucket = (name: string): number => {
    let score = 0;
    for (const projectId of projectIds) {
      if (!projectId) continue;
      if (name === `${projectId}.appspot.com`) score = Math.max(score, 100);
      else if (name.endsWith('.firebasestorage.app')) score = Math.max(score, 85);
      else if (name.endsWith('.appspot.com')) score = Math.max(score, 70);
      else if (name.includes(projectId)) score = Math.max(score, 40);
    }
    return score;
  };

  const seen = new Set<string>();
  const ordered: string[] = [];
  const add = (n: string) => {
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  };

  for (const n of staticCandidates) add(n);
  const sortedDiscovered = [...discovered].sort((a, b) => scoreBucket(b) - scoreBucket(a));
  for (const n of sortedDiscovered) add(n);
  return ordered;
}

function storageSetupHint(projectId: string | undefined): string {
  const p = projectId?.trim() || 'YOUR_FIREBASE_PROJECT';
  return (
    `Enable Firebase Storage: https://console.firebase.google.com/project/${p}/storage — ` +
    `ensure Cloud Storage API is on for the GCP project: https://console.developers.google.com/apis/library/storage.googleapis.com — ` +
    `or set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for Cloudinary uploads.`
  );
}

async function uploadPdfToCloudinary(buf: Buffer, uid: string): Promise<string> {
  const folder = `studyear/past-papers/${uid}`;
  const public_id = `paper_${Date.now()}_${randomUUID().slice(0, 8)}.pdf`;
  return uploadBufferToCloudinary(buf, {
    folder,
    public_id,
    resource_type: 'raw',
    overwrite: false,
  });
}

/** Firebase-friendly download URL (works with Storage rules that allow token-based reads). */
async function uploadPdfToFirebaseStorageInBucket(buf: Buffer, uid: string, bucketName: string): Promise<string> {
  const downloadToken = randomUUID();
  const objectPath = `past-papers/${uid}/paper_${Date.now()}_${randomUUID().slice(0, 8)}.pdf`;
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(objectPath);

  await file.save(buf, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${downloadToken}`;
}

async function uploadPdfToFirebaseStorage(buf: Buffer, uid: string): Promise<string> {
  const projectIds = resolveGcpProjectIds();
  const hintProject =
    projectIds[0] ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? 'YOUR_FIREBASE_PROJECT';

  const staticCandidates = getFirebaseStorageBucketCandidates(projectIds);
  const { names: discovered, errorHint: listBucketsHint } = await discoverGcsBucketNames(projectIds);
  const candidates = mergeBucketCandidates(staticCandidates, discovered, projectIds);

  if (candidates.length === 0) {
    throw new Error(`No Storage buckets to try. ${storageSetupHint(hintProject)}`);
  }

  let lastError: unknown;
  for (const bucketName of candidates) {
    try {
      return await uploadPdfToFirebaseStorageInBucket(buf, uid, bucketName);
    } catch (e: unknown) {
      lastError = e;
      if (isBucketMissingOrNotFound(e)) {
        console.warn(`[past-paper upload] Bucket "${bucketName}" not usable:`, e instanceof Error ? e.message : e);
        continue;
      }
      throw e;
    }
  }

  const triedList = candidates.join(', ');
  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
  const listNote =
    discovered.length === 0 && listBucketsHint
      ? ` Cloud bucket listing did not return any buckets (${listBucketsHint}). Grant this service account “Storage Object Admin” (or Viewer + list) on the GCP project, or set FIREBASE_STORAGE_BUCKET to an existing bucket id.`
      : discovered.length > 0
        ? ''
        : ' No buckets were found in the GCP project — enable Firebase Storage to create one.';

  throw new Error(
    `No usable Storage bucket. Tried: ${triedList}. ${storageSetupHint(hintProject)} ` +
      `Set FIREBASE_STORAGE_BUCKET to the exact bucket id from Google Cloud Console → Storage → Buckets.${listNote} Last error: ${lastMsg}`,
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const mime = file.type || 'application/octet-stream';
  if (mime !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF uploads are allowed for past papers.' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'PDF must be 25 MB or smaller.' }, { status: 400 });
  }

  try {
    if (isCloudinaryConfigured()) {
      const url = await uploadPdfToCloudinary(buf, uid);
      return NextResponse.json({ url });
    }

    const url = await uploadPdfToFirebaseStorage(buf, uid);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('Past paper upload error:', e);
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
