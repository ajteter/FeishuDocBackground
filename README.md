# Feishu Background

一个基于 Chrome Manifest V3 的轻量浏览器插件，仅在以下飞书页面路径生效：

- `https://*.feishu.cn/docx/*`
- `https://*.feishu.cn/sheets/*`
- `https://*.feishu.cn/wiki/*`

## 功能说明

- 提供插件开关。
- 支持自定义十六进制背景色。
- 使用 `content_scripts` 注入高优先级样式。
- 通过 `MutationObserver` 监听飞书 SPA 的动态 DOM 变化，持续覆盖主体容器背景色。
- 监听 `pushState`、`replaceState`、`popstate`、`hashchange`，在飞书单页路由切换后重新应用背景。

## 文件结构

- `manifest.json`：MV3 清单。
- `popup.html` / `popup.css` / `popup.js`：插件弹窗设置面板。
- `content.css`：高优先级背景样式。
- `content.js`：飞书页面容器识别、设置读取、DOM 监听和样式重应用逻辑。

## 如何在 Chrome 中加载并测试

1. 打开 Chrome，进入 `chrome://extensions/`。
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择当前项目目录 `FeishuDocBackground`。
5. 打开任一飞书目标页面，例如：
   - `https://qw6xxurweq.feishu.cn/docx/PX7tdzKe0oT2bBxxNSGcovPqnLf`
   - `https://qw6xxurweq.feishu.cn/wiki/AggOwmVTAiD3evkT6CAcJJgenmh`
   - `https://qw6xxurweq.feishu.cn/wiki/VuciwkGMui7P1skj9Q5chBtIn8g`
6. 点击浏览器工具栏中的插件图标。
7. 勾选“启用插件”，输入或选择颜色后点击“确认生效”。
8. 如果当前标签页就是目标飞书页面，背景会立即更新；如果不是，打开目标页面后会自动应用。

## 排查建议

- 如果飞书页面已经打开但样式未更新，刷新一次页面。
- 如果你修改了源码，回到 `chrome://extensions/` 页面点击“刷新”重新加载插件。
