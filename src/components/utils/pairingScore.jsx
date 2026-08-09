// @deprecated — Use pairingScoreCanonical instead. This file is a compatibility shim.
export {
  scorePipeBlend,
  buildPairingsForPipes,
  isAromaticBlend,
  normalizeFocus,
  getAromaticIntensity,
  inferBlendCategory,
  COMPATIBILITY_TIERS,
  SPECIALIZATION_MATRIX,
  computeCompatibilityTier,
} from "@/components/utils/pairingScoreCanonical";

export {
  scorePipeBlendDiagnostic,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  inferAromaticFromFields,
  isKnownNonAromaticBlend,
  COMPONENT_WEIGHTS,
  calibrateScore,
} from "@/components/utils/pairingScoreCanonical";
