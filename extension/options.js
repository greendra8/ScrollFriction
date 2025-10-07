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

const modeInputs = document.querySelectorAll('input[name="mode"]');
const whitelistForm = document.getElementById('whitelist-form');
const whitelistInput = document.getElementById('whitelist-input');
const whitelistList = document.getElementById('whitelist-list');
const blacklistForm = document.getElementById('blacklist-form');
const blacklistInput = document.getElementById('blacklist-input');
const blacklistList = document.getElementById('blacklist-list');
const baseMultiplierInput = document.getElementById('base-multiplier');
const incrementPerScrollInput = document.getElementById('increment-per-scroll');
const maxMultiplierInput = document.getElementById('max-multiplier');
const recoveryPerSecondInput = document.getElementById('recovery-per-second');
const distanceWeightInput = document.getElementById('distance-weight');
const saveResistanceButton = document.getElementById('save-resistance');
const resetResistanceButton = document.getElementById('reset-resistance');
const resistanceStatus = document.getElementById('resistance-status');

let currentSettings = cloneDefaults(DEFAULT_SETTINGS);

function cloneDefaults(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeHost(value) {
  if (!value) {
    return null;
  }

  let host = value.trim().toLowerCase();
  if (!host) {
    return null;
  }

  if (!host.includes('://')) {
    host = `https://${host}`;
  }

  try {
    return new URL(host).hostname;
  } catch (error) {
    return null;
  }
}

function renderMode() {
  modeInputs.forEach((input) => {
    input.checked = input.value === currentSettings.mode;
  });
}

function renderList(listElement, sites, type) {
  listElement.textContent = '';
  if (!Array.isArray(sites) || sites.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No sites yet.';
    listElement.appendChild(empty);
    return;
  }

  sites
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .forEach((host) => {
      const li = document.createElement('li');
      li.textContent = host;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Remove';
      button.addEventListener('click', () => removeHost(type, host));
      li.appendChild(button);
      listElement.appendChild(li);
    });
}

function renderResistance() {
  const { baseMultiplier, incrementPerScroll, maxMultiplier, recoveryPerSecond, distanceWeight } =
    currentSettings.resistance;
  baseMultiplierInput.value = baseMultiplier;
  incrementPerScrollInput.value = incrementPerScroll;
  maxMultiplierInput.value = maxMultiplier;
  recoveryPerSecondInput.value = recoveryPerSecond;
  distanceWeightInput.value = distanceWeight;
}

function saveSettings(partial) {
  chrome.storage.sync.set(partial, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to save settings', chrome.runtime.lastError);
    }
  });
}

function removeHost(type, host) {
  const list = currentSettings[type];
  const index = list.indexOf(host);
  if (index >= 0) {
    list.splice(index, 1);
    renderList(type === 'whitelist' ? whitelistList : blacklistList, list, type);
    saveSettings({ [type]: list });
  }
}

function handleListSubmit(event, type) {
  event.preventDefault();
  const input = type === 'whitelist' ? whitelistInput : blacklistInput;
  const host = normalizeHost(input.value);
  if (!host) {
    input.value = '';
    return;
  }

  const list = currentSettings[type];
  if (!list.includes(host)) {
    list.push(host);
    renderList(type === 'whitelist' ? whitelistList : blacklistList, list, type);
    saveSettings({ [type]: list });
  }

  input.value = '';
}

function handleModeChange(event) {
  const { value } = event.target;
  if (value === 'whitelist' || value === 'blacklist') {
    currentSettings.mode = value;
    saveSettings({ mode: value });
  }
}

function handleSaveResistance() {
  const base = Number.parseFloat(baseMultiplierInput.value);
  const increment = Number.parseFloat(incrementPerScrollInput.value);
  const max = Number.parseFloat(maxMultiplierInput.value);
  const recovery = Number.parseFloat(recoveryPerSecondInput.value);
  const distanceWeight = Number.parseFloat(distanceWeightInput.value);

  const resistance = {
    baseMultiplier: Number.isFinite(base) && base > 0 ? base : DEFAULT_SETTINGS.resistance.baseMultiplier,
    incrementPerScroll:
      Number.isFinite(increment) && increment >= 0 ? increment : DEFAULT_SETTINGS.resistance.incrementPerScroll,
    maxMultiplier: Number.isFinite(max) && max >= 1 ? max : DEFAULT_SETTINGS.resistance.maxMultiplier,
    recoveryPerSecond:
      Number.isFinite(recovery) && recovery >= 0 ? recovery : DEFAULT_SETTINGS.resistance.recoveryPerSecond,
    distanceWeight:
      Number.isFinite(distanceWeight) && distanceWeight > 0
        ? distanceWeight
        : DEFAULT_SETTINGS.resistance.distanceWeight
  };

  currentSettings.resistance = resistance;
  saveSettings({ resistance });
  resistanceStatus.textContent = 'Resistance settings saved.';
  setTimeout(() => {
    resistanceStatus.textContent = '';
  }, 2000);
}

function handleResetResistance() {
  currentSettings.resistance = cloneDefaults(DEFAULT_SETTINGS.resistance);
  renderResistance();
  saveSettings({ resistance: currentSettings.resistance });
  resistanceStatus.textContent = 'Defaults restored.';
  setTimeout(() => {
    resistanceStatus.textContent = '';
  }, 2000);
}

function hydrate() {
  chrome.storage.sync.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to load settings', chrome.runtime.lastError);
      return;
    }

    currentSettings = {
      mode: items.mode ?? DEFAULT_SETTINGS.mode,
      whitelist: Array.isArray(items.whitelist) ? items.whitelist.slice() : cloneDefaults(DEFAULT_SETTINGS.whitelist),
      blacklist: Array.isArray(items.blacklist) ? items.blacklist.slice() : cloneDefaults(DEFAULT_SETTINGS.blacklist),
      resistance: {
        baseMultiplier: items.resistance?.baseMultiplier ?? DEFAULT_SETTINGS.resistance.baseMultiplier,
        incrementPerScroll: items.resistance?.incrementPerScroll ?? DEFAULT_SETTINGS.resistance.incrementPerScroll,
        maxMultiplier: items.resistance?.maxMultiplier ?? DEFAULT_SETTINGS.resistance.maxMultiplier,
        recoveryPerSecond: items.resistance?.recoveryPerSecond ?? DEFAULT_SETTINGS.resistance.recoveryPerSecond,
        distanceWeight: items.resistance?.distanceWeight ?? DEFAULT_SETTINGS.resistance.distanceWeight
      }
    };

    renderMode();
    renderList(whitelistList, currentSettings.whitelist, 'whitelist');
    renderList(blacklistList, currentSettings.blacklist, 'blacklist');
    renderResistance();
  });
}

function init() {
  hydrate();
  whitelistForm.addEventListener('submit', (event) => handleListSubmit(event, 'whitelist'));
  blacklistForm.addEventListener('submit', (event) => handleListSubmit(event, 'blacklist'));
  modeInputs.forEach((input) => input.addEventListener('change', handleModeChange));
  saveResistanceButton.addEventListener('click', handleSaveResistance);
  resetResistanceButton.addEventListener('click', handleResetResistance);
}

document.addEventListener('DOMContentLoaded', init);
