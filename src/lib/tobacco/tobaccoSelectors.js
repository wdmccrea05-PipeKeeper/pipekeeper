import { getTobaccoReplacementDifficulty, getTobaccoStrategy } from './tobaccoValuation.js';

export function selectTobaccoReplacementDifficulty(blend) {
  return getTobaccoReplacementDifficulty(blend);
}

export function selectTobaccoStrategy(blend) {
  return getTobaccoStrategy(blend);
}
