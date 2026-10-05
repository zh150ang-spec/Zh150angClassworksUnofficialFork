import { ref, onBeforeUnmount } from 'vue'
import {
  getSocket,
  on as socketOn,
  joinToken,
  onConnect as onSocketConnect,
} from '@/utils/socketClient'
import { createDeviceEventHandler } from '@/utils/deviceEvents'
import { getSetting } from '@/utils/settings'
import { debounce } from '@/utils/debounce'

/**
 * 实时频道 composable
 *
 * 加入设备房间（基于 KV Token），监听 KV 变化事件，
 * 在数据更新时通过去抖回调通知外部刷新 + 高亮变化卡片。
 *
 * 设计原则：
 * - 状态自管（realtimeInfo / highlightedCards）
 * - 外部依赖（downloadData / loadPersistentNotifications / dateString / boardData / $message）
 *   通过 setRealtimeContext 延迟绑定
 * - socket 事件清理在 onBeforeUnmount 自动执行
 * - 不自动注册 onMounted，由外部在合适时机调用 setupRealtimeChannel()
 *
 * 外部依赖说明：
 * - getDateString()：返回当前日期字符串（动态变化）
 * - getBoardData()：返回当前 boardData（用于 diff 高亮）
 * - downloadData()：触发数据重新下载
 * - loadPersistentNotifications()：通知列表更新
 * - showMessage(type, title, content)：$message.info 等通知
 *
 * 安全保证：
 * - ctx 未设置时，setupRealtimeChannel 静默返回
 * - debounce 句柄为 null 时，handler 静默跳过去抖
 */
export function useRealtimeChannel() {
  // own 状态
  const realtimeInfo = ref({
    show: false,
    time: '',
    key: '',
  })
  const highlightedCards = ref({})

  // 延迟绑定的外部上下文
  let ctx = null
  let debouncedRealtimeRefresh = null

  // socket 事件清理函数
  let $offKvChanged = null
  let $offConnect = null
  let $offDeviceEvent = null
  let deviceEventHandler = null

  const setRealtimeContext = (context) => {
    ctx = context
  }

  const setupRealtimeChannel = () => {
    if (!ctx) return
    try {
      const token = getSetting('server.kvToken')
      if (!token) {
        console.warn('未配置 KV Token，无法加入实时频道')
        return
      }

      // Ensure socket created
      getSocket()
      joinToken(token)

      // Re-join on reconnect
      $offConnect = onSocketConnect(() => joinToken(token))

      // Debounce refresh to avoid storms
      if (!debouncedRealtimeRefresh) {
        debouncedRealtimeRefresh = debounce(async () => {
          // 保护未保存修改：本地存在未同步修改、弹窗打开或加载中时跳过自动刷新，
          // 避免远端更新静默覆盖本地正在编辑的数据（与 useAutoRefresh 的 shouldSkipRefresh 保持同一策略）
          if (ctx.shouldSkipRefresh && ctx.shouldSkipRefresh()) {
            return
          }
          const boardData = ctx.getBoardData()
          // toRaw 解出 Vue reactive 的原始对象：structuredClone 无法克隆 reactive 代理
          // （会抛 DataCloneError: could not be cloned）。toRaw 后嵌套值也是原始值，可安全克隆。
          // 空值保护：boardData.homework 在初始化期间可能为 undefined，
          // structuredClone(undefined) 返回 undefined，后续 oldHomework[key] 会抛错
          const oldHomework = structuredClone(toRaw(boardData.homework) || {})
          await ctx.downloadData()
          const now = new Date()
          const hh = String(now.getHours()).padStart(2, '0')
          const mm = String(now.getMinutes()).padStart(2, '0')
          const ss = String(now.getSeconds()).padStart(2, '0')

          // 使用消息记录工具发送通知
          ctx.showMessage('info', '数据已更新', `已于 ${hh}:${mm}:${ss} 自动刷新`)

          // 检测哪些科目发生了变化
          const changed = {}
          const newBoardData = ctx.getBoardData()
          for (const key in newBoardData.homework) {
            const oldContent = oldHomework[key]?.content || ''
            const newContent = newBoardData.homework[key]?.content || ''
            if (oldContent !== newContent) {
              changed[key] = true
            }
          }
          // 删除的科目也算变化
          for (const key in oldHomework) {
            if (!newBoardData.homework[key]) {
              changed[key] = true
            }
          }

          // 设置高亮
          highlightedCards.value = changed
          // 10 秒后移除高亮
          setTimeout(() => {
            highlightedCards.value = {}
          }, 10000)
        }, 800)
      }

      const handler = (msg) => {
        // Expect msg = { uuid, key, action, created?, updatedAt?, deletedAt?, batch? }
        if (!msg) return

        // 检查是否是通知列表更新
        if (msg.key === 'notification-list') {
          ctx.loadPersistentNotifications()
          return
        }

        // We only care about current date key changes
        const expectedKey = `classworks-data-${ctx.getDateString()}`
        if (msg.key !== expectedKey) return
        if (msg.action !== 'upsert' && msg.action !== 'delete') return
        // Trigger a debounced refresh
        debouncedRealtimeRefresh?.(msg.key)
      }

      // 监听 KV 变化事件（支持新旧格式）
      const kvHandler = (eventData) => {
        let msg = eventData

        // 新格式：直接事件数据
        if (eventData.content && eventData.timestamp) {
          msg = {
            uuid: eventData.senderId || 'realtime',
            key: eventData.content.key,
            action: eventData.content.action,
            created: eventData.content.created,
            updatedAt: eventData.content.updatedAt || eventData.timestamp,
            deletedAt: eventData.content.deletedAt,
            batch: eventData.content.batch,
          }
        }

        handler(msg)
      }

      $offKvChanged = socketOn('kv-key-changed', kvHandler)

      // 保留设备事件监听（为未来扩展）
      deviceEventHandler = createDeviceEventHandler({
        onKvChanged: handler,
        enableLegacySupport: true,
      })
      $offDeviceEvent = socketOn('device-event', deviceEventHandler)
    } catch (e) {
      console.warn('实时频道初始化失败', e)
    }
  }

  // 自动清理 socket 监听
  onBeforeUnmount(() => {
    try {
      if ($offKvChanged && typeof $offKvChanged === 'function') {
        $offKvChanged()
        $offKvChanged = null
      }
      if ($offDeviceEvent && typeof $offDeviceEvent === 'function') {
        $offDeviceEvent()
        $offDeviceEvent = null
      }
      if ($offConnect && typeof $offConnect === 'function') {
        $offConnect()
        $offConnect = null
      }
    } catch (e) {
      console.warn('实时频道清理失败', e)
    }
  })

  return {
    realtimeInfo,
    highlightedCards,
    setRealtimeContext,
    setupRealtimeChannel,
  }
}
