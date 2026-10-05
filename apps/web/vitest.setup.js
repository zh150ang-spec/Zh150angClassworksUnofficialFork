import { vi } from 'vitest'

// Node 环境的 navigator 没有 onLine 字段（Node 21+ 有 navigator 但无 onLine），
// 若不固定会让 networkStatus 在单测里把 browserOnline 判成 falsy，测不出真实行为。
vi.stubGlobal('navigator', { onLine: true })
