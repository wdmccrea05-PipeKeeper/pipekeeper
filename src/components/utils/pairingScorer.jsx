// @deprecated — Use pairingScoreCanonical instead. This file is a compatibility shim.
export {
  scorePipeBlend,
  buildPairingsForPipes,
  isAromaticBlend,
  normalizeFocus,
  getAromaticIntensity,
  inferBlendCategory,
} from "@/components/utils/pairingScoreCanonical";

// Legacy name aliases for backward compatibility
export { scorePipeBlend as scoreBlendForPipe } from "@/components/utils/pairingScoreCanonical";
export { buildPairingsForPipes as generatePairingsDeterministic } from "@/components/utils/pairingScoreCanonical";

export {
  scorePipeBlendDiagnostic,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  inferAromaticFromFields,
  isKnownNonAromaticBlend,
  COMPONENT_WEIGHTS,
} from "@/components/utils/pairingScoreCanonical";
