import type { SavedResourceListItem } from "@/server/actions/saved-resources-actions";

/**
 * Prefer canonical app routes when a saved row points at a top-level entity.
 * Otherwise open the in-app snapshot viewer for this `saved_resources` doc.
 */
export function savedResourceViewHref(resource: SavedResourceListItem): string {
  const linked = resource.linkedEntityId?.trim();
  if (linked) {
    if (resource.typeKey === "RECOVERY_PLAN") {
      return `/recovery-plan/${linked}`;
    }
    if (resource.typeKey === "DIAGNOSTIC_REPORT") {
      return `/diagnostic-results/${linked}`;
    }
  }
  return `/saved-resources/${resource.id}`;
}
