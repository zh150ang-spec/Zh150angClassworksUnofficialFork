import { ICON } from '@/utils/icons'
// 请求通知权限
async function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      console.log('通知权限已授予')
      return true
    } else {
      console.warn('通知权限被拒绝')
      return false
    }
  } else {
    console.warn('浏览器不支持通知权限请求')
    return false
  }
}

/**
 * 请求持久性存储权限
 * @returns {Promise<boolean>} 是否成功启用持久性存储
 */
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist()
    }
    return false
  } catch (error) {
    console.warn('请求持久性存储失败:', error)
    return false
  }
}

// 初始化将由显式触发方调用，避免页面加载时立即请求权限

/**
 * 配置项定义
 * @typedef {Object} SettingDefinition
 * @property {string} type - 配置项类型 ('boolean' | 'number' | 'string')
 * @property {any} default - 默认值
 * @property {Function} [validate] - 可选的验证函数
 * @property {string} [description] - 配置项描述
 * @property {string} [legacyKey] - 旧版本localStorage键名(用于迁移)
 * @property {boolean} [requireDeveloper] - 是否需要开发者选项启用
 * @property {string} [icon] - 设置项的图标
 */

// 存储所有设置的localStorage键名
const SETTINGS_STORAGE_KEY = 'Classworks_settings'

// 同标签页设置变化事件名
const SETTINGS_CHANGED_EVENT = 'classworks:settings:changed'

// 新增: Classworks云端存储的默认设置
const classworksCloudDefaults = {
  'server.domain': import.meta.env.VITE_DEFAULT_KV_SERVER || 'https://kv-service.houlang.cloud',
  //"server.domain": "http://localhost:3030",
  'server.siteKey': '',
}

/**
 * 所有配置项的定义
 * @type {Object.<string, SettingDefinition>}
 */
const settingsDefinitions = {
  // 设备标识
  'device.uuid': {
    type: 'string',
    default: '00000000-0000-4000-8000-000000000000',
    description: '设备唯一标识符',
    icon: ICON.IDENTIFIER,
  },
  // 命名空间切换检测：记录上次启动时的 device.uuid，用于检测是否发生切换
  'device.lastKnownNamespace': {
    type: 'string',
    default: '',
    description: '上次记录的命名空间标识',
    hidden: true,
  },

  // 存储设置
  'storage.persistOnLoad': {
    type: 'boolean',
    default: true,
    description: '页面加载时请求持久化存储',
    icon: ICON.DATABASE_SYNC,
  },

  // 显示设置
  'display.emptySubjectDisplay': {
    type: 'string',
    default: 'card',
    validate: (value) => ['card', 'button'].includes(value),
    description: '空科目显示方式',
    icon: ICON.CARD_OUTLINE,
  },

  // 时间卡片设置
  'timeCard.enabled': {
    type: 'boolean',
    default: true,
    description: '时间卡片',
    icon: ICON.CLOCK_OUTLINE,
  },
  'timeCard.use12h': {
    type: 'boolean',
    default: false,
    description: '12 小时制',
    icon: ICON.CLOCK_TIME_SIX_OUTLINE,
  },

  // 一言设置
  'hitokoto.enabled': {
    type: 'boolean',
    default: true,
    description: '一言',
    icon: ICON.COMMENT_QUOTE,
  },
  'hitokoto.refreshInterval': {
    type: 'number',
    default: 300,
    description: '一言刷新间隔（秒，0为不刷新）',
    icon: ICON.TIMER_REFRESH,
  },
  'display.dynamicSort': {
    type: 'boolean',
    default: true,
    description: '动态排序',
    icon: ICON.SORT_VARIANT,
  },
  'display.showRandomButton': {
    type: 'boolean',
    default: false,
    description: '随机点名按钮',
    icon: ICON.SHUFFLE_VARIANT,
  },
  'display.showFullscreenButton': {
    type: 'boolean',
    default: true,
    description: '全屏按钮',
    icon: ICON.FULLSCREEN,
  },
  'display.cardHoverEffect': {
    type: 'boolean',
    default: true,
    description: '卡片悬浮效果',
    icon: ICON.GESTURE_TAP,
  },
  'display.enhancedTouchMode': {
    type: 'boolean',
    default: true,
    description: '增强触摸模式（增大点击区域）',
    icon: ICON.GESTURE_TAP_BUTTON,
  },
  'display.showAntiScreenBurnCard': {
    type: 'boolean',
    default: false,
    description: '防烧屏保护卡片',
    icon: ICON.MONITOR_SHIMMER,
  },
  'display.showListCard': {
    type: 'boolean',
    default: true,
    description: '列表功能入口按钮',
    icon: ICON.LIST_BOX,
  },
  'display.showExamScheduleButton': {
    type: 'boolean',
    default: true,
    description: '考试看板按钮',
    icon: ICON.CALENDAR_CHECK,
  },
  'display.showUafTransfer': {
    type: 'boolean',
    default: true,
    description: 'UAF作业导入导出按钮',
    icon: ICON.SWAP_VERTICAL_BOLD,
  },
  'display.showQuickTools': {
    type: 'boolean',
    default: true,
    description: '快捷输入键盘',
    icon: ICON.DIALPAD,
  },
  // 来自上游 74be238：控制作业编辑对话框里的「粘贴」与「粘贴并完成」按钮
  'display.showPasteButtons': {
    type: 'boolean',
    default: true,
    description: '作业编辑粘贴按钮',
    icon: ICON.CONTENT_PASTE,
  },
  'display.forceDesktopMode': {
    type: 'boolean',
    default: false,
    description: '强制桌面端布局',
    icon: ICON.MONITOR,
  },
  'display.lateStudentsArePresent': {
    type: 'boolean',
    default: false,
    description: '迟到计入出勤',
    icon: ICON.CLOCK_FAST,
  },
  // 服务器设置（合并了数据提供者设置）
  'server.domain': {
    type: 'string',
    default: '',
    validate: (value) => {
      if (!value) return true
      try {
        const u = new URL(value)
        return u.protocol === 'https:' || u.protocol === 'http:'
      } catch (e) {
        console.error('域名格式无效:', e)
        return false
      }
    },
    description: '后端服务器域名',
    icon: ICON.WEB,
  },
  'server.classNumber': {
    type: 'string',
    default: 'Classworks for Classroom 01',
    validate: (value) => /.*/.test(value),
    description: '班级编号',
    icon: ICON.ACCOUNT_GROUP,
  },
  'server.classNumberSource': {
    type: 'string',
    default: 'local',
    validate: (value) => ['local', 'cloud'].includes(value),
    description: '班级编号来源',
    icon: ICON.CLOUD_DOWNLOAD,
  },
  'server.siteKey': {
    type: 'string',
    default: '',
    description: '网站令牌',
    icon: ICON.KEY_CHAIN,
  },
  'server.kvToken': {
    type: 'string',
    default: '',
    description: 'KV授权令牌',
    icon: ICON.SHIELD_KEY,
  },
  'server.authDomain': {
    type: 'string',
    default: import.meta.env.VITE_DEFAULT_AUTH_SERVER || 'https://kv.houlang.cloud',
    description: '授权服务器域名',
    icon: ICON.SHIELD_ACCOUNT,
    validate: (value) => {
      if (!value) return true
      try {
        const u = new URL(value)
        return u.protocol === 'https:' || u.protocol === 'http:'
      } catch (e) {
        console.error('授权域名格式无效:', e)
        return false
      }
    },
  },
  'server.provider': {
    type: 'string',
    default: 'dual-cloud',
    validate: (value) =>
      ['kv-local', 'kv-server', 'classworkscloud', 'dual-cloud', 'dual-server'].includes(value),
    description: '数据存储方式',
    icon: ICON.DATABASE,
  },

  // 刷新设置
  'refresh.auto': {
    type: 'boolean',
    default: false,
    description: '自动刷新数据',
    icon: ICON.REFRESH_AUTO,
  },
  'refresh.interval': {
    type: 'number',
    default: 300,
    validate: (value) => value >= 10 && value <= 3600,
    description: '刷新间隔（秒）',
    icon: ICON.TIMER_OUTLINE,
  },

  // 后台同步设置
  'sync.enabled': {
    type: 'boolean',
    default: true,
    description: '双存储后台同步',
    icon: ICON.CLOUD_SYNC,
  },
  'sync.minInterval': {
    type: 'number',
    default: 600,
    validate: (value) => value >= 60 && value <= 3600,
    description: '同步最小间隔（秒）',
    icon: ICON.TIMER_SAND,
  },
  'sync.maxInterval': {
    type: 'number',
    default: 1200,
    validate: (value) => value >= 120 && value <= 7200,
    description: '同步最大间隔（秒）',
    icon: ICON.TIMER_SAND_COMPLETE,
  },

  // 字体设置
  'font.size': {
    type: 'number',
    default: 28,
    validate: (value) => value >= 16 && value <= 100,
    description: '字体大小',
    icon: ICON.FORMAT_SIZE,
  },

  // 作业编辑设置
  'edit.autoSave': {
    type: 'boolean',
    default: true,
    description: '自动保存',
    icon: ICON.CONTENT_SAVE_OUTLINE,
  },
  'edit.blockNonTodayAutoSave': {
    type: 'boolean',
    default: true,
    description: '非当天数据禁止自动保存',
    icon: ICON.CALENDAR_LOCK,
  },
  'edit.refreshBeforeEdit': {
    type: 'boolean',
    default: true,
    description: '编辑前自动刷新数据',
    icon: ICON.REFRESH,
  },
  'edit.confirmNonTodaySave': {
    type: 'boolean',
    default: true,
    description: '非当天数据保存前确认',
    icon: ICON.CALENDAR_ALERT,
  },
  'edit.blockPastDataEdit': {
    type: 'boolean',
    default: false,
    description: '禁止编辑过往数据',
    icon: ICON.LOCK_CLOCK,
  },
  'edit.autoSavePromptText': {
    type: 'string',
    default: '喵？喵呜！',
    description: '自动保存提示语',
    icon: ICON.TEXT_BOX_OUTLINE,
  },
  'edit.manualSavePromptText': {
    type: 'string',
    default: '写完后点击上传谢谢喵',
    description: '手动保存提示语',
    icon: ICON.TEXT_BOX_OUTLINE,
  },

  // 开发者选项
  'developer.enabled': {
    type: 'boolean',
    default: false,
    description: '开发者选项',
    icon: ICON.DEVELOPER_MODE,
  },
  'developer.showDebugConfig': {
    type: 'boolean',
    default: false,
    description: '显示调试配置',
    icon: ICON.BUG_OUTLINE,
  },
  'developer.disableMessageLog': {
    type: 'boolean',
    default: false,
    description: '禁用消息日志',
    requireDeveloper: true,
    icon: ICON.MESSAGE_OFF_OUTLINE,
  },

  // 消息设置
  'message.showSidebar': {
    type: 'boolean',
    default: true,
    description: '显示消息记录侧栏',
    requireDeveloper: true,
    icon: ICON.MESSAGE_TEXT_OUTLINE,
  },
  'message.maxActiveMessages': {
    type: 'number',
    default: 5,
    validate: (value) => value >= 1 && value <= 10,
    description: '最大同时显示消息数',
    requireDeveloper: true,
    icon: ICON.MESSAGE_BADGE_OUTLINE,
    // 控制界面上同时显示的最大消息数量，范围1-10条
  },
  'message.timeout': {
    type: 'number',
    default: 5000,
    validate: (value) => value >= 1000 && value <= 30000,
    description: '消息自动关闭时间（毫秒）',
    requireDeveloper: true,
    icon: ICON.TIMER_SAND,
  },
  'message.saveHistory': {
    type: 'boolean',
    default: true,
    description: '保存消息历史',
    requireDeveloper: true,
    icon: ICON.HISTORY,
  },

  // 主题设置
  'theme.mode': {
    type: 'string',
    default: 'dark',
    validate: (value) => ['light', 'dark'].includes(value),
    description: '主题模式',
    icon: ICON.THEME_LIGHT_DARK,
  },

  // 背景设置
  'background.enabled': {
    type: 'boolean',
    default: false,
    description: '自定义背景',
    icon: ICON.IMAGE,
  },
  'background.url': {
    type: 'string',
    default: '',
    description: '背景图片地址',
    icon: ICON.LINK,
  },
  'background.imageData': {
    type: 'string',
    default: '',
    description: '本地背景图片（Base64）',
    icon: ICON.IMAGE_AREA,
  },
  'background.blur': {
    type: 'number',
    default: 10,
    validate: (value) => value >= 0 && value <= 50,
    description: '毛玻璃模糊（px）',
    icon: ICON.BLUR,
  },
  'background.opacity': {
    type: 'number',
    default: 30,
    validate: (value) => value >= 0 && value <= 80,
    description: '遮罩暗度（%）',
    icon: ICON.CIRCLE_HALF_FULL,
  },

  // 通知铃声设置
  'notification.singleSound': {
    type: 'string',
    default: 'Teams 默认.mp3',
    description: '单次通知铃声',
    icon: ICON.BELL_RING,
  },
  'notification.urgentSound': {
    type: 'string',
    default: 'Teams 默认通话铃.mp3',
    description: '持续通知铃声',
    icon: ICON.BELL_ALERT,
  },

  // 随机点名设置
  'randomPicker.enabled': {
    type: 'boolean',
    default: true,
    description: '随机点名',
    icon: ICON.ACCOUNT_QUESTION,
  },
  'randomPicker.animation': {
    type: 'boolean',
    default: true,
    description: '点名动画效果',
    icon: ICON.ANIMATION_PLAY,
  },
  'randomPicker.defaultCount': {
    type: 'number',
    default: 1,
    validate: (value) => value >= 1 && value,
    description: '默认抽取人数',
    icon: ICON.COUNTER,
  },
  'randomPicker.excludeAbsent': {
    type: 'boolean',
    default: true,
    description: '排除请假学生',
    icon: ICON.ACCOUNT_OFF,
  },
  'randomPicker.excludeLate': {
    type: 'boolean',
    default: false,
    description: '排除迟到学生',
    icon: ICON.CLOCK_ALERT,
  },
  'randomPicker.excludeExcluded': {
    type: 'boolean',
    default: true,
    description: '排除不参与学生',
    icon: ICON.ACCOUNT_CANCEL,
  },
  'randomPicker.mode': {
    type: 'string',
    default: 'name',
    validate: (value) => ['name', 'number'].includes(value),
    description: '点名模式（姓名/学号）',
    icon: ICON.FORMAT_LIST_NUMBERED,
  },
  'randomPicker.maxNumber': {
    type: 'number',
    default: 60,
    validate: (value) => value >= 1 && value,
    description: '学号最大值',
    icon: ICON.NUMERIC_ICON,
  },
  'randomPicker.minNumber': {
    type: 'number',
    default: 1,
    validate: (value) => value >= 1 && value,
    description: '学号最小值',
    icon: ICON.NUMERIC_NEGATIVE_1,
  },

  // PWA 设置
  'pwa.hideInstallCard': {
    type: 'boolean',
    default: false,
    description: '隐藏PWA安装提示',
    icon: ICON.DOWNLOAD_OFF,
  },

  // 自动出勤规则
  'attendance.autoRules': {
    type: 'array',
    default: [],
    description: '自动出勤规则列表',
    icon: ICON.CLOCK_OUTLINE,
  },
}

/**
 * 设置管理器单例类
 */
class SettingsManagerClass {
  constructor() {
    this.settingsCache = null
    this.isInitialized = false
  }

  /**
   * 初始化设置管理器
   */
  init() {
    if (this.isInitialized) return
    this.loadSettings()
    this.isInitialized = true
  }

  /**
   * 从localStorage加载所有设置
   * @returns {Object} 所有设置的值
   */
  loadSettings() {
    // Initialize settingsCache as an empty object first
    this.settingsCache = {}

    try {
      const stored =
        typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null
      if (stored) {
        this.settingsCache = JSON.parse(stored)
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      // settingsCache is already an empty object, no need to reinitialize
    }

    // 确保所有设置项都有值（使用默认值填充）
    for (const [key, definition] of Object.entries(settingsDefinitions)) {
      if (!(key in this.settingsCache)) {
        this.settingsCache[key] = definition.default
      }
    }

    // 旧键迁移：扁平键 lastKnownNamespace → device.lastKnownNamespace
    if (
      'lastKnownNamespace' in this.settingsCache &&
      !('device.lastKnownNamespace' in this.settingsCache)
    ) {
      this.settingsCache['device.lastKnownNamespace'] = this.settingsCache['lastKnownNamespace']
      delete this.settingsCache['lastKnownNamespace']
      this.saveSettings()
    }

    return this.settingsCache
  }

  /**
   * 保存所有设置到localStorage
   */
  saveSettings() {
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settingsCache))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  /**
   * 获取设置项的值
   * @param {string} key - 设置项键名
   * @returns {any} 设置项的值
   */
  getSetting(key) {
    if (!this.isInitialized) {
      this.init()
    }

    const definition = settingsDefinitions[key]
    if (!definition) {
      console.warn(`未定义的设置项: ${key}`)
      return null
    }

    // 确保开发者相关设置正确处理
    if (definition.requireDeveloper) {
      const devEnabled = this.settingsCache['developer.enabled']
      if (!devEnabled) {
        return definition.default
      }
    }

    // 检查是否使用Classworks云端存储，并覆盖特定设置
    if (
      this.settingsCache['server.provider'] === 'classworkscloud' ||
      this.settingsCache['server.provider'] === 'dual-cloud'
    ) {
      if (classworksCloudDefaults[key] !== undefined) {
        return classworksCloudDefaults[key]
      }
    }

    const value = this.settingsCache[key]
    return value !== undefined ? value : definition.default
  }

  /**
   * 设置配置项的值
   * @param {string} key - 设置项键名
   * @param {any} value - 要设置的值
   * @returns {boolean} 是否设置成功
   */
  setSetting(key, value) {
    if (!this.isInitialized) {
      this.init()
    }

    const definition = settingsDefinitions[key]
    if (!definition) {
      console.warn(`未定义的设置项: ${key}`)
      return false
    }

    // 添加对开发者选项依赖的检查
    if (definition.requireDeveloper && !this.settingsCache['developer.enabled']) {
      console.warn(`设置项 ${key} 需要启用开发者选项`)
      return false
    }

    try {
      const oldValue = this.settingsCache[key]

      // 修复：数组类型不需要转换
      if (definition.type === 'array') {
        // 数组类型直接存储，不进行类型转换
      } else if (typeof value !== definition.type) {
        value =
          definition.type === 'boolean'
            ? Boolean(value)
            : definition.type === 'number'
              ? Number(value)
              : String(value)
      }

      // 验证
      if (definition.validate && !definition.validate(value)) {
        console.warn(`设置项 ${key} 的值无效`)
        return false
      }

      this.settingsCache[key] = value
      this.saveSettings()
      this.logSettingsChange(key, oldValue, value)

      // 触发同标签页内的设置变化事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new window.CustomEvent(SETTINGS_CHANGED_EVENT, {
            detail: { key, value },
          }),
        )
      }

      // 为了保持向后兼容，同时更新旧的localStorage键
      const legacyKey = definition.legacyKey
      if (legacyKey && typeof localStorage !== 'undefined') {
        localStorage.setItem(legacyKey, value.toString())
      }

      return true
    } catch (error) {
      console.error(`设置配置项 ${key} 失败:`, error)
      return false
    }
  }

  /**
   * 记录设置变更
   */
  logSettingsChange(key, oldValue, newValue) {
    const shouldLog =
      this.settingsCache['developer.enabled'] && this.settingsCache['developer.showDebugConfig']

    if (shouldLog) {
      console.log(`[Settings] ${key}:`, {
        old: oldValue,
        new: newValue,
        time: new Date().toLocaleTimeString(),
      })
    }
  }

  /**
   * 重置指定设置项到默认值
   * @param {string} key - 设置项键名
   */
  resetSetting(key) {
    if (!this.isInitialized) {
      this.init()
    }

    const definition = settingsDefinitions[key]
    if (!definition) {
      console.warn(`未定义的设置项: ${key}`)
      return
    }

    this.settingsCache[key] = definition.default
    this.saveSettings()

    // 触发同标签页内的设置变化事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new window.CustomEvent(SETTINGS_CHANGED_EVENT, {
          detail: { key, value: definition.default },
        }),
      )
    }
  }

  /**
   * 重置所有设置项到默认值
   */
  resetAllSettings() {
    this.settingsCache = {}
    for (const [key, definition] of Object.entries(settingsDefinitions)) {
      this.settingsCache[key] = definition.default
    }
    this.saveSettings()
  }

  /**
   * 监听设置变化
   * @param {Function} callback - 当设置改变时调用的回调函数
   * @returns {Function} 取消监听的函数
   */
  watchSettings(callback) {
    if (typeof window === 'undefined') return () => {}

    const storageHandler = (event) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        // 安全解析：event.newValue 可能为 null（被删除）或损坏的 JSON 字符串
        // 不加保护会导致 settingsCache = null，后续 getSetting() 访问属性时崩溃，瘫痪整个应用
        try {
          const parsed = event.newValue ? JSON.parse(event.newValue) : {}
          this.settingsCache = parsed && typeof parsed === 'object' ? parsed : {}
          callback(this.settingsCache, null)
        } catch (error) {
          console.error('解析设置变更失败:', error)
        }
      }
    }

    const customHandler = (event) => {
      callback(this.settingsCache, event)
    }

    window.addEventListener('storage', storageHandler)
    window.addEventListener(SETTINGS_CHANGED_EVENT, customHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, customHandler)
    }
  }

  /**
   * 获取设置项的定义
   * @param {string} key - 设置项键名
   * @returns {SettingDefinition|null} 设置项的定义或null
   */
  getSettingDefinition(key) {
    return settingsDefinitions[key] || null
  }

  /**
   * 将当前配置导出为简单的键值对对象
   * @returns {Object} 包含所有设置的键值对对象
   */
  exportSettingsAsKeyValue() {
    if (!this.isInitialized) {
      this.init()
    }

    // 创建一个新对象，避免直接返回引用
    const exportedSettings = {}

    // 遍历所有设置项
    for (const key in settingsDefinitions) {
      // 获取当前值（确保使用getSetting以应用所有规则，如开发者选项依赖）
      exportedSettings[key] = this.getSetting(key)
    }

    return exportedSettings
  }
}

// 创建单例实例
const SettingsManager = new SettingsManagerClass()

// 在服务器端和客户端都能正常工作的初始化
if (typeof window !== 'undefined') {
  SettingsManager.init()
}

// 为了向后兼容性，提供与原来相同的函数接口
const getSetting = (key) => SettingsManager.getSetting(key)
const setSetting = (key, value) => SettingsManager.setSetting(key, value)
const resetSetting = (key) => SettingsManager.resetSetting(key)
const resetAllSettings = () => SettingsManager.resetAllSettings()
const watchSettings = (callback) => SettingsManager.watchSettings(callback)
const getSettingDefinition = (key) => SettingsManager.getSettingDefinition(key)
const exportSettingsAsKeyValue = () => SettingsManager.exportSettingsAsKeyValue()

/**
 * 将值强制转换为目标类型（类型转换权威源）
 * 供所有需要类型转换的场景使用，避免散落的内联转换逻辑
 * @param {*} value - 要转换的值
 * @param {string} type - 目标类型 ('boolean' | 'number' | 'string' | 'array')
 * @returns {*} 转换后的值
 */
function coerceValueToType(value, type) {
  // 数组类型直接返回，不进行类型转换
  if (type === 'array') {
    return value
  }
  // 类型已匹配则直接返回
  if (typeof value === type) {
    return value
  }
  // 强制类型转换
  if (type === 'boolean') {
    return Boolean(value)
  }
  if (type === 'number') {
    return Number(value)
  }
  return String(value)
}

// 导出单例和直接方法
export {
  settingsDefinitions,
  SettingsManager,
  getSetting,
  setSetting,
  resetSetting,
  resetAllSettings,
  watchSettings,
  getSettingDefinition,
  exportSettingsAsKeyValue,
  coerceValueToType,
  requestNotificationPermission,
  requestPersistentStorage,
}
