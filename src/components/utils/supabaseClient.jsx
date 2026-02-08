import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwenpjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MjMxNjEsImV4cCI6MjA1MjA5OTE2MX0.gE-8W18qPFyqCLsVE7O8SfuVCzT-_yZmLR_kRUa8x9M";

const key = (SUPABASE_KEY || "").trim();

// Validate no newlines or carriage returns
const hasNewline = key.includes("\n") || key.includes("\r");
if (hasNewline) {
  console.error("[SUPABASE_KEY_ERROR] Key contains newline/carriage return!");
}

// JWT decode if starts with eyJ
let jwtClaims = null;
let refMatch = false;
if (key.startsWith("eyJ")) {
  try {
    const payload = key.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    jwtClaims = decoded;
    refMatch = decoded.ref === "qtrypzzcjebvfcihiynt";
    console.log("[SUPABASE_JWT_CLAIMS]", {
      ref: decoded.ref,
      iss: decoded.iss,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    });
    console.log("[SUPABASE_REF_MATCH]", refMatch);
  } catch (e) {
    console.error("[SUPABASE_JWT_DECODE_ERROR]", e.message);
  }
}

// SHA256 fingerprint
(async () => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log("[SUPABASE_KEY_SHA256]", hashHex);
    console.log("[SUPABASE_KEY_LEN]", key.length);
  } catch (e) {
    console.error("[SUPABASE_SHA256_ERROR]", e.message);
  }
})();

console.log("[SUPABASE_TOKEN_URL]", `${SUPABASE_URL}/auth/v1/token?grant_type=password`);

const urlValid = SUPABASE_URL.includes("qtrypzzcjebvfcihiynt.supabase.co");
const keyValid = key.length > 20 && !hasNewline;
const jwtValid = !key.startsWith("eyJ") || refMatch;

export const SUPABASE_READY = urlValid && keyValid && jwtValid;

console.log("[SUPABASE_READY]", SUPABASE_READY, { urlValid, keyValid, jwtValid, keyLen: key.length });

export const supabase = createClient(SUPABASE_URL, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});