# Feishu Background

一个基于 Chrome Manifest V3 的轻量浏览器插件，用来给飞书页面增加自定义阅读背景色。当前版本支持跟随浏览器浅色或深色模式，并在保证性能开销可控的前提下，覆盖文档页与表格页的默认底色。

## 当前支持状态

- `docx` 文档模式：已稳定支持。
- `wiki` 普通文档模式与左侧目录：已稳定支持。
- `sheets` 表格页：支持默认单元格背景与主要渲染层底色。
- `wiki` 表格引擎页：支持默认单元格背景与主要渲染层底色。

## 生效路径

插件只会注入到以下飞书页面：

- `https://*.feishu.cn/docx/*`
- `https://*.feishu.cn/wiki/*`
- `https://*.feishu.cn/sheets/*`

## 功能说明

- 提供插件开关。
- 支持自定义十六进制背景色。
- 支持两套背景配置：浅色模式与暗色模式。
- 支持两种颜色策略：跟随浏览器浅色或深色模式自动切换，或手动固定为浅色配置/暗色配置。
- 提供优化过的弹窗 UI、推荐色板、当前系统主题提示与当前标签页状态提示。
- 表格页只修改默认底色通道，不强制覆盖自定义单元格填充色、文字、边框或选中高亮。
- 内置默认色板已更新为浅色模式 `#FAF9F6`、`#F5F5DC`、`#C7EDCC`、`#E5E5E5`，暗色模式 `#282828`、`#1E1E1E`。
- 使用 `content_scripts` 注入高优先级样式。
- 使用 `chrome.storage.local` 本地保存设置，不做多设备同步。
- 采用轻量化状态同步策略，只同步颜色变量与 SPA 路由变化，不再使用重型 DOM 扫描。
- 提供参考飞书视觉语言设计的插件 logo 和扩展图标。

## 文件结构

- `manifest.json`：MV3 清单。
- `assets/logo.svg`：插件主 logo。
- `icons/`：扩展图标资源。
- `popup.html` / `popup.css` / `popup.js`：插件弹窗设置面板。
- `content.css`：高优先级背景样式。
- `content.js`：设置读取、页面类型判断、系统主题监听、颜色变量同步和 SPA 路由状态更新逻辑。

## 设计与性能策略

- 文档与表格分层处理：`docx/wiki` 文档页继续走阅读背景方案，`sheets/wiki` 表格页只作用于渲染层默认底色。
- 主题跟随优先：通过 `prefers-color-scheme` 在已打开页面上实时切换浅色/暗色配置，不引入后台脚本。
- 表格模式保守支持：仅覆盖主要表格渲染层背景，不做单元格级 DOM 扫描，也不改 canvas 像素。
- 低开销运行：不再使用 `MutationObserver + 全量 DOM 扫描`，避免对飞书加载速度造成明显影响。
- 非目标页面不注入：仅在 `docx/wiki/sheets` 目标页面注入脚本和样式。

## 如何在 Chrome 中加载并测试

1. 打开 Chrome，进入 `chrome://extensions/`。
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择当前项目目录 `FeishuDocBackground`。
5. 打开任一飞书目标页面，例如：
   - `https://qw6xxurweq.feishu.cn/docx/PX7tdzKe0oT2bBxxNSGcovPqnLf`
   - `https://qw6xxurweq.feishu.cn/wiki/AggOwmVTAiD3evkT6CAcJJgenmh`
   - `https://qw6xxurweq.feishu.cn/wiki/VuciwkGMui7P1skj9Q5chBtIn8g`
   - `https://qw6xxurweq.feishu.cn/sheets/AvPKs1VbUhMD66tQLi1cATxRnHd?sheet=8ErWMl`
6. 点击浏览器工具栏中的插件图标。
7. 勾选“启用插件”，选择“跟随系统”或“手动固定”模式，并分别设置浅色/暗色背景。
8. 点击“保存并应用”。
9. 如果当前标签页就是目标飞书页面，背景会立即更新；如果不是，打开目标页面后会自动应用。
10. 当浏览器或系统从浅色切换到深色时，若插件处于“跟随系统”，已打开的飞书页面也会自动切换到对应背景色。

## 排查建议

- 如果飞书页面已经打开但样式未更新，刷新一次页面。
- 如果你修改了源码，回到 `chrome://extensions/` 页面点击“刷新”重新加载插件。
- 如果你测试的是表格页，请注意当前版本只承诺默认底色会变，自定义填充色不会被改写。
