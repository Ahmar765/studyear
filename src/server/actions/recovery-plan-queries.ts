"use server";

import { adminDb } from "@/lib/firebase/admin-app";
import { verifyIdTokenString } from "@/server/lib/auth";
import * as admin from "firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";

export type RecoveryPlanListItem = {
  id: string;
  title: string;
  riskLevel: string;
  createdAt: string;
};

export type RecoveryPlanWeekTask = {
  subject: string;
  topic: string;
  action: string;
  estimatedMinutes: number;
  expectedOutcome: string;
};

export type RecoveryPlanWeek = {
  week: number;
  focus: string;
  tasks: RecoveryPlanWeekTask[];
};

export type RecoveryPlanDetailPayload = {
  id: string;
  title: string;
  createdAt: string;
  recoveryObjective: string;
  weeklyRecoveryPlan: RecoveryPlanWeek[];
  urgentFocusAreas: string[];
  dailyNonNegotiables: string[];
  successMetrics: string[];
};

function createdMs(data: DocumentData): number {
  const ts = data.createdAt as admin.firestore.Timestamp | undefined;
  return ts?.toMillis?.() ?? 0;
}

export async function fetchMyRecoveryPlans(
  idToken: string,
): Promise<
  { ok: true; plans: RecoveryPlanListItem[] } | { ok: false; error: string }
> {
  try {
    const user = await verifyIdTokenString(idToken);
    if (!user) return { ok: false, error: "Unauthorized" };

    const snapshot = await adminDb
      .collection("recovery_plans")
      .where("studentId", "==", user.uid)
      .get();

    if (snapshot.empty) return { ok: true, plans: [] };

    const sortedDocs = snapshot.docs.slice().sort(
      (a, b) => createdMs(b.data()) - createdMs(a.data()),
    );

    const plans: RecoveryPlanListItem[] = sortedDocs.map((doc) => {
      const data = doc.data();
      const ts = data.createdAt as admin.firestore.Timestamp | undefined;
      return {
        id: doc.id,
        title: String(data.title ?? "Recovery plan"),
        riskLevel: String(data.riskLevel ?? ""),
        createdAt: ts?.toDate() ? ts.toDate().toLocaleDateString() : "",
      };
    });

    return { ok: true, plans };
  } catch (e: unknown) {
    console.error("fetchMyRecoveryPlans:", e);
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Failed to load recovery plans.",
    };
  }
}

export async function fetchMyRecoveryPlan(
  idToken: string,
  planId: string,
): Promise<
  | { ok: true; plan: RecoveryPlanDetailPayload }
  | { ok: false; error: string }
> {
  try {
    const user = await verifyIdTokenString(idToken);
    if (!user) return { ok: false, error: "Unauthorized" };

    const docSnap = await adminDb.collection("recovery_plans").doc(planId).get();

    if (!docSnap.exists || docSnap.data()?.studentId !== user.uid) {
      return { ok: false, error: "Not found" };
    }

    const data = docSnap.data();
    if (!data) return { ok: false, error: "Not found" };

    const createdTs = data.createdAt as admin.firestore.Timestamp | undefined;
    const weekly = Array.isArray(data.weeklyRecoveryPlan)
      ? (data.weeklyRecoveryPlan as RecoveryPlanWeek[])
      : [];

    const plan: RecoveryPlanDetailPayload = {
      id: docSnap.id,
      title: String(data.title ?? ""),
      createdAt: createdTs?.toDate()
        ? createdTs.toDate().toISOString()
        : new Date(0).toISOString(),
      recoveryObjective: String(data.recoveryObjective ?? ""),
      weeklyRecoveryPlan: weekly,
      urgentFocusAreas: Array.isArray(data.urgentFocusAreas)
        ? data.urgentFocusAreas
        : [],
      dailyNonNegotiables: Array.isArray(data.dailyNonNegotiables)
        ? data.dailyNonNegotiables
        : [],
      successMetrics: Array.isArray(data.successMetrics)
        ? data.successMetrics
        : [],
    };

    return { ok: true, plan };
  } catch (e: unknown) {
    console.error("fetchMyRecoveryPlan:", e);
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Failed to load recovery plan.",
    };
  }
}
