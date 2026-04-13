/**
 * searchQueries.js
 *
 * Builds targeted search queries for bottles, blends, pipes, and images.
 * Multiple query variants are generated per entity so the LLM has maximum
 * context to find exact international matches.
 */

/**
 * Build query variants for a whiskey/spirits bottle.
 * Includes region/type when available so international expressions are found.
 *
 * @param {string} name       - Bottle/expression name
 * @param {string} distillery - Distillery or brand
 * @param {string} [type]     - Whiskey type (e.g. "single malt", "bourbon")
 * @param {string} [region]   - Region (e.g. "Islay", "Speyside")
 * @param {string} [country]  - Country of origin
 * @returns {string[]}
 */
export function buildBottleQueries(name, distillery, type, region, country) {
  const base = [distillery, name].filter(Boolean).join(' ').trim();
  const queries = [];

  if (base) {
    queries.push(`${base} bottle`);
    queries.push(`${base} whisky`);
    queries.push(`${base} official`);
    queries.push(`${base} retailer`);
    queries.push(`${base} image`);
  }

  if (region && base) queries.push(`${base} ${region} single malt`);
  if (country && base) queries.push(`${base} ${country}`);
  if (type && base) queries.push(`${base} ${type}`);

  // Trusted source-scoped queries for better international results
  if (base) {
    queries.push(`${base} site:masterofmalt.com OR site:thewhiskyexchange.com`);
    queries.push(`${base} site:whiskybase.com`);
  }

  return [...new Set(queries.filter(Boolean))];
}

/**
 * Build query variants for a tobacco blend.
 *
 * @param {string} name         - Blend name
 * @param {string} manufacturer - Manufacturer / brand
 * @returns {string[]}
 */
export function buildBlendQueries(name, manufacturer) {
  const base = [manufacturer, name].filter(Boolean).join(' ').trim();
  const queries = [];

  if (base) {
    queries.push(`${base} tobacco`);
    queries.push(`${base} tin`);
    queries.push(`${base} tin label`);
    queries.push(`${base} official`);
    queries.push(`${base} site:smokingpipes.com`);
    queries.push(`${base} site:tobaccoreviews.com`);
  }

  return [...new Set(queries.filter(Boolean))];
}

/**
 * Build query variants for a tobacco pipe.
 *
 * @param {string} maker - Pipe maker / artisan
 * @param {string} model - Model name
 * @param {string} shape - Shape (e.g. "billiard", "dublin")
 * @returns {string[]}
 */
export function buildPipeQueries(maker, model, shape) {
  const queries = [];
  const parts = [maker, model || shape].filter(Boolean);
  const base = parts.join(' ').trim();

  if (base) {
    queries.push(`${base} pipe`);
    queries.push(`${base} pipe official`);
  }
  if (maker && model) queries.push(`${maker} ${model} pipe`);
  if (maker && shape) queries.push(`${maker} ${shape} pipe`);
  if (maker) {
    queries.push(`${maker} pipe site:smokingpipes.com`);
    queries.push(`${maker} pipe site:pipedia.org`);
  }

  return [...new Set(queries.filter(Boolean))];
}

/**
 * Build image-focused query variants for any entity type.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields - Relevant fields (name, distillery, maker, manufacturer, etc.)
 * @returns {string[]}
 */
export function buildImageQueries(entityType, fields = {}) {
  const { name, distillery, maker, manufacturer, region, country, shape } = fields;

  if (entityType === 'bottle') {
    return buildBottleQueries(name, distillery, null, region, country).map(
      (q) => `${q} product image`
    );
  }

  if (entityType === 'blend') {
    const base = [manufacturer, name].filter(Boolean).join(' ').trim();
    return [
      `${base} tobacco tin label image`,
      `${base} tin art product photo`,
      `${base} official product image site:smokingpipes.com`,
    ].filter(Boolean);
  }

  if (entityType === 'pipe') {
    const base = [maker, shape].filter(Boolean).join(' ').trim();
    return [
      `${base} pipe product photo`,
      `${base} pipe reference image site:smokingpipes.com`,
      `${base} pipe official catalog image`,
    ].filter(Boolean);
  }

  return [name].filter(Boolean);
}

/**
 * Build the main LLM prompt for a Quick Add search.
 * Instructs the model to prioritize internationally relevant, trusted sources
 * and return provenance metadata alongside each result.
 *
 * @param {string} query
 * @param {'bottle'|'blend'|'pipe'|'cigar'} itemType
 * @returns {string}
 */
export function buildQuickAddPrompt(query, itemType) {
  const internationalNote = `
IMPORTANT — International coverage:
- Do NOT bias results toward US sources.
- For Scotch, favour UK and Scottish specialist sources (masterofmalt.com, thewhiskyexchange.com, whiskybase.com, royalmilewhiskies.com).
- For Japanese whisky, favour Japanese-specialist and international whisky retailers (dekanta.com, whiskybase.com, finedrams.com).
- For Irish whiskey, favour Irish/UK specialists over US general retailers.
- For international tobacco, favour official manufacturer pages and tobaccoreviews.com, smokingpipes.com.
- An exact match on an international specialty site should rank above a loose US retailer match.
`;

  if (itemType === 'bottle') {
    return `Find exact whiskey/spirits bottle matches for "${query}".
${internationalNote}
Rules:
1. Return the exact match first if it exists.
2. Include region, country, and the most trusted source domain where this bottle is listed.
3. Return up to 8 bottle results.

Return JSON with an "items" array. Each item:
- name (string)
- distillery (string)
- expression (string)
- whiskey_type (string)
- type (string)
- age (number or null)
- abv (number or null)
- region (string or null) — e.g. "Islay", "Speyside", "Highlands"
- country (string or null) — e.g. "Scotland", "Japan", "Ireland"
- description (string)
- source_domain (string or null) — most authoritative domain for this product
- image_url (string or null) — product image URL from a trusted source if known`;
  }

  if (itemType === 'blend') {
    return `Find exact tobacco blend matches for "${query}".
${internationalNote}
Rules:
1. Return the exact match first.
2. Include the manufacturer and a trusted source domain.
3. Return up to 8 blend results.

Return JSON with an "items" array. Each item:
- name (string)
- manufacturer (string)
- blend_type (string)
- strength (string or null)
- cut (string or null)
- description (string)
- flavor_notes (array of strings)
- source_domain (string or null)
- image_url (string or null) — tin or label image from a trusted source if known`;
  }

  if (itemType === 'pipe') {
    return `Find exact tobacco pipe matches for "${query}".
${internationalNote}
Rules:
1. Return the exact maker/model match first.
2. Include origin country and a trusted source domain.
3. Return up to 8 pipe results.

Return JSON with an "items" array. Each item:
- name (string)
- maker (string)
- model (string or null)
- shape (string or null)
- bowl_material (string or null)
- country_of_origin (string or null)
- description (string)
- source_domain (string or null)
- image_url (string or null) — reference product image from a trusted source if known`;
  }

  if (itemType === 'cigar') {
    return `Find exact premium cigar matches for "${query}".
Rules:
1. Return the exact match first.
2. Return up to 8 cigar results.

Return JSON with an "items" array. Each item:
- name (string)
- brand (string)
- line (string or null)
- vitola (string or null)
- wrapper (string or null)
- binder (string or null)
- filler (string or null)
- country_of_origin (string or null)
- body (mild / mild_medium / medium / medium_full / full)
- strength (mild / mild_medium / medium / medium_full / full)
- production_status (regular_production / limited / discontinued / seasonal / unknown)
- description (string)
- source_domain (string or null)
- image_url (string or null)`;
  }

  return `Find matches for "${query}". Return JSON with an "items" array.`;
}

/**
 * JSON schema for the LLM Quick Add response (common superset of all entity types).
 */
export const QUICK_ADD_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:              { type: 'string' },
          manufacturer:      { type: 'string' },
          maker:             { type: 'string' },
          model:             { type: 'string' },
          distillery:        { type: 'string' },
          expression:        { type: 'string' },
          blend_type:        { type: 'string' },
          whiskey_type:      { type: 'string' },
          type:              { type: 'string' },
          shape:             { type: 'string' },
          bowl_material:     { type: 'string' },
          strength:          { type: 'string' },
          cut:               { type: 'string' },
          age:               { type: 'number' },
          abv:               { type: 'number' },
          region:            { type: 'string' },
          country:           { type: 'string' },
          country_of_origin: { type: 'string' },
          flavor_notes:      { type: 'array', items: { type: 'string' } },
          description:       { type: 'string' },
          source_domain:     { type: 'string' },
          image_url:         { type: 'string' },
          // cigar fields
          brand:             { type: 'string' },
          line:              { type: 'string' },
          vitola:            { type: 'string' },
          wrapper:           { type: 'string' },
          binder:            { type: 'string' },
          filler:            { type: 'string' },
          body:              { type: 'string' },
          production_status: { type: 'string' },
        },
      },
    },
  },
};

/**
 * Build a prompt specifically for fetching image suggestions.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields
 * @returns {string}
 */
export function buildImageSearchPrompt(entityType, fields = {}, { broad = false } = {}) {
  const { name, distillery, maker, manufacturer, region, country, shape } = fields;

  const subject =
    entityType === 'bottle'
      ? [distillery, name].filter(Boolean).join(' ')
      : entityType === 'blend'
        ? [manufacturer, name].filter(Boolean).join(' ')
        : [maker, name || shape].filter(Boolean).join(' ');

  const internationalHint =
    region || country ? ` (${[region, country].filter(Boolean).join(', ')})` : '';

  let queryVariants = '';
  let sourceHint = '';

  if (entityType === 'bottle') {
    const base = [distillery, name].filter(Boolean).join(' ');
    queryVariants = broad
      ? `Use any of these searches to find at least 3 more images:\n- "${base} bottle"\n- "${base} whisky product"\n- "${base} image"\n- "${base}"`
      : `Run all of these searches and aggregate the results:\n1. "${base} bottle front"\n2. "${base} whisky bottle"\n3. "${base} official"\n4. "${base} product image"\n5. "${base} label"\n6. "${base} retailer"`;
    sourceHint = 'official distillery/brand pages, whiskybase.com, masterofmalt.com, thewhiskyexchange.com, finedrams.com, totalwine.com, reservebar.com';
  } else if (entityType === 'blend') {
    const base = [manufacturer, name].filter(Boolean).join(' ');
    queryVariants = broad
      ? `Use any of these searches to find at least 3 more images:\n- "${base} tobacco"\n- "${base} tin"\n- "${base} product"\n- "${base}"`
      : `Run all of these searches and aggregate the results:\n1. "${base} tin label"\n2. "${base} tobacco tin"\n3. "${base} official"\n4. "${base} product image"\n5. "${base} smokingpipes"\n6. "${base} pouch label"`;
    sourceHint = 'official manufacturer pages, smokingpipes.com, pipesandcigars.com, tobaccopipes.com, cupojoes.com, tobaccoreviews.com';
  } else {
    const base = [maker, name || shape].filter(Boolean).join(' ');
    queryVariants = broad
      ? `Use any of these searches to find at least 3 more images:\n- "${base} pipe"\n- "${maker} pipe"\n- "${maker} tobacco pipe"\n- "${maker}"`
      : `Run all of these searches and aggregate the results:\n1. "${base} pipe"\n2. "${[maker, name].filter(Boolean).join(' ')} pipe"\n3. "${[maker, shape].filter(Boolean).join(' ')} pipe"\n4. "${maker} pipe official"\n5. "${maker} pipe retailer"\n6. "${maker} stamping pipe"`;
    sourceHint = 'official maker pages, smokingpipes.com, pipedia.org, trusted pipe retailers, pipesandcigars.com';
  }

  return `Find at least 6 high-quality product images for the ${entityType} "${subject}"${internationalHint}.

${queryVariants}

CRITICAL RULES:
- Return a MINIMUM of 3 results, TARGET 4–6 results.
- Even if you find an exact title match, CONTINUE gathering results from other trusted sources. Do NOT stop at 1 result.
- Try to include images from different source domains for variety (1 official, 1–3 trusted retailers, 1–2 fallback references).
- Prefer images from: ${sourceHint}.
- For non-US products, prefer images from international specialist sources over US-only retailers.
- For pipes, these are reference images only (not guaranteed to match a user's specific pipe).
- Return only product/tin/bottle images — not review thumbnails, forum post images, or placeholder graphics.
- Remove duplicate image URLs before returning.
- Set is_exact_match=true only for the single strongest exact title+brand match.

Return JSON with an "images" array. Each item:
- title (string) — product name as shown on source page
- image_url (string) — direct URL to the product image
- source_url (string) — URL of the page where the image appears
- source_domain (string) — bare domain (e.g. "masterofmalt.com")
- alt_text (string or null)
- is_exact_match (boolean) — true only for the strongest exact match`;
}

/**
 * Build a broad fallback image search prompt used when the primary search
 * returns fewer than 3 results.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields
 * @returns {string}
 */
export function buildImageSearchFallbackPrompt(entityType, fields = {}) {
  return buildImageSearchPrompt(entityType, fields, { broad: true });
}

/**
 * JSON schema for the LLM image search response.
 */
export const IMAGE_SEARCH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    images: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:          { type: 'string' },
          image_url:      { type: 'string' },
          source_url:     { type: 'string' },
          source_domain:  { type: 'string' },
          alt_text:       { type: 'string' },
          is_exact_match: { type: 'boolean' },
        },
      },
    },
  },
};
