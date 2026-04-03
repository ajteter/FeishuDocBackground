const DEFAULT_SETTINGS = {
  enabled: true,
  themeMode: "system",
  manualVariant: "light",
  lightColor: "#faf9f6",
  darkColor: "#1e1e1e"
};

const LEGACY_DEFAULTS = {
  enabled: true,
  color: DEFAULT_SETTINGS.lightColor
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

const enabledInput = document.getElementById("enabled");
const applyButton = document.getElementById("applyButton");
const statusText = document.getElementById("status");
const pageHint = document.getElementById("pageHint");
const systemThemeText = document.getElementById("systemThemeText");
const manualVariantField = document.getElementById("manualVariantField");
const manualVariantText = document.getElementById("manualVariantText");
const activeSchemeText = document.getElementById("activeSchemeText");

const themeModeInputs = Array.from(document.querySelectorAll('input[name="themeMode"]'));
const manualVariantInputs = Array.from(document.querySelectorAll('input[name="manualVariant"]'));
const presetButtons = Array.from(document.querySelectorAll(".preset"));
const schemeSections = Array.from(document.querySelectorAll(".color-section"));

const colorFields = {
  light: {
    picker: document.getElementById("lightColorPicker"),
    text: document.getElementById("lightColorText"),
    code: document.getElementById("lightColorCode"),
    preview: document.getElementById("lightColorPreview")
  },
  dark: {
    picker: document.getElementById("darkColorPicker"),
    text: document.getElementById("darkColorText"),
    code: document.getElementById("darkColorCode"),
    preview: document.getElementById("darkColorPreview")
  }
};

const systemThemeMedia = window.matchMedia(SYSTEM_THEME_QUERY);

function normalizeColor(value) {
  if (typeof value !== "string") {
    return DEFAULT_SETTINGS.lightColor;
  }

  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    return `#${prefixed[1]}${prefixed[1]}${prefixed[2]}${prefixed[2]}${prefixed[3]}${prefixed[3]}`.toLowerCase();
  }

  return prefixed.toLowerCase();
}

function isValidHexColor(value) {
  return HEX_COLOR_PATTERN.test(value);
}

function normalizeVariant(value) {
  return value === "dark" ? "dark" : "light";
}

function normalizeThemeMode(value) {
  return value === "manual" ? "manual" : "system";
}

function getSystemVariant() {
  return systemThemeMedia.matches ? "dark" : "light";
}

function getSelectedValue(inputs, fallback) {
  const selected = inputs.find((input) => input.checked);
  return selected ? selected.value : fallback;
}

function setSelectedValue(inputs, nextValue) {
  inputs.forEach((input) => {
    input.checked = input.value === nextValue;
  });
}

function setStatus(message, tone) {
  statusText.textContent = message;
  statusText.dataset.tone = tone || "";
}

function getPageType(urlValue) {
  try {
    const url = new URL(urlValue);

    if (!/\.feishu\.cn$/i.test(url.hostname)) {
      return "";
    }

    if (/^\/docx\//i.test(url.pathname)) {
      return "docx";
    }

    if (/^\/wiki\//i.test(url.pathname)) {
      return "wiki";
    }

    return "";
  } catch (error) {
    return "";
  }
}

function getActiveVariant(themeMode, manualVariant) {
  if (normalizeThemeMode(themeMode) === "manual") {
    return normalizeVariant(manualVariant);
  }

  return getSystemVariant();
}

function getVariantLabel(variant) {
  return normalizeVariant(variant) === "dark" ? "暗色配置" : "浅色配置";
}

function updateSystemThemeText() {
  systemThemeText.textContent = `系统当前：${getSystemVariant() === "dark" ? "深色" : "浅色"}`;
}

function syncColorFields(scheme, nextColor) {
  const field = colorFields[scheme];

  if (!field) {
    return;
  }

  field.picker.value = nextColor;
  field.text.value = nextColor;
  field.code.textContent = nextColor;
  field.preview.style.background = nextColor;

  presetButtons.forEach((button) => {
    const isMatch = button.dataset.scheme === scheme && normalizeColor(button.dataset.color || "") === nextColor;
    button.classList.toggle("is-active", isMatch);
  });
}

function getDraftSettings() {
  return {
    enabled: enabledInput.checked,
    themeMode: normalizeThemeMode(getSelectedValue(themeModeInputs, DEFAULT_SETTINGS.themeMode)),
    manualVariant: normalizeVariant(getSelectedValue(manualVariantInputs, DEFAULT_SETTINGS.manualVariant)),
    lightColor: normalizeColor(colorFields.light.text.value || colorFields.light.picker.value),
    darkColor: normalizeColor(colorFields.dark.text.value || colorFields.dark.picker.value)
  };
}

function updateVariantState(settings = getDraftSettings()) {
  const activeVariant = getActiveVariant(settings.themeMode, settings.manualVariant);
  const isManual = settings.themeMode === "manual";
  const isEnabled = settings.enabled;

  manualVariantField.hidden = !isManual;
  manualVariantInputs.forEach((input) => {
    input.disabled = !isEnabled || !isManual;
  });

  manualVariantText.textContent = `当前固定：${getVariantLabel(settings.manualVariant)}`;
  activeSchemeText.textContent = `当前生效：${getVariantLabel(activeVariant)}`;

  schemeSections.forEach((section) => {
    const scheme = section.dataset.scheme === "dark" ? "dark" : "light";
    const isActive = scheme === activeVariant;
    section.dataset.active = isActive ? "true" : "false";
    section.style.opacity = isEnabled && !isActive ? "0.88" : "1";
  });
}

function toggleFormState(isEnabled) {
  themeModeInputs.forEach((input) => {
    input.disabled = !isEnabled;
  });

  Object.values(colorFields).forEach(({ picker, text }) => {
    picker.disabled = !isEnabled;
    text.disabled = !isEnabled;
  });

  presetButtons.forEach((button) => {
    button.disabled = !isEnabled;
  });

  updateVariantState();
}

function sanitizeSettings(items) {
  const legacyColor = isValidHexColor(normalizeColor(items.color || "")) ? normalizeColor(items.color) : DEFAULT_SETTINGS.lightColor;
  const lightColor = isValidHexColor(normalizeColor(items.lightColor || "")) ? normalizeColor(items.lightColor) : legacyColor;
  const darkColor = isValidHexColor(normalizeColor(items.darkColor || "")) ? normalizeColor(items.darkColor) : legacyColor;

  return {
    enabled: Boolean(items.enabled),
    themeMode: normalizeThemeMode(items.themeMode),
    manualVariant: normalizeVariant(items.manualVariant),
    lightColor,
    darkColor
  };
}

function renderSettings(settings) {
  enabledInput.checked = settings.enabled;
  setSelectedValue(themeModeInputs, settings.themeMode);
  setSelectedValue(manualVariantInputs, settings.manualVariant);

  syncColorFields("light", settings.lightColor);
  syncColorFields("dark", settings.darkColor);
  updateSystemThemeText();
  toggleFormState(settings.enabled);
  updateVariantState(settings);
}

function renderPageHint() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [activeTab] = tabs;
    const pageType = getPageType(activeTab?.url || "");

    if (!activeTab || !pageType) {
      pageHint.textContent = "当前标签页不是目标飞书页面，设置会在打开匹配页面后自动生效。";
      return;
    }

    if (pageType === "docx") {
      pageHint.textContent = "当前标签页是飞书文档，支持随浏览器浅色或深色模式自动切换。";
      return;
    }

    if (pageType === "wiki") {
      pageHint.textContent = "当前标签页是飞书知识库，文档模式支持主题跟随，表格块暂不处理。";
      return;
    }

    pageHint.textContent = "当前标签页不是已支持的飞书文档或知识库页面。";
  });
}

function loadSettings() {
  chrome.storage.local.get({ ...LEGACY_DEFAULTS, ...DEFAULT_SETTINGS }, (items) => {
    renderSettings(sanitizeSettings(items));
  });
}

function notifyActiveTab(settings) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [activeTab] = tabs;

    if (!activeTab || typeof activeTab.id !== "number") {
      setStatus("设置已保存，未找到当前标签页。", "success");
      return;
    }

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "feishu-bg:update",
        payload: settings
      },
      () => {
        if (chrome.runtime.lastError) {
          setStatus("设置已保存。打开飞书目标页面后会自动生效。", "success");
          return;
        }

        setStatus("设置已保存，并已通知当前页面刷新样式。", "success");
      }
    );
  });
}

function persistSettings() {
  const settings = getDraftSettings();

  if (!isValidHexColor(settings.lightColor) || !isValidHexColor(settings.darkColor)) {
    setStatus("颜色格式无效，请输入 #RGB 或 #RRGGBB。", "error");
    return;
  }

  applyButton.disabled = true;
  setStatus("正在保存设置...", "");

  chrome.storage.local.set(settings, () => {
    applyButton.disabled = false;

    if (chrome.runtime.lastError) {
      setStatus("保存失败，请稍后重试。", "error");
      return;
    }

    renderSettings(settings);
    notifyActiveTab(settings);
  });
}

enabledInput.addEventListener("change", () => {
  toggleFormState(enabledInput.checked);
  setStatus("", "");
});

themeModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateVariantState();
    setStatus("", "");
  });
});

manualVariantInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateVariantState();
    setStatus("", "");
  });
});

Object.entries(colorFields).forEach(([scheme, field]) => {
  field.picker.addEventListener("input", () => {
    const nextColor = field.picker.value.toLowerCase();
    field.text.value = nextColor;
    field.code.textContent = nextColor;
    field.preview.style.background = nextColor;
    presetButtons.forEach((button) => {
      const isMatch = button.dataset.scheme === scheme && normalizeColor(button.dataset.color || "") === nextColor;
      button.classList.toggle("is-active", isMatch);
    });
    setStatus("", "");
  });

  field.text.addEventListener("input", () => {
    const normalized = normalizeColor(field.text.value);

    if (isValidHexColor(normalized)) {
      field.picker.value = normalized;
      field.code.textContent = normalized;
      field.preview.style.background = normalized;
      presetButtons.forEach((button) => {
        const isMatch = button.dataset.scheme === scheme && normalizeColor(button.dataset.color || "") === normalized;
        button.classList.toggle("is-active", isMatch);
      });
    }

    setStatus("", "");
  });

  field.text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      persistSettings();
    }
  });
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const scheme = button.dataset.scheme === "dark" ? "dark" : "light";
    const color = normalizeColor(button.dataset.color || DEFAULT_SETTINGS[`${scheme}Color`]);
    syncColorFields(scheme, color);
    updateVariantState();
    setStatus(`已选择${scheme === "dark" ? "暗色" : "浅色"}推荐色 ${color}，点击“保存并应用”后生效。`, "");
  });
});

applyButton.addEventListener("click", persistSettings);

systemThemeMedia.addEventListener("change", () => {
  updateSystemThemeText();
  updateVariantState();
});

loadSettings();
renderPageHint();
