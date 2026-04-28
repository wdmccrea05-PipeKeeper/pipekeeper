/**
 * auditLegacyPipeSchema
 * 
 * Scans all Pipe records and reports invalid enum/schema values
 * without auto-repairing anything. Read-only audit.
 * 
 * Admin-only endpoint.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PIPE_ENUM_SETS = {
  shape: new Set(["Billiard","Bent Billiard","Apple","Bent Apple","Dublin","Bent Dublin","Bulldog","Rhodesian","Canadian","Liverpool","Lovat","Lumberman","Prince","Author","Brandy","Pot","Tomato","Egg","Acorn","Pear","Cutty","Devil Anse","Hawkbill","Diplomat","Poker","Cherrywood","Duke","Don","Tankard","Churchwarden","Nosewarmer","Vest Pocket","MacArthur","Calabash","Reverse Calabash","Cavalier","Freehand","Blowfish","Volcano","Horn","Nautilus","Tomahawk","Bullmoose","Bullcap","Oom Paul (Hungarian)","Tyrolean","Unknown","Other"]),
  bowlStyle: new Set(["Cylindrical (Straight Wall)","Conical (Tapered)","Rounded / Ball","Oval / Egg","Squat / Pot","Chimney (Tall)","Paneled","Faceted / Multi-Panel","Horn-Shaped","Freeform","Unknown"]),
  shankShape: new Set(["Round","Diamond","Square","Oval","Paneled / Faceted","Military / Army Mount","Freeform","Unknown"]),
  bend: new Set(["Straight","1/4 Bent","1/2 Bent","3/4 Bent","Full Bent","S-Bend","Unknown"]),
  sizeClass: new Set(["Vest Pocket","Small","Standard","Large","Magnum / XL","Churchwarden","MacArthur","Unknown"]),
  chamber_volume: new Set(["Small","Medium","Large","Extra Large"]),
  stem_material: new Set(["Acrylic","Amber","Bone","Cumberland","Ebonite","Horn","Lucite","Other","Vulcanite"]),
  bowl_material: new Set(["Briar","Meerschaum","Corn Cob","Clay","Olive Wood","Cherry Wood","Morta","Other"]),
  finish: new Set(["Smooth","Sandblast","Rusticated","Partially Rusticated","Carved","Natural","Other"]),
  filter_type: new Set(["None","6mm","9mm","Stinger","Other"]),
  condition: new Set(["Mint","Excellent","Very Good","Good","Fair","Poor","Estate - Unrestored"]),
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all pipes (paginated in batches of 200)
    const allPipes = [];
    let skip = 0;
    const batchSize = 200;

    while (true) {
      const batch = await base44.asServiceRole.entities.Pipe.list('-created_date', batchSize, skip);
      if (!batch || batch.length === 0) break;
      allPipes.push(...batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    const auditResults = [];
    const fieldSummary = {};

    for (const pipe of allPipes) {
      const issues = [];

      for (const [field, validSet] of Object.entries(PIPE_ENUM_SETS)) {
        const val = pipe[field];
        if (val && !validSet.has(val)) {
          issues.push({ field, invalid_value: val });
          if (!fieldSummary[field]) fieldSummary[field] = {};
          fieldSummary[field][val] = (fieldSummary[field][val] || 0) + 1;
        }
      }

      // Check photos is array
      if (pipe.photos !== undefined && pipe.photos !== null && !Array.isArray(pipe.photos)) {
        issues.push({ field: 'photos', issue: 'not_array', actual_type: typeof pipe.photos });
      }

      if (issues.length > 0) {
        auditResults.push({
          id: pipe.id,
          name: pipe.name || '(unnamed)',
          created_by: pipe.created_by || '(unknown)',
          created_date: pipe.created_date,
          issues,
        });
      }
    }

    return Response.json({
      scanned: allPipes.length,
      records_with_issues: auditResults.length,
      clean_records: allPipes.length - auditResults.length,
      field_summary: fieldSummary,
      records: auditResults,
      audit_timestamp: new Date().toISOString(),
      note: 'READ-ONLY audit — no records were modified.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});