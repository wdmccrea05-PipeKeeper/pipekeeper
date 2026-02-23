const missingKeyRegistry = {};

function registerMissingKey(key) {
    if (!missingKeyRegistry[key]) {
        missingKeyRegistry[key] = true;
    }
}

function clearMissingKeys() {
    Object.keys(missingKeyRegistry).forEach(key => {
        delete missingKeyRegistry[key];
    });
}

export { missingKeyRegistry, registerMissingKey, clearMissingKeys };