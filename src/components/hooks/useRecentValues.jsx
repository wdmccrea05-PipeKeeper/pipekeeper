import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to fetch recent/frequent values for auto-suggest
 * Returns top N unique values for a given entity + field
 */
export function useRecentValues(entityName, fieldName, limit = 10) {
  return useQuery({
    queryKey: ["recent-values", entityName, fieldName],
    queryFn: async () => {
      try {
        const records = await base44.entities[entityName].list("-created_date", 100);
        
        const values = records
          .map(r => r[fieldName])
          .filter(v => v && typeof v === "string" && v.trim() !== "");
        
        // Count occurrences
        const counts = {};
        values.forEach(v => {
          const normalized = v.trim();
          counts[normalized] = (counts[normalized] || 0) + 1;
        });
        
        // Sort by frequency, then alphabetically
        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, limit)
          .map(([value]) => value);
      } catch (err) {
        console.error("Failed to fetch recent values:", err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!entityName && !!fieldName,
  });
}