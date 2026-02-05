// src/components/home/PairingGrid.jsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { scopedEntities } from "@/components/api/scopedEntities";

/**
 * PairingGrid
 * - Accepts optional props: user, pipes, blends
 * - If pipes/blends not provided, it will fetch them (scoped) safely
 * - Hardens against undefined props (prevents e.length crashes)
 *
 * NOTE: This file focuses on stability + data flow. If your previous PairingGrid
 * had more complex scoring UI, reintroduce it inside the "render list" section.
 */
export default function PairingGrid(props) {
  const user = props?.user || null;
  const userEmail = user?.email || null;

  const pipesProvided = Array.isArray(props?.pipes);
  const blendsProvided = Array.isArray(props?.blends);

  const { data: pipesFetched = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pairinggrid-pipes", userEmail],
    enabled: !!userEmail && !pipesProvided,
    queryFn: () => scopedEntities.Pipe.listForUser(userEmail),
    initialData: [],
    staleTime: 60_000,
    retry: 1,
  });

  const { data: blendsFetched = [], isLoading: blendsLoading } = useQuery({
    queryKey: ["pairinggrid-blends", userEmail],
    enabled: !!userEmail && !blendsProvided,
    queryFn: () => scopedEntities.TobaccoBlend.listForUser(userEmail),
    initialData: [],
    staleTime: 60_000,
    retry: 1,
  });

  const pipes = pipesProvided ? props.pipes : pipesFetched;
  const blends = blendsProvided ? props.blends : blendsFetched;

  const loading = (!!userEmail && ((pipesProvided ? false : pipesLoading) || (blendsProvided ? false : blendsLoading)));

  const summary = useMemo(() => {
    const p = Array.isArray(pipes) ? pipes.length : 0;
    const b = Array.isArray(blends) ? blends.length : 0;
    return { p, b };
  }, [pipes, blends]);

  // Guard: if user isn't ready yet, don't crash
  if (!userEmail) {
    return (
      <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
        <div className="text-sm text-[#E0D8C8]/80">Recommendations</div>
        <div className="mt-2 text-xs text-[#E0D8C8]/60">Loading user…</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
        <div className="text-sm text-[#E0D8C8]/80">Recommendations</div>
        <div className="mt-2 text-xs text-[#E0D8C8]/60">Loading collection…</div>
      </div>
    );
  }

  // If you have no data, show a helpful empty state
  if (summary.p === 0 || summary.b === 0) {
    return (
      <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
        <div className="text-sm text-[#E0D8C8]/80">Recommendations</div>
        <div className="mt-2 text-sm text-[#E0D8C8]">
          Add a few {summary.p === 0 ? "pipes" : "blends"} to see pairing recommendations.
        </div>
        <div className="mt-1 text-xs text-[#E0D8C8]/60">
          Pipes: {summary.p} • Blends: {summary.b}
        </div>
      </div>
    );
  }

  // Minimal stable "recommendations" placeholder list:
  // Replace this scoring logic with your real algorithm if you have one elsewhere.
  const samplePipes = pipes.slice(0, 3);
  const sampleBlends = blends.slice(0, 3);

  return (
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#E0D8C8]/80">Recommendations</div>
        <div className="text-xs text-[#E0D8C8]/60">
          Pipes: {summary.p} • Blends: {summary.b}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl p-3 bg-black/10 border border-white/10">
          <div className="text-xs text-[#E0D8C8]/70 mb-2">Top pipes</div>
          <div className="space-y-1">
            {samplePipes.map((p) => (
              <div key={p?.id || p?._id || `${p?.name}-${Math.random()}`} className="text-sm text-[#E0D8C8]">
                {p?.name || p?.pipe_name || "Unnamed pipe"}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-3 bg-black/10 border border-white/10">
          <div className="text-xs text-[#E0D8C8]/70 mb-2">Top blends</div>
          <div className="space-y-1">
            {sampleBlends.map((b) => (
              <div key={b?.id || b?._id || `${b?.name}-${Math.random()}`} className="text-sm text-[#E0D8C8]">
                {b?.name || b?.blend_name || "Unnamed blend"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* If your old PairingGrid rendered a grid of match cards, paste it here and use `pipes` + `blends`. */}
    </div>
  );
}