export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  
  const parts = String(path).split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

export function interpolate(str, vars) {
  if (!str || typeof str !== 'string') return str;
  if (!vars) return str;
  
  return str.replace(/\{([^}]+)\}/g, (_, key) => {
    return vars[key] !== undefined ? String(vars[key]) : `{${key}}`;
  });
}