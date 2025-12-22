// Tobacco brand logo library - using generic branded placeholders
const TOBACCO_LOGOS = {
  'Peterson': 'https://via.placeholder.com/400x200/8B4513/FFFFFF?text=Peterson',
  'Dunhill': 'https://via.placeholder.com/400x200/1a1a1a/FFFFFF?text=Dunhill',
  'Cornell & Diehl': 'https://via.placeholder.com/400x200/2c5f2d/FFFFFF?text=Cornell+%26+Diehl',
  'Samuel Gawith': 'https://via.placeholder.com/400x200/8B0000/FFFFFF?text=Samuel+Gawith',
  'Gawith Hoggarth': 'https://via.placeholder.com/400x200/654321/FFFFFF?text=Gawith+Hoggarth',
  'G.L. Pease': 'https://via.placeholder.com/400x200/4B0082/FFFFFF?text=G.L.+Pease',
  'McClelland': 'https://via.placeholder.com/400x200/800020/FFFFFF?text=McClelland',
  'Rattray': 'https://via.placeholder.com/400x200/C19A6B/FFFFFF?text=Rattray',
  'Orlik': 'https://via.placeholder.com/400x200/DAA520/FFFFFF?text=Orlik',
  'Stanwell': 'https://via.placeholder.com/400x200/2F4F4F/FFFFFF?text=Stanwell',
  'Sutliff': 'https://via.placeholder.com/400x200/8B4513/FFFFFF?text=Sutliff',
  'Mac Baren': 'https://via.placeholder.com/400x200/DC143C/FFFFFF?text=Mac+Baren',
  'Captain Black': 'https://via.placeholder.com/400x200/000080/FFFFFF?text=Captain+Black',
  'Lane Limited': 'https://via.placeholder.com/400x200/556B2F/FFFFFF?text=Lane+Limited',
  'Escudo': 'https://via.placeholder.com/400x200/8B4513/FFFFFF?text=Escudo',
  'Davidoff': 'https://via.placeholder.com/400x200/1a1a1a/FFD700?text=Davidoff',
  'Balkan Sobranie': 'https://via.placeholder.com/400x200/191970/FFFFFF?text=Balkan+Sobranie',
  'Frog Morton': 'https://via.placeholder.com/400x200/228B22/FFFFFF?text=Frog+Morton',
  'Germain': 'https://via.placeholder.com/400x200/8B0000/FFFFFF?text=Germain',
  'Seattle Pipe Club': 'https://via.placeholder.com/400x200/483D8B/FFFFFF?text=Seattle+Pipe+Club',
  'The Country Squire Tobacconist': 'https://via.placeholder.com/400x200/8B4513/FFFFFF?text=Country+Squire',
  'Scandinavian Tobacco Group': 'https://via.placeholder.com/400x200/4682B4/FFFFFF?text=STG',
};

// Generic tobacco leaf fallback image
export const GENERIC_TOBACCO_ICON = 'https://via.placeholder.com/400x200/D2691E/FFFFFF?text=Tobacco';

/**
 * Get all matching tobacco brand logos
 * @param {string} manufacturer - Brand/manufacturer name
 * @returns {Array<{brand: string, logo: string}>} Array of matching brands and logos
 */
export function getMatchingLogos(manufacturer) {
  if (!manufacturer) return [];
  
  const normalized = manufacturer.trim();
  const lowerManufacturer = normalized.toLowerCase();
  const matches = [];
  
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
 * @returns {string} Logo URL or generic tobacco icon
 */
export function getTobaccoLogo(manufacturer) {
  const matches = getMatchingLogos(manufacturer);
  return matches.length > 0 ? matches[0].logo : GENERIC_TOBACCO_ICON;
}

/**
 * Get all available brand names
 * @returns {string[]} Array of brand names
 */
export function getAvailableBrands() {
  return Object.keys(TOBACCO_LOGOS).sort();
}