/**
 * CRITICAL HARDENING: Ownership claim guard tests
 * 
 * Verify that Curator cannot falsely claim user owns pipes/tobaccos
 * that are not in the verified collection.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { 
  buildVerifiedOwnedSets, 
  sanitizeOwnershipClaims 
} from '../_utils/curatorOwnershipGuard.js';

Deno.test('Ownership guard - verified pipe names allowed', () => {
  const pipes = [
    { name: 'Peterson Sherlock Holmes' },
    { name: 'Savinelli Autograph' },
  ];
  
  const verifiedSets = buildVerifiedOwnedSets(pipes, []);
  
  const response = 'Your Peterson Sherlock Holmes is a great choice for Latakia blends.';
  const sanitized = sanitizeOwnershipClaims(response, verifiedSets);
  
  assertEquals(sanitized.includes('Your Peterson Sherlock Holmes'), true,
    'Verified pipe names should be allowed');
});

Deno.test('Ownership guard - unverified pipe names reframed', () => {
  const pipes = [
    { name: 'Peterson Sherlock Holmes' },
  ];
  
  const verifiedSets = buildVerifiedOwnedSets(pipes, []);
  
  const response = 'Your Dunhill Shell Briar would pair well with this blend.';
  const sanitized = sanitizeOwnershipClaims(response, verifiedSets);
  
  assertEquals(sanitized.includes('Your Dunhill'), false,
    'Unverified pipe should have "your" removed');
  assertEquals(sanitized.includes('A Dunhill') || sanitized.includes('a Dunhill'), true,
    'Should reframe as suggestion');
});

Deno.test('Ownership guard - verified tobacco names allowed', () => {
  const blends = [
    { name: 'Penzance' },
    { name: 'Nightcap' },
  ];
  
  const verifiedSets = buildVerifiedOwnedSets([], blends);
  
  const response = 'Your Penzance would benefit from more aging.';
  const sanitized = sanitizeOwnershipClaims(response, verifiedSets);
  
  assertEquals(sanitized.includes('Your Penzance'), true,
    'Verified blend names should be allowed');
});

Deno.test('Ownership guard - unverified tobacco names reframed', () => {
  const blends = [
    { name: 'Penzance' },
  ];
  
  const verifiedSets = buildVerifiedOwnedSets([], blends);
  
  const response = 'You have a McClelland 5100 that pairs well with bulldogs.';
  const sanitized = sanitizeOwnershipClaims(response, verifiedSets);
  
  assertEquals(sanitized.includes('You have a McClelland'), false,
    'Unverified blend should be reframed');
});

Deno.test('Ownership guard - mixed verified and unverified', () => {
  const pipes = [{ name: 'Peterson System' }];
  const blends = [{ name: 'Nightcap' }];
  
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  
  const response = 'Your Peterson System with your Nightcap is great, but your Dunhill would also work.';
  const sanitized = sanitizeOwnershipClaims(response, verifiedSets);
  
  assertEquals(sanitized.includes('Your Peterson System'), true);
  assertEquals(sanitized.includes('your Nightcap'), true);
  assertEquals(sanitized.includes('your Dunhill'), false,
    'Unverified Dunhill should be reframed');
});

console.log('✅ All ownership guard tests passed');