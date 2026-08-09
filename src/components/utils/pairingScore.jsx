// @deprecated — Use pairingScoreCanonical instead. This file is a compatibility shim.
export {
  scorePipeBlend,
  buildPairingsForPipes,
  isAromaticBlend,
  normalizeFocus,
  getAromaticIntensity,
  inferBlendCategory,
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
