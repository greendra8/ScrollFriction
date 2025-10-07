const DEFAULT_SETTINGS = {
  mode: 'whitelist',
  whitelist: [],
  blacklist: [],
  resistance: {
    baseMultiplier: 1,
    maxMultiplier: 12,
    metersToMax: 8
  }
};

function ensureDefaults() {
  chrome.storage.sync.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to read storage', chrome.runtime.lastError);
      return;
    }

    const updates = {};

    if (items.mode !== 'whitelist' && items.mode !== 'blacklist') {
      updates.mode = DEFAULT_SETTINGS.mode;
    }

    if (!Array.isArray(items.whitelist)) {
      updates.whitelist = DEFAULT_SETTINGS.whitelist;
    }

    if (!Array.isArray(items.blacklist)) {
      updates.blacklist = DEFAULT_SETTINGS.blacklist;
    }

    const storedResistance = items.resistance || {};
    let baseMultiplier = Number.isFinite(storedResistance.baseMultiplier) && storedResistance.baseMultiplier >= 1
      ? storedResistance.baseMultiplier
      : DEFAULT_SETTINGS.resistance.baseMultiplier;
    let maxMultiplier = Number.isFinite(storedResistance.maxMultiplier) && storedResistance.maxMultiplier >= 1
      ? storedResistance.maxMultiplier
      : DEFAULT_SETTINGS.resistance.maxMultiplier;
    const metersToMax = Number.isFinite(storedResistance.metersToMax) && storedResistance.metersToMax > 0
      ? storedResistance.metersToMax
      : DEFAULT_SETTINGS.resistance.metersToMax;

    if (maxMultiplier < baseMultiplier) {
      maxMultiplier = baseMultiplier;
    }

    const mergedResistance = { baseMultiplier, maxMultiplier, metersToMax };

    if (JSON.stringify(storedResistance) !== JSON.stringify(mergedResistance)) {
      updates.resistance = mergedResistance;
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates);
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});
