/**
 * icons.js — 集中管理所有 MDI 图标引用
 *
 * 命名规则：全大写 + 下划线，按功能域分组
 * 使用方式：
 *   import { ICON } from '@/utils/icons'
 *   <v-icon :icon="ICON.CHAT" />
 *
 * 图标颜色语义分类（用于 color prop）：
 *
 *   ┌──────────┬─────────────────┬──────────────────────────────────┐
 *   │ 分类      │ Vuetify 值      │ 适用场景                         │
 *   ├──────────┼─────────────────┼──────────────────────────────────┤
 *   │ inherit  │ 不传 color      │ 纯装饰图标（标题旁、列表项、说明） │
 *   │ brand    │ primary         │ 品牌交互（导航、标签、可点击图标） │
 *   │ success  │ success         │ 成功/正向（完成、已连接、开始）   │
 *   │ error    │ error           │ 错误/警报（删除、断开、失败）     │
 *   │ warning  │ warning         │ 警告/注意（需关注的状态）          │
 *   │ info     │ info            │ 信息提示、说明                    │
 *   │ on-dark  │ white           │ 深色背景上的图标（bg-primary等）   │
 *   │ muted    │ grey-darken-1   │ 弱化/次要信息（禁用、占位）       │
 *   └──────────┴─────────────────┴──────────────────────────────────┘
 *
 *   约定：同一组件内装饰图标全部统一为一种分类，状态图标单独设色
 */

export const ICON = {
  // ============ 通用 ============
  CLOSE: 'mdi-close',
  SETTINGS: 'mdi-cog',
  HOME: 'mdi-home',
  SEARCH: 'mdi-magnify',
  CHECK: 'mdi-check',
  DELETE: 'mdi-delete',
  PLUS: 'mdi-plus',
  EDIT: 'mdi-pencil',
  CHEVRON_UP: 'mdi-chevron-up',
  CHEVRON_DOWN: 'mdi-chevron-down',
  CHEVRON_LEFT: 'mdi-chevron-left',
  CHEVRON_RIGHT: 'mdi-chevron-right',
  INFORMATION: 'mdi-information',
  HELP: 'mdi-help',
  HELP_CIRCLE: 'mdi-help-circle',
  LINK: 'mdi-link',
  LINK_VARIANT: 'mdi-link-variant',
  MENU: 'mdi-menu',
  ARROW_UP: 'mdi-arrow-up',
  ARROW_DOWN: 'mdi-arrow-down',
  ARROW_LEFT: 'mdi-arrow-left',
  ARROW_RIGHT: 'mdi-arrow-right',
  ARROW_UP_BOLD: 'mdi-arrow-up-bold',
  ARROW_LEFT_DROP_CIRCLE: 'mdi-arrow-left-drop-circle',
  MINUS: 'mdi-minus',
  DRAG_VERTICAL: 'mdi-drag-vertical',
  FLAG: 'mdi-flag',
  HEART: 'mdi-heart',
  BUG: 'mdi-bug',
  QQCHAT: 'mdi-qqchat',
  GITHUB: 'mdi-github',
  PACKAGE_VARIANT: 'mdi-package-variant',
  MESSAGE_ALERT: 'mdi-message-alert',
  EMAIL: 'mdi-email',

  // ============ 状态 ============
  SUCCESS: 'mdi-check-circle',
  ERROR: 'mdi-alert-circle',
  WARNING: 'mdi-alert',
  INFO: 'mdi-information',
  ALERT_CIRCLE_OUTLINE: 'mdi-alert-circle-outline',
  CLOSE_CIRCLE: 'mdi-close-circle',
  CANCEL: 'mdi-cancel',
  STAR_CIRCLE_OUTLINE: 'mdi-star-circle-outline',
  CHECK_CIRCLE_OUTLINE: 'mdi-check-circle-outline',
  DELETE_ALERT: 'mdi-delete-alert',
  DELETE_SWEEP: 'mdi-delete-sweep',

  // ============ 导航 ============
  ACCOUNT: 'mdi-account',
  ACCOUNT_OUTLINE: 'mdi-account-outline',
  ACCOUNT_PLUS: 'mdi-account-plus',
  ACCOUNT_GROUP: 'mdi-account-group',
  ACCOUNT_GROUP_OUTLINE: 'mdi-account-group-outline',
  ACCOUNT_KEY: 'mdi-account-key',
  ACCOUNT_TIE: 'mdi-account-tie',
  ACCOUNT_CHECK: 'mdi-account-check',
  ACCOUNT_CANCEL: 'mdi-account-cancel',
  ACCOUNT_OFF: 'mdi-account-off',
  ACCOUNT_QUESTION: 'mdi-account-question',
  KEY: 'mdi-key',
  KEY_VARIANT: 'mdi-key-variant',
  SHIELD_KEY: 'mdi-shield-key',
  LOCK: 'mdi-lock',
  LOCK_OPEN: 'mdi-lock-open',
  LOCK_OUTLINE: 'mdi-lock-outline',
  LOCK_ALERT: 'mdi-lock-alert',
  IDENTIFIER: 'mdi-identifier',
  UUID: 'mdi-uuid',

  // ============ 通信 ============
  CHAT: 'mdi-chat',
  CHAT_PROCESSING: 'mdi-chat-processing',
  SEND: 'mdi-send',
  EMOTICON_OUTLINE: 'mdi-emoticon-outline',
  COMMENT_QUOTE: 'mdi-comment-quote',
  MESSAGE_OUTLINE: 'mdi-message-outline',
  MESSAGE_TEXT: 'mdi-message-text',
  LINK_OFF: 'mdi-link-off',
  SYNC: 'mdi-sync',

  // ============ 通知 ============
  BELL: 'mdi-bell',
  BELL_ALERT: 'mdi-bell-alert',
  BELL_RING: 'mdi-bell-ring',
  INBOX: 'mdi-inbox',
  INFORMATION_OUTLINE: 'mdi-information-outline',

  // ============ 时间 ============
  CALENDAR: 'mdi-calendar',
  CALENDAR_TEXT: 'mdi-calendar-text',
  CALENDAR_CHECK: 'mdi-calendar-check',
  CALENDAR_CLOCK: 'mdi-calendar-clock',
  CALENDAR_BLANK: 'mdi-calendar-blank',
  CALENDAR_MULTISELECT: 'mdi-calendar-multiselect',
  CALENDAR_RANGE: 'mdi-calendar-range',
  CALENDAR_WEEK: 'mdi-calendar-week',
  CLOCK_START: 'mdi-clock-start',
  CLOCK_END: 'mdi-clock-end',
  CLOCK_OUTLINE: 'mdi-clock-outline',
  CLOCK_ALERT: 'mdi-clock-alert',
  CLOCK_ALERT_OUTLINE: 'mdi-clock-alert-outline',
  CLOCK_TIME_SIX_OUTLINE: 'mdi-clock-time-six-outline',
  TIMER: 'mdi-timer',
  TIMER_OUTLINE: 'mdi-timer-outline',
  TIMER_SAND: 'mdi-timer-sand',
  PROGRESS_CLOCK: 'mdi-progress-clock',
  ALARM: 'mdi-alarm',
  HOURGLASS: 'mdi-hourglass',
  UPDATE: 'mdi-update',
  HISTORY: 'mdi-history',

  // ============ 考试 ============
  BOOK: 'mdi-book-open-page-variant',
  BOOK_SIMPLE: 'mdi-book',
  BOOK_EDIT: 'mdi-book-edit',
  BOOK_MULTIPLE: 'mdi-book-multiple',
  BOOK_OPEN_VARIANT: 'mdi-book-open-variant',
  BOOK_NOTEBOOK: 'mdi-notebook',
  BOOK_CHECKBOX_BLANK_OUTLINE: 'mdi-checkbox-blank-circle-outline',
  FORMAT_LIST: 'mdi-format-list-bulleted',
  FORMAT_LIST_NUMBERED: 'mdi-format-list-numbered',
  RENAME_BOX: 'mdi-rename-box',
  TEXT_BOX: 'mdi-text-box',
  TEXT_BOX_OUTLINE: 'mdi-text-box-outline',
  BRAIN: 'mdi-brain',
  TIMETABLE: 'mdi-timetable',

  // ============ 设置与工具 ============
  COG_OUTLINE: 'mdi-cog-outline',
  COG_TRANSFER: 'mdi-cog-transfer',
  COG_OFF: 'mdi-cog-off',
  COG_REFRESH: 'mdi-cog-refresh',
  DOTS_VERTICAL: 'mdi-dots-vertical',
  PALETTE: 'mdi-palette',
  AUTO_FIX: 'mdi-auto-fix',
  CONTENT_COPY: 'mdi-content-copy',
  CONTENT_PASTE: 'mdi-content-paste',
  CONTENT_SAVE: 'mdi-content-save',
  RESTORE: 'mdi-restore',
  COUNTER: 'mdi-counter',
  TOGGLE_SWITCH_OUTLINE: 'mdi-toggle-switch-outline',
  FORM_TEXTBOX: 'mdi-form-textbox',
  NUMERIC_ICON: 'mdi-numeric',
  SELECT_ALL: 'mdi-select-all',
  SELECT_REMOVE: 'mdi-select-remove',
  COMPARE: 'mdi-compare',
  FILTER: 'mdi-filter',
  LIST_BOX: 'mdi-list-box',
  LIST_STATUS: 'mdi-list-status',

  // ============ 设置导航（侧边栏专用） ============
  CLOUD_SYNC: 'mdi-cloud-sync',
  EYE: 'mdi-eye',
  DICE_MULTIPLE: 'mdi-dice-multiple',
  IMAGE: 'mdi-image',
  DEVELOPER_BOARD: 'mdi-developer-board',

  // ============ 数据与存储 ============
  DATABASE: 'mdi-database',
  DATABASE_COG: 'mdi-database-cog',
  DATABASE_COG_OUTLINE: 'mdi-database-cog-outline',
  DATABASE_EDIT: 'mdi-database-edit',
  DATABASE_EXPORT: 'mdi-database-export',
  DATABASE_IMPORT: 'mdi-database-import',
  DATABASE_ARROW_UP: 'mdi-database-arrow-up',
  DATABASE_OFF: 'mdi-database-off',
  DATABASE_SYNC: 'mdi-database-sync',
  CLOUD_CHECK: 'mdi-cloud-check',
  CLOUD_DOWNLOAD: 'mdi-cloud-download',
  CLOUD_COG: 'mdi-cloud-cog',
  CLOUD_LOCK: 'mdi-cloud-lock',
  CLOUD_OFF: 'mdi-cloud-off',
  CLOUD_UPLOAD: 'mdi-cloud-upload',
  HARDDISK: 'mdi-harddisk',
  SERVER: 'mdi-server',
  SERVER_NETWORK: 'mdi-server-network',
  SERVER_OFF: 'mdi-server-off',
  SYNC_CIRCLE: 'mdi-sync-circle',
  TABLE_ICON: 'mdi-table',
  TAG: 'mdi-tag',
  CODE_BRACES: 'mdi-code-braces',
  CODE_JSON: 'mdi-code-json',
  CODE_TAGS: 'mdi-code-tags',
  WEB: 'mdi-web',
  WIFI: 'mdi-wifi',
  WIFI_OFF: 'mdi-wifi-off',
  DOWNLOAD: 'mdi-download',
  UPLOAD: 'mdi-upload',
  REFRESH: 'mdi-refresh',
  CONNECTION: 'mdi-connection',
  LAN_CONNECT: 'mdi-lan-connect',
  TRANSIT_CONNECTION_VARIANT: 'mdi-transit-connection-variant',

  // ============ 显示与外观 ============
  THEME_LIGHT_DARK: 'mdi-theme-light-dark',
  WHITE_BALANCE_SUNNY: 'mdi-white-balance-sunny',
  MOON_WANING_CRESCENT: 'mdi-moon-waning-crescent',
  MONITOR: 'mdi-monitor',
  MONITOR_CELLPHONE: 'mdi-monitor-cellphone',
  IMAGE_SEARCH: 'mdi-image-search',
  IMAGE_PLUS: 'mdi-image-plus',
  IMAGE_AREA: 'mdi-image-area',
  CARD_TEXT_OUTLINE: 'mdi-card-text-outline',
  CIRCLE_SMALL: 'mdi-circle-small',
  BLUR: 'mdi-blur',
  BLUR_OFF: 'mdi-blur-off',
  BRIGHTNESS_7: 'mdi-brightness-7',
  BRIGHTNESS_2: 'mdi-brightness-2',
  FORMAT_FONT_SIZE_DECREASE: 'mdi-format-font-size-decrease',
  FORMAT_FONT_SIZE_INCREASE: 'mdi-format-font-size-increase',
  FULLSCREEN: 'mdi-fullscreen',
  FULLSCREEN_EXIT: 'mdi-fullscreen-exit',
  WIDGETS_OUTLINE: 'mdi-widgets-outline',

  // ============ 多媒体 ============
  PLAY: 'mdi-play',
  PAUSE: 'mdi-pause',
  STOP: 'mdi-stop',
  MUSIC_NOTE: 'mdi-music-note',

  // ============ 网络与连接 ============
  NETWORK: 'mdi-network',
  IP_NETWORK: 'mdi-ip-network',
  MAP_MARKER_RADIUS: 'mdi-map-marker-radius',
  THERMOMETER: 'mdi-thermometer',
  WEATHER_CLOUDY: 'mdi-weather-cloudy',
  WEATHER_WINDY: 'mdi-weather-windy',
  WATER_PERCENT: 'mdi-water-percent',

  // ============ 设备 ============
  LAPTOP: 'mdi-laptop',
  DEVELOPER_MODE: 'mdi-developer-board',
  BROOM: 'mdi-broom',
  FLASH: 'mdi-flash',
  ROCKET_LAUNCH: 'mdi-rocket-launch',
  ROCKET_LAUNCH_OUTLINE: 'mdi-rocket-launch-outline',
  HAND_WAVE: 'mdi-hand-wave',
  THOUGHT_BUBBLE: 'mdi-thought-bubble',

  // ============ 动作与操作 ============
  PLAY_CIRCLE: 'mdi-play-circle',
  HAND_BACK_LEFT: 'mdi-hand-back-left',
  SORT_ALPHABETICAL_VARIANT: 'mdi-sort-alphabetical-variant',
  OPEN_IN_NEW: 'mdi-open-in-new',
  TEST_TUBE: 'mdi-test-tube',
  GESTURE_TAP: 'mdi-gesture-tap',
  GESTURE_TAP_BUTTON: 'mdi-gesture-tap-button',
  SHIELD_CHECK: 'mdi-shield-check',
  STAR: 'mdi-star',
  STAR_OUTLINE: 'mdi-star-outline',
  IMPORT_ICON: 'mdi-import',
  EXPORT_ICON: 'mdi-export',
  NEW_BOX: 'mdi-new-box',
  SWAP_HORIZONTAL: 'mdi-swap-horizontal',
  CHECKBOX_MULTIPLE_MARKED: 'mdi-checkbox-multiple-marked',
  CHECKBOX_MULTIPLE_BLANK_OUTLINE: 'mdi-checkbox-multiple-blank-outline',
  FILE_UPLOAD: 'mdi-file-upload',
  PROGRESS_UPLOAD: 'mdi-progress-upload',

  // ============ 灯与光 ============
  LIGHTBULB_OUTLINE: 'mdi-lightbulb-outline',

  // ============ 数字图标（安全映射） ============
  NUMERIC_1_CIRCLE: 'mdi-numeric-1-circle',
  NUMERIC_2_CIRCLE: 'mdi-numeric-2-circle',
  NUMERIC_3_CIRCLE: 'mdi-numeric-3-circle',
  NUMERIC_4_CIRCLE: 'mdi-numeric-4-circle',
  NUMERIC_5_CIRCLE: 'mdi-numeric-5-circle',
  NUMERIC_6_CIRCLE: 'mdi-numeric-6-circle',
  NUMERIC_7_CIRCLE: 'mdi-numeric-7-circle',
  NUMERIC_8_CIRCLE: 'mdi-numeric-8-circle',
  NUMERIC_9_CIRCLE: 'mdi-numeric-9-circle',
  NUMERIC_10_CIRCLE: 'mdi-numeric-10-circle',
  NUMERIC_NEGATIVE_1: 'mdi-numeric-negative-1',

  // ============ 文件与导入导出 ============
  FILE_EXPORT_OUTLINE: 'mdi-file-export-outline',
  FILE_IMPORT_OUTLINE: 'mdi-file-import-outline',
  FILE_PDF_BOX: 'mdi-file-pdf-box',
  DATABASE_IMPORT_OUTLINE: 'mdi-database-import-outline',
  BOOK_OPEN_BLANK_VARIANT_OUTLINE: 'mdi-book-open-blank-variant-outline',

  // ============ 教育 ============
  SCHOOL: 'mdi-school',
  PIN: 'mdi-pin',
  LOGIN: 'mdi-login',

  // ============ 设置项图标 ============
  CARD_OUTLINE: 'mdi-card-outline',
  TIMER_REFRESH: 'mdi-timer-refresh',
  SORT_VARIANT: 'mdi-sort-variant',
  SHUFFLE_VARIANT: 'mdi-shuffle-variant',
  MONITOR_SHIMMER: 'mdi-monitor-shimmer',
  SWAP_VERTICAL_BOLD: 'mdi-swap-vertical-bold',
  DIALPAD: 'mdi-dialpad',
  CLOCK_FAST: 'mdi-clock-fast',
  KEY_CHAIN: 'mdi-key-chain',
  SHIELD_ACCOUNT: 'mdi-shield-account',
  REFRESH_AUTO: 'mdi-refresh-auto',
  TIMER_SAND_COMPLETE: 'mdi-timer-sand-complete',
  FORMAT_SIZE: 'mdi-format-size',
  CONTENT_SAVE_OUTLINE: 'mdi-content-save-outline',
  CALENDAR_LOCK: 'mdi-calendar-lock',
  CALENDAR_ALERT: 'mdi-calendar-alert',
  LOCK_CLOCK: 'mdi-lock-clock',
  BUG_OUTLINE: 'mdi-bug-outline',
  MESSAGE_OFF_OUTLINE: 'mdi-message-off-outline',
  MESSAGE_TEXT_OUTLINE: 'mdi-message-text-outline',
  MESSAGE_BADGE_OUTLINE: 'mdi-message-badge-outline',
  CIRCLE_HALF_FULL: 'mdi-circle-half-full',
  ANIMATION_PLAY: 'mdi-animation-play',
  DOWNLOAD_OFF: 'mdi-download-off',
}

/**
 * 安全获取序号圆标图标
 * MDI 只提供 1-10 circle 图标，超限时回退到 10
 * @param {number} n - 序号（从 1 开始）
 * @returns {string} MDI 图标名
 */
export function getNumericCircleIcon(n) {
  const map = {
    1: ICON.NUMERIC_1_CIRCLE,
    2: ICON.NUMERIC_2_CIRCLE,
    3: ICON.NUMERIC_3_CIRCLE,
    4: ICON.NUMERIC_4_CIRCLE,
    5: ICON.NUMERIC_5_CIRCLE,
    6: ICON.NUMERIC_6_CIRCLE,
    7: ICON.NUMERIC_7_CIRCLE,
    8: ICON.NUMERIC_8_CIRCLE,
    9: ICON.NUMERIC_9_CIRCLE,
    10: ICON.NUMERIC_10_CIRCLE,
  }
  return map[n] || 'mdi-numeric-10-circle'
}
