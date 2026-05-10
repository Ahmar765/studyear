import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug?.trim();
    if (!slug) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const snap = await adminDb.collection('blog_posts').where('slug', '==', slug).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const doc = snap.docs[0];
    const data = doc.data();
    if (data.published !== true) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    await doc.ref.update({
      clickCount: admin.firestore.FieldValue.increment(1),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('blog view increment', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
