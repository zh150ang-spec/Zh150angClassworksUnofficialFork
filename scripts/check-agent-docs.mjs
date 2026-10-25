#!/usr/bin/env node
// 校验根 AGENTS.md 与 CLAUDE.md 内容完全一致（同一份文档维护两份）。
//
// 此前这条约定只靠人记得，每次改文档都要手工同步两遍，
// 且没有任何东西会在漏改时报错——本脚本补上这个校验。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const read = (name) => readFileSync(join(root, name), 'utf8').replace(/\r\n/g, '\n')

const [agents, claude] = ['AGENTS.md', 'CLAUDE.md'].map(read)

if (agents !== claude) {
  const a = agents.split('\n')
  const b = claude.split('\n')
  const max = Math.max(a.length, b.length)
  let diffs = 0
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) continue
    diffs++
    if (diffs <= 10) {
      console.error(
        `第 ${i + 1} 行不一致：\n      AGENTS.md: ${a[i] ?? '<缺失>'}\n      CLAUDE.md: ${b[i] ?? '<缺失>'}`,
      )
    }
  }
  if (diffs > 10) console.error(`…共 ${diffs} 行不一致`)
  console.error('\nAGENTS.md 与 CLAUDE.md 不一致：把其中一份整份复制到另一份即可。')
  process.exit(1)
}

console.log('AGENTS.md 与 CLAUDE.md 内容一致。')
