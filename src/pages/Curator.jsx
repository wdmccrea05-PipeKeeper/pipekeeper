import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import ExpertTobacconist from "@/components/ai/ExpertTobacconist";

// Read optional tab param from URL synchronously (e.g. /Curator?tab=optimizer).
// This is safe because a navigation to /Curator always triggers a full mount.
function getTabFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("tab") || "identifier";
  } catch {
    return "identifier";
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
