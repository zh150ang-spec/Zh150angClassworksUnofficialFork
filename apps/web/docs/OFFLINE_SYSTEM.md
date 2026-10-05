# 数据可达性与一致性保障系统体系文档

> 本文档描述 Classworks 软件的数据可达性与一致性保障系统（简称"离线系统"）。
> 该系统负责保障数据在各种网络条件下的可达性、一致性与持久性。
> 文档与代码同步演进，反映当前实现的真实状态。

---

## 〇、修复状态（必须与代码一起读）

离线系统曾因**传输层无限重试**而整体失效：axios 响应拦截器的 Promise 永不 settle，
导致本文档中所有失败分支（心跳阈值、`retryOperation`、RMW 降级、离线队列、后台退避）
都成为**不可达的死代码**。以下批次已完成：

| 批次 | 内容                                                                       | 状态      |
| ---- | -------------------------------------------------------------------------- | --------- |
| 1    | 传输层有界重试（`netRetryPolicy.js`）、心跳成为 `serverReachable` 唯一权威 | ✅ 已实施 |
| 2    | 错误码保真、RMW fail-closed、云端单存储内存暂存、冲突通知常驻              | ✅ 已实施 |
| 3    | 跨标签可中止租约、`scheduleImmediate` 退避不再重置、本地写失败可见性       | ✅ 已实施 |
| 4    | SW 提示式更新（去掉无条件 skipWaiting、补 SKIP_WAITING、未保存守卫）       | ✅ 已实施 |

**三条不可违反的不变量**（改动离线系统前请先读这一段）：

1. **有界**：任何对外可见的 `await` 都有时间预算。交互请求 ≤ 12s、心跳 ≤ 6s、单次后台请求 ≤ 45s。
2. **单一时钟真相（有一个明确的例外）**：`serverReachable = false` 默认**只能**由心跳连续失败触发；
   业务请求失败只提供"证据"（`noteRequestFailure`）。**唯一例外**：双存储模式下
   **云端写入失败 + 本地写入成功**时，`saveData` 立即 `markServerUnreachable()`
   （见 §4.1，产品要求：立刻切到本地优先快路径，避免每次保存都为云端失败等满超时）。
3. **持久重试只在队列层**：传输层有界快速失败，持久重试由离线队列 / `backgroundSync` 承担。

---

## 阅读指南：本文档的结构

本文档**严格区分**通用机制和双存储专属机制，分为三部分：

| 部分         | 适用范围                                                          | 包含内容                                                           |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| **第一部分** | **所有存储模式**（local / kv-server / classworkscloud / dual-\*） | PWA 资源缓存、IndexedDB 本地存储、网络状态检测、数据读写入口       |
| **第二部分** | **仅双存储模式**（dual-cloud / dual-server）                      | 数据合并、后台同步、离线队列、命名空间切换、角色感知、手动全量同步 |
| **第三部分** | 附录                                                              | 文件清单、设计边界                                                 |

**如果你在使用单存储模式（local / kv-server / classworkscloud），请只看第一部分。
第二部分的所有机制在你的模式下完全不生效。**

---

# 第一部分：通用基础（所有存储模式生效）

> 本部分内容在所有 5 种存储模式下都生效。
> 无论你用哪种模式，PWA 资源缓存、IndexedDB 本地存储、网络状态检测都会工作。

## 一、总体架构

### 1.1 系统定位与功能范围

本系统的核心职责是**保障数据可达性与一致性**，具体实现以下功能：

| 功能              | 适用范围     | 说明                                      | 涉及模块                  |
| ----------------- | ------------ | ----------------------------------------- | ------------------------- |
| 应用Shell离线可用 | 通用         | 无网络时应用本身仍可加载和运行            | PWA Service Worker        |
| 本地数据持久化    | 通用         | 用户数据本地存储，不依赖网络即可读写      | IndexedDB                 |
| 资源缓存策略      | 通用         | 静态资源分级缓存，平衡新鲜度和可用性      | Workbox 策略              |
| 应用更新通知      | 通用         | 新版本Service Worker就绪后提示用户刷新    | SwUpdateNotification      |
| 持久化保护        | 通用         | 防止浏览器自动清理本地数据                | navigator.storage.persist |
| 网络状态感知      | 通用         | 实时检测浏览器在线状态和服务器可达性      | networkStatus 心跳        |
| 离线编辑          | **仅双存储** | 网络断开时仍可编辑数据，恢复后同步        | 离线队列 + 后台同步       |
| 数据合并          | **仅双存储** | 双存储场景下本地与云端数据按策略合并      | mergeData                 |
| 双向同步          | **仅双存储** | 本地与云端数据互相补充缺失项              | backgroundSync 三阶段     |
| 命名空间隔离      | **仅双存储** | 不同设备/用户数据互相隔离，切换时保护数据 | namespace 检测            |

### 1.2 存储模式总览

通过 `server.provider` 设置项控制，共 5 种模式：

| 模式              | 本地 | 云端 | 说明               | 离线数据机制         |
| ----------------- | ---- | ---- | ------------------ | -------------------- |
| `local`           | ✓    | ✗    | 纯本地，无云端交互 | 不需要（只有一份）   |
| `kv-server`       | ✗    | ✓    | 纯云端，离线不可用 | 不存在（离线无数据） |
| `classworkscloud` | ✗    | ✓    | 同上，使用官方云   | 不存在（离线无数据） |
| `dual-cloud`      | ✓    | ✓    | 双存储，官方云     | **完整生效**         |
| `dual-server`     | ✓    | ✓    | 双存储，自建服务器 | **完整生效**         |

### 1.3 设计原则（按存储模式区分）

#### 单存储模式（local / kv-server / classworkscloud）

| 模式              | 原则                                             |
| ----------------- | ------------------------------------------------ |
| `local`           | **纯本地**：数据只存本地，无云端交互，无同步需求 |
| `kv-server`       | **纯云端**：数据只存云端，离线完全不可用         |
| `classworkscloud` | **纯云端**：同上，使用官方云                     |

单存储模式下，数据只有一份副本，不存在合并问题，也不需要离线队列。
第二部分的所有机制**均不生效**。

#### 双存储模式（dual-cloud / dual-server）

**本地优先，上下一致；云端有的，本地也要；云端缺失，本地补充。**

- **本地优先**：本地数据是用户操作的直接对象，云端是异步同步目标

- **上下一致**：通过后台同步和合并策略，最终本地与云端数据趋于一致

- **数据可达**：云端有的数据本地必须有（下行同步），本地独有的数据要补充到云端（上行同步）

双存储模式下，数据有本地和云端两份副本，第二部分全部机制均生效。

### 1.4 模块全景

系统分为三层：**资源层（PWA）**、**数据层（IndexedDB + HTTP）**、**协调层（同步/网络/角色）**。

```
┌─────────────────────────────────────────────────────────────┐
│ 资源层（PWA Service Worker）—— 【通用】保障应用Shell离线可用   │
│  ├─ sw.js (Workbox injectManifest)                          │
│  │   ├─ precacheAndRoute   ← 构建产物预缓存                  │
│  │   ├─ NetworkFirst       ← 导航请求（8s超时，离线回退页）   │
│  │   ├─ CacheFirst         ← 静态资源（assets/）            │
│  │   ├─ StaleWhileRevalidate ← JS/CSS/图片                  │
│  │   └─ setCatchHandler    ← 离线503回退页                  │
│  ├─ SwUpdateNotification    ← 新版本检测+提示刷新            │
│  ├─ CacheManager            ← postMessage 操作SW缓存        │
│  └─ PwaInstallCard          ← 安装/通知/持久化存储授权       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 数据层 —— 【通用】保障数据持久化                                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ kvLocalProvider.js ← IndexedDB 【通用】               │   │
│  │  ├─ kv store          ← 用户数据（所有模式）          │   │
│  │  ├─ offline-queue store ← 待上传key名单【仅双存储】   │   │
│  │  ├─ system store      ← 系统数据                     │   │
│  │  └─ metadata store    ← 元数据                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ kvServerProvider.js ← HTTP API 【非local模式】        │   │
│  │  ├─ loadData / saveData / loadKeys                  │   │
│  │  └─ loadNamespaceInfo                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 协调层                                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ dataProvider.js ← 【通用】数据读写入口                │   │
│  │  ├─ loadData / saveData     （所有模式）              │   │
│  │  ├─ mergeData               【仅双存储】              │   │
│  │  ├─ syncAllToLocal/Cloud    【仅双存储】              │   │
│  │  ├─ getSyncStatus           【仅双存储】              │   │
│  │  └─ checkNamespaceChange    【仅双存储】              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ backgroundSync.js ← 【仅双存储】后台同步服务           │   │
│  │  ├─ _doSyncPhases (3阶段：队列/上行/下行)            │   │
│  │  ├─ scheduleImmediate (L0) / _scheduleNext (L2)     │   │
│  │  └─ _doImmediateSync (L1退避)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ networkStatus.js ← 【通用】网络状态检测               │   │
│  │  ├─ browserOnline (navigator.onLine)                │   │
│  │  ├─ serverReachable (30s心跳+2次失败阈值，唯一权威)   │   │
│  │  ├─ noteRequestFailure/Success (只记证据)            │   │
│  │  └─ subscribe (事件订阅，L3网络恢复触发)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ netRetryPolicy.js ← 【通用】传输层有界重试策略         │   │
│  │  └─ planRetry: 尝试上限 + 预算 + 错误分类            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ useTokenDisplay.js ← 【仅双存储】角色感知              │   │
│  │  └─ loadTokenInfo → setReadOnlyState(isReadOnly)    │   │
│  │         ↓                    ↓                       │   │
│  │    dataProvider         backgroundSync               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、PWA 资源层（应用Shell离线可用）

PWA（Progressive Web App）层负责保障**应用本身**在离线时仍可加载和运行，
是整个离线系统的基础——如果应用Shell都加载不出来，数据层的离线机制无从谈起。

**适用范围：所有存储模式**。无论你用 local、kv-server 还是 dual，PWA 都会缓存应用资源。

### 2.1 Service Worker（sw\.js）

采用 Workbox `injectManifest` 策略，开发者手写 SW 代码，Workbox 注入预缓存清单。

**预缓存**：构建产物（JS/CSS/HTML/图标/字体/webmanifest）在 SW 安装时全部缓存。

**运行时缓存策略**（按资源类型分级）：

| 资源类型            | 策略                 | 缓存名             | 过期策略    | 说明                         |
| ------------------- | -------------------- | ------------------ | ----------- | ---------------------------- |
| 导航请求            | NetworkFirst         | navigations        | 50条/24h    | 8s超时，优先网络，保证新鲜度 |
| `/assets/` 静态资源 | CacheFirst           | assets-cache       | 200条/365天 | 哈希命名，可永久缓存         |
| JS 文件             | StaleWhileRevalidate | js-cache           | 100条/7天   | 先用缓存，后台更新           |
| CSS 文件            | StaleWhileRevalidate | css-cache          | 50条/7天    | 同上                         |
| HTML 文件           | NetworkFirst         | html-cache         | 20条/24h    | 优先网络                     |
| 图片                | StaleWhileRevalidate | images-cache       | 50条/30天   | 先用缓存，后台更新           |
| CDN (`/cdn-cgi/`)   | NetworkFirst         | cdn-cgi-cache      | 50条/24h    | 10s超时                      |
| 外部资源            | NetworkFirst         | external-resources | 100条/24h   | 10s超时                      |

**离线回退**（`setCatchHandler`）：

- 导航请求失败 → 返回缓存的 `index.html` → 仍失败 → 返回 503 离线提示页

- 图片请求失败 → 返回 SVG 占位图

- 其他请求失败 → 返回 503

### 2.2 应用更新机制（system/SwUpdateNotification.vue + src/sw.js）

- **检测时机**：页面加载后 3 秒首次检查，之后每 1 小时检查一次

- **检测方式**：`navigator.serviceWorker.ready` + `registration.update()`

- **更新流程（提示式，绝不自动刷新）**：

  1. `sw.js` 在 `install` 中**不**调用 `skipWaiting()` → 新 SW 进入 `waiting`（等待）状态
  2. 页面检测到 `updatefound` / `registration.waiting` → 显示"发现新版本"横幅
  3. 用户点击"更新" → 若 `hasUnsavedWork()` 为真则**拒绝更新**并提示先保存；
     否则 `postMessage({ type: 'SKIP_WAITING' })` → SW 端 `self.skipWaiting()` 接管
  4. `controllerchange` 事件触发 → 页面刷新（仅用户已确认时）

- **用户可控**：可点击"稍后"推迟更新；未确认时页面不会刷新

- **未确认却换了 controller**（例如另一个标签页点了更新）：只在"没有未保存内容
  **且**页面不可见（`document.visibilityState === 'hidden'`）"时才静默刷新，
  正在上课的大屏绝不会闪

- **未保存守卫来源**：`src/utils/updateGate.js`。页面用 `registerUnsavedCheck(fn)` 登记
  "是否有未保存内容"（`index.vue` 登记的是 `state.synced === false || loading.upload`）

- **监听器只注册一次**：`updatefound` 监听器在 `checkForUpdate` 中只挂一次，
  避免每小时累积（旧实现每次调用都 `addEventListener`）

> 构建配置：`vite.config.mjs` 中 `registerType: 'prompt'`（曾误设为 `autoUpdate`，
> 但该值在本项目里从未生效——未 import `virtual:pwa-register`，注入的只是朴素注册脚本）。

### 2.3 缓存管理（settings/CacheManager.vue）

通过 `MessageChannel` 与 SW 双向通信，提供以下操作：

| 消息类型           | 作用                    |
| ------------------ | ----------------------- |
| `CACHE_KEYS`       | 列出所有缓存名          |
| `CACHE_CONTENT`    | 列出指定缓存的URL列表   |
| `CLEAR_CACHE`      | 删除指定缓存            |
| `CLEAR_URL`        | 删除指定缓存中的某个URL |
| `CLEAR_ALL_CACHES` | 删除所有缓存            |
| `GET_VERSION`      | 获取SW版本和资源数量    |

通信安全：SW 端校验 `event.origin === self.location.origin`，拒绝跨域消息。

### 2.4 安装与授权（system/PwaInstallCard.vue）

引导用户完成三项授权：

| 授权项     | API                              | 作用                         |
| ---------- | -------------------------------- | ---------------------------- |
| 安装应用   | `beforeinstallprompt`            | 安装为独立应用，快速启动     |
| 通知权限   | `Notification.requestPermission` | 接收作业/考试通知            |
| 持久化存储 | `navigator.storage.persist`      | 防止浏览器自动清理 IndexedDB |

**持久化存储的意义**：未持久化时，浏览器可能在存储压力下自动清理 IndexedDB，
导致离线数据丢失。持久化后浏览器不会自动清理，需用户手动清除。

**安装提示流程**：

1. `App.vue` 监听 `beforeinstallprompt`，preventDefault 后存到 `window.deferredPwaPrompt`
2. 派发 `pwa-prompt-ready` 事件
3. `PwaInstallCard` 接收事件后展示安装按钮
4. 用户点击 → 调用 `deferredPwaPrompt.prompt()` → 等待 `userChoice`

### 2.5 VitePWA 配置

```js
VitePWA({
  registerType: 'autoUpdate', // 自动注册+自动更新
  strategies: 'injectManifest', // 手写SW，Workbox注入清单
  srcDir: 'src',
  filename: 'sw.js',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot,webmanifest}'],
  },
  manifest: {/* 应用图标、名称、快捷方式 */},
})
```

---

## 三、网络状态检测（networkStatus.js）

**适用范围：所有存储模式**。心跳检测在所有模式下都运行（只要配置了服务器），
但在单存储模式下仅用于显示离线状态，不触发同步（因为单存储没有同步机制）。

### 3.1 双层检测

```
effectiveOnline = browserOnline && serverReachable
```

| 状态       | browserOnline | serverReachable | 含义                       |
| ---------- | ------------- | --------------- | -------------------------- |
| 在线       | true          | true            | 完全可用                   |
| 云端不可达 | true          | false           | 浏览器有网，但服务器连不上 |
| 离线       | false         | \*              | 浏览器断网                 |

### 3.2 心跳检测

- **间隔**：30 秒

- **超时**：5 秒

- **重试**：**不重试**（`metadata.retryPolicy.maxAttempts = 1`）。失败必须立刻计数，
  下一次 30s 心跳就是它的重试——否则"连续失败"永远数不满，阈值形同虚设。

- **在途守卫**：上一次心跳未落地时，本次直接跳过。否则挂起的心跳会每 30s 叠一条，造成内存上涨。

- **失败阈值**：连续 2 次失败才标记 `serverReachable = false`

- **实现**：`axios.get` + `validateStatus`（2xx 才算成功）

- **恢复**：任意一次成功（心跳或任意业务请求成功）立即 `markServerReachable()`

- **即时探测**：`probeNow()`（去抖 5s）在业务失败、页面重新可见、浏览器网络恢复时立刻探一次，
  离线判定与恢复都不必等满 30s

### 3.3 事件订阅

通过 `subscribe(callback)` 订阅网络状态变化事件：

| 事件类型  | reason               | 触发条件                                                            |
| --------- | -------------------- | ------------------------------------------------------------------- |
| `online`  | `browser_online`     | 浏览器网络恢复                                                      |
| `online`  | `server_reachable`   | 心跳成功 / 任意业务请求成功                                         |
| `offline` | `browser_offline`    | 浏览器断网                                                          |
| `offline` | `server_unreachable` | 心跳连续失败 2 次，**或**双存储下"云端写失败+本地写成功"（见 §4.1） |

> ⚠️ **读取**失败**不会**产生 `offline` 事件：一次读故障只意味着"这次没读到"，本地通常还有副本，
> 直接宣告离线会让"一阵一阵突然离线又自己好"复现。读取失败只调用 `noteRequestFailure()`。
>
> 唯一的写入例外见 §4.1：云端写入失败且本地写入成功时立即标记离线，
> 目的是让后续保存走本地快路径（不必每次为云端失败等满超时）。恢复仍由心跳负责（≤30s）。

**双存储专属行为**：backgroundSync 订阅 `online` 事件（且 `wasOffline=true`）触发 L3 恢复同步。
单存储模式下无人订阅此事件，事件发出但不触发任何同步。

---

## 四、核心数据流（saveData / loadData 入口）

**适用范围：所有存储模式**。dataProvider 是所有数据读写的统一入口，
内部按存储模式分流。单存储模式直接走对应 provider，双存储模式走合并逻辑。

### 4.1 保存数据（saveData）

```
用户保存
  │
  ▼
dataProvider.saveData(key, data)
  │
  ├─ local 模式 → kvLocalProvider.saveData → 完成
  │  （纯本地，无云端交互，不入队）
  │
  ├─ kv-server/classworkscloud 模式 → kvServerProvider.saveData → 完成
  │  （纯云端，无本地存储，不入队）
  │
  └─ dual 模式 【以下分支仅双存储生效】
      │
      ├─ 在线 (networkStatus.isOnline())
      │   │
      │   ├─ Promise.all([本地保存, 云端保存])
      │   │
      │   ├─ 双成功 → removeKeyFromOfflineQueue → 完成 (source: dual)
      │   ├─ 云端成功，本地失败 → 完成 (source: cloud, localFailed)
      │   ├─ 本地成功，云端失败 → addToOfflineQueue + scheduleImmediate
      │   │                      + **markServerUnreachable（立即离线）** → 完成 (source: local)
      │   └─ 双失败 → 返回错误
      │
      └─ 离线
          │
          └─ kvLocalProvider.saveData → addToOfflineQueue + scheduleImmediate → 完成 (source: local-offline)
```

**关键设计**：

- 本地保存和云端保存并行（`Promise.all`），不串行等待

- 云端失败时**入队**而非丢弃，由 backgroundSync 异步重试（仅双存储）

- `scheduleImmediate()` 触发 L0 立即同步，无需等待定时器（仅双存储）

- **云端写入失败 + 本地写入成功 → 立即 `markServerUnreachable()`**（产品要求）。
  这样做的好处：整个应用立刻切到"离线：仅本地 + 入队"快路径，后续保存不会每次都等云端失败，
  离线横幅也会明确显示"数据已保存到本地"。恢复由心跳负责（≤30s，一次成功即恢复）。
  异常兜底分支（云端写入抛错、随后本地写入成功）同样立即标记离线。

- **读取**失败只调用 `networkStatus.noteRequestFailure()`：只记证据 + 触发一次去抖探测，
  **不翻转全局离线状态**（判定权在心跳）

#### 4.1.1 云端单存储模式的写入暂存（kv-server / classworkscloud）

这两种模式没有本地副本。传输层改为有界快速失败后，写入失败必须有明确落点：

| 情形                      | 行为                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| 写入成功                  | 正常返回                                                                          |
| 可重试失败（网络/5xx）    | 存入**内存暂存** `pendingWriteSpool`（同 key 后写覆盖前写），错误信息含 `spooled` |
| 确定性拒绝（401/403）     | **不暂存**，原样返回错误码（暂存只会永远补写不上）                                |
| 网络恢复（`online` 事件） | 自动补写，补写走 RMW（避免覆盖云端已有数据）；第一项仍失败即停手，保留剩余        |

> ⚠️ 内存暂存**刷新页面即丢失**。需要跨会话不丢，应使用 `dual-*` 模式（本地 IndexedDB + 离线队列）。

### 4.2 读取数据（loadData）

```
dataProvider.loadData(key)
  │
  ├─ local 模式 → kvLocalProvider.loadData → 返回
  │  （纯本地读取，无合并）
  │
  ├─ kv-server/classworkscloud 模式 → kvServerProvider.loadData → 返回
  │  （纯云端读取，无合并）
  │
  └─ dual 模式 【以下分支仅双存储生效】
      │
      ├─ 在线
      │   │
      │   ├─ Promise.all([本地读取, 云端读取])
      │   │
      │   ├─ 双成功 → mergeData(local, cloud, isReadOnly) → 计算合并值hash
      │   │          → 与本地数据hash比较，**不同才回写本地** → 返回合并值
      │   │          （hash相同说明本地已是最新，跳过回写以减少IndexedDB写入频率）
      │   ├─ 云端成功，本地失败 → 回写本地 → 返回云端值
      │   ├─ 本地成功，云端失败 → markServerUnreachable → 返回本地值
      │   └─ 双失败 → 返回错误
      │
      └─ 离线 → kvLocalProvider.loadData → 返回本地值
```

---

---

# 第二部分：双存储专属机制（仅 dual-\* 模式生效）

> **⚠️ 重要说明**
>
> 本部分所有内容**仅在** **`dual-cloud`** **和** **`dual-server`** **模式下生效**。
>
> - `local` 模式：只有本地存储，无云端，不需要以下任何机制
>
> - `kv-server` / `classworkscloud` 模式：只有云端存储，离线无数据，不需要以下任何机制
>
> 如果你在使用单存储模式，**可以跳过整个第二部分**。
>
> 以下机制的核心目的是解决"本地和云端各有副本时如何保持一致"的问题，
> 这个问题在单存储模式下不存在。

---

## 五、数据合并策略（mergeData）

_仅适用于 dual-_ 模式\*。单存储模式不存在合并问题。

合并策略**仅按** **`isReadOnly`** **分流**，不依赖角色（teacher/student/classroom）。

```
mergeData(local, cloud, isReadOnly)
  │
  ├─ 非只读角色（isReadOnly = false）→ 本地优先
  │   │
  │   │  原则：本地是用户操作的直接对象，以本地为准
  │   │  云端只用于补充本地没有的键
  │   │
  │   ├─ 数组：本地非空 → 用本地；本地空云端非空 → 用云端
  │   ├─ 对象：以本地为基底，云端补充本地没有的键
  │   └─ 标量：用本地
  │
  └─ 只读角色（isReadOnly = true）→ 云端优先
      │
      │  原则：只读设备不产生数据，以云端为准
      │  本地只保留云端没有的键（历史缓存）
      │
      ├─ 数组：云端非空 → 用云端；云端空本地非空 → 用本地
      ├─ 对象：以云端为基底，本地补充云端没有的键
      └─ 标量：用云端
```

**空值保护**：无论哪种模式，都不允许用空数组覆盖非空数组，防止数据丢失。

### 5.2 R-M-W（Read-Merge-Write）写入合并机制

**核心问题**：多设备同时写入同一个 key 时，直接覆盖会导致后写者丢失先写者的数据。RMW 通过"先读后合并再写入"解决此问题。

**仅作用于** **`dataProvider.saveData`** **的云端写入路径和后台同步（backgroundSync）的部分阶段**。手动全量同步（syncAllToCloud）**不**使用 RMW。

#### 5.2.1 为什么需要 RMW

场景：设备 A 和设备 B 同时向云端写入同一个 key。

- 若直接覆盖：A 先写，B 后写 → A 的数据被 B 完全覆盖，A 的数据丢失

- 若使用 RMW：A 先写成功；B 写入时先读取云端（已包含 A 的数据），合并后再写入 → 双方数据都保留

#### 5.2.2 RMW 工作流程

```
rmwWriteServer(key, data, provider = kvServerProvider)
  │
  ├─ ⚠️ Read 失败（非 404）→ **拒绝写入**，返回 SERVER_READ_FAILED（fail-closed）
  │   （读不到 ≠ 云端没有；写入交给离线队列/内存暂存稍后重试）
  │
  ├─ 第1次尝试
  │   ├─ Read  → kvServerProvider.loadData(key) → current（云端当前值）
  │   ├─ Merge → additiveMerge(current, data)   → merged
  │   └─ Write → kvServerProvider.saveData(key, merged)
  │       ├─ 成功 → 返回成功
  │       └─ 失败 → 继续第2次尝试
  │
  ├─ 第2次尝试（重试1）
  │   ├─ Read  → 重新读取云端（可能已被其他设备修改）
  │   ├─ Merge → 重新合并
  │   └─ Write → 再次写入
  │       ├─ 成功 → 返回成功
  │       └─ 失败 → 继续第3次尝试
  │
  └─ 第3次尝试（重试2）
      ├─ Read / Merge / Write
      └─ 仍失败 → 返回 SERVER_SAVE_ERROR
```

**重试上限**：`RMW_MAX_RETRIES = 2`，即最多尝试 3 次（1 次原始 + 2 次重试）。

**读失败的判定（fail-closed）**：只有两种情况允许写入——

1. 读取成功 → 正常合并后写入；
2. provider 明确返回 `NOT_FOUND`（404，键确实不存在）→ 新建写入。

`current` 为 `undefined`/`null`（provider 未返回任何内容）同样视为读失败。
修复前所有读失败都会被当成"云端没有数据"而跳过合并直接覆盖，一次读取故障即可冲掉云端数据。

#### 5.2.3 合并策略：additiveMerge

RMW 使用的合并策略与读取时的 `mergeData` 完全不同：

| 数据类型 | 合并行为                         | 说明                                                 |
| -------- | -------------------------------- | ---------------------------------------------------- |
| 数组     | `unionByIdentity(server, local)` | 按身份标识去重合并：云端项在前，本地独有的项补充在后 |
| null     | `local ?? server ?? null`        | 任一方非 null 取非 null；都非 null 取 local          |
| 对象     | `{ ...server, ...local }`        | 以云端为基底，本地同名键**覆盖**云端键               |
| 标量     | 返回 `local`                     | 本地值覆盖云端值                                     |

**身份标识规则（`unionByIdentity`）**：

1. 若项有 `id` 字段 → 用 `item.id` 标识
2. 否则若有 `name` 字段且为字符串 → 用 `item.name` 标识
3. 否则 → 用 `JSON.stringify(item)` 标识

**关键区别**：`additiveMerge` 永远是"累加合并"——云端已有的数据不会被删除，本地新增的数据被补充进来；而 `mergeData` 会根据 `isReadOnly` 决定"本地优先"或"云端优先"。

**返回值格式**：`{ mergedData, conflicts }`，其中 `mergedData` 为合并后的数据，`conflicts` 为冲突列表（详见 5.2.4 冲突检测与通知）。

#### 5.2.4 冲突检测与通知

RMW 在合并过程中会检测数据冲突，并返回冲突信息供上层处理：

| 冲突类型     | 检测时机                   | 说明                                                   |
| ------------ | -------------------------- | ------------------------------------------------------ |
| 数组项冲突   | `unionByIdentity` 合并时   | 云端和本地都有相同 identity（id/name）的项，但内容不同 |
| 对象字段冲突 | `additiveMerge` 合并对象时 | 云端和本地都有同一字段，但值不同                       |

`rmwWriteServer` 的返回值中包含 `conflicts` 数组和 `serverOriginal`（合并前的云端原始值）。`dataProvider.saveData` 在收到冲突后会调用 `notifyRmwConflict` 弹出通知栏，让用户选择：

- **"使用云端"**：用云端数据覆盖本地

- **"换用我的修改"**：用本地数据覆盖云端（直接调用 `kvServerProvider.saveData`）

冲突通知仅用于告知用户，不影响 RMW 的合并结果（`additiveMerge` 已按本地优先策略合并了数据）。

**通知不会自动消失**（`timeout: -1`）：冲突结果**已经落地**（云端已按本地优先合并写入），
若 15s 后静默消失，等于用户来不及选择就默认接受了"本地覆盖云端"。

#### 5.2.5 RMW 的使用范围

**使用 RMW 的场景**：

- `dataProvider.saveData` 在 `kv-server` / `classworkscloud` 模式下 → 直接调用 `rmwWriteServer`

- `dataProvider.saveData` 在 `dual-*` 模式下且在线时 → 同时调用 `rmwWriteServer`（云端）和 `kvLocalProvider.saveData`（本地）

- `backgroundSync._syncOfflineQueue`（阶段1：离线队列上传）→ 通过 `_retryWithBackoff` 调用 `rmwWriteServer`

- `backgroundSync._syncMissingToCloud`（阶段2：缺失上行）→ 通过 `_retryWithBackoff` 调用 `rmwWriteServer`

**不使用 RMW 的场景**（直接使用 `kvServerProvider.saveData` 覆盖）：

- `dataProvider.syncAllToCloud`（手动全量上传）

**为什么不统一使用 RMW**：
`syncAllToCloud` 的语义是"把本地所有数据推到云端"，如果全量走 RMW，每个 key 都需要先读后写，请求量翻倍；且全量上传失败后直接返回 `failedKeys`，不进入离线队列，不会持续重试。后台同步的三个阶段已经覆盖日常同步需求，其中阶段1和阶段2使用 RMW 保护并发写入。

#### 5.2.6 RMW 的局限性

- **无版本号**：依赖"读取→合并→写入"的原子性窗口，高并发下仍可能丢失数据（但比直接覆盖好很多）

- **重试次数有限**：最多 3 次尝试，极端竞争下仍会失败

- **无删除语义**：`additiveMerge` 只能添加/覆盖，不能表达删除——如果本地删除了数组中的某项，RMW 无法将此删除同步到云端（因为数组合并是去重追加，不会移除）

---

## 六、后台同步（backgroundSync.js）

_仅适用于 dual-_ 模式\*。单存储模式没有云端可同步。

### 6.1 三阶段同步流程

每次同步执行 3 个阶段：

```
_doSyncPhases()
  │
  ├─ 阶段1：离线队列上传（仅非只读角色）
  │   │  处理 saveData 时入队但尚未上传的 key
  │   │  流程：读队列 → 读本地数据 → 上传云端 → 移出队列
  │   │  失败：留在队列，下次再试（无限重试直到成功）
  │   └─ 失败的 key 永远不会从队列删除，保证数据不丢
  │
  ├─ 阶段2：缺失上行（仅非只读角色）
  │   │  本地有但云端没有的 key，补充上传到云端
  │   │  流程：对比双方键列表 → 本地有云端没有的 → 上传
  │   └─ 实现数据可达性的"本地补充云端"
  │
  └─ 阶段3：缺失下行（所有角色）
      │  云端有但本地没有的 key，下载到本地
      │  流程：对比双方键列表 → 云端有本地没有的 → 下载
      └─ 实现数据可达性的"云端有的本地也要"
```

### 6.2 触发机制（多级触发）

| 级别 | 触发条件              | 说明                                                     |
| ---- | --------------------- | -------------------------------------------------------- |
| L0   | `scheduleImmediate()` | saveData 失败时立即触发；10s 去抖窗口内的重复触发被吸收  |
| L1   | L0 失败后退避         | 30s → 60s → 120s → 300s，最多 4 次；**不被新的编辑重置** |
| L2   | 定时器                | 600-1200s 随机间隔，避免多设备同时同步                   |
| L3   | 网络恢复              | 离线→在线时重置退避并触发 `scheduleImmediate()`          |

**退避状态的归零时机**（只有这三种，缺一不可）：

1. 队列清空 / 一轮同步完全成功；
2. 网络从离线恢复到在线（`_resetImmediateBackoff()`）；
3. 用户手动 `forceSyncNow()`。

> ⚠️ 不要在 `scheduleImmediate()` 里重置 `_immediateAttempts`（历史缺陷 P1-8）：
> 持续编辑时退避会永远从 30s 起算，甚至每次保存都立刻打一次服务器。
> 现在 10s 窗口内的重复触发会被"吸收"到已有的待跑定时器上。

### 6.3 并发控制

- **跨标签租约**：`crossTabLock.js` 提供**可中止租约**。租约超时只做两件事——
  中止 `signal` + 回调 `onLeaseLost`；**不替调用方释放锁**。调用方在 `finally` 里
  `lease.release()` 之后锁才真正释放；超时后再等 `graceMs`（15s）仍未释放才强制释放并告警。

  > 历史缺陷（勿回退）：旧实现在超时回调里直接 `releaseFn()`，同时把 `AbortSignal` 交给 Web Locks，
  > 于是"调用方以为持有、实际已释放"；更严重的是旧 `acquireLock` 会 `await` **整个持锁过程**，
  > 导致每次后台同步都要等满 30s 超时才开跑、且开跑时锁已经没了。

- **同步重入**：`_isSyncing` 标志防止多轮同步重叠执行；`_immediateRunning` 防止 L0 重入。

- **批量并发**：`_runWithConcurrency` 5 个并发，平衡速度和服务器压力；每个任务开始时检查
  `signal.aborted`，租约失效即停手。

- **键扫描分页**：`_loadAllKeys` 每页 1000，突破服务端 1000 条限制。

### 6.4 重试策略

重试被明确分成两层，**不要混淆**：

| 层级           | 位置                                 | 策略                                             |
| -------------- | ------------------------------------ | ------------------------------------------------ |
| 传输层（有界） | `axios` 拦截器 + `netRetryPolicy.js` | 交互默认最多 2 次尝试、预算 12s；心跳 1 次       |
| 持久层（无限） | 离线队列 + `backgroundSync`          | 队列项永不删除，失败留在队列，下次再试，直到成功 |

> `BACKGROUND_RETRY_POLICY`（3 次 / 45s）已在 `netRetryPolicy.js` 中定义，但**尚未接入**
> `backgroundSync`——目前后台同步走的是默认交互策略（队列会兜底重试）。

- **队列项重试**：无限重试直到成功，永不删除（保证数据不丢）

- **单次操作重试**：`_retryWithBackoff` 最多 3 次，指数退避（1s/2s/4s，上限 5s）

- **服务器标记**：上传成功时 `markServerReachable()`；**读取**失败只调用 `noteRequestFailure()`
  （由心跳决定是否离线）；**双存储下云端写入失败而本地写入成功**则立即 `markServerUnreachable()`

---

## 七、离线队列

_仅适用于 dual-_ 模式\*。单存储模式没有云端，不需要上传队列。

### 7.1 数据结构

IndexedDB `offline-queue` store，每条记录：

```js
{
  id: Number,        // 自增主键
  key: String,       // 待上传的 kv 键名
  addedAt: Number,   // 入队时间戳
}
```

**设计要点**：队列**只存 key 名单**，不存数据快照、不存操作类型、不存版本号。
这是有意为之——回放时读取本地最新值上传，天然实现 LWW（Last Write Wins）。

### 7.2 入队时机

`dataProvider.saveData` 在 dual 模式下：

- 在线但云端保存失败 → 入队

- 在线但抛异常 → 入队

- 离线 → 入队

入队时通过 `key` 索引去重（DB 版本 5 新增索引），同一 key 不会重复入队。

### 7.3 出队时机

`backgroundSync._syncOfflineQueue` 阶段1：

- 读取队列全部项

- 5 并发上传

- 上传成功 → `removeFromOfflineQueue`

- 上传失败 → 留在队列，下次同步再试

**永不删除失败的队列项**——保证数据最终一定会上传到云端。

### 7.4 用户可见性

设置页面 `RefreshSettingsCard` 中：

- 实时显示队列长度（直接读 IndexedDB，不依赖 backgroundSync 缓存计数）

- 可展开查看每条记录的 key 和入队时间

- 可手动移除单项（仅移除队列记录，不删本地 kv 数据）

- 手动移除后，下次该 key 被 saveData 时会重新入队

### 7.5 设计边界

**不做的事**：

- 不做操作语义区分（create/update/delete）——KV 存储是幂等的，整键覆盖

- 不做版本号冲突检测——依赖 LWW，前端时钟不可信

- 不做 tombstone（删除墓碑）——后端是物理删除，前端不能要求后端改

- 不做 op-log 回放——与当前 `mergeData` 整键合并模式架构上互斥

这些限制是**有意的妥协**，基于"前端不能要求后端改"的硬约束。

---

## 八、命名空间与命名空间切换

> **⚠️ 容易混淆的概念**
>
> "命名空间"和"命名空间切换"是两个不同的东西，适用范围不同：
>
> | 概念                           | 适用范围                                                       | 说明                                            |
> | ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------- |
> | **命名空间**（`device.uuid`）  | **所有非 local 模式**（kv-server / classworkscloud / dual-\*） | 设备身份标识，决定云端数据隔离边界              |
> | **命名空间切换检测与回退弹框** | _仅 dual-_ 模式\*                                              | 检测 device.uuid 变化，提示用户处理本地缓存数据 |
>
> 以下分别说明。

### 8.1 命名空间（device.uuid）—— 通用概念

**适用范围：所有非 local 模式**（kv-server / classworkscloud / dual-\*）。

命名空间 = `device.uuid` = 设备唯一标识 = 云端数据隔离边界。

| 模式                            | device.uuid 的作用                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `local`                         | **仅作为设置项存在**，不影响本地数据存储（本地 key 是 `"classworks-data-" + 日期`，与 uuid 无关），不构成数据隔离边界 |
| `kv-server` / `classworkscloud` | **云端数据隔离边界**：决定云端 API 访问哪个设备的数据空间                                                             |
| `dual-*`                        | **云端数据隔离边界** + **本地数据来源标记**（用于检测切换是否需要清理本地缓存）                                       |

**命名空间的来源**：

- 用户通过 `DeviceAuthDialog` 输入 namespace + 密码认证

- 认证成功后，后端返回 `tokenResp.data.device.uuid`，写入 `device.uuid` 设置项

- 也可通过 URL 预配参数 `?namespace=xxx` 自动填入认证对话框

- 默认值 `00000000-0000-4000-8000-000000000000`（未认证状态）

**命名空间在 kv-server / classworkscloud 单云端模式下的意义**：

- 切换命名空间 = 切换到另一个设备的数据空间

- 由鉴权流程（DeviceAuthDialog / FirstTimeGuide）处理，重新认证即可

- 不需要"切换检测弹框"，因为单云端模式本地无数据缓存，切换不会造成数据混淆

### 8.2 命名空间切换检测（仅 dual-\* 模式）

_仅适用于 dual-_ 模式\*。

为什么单云端模式不需要切换检测：

- 单云端模式本地不缓存数据，切换 namespace 后直接读云端新空间，无冲突

- 双存储模式本地有缓存数据，切换 namespace 后本地旧数据会与新云端数据混淆

`dataProvider.checkNamespaceChange()`：

- 比较 `device.uuid`（当前）与 `lastKnownNamespace`（上次记录）

- 不一致时返回 `{changed: true, current, previous}`

### 8.3 用户回退方案（仅 dual-\* 模式）

检测到切换时弹框，三个选项：

| 选项           | 行为                                                                  | 适用场景                   |
| -------------- | --------------------------------------------------------------------- | -------------------------- |
| 导出备份并清空 | 导出本地 JSON 备份 → `clearAll` → `confirmNamespaceChange` → 重新加载 | 确认要切换，且不想数据混淆 |
| 保留数据并切换 | 仅 `confirmNamespaceChange`，本地与云端按合并策略共存                 | 确认要切换，且信任合并策略 |
| 暂不处理       | 不更新 `lastKnownNamespace`，下次启动再次提示                         | 不确定，想手动处理         |

**关键设计**：

- 清空前**必须导出备份**，防止误操作丢数据

- "暂不处理"不写 `lastKnownNamespace`，给用户改回 `device.uuid` 的余地

- `clearAll` 同时清空 `kv` 和 `offline-queue` 两个 store

---

## 九、角色感知（isReadOnly）

_仅适用于 dual-_ 模式\*。单存储模式不涉及合并方向和同步阶段控制。

### 9.1 isReadOnly 来源

从 `useTokenDisplay.loadTokenInfo()` 获取：

- 请求 `/kv/_token` 接口

- 响应中 `tokenInfo.isReadOnly` 字段

### 9.2 注入路径

```
useTokenDisplay.loadTokenInfo()
  │
  ├─ dataProvider.setReadOnlyState(isReadOnly)
  │   └─ 影响 mergeData 合并方向
  │
  └─ backgroundSync.setReadOnlyState(isReadOnly)
      └─ 影响同步阶段（只读角色跳过阶段1和阶段2）
```

### 9.3 角色行为差异

| 行为              | 非只读角色 | 只读角色                           |
| ----------------- | ---------- | ---------------------------------- |
| 保存数据          | 正常保存   | 仍可保存到本地，但合并时以云端为准 |
| 合并方向          | 本地优先   | 云端优先                           |
| 阶段1（队列上传） | 执行       | 跳过                               |
| 阶段2（缺失上行） | 执行       | 跳过                               |
| 阶段3（缺失下行） | 执行       | 执行                               |

**注意**：isReadOnly 不等于"不能写入"。只读角色仍可以编辑和保存到本地，
只是合并时以云端为准，且不会主动向云端上传数据。

---

## 十、手动全量同步

_仅适用于 dual-_ 模式\*。单存储模式没有双向同步需求。

### 10.1 syncAllToLocal / syncAllToCloud

`dataProvider` 提供两个手动全量同步方法，供 KvDatabaseCard 调用：

| 方法             | 方向    | 行为                                         |
| ---------------- | ------- | -------------------------------------------- |
| `syncAllToLocal` | 云→本地 | 分页加载云端全部 key → 5 并发下载 → 保存本地 |
| `syncAllToCloud` | 本地→云 | 分页加载本地全部 key → 5 并发上传 → 保存云端 |

**返回结构**：

```js
{
  success: true,
  synced: Number,      // 成功数
  failed: Number,      // 失败数
  failedKeys: String[], // 失败的 key 列表（供用户排查）
  total: Number        // 总数
}
```

### 10.2 与 backgroundSync 的关系

- `syncAllToCloud` **不走离线队列**，失败直接返回 `failedKeys`

- 原因：全量上传入队会让队列爆炸（整个本地库都进队列）

- backgroundSync 的阶段2（缺失上行）已覆盖"本地有云端没有"的场景

- 两者并发不会出错——KV 存储是幂等的，同时写同一 key 数据一致

### 10.3 getSyncStatus

返回本地与云端的键对比统计：

```js
{
  mode: "dual" | "local-only",
  cloudCount: Number,
  localCount: Number,
  synced: Number,        // 双方都有的数量
  onlyInCloud: Number,
  onlyInLocal: Number,
  cloudAvailable: Boolean
}
```

---

---

# 第三部分：附录

## 十一、文件清单

### 通用基础层（所有存储模式生效）

| 文件                                             | 层     | 职责                                       |
| ------------------------------------------------ | ------ | ------------------------------------------ |
| `src/sw.js`                                      | 资源层 | Service Worker，预缓存+运行时缓存+离线回退 |
| `src/components/system/SwUpdateNotification.vue` | 资源层 | 新版本检测与更新提示                       |
| `src/components/settings/CacheManager.vue`       | 资源层 | SW 缓存可视化管理                          |
| `src/components/system/PwaInstallCard.vue`       | 资源层 | 安装/通知/持久化存储授权                   |
| `src/App.vue`                                    | 资源层 | beforeinstallprompt 监听 + 心跳启动        |
| `vite.config.mjs`                                | 资源层 | VitePWA 配置                               |
| `src/utils/providers/kvLocalProvider.js`         | 数据层 | IndexedDB 本地存储                         |
| `src/utils/providers/kvServerProvider.js`        | 数据层 | HTTP 云端存储 API（非 local 模式）         |
| `src/utils/networkStatus.js`                     | 协调层 | 网络状态检测、心跳、事件订阅               |
| `src/utils/netRetryPolicy.js`                    | 传输层 | 有界重试策略（纯函数，可单测）             |
| `src/utils/pendingWriteSpool.js`                 | 数据层 | 云端单存储模式的写入内存暂存与补写         |
| `src/utils/updateGate.js`                        | 资源层 | "是否有未保存内容"登记（SW 更新门禁）      |
| `src/utils/dataProvider.js`                      | 协调层 | 数据读写入口（所有模式）                   |

### 双存储专属层（仅 dual-\* 模式生效）

| 文件                                                    | 层     | 职责                                                                 |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `src/utils/dataProvider.js`                             | 协调层 | mergeData、syncAllToLocal/Cloud、getSyncStatus、checkNamespaceChange |
| `src/utils/rmw.js`                                      | 协调层 | RMW 写入合并（rmwWriteServer / additiveMerge / RMW\_MAX\_RETRIES）   |
| `src/utils/backgroundSync.js`                           | 协调层 | 后台同步服务、多级触发、三阶段同步                                   |
| `src/utils/providers/kvLocalProvider.js`                | 数据层 | offline-queue store 管理、clearAll、countKeys                        |
| `src/composables/useTokenDisplay.js`                    | 协调层 | Token 信息加载、isReadOnly 注入                                      |
| `src/pages/index.vue`                                   | 协调层 | 命名空间切换检测与回退弹框                                           |
| `src/components/settings/cards/RefreshSettingsCard.vue` | 协调层 | 同步状态与离线队列展示                                               |
| `src/components/system/OfflineIndicator.vue`            | 协调层 | 离线状态 snackbar 提示 + 队列计数                                    |
| `src/components/settings/cards/KvDatabaseCard.vue`      | 协调层 | KV 数据管理、手动全量同步                                            |

---

## 十二、设计边界与不做的事

### 12.1 硬约束

- **后端是物理删除**：没有 tombstone/软删除，前端无法实现真正的删除语义，只能忽略

- **前端时钟不可信**：不能用作 LWW 仲裁依据

- **跨设备冲突无法前端解决**：依赖服务器接收顺序

### 12.2 有意的妥协

| 妥协                                       | 原因                                                          | 影响                                     |
| ------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------- |
| 队列只存 key                               | 不存操作语义                                                  | 天然 LWW，但无法区分新增/修改/删除       |
| 失败队列项永不删除                         | 保证数据不丢                                                  | 毒丸项会持续重试（可手动移除）           |
| `isOnline()` vs `isBrowserOnline()` 不统一 | saveData 快速入队，backgroundSync 尝试重试                    | 当前行为正确，统一反而降低恢复速度       |
| `isDualMode` 在两处定义                    | 模块独立性                                                    | 将来增加 dual 类型需改两处               |
| `loadKeys` dual 模式不分页                 | KvDatabaseCard 表格分页依赖                                   | 表格只显示前 100 个 key                  |
| RMW 只做累加不做删除                       | KV 存储无 tombstone，前端不能要求后端改                       | 数组删除无法跨设备同步                   |
| RMW 对象递归深合并                         | 通过 `additiveMerge` 递归合并嵌套对象，非浅层 `Object.assign` | 深层字段递归合并，同层级字段本地覆盖云端 |
| 手动全量同步不使用 RMW                     | 减少请求量，全量上传语义为"推送"而非"合并"                    | 极端并发下全量上传可能覆盖他端数据       |
| 传输层重试有界（不追求"永不放弃"）         | 无界重试会让上层所有失败分支变成死代码                        | 短暂故障会快速失败并落到本地/队列重试    |
| 云端单存储的暂存只在内存                   | 不为单存储模式引入新的持久化结构                              | 刷新/关闭页面即丢失暂存内容              |

### 12.3 不在本系统范围内的

- URL 配置编解码（属于配置分享层）

- 实时频道 WebSocket（属于实时通信层）

- Token 鉴权与角色配置（属于后端鉴权层，本系统仅消费 isReadOnly 字段）

---

## 十三、批次 3 / 4 实施记录（已落地，勿回退）

以下问题均已修复。**每条都有对应的单元测试作为守护**——回退这些行为会让测试立刻失败。
运行：`pnpm run test`（在 `apps/web` 内）

### 批次 3：后台同步与锁

| 问题（已修复）             | 曾经的错误行为                                                                                           | 现在的行为                                                                       | 守护测试                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 跨标签锁是"假租约"（P1-7） | 超时回调直接释放锁、且把 `AbortSignal` 交给 Web Locks；`acquireLock` 还 `await` 整个持锁过程（等满 30s） | 超时只 `abort()` + `onLeaseLost`；调用方 `release()` 后才释放，宽限期后强制释放  | `crossTabLock.test.js`（7 例）                                       |
| L1 退避被重置（P1-8）      | `scheduleImmediate()` 每次归零 `_immediateAttempts` 并立刻同步，阶梯爬不上去                             | 只有队列清空／网络恢复／手动同步才归零；10s 去抖窗口内吸收重复触发               | `backgroundSync.test.js`（4 例）                                     |
| 本地写失败静默（P0-6）     | `localFailed` 全仓无消费方；本地副本静默过期                                                             | 原地重试一次；仍失败则登记，设置页"同步"卡片可见"本地副本写入异常"               | `dataProvider.test.js`（2 例）                                       |
| `_isSyncing` 无超时        | 卡在挂起请求上会永久为 true                                                                              | 租约 `signal` 贯穿三个阶段与每个 key，失效即停手；传输层有界保证 ~15s 内收尾     | `backgroundSync.test.js`（租约失效即停手用例）                       |
| 后台未接入专用重试策略     | `BACKGROUND_RETRY_POLICY` 无调用方                                                                       | 后台请求（loadKeys/loadData/rmwWriteServer）显式携带 3 次/45s 策略 + 租约 signal | `backgroundSync.test.js`（3 例）+ `kvServerProvider.test.js`（4 例） |

### 批次 4：Service Worker 更新策略（P0-2、P1-9）

| 问题（已修复）           | 曾经的错误行为                                                              | 现在的行为                                                                    | 守护测试                     |
| ------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| 发版后所有标签页自动刷新 | `sw.js` install 里无条件 `skipWaiting()` → `controllerchange` → 立即 reload | install 不接管；只有用户点击"更新"后 `SKIP_WAITING` 才接管                    | `sw.test.js`（4 例）         |
| `SKIP_WAITING` 无人处理  | 组件一直在 postMessage，但 sw.js 没有对应 handler                           | 新增 message handler：`SKIP_WAITING` → `self.skipWaiting()`（跨源消息仍拒绝） | `sw.test.js`                 |
| `updatefound` 监听器累积 | 监听器注册在每小时调用的 `checkForUpdate` 内，同一 registration 只增不减    | 只注册一次（`updateFoundHandler` 记忆化）                                     | 代码审查项                   |
| 刷新时机不考虑未保存内容 | `controllerchange` 处理器无条件 `location.reload()`                         | 仅"用户已确认"或"无未保存内容且页面不可见"时刷新，否则横幅提示先保存          | `updateGate.test.js`（5 例） |

### 回归清单（改离线系统前后都该跑）

```bash
pnpm run test          # 73 例：重试策略/心跳/RMW/暂存/锁/退避/SW/门禁/provider 透传
pnpm run lint:check && pnpm --filter @classworks/web run lint:check
pnpm run format:check
pnpm --filter @classworks/web run build
```

`test` 已接入 CI（`.github/workflows/ci.yml` 的 `test-web` job）。
