import { ICON } from '@/utils/icons'
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import axios from '@/axios/axios'
import { getSetting } from '@/utils/settings'
import { getEffectiveServerUrl } from '@/utils/serverRotation'
import dataProvider from '@/utils/dataProvider'
import backgroundSync from '@/utils/backgroundSync'

/**
 * Token 显示管理 composable
 *
 * 管理 token 信息加载、显示芯片（chip）、学生/教师姓名联动。
 * 与 StudentNameManager 组件通过 ref + defineExpose 协作：
 * - 调用 manager.currentStudentName / currentTeacherName / isStudentToken / isTeacherToken / isReadOnly / hasToken / displayName / openDialog
 * - 监听 manager 的 4 个响应式属性变化，自动更新显示
 *
 * 设计原则：
 * - 状态自管（tokenInfo / tokenDisplayInfo / studentNameInfo）
 * - 派生状态自管（shouldShowUrgentTestButton）
 * - 4 个 watch 通过 Vue 3 watch() 注册，返回 unwatch 函数，在 onBeforeUnmount 自动清理
 * - $message 通过 getCurrentInstance().appContext.globalProperties.$message 获取
 *   （这是 Vue 3 中从 setup/composable 访问全局属性的标准方式）
 * - manager ref 由外部在 mounted 的 $nextTick 中通过 bindStudentNameManager 注入
 *   （因为 StudentNameManager 受 v-if="!shouldShowInit" 控制，需等待渲染）
 *
 * 安全保证：
 * - manager 未绑定时，updateTokenDisplayInfo 静默返回（与原代码一致）
 * - watch 未注册时，unwatch 句柄为 null，onBeforeUnmount 安全跳过
 */
export function useTokenDisplay() {
  // own 状态
  const tokenInfo = ref(null)
  const tokenDisplayInfo = reactive({
    show: false,
    readonly: false,
    text: '',
    color: 'primary',
    variant: 'tonal',
    icon: ICON.ACCOUNT,
    disabled: false,
  })
  const studentNameInfo = reactive({
    name: '',
    isStudent: false,
    isTeacher: false,
    openDialog: null,
  })

  // manager ref 与 unwatch 句柄（由 bindStudentNameManager 设置）
  let manager = null
  let unwatchStudentName = null
  let unwatchTeacherName = null
  let unwatchIsStudent = null
  let unwatchIsTeacher = null

  // 派生状态
  const shouldShowUrgentTestButton = computed(() => {
    const provider = getSetting('server.provider')
    const isKv =
      provider === 'kv-server' ||
      provider === 'classworkscloud' ||
      provider === 'dual-cloud' ||
      provider === 'dual-server'
    if (!isKv) return false

    const kvToken = getSetting('server.kvToken')
    if (!kvToken) return false

    if (!tokenInfo.value) return false

    return tokenInfo.value.deviceType === 'teacher' || tokenInfo.value.deviceType === 'classroom'
  })

  // 方法
  const loadTokenInfo = async () => {
    try {
      const provider = getSetting('server.provider')
      const isKv =
        provider === 'kv-server' ||
        provider === 'classworkscloud' ||
        provider === 'dual-cloud' ||
        provider === 'dual-server'
      if (!isKv) return

      const kvToken = getSetting('server.kvToken')
      if (!kvToken) return

      const serverUrl = getEffectiveServerUrl()
      if (!serverUrl) return

      const tokenResponse = await axios.get(`${serverUrl}/kv/_token`, {
        headers: {
          Authorization: `Bearer ${kvToken}`,
        },
      })

      tokenInfo.value = tokenResponse.data

      const isReadOnly = tokenInfo.value?.isReadOnly === true
      dataProvider.setReadOnlyState(isReadOnly)
      backgroundSync.setReadOnlyState(isReadOnly)
    } catch (error) {
      // 安全日志：仅记录 message 和 status，避免泄漏 error.config.headers 中的 Authorization Bearer token
      console.warn('Failed to load token info:', error.message, error.response?.status)
      tokenInfo.value = null
    }
  }

  const updateTokenDisplayInfo = () => {
    if (!manager || !manager.hasToken) {
      tokenDisplayInfo.show = false
      tokenDisplayInfo.readonly = false
      return
    }

    const displayName = manager.displayName
    const isReadOnly = manager.isReadOnly
    const isStudent = manager.isStudentToken
    const isTeacher = manager.isTeacherToken

    // 设置只读状态（对所有类型的 token 都显示）
    tokenDisplayInfo.readonly = isReadOnly

    // 学生和教师都显示名称 chip
    if (!isStudent && !isTeacher) {
      tokenDisplayInfo.show = false
      return
    }

    // 设置名称显示（始终蓝色）
    tokenDisplayInfo.text = displayName
    tokenDisplayInfo.color = 'primary'
    // 学生用人头图标，教师用学校图标
    tokenDisplayInfo.icon = isTeacher ? ICON.SCHOOL : ICON.ACCOUNT
    tokenDisplayInfo.disabled = isReadOnly // 只读时不可点击
    tokenDisplayInfo.show = true
  }

  const handleTokenChipClick = () => {
    if (manager && (manager.isStudentToken || manager.isTeacherToken)) {
      manager.openDialog()
    }
  }

  // 绑定 StudentNameManager 实例，注册 4 个 watch
  // 由外部在 mounted 的 $nextTick 中调用（等待 $refs.studentNameManager 渲染）
  const bindStudentNameManager = (managerInstance) => {
    manager = managerInstance
    if (!manager) return

    // 优先使用学生名称，如果不是学生则使用教师名称
    studentNameInfo.name = manager.currentStudentName || manager.currentTeacherName || ''
    studentNameInfo.isStudent = manager.isStudentToken
    studentNameInfo.isTeacher = manager.isTeacherToken
    studentNameInfo.openDialog = () => manager.openDialog()

    // 监听学生姓名变化
    unwatchStudentName = watch(
      () => manager.currentStudentName,
      (newName) => {
        studentNameInfo.name = newName
        updateTokenDisplayInfo()
      },
    )
    // 监听教师姓名变化
    unwatchTeacherName = watch(
      () => manager.currentTeacherName,
      (newName) => {
        if (manager.isTeacherToken) {
          studentNameInfo.name = newName
          updateTokenDisplayInfo()
        }
      },
    )
    unwatchIsStudent = watch(
      () => manager.isStudentToken,
      (isStudent) => {
        studentNameInfo.isStudent = isStudent
        updateTokenDisplayInfo()
      },
    )
    unwatchIsTeacher = watch(
      () => manager.isTeacherToken,
      (isTeacher) => {
        studentNameInfo.isTeacher = isTeacher
        updateTokenDisplayInfo()
      },
    )
  }

  // 自动清理 watch（onBeforeUnmount 在组件卸载时执行）
  onBeforeUnmount(() => {
    if (unwatchStudentName) unwatchStudentName()
    if (unwatchTeacherName) unwatchTeacherName()
    if (unwatchIsStudent) unwatchIsStudent()
    if (unwatchIsTeacher) unwatchIsTeacher()
  })

  return {
    tokenInfo,
    tokenDisplayInfo,
    studentNameInfo,
    shouldShowUrgentTestButton,
    loadTokenInfo,
    updateTokenDisplayInfo,
    handleTokenChipClick,
    bindStudentNameManager,
  }
}
