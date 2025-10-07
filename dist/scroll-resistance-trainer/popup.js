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

const whitelistButton = document.getElementById('whitelist-mode');
const blacklistButton = document.getElementById('blacklist-mode');
const toggleSiteButton = document.getElementById('toggle-site');
const siteMessage = document.getElementById('site-message');
const settingsButton = document.getElementById('open-settings');

let currentMode = DEFAULT_SETTINGS.mode;
let whitelist = [...DEFAULT_SETTINGS.whitelist];
let blacklist = [...DEFAULT_SETTINGS.blacklist];
let currentHost = null;

function normalizeHostFromUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname ? hostname.toLowerCase() : null;
  } catch (error) {
    return null;
  }
}

function updateModeButtons() {
  if (currentMode === 'whitelist') {
    whitelistButton.classList.add('active');
    blacklistButton.classList.remove('active');
  } else {
    blacklistButton.classList.add('active');
    whitelistButton.classList.remove('active');
  }
}

function updateSiteMessage() {
  if (!currentHost) {
    siteMessage.textContent = 'This page cannot be managed.';
    toggleSiteButton.disabled = true;
    return;
  }

  if (currentMode === 'whitelist') {
    const isWhitelisted = whitelist.includes(currentHost);
    siteMessage.textContent = isWhitelisted
      ? `${currentHost} is whitelisted.`
      : `${currentHost} will have resistance.`;
    toggleSiteButton.textContent = isWhitelisted ? 'Already whitelisted' : 'Whitelist this site';
    toggleSiteButton.disabled = isWhitelisted;
  } else {
    const isBlacklisted = blacklist.includes(currentHost);
    siteMessage.textContent = isBlacklisted
      ? `${currentHost} will face resistance.`
      : `${currentHost} is unaffected.`;
    toggleSiteButton.textContent = isBlacklisted ? 'Already blacklisted' : 'Blacklist this site';
    toggleSiteButton.disabled = isBlacklisted;
  }
}

function loadSettings() {
  chrome.storage.sync.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to load settings', chrome.runtime.lastError);
      siteMessage.textContent = 'Unable to load settings.';
      return;
    }

    currentMode = items.mode ?? DEFAULT_SETTINGS.mode;
    whitelist = Array.isArray(items.whitelist) ? items.whitelist : [...DEFAULT_SETTINGS.whitelist];
    blacklist = Array.isArray(items.blacklist) ? items.blacklist : [...DEFAULT_SETTINGS.blacklist];

    updateModeButtons();
    updateSiteMessage();
  });
}

function setMode(mode) {
  if (mode === currentMode) {
    return;
  }

  currentMode = mode;
  updateModeButtons();
  updateSiteMessage();
  chrome.storage.sync.set({ mode });
}

function addCurrentSite() {
  if (!currentHost) {
    return;
  }

  if (currentMode === 'whitelist') {
    if (!whitelist.includes(currentHost)) {
      const updated = [...whitelist, currentHost];
      whitelist = updated;
      chrome.storage.sync.set({ whitelist: updated }, () => {
        updateSiteMessage();
      });
    }
  } else {
    if (!blacklist.includes(currentHost)) {
      const updated = [...blacklist, currentHost];
      blacklist = updated;
      chrome.storage.sync.set({ blacklist: updated }, () => {
        updateSiteMessage();
      });
    }
  }
}

function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [activeTab] = tabs;
    if (activeTab && activeTab.url) {
      currentHost = normalizeHostFromUrl(activeTab.url);
    }
    loadSettings();
  });

  whitelistButton.addEventListener('click', () => setMode('whitelist'));
  blacklistButton.addEventListener('click', () => setMode('blacklist'));
  toggleSiteButton.addEventListener('click', addCurrentSite);
  settingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
