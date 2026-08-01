<template>
  <v-card
    class="time-card"
    elevation="2"
    border
    rounded="xl"
    height="100%"
    style="cursor: pointer"
    @click="showFullscreen = true"
    @touchmove="handleTouchMove"
  >
    <v-card-text
      class="pa-6 d-flex flex-column"
      style="height: 100%"
    >
      <div
        class="d-flex align-center"
        style="gap: var(--space-4);"
      >
        <!-- 左侧：时间显示 -->
        <div class="flex-grow-1">
          <div
            class="time-display"
            :style="timeStyle"
          >
            {{ timeString }}<span
              class="seconds-text"
              :style="secondsStyle"
            >{{ secondsString }}</span><span
              v-if="use12hClock"
              class="ampm-text"
              :style="secondsStyle"
            > {{ amPmString }}</span>
          </div>
          <div
            class="date-line mt-3"
            :style="dateStyle"
          >
            {{ dateString }}  {{ weekdayString }}  {{ periodOfDay }}
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>

  <!-- 全屏时间弹框 -->
  <v-dialog
    v-model="showFullscreen"
    fullscreen
    :scrim="false"
    persistent
    transition="dialog-bottom-transition"
  >
    <v-card
      class="fullscreen-time-card d-flex flex-column"
      @mousemove="showToolbar"
      @touchstart="showToolbar"
    >
      <!-- 顶部分页导航 (自动隐藏) -->
      <Transition name="toolbar-fade">
        <div
          v-show="toolbarVisible"
          class="fullscreen-toolbar"
        >
          <v-tabs
            v-model="fullscreenMode"
            density="comfortable"
            color="primary"
            align-tabs="center"
            class="fullscreen-tabs"
          >
            <v-tab value="clock">
              <v-icon
                start
                :icon="ICON.CLOCK_OUTLINE"
              />
              时钟
            </v-tab>
            <v-tab value="countdown">
              <v-icon
                start
                :icon="ICON.TIMER_SAND"
              />
              倒计时
            </v-tab>
            <v-tab value="stopwatch">
              <v-icon
                start
                :icon="ICON.TIMER_OUTLINE"
              />
              秒表
            </v-tab>
          </v-tabs>
        </div>
      </Transition>

      <!-- 主体内容区 -->
      <div class="fullscreen-time-body flex-grow-1 d-flex flex-column align-center justify-center">
        <v-tabs-window
          v-model="fullscreenMode"
          class="fullscreen-tabs-window"
        >
          <!-- ========= 时钟模式 ========= -->
          <v-tabs-window-item value="clock">
            <div class="d-flex flex-column align-center justify-center">
              <div class="fullscreen-time-display">
                {{ timeString }}<span class="fullscreen-seconds">{{ secondsString }}</span><span
                  v-if="use12hClock"
                  class="fullscreen-seconds"
                > {{ amPmString }}</span>
              </div>
              <div class="fullscreen-date-line mt-6">
                {{ dateString }}  {{ weekdayString }}  {{ periodOfDay }}
              </div>
              <div class="fullscreen-progress mt-10">
                <div class="text-body-small text-medium-emphasis mb-1">
                  今日已过 {{ dayProgressPercent }}%
                </div>
                <v-progress-linear
                  :model-value="dayProgressPercent"
                  color="primary"
                  height="6"
                  rounded
                  style="max-width: 400px; width: 80vw"
                />
              </div>
              <div class="fullscreen-extra mt-8 text-medium-emphasis d-flex ga-8">
                <!--<div class="text-center">
                  <div class="text-h6 font-weight-bold">
                    {{ dayOfYear }}
                  </div>
                  <div class="text-caption">
                    今年第几天
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-h6 font-weight-bold">
                    {{ weekOfYear }}
                  </div>
                  <div class="text-caption">
                    今年第几周
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-h6 font-weight-bold">
                    {{ daysLeftInYear }}
                  </div>
                  <div class="text-caption">
                    距离新年
                  </div>
                </div>-->
              </div>
            </div>
          </v-tabs-window-item>

          <!-- ========= 倒计时模式 ========= -->
          <v-tabs-window-item value="countdown">
            <div class="d-flex flex-column align-center justify-center">
              <!-- 未开始：选择倒计时时间 -->
              <template v-if="!countdownRunning && countdownRemaining <= 0">
                <div class="countdown-setup d-flex align-center ga-4">
                  <div class="text-center">
                    <v-btn
                      :icon="ICON.CHEVRON_UP"
                      variant="text"
                      size="small"
                      @click="countdownHours = Math.min(countdownHours + 1, 99)"
                    />
                    <div class="countdown-digit">
                      {{ String(countdownHours).padStart(2, '0') }}
                    </div>
                    <v-btn
                      :icon="ICON.CHEVRON_DOWN"
                      variant="text"
                      size="small"
                      @click="countdownHours = Math.max(countdownHours - 1, 0)"
                    />
                    <div class="text-body-small text-medium-emphasis">
                      时
                    </div>
                  </div>
                  <div class="countdown-sep">
                    :
                  </div>
                  <div class="text-center">
                    <v-btn
                      :icon="ICON.CHEVRON_UP"
                      variant="text"
                      size="small"
                      @click="countdownMinutes = Math.min(countdownMinutes + 1, 59)"
                    />
                    <div class="countdown-digit">
                      {{ String(countdownMinutes).padStart(2, '0') }}
                    </div>
                    <v-btn
                      :icon="ICON.CHEVRON_DOWN"
                      variant="text"
                      size="small"
                      @click="countdownMinutes = Math.max(countdownMinutes - 1, 0)"
                    />
                    <div class="text-body-small text-medium-emphasis">
                      分
                    </div>
                  </div>
                  <div class="countdown-sep">
                    :
                  </div>
                  <div class="text-center">
                    <v-btn
                      :icon="ICON.CHEVRON_UP"
                      variant="text"
                      size="small"
                      @click="countdownSeconds = Math.min(countdownSeconds + 1, 59)"
                    />
                    <div class="countdown-digit">
                      {{ String(countdownSeconds).padStart(2, '0') }}
                    </div>
                    <v-btn
                      :icon="ICON.CHEVRON_DOWN"
                      variant="text"
                      size="small"
                      @click="countdownSeconds = Math.max(countdownSeconds - 1, 0)"
                    />
                    <div class="text-body-small text-medium-emphasis">
                      秒
                    </div>
                  </div>
                </div>
                <!-- 快捷按钮 -->
                <div class="mt-8 d-flex ga-3 flex-wrap justify-center">
                  <v-btn
                    v-for="preset in countdownPresets"
                    :key="preset.label"
                    variant="tonal"
                    rounded="xl"
                    @click="applyCountdownPreset(preset)"
                  >
                    {{ preset.label }}
                  </v-btn>
                </div>
                <div class="mt-8">
                  <v-btn
                    color="primary"
                    size="x-large"
                    rounded="xl"
                    :disabled="countdownTotalSetSeconds <= 0"
                    :prepend-icon="ICON.PLAY"
                    @click="startCountdown"
                  >
                    开始
                  </v-btn>
                </div>
              </template>

              <!-- 运行中/暂停 -->
              <template v-else>
                <div
                  class="fullscreen-time-display"
                  :class="{ 'countdown-ended': countdownRemaining <= 0 && !countdownRunning }"
                >
                  {{ countdownDisplay }}
                </div>
                <div class="fullscreen-date-line mt-4 text-medium-emphasis">
                  {{ countdownRunning ? '倒计时进行中' : (countdownRemaining <= 0 ? '时间到！' : '已暂停') }}
                </div>
                <!-- 进度 -->
                <v-progress-linear
                  :model-value="countdownProgressPercent"
                  :color="countdownRemaining <= 0 ? 'error' : 'primary'"
                  class="mt-8"
                  height="6"
                  rounded
                  style="max-width: 400px; width: 80vw"
                />
                <div class="mt-8 d-flex ga-3">
                  <v-btn
                    v-if="countdownRemaining > 0"
                    :icon="countdownRunning ? 'mdi-pause' : 'mdi-play'"
                    :color="countdownRunning ? 'warning' : 'primary'"
                    size="x-large"
                    variant="tonal"
                    @click="toggleCountdown"
                  />
                  <v-btn
                    :icon="ICON.STOP"
                    color="error"
                    size="x-large"
                    variant="tonal"
                    @click="resetCountdown"
                  />
                </div>
              </template>
            </div>
          </v-tabs-window-item>

          <!-- ========= 秒表模式 ========= -->
          <v-tabs-window-item value="stopwatch">
            <div class="d-flex flex-column align-center justify-center">
              <div class="fullscreen-time-display">
                {{ stopwatchDisplay }}
              </div>
              <div class="fullscreen-date-line mt-4 text-medium-emphasis">
                {{ stopwatchRunning ? '计时中' : (stopwatchElapsed > 0 ? '已暂停' : '秒表') }}
              </div>
              <div class="mt-8 d-flex ga-3">
                <v-btn
                  :icon="stopwatchRunning ? 'mdi-pause' : 'mdi-play'"
                  :color="stopwatchRunning ? 'warning' : 'primary'"
                  size="x-large"
                  variant="tonal"
                  @click="toggleStopwatch"
                />
                <v-btn
                  v-if="stopwatchRunning"
                  :icon="ICON.FLAG"
                  color="info"
                  size="x-large"
                  variant="tonal"
                  @click="addLap"
                />
                <v-btn
                  v-if="!stopwatchRunning && stopwatchElapsed > 0"
                  :icon="ICON.STOP"
                  color="error"
                  size="x-large"
                  variant="tonal"
                  @click="resetStopwatch"
                />
              </div>
              <!-- 计次记录 -->
              <v-slide-y-transition>
                <div
                  v-if="laps.length > 0"
                  class="stopwatch-laps mt-6"
                >
                  <v-table
                    density="compact"
                    class="stopwatch-laps-table"
                  >
                    <thead>
                      <tr>
                        <th>
                          #
                        </th>
                        <th>
                          计次
                        </th>
                        <th>
                          总计
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(lap, idx) in laps"
                        :key="idx"
                      >
                        <td>
                          {{ laps.length - idx }}
                        </td>
                        <td>
                          {{ formatMs(lap.split) }}
                        </td>
                        <td>
                          {{ formatMs(lap.total) }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-slide-y-transition>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>

      <!-- 右下角按钮组 -->
      <div class="fullscreen-actions">
        <v-btn
          :icon="ICON.SETTINGS"
          variant="text"
          size="large"
          @click.stop="showSettings = true"
        />
        <v-btn
          :icon="ICON.CLOSE"
          variant="text"
          size="large"
          class="ml-2"
          @click="showFullscreen = false"
        />
      </div>
    </v-card>
  </v-dialog>

  <!-- 倒计时结束弹框 -->
  <v-dialog
    v-model="countdownEndedDialog"
    max-width="480"
    persistent
  >
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center justify-center pt-6">
        <v-icon
          color="error"
          size="32"
          class="mr-2"
          :icon="ICON.ALARM"
        />
        时间到！
      </v-card-title>
      <v-card-text class="text-center pb-2">
        <div
          class="text-headline-large font-weight-bold my-4"
          style="font-variant-numeric: tabular-nums;"
        >
          {{ formatCountdownTotal(countdownTotal) }}
        </div>
        <div class="text-body-large text-medium-emphasis">
          设定的倒计时已结束
        </div>
        <div
          v-if="overtimeElapsed > 0"
          class="mt-4"
        >
          <v-chip
            color="error"
            variant="tonal"
            size="large"
            :prepend-icon="ICON.CLOCK_ALERT_OUTLINE"
          >
            已超时 {{ overtimeDisplay }}
          </v-chip>
        </div>
      </v-card-text>
      <v-card-actions class="justify-center pb-6">
        <v-btn
          color="primary"
          variant="tonal"
          size="large"
          rounded="xl"
          :prepend-icon="ICON.CHECK"
          @click="dismissCountdownDialog"
        >
          知道了
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 设置弹框 -->
  <v-dialog
    v-model="showSettings"
    max-width="420"
    :scrim="true"
  >
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        <v-icon
          class="mr-2"
          :icon="ICON.SETTINGS"
        />
        时间卡片设置
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item>
            <template #prepend>
              <v-icon
                class="mr-3"
                :icon="ICON.CLOCK_OUTLINE"
              />
            </template>
            <v-list-item-title>显示时间卡片</v-list-item-title>
            <v-list-item-subtitle>在首页显示时间卡片，刷新后生效。</v-list-item-subtitle>
            <template #append>
              <v-switch
                :model-value="timeCardEnabled"
                hide-details
                density="comfortable"
                @update:model-value="setTimeCardEnabled"
              />
            </template>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon
                class="mr-3"
                :icon="ICON.CLOCK_TIME_SIX_OUTLINE"
              />
            </template>
            <v-list-item-title>12 小时制</v-list-item-title>
            <v-list-item-subtitle>以 12 小时制（AM/PM）显示时间。</v-list-item-subtitle>
            <template #append>
              <v-switch
                :model-value="use12hClock"
                hide-details
                density="comfortable"
                @update:model-value="setUse12hClock"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="showSettings = false"
        >
          完成
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ICON } from '@/utils/icons'
import { SettingsManager, watchSettings, getSetting, setSetting } from '@/utils/settings'
import { playSound, defaultSingleSound } from '@/utils/soundList'
import { formatDateChinese } from '@/utils/dateUtils'

const TIME_FONT_RATIO = 2.0
const SECONDS_FONT_RATIO = 0.9
const DATE_FONT_RATIO = 0.6

export default {
  name: 'TimeCard',
  data() {
    return {
      ICON,
      now: new Date(),
      timer: null,
      unwatch: null,
      fontSize: 28,
      showFullscreen: false,
      showSettings: false,
      timeCardEnabled: true,
      use12hClock: false,
      fullscreenMode: 'clock',
      toolbarVisible: true,
      toolbarTimer: null,
      countdownHours: 0,
      countdownMinutes: 5,
      countdownSeconds: 0,
      countdownRunning: false,
      countdownRemaining: 0,
      countdownTotal: 0,
      countdownTimer: null,
      countdownLastTick: null,
      countdownPresets: [
        { label: '1 分钟', h: 0, m: 1, s: 0 },
        { label: '3 分钟', h: 0, m: 3, s: 0 },
        { label: '5 分钟', h: 0, m: 5, s: 0 },
        { label: '10 分钟', h: 0, m: 10, s: 0 },
        { label: '15 分钟', h: 0, m: 15, s: 0 },
        { label: '30 分钟', h: 0, m: 30, s: 0 },
        { label: '1 小时', h: 1, m: 0, s: 0 },
      ],
      countdownEndedDialog: false,
      overtimeElapsed: 0,
      overtimeTimer: null,
      overtimeLastTick: null,
      stopwatchRunning: false,
      stopwatchElapsed: 0,
      stopwatchTimer: null,
      stopwatchLastTick: null,
      laps: [],
      lastLapElapsed: 0,
      cachedTimeStyle: null,
      cachedSecondsStyle: null,
      cachedDateStyle: null,
    }
  },
  computed: {
    timeString() {
      const hours = this.now.getHours()
      const m = String(this.now.getMinutes()).padStart(2, '0')
      if (this.use12hClock) {
        const h12 = hours % 12 || 12
        return `${h12}:${m}`
      }
      return `${String(hours).padStart(2, '0')}:${m}`
    },
    amPmString() {
      return this.now.getHours() < 12 ? 'AM' : 'PM'
    },
    secondsString() {
      return `:${String(this.now.getSeconds()).padStart(2, '0')}`
    },
    dateString() {
      return formatDateChinese(this.now)
    },
    weekdayString() {
      const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      return days[this.now.getDay()]
    },
    periodOfDay() {
      const h = this.now.getHours()
      if (h < 6) return '凌晨'
      if (h < 8) return '早晨'
      if (h < 11) return '上午'
      if (h < 13) return '中午'
      if (h < 17) return '下午'
      if (h < 19) return '傍晚'
      if (h < 22) return '晚上'
      return '深夜'
    },
    dayProgressPercent() {
      const h = this.now.getHours()
      const m = this.now.getMinutes()
      const s = this.now.getSeconds()
      const totalSeconds = h * 3600 + m * 60 + s
      return ((totalSeconds / 86400) * 100).toFixed(1)
    },

    timeStyle() {
      return this.cachedTimeStyle
    },
    secondsStyle() {
      return this.cachedSecondsStyle
    },
    dateStyle() {
      return this.cachedDateStyle
    },
    // 倒计时 computed
    countdownTotalSetSeconds() {
      return this.countdownHours * 3600 + this.countdownMinutes * 60 + this.countdownSeconds
    },
    countdownDisplay() {
      const totalSec = Math.max(0, Math.ceil(this.countdownRemaining / 1000))
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      }
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    },
    countdownProgressPercent() {
      if (this.countdownTotal <= 0) return 0
      return ((this.countdownTotal - this.countdownRemaining) / this.countdownTotal) * 100
    },
    overtimeDisplay() {
      const totalSec = Math.floor(this.overtimeElapsed / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (h > 0) {
        return `${h}小时${m}分${s}秒`
      }
      if (m > 0) {
        return `${m}分${s}秒`
      }
      return `${s}秒`
    },
    // 秒表 computed
    stopwatchDisplay() {
      const ms = this.stopwatchElapsed
      const totalSec = Math.floor(ms / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      const centis = Math.floor((ms % 1000) / 10)
      if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
      }
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
    },
  },
  watch: {
    fontSize: {
      immediate: true,
      handler(newSize) {
        this.cachedTimeStyle = {
          fontSize: `${newSize * TIME_FONT_RATIO}px`,
          fontWeight: '700',
          lineHeight: '1',
          letterSpacing: '4px',
          fontVariantNumeric: 'tabular-nums',
          fontSize_: newSize,
        }
        this.cachedSecondsStyle = {
          fontSize: `${newSize * SECONDS_FONT_RATIO}px`,
          fontVariantNumeric: 'tabular-nums',
          verticalAlign: 'baseline',
          marginLeft: '4px',
          opacity: '0.6',
          fontSize_: newSize,
        }
        this.cachedDateStyle = {
          fontSize: `${newSize * DATE_FONT_RATIO}px`,
          letterSpacing: '1px',
          fontSize_: newSize,
        }
      },
    },
    showFullscreen(val) {
      if (val) {
        this.handleKeydown = (e) => {
          if (e.key === 'Escape') {
            if (this.showSettings) {
              this.showSettings = false
            } else if (this.countdownEndedDialog) {
              this.dismissCountdownDialog()
            }
            // 不关闭全屏弹框，阻止默认行为
            e.preventDefault()
            e.stopPropagation()
          }
        }
        window.addEventListener('keydown', this.handleKeydown, true)
        this.showToolbar()
      } else {
        if (this.handleKeydown) {
          window.removeEventListener('keydown', this.handleKeydown, true)
          this.handleKeydown = null
        }
        this.clearToolbarTimer()
      }
    },
  },
  async mounted() {
    this.loadSettings()
    this.startTimer()
    this.unwatch = watchSettings(() => {
      this.loadSettings()
    })
  },
  beforeUnmount() {
    this.stopTimer()
    this.clearCountdownTimer()
    this.clearStopwatchTimer()
    this.clearToolbarTimer()
    this.dismissCountdownDialog()
    if (this.unwatch) {
      this.unwatch()
    }
    if (this.handleKeydown) {
      window.removeEventListener('keydown', this.handleKeydown, true)
    }
  },
  methods: {
    loadSettings() {
      this.fontSize = SettingsManager.getSetting('font.size')
      this.timeCardEnabled = getSetting('timeCard.enabled')
      this.use12hClock = getSetting('timeCard.use12h')
    },
    setTimeCardEnabled(val) {
      this.timeCardEnabled = val
      setSetting('timeCard.enabled', val)
    },
    setUse12hClock(val) {
      this.use12hClock = val
      setSetting('timeCard.use12h', val)
    },
    startTimer() {
      this.timer = setInterval(() => {
        this.now = new Date()
      }, 1000)
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    // ---- 工具栏自动隐藏 ----
    showToolbar() {
      this.toolbarVisible = true
      this.clearToolbarTimer()
      this.toolbarTimer = setTimeout(() => {
        this.toolbarVisible = false
      }, 3000)
    },
    clearToolbarTimer() {
      if (this.toolbarTimer) {
        clearTimeout(this.toolbarTimer)
        this.toolbarTimer = null
      }
    },

    // ---- 倒计时 ----
    applyCountdownPreset(preset) {
      this.countdownHours = preset.h
      this.countdownMinutes = preset.m
      this.countdownSeconds = preset.s
    },
    startCountdown() {
      const totalMs = this.countdownTotalSetSeconds * 1000
      if (totalMs <= 0) return
      this.countdownTotal = totalMs
      this.countdownRemaining = totalMs
      this.countdownRunning = true
      this.countdownLastTick = Date.now()
      this.countdownTimer = setInterval(() => {
        this.tickCountdown()
      }, 50)
    },
    tickCountdown() {
      const now = Date.now()
      const delta = now - this.countdownLastTick
      this.countdownLastTick = now
      this.countdownRemaining = Math.max(0, this.countdownRemaining - delta)
      if (this.countdownRemaining <= 0) {
        this.countdownRunning = false
        this.clearCountdownTimer()
        playSound(defaultSingleSound)
        this.showCountdownEndedDialog()
      }
    },
    toggleCountdown() {
      if (this.countdownRunning) {
        this.countdownRunning = false
        this.clearCountdownTimer()
      } else {
        this.countdownRunning = true
        this.countdownLastTick = Date.now()
        this.countdownTimer = setInterval(() => {
          this.tickCountdown()
        }, 50)
      }
    },
    resetCountdown() {
      this.countdownRunning = false
      this.countdownRemaining = 0
      this.countdownTotal = 0
      this.clearCountdownTimer()
      this.dismissCountdownDialog()
    },
    showCountdownEndedDialog() {
      this.countdownEndedDialog = true
      this.overtimeElapsed = 0
      this.overtimeLastTick = Date.now()
      this.overtimeTimer = setInterval(() => {
        const now = Date.now()
        this.overtimeElapsed += now - this.overtimeLastTick
        this.overtimeLastTick = now
      }, 200)
    },
    dismissCountdownDialog() {
      this.countdownEndedDialog = false
      this.overtimeElapsed = 0
      if (this.overtimeTimer) {
        clearInterval(this.overtimeTimer)
        this.overtimeTimer = null
      }
    },
    formatCountdownTotal(ms) {
      const totalSec = Math.round(ms / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      const parts = []
      if (h > 0) parts.push(`${h}小时`)
      if (m > 0) parts.push(`${m}分钟`)
      if (s > 0) parts.push(`${s}秒`)
      return parts.join('') || '0秒'
    },
    clearCountdownTimer() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
      }
    },

    // ---- 秒表 ----
    toggleStopwatch() {
      if (this.stopwatchRunning) {
        this.stopwatchRunning = false
        this.clearStopwatchTimer()
      } else {
        this.stopwatchRunning = true
        this.stopwatchLastTick = Date.now()
        this.stopwatchTimer = setInterval(() => {
          this.tickStopwatch()
        }, 30)
      }
    },
    tickStopwatch() {
      const now = Date.now()
      this.stopwatchElapsed += now - this.stopwatchLastTick
      this.stopwatchLastTick = now
    },
    addLap() {
      const split = this.stopwatchElapsed - this.lastLapElapsed
      this.laps.unshift({ split, total: this.stopwatchElapsed })
      this.lastLapElapsed = this.stopwatchElapsed
    },
    resetStopwatch() {
      this.stopwatchRunning = false
      this.stopwatchElapsed = 0
      this.lastLapElapsed = 0
      this.laps = []
      this.clearStopwatchTimer()
    },
    clearStopwatchTimer() {
      if (this.stopwatchTimer) {
        clearInterval(this.stopwatchTimer)
        this.stopwatchTimer = null
      }
    },
    formatMs(ms) {
      const totalSec = Math.floor(ms / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      const centis = Math.floor((ms % 1000) / 10)
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
    },
    handleMouseMove(e) {
      const card = e.currentTarget
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty("--x", `${x}%`)
      card.style.setProperty("--y", `${y}%`)
    },
    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const card = e.currentTarget
        const rect = card.getBoundingClientRect()
        const x = ((touch.clientX - rect.left) / rect.width) * 100
        const y = ((touch.clientY - rect.top) / rect.height) * 100
        card.style.setProperty("--x", `${x}%`)
        card.style.setProperty("--y", `${y}%`)
      }
    },
  },
}
</script>

<style scoped>
.time-card {
  overflow: hidden;
}

.time-display {
  font-family: var(--font-mono);
  white-space: nowrap;
}

.seconds-text {
  font-family: var(--font-mono);
}

.date-line {
  opacity: 0.75;
  letter-spacing: var(--tracking-wide);
}

/* 全屏样式 */
.fullscreen-time-card {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 顶部工具栏 */
.fullscreen-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-toolbar);
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

.fullscreen-tabs {
  background: transparent;
  border-radius: var(--radius-md);
}

.toolbar-fade-enter-active,
.toolbar-fade-leave-active {
  transition: opacity var(--duration-slow) var(--ease-apple), transform var(--duration-slow) var(--ease-apple);
}

.toolbar-fade-enter-from,
.toolbar-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fullscreen-tabs-window {
  width: 100%;
}

.fullscreen-time-body {
  user-select: none;
  padding: 0 var(--space-6);
}

.fullscreen-time-display {
  font-weight: var(--font-weight-heading);
  letter-spacing: var(--tracking-display);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: clamp(2rem, 12vw, 8rem);
}

@media (min-width: 768px) {
  .fullscreen-time-display {
    font-size: clamp(4rem, 15vw, 12rem);
  }
}

.fullscreen-seconds {
  font-size: 0.45em;
  vertical-align: baseline;
  margin-left: 4px;
  opacity: 0.5;
}

.fullscreen-date-line {
  font-size: clamp(1rem, 3vw, 2.2rem);
  opacity: 0.7;
  letter-spacing: var(--tracking-wide);
}

.fullscreen-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fullscreen-extra {
  font-variant-numeric: tabular-nums;
}

.fullscreen-actions {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  opacity: 0.5;
  transition: opacity var(--duration-normal) var(--ease-apple);
}

.fullscreen-actions:hover {
  opacity: 1;
}

/* 倒计时设置 */
.countdown-setup {
  user-select: none;
}

.countdown-digit {
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: var(--font-weight-heading);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  min-width: 1.2em;
  text-align: center;
}

.countdown-sep {
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: var(--font-weight-light);
  line-height: 1;
  opacity: 0.4;
  padding-bottom: 1.8em;
}

.countdown-ended {
  animation: pulse-red 1s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* 秒表计次列表 */
.stopwatch-laps {
  max-height: 30vh;
  overflow-y: auto;
  width: min(90vw, 400px);
}

.stopwatch-laps-table {
  background: transparent !important;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
</style>
