"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";

const ALLOWED = new Set([
  "STUDENT",
  "PARENT",
  "PRIVATE_TUTOR",
  "SCHOOL_ADMIN",
  "SCHOOL_TUTOR",
  "ADMIN",
]);

export type EffectiveUserRole =
  | "STUDENT"
  | "PARENT"
  | "PRIVATE_TUTOR"
  | "SCHOOL_ADMIN"
  | "SCHOOL_TUTOR"
  | "ADMIN";

function parseRole(r: string | undefined): EffectiveUserRole | null {
  if (typeof r !== "string") return null;
  const upper = r.trim().toUpperCase();
  if (ALLOWED.has(upper)) return upper as EffectiveUserRole;
  return null;
}

/** Staff roles use dashboards other than the student shell */
function isStaff(r: EffectiveUserRole | null): r is Exclude<EffectiveUserRole, "STUDENT"> {
  return r !== null && r !== "STUDENT";
}

/**
 * Prefer JWT custom claims when they indicate a staff role (set on login).
 * Otherwise prefer Firestore profile when it indicates staff (manual Firestore fixes / dev seeds).
 * Avoids school admins stuck on student nav when either source is correct but the other is stale.
 */
function mergeRoles(
  profileRoleRaw: string | undefined,
  claimRole: EffectiveUserRole | null,
): EffectiveUserRole {
  const profileRole = parseRole(profileRoleRaw);

  if (isStaff(claimRole)) return claimRole;
  if (isStaff(profileRole)) return profileRole;
  return claimRole ?? profileRole ?? "STUDENT";
}

export function useEffectiveRole(): {
  role: EffectiveUserRole;
  tokenRoleResolved: boolean;
} {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const [claimRole, setClaimRole] = useState<EffectiveUserRole | null>(null);
  const [tokenRoleResolved, setTokenRoleResolved] = useState(false);

  useEffect(() => {
    if (!user) {
      setClaimRole(null);
      setTokenRoleResolved(true);
      return;
    }

    setTokenRoleResolved(false);
    user
      .getIdTokenResult(true)
      .then((id) => {
        const cr = id.claims.role;
        if (typeof cr === "string") {
          const upper = cr.trim().toUpperCase();
          if (ALLOWED.has(upper)) {
            setClaimRole(upper as EffectiveUserRole);
            return;
          }
        }
        setClaimRole(null);
      })
      .catch(() => setClaimRole(null))
      .finally(() => setTokenRoleResolved(true));
  }, [user, userProfile?.role]);

  const role = mergeRoles(userProfile?.role, claimRole);

  return { role, tokenRoleResolved };
}
