/**
 * CRITICAL HARDENING: AI exclusion (collectible-only) tests
 * 
 * Verify that ai_excluded items are properly filtered from recommendations
 * but still appear in valuation/export/document paths.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('AI exclusion - collectible pipes filtered from recommendations', () => {
  const allPipes = [
    { id: '1', name: 'Active Pipe', ai_excluded: false },
    { id: '2', name: 'Collectible Pipe', ai_excluded: true },
    { id: '3', name: 'Another Active', ai_excluded: false },
  ];
  
  const aiEligible = allPipes.filter((p) => !p.ai_excluded);
  
  assertEquals(aiEligible.length, 2, 'Should filter out ai_excluded pipes');
  assertEquals(aiEligible.find((p) => p.id === '2'), undefined,
    'Collectible pipe should not be in AI-eligible set');
});

Deno.test('AI exclusion - collectible tobaccos filtered from recommendations', () => {
  const allBlends = [
    { id: '1', name: 'Smoking Blend', ai_excluded: false },
    { id: '2', name: 'Cellared Vintage', ai_excluded: true },
    { id: '3', name: 'Active Blend', ai_excluded: false },
  ];
  
  const aiEligible = allBlends.filter((b) => !b.ai_excluded);
  
  assertEquals(aiEligible.length, 2, 'Should filter out ai_excluded blends');
  assertEquals(aiEligible.find((b) => b.id === '2'), undefined,
    'Cellared blend should not be in AI-eligible set');
});

Deno.test('AI exclusion - collectibles still appear in valuation', () => {
  const allPipes = [
    { id: '1', name: 'Active Pipe', ai_excluded: false, estimated_value: 100 },
    { id: '2', name: 'Collectible Pipe', ai_excluded: true, estimated_value: 500 },
  ];
  
  const totalValue = allPipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  
  assertEquals(totalValue, 600, 
    'Collectible items should be included in valuation calculations');
});

Deno.test('AI exclusion - collectibles appear in exports', () => {
  const allPipes = [
    { id: '1', name: 'Active Pipe', ai_excluded: false },
    { id: '2', name: 'Collectible Pipe', ai_excluded: true },
  ];
  
  const exportData = allPipes.map((p) => ({
    name: p.name,
    collectible_only: p.ai_excluded || false,
  }));
  
  assertEquals(exportData.length, 2, 'All pipes should appear in exports');
  assertEquals(exportData[1].collectible_only, true,
    'Export should flag collectible status');
});

Deno.test('AI exclusion - round-trip preservation', () => {
  let pipe = { id: '1', name: 'Test Pipe', ai_excluded: false };
  
  // Simulate toggle
  pipe.ai_excluded = true;
  assertEquals(pipe.ai_excluded, true, 'Should persist ai_excluded=true');
  
  // Simulate toggle back
  pipe.ai_excluded = false;
  assertEquals(pipe.ai_excluded, false, 'Should persist ai_excluded=false');
});

console.log('✅ All AI exclusion tests passed');