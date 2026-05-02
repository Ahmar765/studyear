"use server";

import { adminDb } from "@/lib/firebase/admin-app";
import { verifyIdTokenString } from "@/server/lib/auth";
import * as admin from "firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";

export type DiagnosticListItem = {
  id: string;
  subject: string;
  riskLevel: string;
  predictedCurrentPosition: string;
  createdAt: string;
};

export type DiagnosticResultPayload = {
  id: string;
  aiSummary: string;
  strengths: string[];
  weaknesses: string[];
  weakTopics: string[];
  riskLevel: string;
  predictedCurrentPosition: string;
  recommendations: unknown[];
  priorityActions: unknown[];
  parentSummary: string;
  nextBestAction: string;
  createdAt: string;
};

function diagnosticCreatedMs(data: DocumentData): number {
  const ts = data.createdAt as admin.firestore.Timestamp | undefined;
  return ts?.toMillis?.() ?? 0;
}

export async function fetchMyDiagnosticResults(
  idToken: string,
): Promise<{ ok: true; results: DiagnosticListItem[] } | { ok: false; error: string }> {
  try {
    const user = await verifyIdTokenString(idToken);
    if (!user) return { ok: false, error: "Unauthorized" };

    // Equality-only query avoids needing a composite index. Sort newest-first in memory.
    const snapshot = await adminDb
      .collection("diagnostic_results")
      .where("studentId", "==", user.uid)
      .get();

    if (snapshot.empty) return { ok: true, results: [] };

    const sortedDocs = snapshot.docs.slice().sort((a, b) => {
      return diagnosticCreatedMs(b.data()) - diagnosticCreatedMs(a.data());
    });

    const results: DiagnosticListItem[] = sortedDocs.map((doc) => {
      const data = doc.data();
      const ts = data.createdAt as admin.firestore.Timestamp | undefined;
      const createdAt = ts?.toDate()
        ? ts.toDate().toLocaleDateString()
        : "";
      return {
        id: doc.id,
        subject: data.subject ?? "",
        riskLevel: data.riskLevel ?? "",
        predictedCurrentPosition: data.predictedCurrentPosition ?? "",
        createdAt,
      };
    });
    return { ok: true, results };
  } catch (e: unknown) {
    console.error("fetchMyDiagnosticResults:", e);
    const message =
      e instanceof Error ? e.message : "Failed to load diagnostic results.";
    return { ok: false, error: message };
  }
}

export async function fetchMyDiagnosticResult(
  idToken: string,
  resultId: string,
): Promise<
  | { ok: true; result: DiagnosticResultPayload; uid: string }
  | { ok: false; error: string }
> {
  try {
    const user = await verifyIdTokenString(idToken);
    if (!user) return { ok: false, error: "Unauthorized" };

    const docRef = adminDb.collection("diagnostic_results").doc(resultId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.studentId !== user.uid) {
      return { ok: false, error: "Not found" };
    }

    const data = docSnap.data();
    if (!data) return { ok: false, error: "Not found" };

    const createdTs = data.createdAt as admin.firestore.Timestamp | undefined;
    const fullResult: DiagnosticResultPayload = {
      id: docSnap.id,
      aiSummary: data.aiSummary || "No summary available.",
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      weakTopics: data.weakTopics || [],
      riskLevel: data.riskLevel || "UNKNOWN",
      predictedCurrentPosition: data.predictedCurrentPosition || "Not available",
      recommendations: data.recommendations || [],
      priorityActions: data.priorityActions || [],
      parentSummary: data.parentSummary || "",
      nextBestAction: data.nextBestAction || "Review your results.",
      createdAt: createdTs?.toDate()
        ? createdTs.toDate().toISOString()
        : new Date(0).toISOString(),
    };

    return { ok: true, result: fullResult, uid: user.uid };
  } catch (e: unknown) {
    console.error("fetchMyDiagnosticResult:", e);
    const message =
      e instanceof Error ? e.message : "Failed to load diagnostic report.";
    return { ok: false, error: message };
  }
}
