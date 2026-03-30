import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { scopedEntities } from "@/components/api/scopedEntities";

/**
 * Hook to fetch recent/frequent values for auto-suggest
 * Returns top N unique values for a given entity + field
 *
 * IMPORTANT:
 * This hook must never use unscoped .list() calls for user-owned entities.
 * Active use today is:
 * - PipeForm -> entityName "Pipe"
 * - TobaccoForm -> entityName "TobaccoBlend"
 */
export function useRecentValues(entityName, fieldName, limit = 10) {
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;

  return useQuery({
    queryKey: ["recent-values", entityName, fieldName, userEmail, limit],
    enabled: !!entityName && !!fieldName && !!userEmail,
    queryFn: async () => {
      try {
        let records = [];

        if (entityName === "Pipe") {
          records = await scopedEntities.Pipe.listForUser(userEmail, "-created_date", 100);
        } else if (entityName === "TobaccoBlend") {
          records = await scopedEntities.TobaccoBlend.listForUser(userEmail, "-created_date", 100);
        } else {
          console.warn(`[useRecentValues] Unsupported scoped entity: ${entityName}`);
          return [];
        }

        const values = (records || [])
          .map((r) => r?.[fieldName])
          .filter((v) => v && typeof v === "string" && v.trim() !== "");

        const counts = {};
        values.forEach((v) => {
          const normalized = v.trim();
          counts[normalized] = (counts[normalized] || 0) + 1;
        });

        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, limit)
          .map(([value]) => value);
      } catch (err) {
        console.error("Failed to fetch recent values:", err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}