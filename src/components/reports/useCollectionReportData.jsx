import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";

/**
 * Loads only the collections the selected report modules need.
 */
export default function useCollectionReportData({ user, modules }) {
  const email = user?.email;
  const ready = Boolean(email);
  const shared = { staleTime: 60_000 };

  const pipes = useQuery({
    queryKey: ["report-pipes", email],
    queryFn: () => fetchAllEntities(base44.entities.Pipe, { created_by: email }, "-updated_date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const blends = useQuery({
    queryKey: ["report-blends", email],
    queryFn: () => fetchAllEntities(base44.entities.TobaccoBlend, { created_by: email }, "-updated_date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const smokingLogs = useQuery({
    queryKey: ["report-smoking-logs", email],
    queryFn: () => fetchAllEntities(base44.entities.SmokingLog, { created_by: email }, "-date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const bottles = useQuery({
    queryKey: ["report-bottles", email],
    queryFn: () => fetchAllEntities(base44.entities.Bottle, { created_by: email }, "-updated_date"),
    enabled: ready && Boolean(modules.whiskey),
    ...shared,
  });

  const tastingLogs = useQuery({
    queryKey: ["report-tasting-logs", email],
    queryFn: () => fetchAllEntities(base44.entities.TastingLog, { created_by: email }, "-tasting_date"),
    enabled: ready && Boolean(modules.whiskey),
    ...shared,
  });

  const cigars = useQuery({
    queryKey: ["report-cigars", email],
    queryFn: () => fetchAllEntities(base44.entities.Cigar, { created_by: email }, "-updated_date"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const cigarSessions = useQuery({
    queryKey: ["report-cigar-sessions", email],
    queryFn: () => fetchAllEntities(base44.entities.CigarSession, { created_by: email }, "-date"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const wines = useQuery({
    queryKey: ["report-wines", email],
    queryFn: () => fetchAllEntities(base44.entities.Wine, { created_by: email }, "-updated_date"),
    enabled: ready && Boolean(modules.wine),
    ...shared,
  });

  const wineTastings = useQuery({
    queryKey: ["report-wine-tastings", email],
    queryFn: () => fetchAllEntities(base44.entities.WineTasting, { created_by: email }, "-date"),
    enabled: ready && Boolean(modules.wine),
    ...shared,
  });

  const queries = [pipes, blends, smokingLogs, bottles, tastingLogs, cigars, cigarSessions, wines, wineTastings];

  return {
    pipes: pipes.data || [],
    blends: blends.data || [],
    smokingLogs: smokingLogs.data || [],
    bottles: bottles.data || [],
    tastingLogs: tastingLogs.data || [],
    cigars: cigars.data || [],
    cigarSessions: cigarSessions.data || [],
    wines: wines.data || [],
    wineTastings: wineTastings.data || [],
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
}