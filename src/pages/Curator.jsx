import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import ExpertTobacconist from "@/components/ai/ExpertTobacconist";

export default function Curator() {
  const { user, hasPaid } = useCurrentUser();

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

  // Read optional tab param from URL (e.g. /Curator?tab=optimizer)
  const [initialTab, setInitialTab] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) setInitialTab(tab);
  }, []);

  return (
    <div className="space-y-5">
      <ExpertTobacconist
        pipes={pipes}
        blends={blends}
        isPaidUser={hasPaid}
        user={user}
        activeTab={initialTab ?? "identifier"}
      />
    </div>
  );
}
