#!/usr/bin/env node
// 校验根 AGENTS.md 与 CLAUDE.md 除首行标题外内容完全一致。
//
// 约定：两份文件必须保持同步（正文一致、仅标题不同）。此前这条约定只靠人记得，
// 每次改文档都要手工同步两遍，且没有任何东西会在漏改时报错——本脚本补上这个校验。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const expectedTitles = { 'AGENTS.md': '# AGENTS.md', 'CLAUDE.md': '# CLAUDE.md' }

const read = (name) => readFileSync(join(root, name), 'utf8').replace(/\r\n/g, '\n').split('\n')

const [agents, claude] = ['AGENTS.md', 'CLAUDE.md'].map(read)
const problems = []

for (const [name, text] of [
  ['AGENTS.md', agents],
  ['CLAUDE.md', claude],
]) {
  if (text[0] !== expectedTitles[name]) {
    problems.push(
      `${name} 首行应为 ${JSON.stringify(expectedTitles[name])}，实际为 ${JSON.stringify(text[0])}`,
    )
  }
}

const bodies = [agents.slice(1), claude.slice(1)]
if (bodies[0].length !== bodies[1].length) {
  problems.push(`正文行数不同：AGENTS.md ${bodies[0].length} 行，CLAUDE.md ${bodies[1].length} 行`)
}

const max = Math.max(bodies[0].length, bodies[1].length)
let diffs = 0
for (let i = 0; i < max; i++) {
  if (bodies[0][i] === bodies[1][i]) continue
  diffs++
  if (diffs <= 10) {
    problems.push(
      `第 ${i + 2} 行不一致：\n      AGENTS.md: ${bodies[0][i] ?? '<缺失>'}\n      CLAUDE.md: ${bodies[1][i] ?? '<缺失>'}`,
    )
  }
}
if (diffs > 10) problems.push(`…共 ${diffs} 行正文不一致`)

if (problems.length > 0) {
  console.error('AGENTS.md 与 CLAUDE.md 未保持同步：\n')
  for (const line of problems) console.error(`  - ${line}`)
  console.error('\n修复方式：把 AGENTS.md 的正文整份同步到 CLAUDE.md，仅保留首行标题不同。')
  process.exit(1)
}

console.log(`AGENTS.md 与 CLAUDE.md 已同步（正文 ${bodies[0].length} 行一致，仅首行标题不同）。`)
