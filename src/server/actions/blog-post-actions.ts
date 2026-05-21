'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { slugifyTitle } from '@/lib/blog-slug';

export type BlogPostAdminRow = {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  content: string;
  published: boolean;
  publishedAt: string | null;
  clickCount: number;
  authorId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function tsToIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function docToAdminRow(id: string, data: DocumentData): BlogPostAdminRow {
  return {
    id,
    slug: typeof data.slug === 'string' ? data.slug : '',
    title: typeof data.title === 'string' ? data.title : '',
    metaDescription: typeof data.metaDescription === 'string' ? data.metaDescription : '',
    content: typeof data.content === 'string' ? data.content : '',
    published: data.published === true,
    publishedAt: tsToIso(data.publishedAt),
    clickCount: typeof data.clickCount === 'number' && Number.isFinite(data.clickCount) ? data.clickCount : 0,
    authorId: typeof data.authorId === 'string' ? data.authorId : '',
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

async function allocateUniqueSlug(baseSlug: string, excludeDocId?: string): Promise<string> {
  let candidate = baseSlug || 'post';
  let n = 0;
  while (true) {
    const snap = await adminDb.collection('blog_posts').where('slug', '==', candidate).limit(5).get();
    const conflict = snap.docs.find((d) => d.id !== excludeDocId);
    if (!conflict) return candidate;
    n += 1;
    candidate = `${baseSlug}-${n}`;
  }
}

export async function listBlogPostsAdminAction(): Promise<{
  posts: BlogPostAdminRow[];
  error: string | null;
}> {
  try {
    let snap;
    try {
      snap = await adminDb.collection('blog_posts').orderBy('updatedAt', 'desc').limit(200).get();
    } catch {
      snap = await adminDb.collection('blog_posts').limit(200).get();
    }
    const posts = snap.docs
      .map((d) => docToAdminRow(d.id, d.data()))
      .sort((a, b) => {
        const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return tb - ta;
      });
    return { posts, error: null };
  } catch (e: unknown) {
    console.error(e);
    return {
      posts: [],
      error: e instanceof Error ? e.message : 'Failed to load blog posts.',
    };
  }
}

/** Published posts for marketing blog index (no composite index: equality-only query + sort in memory). */
export async function listPublishedBlogPosts(): Promise<{
  posts: Pick<BlogPostAdminRow, 'slug' | 'title' | 'metaDescription' | 'publishedAt'>[];
  error: string | null;
}> {
  try {
    const snap = await adminDb.collection('blog_posts').where('published', '==', true).limit(100).get();
    const posts = snap.docs
      .map((d) => {
        const row = docToAdminRow(d.id, d.data());
        return {
          slug: row.slug,
          title: row.title,
          metaDescription: row.metaDescription,
          publishedAt: row.publishedAt,
        };
      })
      .sort((a, b) => {
        const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return tb - ta;
      });
    return { posts, error: null };
  } catch (e: unknown) {
    console.error(e);
    return {
      posts: [],
      error: e instanceof Error ? e.message : 'Failed to load posts.',
    };
  }
}

export async function getBlogPostAdminByIdAction(
  id: string,
): Promise<{ post: BlogPostAdminRow | null; error: string | null }> {
  try {
    const ref = adminDb.collection('blog_posts').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return { post: null, error: null };
    return { post: docToAdminRow(doc.id, doc.data()!), error: null };
  } catch (e: unknown) {
    return {
      post: null,
      error: e instanceof Error ? e.message : 'Failed to load post.',
    };
  }
}

export async function getPublishedBlogPostBySlug(
  slug: string,
): Promise<{ post: BlogPostAdminRow | null; error: string | null }> {
  try {
    const snap = await adminDb.collection('blog_posts').where('slug', '==', slug).limit(1).get();
    if (snap.empty) return { post: null, error: null };
    const doc = snap.docs[0];
    const row = docToAdminRow(doc.id, doc.data());
    if (!row.published) return { post: null, error: null };
    return { post: row, error: null };
  } catch (e: unknown) {
    return {
      post: null,
      error: e instanceof Error ? e.message : 'Failed to load post.',
    };
  }
}

const SaveBlogSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required.'),
  slug: z.string().optional(),
  metaDescription: z.string().min(1, 'Meta description is required.'),
  content: z.string().min(1, 'Content is required.'),
  authorId: z.string().min(1),
});

export async function saveBlogPostAction(
  raw: z.infer<typeof SaveBlogSchema>,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = SaveBlogSchema.parse(raw);
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (data.id) {
      const ref = adminDb.collection('blog_posts').doc(data.id);
      const existingSnap = await ref.get();
      if (!existingSnap.exists) return { success: false, error: 'Post not found.' };
      const prev = existingSnap.data()!;
      const prevSlug =
        typeof prev.slug === 'string' && prev.slug.trim()
          ? prev.slug.trim()
          : slugifyTitle(data.title.trim());
      const slugInput = data.slug?.trim();
      const slug =
        slugInput && slugInput.length > 0
          ? await allocateUniqueSlug(slugifyTitle(slugInput), data.id)
          : prevSlug;

      await ref.update({
        title: data.title.trim(),
        slug,
        metaDescription: data.metaDescription.trim(),
        content: data.content,
        updatedAt: now,
      });
      return { success: true, id: data.id };
    }

    const baseSlug = slugifyTitle((data.slug || data.title).trim());
    const slug = await allocateUniqueSlug(baseSlug);
    const ref = adminDb.collection('blog_posts').doc();
    await ref.set({
      slug,
      title: data.title.trim(),
      metaDescription: data.metaDescription.trim(),
      content: data.content,
      published: false,
      publishedAt: null,
      clickCount: 0,
      authorId: data.authorId,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: ref.id };
  } catch (e: unknown) {
    console.error(e);
    if (e instanceof z.ZodError) {
      return { success: false, error: e.errors.map((x) => x.message).join(', ') };
    }
    return { success: false, error: e instanceof Error ? e.message : 'Save failed.' };
  }
}

export async function publishBlogPostAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'Missing id.' };
    const ref = adminDb.collection('blog_posts').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return { success: false, error: 'Post not found.' };
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      published: true,
      publishedAt: now,
      updatedAt: now,
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Publish failed.' };
  }
}

export async function unpublishBlogPostAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'Missing id.' };
    const ref = adminDb.collection('blog_posts').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return { success: false, error: 'Post not found.' };
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      published: false,
      publishedAt: null,
      updatedAt: now,
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unpublish failed.' };
  }
}

export async function deleteBlogPostAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'Missing id.' };
    await adminDb.collection('blog_posts').doc(id).delete();
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Delete failed.' };
  }
}
