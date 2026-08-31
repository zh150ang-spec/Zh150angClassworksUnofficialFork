# Classworks 排版系统（Typography System）

> 排版系统 ≠ 间距系统 ≠ 层级系统。
> 排版系统关注：字体选型、字号比例、字重分布、行高策略、字距/词距、文本截断/换行规则、特殊字体变体、渲染质量，以及这些维度的全局一致性。
>
> 本文档描述**当前实现状态**，与 `src/styles/tokens.scss` 同步演进。若涉及具体样式改动，以代码为准。

---

## 一、字体选型体系（Font Stack Architecture）

Classworks 采用**三字体族**架构，全部收敛为 `src/styles/tokens.scss` 中的全局 CSS 变量，Vuetify 编译时 SASS 变量与其保持一致。

### 1.1 全局字体 token（tokens.scss）

| Token          | 值                                                                                                    | 用途                       |
| -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------- |
| `--font-sans`  | `'DM Sans', ui-sans-serif, sans-serif, system-ui`                                                     | 全局正文与标题             |
| `--font-mono`  | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace`                               | 等宽代码、时间数字、调试器 |
| `--font-serif` | `'Noto Serif SC', 'Songti SC', 'Source Han Serif SC', 'Hiragino Sans GB', 'SimSun', system-ui, serif` | 中文古风衬线（一言诗句等） |

### 1.2 主字体 DM Sans

- **加载**：`@fontsource/dm-sans/400/500/600/700.css`，在 `src/main.js` 同步加载
- **Vuetify 编译时**：`src/styles/settings.scss` 中 `$body-font-family` 与 `$heading-font-family` 均设为 `('DM Sans', ui-sans-serif, sans-serif, system-ui)`
- 正文与标题**共用同一字体族**（Apple HIG 做法），通过字重/字号区分层次，而非切换字体

### 1.3 等宽字体（已统一）

等宽场景**统一引用 `--font-mono`**，不再有历史遗留的多种回退栈：

- `src/styles/global.scss`：

```scss
pre,
code,
.v-code,
.monospace {
  font-family: var(--font-mono) !important;
}
```

- 组件级消费 `var(--font-mono)`：`TimeCard`（时间数字）、`SettingsExplorer`、`KvDatabaseCard`、`ExamConfigEditor`（JSON 预览）、`FirstTimeGuide`、`socket-debugger`、`examschedule`

### 1.4 衬线字体（已 token 化）

- `src/styles/global.scss` 提供 `.serif-font { font-family: var(--font-serif); }`
- `home/HitokotoCard.vue` 诗句与作者均使用 `var(--font-serif)`

---

## 二、字号系统（Type Scale）

### 2.1 Vuetify MD3 语义化字号（主力系统）

项目大量使用 Vuetify 语义化字号类，作为排版骨架：

| 语义类名              | 典型使用场景                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `text-headline-large` | 调试器统计数值（`socket-debugger`）                                                             |
| `text-headline-small` | 设置页标题、卡片标题、服务选择卡片（`settings.vue`、`PwaInstallCard`、`InitServiceChooser` 等） |
| `text-body-large`     | 设置项标签、内容描述                                                                            |
| `text-body-medium`    | 正文内容、设置值                                                                                |
| `text-body-small`     | 次要说明、标签、时间戳                                                                          |
| `text-label-large`    | 表单标签（`SettingsLinkGenerator` 等）                                                          |

**注意**：`text-title-*` 与 `text-display-*` 层级**未使用**——从 `text-headline-small` 直接落到 `text-body-large`，中间缺少过渡层级，属于已知缺口。

### 2.2 硬编码字号（遗留问题）

部分组件仍在 `<style>` 中硬编码字号，是排版系统当前的主要碎片化来源：

| 字号              | 场景                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `40px !important` | `InitServiceChooser` 移动端图标                                                           |
| `28px`            | `InitServiceChooser` 标题                                                                 |
| `2rem`            | `UrgentNotification` 标题                                                                 |
| `15px / 14px`     | `NotebookHomeworkDialog` 标签、`GlobalMessage`、`FloatingICP`                             |
| `13px / 12px`     | `ExamConfigEditor`、`HomeworkEditDialog`、`ChatWidget`、`socket-debugger`、`examschedule` |
| `11px / 10px`     | `ChatWidget`、`socket-debugger`                                                           |
| `1rem`            | `RandomPicker`                                                                            |

### 2.3 相对字号（em 继承）

作业内容系统使用 `em` 实现层级继承：`.hw-h2`（1.2em）、`.hw-h3`（1.1em）、`.hw-notebook-*`（0.9em）等。设计合理，支持可缩放富文本层级。

### 2.4 流式字号（Fluid Type）

`home/TimeCard.vue` 全屏模式使用 `clamp()` 实现视口自适应：

| 元素         | 字号范围                               |
| ------------ | -------------------------------------- |
| 全屏时间数字 | `clamp(2rem, 12vw, 8rem)`              |
| 极简全屏     | `clamp(4rem, 15vw, 12rem)`             |
| 秒数         | `0.45em`（相对父级，始终为分钟的 45%） |
| 日期行       | `clamp(1rem, 3vw, 2.2rem)`             |
| 停表/计时器  | `clamp(3rem, 10vw, 8rem)`              |

---

## 三、字重系统（已 token 化）

`tokens.scss` 定义 5 级字重 token：

| Token                    | 值  | 用途                                              |
| ------------------------ | --- | ------------------------------------------------- |
| `--font-weight-light`    | 300 | 极轻描述（作业内容 `.hw-notebook-desc`，仅 1 处） |
| `--font-weight-regular`  | 400 | 正文默认                                          |
| `--font-weight-emphasis` | 500 | 次强调、时间戳                                    |
| `--font-weight-label`    | 600 | 设置标签、按钮                                    |
| `--font-weight-heading`  | 700 | 标题、强强调                                      |

组件仍可通过 Vuetify utility class（`font-weight-bold` / `font-weight-medium`）或 `font-weight` 属性使用。`@fontsource/dm-sans` 加载 400/500/600/700 覆盖上述大部分场景。

---

## 四、行高系统（已 token 化）

`tokens.scss` 定义 4 级行高 token：

| Token                        | 值  | 场景                                                    |
| ---------------------------- | --- | ------------------------------------------------------- |
| `--line-height-heading`      | 1.2 | 标题（`global.scss` 中 `.text-h2` / `.text-h3` 已消费） |
| `--line-height-body`         | 1.6 | 正文                                                    |
| `--line-height-code`         | 1.5 | 代码                                                    |
| `--line-height-preformatted` | 1.8 | 预格式化文本                                            |

---

## 五、字距系统（已 token 化）

`tokens.scss` 定义 4 级字距 token：`--tracking-normal: 0em`、`--tracking-tight: -0.02em`、`--tracking-wide: 0.05em`、`--tracking-display: 0.25em`。

字距使用克制，主要在时间卡片大字号场景（全屏数字约 8px 宽字距）与标签场景。

---

## 六、文本换行与截断

- **Vuetify utility**：`text-truncate`（单行截断）、`text-wrap`
- **局部硬编码**：`white-space: nowrap / pre-wrap / normal`、`word-break: break-word / break-all`（`SettingItem`、`ExamConfigEditor`、`HitokotoSettings` 等）

---

## 七、文本渲染质量（已完成优化）

`src/styles/global.scss` 中 `html` 元素已启用：

```scss
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

**字体变体**：`TimeCard` 全屏数字使用 `font-variant-numeric: tabular-nums`，确保数字等宽对齐，防止时间跳动时布局抖动。

---

## 八、现状总结

### 已收敛

- 字体族三族全部 token 化（`--font-sans` / `--font-mono` / `--font-serif`），等宽字体历史遗留的多种回退栈问题已消除
- 行高、字重、字距均建立全局 token
- 文本渲染优化（antialiased / optimizeLegibility）已全局启用
- 衬线字体已提供 `.serif-font` 全局规则

### 仍存在的缺口

- **无全局"字号"token**：组件级 `px` / `rem` 硬编码字号仍是主要碎片化来源
- **`text-title-*` 层级被跳过**：headline 与 body 之间缺少过渡层级
- **字号单位混用**（px / rem / em）：尚未建立统一规范
- **行高 token 消费范围有限**：目前仅 `.text-h2` / `.text-h3` 消费 heading 档
