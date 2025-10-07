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

let settings = { ...DEFAULT_SETTINGS };
let enabled = false;
let multiplier = DEFAULT_SETTINGS.resistance.baseMultiplier;
let scrollUnits = 0;
let recoveryTimer = null;

function cloneSettings(value) {
  return JSON.parse(JSON.stringify(value));
}

function getHostname() {
  return window.location.hostname.toLowerCase();
}

function isHostInList(host, list) {
  return Array.isArray(list) && list.some((entry) => entry === host);
}

function determineEnabled() {
  const host = getHostname();
  if (settings.mode === 'whitelist') {
    return !isHostInList(host, settings.whitelist);
  }
  return isHostInList(host, settings.blacklist);
}

function sanitizeResistanceConfig(raw = {}) {
  const baseMultiplier = Number.isFinite(raw.baseMultiplier) && raw.baseMultiplier > 0
    ? raw.baseMultiplier
    : DEFAULT_SETTINGS.resistance.baseMultiplier;
  const incrementPerScroll = Number.isFinite(raw.incrementPerScroll) && raw.incrementPerScroll >= 0
    ? raw.incrementPerScroll
    : DEFAULT_SETTINGS.resistance.incrementPerScroll;
  const maxMultiplier = Number.isFinite(raw.maxMultiplier) && raw.maxMultiplier >= 1
    ? raw.maxMultiplier
    : DEFAULT_SETTINGS.resistance.maxMultiplier;
  const recoveryPerSecond = Number.isFinite(raw.recoveryPerSecond) && raw.recoveryPerSecond >= 0
    ? raw.recoveryPerSecond
    : DEFAULT_SETTINGS.resistance.recoveryPerSecond;
  const distanceWeight = Number.isFinite(raw.distanceWeight) && raw.distanceWeight > 0
    ? raw.distanceWeight
    : DEFAULT_SETTINGS.resistance.distanceWeight;

  return { baseMultiplier, incrementPerScroll, maxMultiplier, recoveryPerSecond, distanceWeight };
}

function updateMultiplier() {
  const { baseMultiplier, incrementPerScroll, maxMultiplier } = settings.resistance;
  multiplier = Math.min(maxMultiplier, baseMultiplier + scrollUnits * incrementPerScroll);
}

function scheduleRecovery() {
  if (recoveryTimer) {
    return;
  }

  const intervalMs = 1000;
  recoveryTimer = setInterval(() => {
    if (!enabled) {
      scrollUnits = 0;
      updateMultiplier();
      clearInterval(recoveryTimer);
      recoveryTimer = null;
      return;
    }

    if (scrollUnits <= 0) {
      scrollUnits = 0;
      updateMultiplier();
      return;
    }

    const { recoveryPerSecond } = settings.resistance;
    scrollUnits = Math.max(0, scrollUnits - recoveryPerSecond);
    updateMultiplier();
  }, intervalMs);
}

function stopRecovery() {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
  }
}

function applySettings(newSettings) {
  settings = {
    mode: newSettings.mode === 'blacklist' ? 'blacklist' : DEFAULT_SETTINGS.mode,
    whitelist: Array.isArray(newSettings.whitelist)
      ? cloneSettings(newSettings.whitelist)
      : cloneSettings(DEFAULT_SETTINGS.whitelist),
    blacklist: Array.isArray(newSettings.blacklist)
      ? cloneSettings(newSettings.blacklist)
      : cloneSettings(DEFAULT_SETTINGS.blacklist),
    resistance: sanitizeResistanceConfig(newSettings.resistance)
  };

  enabled = determineEnabled();
  scrollUnits = 0;
  updateMultiplier();

  if (enabled) {
    scheduleRecovery();
  } else {
    stopRecovery();
  }
}

function handleWheel(event) {
  if (!enabled) {
    return;
  }

  if (event.defaultPrevented || event.ctrlKey || event.metaKey) {
    return;
  }

  const deltaX = event.deltaX / multiplier;
  const deltaY = event.deltaY / multiplier;

  event.preventDefault();
  window.scrollBy({ left: deltaX, top: deltaY, behavior: 'auto' });

  const distance = Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY));
  const { distanceWeight } = settings.resistance;
  const weight = distanceWeight > 0 ? distanceWeight : 1;
  const gain = distance > 0 ? Math.max(1, distance / weight) : 1;
  scrollUnits += gain;
  updateMultiplier();
  scheduleRecovery();
}

function init() {
  chrome.storage.sync.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('Scroll Resistance: failed to read settings', chrome.runtime.lastError);
      return;
    }
    applySettings(items);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') {
      return;
    }

    const updated = { ...settings };
    if (Object.prototype.hasOwnProperty.call(changes, 'mode')) {
      updated.mode = changes.mode.newValue;
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'whitelist')) {
      updated.whitelist = Array.isArray(changes.whitelist.newValue)
        ? cloneSettings(changes.whitelist.newValue)
        : cloneSettings(DEFAULT_SETTINGS.whitelist);
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'blacklist')) {
      updated.blacklist = Array.isArray(changes.blacklist.newValue)
        ? cloneSettings(changes.blacklist.newValue)
        : cloneSettings(DEFAULT_SETTINGS.blacklist);
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'resistance')) {
      updated.resistance = sanitizeResistanceConfig(changes.resistance.newValue);
    }
    applySettings(updated);
  });

  window.addEventListener('wheel', handleWheel, { passive: false });
}

init();
