/**
 * Field selectors and sanitization for different module types.
 * Ensures only approved fields are exposed in public shares.
 */

function resolveSharedBy(userProfile = {}) {
  return userProfile?.is_public && userProfile?.display_name
    ? userProfile.display_name
    : 'A Collector';
}

export function buildPublicPipeShareView(pipe, shareConfig = {}, userProfile = {}) {
  const view = {
    id: pipe.id,
    name: pipe.name,
    maker: pipe.maker,
    shape: pipe.shape,
    bend: pipe.bend,
    country_of_origin: pipe.country_of_origin,
    year_made: pipe.year_made,
    bowl_material: pipe.bowl_material,
    stem_material: pipe.stem_material,
    finish: pipe.finish,
    filter_type: pipe.filter_type,
    sizeClass: pipe.sizeClass,
    length_mm: pipe.length_mm,
    weight_grams: pipe.weight_grams,
    condition: pipe.condition,
    shared_by: resolveSharedBy(userProfile),
  };

  if (shareConfig.include_photos && Array.isArray(pipe.photos) && pipe.photos.length > 0) {
    view.photos = pipe.photos;
  }
  if (shareConfig.include_notes && pipe.notes) {
    view.notes = pipe.notes.substring(0, 300);
  }
  if (shareConfig.include_value && pipe.estimated_value) {
    view.estimated_value = pipe.estimated_value;
  }

  return view;
}

export function buildPublicTobaccoShareView(tobacco, shareConfig = {}, userProfile = {}) {
  const view = {
    id: tobacco.id,
    name: tobacco.name,
    manufacturer: tobacco.manufacturer,
    blend_type: tobacco.blend_type,
    cut: tobacco.cut,
    strength: tobacco.strength,
    room_note: tobacco.room_note,
    tobacco_components: tobacco.tobacco_components,
    production_status: tobacco.production_status,
    aging_potential: tobacco.aging_potential,
    shared_by: resolveSharedBy(userProfile),
  };

  if (shareConfig.include_photos && tobacco.photo) {
    view.photo = tobacco.photo;
  }
  if (tobacco.logo) {
    view.logo = tobacco.logo;
  }
  if (shareConfig.include_notes && tobacco.notes) {
    view.notes = tobacco.notes.substring(0, 300);
  }
  if (shareConfig.include_notes && Array.isArray(tobacco.flavor_notes) && tobacco.flavor_notes.length > 0) {
    view.flavor_notes = tobacco.flavor_notes.slice(0, 3);
  }
  if (shareConfig.include_value && tobacco.manual_market_value) {
    view.estimated_value = tobacco.manual_market_value;
  } else if (shareConfig.include_value && tobacco.ai_estimated_value) {
    view.estimated_value = tobacco.ai_estimated_value;
  }
  if (shareConfig.include_inventory) {
    view.total_quantity_oz = (
      (tobacco.tin_total_quantity_oz || 0) +
      (tobacco.bulk_total_quantity_oz || 0) +
      (tobacco.pouch_total_quantity_oz || 0)
    );
  }

  return view;
}

export function buildPublicWhiskeyShareView(bottle, shareConfig = {}, userProfile = {}) {
  const view = {
    id: bottle.id,
    name: bottle.name,
    distillery: bottle.distillery,
    type: bottle.type,
    region: bottle.region,
    country: bottle.country,
    age: bottle.age,
    abv: bottle.abv,
    vintage: bottle.vintage,
    rating: bottle.rating,
    shared_by: resolveSharedBy(userProfile),
  };

  if (shareConfig.include_photos) {
    view.photo = bottle.photo || bottle.image || bottle.image_url || (Array.isArray(bottle.photos) ? bottle.photos[0] : undefined);
  }
  if (shareConfig.include_notes && bottle.notes) {
    view.notes = bottle.notes.substring(0, 300);
  }
  if (shareConfig.include_value) {
    view.estimated_value = bottle.collector_value || bottle.aftermarket_price || bottle.retail_price || bottle.purchase_price || null;
  }

  return view;
}

export function buildPublicWineShareView(wine, shareConfig = {}, userProfile = {}) {
  const view = {
    id: wine.id,
    name: wine.name,
    producer: wine.producer,
    style: wine.style,
    region: wine.region,
    appellation: wine.appellation,
    country: wine.country || wine.country_of_origin,
    varietal: wine.varietal,
    vintage: wine.vintage,
    rating: wine.rating,
    quantity: wine.quantity,
    shared_by: resolveSharedBy(userProfile),
  };

  if (shareConfig.include_photos) {
    view.photo = wine.photo || wine.image || wine.image_url || (Array.isArray(wine.photos) ? wine.photos[0] : undefined);
  }
  if (shareConfig.include_notes && wine.notes) {
    view.notes = wine.notes.substring(0, 300);
  }
  if (shareConfig.include_value) {
    view.estimated_value =
      wine.manual_estimated_value ||
      wine.market_estimated_total_value ||
      wine.market_replacement_cost_estimate ||
      wine.purchase_price ||
      null;
  }

  return view;
}

export function buildPublicCigarShareView(cigar, shareConfig = {}, userProfile = {}) {
  const view = {
    id: cigar.id,
    name: cigar.name,
    brand: cigar.brand,
    line: cigar.line,
    vitola: cigar.vitola,
    wrapper: cigar.wrapper,
    country_of_origin: cigar.country_of_origin,
    rating: cigar.rating,
    quantity: cigar.singles_equivalent || cigar.quantity,
    shared_by: resolveSharedBy(userProfile),
  };

  if (shareConfig.include_photos) {
    view.photo = cigar.photo || cigar.image || cigar.image_url || (Array.isArray(cigar.photos) ? cigar.photos[0] : undefined);
  }
  if (shareConfig.include_notes && cigar.notes) {
    view.notes = cigar.notes.substring(0, 300);
  }
  if (shareConfig.include_value) {
    view.estimated_value =
      cigar.market_estimated_total_value ||
      cigar.estimated_total_value ||
      cigar.market_replacement_cost_estimate ||
      null;
  }

  return view;
}

export function getDefaultShareConfig(moduleType) {
  return {
    include_photos: true,
    include_notes: false,
    include_value: false,
    include_inventory: moduleType === 'tobacco',
  };
}

export function validateShareConfig(shareConfig, userProfile = {}, privacySettings = {}) {
  const validated = { ...shareConfig };

  if (userProfile?.privacy_hide_values || privacySettings?.hideValues) {
    validated.include_value = false;
  }

  if (userProfile?.privacy_hide_inventory || privacySettings?.hideInventory) {
    validated.include_inventory = false;
  }

  return validated;
}
