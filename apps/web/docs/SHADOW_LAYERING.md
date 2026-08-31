# Classworks 阴影与层级系统（Shadow & Layering）

> 本文档关注 **box-shadow（阴影）** 与 **z-index（层级）** 系统。
>
> 描述**当前实现状态**，与 `src/styles/tokens.scss` 同步演进。若涉及具体样式改动，以代码为准。

---

## 一、阴影系统

### 1.1 设计 Token 层（tokens.scss）

#### 基础梯度（8 级，亮/暗双模式）

`tokens.scss` 定义完整的 8 级 Apple 风格阴影 token，覆盖亮色/暗色双模式：

| Token 级别     | 亮色模式                          | 暗色模式                          |
| -------------- | --------------------------------- | --------------------------------- |
| `--shadow-2xs` | `0 1px 2px -1px rgba(0,0,0,0.04)` | `0 1px 2px -1px rgba(0,0,0,0.30)` |
| `--shadow-xs`  | `0 1px 2px 0 rgba(0,0,0,0.04)`    | `0 1px 2px 0 rgba(0,0,0,0.30)`    |
| `--shadow-sm`  | 双层，alpha 0.05                  | 双层，alpha 0.36                  |
| `--shadow`     | 双层，alpha 0.05/0.06             | 双层，alpha 0.36/0.40             |
| `--shadow-md`  | 双层，alpha 0.05/0.06             | 双层，alpha 0.36/0.44             |
| `--shadow-lg`  | 双层，alpha 0.05/0.08             | 双层，alpha 0.40/0.50             |
| `--shadow-xl`  | 双层，alpha 0.06/0.10             | 双层，alpha 0.44/0.55             |
| `--shadow-2xl` | 单层大范围，alpha 0.12            | 单层大范围，alpha 0.60            |

**设计特征**：

- 多层叠加（除 `--shadow-2xs` / `--shadow-xs` / `--shadow-2xl`），外层主阴影 + 内层辅助阴影
- X 偏移均为 `0`（正上方光源），符合 Apple HIG 光源模型
- 负 spread 值使阴影边缘收敛于元素边界内
- 暗色模式 alpha 值显著提高（约 6-7 倍），保证暗背景上阴影可见

#### 语义别名

将语义意图映射到基础梯度，供组件直接引用：

| Token              | 指向          | 用途             |
| ------------------ | ------------- | ---------------- |
| `--shadow-hover`   | `--shadow-md` | 默认悬浮提升     |
| `--shadow-card`    | `--shadow`    | 标准卡片静置态   |
| `--shadow-raised`  | `--shadow-lg` | 浮动面板、弹出层 |
| `--shadow-overlay` | `--shadow-xl` | 对话框、全屏遮罩 |
| `--shadow-fab`     | `--shadow-lg` | 浮动操作按钮     |

#### 特殊效果 token

| Token                                   | 值                                      | 用途                 |
| --------------------------------------- | --------------------------------------- | -------------------- |
| `--shadow-ring`                         | `0 0 0 2px rgba(primary, 0.3)`          | 键盘焦点环           |
| `--shadow-primary-glow`                 | `0 0 15px rgba(primary, 0.7)`           | 品牌色发光           |
| `--shadow-text`                         | `0 1px 4px rgba(0,0,0,0.5)`（暗色 0.7） | 图片背景上文字可读性 |
| `--shadow-glow-sm` / `--shadow-glow-lg` | 白色脉冲发光                            | 紧急通知动画         |

#### Vuetify elevation 对齐

`--v-shadow-key-opacity` / `--v-shadow-ambient-opacity` 在运行时调整 Vuetify elevation 阴影透明度（亮色 0.06/0.05，暗色 0.44/0.36），使 `elevation="0".."5"` 输出的 box-shadow 视觉上与 Apple token 体系一致。Vuetify 的空间值（偏移/blur/spread）保持 Material 默认。

**elevation → token 映射**（约等视觉权重）：

```
elevation 0 → none
elevation 1 → --shadow-xs
elevation 2 → --shadow-sm
elevation 3 → --shadow-md
elevation 4 → --shadow-lg
elevation 5 → --shadow-xl
```

### 1.2 消费现状

#### 语义 token 消费（已统一）

| 文件                             | 上下文                                                            |
| -------------------------------- | ----------------------------------------------------------------- |
| `home/FloatingToolbar.vue`       | `.floating-toolbar-container` 使用 `var(--shadow-raised)`         |
| `common/GlobalMessage.vue`       | `.message-stack` 使用 `var(--shadow-hover)`                       |
| `common/MessageLog.vue`          | 使用 `var(--shadow-sm)`                                           |
| `editing/ExamConfigEditor.vue`   | `.v-card--variant-elevated` 使用 `var(--shadow-hover)`            |
| `home/RandomPicker.vue`          | 模式切换容器使用 `var(--shadow)` / 悬浮使用 `var(--shadow-hover)` |
| `editing/UrgentNotification.vue` | 脉冲发光使用 `var(--shadow-glow-sm)` / `var(--shadow-glow-lg)`    |

#### Vuetify elevation 属性使用分布

| elevation 值 | 使用场景                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`          | `ConciseExamCard`、`ExamConfigEditor` 内部子卡片、`FloatingToolbar` 子按钮                                                                    |
| `1`          | App bars（`list/index`、`list/[id]`、`exam-editor/[id]`）、`settings.vue`、`examschedule`、`cses2wakeup`、`TeacherListCard`/`StudentListCard` |
| `2`          | `AppHeader`、`TimeCard`、`HitokotoCard`、`ExamConfigEditor` 主卡片                                                                            |
| `3`          | `KvInitialize`、`ChatWidget`、`AboutCard`、`FirstTimeGuide`                                                                                   |
| `4`          | `InitServiceChooser`（x3）、`FloatingToolbar`                                                                                                 |
| `5`          | `UrgentNotification`                                                                                                                          |

#### 特殊阴影类型

- **文字阴影**：`BackgroundSettingsCard.vue` 使用 `--shadow-text` 语义，提高图片背景上文字可读性
- **品牌色阴影**：`AboutCard.vue` 捐赠按钮使用 `rgba(var(--v-theme-primary), 0.3)` 生成品牌色阴影
- **消除阴影**：`home/FloatingICP.vue` 显式 `box-shadow: none`；`global.scss` 中 `.v-btn--disabled` 强制 `box-shadow: none`

### 1.3 设计规则：卡片悬浮不变化

按 AGENTS.md 设计规则，卡片在鼠标悬浮时**不得上浮、改变阴影层级或产生变换**。悬浮反馈通过透明度（`--state-hover-opacity`）表达，按下通过轻微缩放（`--state-active-scale`）表达。此规则取代了旧版"hover 时从无阴影提升到 `--shadow-md`"的行为。

### 1.4 残留硬编码

| 位置                    | 值                                                         | 说明                                                         |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `home/RandomPicker.vue` | `0 0 24px / 32px rgba(var(--v-theme-primary), 0.45 / 0.6)` | 品牌发光，接近 `--shadow-primary-glow`，可进一步收敛到 token |

其余 `box-shadow: none` 属于显式禁用场景，合理保留。

---

## 二、层级系统（z-index，已 token 化）

### 2.1 z-index Token 体系（tokens.scss）

所有 z-index 值集中定义在 `tokens.scss` 的 `--z-*` 变量中，组件一律通过 `var(--z-*)` 引用。**全项目无硬编码 z-index 数字**。

| Token            | 值   | 用途                                                                                           |
| ---------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `--z-base`       | 0    | 背景图片（`App.vue`）                                                                          |
| `--z-overlay`    | 1    | 背景遮罩（`App.vue`）                                                                          |
| `--z-content`    | 2    | 主内容（`App.vue`）                                                                            |
| `--z-move`       | 3    | FLIP 过渡移动项（`transitions.scss`）                                                          |
| `--z-inner`      | 2    | 局部 stacking context 内部（`UrgentNotification` 关闭按钮、`BackgroundSettingsCard` 上传文字） |
| `--z-toolbar`    | 10   | `TimeCard` 全屏工具栏                                                                          |
| `--z-float`      | 100  | 浮动元素（`FloatingToolbar`、`FloatingICP`）                                                   |
| `--z-float-top`  | 101  | 浮动元素上层（`FloatingToolbar` 侧边按钮）                                                     |
| `--z-app-bar`    | 1000 | 对齐 Vuetify `v-app-bar` 隐式层级                                                              |
| `--z-chat`       | 1100 | `ChatWidget` 切换按钮                                                                          |
| `--z-chat-panel` | 1101 | `ChatWidget` 面板（高于切换按钮）                                                              |
| `--z-toast`      | 9999 | `GlobalMessage` 全局消息栈（始终置顶）                                                         |

### 2.2 层级结构

#### 页面层级栈（App.vue）

```
z-index: 0  ─── 背景图片（.app-background-image）
z-index: 1  ─── 背景遮罩（.app-background-overlay）
z-index: 2  ─── 主内容（.app-content）
```

#### 浮动元素层级栈

```
z-index: 10    ─── TimeCard 全屏工具栏（--z-toolbar）
z-index: 100   ─── FloatingToolbar 容器 / FloatingICP（--z-float）
z-index: 101   ─── FloatingToolbar 侧边按钮（--z-float-top）
z-index: 1000  ─── v-app-bar 对齐层（--z-app-bar）
z-index: 1100  ─── ChatWidget 切换按钮（--z-chat）
z-index: 1101  ─── ChatWidget 面板（--z-chat-panel）
z-index: 9999  ─── GlobalMessage 消息栈（--z-toast）
```

#### Vuetify 隐式层级

`v-dialog`、`v-overlay`、`v-snackbar`、`v-navigation-drawer` 等组件自带 Vuetify 默认 z-index（约 1000-2000+），不占用 `--z-*` token 层。

---

## 三、三套"高度表达"机制的关系

项目同时存在三种"高度表达"机制，现已有明确的协调策略：

| 机制                      | 管理方式      | 是否 token 化                 | 用途             |
| ------------------------- | ------------- | ----------------------------- | ---------------- |
| CSS 基础梯度 `--shadow-*` | `tokens.scss` | 是                            | 规范层           |
| 语义别名 + 特殊效果 token | `tokens.scss` | 是                            | 组件级语义化定制 |
| Vuetify `elevation` prop  | 模板属性      | 部分（经运行时 opacity 对齐） | 快速应用预设阴影 |

Vuetify elevation 已通过 `--v-shadow-key-opacity` / `--v-shadow-ambient-opacity` 与 Apple token 体系对齐，不存在旧版"视觉不一致"问题。

---

## 四、现状总结

### 已收敛

- **z-index 完全 token 化**：`--z-*` 体系，全项目无硬编码魔法数字
- **阴影 token 体系完整**：8 级梯度 + 语义别名 + 特殊效果 + elevation 运行时对齐
- **卡片悬浮行为统一**：按设计规则移除 hover 阴影提升，改用透明度反馈

### 残留

- `RandomPicker` 品牌发光未收敛到 `--shadow-primary-glow`
- elevation 属性与语义别名存在少量重叠用法，可继续梳理
