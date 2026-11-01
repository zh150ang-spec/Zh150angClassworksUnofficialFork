<template>
  <div>
    <!-- 登录弹框 -->
    <Dialog v-model:open="isOpen" :default-open="false">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>账户登录</DialogTitle>
          <DialogDescription> 选择一个OAuth提供者进行登录 </DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div v-if="providers.length === 0" class="text-center py-4 text-muted-foreground">
            正在加载登录方式...
          </div>
          <button
            v-for="provider in providers"
            :key="provider.id"
            :style="{
              borderColor: provider.color || '#666',
            }"
            class="w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors hover:bg-accent"
            @click="handleLogin(provider)"
          >
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-muted">
              <svg
                v-if="provider.icon === 'github'"
                class="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                />
              </svg>
              <Globe v-else class="w-6 h-6" />
            </div>
            <div class="flex-1 text-left">
              <div class="font-medium">{{ provider.displayName || provider.name }}</div>
              <div class="text-sm text-muted-foreground">{{ provider.description }}</div>
            </div>
            <ChevronRight class="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 登录状态处理 -->
    <div
      v-if="isAuthenticating"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-background p-6 rounded-lg shadow-xl">
        <div class="flex items-center gap-3">
          <Loader2 class="w-5 h-5 animate-spin" />
          <span>正在进行身份验证...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Globe, ChevronRight, Loader2 } from '@lucide/vue'
import { apiClient } from '@/lib/api'
import { toast } from 'vue-sonner'
import { DEFAULT_LOCAL_SERVER } from '@classworks/shared'

const props = defineProps({
  modelValue: Boolean,
  onSuccess: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const providers = ref([])
const isAuthenticating = ref(false)
let authWindow = null

// 监听props的变化
watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
  },
)

// 监听内部状态变化，同步到父组件
watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

// 加载OAuth提供者列表
const loadProviders = async () => {
  try {
    const response = await apiClient.getOAuthProviders()
    const list = response.data || []
    // 后端已去除 order 字段，保持原顺序
    providers.value = list
  } catch (error) {
    console.error('Failed to load OAuth providers:', error)
    toast.error('无法加载登录方式', {
      description: '请检查网络连接',
    })
  }
}

// 处理登录
const handleLogin = (provider) => {
  // 构建OAuth URL
  const authUrl = `${import.meta.env.VITE_API_BASE_URL || DEFAULT_LOCAL_SERVER}${provider.authUrl}`

  // 打开新窗口进行OAuth认证
  const width = 600
  const height = 700
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2

  authWindow = window.open(
    authUrl,
    `oauth_${provider.id}`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`,
  )

  isAuthenticating.value = true
  isOpen.value = false

  // 监听来自OAuth窗口的消息
  const handleMessage = (event) => {
    // 验证消息来源
    if (event.origin !== window.location.origin) {
      return
    }

    if (event.data.type === 'oauth_success') {
      clearInterval(checkInterval)
      clearTimeout(timeoutId)
      isAuthenticating.value = false
      window.removeEventListener('message', handleMessage)

      if (authWindow && !authWindow.closed) {
        authWindow.close()
      }

      const display = event.data.providerName || event.data.provider
      const color = event.data.providerColor
      toast.success('登录成功', {
        description: `已通过 ${display} 登录`,
        style: color ? { borderLeft: `4px solid ${color}` } : undefined,
      })

      // 调用成功回调
      if (props.onSuccess) {
        props.onSuccess(event.data.token)
      }
    } else if (event.data.type === 'oauth_error') {
      clearInterval(checkInterval)
      clearTimeout(timeoutId)
      isAuthenticating.value = false
      window.removeEventListener('message', handleMessage)

      if (authWindow && !authWindow.closed) {
        authWindow.close()
      }

      toast.error('登录失败', {
        description: event.data.error,
      })
    }
  }

  window.addEventListener('message', handleMessage)

  // 监听OAuth回调（降级方案，通过轮询检测窗口关闭）
  const checkInterval = setInterval(() => {
    try {
      // 检查窗口是否关闭
      if (authWindow && authWindow.closed) {
        clearInterval(checkInterval)
        clearTimeout(timeoutId)
        window.removeEventListener('message', handleMessage)
        isAuthenticating.value = false

        // 检查localStorage中是否有token（降级方案）
        const token = localStorage.getItem('auth_token')
        const authProvider =
          localStorage.getItem('auth_provider_name') || localStorage.getItem('auth_provider')
        const providerColor = localStorage.getItem('auth_provider_color')

        if (token) {
          toast.success('登录成功', {
            description: `已通过 ${authProvider || '账户'} 登录`,
            style: providerColor ? { borderLeft: `4px solid ${providerColor}` } : undefined,
          })

          // 调用成功回调
          if (props.onSuccess) {
            props.onSuccess(token)
          }
        }
      }
    } catch (error) {
      // 跨域错误，忽略
    }
  }, 500)

  // 30秒后超时
  const timeoutId = setTimeout(() => {
    clearInterval(checkInterval)
    window.removeEventListener('message', handleMessage)
    if (authWindow && !authWindow.closed) {
      authWindow.close()
    }
    if (isAuthenticating.value) {
      isAuthenticating.value = false
      toast.error('登录超时', {
        description: '请重试',
      })
    }
  }, 300000)
}

onMounted(() => {
  loadProviders()
})
</script>
