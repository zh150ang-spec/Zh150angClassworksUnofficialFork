/**
 * 设置项展示层工具
 * 提供"给人看的"显示名、值格式化、枚举值映射
 *
 * 数据层（settings.js）只管配置定义和存取，展示关注点集中在此
 * 消费方：pages/index.vue、components/settings/SettingItem.vue、SettingsLinkGenerator.vue
 */
import { getSettingDefinition } from "./settings";

/**
 * 设置项 key 末段到中文显示名的映射表
 * 当 settingsDefinitions[key].description 缺失时作为回落
 */
const SETTING_NAME_MAP = {
  provider: "数据提供方",
  domain: "服务器域名",
  classNumber: "班级编号",
  emptySubjectDisplay: "空科目显示方式",
  dynamicSort: "动态排序",
  showRandomButton: "随机按钮",
  showFullscreenButton: "全屏按钮",
  cardHoverEffect: "卡片悬浮效果",
  enhancedTouchMode: "增强触摸模式",
  showAntiScreenBurnCard: "防烧屏卡片",
  mode: "主题模式",
  size: "字体大小",
  autoSave: "自动保存",
  blockNonTodayAutoSave: "禁止自动保存非当日",
  refreshBeforeEdit: "编辑前刷新",
  confirmNonTodaySave: "非当日保存确认",
  auto: "自动刷新",
  interval: "刷新间隔",
};

/**
 * 获取设置项的显示名
 * 优先级：definition.description → nameMap → key 末段
 * @param {string} key - 完整设置 key（如 "server.classNumber"）
 * @returns {string}
 */
export function getSettingDisplayName(key) {
  const definition = getSettingDefinition(key);
  if (definition?.description) return definition.description;

  const parts = key.split(".");
  const lastPart = parts[parts.length - 1];
  return SETTING_NAME_MAP[lastPart] || lastPart;
}

/**
 * 格式化设置值为展示文本
 * - boolean → 开启/关闭
 * - 空值 → 空
 * - 敏感字段（kvToken/siteKey）→ 前 6 位 + ••••
 * - 其他 → toString
 * @param {*} value
 * @param {string} key
 * @returns {string}
 */
export function formatSettingValue(value, key) {
  if (typeof value === "boolean") {
    return value ? "开启" : "关闭";
  }
  if (value === "" || value === null || value === undefined) {
    return "空";
  }
  const str = value.toString();
  const isSensitive = key && (key === "server.kvToken" || key === "server.siteKey");
  if (isSensitive && str.length > 8) {
    return str.substring(0, 6) + "••••";
  }
  return str;
}

/**
 * 枚举值到中文显示文本的映射表
 * 用于 select 类型的设置项展示
 * 键值必须与 settings.js 中各设置项的 validate 合法值一一对应
 */
export const displayValueMappings = {
  "display.emptySubjectDisplay": {
    card: "卡片",
    button: "按钮",
  },
  "theme.mode": {
    light: "浅色",
    dark: "深色",
  },
  "server.provider": {
    "kv-local": "本地",
    "kv-server": "KV 服务器",
    classworkscloud: "Classworks Cloud",
    "dual-cloud": "双云",
    "dual-server": "双服务器",
  },
  "randomPicker.mode": {
    name: "姓名",
    number: "学号",
  },
};

/**
 * 获取设置项的显示文本
 * @param {string} key
 * @param {*} value
 * @returns {string}
 */
export function getDisplayValue(key, value) {
  const mapping = displayValueMappings[key];
  if (mapping && value in mapping) {
    return mapping[value];
  }
  return value;
}
