// Tobacco brand logo library
const TOBACCO_LOGOS = {
  'Peterson': 'https://logos-world.net/wp-content/uploads/2023/08/Peterson-Logo.png',
  'Dunhill': 'https://1000logos.net/wp-content/uploads/2020/09/Dunhill-Logo.png',
  'Cornell & Diehl': 'https://www.cornellanddiehl.com/images/cd-logo.png',
  'Samuel Gawith': 'https://www.samualgawith.com/wp-content/uploads/2019/04/samuel-gawith-logo.png',
  'Gawith Hoggarth': 'https://www.gawithhoggarth.co.uk/wp-content/uploads/2019/03/gh-logo.png',
  'G.L. Pease': 'https://www.glpease.com/images/GLPease-Logo.png',
  'McClelland': 'https://pipes.org/wp-content/uploads/2018/01/mcclelland-logo.png',
  'Rattray': 'https://www.rattrays.com/wp-content/uploads/2019/01/rattrays-logo.png',
  'Orlik': 'https://www.pipesandcigars.com/images/brands/orlik-logo.png',
  'Stanwell': 'https://stanwellpipes.com/wp-content/uploads/2019/02/stanwell-logo.png',
  'Sutliff': 'https://www.sutliff.com/wp-content/uploads/2019/03/sutliff-logo.png',
  'Mac Baren': 'https://www.mac-baren.com/media/wysiwyg/macbaren-logo.png',
  'Captain Black': 'https://www.captainblackcigarillos.com/images/captain-black-logo.png',
  'Lane Limited': 'https://www.pipesandcigars.com/images/brands/lane-limited-logo.png',
  'Escudo': 'https://www.smokingpipes.com/images/brands/escudo-logo.png',
  'Davidoff': 'https://1000logos.net/wp-content/uploads/2020/08/Davidoff-Logo.png',
  'Balkan Sobranie': 'https://www.pipesandcigars.com/images/brands/balkan-sobranie-logo.png',
  'Frog Morton': 'https://www.mcclellandtobacco.com/images/frog-morton-logo.png',
  'Germain': 'https://germainspipetobacco.com/wp-content/uploads/2019/01/germains-logo.png',
  'Seattle Pipe Club': 'https://seattlepipeclub.org/images/spc-logo.png',
  'The Country Squire Tobacconist': 'https://www.countrysquireonline.com/images/country-squire-logo.png',
  'Scandinavian Tobacco Group': 'https://www.st-group.com/media/wysiwyg/stg-logo.png',
};

// Generic tobacco leaf fallback image
const GENERIC_TOBACCO_ICON = 'https://cdn-icons-png.flaticon.com/512/2917/2917995.png';

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