const DEFAULT_SETTINGS = {
  enabled: true,
  color: "#faf9f6"
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const enabledInput = document.getElementById("enabled");
const colorPicker = document.getElementById("colorPicker");
const colorText = document.getElementById("colorText");
const colorCode = document.getElementById("colorCode");
const colorPreview = document.getElementById("colorPreview");
const applyButton = document.getElementById("applyButton");
const statusText = document.getElementById("status");
const pageHint = document.getElementById("pageHint");
const presetButtons = Array.from(document.querySelectorAll(".preset"));

function normalizeColor(value) {
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

function setStatus(message, tone) {
  statusText.textContent = message;
  statusText.dataset.tone = tone || "";
}

function toggleColorInputs(isEnabled) {
  colorPicker.disabled = !isEnabled;
  colorText.disabled = !isEnabled;
  presetButtons.forEach((button) => {
    button.disabled = !isEnabled;
  });
}

function syncColorFields(nextColor) {
  colorPicker.value = nextColor;
  colorText.value = nextColor;
  colorCode.textContent = nextColor;
  colorPreview.style.background = nextColor;
  presetButtons.forEach((button) => {
    button.classList.toggle("is-active", normalizeColor(button.dataset.color || "") === nextColor);
  });
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

function renderPageHint() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [activeTab] = tabs;
    const pageType = getPageType(activeTab?.url || "");

    if (!activeTab || !pageType) {
      pageHint.textContent = "当前标签页不是目标飞书页面，设置会在打开匹配页面后自动生效。";
      return;
    }

    if (pageType === "docx") {
      pageHint.textContent = "当前标签页是飞书文档，文档模式支持稳定。";
      return;
    }

    if (pageType === "wiki") {
      pageHint.textContent = "当前标签页是飞书知识库，普通文档模式支持稳定，表格块暂不处理。";
      return;
    }

    pageHint.textContent = "当前标签页不是已支持的飞书文档或知识库页面。";
  });
}

function loadSettings() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
    const color = isValidHexColor(items.color) ? normalizeColor(items.color) : DEFAULT_SETTINGS.color;

    enabledInput.checked = Boolean(items.enabled);
    syncColorFields(color);
    toggleColorInputs(enabledInput.checked);
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
  const candidateColor = normalizeColor(colorText.value || colorPicker.value);

  if (!isValidHexColor(candidateColor)) {
    setStatus("颜色格式无效，请输入 #RGB 或 #RRGGBB。", "error");
    return;
  }

  const settings = {
    enabled: enabledInput.checked,
    color: candidateColor.toLowerCase()
  };

  applyButton.disabled = true;
  setStatus("正在保存设置...", "");

  chrome.storage.local.set(settings, () => {
    applyButton.disabled = false;

    if (chrome.runtime.lastError) {
      setStatus("保存失败，请稍后重试。", "error");
      return;
    }

    syncColorFields(settings.color);
    toggleColorInputs(settings.enabled);
    notifyActiveTab(settings);
  });
}

enabledInput.addEventListener("change", () => {
  toggleColorInputs(enabledInput.checked);
  setStatus("", "");
});

colorPicker.addEventListener("input", () => {
  colorText.value = colorPicker.value.toLowerCase();
  setStatus("", "");
});

colorText.addEventListener("input", () => {
  const normalized = normalizeColor(colorText.value);

  if (isValidHexColor(normalized)) {
    colorPicker.value = normalized.toLowerCase();
    colorCode.textContent = normalized.toLowerCase();
    colorPreview.style.background = normalized.toLowerCase();
  }

  setStatus("", "");
});

colorText.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    persistSettings();
  }
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const color = normalizeColor(button.dataset.color || DEFAULT_SETTINGS.color);
    syncColorFields(color);
    setStatus(`已选择推荐色 ${color}，点击“保存并应用”后生效。`, "");
  });
});

applyButton.addEventListener("click", persistSettings);

loadSettings();
renderPageHint();
