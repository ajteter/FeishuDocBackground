const DEFAULT_SETTINGS = {
  enabled: true,
  color: "#faf9f6"
};

const HTML_FLAG = "data-feishu-bg-extension";
const PAGE_FLAG = "data-feishu-bg-page";
const COLOR_VARIABLE = "--feishu-bg-color";
const SUPPORTED_PATH_PATTERN = /^\/(docx|wiki)\//i;

let settings = { ...DEFAULT_SETTINGS };
let lastHref = location.href;
let lastAppliedState = "";

function normalizeColor(value) {
  if (typeof value !== "string") {
    return DEFAULT_SETTINGS.color;
  }

  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    return `#${prefixed[1]}${prefixed[1]}${prefixed[2]}${prefixed[2]}${prefixed[3]}${prefixed[3]}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }

  return DEFAULT_SETTINGS.color;
}

function getPageType(candidate) {
  try {
    const url = new URL(candidate, location.origin);

    if (!/\.feishu\.cn$/i.test(url.hostname)) {
      return "";
    }

    const match = url.pathname.match(SUPPORTED_PATH_PATTERN);
    return match ? match[1].toLowerCase() : "";
  } catch (error) {
    return "";
  }
}

function disableTheme() {
  if (!document.documentElement) {
    return;
  }

  if (lastAppliedState === "disabled") {
    return;
  }

  document.documentElement.removeAttribute(HTML_FLAG);
  document.documentElement.removeAttribute(PAGE_FLAG);
  document.documentElement.style.removeProperty(COLOR_VARIABLE);
  lastAppliedState = "disabled";
}

function applyTheme() {
  if (!document.documentElement) {
    return;
  }

  const pageType = getPageType(location.href);
  const isEnabled = settings.enabled && Boolean(pageType);

  if (!isEnabled) {
    disableTheme();
    return;
  }

  const nextState = `${pageType}:${settings.color}`;

  if (lastAppliedState === nextState) {
    return;
  }

  document.documentElement.setAttribute(HTML_FLAG, "on");
  document.documentElement.setAttribute(PAGE_FLAG, pageType);
  document.documentElement.style.setProperty(COLOR_VARIABLE, settings.color);
  lastAppliedState = nextState;
}

function syncLocationState() {
  if (location.href === lastHref) {
    return;
  }

  lastHref = location.href;
  applyTheme();
}

function wrapHistoryMethod(name) {
  const original = history[name];

  if (typeof original !== "function") {
    return;
  }

  history[name] = function wrappedHistoryMethod(...args) {
    const result = original.apply(this, args);
    syncLocationState();
    return result;
  };
}

function readSettingsAndApply() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
    settings = {
      enabled: Boolean(items.enabled),
      color: normalizeColor(items.color)
    };

    applyTheme();
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.enabled) {
    settings.enabled = Boolean(changes.enabled.newValue);
  }

  if (changes.color) {
    settings.color = normalizeColor(changes.color.newValue);
  }

  applyTheme();
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "feishu-bg:update") {
    return;
  }

  settings = {
    enabled: Boolean(message.payload?.enabled),
    color: normalizeColor(message.payload?.color)
  };

  applyTheme();
});

window.addEventListener("popstate", syncLocationState, true);
window.addEventListener("hashchange", syncLocationState, true);
window.addEventListener("pageshow", syncLocationState, true);

wrapHistoryMethod("pushState");
wrapHistoryMethod("replaceState");
readSettingsAndApply();
