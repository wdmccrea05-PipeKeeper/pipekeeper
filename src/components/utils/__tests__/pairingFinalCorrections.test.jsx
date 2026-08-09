import { describe, expect, test } from 'vitest';
import {
  buildPairingsForPipes,
  inferBlendCategory,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  rankPipesForBlend,
  scorePipeBlend,
  scorePipeBlendDiagnostic,
} from '../pairingScoreCanonical';
import { expandPipesToVariants, getVariantFromPipe } from '../pipeVariants';
import { sanitizeAiDiscoveryMatches } from '../../pipes/TopBlendMatches';

describe('Final aromatic classification corrections', () => {
  test('generic casing/topping does not automatically force aromatic classification', () => {
    const blend = normalizeTobaccoForPairing({
      name: 'Cased Virginia',
      blend_type: 'Virginia',
      casing: 'Sugar water',
      topping: 'none',
    });
    expect(blend.isAromatic).toBe(false);
    expect(blend.hasFlavoringTreatment).toBe(true);
  });

  test('natural tasting notes do not independently create aromatic status', () => {
    expect(inferBlendCategory({
      name: 'Sweet Virginia',
      blend_type: 'Virginia',
      flavor_notes: ['Honey', 'Fig'],
    })).toBe('non_aromatic');

    expect(inferBlendCategory({
      name: 'Burley Cocoa',
      blend_type: 'Burley',
      flavor_notes: ['Natural cocoa'],
    })).toBe('non_aromatic');
  });

  test('explicit vanilla-topped aromatic stays aromatic', () => {
    const blend = normalizeTobaccoForPairing({
      name: 'Vanilla Cavendish',
      topping: 'Vanilla',
      is_aromatic: true,
    });
    expect(blend.isAromatic).toBe(true);
    expect(blend.blendFamily).toBe('aromatic');
  });
});

describe('VaPer normalization corrections', () => {
  test('Navy Flake without Perique is not VaPer', () => {
    expect(normalizeTobaccoForPairing({
      name: 'Navy Flake',
      blend_type: 'Navy Flake',
      tobacco_components: ['Virginia', 'Burley'],
    }).blendFamily).not.toBe('vaper');
  });

  test('Virginia plus Perique is VaPer', () => {
    expect(normalizeTobaccoForPairing({
      name: 'Classic VaPer',
      tobacco_components: ['Virginia', 'Perique'],
    }).blendFamily).toBe('vaper');
  });

  test('Perique without Virginia is not VaPer', () => {
    expect(normalizeTobaccoForPairing({
      name: 'BurPer',
      tobacco_components: ['Burley', 'Perique'],
    }).blendFamily).not.toBe('vaper');
  });

  test('explicit Virginia/Perique classification is VaPer', () => {
    expect(normalizeTobaccoForPairing({
      name: 'Labelled VaPer',
      blend_type: 'Virginia/Perique',
    }).blendFamily).toBe('vaper');
  });
});

describe('Geometry hierarchy corrections', () => {
  test('measured geometry outranks weak shape inference', () => {
    const churchwarden = normalizePipeForPairing({
      shape: 'Churchwarden',
      bowl_diameter_mm: 24,
      bowl_depth_mm: 28,
    });
    expect(churchwarden.chamberWidthCategory).toBe('wide');
    expect(churchwarden.chamberDepthCategory).toBe('shallow');
    expect(churchwarden.geometrySource).toBe('measured');
  });

  test('measured narrow Bulldog remains narrow even though the shape is unreliable', () => {
    const bulldog = normalizePipeForPairing({
      shape: 'Bulldog',
      bowl_diameter_mm: 16,
      bowl_depth_mm: 45,
    });
    expect(bulldog.chamberWidthCategory).toBe('narrow');
    expect(bulldog.chamberDepthCategory).toBe('deep');
    expect(bulldog.geometrySource).toBe('measured');
  });

  test('Churchwarden with no measurements stays unknown', () => {
    const churchwarden = normalizePipeForPairing({ shape: 'Churchwarden' });
    expect(churchwarden.chamberWidthCategory).toBe(null);
    expect(churchwarden.chamberDepthCategory).toBe(null);
    expect(churchwarden.geometrySource).toBe('unknown');
  });

  test('Pot without measurements gets only a weak wide/shallow tendency', () => {
    const pot = normalizePipeForPairing({ shape: 'Pot' });
    expect(pot.chamberWidthCategory).toBe('wide');
    expect(pot.chamberDepthCategory).toBe('shallow');
    expect(pot.geometrySource).toBe('weakShape');
  });
});

describe('AI discovery score sanitization', () => {
  test('AI discovery results cannot override the authoritative score', () => {
    const [match] = sanitizeAiDiscoveryMatches([{
      manufacturer: 'Example',
      blend_name: 'Imaginary Flake',
      reasoning: 'Looks good',
      estimated_suitability: 'promising',
      metadata_confidence: 'insufficient metadata',
      score: 10,
      finalScore: 10,
      canonicalScore: 10,
    }]);

    expect(match.canonicalScore).toBe(null);
    expect(match.estimatedSuitability).toBe('promising');
  });

  test('AI-discovered incomplete metadata lowers confidence diagnostics', () => {
    const result = scorePipeBlendDiagnostic(
      { focus: ['Versatile'], bowl_diameter_mm: 20, bowl_depth_mm: 38 },
      {
        name: 'Partial Discovery',
        metadata_source: 'ai_discovery',
        metadata_complete: false,
      },
      null,
    );
    expect(result.confidenceDetails.aiDiscoveryMetadataComplete).toBe(false);
    expect(result.confidenceDetails.missingFields).toContain('ai_discovery_metadata');
  });
});

describe('Autumn Evening component diagnostics and cross-screen parity', () => {
  const autumnEvening = {
    id: 'ae',
    name: 'Autumn Evening',
    blend_type: 'Virginia/Burley',
    tobacco_components: ['Red Virginia', 'Black Cavendish'],
    is_aromatic: true,
    aromatic_intensity: 'heavy',
    cut: 'Ribbon',
    flavor_notes: ['Maple'],
    strength: 'Medium',
  };

  const parentPipe = {
    id: 'pipe-1',
    name: 'Modular Pipe',
    focus: ['Versatile'],
    bowl_material: 'Briar',
    bowl_diameter_mm: 18,
    bowl_depth_mm: 38,
    interchangeable_bowls: [
      { bowl_variant_id: 'aro', name: 'Aromatic Bowl', focus: ['Aromatic'], bowl_diameter_mm: 20, bowl_depth_mm: 38 },
      { bowl_variant_id: 'eng', name: 'English Bowl', focus: ['English'], bowl_diameter_mm: 20, bowl_depth_mm: 38 },
    ],
  };
  const virginiaPipe = { id: 'pipe-2', name: 'Virginia Pipe', focus: ['Virginia'], bowl_diameter_mm: 18, bowl_depth_mm: 42, bowl_material: 'Briar' };
  const englishPipe = { id: 'pipe-3', name: 'English Pipe', focus: ['English'], bowl_diameter_mm: 22, bowl_depth_mm: 36, bowl_material: 'Briar' };

  test('Autumn Evening ranking is explained by component breakdown', () => {
    const aromatic = scorePipeBlendDiagnostic(getVariantFromPipe(parentPipe, 'aro'), autumnEvening, null);
    const general = scorePipeBlendDiagnostic(getVariantFromPipe(parentPipe, null), autumnEvening, null);
    const virginia = scorePipeBlendDiagnostic(virginiaPipe, autumnEvening, null);
    const english = scorePipeBlendDiagnostic(englishPipe, autumnEvening, null);

    expect(aromatic.score).toBeGreaterThan(general.score);
    expect(general.score).toBeGreaterThan(virginia.score);
    expect(virginia.score).toBeGreaterThan(english.score);
    expect(aromatic.components.dedication.score).toBeGreaterThan(general.components.dedication.score);
    expect(english.components.dedication.score).toBeLessThanOrEqual(2);
  });

  test('interchangeable bowls are scored as first-class smoking variants', () => {
    const [winner] = rankPipesForBlend([parentPipe], autumnEvening, null, {
      includeMainWhenBowls: true,
      collapseToParent: true,
      limit: 3,
    });
    expect(winner.pipe_id).toBe('pipe-1');
    expect(winner.bowl_variant_id).toBe('aro');
    expect(winner.bowl_name).toBe('Aromatic Bowl');
  });

  test('cross-screen canonical parity holds for variant scoring and matrix generation', () => {
    const pipes = [parentPipe, virginiaPipe, englishPipe];
    const variants = expandPipesToVariants(pipes, { includeMainWhenBowls: true });
    const ranked = rankPipesForBlend(pipes, autumnEvening, null, {
      includeMainWhenBowls: true,
      collapseToParent: true,
      limit: 3,
    });
    const pairings = buildPairingsForPipes(variants, [autumnEvening], null);
    const direct = scorePipeBlend(getVariantFromPipe(parentPipe, 'aro'), autumnEvening, null);

    const variantEntry = pairings.find((entry) =>
      String(entry.pipe_id) === 'pipe-1' && entry.bowl_variant_id === 'aro'
    );
    expect(variantEntry.recommendations[0].score).toBe(direct.score);
    expect(ranked[0].score).toBe(direct.score);
    expect(ranked[0].bowl_variant_id).toBe('aro');
  });
});
