import { z } from "zod";

/**
 * Turns Genkit/Zod/server errors into short copy students can understand.
 */
export function studyPlanErrorForUser(error: unknown): string {
  if (error instanceof z.ZodError) {
    const msgs = error.issues.map((i) => i.message);
    const nullStringFailures = msgs.filter(
      (m) =>
        m.includes("Expected string") &&
        (m.includes("received null") || m.includes("null")),
    );

    if (nullStringFailures.length >= 2 || msgs.length >= 4) {
      return (
        "The assistant's reply was incomplete (some text fields were missing), " +
        "so we couldn't save your study plan. Wait a moment and tap try again—or shorten your goal and retry."
      );
    }

    if (
      msgs.length >= 2 &&
      msgs.every(
        (m) =>
          m.startsWith("Expected ") ||
          m.includes("Required") ||
          m.includes("Invalid"),
      )
    ) {
      return (
        "We couldn't build your study plan from that reply. Try again in a minute, " +
        "or tweak your exam goal and retry."
      );
    }

    if (msgs.length === 1) {
      const one = msgs[0];
      if (one.includes("Required")) {
        return "Something required was missing. Check your details and try again.";
      }
      return `${one} Adjust your inputs and try again.`;
    }

    return "Your study plan couldn't be saved. Please try again in a moment.";
  }

  if (error instanceof Error) {
    const m = error.message;

    if (/INSUFFICIENT_ACU|resource-exhausted/i.test(m)) {
      return "You don't have enough ACUs for this. Add ACUs or choose another action.";
    }
    if (/FEATURE_NOT_INCLUDED|failed-precondition.*plan/i.test(m)) {
      return "Your subscription doesn't include this AI feature. Upgrade or contact support.";
    }
    if (/empty output|returned empty|no structured output/i.test(m)) {
      return "The assistant didn't return a usable plan. Try again shortly.";
    }
    if (/USER_NOT_FOUND|not-found.*USER/i.test(m)) {
      return "We couldn't load your account. Sign out and sign back in.";
    }
    if (/Schema validation failed|Invalid JSON/i.test(m)) {
      return "The reply didn't match the format we need. Please try generating the plan again.";
    }

    return "We couldn't create your study plan. Please try again in a moment.";
  }

  return "We couldn't create your study plan. Please try again in a moment.";
}

/** Assignment review submit / AI generation failures */
export function assignmentReviewErrorForUser(error: unknown): string {
  if (error instanceof z.ZodError) {
    const msgs = error.issues.map((i) => i.message);
    const paths = error.issues.map((i) => i.path.join(".")).filter(Boolean);
    if (paths.some((p) => p.includes("pastedText"))) {
      return "Paste at least 100 characters of your assignment, then try again.";
    }
    if (paths.some((p) => p.includes("title"))) {
      return "Enter a slightly longer title (5+ characters) and try again.";
    }
    if (
      msgs.some((m) => m.includes("Required")) ||
      msgs.some((m) => m.includes("studyLevel") || m.includes("subject"))
    ) {
      return "Choose your level and subject, then try again.";
    }
    if (msgs.length <= 2) {
      return msgs.join(" ") + " Check the form and try again.";
    }
    return "Some assignment details look invalid. Check every field and try again.";
  }

  if (error instanceof Error) {
    const m = error.message;
    if (/INVALID_ARGUMENT|Schema validation failed/i.test(m)) {
      return (
        "We couldn't run the review on that submission. Make sure level, subject, and assignment text are filled in, " +
        "then try again."
      );
    }
    if (/INSUFFICIENT_ACU|resource-exhausted/i.test(m)) {
      return "You don't have enough ACUs. Add ACUs and try again.";
    }
    if (/FEATURE_NOT_INCLUDED/i.test(m)) {
      return "This AI feature isn't on your current plan. Upgrade or contact support.";
    }
    if (/empty output|returned empty/i.test(m)) {
      return "The assistant didn't return feedback. Please try again shortly.";
    }
    return "We couldn't complete your review. Please try again in a moment.";
  }

  return "We couldn't complete your review. Please try again in a moment.";
}
