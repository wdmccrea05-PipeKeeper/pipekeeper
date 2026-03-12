import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import ExpertTobacconist from "@/components/ai/ExpertTobacconist";

// Read optional tab param from URL synchronously (e.g. /Curator?tab=curator&prompt=...).
// This is safe because a navigation to /Curator always triggers a full mount.
function getTabFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    // If prompt is provided, default to curator tab unless explicitly overridden
    const tab = params.get("tab");
    const hasPrompt = params.has("prompt");
    return tab || (hasPrompt ? "curator" : "for_you");
  } catch {
    return "for_you";
  }
}

export default function Curator() {
  const { user, hasPaid } = useCurrentUser();
  const initialTab = getTabFromUrl();

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  return (
    <div className="space-y-5">
      <ExpertTobacconist
        pipes={pipes}
        blends={blends}
        isPaidUser={hasPaid}
        user={user}
        activeTab={initialTab}
      />
    </div>
  );
}