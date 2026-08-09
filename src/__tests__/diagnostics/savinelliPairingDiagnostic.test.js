/**
 * Diagnostic: Run the canonical pairing scorer against the real Savinelli
 * La Dolce 803 EX and Savinelli 320 EX pipes and report Top 10 results
 * with component-by-component explanations.
 *
 * This test is structured to produce a readable report when run:
 *   npx vitest run src/__tests__/diagnostics/savinelliPairingDiagnostic.test.js
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlendDiagnostic,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
} from '@/components/utils/pairingScoreCanonical';

// ── Real pipe data from the production database ──────────────────────

const savinelliLaDolce803EX = {
  pipe_id: '694962f3e0e42badd65f68d7',
  pipe_name: 'Savinelli La Dolce 803 EX',
  focus: ['Aromatic'],
  bowl_diameter_mm: 43.0,
  bowl_depth_mm: 47.0,
  chamber_volume: 'Large',
  bowl_material: 'Briar',
  shape: 'Lumberman',
  bowlStyle: 'Cylindrical (Straight Wall)',
};

const savinelli320EX = {
  pipe_id: '6949631546604b3308d330d0',
  pipe_name: 'Savinelli 320 EX',
  focus: ['Heavy Aromatics', 'Cult Blood Red Moon', 'Aromatic'],
  bowl_diameter_mm: 23.0,
  bowl_depth_mm: 34.0,
  chamber_volume: 'Large',
  bowl_material: 'Briar',
  shape: 'Author',
  bowlStyle: 'Squat / Pot',
};

// ── Real blend data from the production database ──────────────────────

const blends = [
  {
    id: '6a6aa102363b6067cdf5a4dd',
    name: 'Cult Blood Red Moon',
    blend_type: 'Aromatic',
    blend_family: 'aromatic',
    is_aromatic: true,
    aromatic_intensity: 'medium',
    cut: 'Coarse Cut',
    strength: 'Mild-Medium',
    tobacco_components: ['Black Cavendish', 'Virginia', 'Burley'],
    topping: 'Cherry',
  },
  {
    id: '6a02619a074ce7b9057cc087',
    name: 'Cult Blood Red Moon (STG)',
    blend_type: 'Aromatic',
    blend_family: 'aromatic',
    is_aromatic: true,
    aromatic_intensity: 'heavy',
    cut: 'Other',
    strength: 'Mild',
    tobacco_components: ['Black Cavendish', 'Virginia'],
    topping: 'Cherry',
  },
  {
    id: '6a1387ee311f60ddd7445770',
    name: 'Blood Red Moon',
    blend_type: 'Aromatic',
    blend_family: 'aromatic',
    is_aromatic: true,
    aromatic_intensity: 'heavy',
    cut: 'Ribbon',
    strength: 'Mild',
    tobacco_components: ['Black Cavendish', 'Virginia', 'Burley'],
    topping: 'Cherry',
  },
  {
    id: '6a5585d071d4e2dee2a85caa',
    name: 'Arango Balkan Supreme',
    blend_type: 'English',
    blend_family: 'english',
    is_aromatic: false,
    cut: 'Ribbon',
    strength: 'Medium',
    tobacco_components: ['Virginia', 'Latakia', 'Oriental'],
  },
  {
    id: '69f67d2ca7b6a36b864c9a51',
    name: "Shepherd's Pie",
    blend_type: 'English',
    blend_family: 'english',
    is_aromatic: false,
    cut: 'Ribbon',
    tobacco_components: ['Latakia', 'Virginia', 'Oriental'],
  },
  {
    id: '697cb0ba197bcb3f9cc1b9d9',
    name: "Shepherd's Pie (aromatic-flagged)",
    blend_type: 'English',
    blend_family: 'english',
    is_aromatic: true, // incorrectly set by correction_pass_6
    cut: 'Ribbon',
    strength: 'Medium',
    tobacco_components: ['Latakia', 'Turkish Izmir', 'Virginia', 'Black Cavendish', 'Burley'],
  },
  {
    id: '6a2df3c50cef5cc8d904d15d',
    name: 'Cowboy Coffee',
    blend_type: 'Virginia Based',
    blend_family: 'virginia',
    is_aromatic: true, // corrected
    cut: 'Coarse Cut',
    strength: 'Medium',
    tobacco_components: ['Virginia', 'Dark-fired Kentucky', 'Cavendish'],
  },
  {
    id: 'virginia-flake-1',
    name: 'Peterson Irish Flake',
    blend_type: 'Virginia',
    blend_family: 'virginia',
    is_aromatic: false,
    cut: 'Flake',
    strength: 'Medium',
    tobacco_components: ['Virginia'],
  },
  {
    id: 'vaper-1',
    name: 'Escudo Navy Deluxe',
    blend_type: 'Virginia/Perique',
    blend_family: 'vaper',
    is_aromatic: false,
    cut: 'Coin',
    strength: 'Medium',
    tobacco_components: ['Virginia', 'Perique'],
  },
  {
    id: 'burley-1',
    name: 'Prince Albert',
    blend_type: 'Burley',
    blend_family: 'burley',
    is_aromatic: false,
    cut: 'Ribbon',
    strength: 'Medium',
    tobacco_components: ['Burley'],
  },
  {
    id: 'eng-1',
    name: 'Nightcap',
    blend_type: 'English',
    blend_family: 'english',
    is_aromatic: false,
    cut: 'Ribbon',
    strength: 'Full',
    tobacco_components: ['Latakia', 'Virginia', 'Oriental', 'Perique'],
  },
  {
    id: 'aro-light-1',
    name: 'Lane 1Q',
    blend_type: 'Aromatic',
    blend_family: 'aromatic',
    is_aromatic: true,
    aromatic_intensity: 'light',
    cut: 'Ribbon',
    strength: 'Mild',
    tobacco_components: ['Black Cavendish', 'Virginia', 'Burley'],
  },
];

function formatReport(pipeName, pipe, blends) {
  const pipeN = normalizePipeForPairing(pipe);
  const results = blends
    .map((b) => ({ blend: b, result: scorePipeBlendDiagnostic(pipe, b, null) }))
    .sort((a, b) => b.result.score - a.result.score);

  const lines = [];
  lines.push(`\n═══════════════════════════════════════════════════════════════════`);
  lines.push(`  ${pipeName}`);
  lines.push(`  Focus: ${JSON.stringify(pipe.focus)}`);
  lines.push(`  Dedication: ${pipeN.dedicationType} (${pipeN.dedicationStrength})`);
  lines.push(`  Heavy Aromatic Focus: ${pipeN.isHeavyAromaticFocus}`);
  lines.push(`  Chamber: ${pipeN.chamberDiameterMm}mm dia × ${pipeN.chamberDepthMm}mm deep (${pipeN.chamberWidthCategory}/${pipeN.chamberDepthCategory})`);
  lines.push(`═══════════════════════════════════════════════════════════════════\n`);

  results.slice(0, 10).forEach((entry, i) => {
    const { blend, result } = entry;
    const tobN = result.normalizedTobacco;
    lines.push(`  ${i + 1}. ${blend.name}`);
    lines.push(`     Score: ${result.score}  |  Tier: ${result.tier.name}  |  Family: ${tobN.blendFamily}  |  Aromatic: ${tobN.isAromatic}`);
    lines.push(`     Components:`);
    for (const [key, c] of Object.entries(result.components)) {
      lines.push(`       ${key.padEnd(22)} score=${c.score}  weight=${c.weight}  contribution=${c.contribution}`);
      lines.push(`         ${c.reason}`);
    }
    lines.push(`     Why: ${result.why}`);
    lines.push('');
  });

  return lines.join('\n');
}

describe('Savinelli pairing diagnostic', () => {
  test('Savinelli La Dolce 803 EX — Top 10 with component breakdown', () => {
    const report = formatReport('Savinelli La Dolce 803 EX', savinelliLaDolce803EX, blends);
    // eslint-disable-next-line no-console
    console.log(report);

    // Verify aromatic blends rank above English/Balkan
    const results = blends
      .map((b) => ({ name: b.name, result: scorePipeBlendDiagnostic(savinelliLaDolce803EX, b, null) }))
      .sort((a, b) => b.result.score - a.result.score);

    const top10 = results.slice(0, 10);
    // eslint-disable-next-line no-console
    console.log('Top 10 ranking:', top10.map((r) => `${r.result.score} ${r.name} (${r.result.normalizedTobacco.blendFamily})`).join('\n  '));

    // Assert: no English/Balkan blend in top 3
    const top3 = top10.slice(0, 3);
    for (const entry of top3) {
      const fam = entry.result.normalizedTobacco.blendFamily;
      expect(['aromatic']).toContain(fam);
    }
  });

  test('Savinelli 320 EX — Top 10 with component breakdown', () => {
    const report = formatReport('Savinelli 320 EX', savinelli320EX, blends);
    // eslint-disable-next-line no-console
    console.log(report);

    const results = blends
      .map((b) => ({ name: b.name, result: scorePipeBlendDiagnostic(savinelli320EX, b, null) }))
      .sort((a, b) => b.result.score - a.result.score);

    const top10 = results.slice(0, 10);
    // eslint-disable-next-line no-console
    console.log('Top 10 ranking:', top10.map((r) => `${r.result.score} ${r.name} (${r.result.normalizedTobacco.blendFamily})`).join('\n  '));

    // Assert: Cult Blood Red Moon (exact focus match) is #1
    expect(top10[0].name).toMatch(/cult blood red moon/i);
    // Assert: no English/Balkan blend in top 3
    const top3 = top10.slice(0, 3);
    for (const entry of top3) {
      const fam = entry.result.normalizedTobacco.blendFamily;
      expect(['aromatic']).toContain(fam);
    }
  });
});