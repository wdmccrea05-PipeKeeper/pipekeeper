import { base44 } from '@/api/base44Client';
import { scopedEntities } from '@/components/api/scopedEntities';
import { BLEND_TYPES } from '@/components/tobacco/tobaccoConstants';
import { normalizeCigarPayload } from '@/platform/normalizeCigarPayload';
import {
  compactString,
  normalizeHeader,
  parseBoolean,
  parseDate,
  parseEnum,
  parseInteger,
  parseNumber,
  parseRating,
  parseStringList,
  toNoteLines,
} from './csvImportUtils';

const PIPE_CONDITIONS = ['Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Estate - Unrestored'];
const PIPE_FINISHES = ['Smooth', 'Sandblast', 'Rusticated', 'Partially Rusticated', 'Carved', 'Natural', 'Other'];
const PIPE_MATERIALS = ['Briar', 'Meerschaum', 'Corn Cob', 'Clay', 'Olive Wood', 'Cherry Wood', 'Morta', 'Other'];

const TOBACCO_CUTS = ['Ribbon', 'Flake', 'Broken Flake', 'Ready Rubbed', 'Plug', 'Coin', 'Cube Cut', 'Crumble Cake', 'Shag', 'Rope', 'Twist', 'Other'];
const TOBACCO_PRODUCTION = ['Current Production', 'Discontinued', 'Limited Edition', 'Vintage'];

const WHISKEY_TYPES = ['Bourbon', 'Rye', 'Single Malt', 'Blended', 'Japanese Whisky', 'Irish Whiskey', 'Scotch Whisky', 'Other'];
const WHISKEY_BOTTLE_SIZES = ['50ml', '100ml', '200ml', '375ml', '500ml', '700ml', '750ml', '1L', '1.75L', 'Other'];

const CIGAR_BODY = ['mild', 'mild_medium', 'medium', 'medium_full', 'full'];
const CIGAR_PRODUCTION = ['regular_production', 'limited', 'seasonal', 'discontinued', 'unknown'];
const GRAMS_PER_OUNCE = 28.3495;
const PROOF_TO_ABV_DIVISOR = 2;
const OPTIONAL_MISSING_WARNING_THRESHOLD = 0.5;

function mapKey(raw) {
  const key = normalizeHeader(raw);
  return key === 'origin_country' ? 'country_of_origin' : key;
}

function coercePipePayload(row, extras) {
  const purchasePrice = parseNumber(row.purchase_price);
  const estimatedValue = parseNumber(row.estimated_value);
  const favorite = parseBoolean(row.favorite);
  const purchaseDate = parseDate(row.purchase_date);
  const condition = parseEnum(row.condition, PIPE_CONDITIONS);
  const finish = parseEnum(row.finish, PIPE_FINISHES);
  const material = parseEnum(row.material, PIPE_MATERIALS);

  const errors = [];
  if (!purchasePrice.ok) errors.push('purchase_price is invalid');
  if (!estimatedValue.ok) errors.push('estimated_value is invalid');
  if (!favorite.ok) errors.push('favorite is invalid');
  if (!purchaseDate.ok) errors.push('purchase_date is invalid');
  if (!condition.ok) errors.push('condition is invalid');
  if (!finish.ok) errors.push('finish is invalid');
  if (!material.ok) errors.push('material is invalid');

  const generatedName = [row.maker, row.line, row.series, row.shape].filter(Boolean).join(' ').trim();
  if (!generatedName) errors.push('Could not derive pipe name (maker and shape are required)');

  const importedMetadata = toNoteLines({
    line: row.line,
    series: row.series,
    shape_code: row.shape_code,
    purchase_source: row.purchase_source,
    quantity: row.quantity,
    tags: row.tags,
    wishlist: row.wishlist,
    shopping_list: row.shopping_list,
    restock: row.restock,
  });

  const payload = {
    name: generatedName,
    maker: row.maker || undefined,
    country_of_origin: row.country_of_origin || undefined,
    shape: row.shape || undefined,
    finish: finish.value,
    bowl_material: material.value,
    condition: condition.value,
    purchase_date: purchaseDate.value,
    purchase_price: purchasePrice.value,
    estimated_value: estimatedValue.value,
    is_favorite: favorite.value,
    notes: [row.notes, importedMetadata ? `Imported metadata: ${importedMetadata}` : ''].filter(Boolean).join('\n'),
  };

  const warnings = [];
  if (!row.notes) warnings.push('notes not provided');
  if (row.material && !material.value) warnings.push('material was not recognized');
  if (row.finish && !finish.value) warnings.push('finish was not recognized');
  if (extras?.unsupportedColumns?.length) warnings.push(`Unsupported columns ignored: ${extras.unsupportedColumns.join(', ')}`);

  return { payload, errors, warnings };
}

function coerceBlendPayload(row, extras) {
  const purchasePrice = parseNumber(row.purchase_price);
  const rating = parseRating(row.rating);
  const favorite = parseBoolean(row.favorite);
  const purchaseDate = parseDate(row.purchase_date);
  const cellarDate = parseDate(row.cellar_date || row.age_start_date);
  const quantity = parseNumber(row.quantity);
  const gramsRemaining = parseNumber(row.grams_remaining);
  const tinsRemaining = parseInteger(row.tins_remaining);
  const jarsRemaining = parseInteger(row.jars_remaining);
  const blendType = parseEnum(row.blend_type, BLEND_TYPES);
  const cut = parseEnum(row.cut, TOBACCO_CUTS);
  const productionStatus = parseEnum(row.production_status, TOBACCO_PRODUCTION);
  const packageType = compactString(row.package_type);
  const packageSize = parseNumber(row.package_size);

  const errors = [];
  if (!purchasePrice.ok) errors.push('purchase_price is invalid');
  if (!rating.ok) errors.push('rating is invalid');
  if (!favorite.ok) errors.push('favorite is invalid');
  if (!purchaseDate.ok) errors.push('purchase_date is invalid');
  if (!cellarDate.ok) errors.push('cellar_date is invalid');
  if (!quantity.ok) errors.push('quantity is invalid');
  if (!gramsRemaining.ok) errors.push('grams_remaining is invalid');
  if (!tinsRemaining.ok) errors.push('tins_remaining is invalid');
  if (!jarsRemaining.ok) errors.push('jars_remaining is invalid');
  if (!blendType.ok) errors.push('blend_type is invalid');
  if (!cut.ok) errors.push('cut is invalid');
  if (!productionStatus.ok) errors.push('production_status is invalid');
  if (!packageSize.ok) errors.push('package_size is invalid');

  const gramsAsOz = gramsRemaining.value ? gramsRemaining.value / GRAMS_PER_OUNCE : undefined;
  const inferredTinSize = packageType === 'tin' ? packageSize.value : undefined;
  const inferredPouchSize = packageType === 'pouch' ? packageSize.value : undefined;
  const inferredTinCount = tinsRemaining.value ?? (packageType === 'tin' ? quantity.value : undefined);
  const inferredPouchCount = packageType === 'pouch' ? quantity.value : undefined;
  const inferredBulkOz = packageType === 'bulk' ? quantity.value : gramsAsOz;
  const inferredCellarDate = cellarDate.value;

  const importedMetadata = toNoteLines({
    brand: row.brand,
    package_type: row.package_type,
    purchase_source: row.purchase_source,
    wishlist: row.wishlist,
    shopping_list: row.shopping_list,
    restock: row.restock,
    tags: row.tags,
    estimated_value: row.estimated_value,
  });

  const payload = {
    name: row.blend_name || row.name || undefined,
    manufacturer: row.manufacturer || undefined,
    blend_type: blendType.value,
    tobacco_components: parseStringList(row.components),
    cut: cut.value,
    production_status: productionStatus.value,
    tin_size_oz: inferredTinSize,
    tin_total_tins: inferredTinCount,
    tin_tins_open: undefined,
    tin_tins_cellared: inferredTinCount,
    tin_cellared_date: inferredCellarDate,
    pouch_size_oz: inferredPouchSize,
    pouch_total_pouches: inferredPouchCount,
    pouch_pouches_open: undefined,
    pouch_pouches_cellared: inferredPouchCount,
    pouch_cellared_date: inferredCellarDate,
    bulk_total_quantity_oz: inferredBulkOz,
    bulk_open: undefined,
    bulk_cellared: inferredBulkOz,
    bulk_cellared_date: inferredCellarDate,
    purchase_date: purchaseDate.value,
    purchase_price: purchasePrice.value,
    rating: rating.value,
    is_favorite: favorite.value,
    notes: [row.notes, importedMetadata ? `Imported metadata: ${importedMetadata}` : ''].filter(Boolean).join('\n'),
  };

  const warnings = [];
  if (!row.package_type) warnings.push('package_type not provided');
  if (!row.components) warnings.push('components not provided');
  if (extras?.unsupportedColumns?.length) warnings.push(`Unsupported columns ignored: ${extras.unsupportedColumns.join(', ')}`);

  return { payload, errors, warnings };
}

function coerceBottlePayload(row, extras) {
  const purchasePrice = parseNumber(row.purchase_price);
  const estimatedValue = parseNumber(row.estimated_value);
  const bottleCount = parseInteger(row.bottle_count);
  const rating = parseRating(row.rating);
  const favorite = parseBoolean(row.favorite);
  const acquisitionDate = parseDate(row.acquisition_date);
  const abv = parseNumber(row.abv);
  const proof = parseNumber(row.proof);
  const whiskeyType = parseEnum(row.type, WHISKEY_TYPES);
  const bottleSize = parseEnum(row.bottle_size, WHISKEY_BOTTLE_SIZES);
  const ageStatement = parseInteger(row.age_statement);

  const errors = [];
  if (!purchasePrice.ok) errors.push('purchase_price is invalid');
  if (!estimatedValue.ok) errors.push('estimated_value is invalid');
  if (!bottleCount.ok) errors.push('bottle_count is invalid');
  if (!rating.ok) errors.push('rating is invalid');
  if (!favorite.ok) errors.push('favorite is invalid');
  if (!acquisitionDate.ok) errors.push('acquisition_date is invalid');
  if (!abv.ok) errors.push('abv is invalid');
  if (!proof.ok) errors.push('proof is invalid');
  if (!whiskeyType.ok) errors.push('type is invalid');
  if (!bottleSize.ok) errors.push('bottle_size is invalid');
  if (!ageStatement.ok) errors.push('age_statement is invalid');

  // Proof conversion assumes U.S. proof scale (proof = 2 * ABV).
  const computedAbv = abv.value ?? (proof.value ? proof.value / PROOF_TO_ABV_DIVISOR : undefined);
  const importedMetadata = toNoteLines({
    style: row.style,
    open_status: row.open_status,
    wishlist: row.wishlist,
    shopping_list: row.shopping_list,
    restock: row.restock,
    tags: row.tags,
  });

  const payload = {
    name: row.expression || undefined,
    distillery: row.distillery || row.brand || undefined,
    country: row.country || undefined,
    region: row.region || undefined,
    type: whiskeyType.value || undefined,
    age: ageStatement.value,
    abv: computedAbv,
    bottle_size: bottleSize.value || undefined,
    purchase_date: acquisitionDate.value,
    purchase_price: purchasePrice.value,
    purchase_location: row.purchase_source || undefined,
    bottle_count: bottleCount.value ?? 1,
    favorite: favorite.value,
    collector_value: estimatedValue.value,
    rating: rating.value,
    notes: [row.notes, importedMetadata ? `Imported metadata: ${importedMetadata}` : ''].filter(Boolean).join('\n'),
  };

  const warnings = [];
  if (!row.distillery) warnings.push('distillery not provided (brand used)');
  if (!row.open_status) warnings.push('open_status not provided');
  if (extras?.unsupportedColumns?.length) warnings.push(`Unsupported columns ignored: ${extras.unsupportedColumns.join(', ')}`);

  return { payload, errors, warnings };
}

function coerceCigarPayload(row, extras) {
  const purchasePrice = parseNumber(row.purchase_price);
  const estimatedValue = parseNumber(row.estimated_value);
  const cigarsPerPackage = parseInteger(row.cigars_per_package);
  const initialQuantity = parseInteger(row.initial_quantity);
  const currentQuantity = parseInteger(row.current_quantity);
  const rating = parseRating(row.rating);
  const favorite = parseBoolean(row.favorite);
  const wishlist = parseBoolean(row.wishlist);
  const shoppingList = parseBoolean(row.shopping_list);
  const restock = parseBoolean(row.restock);
  const notForMe = parseBoolean(row.not_for_me);
  const purchaseDate = parseDate(row.purchase_date);
  const body = parseEnum((row.body || '').replace('-', '_').toLowerCase(), CIGAR_BODY);
  const strength = parseEnum((row.strength || '').replace('-', '_').toLowerCase(), CIGAR_BODY);
  const productionStatus = parseEnum((row.production_status || '').replace(/ /g, '_').toLowerCase(), CIGAR_PRODUCTION);

  const errors = [];
  if (!row.line && !row.vitola) errors.push('line or vitola is required');
  if (!purchasePrice.ok) errors.push('purchase_price is invalid');
  if (!estimatedValue.ok) errors.push('estimated_value is invalid');
  if (!cigarsPerPackage.ok) errors.push('cigars_per_package is invalid');
  if (!initialQuantity.ok) errors.push('initial_quantity is invalid');
  if (!currentQuantity.ok) errors.push('current_quantity is invalid');
  if (!rating.ok) errors.push('rating is invalid');
  if (!favorite.ok) errors.push('favorite is invalid');
  if (!wishlist.ok) errors.push('wishlist is invalid');
  if (!shoppingList.ok) errors.push('shopping_list is invalid');
  if (!restock.ok) errors.push('restock is invalid');
  if (!notForMe.ok) errors.push('not_for_me is invalid');
  if (!purchaseDate.ok) errors.push('purchase_date is invalid');
  if (!body.ok) errors.push('body is invalid');
  if (!strength.ok) errors.push('strength is invalid');
  if (!productionStatus.ok) errors.push('production_status is invalid');

  const packageTypeRaw = compactString(row.package_type);
  const unitTypeMap = {
    single: 'single',
    singles: 'single',
    '5pack': '5pack',
    '5_pack': '5pack',
    pack: 'pack',
    box: 'box',
    bundle: 'bundle',
    partial_box: 'partial_box',
    partial_pack: 'partial_pack',
  };

  const unitType = unitTypeMap[packageTypeRaw] || undefined;
  const quantity = currentQuantity.value ?? initialQuantity.value;
  const packageCount = quantity;
  const singularCount = unitType && ['partial_box', 'partial_pack'].includes(unitType)
    ? quantity
    : (Number(packageCount || 0) * Number(cigarsPerPackage.value || 0)) || undefined;

  const importedMetadata = toNoteLines({
    humidor_name: row.humidor_name,
    tags: row.tags,
    flavor_notes: row.flavor_notes,
    purchase_source: row.purchase_source,
  });

  const payload = {
    name: [row.line, row.vitola].filter(Boolean).join(' ') || row.brand,
    brand: row.brand || undefined,
    line: row.line || undefined,
    vitola: row.vitola || undefined,
    wrapper: row.wrapper || undefined,
    binder: row.binder || undefined,
    filler: row.filler || undefined,
    country_of_origin: row.country_of_origin || undefined,
    body: body.value,
    strength: strength.value,
    unit_type: unitType,
    cigars_per_package: cigarsPerPackage.value,
    quantity: packageCount,
    singles_equivalent: singularCount,
    purchase_date: purchaseDate.value,
    purchase_price: purchasePrice.value,
    purchase_source: row.purchase_source || undefined,
    estimated_unit_value: estimatedValue.value,
    rating: rating.value,
    production_status: productionStatus.value,
    is_favorite: favorite.value,
    wishlist: wishlist.value,
    shopping_list: shoppingList.value,
    restock_flag: restock.value,
    not_for_me: notForMe.value,
    flavor_notes: parseStringList(row.flavor_notes),
    aliases: parseStringList(row.tags),
    personal_notes: [row.notes, importedMetadata ? `Imported metadata: ${importedMetadata}` : ''].filter(Boolean).join('\n'),
  };

  const warnings = [];
  if (!unitType) warnings.push('package_type not recognized');
  if (!row.humidor_name) warnings.push('humidor_name not provided');
  if (extras?.unsupportedColumns?.length) warnings.push(`Unsupported columns ignored: ${extras.unsupportedColumns.join(', ')}`);

  return { payload, errors, warnings, humidorName: row.humidor_name };
}

function duplicateKeyPipe(payload) {
  return compactString([payload.maker, payload.name, payload.shape, payload.finish, payload.purchase_date].join('|'));
}

function duplicateKeyBlend(payload) {
  return compactString([payload.manufacturer, payload.name, payload.tin_size_oz ? 'tin' : payload.pouch_size_oz ? 'pouch' : 'bulk', payload.purchase_date].join('|'));
}

function duplicateKeyBottle(payload) {
  return compactString([payload.distillery, payload.name, payload.bottle_size, payload.purchase_date].join('|'));
}

function duplicateKeyCigar(payload) {
  return compactString([payload.brand, payload.line, payload.vitola, payload.purchase_date, payload.unit_type].join('|'));
}

/**
 * Import definition schema:
 * - id/module/label/template metadata for UI/template downloads
 * - entity for cache invalidation routing
 * - allowed/required/optional column contracts
 * - parser + duplicate key + persistence functions
 */
const IMPORT_DEFINITIONS = [
  {
    id: 'pipekeeper_pipes',
    moduleLabel: 'PipeKeeper',
    label: 'Pipes',
    templateFile: 'PipeKeeper_Pipes_Template.csv',
    entity: 'Pipe',
    allowedColumns: [
      'maker', 'line', 'series', 'shape', 'shape_code', 'finish', 'material', 'country_of_origin',
      'purchase_date', 'purchase_price', 'purchase_source', 'condition', 'quantity', 'notes', 'tags',
      'estimated_value', 'favorite', 'wishlist', 'shopping_list', 'restock',
    ],
    aliases: {
      vendor: 'purchase_source',
      qty: 'quantity',
      origin_country: 'country_of_origin',
      shape_number: 'shape_code',
    },
    requiredColumns: ['maker', 'shape'],
    optionalColumns: ['finish', 'material', 'country_of_origin', 'purchase_date', 'purchase_price', 'notes'],
    example: {
      maker: 'Peterson',
      line: 'System Standard',
      series: '314',
      shape: 'Billiard',
      shape_code: '314',
      finish: 'Smooth',
      material: 'Briar',
      country_of_origin: 'Ireland',
      purchase_date: '2025-01-15',
      purchase_price: '120',
      purchase_source: 'Local tobacconist',
      condition: 'Excellent',
      quantity: '1',
      notes: 'Dedicated Virginia pipe',
      tags: 'virginia,favorite',
      estimated_value: '150',
      favorite: 'yes',
      wishlist: 'no',
      shopping_list: 'no',
      restock: 'no',
    },
    parseRow: coercePipePayload,
    create: (payload) => scopedEntities.Pipe.create(payload),
    listForUser: (userEmail) => base44.entities.Pipe.filter({ created_by: userEmail }, '-created_date', 1000).catch(() => []),
    duplicateKey: duplicateKeyPipe,
  },
  {
    id: 'pipekeeper_blends',
    moduleLabel: 'PipeKeeper',
    label: 'Blends / Tobacco Cellar',
    templateFile: 'PipeKeeper_Blends_Template.csv',
    entity: 'TobaccoBlend',
    allowedColumns: [
      'manufacturer', 'brand', 'blend_name', 'blend_type', 'components', 'cut', 'production_status',
      'package_type', 'package_size', 'quantity', 'grams_remaining', 'tins_remaining', 'jars_remaining',
      'purchase_date', 'purchase_price', 'purchase_source', 'cellar_date', 'age_start_date', 'rating',
      'favorite', 'wishlist', 'shopping_list', 'restock', 'notes', 'tags', 'estimated_value',
    ],
    aliases: { vendor: 'purchase_source', qty: 'quantity', name: 'blend_name', blender: 'manufacturer' },
    requiredColumns: ['manufacturer', 'blend_name'],
    optionalColumns: ['blend_type', 'components', 'cut', 'package_type', 'quantity', 'notes'],
    example: {
      manufacturer: 'Cornell & Diehl',
      brand: 'Cellar Series',
      blend_name: 'Autumn Evening',
      blend_type: 'Aromatic',
      components: 'Virginia,Cavendish',
      cut: 'Ribbon',
      production_status: 'Current Production',
      package_type: 'tin',
      package_size: '1.75',
      quantity: '4',
      grams_remaining: '0',
      tins_remaining: '4',
      jars_remaining: '0',
      purchase_date: '2025-02-10',
      purchase_price: '14.99',
      purchase_source: 'Smokingpipes',
      cellar_date: '2025-02-10',
      age_start_date: '2025-02-10',
      rating: '4.5',
      favorite: 'yes',
      wishlist: 'no',
      shopping_list: 'no',
      restock: 'yes',
      notes: 'Great dessert smoke',
      tags: 'vanilla,cellar',
      estimated_value: '55',
    },
    parseRow: coerceBlendPayload,
    create: (payload) => scopedEntities.TobaccoBlend.create(payload),
    listForUser: (userEmail) => base44.entities.TobaccoBlend.filter({ created_by: userEmail }, '-created_date', 1000).catch(() => []),
    duplicateKey: duplicateKeyBlend,
  },
  {
    id: 'whiskeykeeper_bottles',
    moduleLabel: 'WhiskeyKeeper',
    label: 'Bottles',
    templateFile: 'WhiskeyKeeper_Bottles_Template.csv',
    entity: 'Bottle',
    allowedColumns: [
      'brand', 'expression', 'distillery', 'country', 'region', 'type', 'style', 'age_statement', 'proof', 'abv',
      'bottle_size', 'acquisition_date', 'purchase_price', 'purchase_source', 'bottle_count', 'open_status',
      'rating', 'notes', 'tags', 'estimated_value', 'favorite', 'wishlist', 'shopping_list', 'restock',
    ],
    aliases: { vendor: 'purchase_source', qty: 'bottle_count', name: 'expression', purchase_date: 'acquisition_date' },
    requiredColumns: ['brand', 'expression'],
    optionalColumns: ['distillery', 'country', 'region', 'type', 'abv', 'bottle_size', 'notes'],
    example: {
      brand: 'Lagavulin',
      expression: '16 Year',
      distillery: 'Lagavulin',
      country: 'Scotland',
      region: 'Islay',
      type: 'Single Malt',
      style: 'Peated',
      age_statement: '16',
      proof: '86',
      abv: '43',
      bottle_size: '750ml',
      acquisition_date: '2025-03-01',
      purchase_price: '109.99',
      purchase_source: 'Retail store',
      bottle_count: '1',
      open_status: 'open',
      rating: '4.7',
      notes: 'Classic smoky dram',
      tags: 'islay,peat',
      estimated_value: '135',
      favorite: 'yes',
      wishlist: 'no',
      shopping_list: 'no',
      restock: 'yes',
    },
    parseRow: coerceBottlePayload,
    create: (payload) => base44.entities.Bottle.create(payload),
    listForUser: (userEmail) => base44.entities.Bottle.filter({ created_by: userEmail }, '-created_date', 1000).catch(() => []),
    duplicateKey: duplicateKeyBottle,
  },
  {
    id: 'cigarkeeper_cigars',
    moduleLabel: 'CigarKeeper',
    label: 'Cigars',
    templateFile: 'CigarKeeper_Cigars_Template.csv',
    entity: 'Cigar',
    allowedColumns: [
      'brand', 'line', 'vitola', 'wrapper', 'binder', 'filler', 'country_of_origin', 'body', 'strength',
      'package_type', 'cigars_per_package', 'initial_quantity', 'current_quantity', 'purchase_date', 'purchase_price',
      'purchase_source', 'humidor_name', 'flavor_notes', 'rating', 'production_status', 'favorite', 'wishlist',
      'shopping_list', 'restock', 'not_for_me', 'notes', 'tags', 'estimated_value',
    ],
    aliases: {
      vendor: 'purchase_source',
      qty: 'current_quantity',
      quantity: 'current_quantity',
      origin_country: 'country_of_origin',
      unit_type: 'package_type',
    },
    requiredColumns: ['brand'],
    optionalColumns: ['vitola', 'wrapper', 'body', 'strength', 'package_type', 'purchase_date', 'notes'],
    example: {
      brand: 'Oliva',
      line: 'Serie V',
      vitola: 'Robusto',
      wrapper: 'Sun Grown',
      binder: 'Nicaraguan',
      filler: 'Nicaraguan',
      country_of_origin: 'Nicaragua',
      body: 'medium_full',
      strength: 'medium_full',
      package_type: 'box',
      cigars_per_package: '20',
      initial_quantity: '1',
      current_quantity: '1',
      purchase_date: '2025-02-20',
      purchase_price: '145',
      purchase_source: 'Cigar lounge',
      humidor_name: 'Main Humidor',
      flavor_notes: 'pepper,cocoa,cedar',
      rating: '4.6',
      production_status: 'regular_production',
      favorite: 'yes',
      wishlist: 'no',
      shopping_list: 'no',
      restock: 'yes',
      not_for_me: 'no',
      notes: 'Excellent evening smoke',
      tags: 'full-bodied,nicaragua',
      estimated_value: '11.5',
    },
    parseRow: coerceCigarPayload,
    create: (payload) => base44.entities.Cigar.create(payload),
    listForUser: (userEmail) => base44.entities.Cigar.filter({ created_by: userEmail }, '-created_date', 1000).catch(() => []),
    duplicateKey: duplicateKeyCigar,
  },
];

export const importDefinitions = IMPORT_DEFINITIONS.reduce((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {});

export const importDefinitionList = IMPORT_DEFINITIONS;

function mapRowToCanonical(headers, values, definition) {
  const row = {};
  headers.forEach((header, idx) => {
    const rawValue = values[idx];
    if (!header || rawValue === undefined || rawValue === null || rawValue === '') return;
    const maybeAlias = definition.aliases[header] || header;
    const canonical = mapKey(maybeAlias);
    row[canonical] = rawValue;
  });
  return row;
}

export async function analyzeImportRows({
  definition,
  headers,
  rawHeaders,
  rows,
  duplicateHeaders = [],
  parseErrors = [],
  userEmail,
}) {
  const allowed = new Set(definition.allowedColumns);
  const headerPairs = headers.map((header, idx) => ({ header, rawHeader: rawHeaders[idx] || header }));
  const unknownColumns = headerPairs
    .filter(({ header }) => header && !allowed.has(definition.aliases[header] || header))
    .map(({ rawHeader }) => rawHeader);

  const blockingHeaderErrors = [
    ...parseErrors,
    ...(duplicateHeaders.length ? [`Duplicate columns found: ${duplicateHeaders.join(', ')}`] : []),
  ];

  const existingRows = await definition.listForUser(userEmail);
  const existingDuplicateKeys = new Set(
    (Array.isArray(existingRows) ? existingRows : [])
      .map((existing) => definition.duplicateKey(existing))
      .filter(Boolean)
  );

  const humidorMap = {};
  if (definition.id === 'cigarkeeper_cigars') {
    const humidors = await base44.entities.HumidorLocation.filter({ created_by: userEmail }).catch(() => []);
    humidors.forEach((humidor) => {
      if (!humidor?.name) return;
      humidorMap[compactString(humidor.name)] = humidor.id;
    });
  }

  const seenBatchKeys = new Map();
  const analyzedRows = rows.map(({ rowNumber, values }) => {
    const canonicalRow = mapRowToCanonical(headers, values, definition);
    const unsupportedColumns = Object.keys(canonicalRow)
      .filter((key) => !allowed.has(key))
      .sort();

    const { payload, errors, warnings, humidorName } = definition.parseRow(canonicalRow, { unsupportedColumns });

    if (definition.id === 'cigarkeeper_cigars' && humidorName) {
      const humidorId = humidorMap[compactString(humidorName)];
      if (humidorId) {
        payload.humidor_id = humidorId;
      } else {
        warnings.push(`humidor_name "${humidorName}" not found; cigar will import unassigned`);
      }
    }

    const missingRequired = definition.requiredColumns
      .filter((field) => !canonicalRow[field] || String(canonicalRow[field]).trim() === '');
    if (missingRequired.length) errors.push(`Missing required fields: ${missingRequired.join(', ')}`);

    const missingOptional = definition.optionalColumns
      .filter((field) => !canonicalRow[field] || String(canonicalRow[field]).trim() === '');
    const missingOptionalThreshold = Math.ceil(definition.optionalColumns.length * OPTIONAL_MISSING_WARNING_THRESHOLD);
    if (missingOptional.length >= missingOptionalThreshold) {
      warnings.push('Several optional fields are missing');
    }

    const dupeKey = definition.duplicateKey(payload);
    let duplicateState = 'none';
    if (dupeKey) {
      if (existingDuplicateKeys.has(dupeKey)) duplicateState = 'existing';
      if (seenBatchKeys.has(dupeKey)) duplicateState = 'batch';
      seenBatchKeys.set(dupeKey, rowNumber);
    }

    if (duplicateState !== 'none') {
      warnings.push(duplicateState === 'existing' ? 'Possible duplicate of existing record' : 'Possible duplicate in uploaded file');
    }

    const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';

    return {
      rowNumber,
      status,
      errors,
      warnings,
      canonicalRow,
      payload: {
        ...payload,
        created_by: userEmail,
      },
      duplicateState,
      duplicateKey: dupeKey,
      previewName: payload.name || payload.blend_name || payload.expression || payload.brand || 'Imported item',
    };
  });

  const counts = analyzedRows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { valid: 0, warning: 0, error: 0 }
  );

  return {
    definitionId: definition.id,
    unknownColumns,
    blockingHeaderErrors,
    rows: analyzedRows,
    counts,
    totalRows: analyzedRows.length,
  };
}

export async function executeImportRows({
  definition,
  analyzedRows,
  duplicateMode = 'create_only',
}) {
  const result = {
    processed: analyzedRows.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const row of analyzedRows) {
    if (row.status === 'error') {
      result.skipped += 1;
      result.details.push(`Row ${row.rowNumber}: blocked by validation errors`);
      continue;
    }

    if (duplicateMode === 'skip_duplicates' && row.duplicateState !== 'none') {
      result.skipped += 1;
      result.details.push(`Row ${row.rowNumber}: skipped duplicate (${row.previewName})`);
      continue;
    }

    try {
      const payload = definition.id === 'cigarkeeper_cigars'
        ? normalizeCigarPayload(row.payload, { isCreate: true })
        : row.payload;
      await definition.create(payload);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.details.push(`Row ${row.rowNumber}: failed to import (${error?.message || 'unknown error'})`);
    }
  }

  return result;
}
