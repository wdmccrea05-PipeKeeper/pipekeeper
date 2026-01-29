// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { safeStripeError } from "../_utils/stripe.js";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function scanDirectory(dirPath) {
  const violations = [];
  let scannedCount = 0;

  try {
    const entries = [];
    
    // Try to read directory
    try {
      for await (const entry of Deno.readDir(dirPath)) {
        entries.push(entry);
      }
    } catch (e) {
      console.warn(`[stripeForbiddenScan] Cannot read directory ${dirPath}:`, e.message);
      return { violations: [], scannedCount: 0, scanError: `Cannot access ${dirPath}: ${e.message}` };
    }

    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`;

      if (entry.isDirectory) {
        // Skip node_modules, _utils (allowed), and hidden directories
        if (entry.name === "node_modules" || entry.name === "_utils" || entry.name.startsWith(".")) {
          continue;
        }
        
        const subResult = await scanDirectory(fullPath);
        violations.push(...subResult.violations);
        scannedCount += subResult.scannedCount;
      } else if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js") || entry.name.endsWith(".tsx"))) {
        scannedCount++;

        try {
          const content = await Deno.readTextFile(fullPath);
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;

            // Check for forbidden patterns
            if (line.includes("new Stripe(")) {
              violations.push({
                file: fullPath,
                line: lineNum,
                pattern: "new Stripe(",
                excerpt: line.trim().slice(0, 80),
              });
            }

            if (line.includes('from "npm:stripe"') || line.includes("from 'npm:stripe'")) {
              if (!line.includes("// allowed") && !line.includes("/* allowed */")) {
                violations.push({
                  file: fullPath,
                  line: lineNum,
                  pattern: 'import from "npm:stripe"',
                  excerpt: line.trim().slice(0, 80),
                });
              }
            }

            if (line.includes('Deno.env.get("STRIPE_SECRET_KEY")') || line.includes("Deno.env.get('STRIPE_SECRET_KEY')")) {
              violations.push({
                file: fullPath,
                line: lineNum,
                pattern: "Direct STRIPE_SECRET_KEY access",
                excerpt: line.trim().slice(0, 80),
              });
            }
          }
        } catch (e) {
          console.warn(`[stripeForbiddenScan] Cannot read file ${fullPath}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error(`[stripeForbiddenScan] Directory scan failed:`, e);
    return { violations: [], scannedCount: 0, scanError: e.message };
  }

  return { violations, scannedCount };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== "admin") {
      return json(403, { ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    // Resolve functions directory using import.meta.url
    const currentFileUrl = import.meta.url;
    const currentDir = new URL(".", currentFileUrl).pathname;
    const functionsDir = new URL("../", currentFileUrl).pathname;

    console.log(`[stripeForbiddenScan] Scanning from: ${functionsDir}`);

    const result = await scanDirectory(functionsDir);

    return json(200, {
      ok: true,
      scannedCount: result.scannedCount,
      violations: result.violations,
      violationCount: result.violations.length,
      scanError: result.scanError || null,
      scannedPath: functionsDir,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[stripeForbiddenScan] Fatal error:", error);
    return json(500, { 
      ok: false, 
      error: "SCAN_FAILED",
      message: safeStripeError(error) 
    });
  }
});