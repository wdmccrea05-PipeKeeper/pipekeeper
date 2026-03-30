export function isModuleEnabled(user, moduleKey) {
  if (!user) return false;

  const enabledFieldMap = {
    pipekeeper: "pipekeeper_enabled",
    whiskeykeeper: "whiskeykeeper_enabled",
    winekeeper: "winekeeper_enabled",
    cigarkeeper: "cigarkeeper_enabled",
  };

  const fieldName = enabledFieldMap[moduleKey];
  return fieldName ? user[fieldName] === true : false;
}

export function requireModule(user, moduleKey) {
  if (!isModuleEnabled(user, moduleKey)) {
    throw new Error(`Module ${moduleKey} disabled`);
  }
}
