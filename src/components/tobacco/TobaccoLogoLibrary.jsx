// Tobacco brand logo library
const TOBACCO_LOGOS = {
  'Peterson': 'https://www.pipesandcigars.com/media/wysiwyg/peterson-logo.png',
  'Dunhill': 'https://www.dunhill.com/content/dam/dunhill/global/homepage/logo.png',
  'Cornell & Diehl': 'https://www.pipesandcigars.com/media/wysiwyg/cornell-diehl-logo.png',
  'C&D': 'https://www.pipesandcigars.com/media/wysiwyg/cornell-diehl-logo.png',
  'Samuel Gawith': 'https://www.samuelgawith.co.uk/images/logo.png',
  'Gawith Hoggarth': 'https://www.gawithhoggarth.co.uk/images/logo.png',
  'G.L. Pease': 'https://www.glpease.com/images/glp-logo.png',
  'McClelland': 'https://www.pipesandcigars.com/media/wysiwyg/mcclelland-logo.png',
  'Rattray': 'https://www.rattrays.com/images/logo.png',
  'Orlik': 'https://www.pipesandcigars.com/media/wysiwyg/orlik-logo.png',
  'Stanwell': 'https://www.stanwell.com/images/logo.png',
  'Sutliff': 'https://www.sutliff.com/images/logo.png',
  'Mac Baren': 'https://www.mac-baren.com/images/logo.png',
  'Captain Black': 'https://www.pipesandcigars.com/media/wysiwyg/captain-black-logo.png',
  'Lane Limited': 'https://www.pipesandcigars.com/media/wysiwyg/lane-limited-logo.png',
  'Escudo': 'https://www.pipesandcigars.com/media/wysiwyg/escudo-logo.png',
  'Davidoff': 'https://www.davidoff.com/images/logo.png',
  'Balkan Sobranie': 'https://www.pipesandcigars.com/media/wysiwyg/balkan-sobranie-logo.png',
  'Frog Morton': 'https://www.mccranies.com/images/frog-morton-logo.png',
  'Germain': 'https://www.germainspipetobacco.com/images/logo.png',
  'H&H': 'https://www.pipesandcigars.com/media/wysiwyg/h-h-logo.png',
  'Seattle Pipe Club': 'https://www.seattlepipeclub.org/images/logo.png',
};

// Generic tobacco leaf fallback image
const GENERIC_TOBACCO_ICON = 'https://cdn-icons-png.flaticon.com/512/2917/2917995.png';

/**
 * Get tobacco brand logo URL
 * @param {string} manufacturer - Brand/manufacturer name
 * @returns {string} Logo URL or generic tobacco icon
 */
export function getTobaccoLogo(manufacturer) {
  if (!manufacturer) return GENERIC_TOBACCO_ICON;
  
  // Normalize the manufacturer name for matching
  const normalized = manufacturer.trim();
  
  // Direct match
  if (TOBACCO_LOGOS[normalized]) {
    return TOBACCO_LOGOS[normalized];
  }
  
  // Partial match (case insensitive)
  const lowerManufacturer = normalized.toLowerCase();
  for (const [brand, logo] of Object.entries(TOBACCO_LOGOS)) {
    if (lowerManufacturer.includes(brand.toLowerCase()) || 
        brand.toLowerCase().includes(lowerManufacturer)) {
      return logo;
    }
  }
  
  // Return generic fallback
  return GENERIC_TOBACCO_ICON;
}

/**
 * Get all available brand names
 * @returns {string[]} Array of brand names
 */
export function getAvailableBrands() {
  return Object.keys(TOBACCO_LOGOS).sort();
}