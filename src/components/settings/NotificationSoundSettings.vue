<template>
  <v-card
    border
    flat
    rounded="xl"
    class="notification-sound-settings"
  >
    <v-card-title>
      通知铃声设置
    </v-card-title>

    <v-card-text>
      <!-- 自动播放提示 -->
      <v-alert
        v-if="showAutoplayWarning"
        type="info"
        variant="tonal"
        closable
        class="mb-4"
        @click:close="showAutoplayWarning = false"
      >
        <div class="d-flex align-center">
          <v-icon
            start
            :icon="ICON.INFO"
          />
          <span>首次使用请点击试听按钮测试音频播放是否正常</span>
        </div>
      </v-alert>

      <v-row>
        <!-- 单次通知铃声 -->
        <v-col cols="12">
          <v-card border>
            <v-card-title class="text-body-large">
              <v-icon
                start
                :icon="ICON.BELL_RING"
              />
              单次通知铃声
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="singleSound"
                :items="soundOptions"
                label="选择铃声"
                :prepend-icon="ICON.MUSIC_NOTE"
                variant="outlined"
                density="comfortable"
                @update:model-value="onSingleSoundChange"
              >
                <template #internalItem="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    @click="previewSound(item.value)"
                  >
                    <template #prepend>
                      <v-icon :icon="ICON.MUSIC_NOTE" />
                    </template>
                    <template #append>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click.stop="previewSound(item.value)"
                      >
                        <v-icon :icon="ICON.PLAY" />
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <div class="mt-3 d-flex gap-2">
                <v-btn
                  color="primary"
                  variant="elevated"
                  :prepend-icon="ICON.PLAY"
                  @click="previewSound(singleSound)"
                >
                  试听
                </v-btn>
                <v-btn
                  color="neutral-surface"
                  variant="elevated"
                  :prepend-icon="ICON.RESTORE"
                  @click="resetSingleSound"
                >
                  恢复
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- 持续通知铃声（紧急通知） -->
        <v-col cols="12">
          <v-card border>
            <v-card-title class="text-body-large">
              <v-icon
                start
                :icon="ICON.BELL_ALERT"
              />
              紧急通知铃声
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="urgentSound"
                :items="soundOptions"
                label="选择铃声"
                :prepend-icon="ICON.MUSIC_NOTE"
                variant="outlined"
                density="comfortable"
                @update:model-value="onUrgentSoundChange"
              >
                <template #internalItem="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    @click="previewSound(item.value)"
                  >
                    <template #prepend>
                      <v-icon :icon="ICON.MUSIC_NOTE" />
                    </template>
                    <template #append>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click.stop="previewSound(item.value)"
                      >
                        <v-icon :icon="ICON.PLAY" />
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <div class="mt-3 d-flex gap-2">
                <v-btn
                  color="primary"
                  variant="elevated"
                  :prepend-icon="ICON.PLAY"
                  @click="previewSound(urgentSound)"
                >
                  试听
                </v-btn>
                <v-btn
                  color="neutral-surface"
                  variant="elevated"
                  :prepend-icon="ICON.RESTORE"
                  @click="resetUrgentSound"
                >
                  恢复
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import { getSetting, setSetting } from '@/utils/settings.js';
import { soundFiles, stopSound } from '@/utils/soundList.js';

export default {
  name: 'NotificationSoundSettings',
  data() {
    return {
      ICON,
      singleSound: '',
      urgentSound: '',
      currentAudio: null,
      showAutoplayWarning: false,
    };
  },
  computed: {
    soundOptions() {
      return soundFiles.map(file => ({
        title: file.replace('.mp3', ''),
        value: file,
      }));
    },
  },
  mounted() {
    this.loadSettings();
  },
  beforeUnmount() {
    this.stopPreview();
  },
  methods: {
    loadSettings() {
      this.singleSound = getSetting('notification.singleSound');
      this.urgentSound = getSetting('notification.urgentSound');
    },
    onSingleSoundChange(value) {
      setSetting('notification.singleSound', value);
      this.$message?.success('设置已保存', `单次通知铃声: ${value}`);
    },
    onUrgentSoundChange(value) {
      setSetting('notification.urgentSound', value);
      this.$message?.success('设置已保存', `紧急通知铃声: ${value}`);
    },
    async previewSound(filename) {
      // 隐藏自动播放警告
      this.showAutoplayWarning = false;

      // 先停止当前播放
      this.stopPreview();

      try {
        // 播放新音频（不循环）
        const audio = await this.playSoundWithPromise(filename, false);
        this.currentAudio = audio;

        // 音频播放结束后清除引用
        if (this.currentAudio) {
          this.currentAudio.addEventListener('ended', () => {
            this.currentAudio = null;
          }, { once: true });
        }
      } catch (error) {
        console.error('播放音频失败:', error);
        // 提示用户
        if (error.name === 'NotAllowedError') {
          this.$message?.warning('无法播放音频', '浏览器阻止了自动播放，请再次点击试听按钮');
        } else {
          this.$message?.error('播放失败', '音频文件加载失败，请稍后重试');
        }
      }
    },
    // 使用Promise包装音频播放，以便捕获错误
    playSoundWithPromise(filename, loop = false) {
      return new Promise((resolve, reject) => {
        const path = this.getSoundPath(filename);
        if (!path) {
          reject(new Error('音频文件不存在'));
          return;
        }

        try {
          // eslint-disable-next-line no-undef
          const audio = new Audio(path);
          audio.loop = loop;

          // 尝试播放
          audio.play()
            .then(() => {
              resolve(audio);
            })
            .catch(err => {
              reject(err);
            });
        } catch (error) {
          reject(error);
        }
      });
    },
    getSoundPath(filename) {
      if (!filename) return null;
      try {
        // 使用public目录路径，Vite会在构建时将public目录的文件复制到dist根目录
        // 这样开发和生产环境都能正确播放音频文件
        return `/sounds/${filename}`;
      } catch {
        return null;
      }
    },
    stopPreview() {
      if (this.currentAudio) {
        stopSound(this.currentAudio);
        this.currentAudio = null;
      }
    },
    resetSingleSound() {
      this.singleSound = 'Teams 默认.mp3';
      setSetting('notification.singleSound', this.singleSound);
      this.$message?.success('已恢复单次通知铃声默认设置');
    },
    resetUrgentSound() {
      this.urgentSound = 'Teams 默认通话铃.mp3';
      setSetting('notification.urgentSound', this.urgentSound);
      this.$message?.success('已恢复紧急通知铃声默认设置');
    },
  },
};
</script>

<style scoped>
.notification-sound-settings {
  margin: var(--space-4) 0;
}
</style>
