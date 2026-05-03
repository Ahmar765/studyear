
import { auth } from "firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const authorization = headers().get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    try {
      const decodedToken = await auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error("Error verifying token:", error);
      return null;
    }
  }
  return null;
}

/**
 * Id tokens passed from client server actions (browser navigations do not send Authorization).
 * Falls back to Bearer header for API-style callers.
 */
export async function getVerifiedUser(idToken?: string | null) {
  const fromClient = await verifyIdTokenString(idToken ?? undefined);
  if (fromClient) return fromClient;
  return getCurrentUser();
}

/** For server actions / routes where the client passes `user.getIdToken()` (browser navigations do not send Authorization). */
export async function verifyIdTokenString(
  idToken: string | null | undefined,
): Promise<DecodedIdToken | null> {
  if (!idToken?.trim()) return null;
  try {
    return await auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}
