/**
 * CRITICAL HARDENING: Deduplication utilities for Curator event logging.
 * 
 * Prevents impression inflation from React rerenders and retries.
 */

const impressionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function pruneExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of impressionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      impressionCache.delete(key);
    }
  }
}

export function shouldLogImpression(userEmail, recommendationId, viewContext = 'home') {
  pruneExpiredEntries();
  
  const key = `${userEmail}|${recommendationId}|${viewContext}`;
  const existing = impressionCache.get(key);
  
  if (existing) {
    return false; // Already logged in this window
  }
  
  impressionCache.set(key, { timestamp: Date.now() });
  return true;
}

export function clearImpressionCache() {
  impressionCache.clear();
}

// For curator_message_sent, use a shorter TTL to avoid double-counting rapid retries
const messageSentCache = new Map();
const MESSAGE_SENT_TTL_MS = 10 * 1000; // 10 seconds

function pruneExpiredMessageSentEntries() {
  const now = Date.now();
  for (const [key, entry] of messageSentCache.entries()) {
    if (now - entry.timestamp > MESSAGE_SENT_TTL_MS) {
      messageSentCache.delete(key);
    }
  }
}

export function shouldLogMessageSent(sessionId, messageContent) {
  pruneExpiredMessageSentEntries();
  
  // Use content hash as part of key to dedupe identical message retries
  const contentHash = messageContent.slice(0, 50);
  const key = `${sessionId}|${contentHash}`;
  const existing = messageSentCache.get(key);
  
  if (existing) {
    return false;
  }
  
  messageSentCache.set(key, { timestamp: Date.now() });
  return true;
}