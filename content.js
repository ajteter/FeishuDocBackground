const DEFAULT_SETTINGS = {
  enabled: true,
  themeMode: "system",
  manualVariant: "light",
  lightColor: "#faf9f6",
  darkColor: "#1e1e1e"
};

const HTML_FLAG = "data-feishu-bg-extension";
const PAGE_FLAG = "data-feishu-bg-page";
const COLOR_VARIABLE = "--feishu-bg-color";
const SUPPORTED_PATH_PATTERN = /^\/(docx|wiki)\//i;
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

let settings = { ...DEFAULT_SETTINGS };
let lastHref = location.href;
let lastAppliedState = "";

const systemThemeMedia = window.matchMedia(SYSTEM_THEME_QUERY);

function normalizeColor(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    return `#${prefixed[1]}${prefixed[1]}${prefixed[2]}${prefixed[2]}${prefixed[3]}${prefixed[3]}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }

  return fallback;
}

function normalizeVariant(value) {
  return value === "dark" ? "dark" : "light";
}

function normalizeThemeMode(value) {
  return value === "manual" ? "manual" : "system";
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

function getSystemVariant() {
  return systemThemeMedia.matches ? "dark" : "light";
}

function getActiveVariant() {
  if (settings.themeMode === "manual") {
    return settings.manualVariant;
  }

  return getSystemVariant();
}

function getActiveColor() {
  return getActiveVariant() === "dark" ? settings.darkColor : settings.lightColor;
}

function sanitizeSettings(items) {
  const legacyColor = normalizeColor(items.color, DEFAULT_SETTINGS.lightColor);
  const lightColor = normalizeColor(items.lightColor, legacyColor);
  const darkColor = normalizeColor(items.darkColor, legacyColor);

  return {
    enabled: Boolean(items.enabled),
    themeMode: normalizeThemeMode(items.themeMode),
    manualVariant: normalizeVariant(items.manualVariant),
    lightColor,
    darkColor
  };
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

  const activeVariant = getActiveVariant();
  const activeColor = getActiveColor();
  const nextState = `${pageType}:${settings.themeMode}:${activeVariant}:${activeColor}`;

  if (lastAppliedState === nextState) {
    return;
  }

  document.documentElement.setAttribute(HTML_FLAG, "on");
  document.documentElement.setAttribute(PAGE_FLAG, pageType);
  document.documentElement.style.setProperty(COLOR_VARIABLE, activeColor);
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
  chrome.storage.local.get({ ...DEFAULT_SETTINGS, color: DEFAULT_SETTINGS.lightColor }, (items) => {
    settings = sanitizeSettings(items);
    applyTheme();
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const nextItems = {
    ...settings,
    color: settings.lightColor
  };

  Object.entries(changes).forEach(([key, change]) => {
    nextItems[key] = change.newValue;
  });

  settings = sanitizeSettings(nextItems);
  applyTheme();
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "feishu-bg:update") {
    return;
  }

  settings = sanitizeSettings(message.payload || {});
  applyTheme();
});

systemThemeMedia.addEventListener("change", () => {
  if (settings.themeMode === "system") {
    applyTheme();
  }
});

window.addEventListener("popstate", syncLocationState, true);
window.addEventListener("hashchange", syncLocationState, true);
window.addEventListener("pageshow", syncLocationState, true);

wrapHistoryMethod("pushState");
wrapHistoryMethod("replaceState");
readSettingsAndApply();
