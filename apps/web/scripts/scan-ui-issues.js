/**
 * scan-ui-issues.js — UI 工业级质量门扫描
 *
 * 在 pnpm lint 前运行，扫描并警告三类"不达工业级"的问题：
 *  1. 裸写 mdi- 图标（应通过 @/utils/icons.js 的 ICON 引用）
 *  2. 原生 confirm() 确认框（应使用 useConfirmDialog 统一确认）
 *  3. 硬编码颜色（应使用 vuetify 主题 token：primary/success/error/warning/neutral-surface 等）
 *
 * 用法：node scripts/scan-ui-issues.js
 * 退出码：0 = 通过；1 = 有问题（阻止 lint）
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.join(__dirname, '..', 'src')
const EXCLUDE_DIRS = ['node_modules']
// 允许裸写 mdi- 的文件：icons.js 是图标定义源；AppIcon.vue 是运行时解析（startsWith 检测）
const EXCLUDE_FILES = ['icons.js']

// sw.js 离线回退页、router 加载失败兜底页、vuetify.js 主题定义的硬编码颜色属合法场景，豁免
const EXCLUDE_COLOR_REF = (file) => {
  const base = path.basename(file)
  const parts = file.split(path.sep)
  return base === 'sw.js' || base === 'vuetify.js' || parts.includes('router')
}

function collectFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        results.push(...collectFiles(full))
      }
    } else if (/\.(vue|js)$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

// 相对项目根的路径（便于定位）
const rel = (file) => path.relative(path.join(__dirname, '..'), file)

// 正文里的裸 mdi-：排除 import 行、icons.js 定义、注释中的示例
function findBareMdi(content, file) {
  if (EXCLUDE_FILES.includes(path.basename(file))) return []
  const issues = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    const n = i + 1
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
      return
    if (/^\s*import\s/.test(line)) return
    // 裸图标字面量：icon="mdi-..." / :icon="cond ? 'mdi-...' : ..." / 字符串 'mdi-...'
    const matches = line.match(/['"]mdi-[a-z0-9-]+['"]/g)
    if (matches) {
      issues.push({
        file: `${rel(file)}:${n}`,
        msg: `裸写 mdi 图标 ${matches.join(', ')}，应通过 ICON 引用（@/utils/icons.js）`,
      })
    }
  })
  return issues
}

// 原生 confirm() 调用（排除 confirmDialog 等变量名）
function findNativeConfirm(content, file) {
  const issues = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    const n = i + 1
    if (
      /[^\w.]confirm\s*\(/.test(line) &&
      !/\bconfirmDialog\b/.test(line) &&
      !/\bwindow\.confirm\s*\(/.test(line.replace(/window\.confirm/g, ''))
    ) {
      issues.push({
        file: `${rel(file)}:${n}`,
        msg: `使用原生 confirm()，应改用 useConfirmDialog 统一确认对话框`,
      })
    }
  })
  return issues
}

// 硬编码颜色：color="#hex" / background:#hex 等
function findHardcodedColors(content, file) {
  if (EXCLUDE_COLOR_REF(file)) return []
  const issues = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    const n = i + 1
    if (
      /color\s*=\s*["']#[0-9a-fA-F]{3,8}["']/.test(line) ||
      /(background|background-color|color)\s*:\s*#[0-9a-fA-F]{3,8}/.test(line)
    ) {
      issues.push({
        file: `${rel(file)}:${n}`,
        msg: `硬编码颜色，应使用主题 token（vuetify.js）或语义色`,
      })
    }
  })
  return issues
}

function main() {
  const files = collectFiles(SRC_DIR)
  const all = { mdi: [], confirm: [], color: [] }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    all.mdi.push(...findBareMdi(content, file))
    all.confirm.push(...findNativeConfirm(content, file))
    all.color.push(...findHardcodedColors(content, file))
  }

  let exitCode = 0
  const report = (label, items) => {
    if (items.length === 0) return
    exitCode = 1
    console.log(`\n[问题] ${label}（${items.length} 处）：`)
    for (const it of items) console.log(`  - ${it.file}: ${it.msg}`)
  }

  report('裸写 mdi 图标', all.mdi)
  report('原生 confirm()', all.confirm)
  report('硬编码颜色', all.color)

  if (exitCode === 0) {
    console.log('✓ UI 质量门通过：无裸 mdi、无原生 confirm()、无硬编码颜色。')
  }
  process.exit(exitCode)
}

main()
