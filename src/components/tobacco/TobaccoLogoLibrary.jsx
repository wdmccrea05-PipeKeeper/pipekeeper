// Tobacco brand logo library - using placehold.co (more reliable than via.placeholder)
const TOBACCO_LOGOS = {
  'Peterson': 'https://placehold.co/400x200/8B4513/FFFFFF?text=Peterson',
  'Dunhill': 'https://placehold.co/400x200/1a1a1a/FFFFFF?text=Dunhill',
  'Cornell & Diehl': 'https://placehold.co/400x200/2c5f2d/FFFFFF?text=Cornell+%26+Diehl',
  'Samuel Gawith': 'https://placehold.co/400x200/8B0000/FFFFFF?text=Samuel+Gawith',
  'Gawith Hoggarth': 'https://placehold.co/400x200/654321/FFFFFF?text=Gawith+Hoggarth',
  'G.L. Pease': 'https://placehold.co/400x200/4B0082/FFFFFF?text=G.L.+Pease',
  'McClelland': 'https://placehold.co/400x200/800020/FFFFFF?text=McClelland',
  'Rattray': 'https://placehold.co/400x200/C19A6B/FFFFFF?text=Rattray',
  'Orlik': 'https://placehold.co/400x200/DAA520/FFFFFF?text=Orlik',
  'Stanwell': 'https://placehold.co/400x200/2F4F4F/FFFFFF?text=Stanwell',
  'Sutliff': 'https://placehold.co/400x200/8B4513/FFFFFF?text=Sutliff',
  'Mac Baren': 'https://placehold.co/400x200/DC143C/FFFFFF?text=Mac+Baren',
  'Captain Black': 'https://placehold.co/400x200/000080/FFFFFF?text=Captain+Black',
  'Lane Limited': 'https://placehold.co/400x200/556B2F/FFFFFF?text=Lane+Limited',
  'Escudo': 'https://placehold.co/400x200/8B4513/FFFFFF?text=Escudo',
  'Davidoff': 'https://placehold.co/400x200/1a1a1a/FFD700?text=Davidoff',
  'Balkan Sobranie': 'https://placehold.co/400x200/191970/FFFFFF?text=Balkan+Sobranie',
  'Frog Morton': 'https://placehold.co/400x200/228B22/FFFFFF?text=Frog+Morton',
  'Germain': 'https://placehold.co/400x200/8B0000/FFFFFF?text=Germain',
  'Seattle Pipe Club': 'https://placehold.co/400x200/483D8B/FFFFFF?text=Seattle+Pipe+Club',
  'The Country Squire Tobacconist': 'https://placehold.co/400x200/8B4513/FFFFFF?text=Country+Squire',
  'Scandinavian Tobacco Group': 'https://placehold.co/400x200/4682B4/FFFFFF?text=STG',
};

// Generic tobacco leaf fallback image
export const GENERIC_TOBACCO_ICON = 'https://placehold.co/400x200/D2691E/FFFFFF?text=Tobacco';

/**
 * Get all matching tobacco brand logos (including custom uploaded logos)
 * @param {string} manufacturer - Brand/manufacturer name
 * @param {Array} customLogos - Array of custom logo objects from database
 * @returns {Array<{brand: string, logo: string}>} Array of matching brands and logos
 */
export function getMatchingLogos(manufacturer, customLogos = []) {
  if (!manufacturer) return [];
  
  const normalized = manufacturer.trim();
  const lowerManufacturer = normalized.toLowerCase();
  const matches = [];
  
  // Check custom logos first (higher priority)
  for (const customLogo of customLogos) {
    const brandLower = customLogo.brand_name.toLowerCase();
    if (brandLower === lowerManufacturer) {
      matches.push({ brand: customLogo.brand_name, logo: customLogo.logo_url });
    } else if (lowerManufacturer.includes(brandLower) || brandLower.includes(lowerManufacturer)) {
      matches.push({ brand: customLogo.brand_name, logo: customLogo.logo_url });
    }
  }
  
  // Then check built-in logos
  // Direct match
  if (TOBACCO_LOGOS[normalized]) {
    matches.push({ brand: normalized, logo: TOBACCO_LOGOS[normalized] });
  }
  
  // Partial matches (case insensitive)
  for (const [brand, logo] of Object.entries(TOBACCO_LOGOS)) {
    if (brand !== normalized && 
        (lowerManufacturer.includes(brand.toLowerCase()) || 
         brand.toLowerCase().includes(lowerManufacturer))) {
      matches.push({ brand, logo });
    }
  }
  
  return matches;
}

/**
 * Get tobacco brand logo URL (returns first match or generic icon)
 * @param {string} manufacturer - Brand/manufacturer name
 * @param {Array} customLogos - Array of custom logo objects from database
 * @returns {string} Logo URL or generic tobacco icon
 */
export function getTobaccoLogo(manufacturer, customLogos = []) {
  const matches = getMatchingLogos(manufacturer, customLogos);
  return matches.length > 0 ? matches[0].logo : GENERIC_TOBACCO_ICON;
}

/**
 * Get all available brand names (including custom uploaded logos)
 * @param {Array} customLogos - Array of custom logo objects from database
 * @returns {Array<{brand: string, logo: string, isCustom: boolean}>} Array of brand objects
 */
export function getAvailableBrands(customLogos = []) {
  const builtInBrands = Object.keys(TOBACCO_LOGOS).map(brand => ({
    brand,
    logo: TOBACCO_LOGOS[brand],
    isCustom: false
  }));
  
  const customBrands = customLogos.map(item => ({
    brand: item.brand_name,
    logo: item.logo_url,
    isCustom: true
  }));
  
  return [...customBrands, ...builtInBrands].sort((a, b) => 
    a.brand.localeCompare(b.brand)
  );
}