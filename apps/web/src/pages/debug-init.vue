<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>KvInitialize 调试面板</v-card-title>
          <v-card-text>
            <v-form>
              <v-text-field
                v-model="provider"
                label="server.provider (kv-server/classworkscloud/other)"
              />
              <v-text-field v-model="kvToken" label="server.kvToken (空表示未授权)" />
              <v-text-field v-model="uuid" label="device.uuid" />
              <v-text-field v-model="authDomain" label="server.authDomain" />
            </v-form>
            <v-divider class="my-4" />

            <v-btn class="me-2" color="primary" @click="applySettings"> 应用设置 </v-btn>
            <v-btn class="me-2" color="secondary" @click="clearGuard"> 清除重定向守卫 </v-btn>
            <v-btn color="error" @click="simulateLoadError"> 模拟命名空间加载错误 </v-btn>

            <v-list lines="two">
              <v-list-item>
                <v-list-item-title>当前 sessionGuard</v-list-item-title>
                <v-list-item-subtitle>{{ guardRaw }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>当前 settings</v-list-item-title>
                <v-list-item-subtitle>{{ settingsDump }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>初始化组件已替换</v-card-title>
          <v-card-text> 已迁移为首页内联的 InitServiceChooser 组件。 </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="confirmDialog.show" max-width="420">
      <v-card>
        <v-card-title class="text-headline-small">
          {{ confirmDialog.title }}
        </v-card-title>
        <v-card-text>{{ confirmDialog.text }}</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <div class="d-flex gap-2">
            <v-btn color="neutral-surface" variant="elevated" @click="cancelSave()"> 取消 </v-btn>
            <v-btn
              :color="confirmDialog.color || 'warning'"
              variant="elevated"
              @click="confirmSave()"
            >
              {{ confirmDialog.confirmText || '确认' }}
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getSetting, setSetting } from '@/utils/settings'
import { kvServerProvider } from '@/utils/providers/kvServerProvider'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { confirmDialog, showConfirmDialog, confirmSave, cancelSave } = useConfirmDialog()

const REDIRECT_GUARD_KEY = 'kvinit.redirecting'

const provider = ref(getSetting('server.provider') || 'kv-server')
const kvToken = ref(getSetting('server.kvToken') || '')
const uuid = ref(getSetting('device.uuid') || '00000000-0000-4000-8000-000000000000')
const authDomain = ref(getSetting('server.authDomain') || 'https://cs.example.com')

const applySettings = () => {
  setSetting('server.provider', provider.value)
  setSetting('server.kvToken', kvToken.value)
  setSetting('device.uuid', uuid.value)
  setSetting('server.authDomain', authDomain.value)
  // reload to let app re-evaluate
  location.reload()
}

const clearGuard = async () => {
  try {
    await showConfirmDialog({
      title: '确认清除重定向守卫',
      text: '确定要清除重定向守卫吗？',
      color: 'warning',
    })
  } catch {
    return
  }
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY)
  } catch (e) {
    console.debug(e)
  }
}

const simulateLoadError = () => {
  // Monkey-patch kvServerProvider.loadNamespaceInfo to throw once
  kvServerProvider.loadNamespaceInfo = async () => {
    throw new Error('模拟加载错误')
  }
  // reload to apply
  location.reload()
}

const guardRaw = computed(() => {
  try {
    return sessionStorage.getItem(REDIRECT_GUARD_KEY)
  } catch (e) {
    return String(e)
  }
})

const settingsDump = computed(() => {
  return JSON.stringify(
    {
      provider: getSetting('server.provider'),
      kvToken: getSetting('server.kvToken'),
      uuid: getSetting('device.uuid'),
      authDomain: getSetting('server.authDomain'),
    },
    null,
    2,
  )
})
</script>
