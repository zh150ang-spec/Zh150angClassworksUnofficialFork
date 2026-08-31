/**
 * Base64 编解码统一工具
 * 使用 js-base64 库（UTF-8 安全），替代原生 btoa/atob 用于业务场景
 * 项目内所有 Base64 业务场景都应使用此处函数，避免 btoa/atob 与 js-base64 双轨混用
 */
import { Base64 } from 'js-base64'

/**
 * UTF-8 安全的 Base64 编码
 * @param {string} str
 * @returns {string}
 */
export function encodeBase64Utf8(str) {
  return Base64.encode(str)
}

/**
 * UTF-8 安全的 Base64 解码
 * 解码失败会抛出 Error，调用方需 try/catch
 * @param {string} base64String
 * @returns {string}
 */
export function decodeBase64Utf8(base64String) {
  try {
    return Base64.decode(base64String)
  } catch (e) {
    console.error('Base64解码错误:', e)
    throw new Error('无法解码配置数据', { cause: e })
  }
}
