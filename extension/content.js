const PIXELS_PER_METER = 3779.5275590551;

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

let settings = { ...DEFAULT_SETTINGS };
let enabled = false;

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
  const baseMultiplier = Number.isFinite(raw.baseMultiplier) && raw.baseMultiplier >= 1
    ? raw.baseMultiplier
    : DEFAULT_SETTINGS.resistance.baseMultiplier;
  let maxMultiplier = Number.isFinite(raw.maxMultiplier) && raw.maxMultiplier >= 1
    ? raw.maxMultiplier
    : DEFAULT_SETTINGS.resistance.maxMultiplier;
  const metersToMax = Number.isFinite(raw.metersToMax) && raw.metersToMax > 0
    ? raw.metersToMax
    : DEFAULT_SETTINGS.resistance.metersToMax;

  if (maxMultiplier < baseMultiplier) {
    maxMultiplier = baseMultiplier;
  }

  return { baseMultiplier, maxMultiplier, metersToMax };
}

function getScrollTop() {
  if (typeof window.scrollY === 'number') {
    return window.scrollY;
  }

  const doc = document.documentElement;
  const body = document.body;
  return Math.max(doc ? doc.scrollTop : 0, body ? body.scrollTop : 0);
}

function getDownwardMultiplier(scrollTop) {
  const { baseMultiplier, maxMultiplier, metersToMax } = settings.resistance;
  const pixelsToMax = metersToMax * PIXELS_PER_METER;

  if (pixelsToMax <= 0) {
    return Math.max(1, maxMultiplier);
  }

  const progress = Math.min(1, Math.max(0, scrollTop / pixelsToMax));
  const range = Math.max(0, maxMultiplier - baseMultiplier);
  const multiplier = baseMultiplier + progress * range;

  return Math.max(1, Math.min(maxMultiplier, multiplier));
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
}

function handleWheel(event) {
  if (!enabled) {
    return;
  }

  if (event.defaultPrevented || event.ctrlKey || event.metaKey) {
    return;
  }

  const scrollTop = getScrollTop();
  const downwardMultiplier = getDownwardMultiplier(scrollTop);
  const isScrollingDown = event.deltaY > 0;
  const effectiveVerticalMultiplier = isScrollingDown ? downwardMultiplier : 1;

  const adjustedDeltaX = event.deltaX;
  const adjustedDeltaY = event.deltaY / effectiveVerticalMultiplier;

  event.preventDefault();
  window.scrollBy({ left: adjustedDeltaX, top: adjustedDeltaY, behavior: 'auto' });
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
