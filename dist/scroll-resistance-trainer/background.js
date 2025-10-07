const DEFAULT_SETTINGS = {
  mode: 'whitelist',
  whitelist: [],
  blacklist: [],
  resistance: {
    baseMultiplier: 1.5,
    incrementPerScroll: 0.2,
    maxMultiplier: 20,
    recoveryPerSecond: 1,
    distanceWeight: 120
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
    const mergedResistance = {
      baseMultiplier:
        Number.isFinite(storedResistance.baseMultiplier) && storedResistance.baseMultiplier > 0
          ? storedResistance.baseMultiplier
          : DEFAULT_SETTINGS.resistance.baseMultiplier,
      incrementPerScroll:
        Number.isFinite(storedResistance.incrementPerScroll) && storedResistance.incrementPerScroll >= 0
          ? storedResistance.incrementPerScroll
          : DEFAULT_SETTINGS.resistance.incrementPerScroll,
      maxMultiplier:
        Number.isFinite(storedResistance.maxMultiplier) && storedResistance.maxMultiplier >= 1
          ? storedResistance.maxMultiplier
          : DEFAULT_SETTINGS.resistance.maxMultiplier,
      recoveryPerSecond:
        Number.isFinite(storedResistance.recoveryPerSecond) && storedResistance.recoveryPerSecond >= 0
          ? storedResistance.recoveryPerSecond
          : DEFAULT_SETTINGS.resistance.recoveryPerSecond,
      distanceWeight:
        Number.isFinite(storedResistance.distanceWeight) && storedResistance.distanceWeight > 0
          ? storedResistance.distanceWeight
          : DEFAULT_SETTINGS.resistance.distanceWeight
    };

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
