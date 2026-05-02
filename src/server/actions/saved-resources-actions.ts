"use server";

import { adminDb } from "@/lib/firebase/admin-app";
import { verifyIdTokenString } from "@/server/lib/auth";
import * as admin from "firebase-admin";

export type SavedResourceListItem = {
  id: string;
  title: string;
  typeKey: string;
  createdAt: string;
};

export async function fetchMySavedResources(
  idToken: string,
): Promise<
  { ok: true; resources: SavedResourceListItem[] } | { ok: false; error: string }
> {
  try {
    const user = await verifyIdTokenString(idToken);
    if (!user) return { ok: false, error: "Unauthorized" };

    // Fetch all, sort newest-first in memory (avoids orderBy index edge cases).
    const snapshot = await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("saved_resources")
      .get();

    if (snapshot.empty) return { ok: true, resources: [] };

    const sortedDocs = snapshot.docs.slice().sort((a, b) => {
      const ta =
        (a.data().createdAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ??
        0;
      const tb =
        (b.data().createdAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ??
        0;
      return tb - ta;
    });

    const resources: SavedResourceListItem[] = sortedDocs.slice(0, 50).map((doc) => {
      const data = doc.data();
      const ts = data.createdAt as admin.firestore.Timestamp | undefined;
      return {
        id: doc.id,
        title: String(data.title ?? "Untitled"),
        typeKey: String(data.type ?? "UNKNOWN"),
        createdAt: ts?.toDate()
          ? ts.toDate().toLocaleDateString()
          : "",
      };
    });

    return { ok: true, resources };
  } catch (e: unknown) {
    console.error("fetchMySavedResources:", e);
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Failed to load saved resources.",
    };
  }
}
