import { describe, it, expect, vi } from 'vitest'
import { registerUnsavedCheck, hasUnsavedWork, clearUnsavedChecks } from '@/utils/updateGate'

describe('updateGate 未保存内容门禁', () => {
  it('无登记时视为没有未保存内容', () => {
    clearUnsavedChecks()
    expect(hasUnsavedWork()).toBe(false)
  })

  it('任一检查返回 true 即为有未保存内容（负向：更新会被拒绝）', () => {
    clearUnsavedChecks()
    const clean = vi.fn(() => false)
    const dirty = vi.fn(() => true)
    registerUnsavedCheck(clean)
    registerUnsavedCheck(dirty)

    expect(hasUnsavedWork()).toBe(true)
    expect(dirty).toHaveBeenCalled()
  })

  it('注销后不再参与判定', () => {
    clearUnsavedChecks()
    const unsubscribe = registerUnsavedCheck(() => true)
    expect(hasUnsavedWork()).toBe(true)

    unsubscribe()
    expect(hasUnsavedWork()).toBe(false)
  })

  it('检查函数抛错不阻断判定（其余检查仍生效）', () => {
    clearUnsavedChecks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    registerUnsavedCheck(() => {
      throw new Error('boom')
    })
    registerUnsavedCheck(() => true)

    expect(hasUnsavedWork()).toBe(true)
  })

  it('忽略非函数登记（不产生假的"未保存"状态）', () => {
    clearUnsavedChecks()
    registerUnsavedCheck(null)
    registerUnsavedCheck('nope')
    expect(hasUnsavedWork()).toBe(false)
  })
})
