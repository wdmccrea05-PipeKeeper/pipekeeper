/**
 * Field selectors and sanitization for different module types
 * Ensures only approved fields are exposed in public shares
 */

/**
 * Build a sanitized public view for a pipe record
 */
export function buildPublicPipeShareView(pipe, shareConfig, userProfile = {}) {
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
    condition: pipe.condition
  };

  // Conditionally include photos
  if (shareConfig.include_photos && pipe.photos && pipe.photos.length > 0) {
    view.photos = pipe.photos;
  }

  // Conditionally include notes (safe excerpt only, not full notes)
  if (shareConfig.include_notes && pipe.notes) {
    view.notes = pipe.notes.substring(0, 300);
  }

  // Conditionally include estimated value
  if (shareConfig.include_value && pipe.estimated_value) {
    view.estimated_value = pipe.estimated_value;
  }

  // Include optional public owner name if profile is public
  if (userProfile?.is_public && userProfile?.display_name) {
    view.shared_by = userProfile.display_name;
  } else {
    view.shared_by = 'A Collector';
  }

  return view;
}

/**
 * Build a sanitized public view for a tobacco record
 */
export function buildPublicTobaccoShareView(tobacco, shareConfig, userProfile = {}) {
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
    aging_potential: tobacco.aging_potential
  };

  // Conditionally include photos
  if (shareConfig.include_photos && tobacco.photo) {
    view.photo = tobacco.photo;
  }

  // Include logo if available
  if (tobacco.logo) {
    view.logo = tobacco.logo;
  }

  // Conditionally include notes (safe excerpt only)
  if (shareConfig.include_notes && tobacco.notes) {
    view.notes = tobacco.notes.substring(0, 300);
  }

  // Conditionally include flavor notes excerpt
  if (shareConfig.include_notes && tobacco.flavor_notes && tobacco.flavor_notes.length > 0) {
    view.flavor_notes = tobacco.flavor_notes.slice(0, 3);
  }

  // Conditionally include estimated value
  if (shareConfig.include_value && tobacco.manual_market_value) {
    view.estimated_value = tobacco.manual_market_value;
  } else if (shareConfig.include_value && tobacco.ai_estimated_value) {
    view.estimated_value = tobacco.ai_estimated_value;
  }

  // Conditionally include inventory (tobacco specific)
  if (shareConfig.include_inventory) {
    view.total_quantity_oz = (
      (tobacco.tin_total_quantity_oz || 0) +
      (tobacco.bulk_total_quantity_oz || 0) +
      (tobacco.pouch_total_quantity_oz || 0)
    );
  }

  // Include optional public owner name if profile is public
  if (userProfile?.is_public && userProfile?.display_name) {
    view.shared_by = userProfile.display_name;
  } else {
    view.shared_by = 'A Collector';
  }

  return view;
}

/**
 * Get default share config for a module type
 */
export function getDefaultShareConfig(moduleType) {
  return {
    include_photos: true,
    include_notes: false,
    include_value: false,
    include_inventory: moduleType === 'tobacco' ? false : false
  };
}

/**
 * Validate share config against user privacy settings
 * User's existing privacy settings override share defaults
 */
export function validateShareConfig(shareConfig, userProfile = {}, privacySettings = {}) {
  const validated = { ...shareConfig };

  // If user has hidden values globally, don't allow sharing value even if toggled
  if (userProfile?.privacy_hide_values) {
    validated.include_value = false;
  }

  // If user has hidden inventory globally, don't allow sharing inventory
  if (userProfile?.privacy_hide_inventory) {
    validated.include_inventory = false;
  }

  return validated;
}