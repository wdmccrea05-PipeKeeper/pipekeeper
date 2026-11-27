import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";

/**
 * Loads the collection records and the supporting logs the Reporting Center
 * needs. Each source is gated by the module it belongs to, so a collector with
 * one module never pays for the others.
 */
export default function useReportCenterData({ user, modules }) {
  const email = user?.email;
  const ready = Boolean(email);
  const shared = { staleTime: 300_000 };
  const owner = { created_by: email };

  const pipes = useQuery({
    queryKey: ["rc-pipes", email],
    queryFn: () => fetchAllEntities(base44.entities.Pipe, owner, "-updated_date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const blends = useQuery({
    queryKey: ["rc-blends", email],
    queryFn: () => fetchAllEntities(base44.entities.TobaccoBlend, owner, "-updated_date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const bottles = useQuery({
    queryKey: ["rc-bottles", email],
    queryFn: () => fetchAllEntities(base44.entities.Bottle, owner, "-updated_date"),
    enabled: ready && Boolean(modules.whiskey),
    ...shared,
  });

  const cigars = useQuery({
    queryKey: ["rc-cigars", email],
    queryFn: () => fetchAllEntities(base44.entities.Cigar, owner, "-updated_date"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const wines = useQuery({
    queryKey: ["rc-wines", email],
    queryFn: () => fetchAllEntities(base44.entities.Wine, owner, "-updated_date"),
    enabled: ready && Boolean(modules.wine),
    ...shared,
  });

  const smokingLogs = useQuery({
    queryKey: ["rc-smoking", email],
    queryFn: () => fetchAllEntities(base44.entities.SmokingLog, owner, "-date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const cellarLogs = useQuery({
    queryKey: ["rc-cellar", email],
    queryFn: () => fetchAllEntities(base44.entities.CellarLog, owner, "-date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const pipeMaintenance = useQuery({
    queryKey: ["rc-pipe-maint", email],
    queryFn: () => fetchAllEntities(base44.entities.PipeMaintenanceLog, owner, "-date"),
    enabled: ready && Boolean(modules.pipe),
    ...shared,
  });

  const tastingLogs = useQuery({
    queryKey: ["rc-tastings", email],
    queryFn: () => fetchAllEntities(base44.entities.TastingLog, owner, "-tasting_date"),
    enabled: ready && Boolean(modules.whiskey),
    ...shared,
  });

  const bottleFills = useQuery({
    queryKey: ["rc-fills", email],
    queryFn: () => fetchAllEntities(base44.entities.BottleFillRecord, owner, "-recorded_at"),
    enabled: ready && Boolean(modules.whiskey),
    ...shared,
  });

  const cigarSessions = useQuery({
    queryKey: ["rc-cigar-sessions", email],
    queryFn: () => fetchAllEntities(base44.entities.CigarSession, owner, "-date"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const cigarRatings = useQuery({
    queryKey: ["rc-cigar-ratings", email],
    queryFn: () => fetchAllEntities(base44.entities.CigarRating, owner, "-rated_at"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const humidors = useQuery({
    queryKey: ["rc-humidors", email],
    queryFn: () => fetchAllEntities(base44.entities.HumidorLocation, owner, "name"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const humidorReadings = useQuery({
    queryKey: ["rc-humidor-readings", email],
    queryFn: () => fetchAllEntities(base44.entities.HumidorReading, owner, "-recorded_at"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const humidorMaintenance = useQuery({
    queryKey: ["rc-humidor-maint", email],
    queryFn: () => fetchAllEntities(base44.entities.HumidorMaintenanceLog, owner, "-date"),
    enabled: ready && Boolean(modules.cigar),
    ...shared,
  });

  const wineTastings = useQuery({
    queryKey: ["rc-wine-tastings", email],
    queryFn: () => fetchAllEntities(base44.entities.WineTasting, owner, "-date"),
    enabled: ready && Boolean(modules.wine),
    ...shared,
  });

  const wineInspections = useQuery({
    queryKey: ["rc-wine-inspections", email],
    queryFn: () => fetchAllEntities(base44.entities.WineInspection, owner, "-inspected_at"),
    enabled: ready && Boolean(modules.wine),
    ...shared,
  });

  const locations = useQuery({
    queryKey: ["rc-locations", email],
    queryFn: () => fetchAllEntities(base44.entities.StorageLocation, owner, "name"),
    enabled: ready,
    ...shared,
  });

  const valuations = useQuery({
    queryKey: ["rc-valuations", email],
    queryFn: () => fetchAllEntities(base44.entities.ValuationRecord, owner, "-valuation_date"),
    enabled: ready,
    ...shared,
  });

  const collectionActivity = useQuery({
    queryKey: ["rc-activity", email],
    queryFn: () => fetchAllEntities(base44.entities.CollectionActivity, owner, "-occurred_at"),
    enabled: ready,
    ...shared,
  });

  const queries = [
    pipes, blends, bottles, cigars, wines,
    smokingLogs, cellarLogs, pipeMaintenance,
    tastingLogs, bottleFills,
    cigarSessions, cigarRatings, humidors, humidorReadings, humidorMaintenance,
    wineTastings, wineInspections,
    locations, valuations, collectionActivity,
  ];

  return {
    pipes: pipes.data || [],
    blends: blends.data || [],
    bottles: bottles.data || [],
    cigars: cigars.data || [],
    wines: wines.data || [],
    smokingLogs: smokingLogs.data || [],
    cellarLogs: cellarLogs.data || [],
    pipeMaintenance: pipeMaintenance.data || [],
    tastingLogs: tastingLogs.data || [],
    bottleFills: bottleFills.data || [],
    cigarSessions: cigarSessions.data || [],
    cigarRatings: cigarRatings.data || [],
    humidors: humidors.data || [],
    humidorReadings: humidorReadings.data || [],
    humidorMaintenance: humidorMaintenance.data || [],
    wineTastings: wineTastings.data || [],
    wineInspections: wineInspections.data || [],
    locations: locations.data || [],
    valuations: valuations.data || [],
    collectionActivity: collectionActivity.data || [],
    isLoading: queries.some((entry) => entry.isLoading),
    isError: queries.some((entry) => entry.isError),
  };
}