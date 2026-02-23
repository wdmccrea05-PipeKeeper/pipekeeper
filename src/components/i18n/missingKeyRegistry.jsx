
const missingKeyRegistry = {};

export function registerMissingKey(key) {
  if (!missingKeyRegistry[key]) {
    missingKeyRegistry[key] = true;
  }
}

export function clearMissingKeys() {
  Object.keys(missingKeyRegistry).forEach(key => {
    delete missingKeyRegistry[key];
  });
}

export { missingKeyRegistry };
