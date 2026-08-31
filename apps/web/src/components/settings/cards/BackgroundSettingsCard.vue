<template>
  <settings-card
    border
    :icon="ICON.IMAGE"
    title="背景设置"
  >
    <v-list>
      <setting-item
        :key="settingItemKey"
        :setting-key="'background.enabled'"
      />
    </v-list>

    <v-divider class="mb-4" />

    <div class="px-4 pb-4">
      <!-- 预览区域 -->
      <div
        class="preview-area mb-6"
        :style="previewContainerStyle"
      >
        <div
          class="preview-bg"
          :style="previewBgStyle"
        />
        <div
          class="preview-overlay"
          :style="previewOverlayStyle"
        />
        <div class="preview-text">
          背景预览
        </div>
      </div>

      <!-- 图片来源 -->
      <div class="d-flex align-center mb-4">
        <v-icon
          start
          color="primary"
          :icon="ICON.IMAGE_SEARCH"
        />
        <span class="text-body-large font-weight-bold">图片来源</span>
      </div>

      <!-- 来源选择 -->
      <v-radio-group
        v-model="imageSource"
        color="primary"
        class="mb-4"
        row
      >
        <v-radio
          :value="'url'"
          color="primary"
        >
          <template #label>
            <v-icon
              start
              size="small"
              :icon="ICON.LINK_VARIANT"
            />
            网络地址
          </template>
        </v-radio>
        <v-radio
          :value="'upload'"
          color="primary"
        >
          <template #label>
            <v-icon
              start
              size="small"
              :icon="ICON.UPLOAD"
            />
            本地上传
          </template>
        </v-radio>
      </v-radio-group>

      <!-- URL 输入 -->
      <div
        v-if="imageSource === 'url'"
        class="mb-4"
      >
        <v-text-field
          v-model="localUrl"
          label="图片地址"
          placeholder="https://example.com/background.jpg"
          variant="outlined"
          density="compact"
          :prepend-inner-icon="ICON.LINK"
          clearable
          hide-details="auto"
          :rules="[validateUrl]"
          @update:model-value="onUrlChange"
        />
        <div class="d-flex flex-wrap gap-2 mt-2">
          <v-chip
            v-for="preset in urlPresets"
            :key="preset.label"
            size="small"
            variant="tonal"
            color="primary"
            class="cursor-pointer"
            @click="applyPreset(preset.url)"
          >
            {{ preset.label }}
          </v-chip>
        </div>
      </div>

      <!-- 本地上传 -->
      <div
        v-if="imageSource === 'upload'"
        class="mb-4"
      >
        <div
          class="upload-area rounded-xl pa-6 text-center mb-3"
          :class="{ 'upload-hover': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <v-icon
            size="40"
            color="primary"
            class="mb-2"
            :icon="ICON.IMAGE_PLUS"
          />
          <div class="text-body-medium">
            点击或拖拽图片到此处上传
          </div>
          <div class="text-body-small text-medium-emphasis mt-1">
            支持 JPG、PNG、WebP、GIF（建议小于 {{ maxImageSizeMB }}MB）
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleFileChange"
          >
        </div>

        <v-alert
          v-if="uploadWarning"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-2"
          :icon="ICON.WARNING"
        >
          {{ uploadWarning }}
        </v-alert>

        <div
          v-if="localImageData"
          class="d-flex align-center gap-2"
        >
          <v-chip
            color="success"
            :prepend-icon="ICON.SUCCESS"
            size="small"
          >
            已上传本地图片
          </v-chip>
          <v-btn
            variant="elevated"
            color="error"
            :prepend-icon="ICON.DELETE"
            @click="clearUploadedImage"
          >
            清除
          </v-btn>
        </div>
      </div>

      <v-divider class="my-5" />

      <!-- 毛玻璃效果设置 -->
      <div class="d-flex align-center mb-4">
        <v-icon
          start
          :icon="ICON.BLUR"
        />
        <span class="text-body-large font-weight-bold">毛玻璃效果</span>
      </div>

      <div class="mb-4">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-body-medium text-medium-emphasis">模糊幅度</span>
          <span class="text-body-medium font-weight-bold">{{ localBlur }}px</span>
        </div>
        <v-slider
          v-model="localBlur"
          :min="0"
          :max="50"
          :step="1"
          color="primary"
          thumb-label
          hide-details
        >
          <template #prepend>
            <v-icon
              size="small"
              color="medium-emphasis"
              :icon="ICON.BLUR_OFF"
            />
          </template>
          <template #append>
            <v-icon
              size="small"
              color="primary"
              :icon="ICON.BLUR"
            />
          </template>
        </v-slider>
      </div>

      <div class="mb-4">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-body-medium text-medium-emphasis">遮罩暗色程度</span>
          <span class="text-body-medium font-weight-bold">{{ localOpacity }}%</span>
        </div>
        <v-slider
          v-model="localOpacity"
          :min="0"
          :max="80"
          :step="1"
          color="primary"
          thumb-label
          hide-details
          @update:model-value="onOpacityChange"
        >
          <template #prepend>
            <v-icon
              size="small"
              color="medium-emphasis"
              :icon="ICON.BRIGHTNESS_7"
            />
          </template>
          <template #append>
            <v-icon
              size="small"
              color="primary"
              :icon="ICON.BRIGHTNESS_2"
            />
          </template>
        </v-slider>
      </div>

      <v-divider class="my-5" />
    </div>

    <template #actions>
      <v-btn
        variant="elevated"
        color="neutral-surface"
        :prepend-icon="ICON.RESTORE"
        @click="resetAll"
      >
        重置
      </v-btn>
      <v-btn
        color="success"
        :prepend-icon="ICON.CONTENT_SAVE"
        :loading="saving"
        variant="elevated"
        @click="saveAll"
      >
        保存设置
      </v-btn>
    </template>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingItem from '@/components/settings/SettingItem.vue'
import { getSetting, setSetting, resetSetting } from '@/utils/settings'

const URL_PRESETS = [
  { label: 'Bing 4k 随机壁纸', url: 'https://uapis.cn/api/v1/image/bing-daily?random=true' },
  { label: 'Bing 4k 每日壁纸', url: 'https://uapis.cn/api/v1/image/bing-daily' },
  { label: 'Bing 1080P 每日壁纸', url: 'https://uapis.cn/api/v1/image/bing-daily?resolution=1080' },
  { label: '随机（质量较差）', url: 'https://picsum.photos/1920/1080?random=1' },
  { label: '随机二次元', url: 'https://uapis.cn/api/v1/random/image?category=acg&type=pc' },
]

const MAX_IMAGE_SIZE_MB = 10

export default {
  name: 'BackgroundSettingsCard',
  components: { SettingsCard, SettingItem },

  data() {
    const imageData = getSetting('background.imageData') || ''
    const url = getSetting('background.url') || ''
    const blur = getSetting('background.blur')
    const opacity = getSetting('background.opacity')

    return {
      ICON,
      imageSource: imageData ? 'upload' : 'url',
      localUrl: url,
      localImageData: imageData,
      localBlur: blur !== undefined && blur !== null ? blur : 10,
      localOpacity: opacity !== undefined && opacity !== null ? opacity : 30,
      isDragging: false,
      saving: false,
      uploadWarning: '',
      urlPresets: URL_PRESETS,
      settingItemKey: 0,
      maxImageSizeMB: MAX_IMAGE_SIZE_MB,
    }
  },

  computed: {
    activeImageSrc() {
      if (this.imageSource === 'upload' && this.localImageData) {
        return this.localImageData
      }
      if (this.imageSource === 'url' && this.localUrl) {
        return this.localUrl
      }
      return ''
    },

    previewContainerStyle() {
      return {
        position: 'relative',
        width: '100%',
        height: '160px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--color-border-strong)',
      }
    },

    previewBgStyle() {
      if (!this.activeImageSrc) {
        return {
          position: 'absolute',
          inset: '0',
          background: `linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-surface-variant), 0.8) 100%)`,
          filter: `blur(${this.localBlur}px)`,
          transform: 'scale(1.1)',
        }
      }
      return {
        position: 'absolute',
        inset: '0',
        backgroundImage: `url(${this.activeImageSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${this.localBlur}px)`,
        transform: 'scale(1.1)',
      }
    },

    previewOverlayStyle() {
      return {
        position: 'absolute',
        inset: '0',
        background: `rgba(var(--v-theme-on-surface), ${this.localOpacity / 100})`,
      }
    },
  },

  methods: {
    validateUrl(val) {
      if (!val) return true
      try {
        new URL(val)
        return true
      } catch {
        return '请输入有效的图片地址'
      }
    },

    onUrlChange(val) {
      this.localUrl = val || ''
    },

    onBlurChange(val) {
      this.localBlur = val
    },

    onOpacityChange(val) {
      this.localOpacity = val
    },

    applyPreset(url) {
      this.localUrl = url
      this.imageSource = 'url'
    },

    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    handleDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer?.files?.[0]
      if (file) this.processFile(file)
    },

    handleFileChange(event) {
      const file = event.target.files?.[0]
      if (file) this.processFile(file)
      event.target.value = ''
    },

    processFile(file) {
      this.uploadWarning = ''

      if (!file.type.startsWith('image/')) {
        this.uploadWarning = '请选择图片文件'
        return
      }

      const sizeMB = file.size / 1024 / 1024
      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        this.uploadWarning = `图片大小为 ${sizeMB.toFixed(1)}MB，超过 ${MAX_IMAGE_SIZE_MB}MB 限制，请压缩后重试`
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        this.localImageData = e.target.result
      }
      reader.readAsDataURL(file)
    },

    clearUploadedImage() {
      this.localImageData = ''
      this.uploadWarning = ''
    },

    async saveAll() {
      this.saving = true
      try {
        if (this.imageSource === 'upload') {
          setSetting('background.imageData', this.localImageData || '')
          setSetting('background.url', '')
        } else {
          setSetting('background.url', this.localUrl || '')
          setSetting('background.imageData', '')
        }

        setSetting('background.blur', this.localBlur)
        setSetting('background.opacity', this.localOpacity)
      } finally {
        this.saving = false
      }
    },

    resetAll() {
      resetSetting('background.enabled')
      resetSetting('background.url')
      resetSetting('background.imageData')
      resetSetting('background.blur')
      resetSetting('background.opacity')

      this.localUrl = getSetting('background.url') || ''
      this.localImageData = getSetting('background.imageData') || ''
      this.localBlur = getSetting('background.blur') ?? 10
      this.localOpacity = getSetting('background.opacity') ?? 30
      this.imageSource = 'url'
      this.uploadWarning = ''
      this.settingItemKey++
    },
  },
}
</script>

<style scoped>
.preview-area {
  transition: all var(--duration-normal) var(--ease-apple);
}

.preview-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  font-weight: var(--font-weight-label);
  text-shadow: var(--shadow-text);
  z-index: var(--z-inner);
  pointer-events: none;
}

.upload-area {
  border: 2px dashed var(--color-border-strong);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-apple);
  background: var(--color-fill-weakest);
}

.upload-area:hover,
.upload-hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.gap-2 {
  gap: var(--space-2);
}
</style>
