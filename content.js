const DEFAULT_SETTINGS = {
  enabled: true,
  color: "#f5f1e6"
};

const HTML_FLAG = "data-feishu-bg-extension";
const ROOT_FLAG = "data-feishu-bg-root";
const COLOR_VARIABLE = "--feishu-bg-color";
const SUPPORTED_PATH_PATTERN = /^\/(docx|sheets|wiki)\//i;
const ROOT_SELECTORS = [
  "#root",
  "#app",
  "[role='main']",
  "[data-testid*='docs']",
  "[data-testid*='editor']",
  "[data-testid*='sheet']",
  "[class*='workspace']",
  "[class*='main-container']",
  "[class*='mainContainer']",
  "[class*='editor-container']",
  "[class*='editorContainer']",
  "[class*='doc-root']",
  "[class*='docRoot']",
  "[class*='wiki-root']",
  "[class*='wikiRoot']",
  "[class*='sheet-root']",
  "[class*='sheetRoot']"
];

let settings = { ...DEFAULT_SETTINGS };
let observer = null;
let applyScheduled = false;
let lastUrl = location.href;

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

function isSupportedUrl(candidate) {
  try {
    const url = new URL(candidate, location.origin);
    return /\.feishu\.cn$/i.test(url.hostname) && SUPPORTED_PATH_PATTERN.test(url.pathname);
  } catch (error) {
    return false;
  }
}

function markElement(element, collector) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  collector.add(element);

  let current = element.parentElement;
  let depth = 0;

  while (current && depth < 4) {
    collector.add(current);

    if (current === document.body || current === document.documentElement) {
      break;
    }

    current = current.parentElement;
    depth += 1;
  }
}

function isLargeContainer(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  return rect.width >= window.innerWidth * 0.4 && rect.height >= window.innerHeight * 0.35;
}

function collectBodyContainers() {
  if (!document.body) {
    return [];
  }

  const containers = [];
  const topLevelNodes = Array.from(document.body.children).slice(0, 10);

  topLevelNodes.forEach((node) => {
    if (isLargeContainer(node)) {
      containers.push(node);
    }

    Array.from(node.children)
      .slice(0, 10)
      .forEach((child) => {
        if (isLargeContainer(child)) {
          containers.push(child);
        }
      });
  });

  return containers;
}

function collectTargetRoots() {
  const roots = new Set();

  if (document.documentElement) {
    roots.add(document.documentElement);
  }

  if (document.body) {
    roots.add(document.body);
  }

  ROOT_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (isLargeContainer(element)) {
        markElement(element, roots);
      }
    });
  });

  collectBodyContainers().forEach((element) => {
    markElement(element, roots);
  });

  return roots;
}

function clearRootMarkers() {
  document.querySelectorAll(`[${ROOT_FLAG}]`).forEach((element) => {
    element.removeAttribute(ROOT_FLAG);
  });
}

function disableTheme() {
  clearRootMarkers();
  document.documentElement.removeAttribute(HTML_FLAG);
  document.documentElement.style.removeProperty(COLOR_VARIABLE);
}

function applyTheme() {
  if (!document.documentElement) {
    return;
  }

  const enabledForPage = settings.enabled && isSupportedUrl(location.href);

  if (!enabledForPage) {
    disableTheme();
    return;
  }

  const roots = collectTargetRoots();

  clearRootMarkers();
  document.documentElement.setAttribute(HTML_FLAG, "on");
  document.documentElement.style.setProperty(COLOR_VARIABLE, settings.color);

  roots.forEach((element) => {
    if (element instanceof HTMLElement && element !== document.documentElement && element !== document.body) {
      element.setAttribute(ROOT_FLAG, "true");
    }
  });
}

function scheduleApplyTheme() {
  if (applyScheduled) {
    return;
  }

  applyScheduled = true;

  requestAnimationFrame(() => {
    applyScheduled = false;
    applyTheme();
  });
}

function bootstrapObserver() {
  if (observer || !document.documentElement) {
    return;
  }

  observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
    }

    scheduleApplyTheme();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function wrapHistoryMethod(name) {
  const original = history[name];

  if (typeof original !== "function") {
    return;
  }

  history[name] = function wrappedHistoryMethod(...args) {
    const result = original.apply(this, args);

    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleApplyTheme();
    }

    return result;
  };
}

function readSettingsAndApply() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    settings = {
      enabled: Boolean(items.enabled),
      color: normalizeColor(items.color)
    };

    scheduleApplyTheme();
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (changes.enabled) {
    settings.enabled = Boolean(changes.enabled.newValue);
  }

  if (changes.color) {
    settings.color = normalizeColor(changes.color.newValue);
  }

  scheduleApplyTheme();
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "feishu-bg:update") {
    return;
  }

  settings = {
    enabled: Boolean(message.payload?.enabled),
    color: normalizeColor(message.payload?.color)
  };

  scheduleApplyTheme();
});

window.addEventListener("popstate", scheduleApplyTheme, true);
window.addEventListener("hashchange", scheduleApplyTheme, true);
window.addEventListener("load", scheduleApplyTheme, true);
window.addEventListener("resize", scheduleApplyTheme, true);
document.addEventListener("visibilitychange", scheduleApplyTheme, true);

wrapHistoryMethod("pushState");
wrapHistoryMethod("replaceState");
bootstrapObserver();
readSettingsAndApply();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleApplyTheme, { once: true });
} else {
  scheduleApplyTheme();
}
