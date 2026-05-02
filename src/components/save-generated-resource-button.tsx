"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { saveGeneratedResourceToLibrary } from "@/server/actions/save-generated-resource-actions";

type Props = {
  resourceType: string;
  title: string;
  content: unknown;
  sourceInput?: string;
  linkedEntityId?: string;
  disabled?: boolean;
};

export function SaveGeneratedResourceButton({
  resourceType,
  title,
  content,
  sourceInput,
  linkedEntityId,
  disabled,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Log in to save resources to your library.",
      });
      return;
    }
    const t = title.trim();
    if (!t) {
      toast({
        variant: "destructive",
        title: "Nothing to save",
        description: "This resource needs a title before it can be saved.",
      });
      return;
    }

    setPending(true);
    try {
      const token = await user.getIdToken();
      const res = await saveGeneratedResourceToLibrary({
        idToken: token,
        type: resourceType,
        title: t,
        content,
        sourceInput,
        linkedEntityId,
      });
      if (res.success) {
        setSaved(true);
        toast({
          title: "Saved to your library",
          description: "Open Saved Resources in the sidebar to find it anytime.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Could not save",
          description: res.error ?? "Try again in a moment.",
        });
      }
    } finally {
      setPending(false);
    }
  }

  if (saved) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Check className="h-4 w-4 text-green-600" />
        Saved
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={handleSave}
      disabled={disabled || pending || !title.trim()}
    >
      {pending ? (
        "Saving…"
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          Save to my library
        </>
      )}
    </Button>
  );
}
