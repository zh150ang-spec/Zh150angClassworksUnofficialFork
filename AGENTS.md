# AGENTS.md

This file provides guidance to AI when working with code in this repository.

## Project Overview

Classworks is a homework board widget for classroom large screens. It's a Vue 3 + Vuetify 4 PWA with real-time sync via Socket.IO. The UI is in Chinese.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Dev server at localhost:3031 (network-accessible)
pnpm run build        # Production build (auto-runs prebuild to regenerate sound list)
pnpm run preview      # Preview production build
pnpm run lint         # ESLint with auto-fix
```

## Tech Stack

- **Framework**: Vue 3 (Composition API + Options API mixed), JavaScript (no TypeScript)
- **UI**: Vuetify 4, `@mdi/font` icons, SCSS
- **State**: Pinia 5
- **Routing**: Vue Router 5 with file-based routes (`unplugin-vue-router` + `vite-plugin-vue-layouts`)
- **Build**: Vite 8, pnpm
- **Real-time**: Socket.IO client (singleton in `src/utils/socketClient.js`)
- **Data**: Pluggable KV provider abstraction (`src/utils/dataProvider.js`) with IndexedDB local and HTTP server backends
- **PWA**: `vite-plugin-pwa` with Workbox service worker

## Architecture

### Data Layer

`src/utils/dataProvider.js` abstracts data operations. It routes to either:
- `src/utils/providers/kvLocalProvider.js` — IndexedDB via `idb`
- `src/utils/providers/kvServerProvider.js` — HTTP API via axios

Server failover is handled by `src/utils/serverRotation.js`.

### Real-time Layer

`src/utils/socketClient.js` — Socket.IO singleton with room-based token join/leave for live updates.

### Settings Layer

`src/utils/settings.js` — Comprehensive localStorage-based settings with typed definitions, defaults, and legacy migration. ~600 lines.

### UI Layer

File-based routing: each `.vue` in `src/pages/` becomes a route. Layouts in `src/layouts/`. The main dashboard is `src/pages/index.vue` (78KB — the core view composing homework grid, time card, noise monitor, random picker, exam schedule, etc.).

Components are organized by feature:
- `src/components/home/` — Home page components
- `src/components/settings/` — Settings cards
- `src/components/auth/` — Authentication flow
- `src/components/attendance/` — Attendance management
- `src/components/common/` — Shared components

### Key Utilities

- `src/axios/axios.js` — Axios instance with auth interceptors and rate limit handling
- `src/utils/api.js` — API helpers, namespace info, server rotation
- `src/utils/visitorId.js` — FingerprintJS device identification
- `src/utils/soundList.js` — Auto-generated from `public/sounds/` by `scripts/generate-sound-list.js` (runs as `prebuild`)

## Code Style

- 2-space indent, trim trailing whitespace (`.editorconfig`)
- Path alias: `@/` maps to `src/` (`jsconfig.json`)
- ESLint flat config with Vue recommended rules (`eslint.config.js`)
- Mixed Composition API and Options API usage
- No TypeScript

## Design Rules

### Card hover effects
Cards must NOT float upward, change elevation, or transform when hovered. No translateY, no elevation change, no shadow addition on hover. Cards should remain visually static when the cursor is over them.

### Auto-save notification
Settings that are saved automatically (e.g. via SettingItem's setSetting) must NOT trigger any in-app notification ($message). Only explicit user-initiated save actions (e.g. clicking a "保存" button) may show confirmation popups.

### Input border-radius
All input fields must have symmetric border-radius on left and right sides. Asymmetric corner rounding must not occur.
