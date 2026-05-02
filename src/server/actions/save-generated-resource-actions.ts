"use server";

import { z } from "zod";
import { verifyIdTokenString } from "@/server/lib/auth";
import { savedResourceService } from "@/server/services/resources";

const SaveGeneratedSchema = z.object({
  idToken: z.string().min(10),
  type: z.string().min(1).max(80),
  title: z.string().min(1).max(500),
  content: z.unknown().optional(),
  sourceInput: z.string().max(500_000).optional(),
  linkedEntityId: z.string().max(200).optional(),
});

export async function saveGeneratedResourceToLibrary(
  input: z.infer<typeof SaveGeneratedSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = SaveGeneratedSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid save request." };
  }

  const user = await verifyIdTokenString(parsed.data.idToken);
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  let safeContent: unknown = undefined;
  if (parsed.data.content !== undefined) {
    try {
      safeContent = JSON.parse(JSON.stringify(parsed.data.content));
    } catch {
      return { success: false, error: "Could not serialize this resource to save." };
    }
  }

  try {
    await savedResourceService.save({
      studentId: user.uid,
      type: parsed.data.type,
      title: parsed.data.title.trim(),
      content: safeContent ?? null,
      sourceInput: parsed.data.sourceInput ?? null,
      linkedEntityId: parsed.data.linkedEntityId ?? null,
    });
    return { success: true };
  } catch (e: unknown) {
    console.error("saveGeneratedResourceToLibrary:", e);
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Could not save to your library.",
    };
  }
}
