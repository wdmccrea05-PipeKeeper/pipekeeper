import React, { useMemo } from "react";
import { buildCollectionReport } from "@/lib/reports/pairingInsightsEngine";
import PipePairingChartReport from "@/components/reports/PipePairingChartReport";

/**
 * Advanced pairing view for the PipeKeeper Insights › Pairings tab.
 *
 * Reuses the canonical pairing report engine so the advanced format shows the
 * same scores as the printable report: five matches per pipe, with
 * specialization, photos and the scorer's reasoning.
 */
export default function AdvancedPairingReport({ user, pipes, blends, smokingLogs = [] }) {
  const rows = useMemo(() => {
    const report = buildCollectionReport({
      data: {
        pipes,
        blends,
        smokingLogs,
        userProfile: user,
      },
      options: {
        modules: { pipe: true, whiskey: false, cigar: false, wine: false },
        blendsPerPipe: 5,
        includePhotos: true,
        includeExplanations: true,
      },
    });
    return report.pairingChart;
  }, [pipes, blends, smokingLogs, user]);

  return <PipePairingChartReport rows={rows} includePhotos includeExplanations />;
}