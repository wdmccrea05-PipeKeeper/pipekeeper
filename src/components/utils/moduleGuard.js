export function isModuleEnabled(user, moduleKey) {
  if (!user) return false;
  return user?.activeModules?.[moduleKey] === true;
}

export function requireModule(user, moduleKey) {
  if (!isModuleEnabled(user, moduleKey)) {
    throw new Error(`Module ${moduleKey} disabled`);
  }
}
