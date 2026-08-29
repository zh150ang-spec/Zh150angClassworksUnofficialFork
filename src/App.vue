<template>
  <v-app>
    <!-- 自定义背景层 -->
    <div
      v-if="bgEnabled"
      class="app-background-image"
      :style="{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${bgBlur}px)`,
        transform: 'scale(1.1)',
      }"
    />
    <div
      v-if="bgEnabled"
      class="app-background-overlay"
      :style="{
        background: `rgba(var(--v-theme-on-surface), ${bgOpacity / 100})`,
      }"
    />

    <div class="app-content">
      <router-view v-slot="{ Component, route }">
        <transition
          mode="out-in"
          name="md3"
        >
          <component
            :is="Component"
            :key="route.path"
          />
        </transition>
      </router-view>
    </div>
    <global-message />
    <rate-limit-modal />
    <offline-indicator ref="offlineIndicator" />
    <sw-update-notification ref="swUpdateNotification" />
  </v-app>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useTheme } from "vuetify";
import { getSetting, watchSettings } from "@/utils/settings";
import { getEffectiveServerUrl } from "@/utils/serverRotation";
import { networkStatus } from "@/utils/networkStatus";
import RateLimitModal from "@/components/system/RateLimitModal.vue";
// eslint-disable-next-line no-unused-vars -- used in template
import OfflineIndicator from "@/components/system/OfflineIndicator.vue";
// eslint-disable-next-line no-unused-vars -- used in template
import SwUpdateNotification from "@/components/system/SwUpdateNotification.vue";

const theme = useTheme();
const offlineIndicator = ref(null);
const swUpdateNotification = ref(null);

const bgEnabled = ref(false);
const bgImage = ref("");
const bgBlur = ref(10);
const bgOpacity = ref(30);

function loadBgSettings() {
  bgEnabled.value = getSetting("background.enabled");
  const imageData = getSetting("background.imageData");
  const url = getSetting("background.url");
  bgImage.value = imageData || url || "";
  bgBlur.value = getSetting("background.blur") ?? 10;
  bgOpacity.value = getSetting("background.opacity") ?? 30;
}

function getHeartbeatUrl() {
  const provider = getSetting("server.provider");
  if (provider === "local" || provider === "kv-local") return null;

  let baseUrl;
  if (provider === "classworkscloud" || provider === "dual-cloud") {
    baseUrl = getEffectiveServerUrl();
  } else {
    baseUrl = getSetting("server.domain");
  }

  if (!baseUrl) return null;
  return baseUrl.replace(/\/+$/, "") + "/kv/_info";
}

function setupHeartbeat() {
  const url = getHeartbeatUrl();
  if (url) {
    networkStatus.startHeartbeat(url);
  } else {
    networkStatus.stopHeartbeat();
  }
}

let unwatchSettings = null;

onMounted(() => {
  const savedTheme = getSetting("theme.mode");
  theme.change(savedTheme);

  loadBgSettings();
  setupHeartbeat();

  unwatchSettings = watchSettings((_, event) => {
    const changedKey = event?.detail?.key;
    if (!changedKey || changedKey.startsWith("background.") || changedKey === "theme.mode") {
      loadBgSettings();
      theme.change(getSetting("theme.mode"));
    }
    if (!changedKey || changedKey.startsWith("server.")) {
      setupHeartbeat();
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPwaPrompt = e;
    window.dispatchEvent(new Event('pwa-prompt-ready'));
  });
});

onUnmounted(() => {
  if (unwatchSettings) unwatchSettings();
  networkStatus.stopHeartbeat();
});
</script>
<style>
/* 全局样式（从 index.vue 迁移，确保全局可用且仅加载一次） */
@import "@/styles/index.scss";
@import "@/styles/transitions.scss";
@import "@/styles/global.scss";

/* Apple-style page transitions */
.md3-enter-active,
.md3-leave-active {
  transition: opacity var(--duration-normal) var(--ease-apple),
    transform var(--duration-normal) var(--ease-apple);
}

.md3-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.md3-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* 自定义背景层 */
.app-background-image,
.app-background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.app-background-image {
  z-index: var(--z-base);
  transform-origin: center center;
  will-change: transform, filter;
}

.app-background-overlay {
  z-index: var(--z-overlay);
}

.app-content {
  position: relative;
  z-index: var(--z-content);
}
</style>
