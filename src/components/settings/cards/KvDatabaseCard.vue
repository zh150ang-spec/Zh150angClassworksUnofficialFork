<template>
  <settings-card
    :loading="loading"
    :icon="ICON.DATABASE_EDIT"
    title="KV数据库管理"
  >
    <v-list>
      <v-list-item>
        <template #prepend>
          <v-icon
            :color="connectionColor"
            :icon="connectionIcon"
            class="mr-3"
          />
        </template>
        <v-list-item-title>数据库状态</v-list-item-title>
        <v-list-item-subtitle>{{ connectionStatus }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            :loading="loading"
            variant="tonal"
            @click="refreshConnection"
          >
            刷新
          </v-btn>
        </template>
      </v-list-item>

      <v-list-item v-if="isDualMode">
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.SYNC"
          />
        </template>
        <v-list-item-title>同步状态</v-list-item-title>
        <v-list-item-subtitle>
          {{ syncStatus.cloudAvailable ? '云端可用' : '云端不可用' }} | 
          云端: {{ syncStatus.cloudCount || 0 }} 条 | 
          本地: {{ syncStatus.localCount || 0 }} 条
        </v-list-item-subtitle>
        <template #append>
          <v-btn-group variant="tonal">
            <v-btn
              size="small"
              @click="syncFromCloud"
            >
              <v-icon
                class="mr-1"
                :icon="ICON.CLOUD_DOWNLOAD"
              />
              云端 → 本地
            </v-btn>
            <v-btn
              size="small"
              @click="syncToCloud"
            >
              <v-icon
                class="mr-1"
                :icon="ICON.CLOUD_UPLOAD"
              />
              本地 → 云端
            </v-btn>
          </v-btn-group>
        </template>
      </v-list-item>

      <v-divider class="my-2" />

      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.HARDDISK"
          />
        </template>
        <v-list-item-title>存储占用</v-list-item-title>
        <v-list-item-subtitle>{{ storageInfo }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            :loading="loadingStorageInfo"
            variant="tonal"
            @click="loadStorageInfo"
          >
            刷新
          </v-btn>
        </template>
      </v-list-item>

      <v-divider class="my-2" />

      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.DATABASE_EXPORT"
          />
        </template>
        <v-list-item-title>数据导入导出</v-list-item-title>
        <v-list-item-subtitle>备份和恢复所有数据</v-list-item-subtitle>
        <template #append>
          <v-btn-group variant="tonal">
            <v-btn
              :loading="exporting"
              @click="exportAllData"
            >
              <v-icon
                class="mr-1"
                :icon="ICON.DOWNLOAD"
              />
              导出
            </v-btn>
            <v-btn
              :loading="importing"
              @click="triggerImport"
            >
              <v-icon
                class="mr-1"
                :icon="ICON.UPLOAD"
              />
              导入
            </v-btn>
          </v-btn-group>
        </template>
      </v-list-item>

      <input
        ref="importInput"
        accept=".json"
        hidden
        type="file"
        @change="handleImportFile"
      >

      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.FORMAT_LIST"
          />
        </template>
        <v-list-item-title>数据条目</v-list-item-title>
        <v-list-item-subtitle>共 {{ kvData.length }} 条记录</v-list-item-subtitle>
        <template #append>
          <v-btn-group variant="tonal">
            <v-btn
              :loading="loadingData"
              @click="loadKvData"
            >
              加载数据
            </v-btn>
            <v-btn
              :disabled="!isKvProvider"
              @click="createNewItem"
            >
              <v-icon
                class="mr-1"
                :icon="ICON.PLUS"
              />
              新建
            </v-btn>
            <v-btn @click="showMigrationDialog = true">
              <v-icon
                class="mr-1"
                :icon="ICON.CLOUD_UPLOAD"
              />
              从本地迁移
            </v-btn>
          </v-btn-group>
        </template>
      </v-list-item>
    </v-list>

    <v-card
      v-if="kvData.length > 0"
      class="mt-4"
      variant="outlined"
    >
      <v-card-title class="d-flex align-center">
        <v-icon
          class="mr-2"
          :icon="ICON.TABLE_ICON"
        />
        KV数据列表
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          clearable
          density="compact"
          hide-details
          label="搜索键名"
          :prepend-inner-icon="ICON.SEARCH"
          style="max-width: 300px;"
          variant="outlined"
        />
      </v-card-title>

      <v-data-table
        :headers="tableHeaders"
        :items="filteredKvData"
        :items-per-page="10"
        :loading="loadingData"
        class="elevation-0"
        item-value="key"
      >
        <template #[`item.key`]="{ item }">
          <code class="text-primary">{{ item.key }}</code>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-btn-group
            density="compact"
            variant="text"
          >
            <v-btn
              :icon="ICON.EYE"
              size="small"
              title="查看"
              @click="viewItem(item)"
            />
            <v-btn
              :icon="ICON.EDIT"
              size="small"
              title="编辑"
              @click="editItem(item)"
            />
            <v-btn
              color="primary"
              :icon="ICON.CLOUD_DOWNLOAD"
              size="small"
              title="获取云端地址"
              @click="getCloudUrl(item)"
            />
            <v-btn
              color="error"
              :icon="ICON.DELETE"
              size="small"
              title="删除"
              @click="confirmDelete(item)"
            />
          </v-btn-group>
        </template>
      </v-data-table>
    </v-card>

    <!-- 查看数据对话框 -->
    <v-dialog
      v-model="viewDialog"
      max-width="800px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :icon="ICON.EYE"
          />
          查看数据
          <v-spacer />
          <v-btn
            :icon="ICON.CLOSE"
            variant="text"
            @click="viewDialog = false"
          />
        </v-card-title>

        <v-card-subtitle v-if="selectedItem">
          键名: <code>{{ selectedItem.key }}</code>
        </v-card-subtitle>

        <v-card-text>
          <v-textarea
            v-if="selectedItem"
            :model-value="formatJsonData(selectedItem.value)"
            class="font-monospace"
            label="数据内容"
            readonly
            rows="15"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="tonal"
            @click="copyToClipboard(selectedItem?.value)"
          >
            <v-icon
              class="mr-1"
              :icon="ICON.CONTENT_COPY"
            />
            复制数据
          </v-btn>
          <v-btn
            variant="text"
            @click="viewDialog = false"
          >
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 编辑数据对话框 -->
    <v-dialog
      v-model="editDialog"
      max-width="800px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :icon="ICON.EDIT"
          />
          编辑数据
          <v-spacer />
          <v-btn
            :icon="ICON.CLOSE"
            variant="text"
            @click="closeEditDialog"
          />
        </v-card-title>

        <v-card-subtitle v-if="editingItem">
          键名: <code>{{ editingItem.key }}</code>
        </v-card-subtitle>

        <v-card-text>
          <v-textarea
            v-model="editingData"
            :error="!isValidJson"
            :error-messages="isValidJson ? [] : ['请输入有效的JSON格式']"
            class="font-monospace"
            label="数据内容 (JSON格式)"
            rows="15"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="closeEditDialog"
          >
            取消
          </v-btn>
          <v-btn
            :disabled="!isValidJson"
            :loading="savingData"
            color="primary"
            variant="tonal"
            @click="saveEditedData"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 新建数据对话框 -->
    <v-dialog
      v-model="createDialog"
      max-width="800px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :icon="ICON.PLUS"
          />
          新建数据
          <v-spacer />
          <v-btn
            :icon="ICON.CLOSE"
            variant="text"
            @click="closeCreateDialog"
          />
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="newKey"
            :error="!isValidKey"
            :error-messages="isValidKey ? [] : ['键名不能为空且不能与现有键重复']"
            class="mb-4"
            label="键名"
            placeholder="请输入键名，如：my-config"
            variant="outlined"
          />

          <v-textarea
            v-model="newData"
            :error="!isValidNewJson"
            :error-messages="isValidNewJson ? [] : ['请输入有效的JSON格式']"
            class="font-monospace"
            label="数据内容 (JSON格式)"
            placeholder="请输入JSON数据，如：{&quot;name&quot;: &quot;value&quot;}"
            rows="15"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="closeCreateDialog"
          >
            取消
          </v-btn>
          <v-btn
            :disabled="!isValidKey || !isValidNewJson"
            :loading="savingData"
            color="primary"
            variant="tonal"
            @click="saveNewData"
          >
            创建
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 云端地址对话框 -->
    <v-dialog
      v-model="cloudUrlDialog"
      max-width="800px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :icon="ICON.CLOUD_DOWNLOAD"
          />
          获取云端访问地址
          <v-spacer />
          <v-btn
            :icon="ICON.CLOSE"
            variant="text"
            @click="cloudUrlDialog = false"
          />
        </v-card-title>

        <v-card-subtitle v-if="selectedCloudItem">
          键名: <code>{{ selectedCloudItem.key }}</code>
        </v-card-subtitle>

        <v-card-text>
          <v-alert
            v-if="cloudUrlError"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ cloudUrlError }}
          </v-alert>

          <v-alert
            v-if="cloudUrlResult && cloudUrlResult.success"
            class="mb-4"
            type="success"
            variant="tonal"
          >
            <v-alert-title>云端地址获取成功</v-alert-title>
            <div class="mt-2">
              <div
                v-if="cloudUrlResult.migrated"
                class="mb-2"
              >
                <v-icon
                  class="mr-1"
                  color="success"
                  :icon="ICON.DATABASE_ARROW_UP"
                />
                数据已从本地迁移到云端
              </div>
              <div
                v-if="cloudUrlResult.configured"
                class="mb-2"
              >
                <v-icon
                  class="mr-1"
                  color="info"
                  :icon="ICON.SETTINGS"
                />
                云端配置已自动设置
              </div>
            </div>
          </v-alert>

          <v-text-field
            v-if="cloudUrlResult && cloudUrlResult.url"
            :model-value="cloudUrlResult.url"
            :append-inner-icon="ICON.CONTENT_COPY"
            class="font-monospace"
            label="云端访问地址"
            readonly
            variant="outlined"
            @click:append-inner="copyCloudUrl"
          />

          <v-expansion-panels
            v-if="cloudUrlResult && cloudUrlResult.url"
            class="mt-4"
          >
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon
                  class="mr-2"
                  :icon="ICON.SETTINGS"
                />
                高级选项
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-checkbox
                  v-model="cloudUrlOptions.migrateFromLocal"
                  density="compact"
                  color="primary"
                  label="从本地迁移数据到云端"
                />
                <v-checkbox
                  v-model="cloudUrlOptions.autoConfigureCloud"
                  density="compact"
                  color="primary"
                  label="自动配置云端默认设置"
                />
                <v-btn
                  :loading="gettingCloudUrl"
                  class="mt-2"
                  color="primary"
                  variant="tonal"
                  @click="refreshCloudUrl"
                >
                  <v-icon
                    class="mr-1"
                    :icon="ICON.REFRESH"
                  />
                  重新获取
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="cloudUrlDialog = false"
          >
            关闭
          </v-btn>
          <v-btn
            v-if="cloudUrlResult && cloudUrlResult.url"
            color="primary"
            variant="tonal"
            @click="openCloudUrl"
          >
            <v-icon
              class="mr-1"
              :icon="ICON.OPEN_IN_NEW"
            />
            在新窗口打开
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog
      v-model="deleteDialog"
      max-width="400px"
    >
      <v-card>
        <v-card-title class="d-flex align-center text-error">
          <v-icon
            class="mr-2"
            :icon="ICON.WARNING"
          />
          确认删除
        </v-card-title>

        <v-card-text>
          确定要删除键名为 <code>{{ itemToDelete?.key }}</code> 的数据吗？
          <br><br>
          <v-alert
            class="mt-2"
            type="warning"
            variant="tonal"
          >
            此操作不可撤销，请谨慎操作！
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            :loading="deletingData"
            color="error"
            variant="tonal"
            @click="deleteItem"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 导入确认对话框 -->
    <v-dialog
      v-model="importConfirmDialog"
      max-width="600px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :icon="ICON.DATABASE_IMPORT"
          />
          确认导入数据
        </v-card-title>

        <v-card-text>
          <v-alert
            class="mb-4"
            type="info"
            variant="tonal"
          >
            即将导入 <strong>{{ importDataCount }}</strong> 条数据
          </v-alert>

          <v-alert
            type="warning"
            variant="tonal"
          >
            <v-alert-title>注意</v-alert-title>
            导入的数据将会覆盖现有同名键的数据，此操作不可撤销！
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="importConfirmDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            :loading="importing"
            color="primary"
            variant="tonal"
            @click="confirmImport"
          >
            确认导入
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <cloud-migration-dialog v-model="showMigrationDialog" />
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/SettingsCard.vue';
import CloudMigrationDialog from '../CloudMigrationDialog.vue';
import dataProvider from '@/utils/dataProvider';
import {getSetting, watchSettings} from '@/utils/settings';
import {openDB} from 'idb';

export default {
  name: 'KvDatabaseCard',
  components: {
    SettingsCard,
    CloudMigrationDialog
  },

  data() {
    return {
      ICON,
      loading: false,
      loadingData: false,
      savingData: false,
      deletingData: false,
      loadingStorageInfo: false,
      exporting: false,
      importing: false,
      kvData: [],
      searchQuery: '',
      storageInfo: '计算中...',
      syncStatus: {
        mode: 'local-only',
        cloudCount: 0,
        localCount: 0,
        cloudAvailable: false
      },

      viewDialog: false,
      editDialog: false,
      deleteDialog: false,
      createDialog: false,
      cloudUrlDialog: false,
      showMigrationDialog: false,
      importConfirmDialog: false,
      importDataPreview: null,
      importDataCount: 0,
      unwatchSettings: null,
      lastProvider: null,
      currentProviderValue: null,

      // 选中的项目
      selectedItem: null,
      editingItem: null,
      itemToDelete: null,
      selectedCloudItem: null,

      // 云端地址相关
      gettingCloudUrl: false,
      cloudUrlResult: null,
      cloudUrlError: null,
      cloudUrlOptions: {
        migrateFromLocal: true,
        autoConfigureCloud: true
      },

      // 编辑数据
      editingData: '',
      newKey: '',
      newData: '',

      // 表格头部
      tableHeaders: [
        {title: '键名', key: 'key', sortable: true},
        {title: '操作', key: 'actions', sortable: false, width: '120px'}
      ]
    };
  },

  computed: {
    currentProvider() {
      return this.currentProviderValue;
    },

    isDualMode() {
      return this.currentProviderValue === 'dual-cloud' || this.currentProviderValue === 'dual-server';
    },

    isKvProvider() {
      return ['kv-local', 'kv-server', 'classworkscloud', 'dual-cloud', 'dual-server'].includes(this.currentProviderValue);
    },

    connectionStatus() {
      if (!this.isKvProvider) {
        return '当前数据提供者不支持KV数据库管理';
      }
      if (this.isDualMode) {
        return '双存储模式 (云端+本地)';
      }
      return this.currentProviderValue === 'kv-local' ? '本地数据库' : '服务器数据库';
    },

    connectionIcon() {
      if (!this.isKvProvider) return ICON.DATABASE_OFF;
      if (this.isDualMode) return ICON.DATABASE_SYNC;
      return this.currentProviderValue === 'kv-local' ? ICON.DATABASE : ICON.CLOUD_SYNC;
    },

    connectionColor() {
      if (!this.isKvProvider) return 'error';
      if (this.isDualMode) return 'success';
      return 'success';
    },

    filteredKvData() {
      if (!this.searchQuery) return this.kvData;
      return this.kvData.filter(item =>
        item.key.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },

    isValidJson() {
      if (!this.editingData) return true;
      try {
        JSON.parse(this.editingData);
        return true;
      } catch {
        return false;
      }
    },

    isValidNewJson() {
      if (!this.newData) return true;
      try {
        JSON.parse(this.newData);
        return true;
      } catch {
        return false;
      }
    },

    isValidKey() {
      if (!this.newKey || this.newKey.trim() === '') return false;
      // 检查是否与现有键重复
      return !this.kvData.some(item => item.key === this.newKey.trim());
    }
  },

  async mounted() {
    this.currentProviderValue = getSetting('server.provider');
    this.lastProvider = this.currentProviderValue;
    if (this.isKvProvider) {
      await this.loadKvData();
      if (this.isDualMode) {
        await this.loadSyncStatus();
      }
    }
    this.unwatchSettings = watchSettings(async () => {
      this.currentProviderValue = getSetting('server.provider');
      if (this.currentProviderValue !== this.lastProvider) {
        this.lastProvider = this.currentProviderValue;
        this.kvData = [];
        this.syncStatus = {
          mode: 'local-only',
          cloudCount: 0,
          localCount: 0,
          cloudAvailable: false
        };
        if (this.isKvProvider) {
          await this.loadKvData();
          if (this.isDualMode) {
            await this.loadSyncStatus();
          }
        }
      }
    });
  },

  unmounted() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
  },

  methods: {
    async refreshConnection() {
      this.loading = true;
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.isKvProvider) {
          await this.loadKvData();
          if (this.isDualMode) {
            await this.loadSyncStatus();
          }
        }
        this.$message.success('刷新成功', '连接状态已更新');
      } catch (error) {
        this.$message.error('刷新失败', error.message);
      } finally {
        this.loading = false;
      }
    },

    async loadSyncStatus() {
      if (!this.isDualMode) return;
      try {
        const status = await dataProvider.getSyncStatus();
        this.syncStatus = status;
      } catch (error) {
        console.warn('获取同步状态失败:', error);
        this.syncStatus = {
          mode: 'dual',
          cloudAvailable: false,
          error: error.message
        };
      }
    },

    async syncFromCloud() {
      this.loading = true;
      try {
        const result = await dataProvider.syncAllToLocal();
        if (result.success) {
          this.$message.success('同步完成', `${result.synced} 条成功, ${result.failed} 条失败`);
          await this.loadSyncStatus();
          await this.loadKvData();
        } else {
          this.$message.error('同步失败', result.error?.message);
        }
      } catch (error) {
        this.$message.error('同步失败', error.message);
      } finally {
        this.loading = false;
      }
    },

    async syncToCloud() {
      this.loading = true;
      try {
        const result = await dataProvider.syncAllToCloud();
        if (result.success) {
          this.$message.success('同步完成', `${result.synced} 条成功, ${result.failed} 条失败`);
          await this.loadSyncStatus();
        } else {
          this.$message.error('同步失败', result.error?.message);
        }
      } catch (error) {
        this.$message.error('同步失败', error.message);
      } finally {
        this.loading = false;
      }
    },

    async loadKvData() {
      if (!this.isKvProvider) {
        this.$message.warning('不支持的操作', '当前数据提供者不支持KV数据库管理');
        return;
      }

      this.loadingData = true;
      try {
        this.kvData = [];

        const result = await dataProvider.loadKeys({
          sortBy: 'key',
          sortDir: 'asc',
          limit: 1000
        });

        if (result.success === false) {
          throw new Error(result.error?.message || '获取键名列表失败');
        }

        this.kvData = result.keys.map(key => ({
          key,
          value: null,
          loaded: false
        }));

        this.$message.success('数据加载完成', `共找到 ${this.kvData.length} 条数据记录`);
      } catch (error) {
        this.$message.error('加载数据失败', error.message);
      } finally {
        this.loadingData = false;
      }
    },

    async loadStorageInfo() {
      this.loadingStorageInfo = true;
      try {
        const info = await dataProvider.loadStorageInfo?.();
        if (info && info.ok) {
          this.storageInfo = `${info.sizeMB} | ${info.keyCount} 个键`;
        } else {
          this.storageInfo = '无法获取存储信息';
        }
      } catch (error) {
        this.storageInfo = '获取失败';
        console.warn('获取存储信息失败:', error);
      } finally {
        this.loadingStorageInfo = false;
      }
    },

    async exportAllData() {
      this.exporting = true;
      try {
        const keys = this.kvData.map(item => item.key);
        const exportData = {};
        
        for (const key of keys) {
          const data = await dataProvider.loadData(key);
          if (data && data.success !== false) {
            exportData[key] = data;
          }
        }

        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `classworks-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.$message.success('导出成功', `已导出 ${Object.keys(exportData).length} 条数据`);
      } catch (error) {
        this.$message.error('导出失败', error.message);
      } finally {
        this.exporting = false;
      }
    },

    triggerImport() {
      this.$refs.importInput?.click();
    },

    async handleImportFile(event) {
      const file = event.target?.files?.[0];
      if (!file) return;

      this.importing = true;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (typeof data !== 'object' || data === null) {
          throw new Error('无效的备份文件格式');
        }

        this.importDataPreview = data;
        this.importDataCount = Object.keys(data).length;
        this.importConfirmDialog = true;
      } catch (error) {
        this.$message.error('导入失败', `文件格式无效: ${error.message}`);
      } finally {
        this.importing = false;
        event.target.value = '';
      }
    },

    async confirmImport() {
      this.importing = true;
      this.importConfirmDialog = false;
      
      try {
        let imported = 0;
        let failed = 0;
        
        for (const [key, value] of Object.entries(this.importDataPreview)) {
          try {
            const result = await dataProvider.saveData(key, value);
            if (result && result.success !== false) {
              imported++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }

        this.$message.success(
          '导入完成',
          `${imported} 条成功, ${failed} 条失败`
        );
        
        this.importDataPreview = null;
        this.importDataCount = 0;
        await this.loadKvData();
      } catch (error) {
        this.$message.error('导入失败', error.message);
      } finally {
        this.importing = false;
      }
    },


    async viewItem(item) {
      this.selectedItem = item;
      this.viewDialog = true;

      // 如果数据未加载，则加载数据
      if (!item.loaded || item.value === null) {
        await this.loadItemData(item);
      }
    },

    async editItem(item) {
      this.editingItem = item;

      // 如果数据未加载，则加载数据
      if (!item.loaded || item.value === null) {
        await this.loadItemData(item);
      }

      this.editingData = this.formatJsonData(item.value);
      this.editDialog = true;
    },

    async loadItemData(item) {
      try {
        const data = await dataProvider.loadData(item.key);
        if (data && data.success !== false) {
          item.value = data;
          item.loaded = true;
        } else {
          throw new Error('数据加载失败');
        }
      } catch (error) {
        this.$message.error('加载数据失败', error.message);
        item.value = null;
        item.loaded = false;
      }
    },

    closeEditDialog() {
      this.editDialog = false;
      this.editingItem = null;
      this.editingData = '';
    },

    createNewItem() {
      this.newKey = '';
      this.newData = '{\n  "example": "value"\n}';
      this.createDialog = true;
    },

    closeCreateDialog() {
      this.createDialog = false;
      this.newKey = '';
      this.newData = '';
    },

    async saveNewData() {
      if (!this.isValidKey || !this.isValidNewJson) return;

      this.savingData = true;
      try {
        const parsedData = JSON.parse(this.newData);
        const key = this.newKey.trim();
        const result = await dataProvider.saveData(key, parsedData);

        if (result && !result.error) {
          // 添加到本地数据列表
          this.kvData.push({
            key,
            value: parsedData,
            loaded: true
          });

          this.$message.success('创建成功', '数据已成功创建');
          this.closeCreateDialog();
        } else {
          throw new Error(result.error?.message || '创建失败');
        }
      } catch (error) {
        this.$message.error('创建失败', error.message);
      } finally {
        this.savingData = false;
      }
    },

    async saveEditedData() {
      if (!this.isValidJson || !this.editingItem) return;

      this.savingData = true;
      try {
        const parsedData = JSON.parse(this.editingData);
        const result = await dataProvider.saveData(this.editingItem.key, parsedData);

        if (result && !result.error) {
          // 更新本地数据
          const index = this.kvData.findIndex(item => item.key === this.editingItem.key);
          if (index !== -1) {
            this.kvData[index].value = parsedData;
            this.kvData[index].loaded = true;
          }

          this.$message.success('保存成功', '数据已成功更新');
          this.closeEditDialog();
        } else {
          throw new Error(result.error?.message || '保存失败');
        }
      } catch (error) {
        this.$message.error('保存失败', error.message);
      } finally {
        this.savingData = false;
      }
    },

    confirmDelete(item) {
      this.itemToDelete = item;
      this.deleteDialog = true;
    },

    async deleteItem() {
      if (!this.itemToDelete) return;

      this.deletingData = true;
      try {
        // 对于本地存储，直接删除
        if (this.currentProvider === 'kv-local') {
          const db = await openDB('ClassworksDB', 2);
          const tx = db.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          await store.delete(this.itemToDelete.key);
        } else {
          // 对于服务器存储，这里需要实现删除API
          // 注意：大多数KV服务器不提供删除功能，可能需要设置为null
          await dataProvider.saveData(this.itemToDelete.key, null);
        }

        // 从本地列表中移除
        const index = this.kvData.findIndex(item => item.key === this.itemToDelete.key);
        if (index !== -1) {
          this.kvData.splice(index, 1);
        }

        this.$message.success('删除成功', '数据已成功删除');
        this.deleteDialog = false;
        this.itemToDelete = null;
      } catch (error) {
        this.$message.error('删除失败', error.message);
      } finally {
        this.deletingData = false;
      }
    },

    formatJsonData(data) {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    },

    async copyToClipboard(data) {
      try {
        const text = this.formatJsonData(data);
        await navigator.clipboard.writeText(text);
        this.$message.success('复制成功', '数据已复制到剪贴板');
      } catch (error) {
        this.$message.error('复制失败', error.message);
      }
    },

    async getCloudUrl(item) {
      this.selectedCloudItem = item;
      this.cloudUrlResult = null;
      this.cloudUrlError = null;
      this.cloudUrlDialog = true;

      await this.fetchCloudUrl();
    },

    async fetchCloudUrl() {
      if (!this.selectedCloudItem) return;

      this.gettingCloudUrl = true;
      this.cloudUrlError = null;

      try {
        const result = await dataProvider.getKeyCloudUrl(
          this.selectedCloudItem.key,
          this.cloudUrlOptions
        );

        if (result.success) {
          this.cloudUrlResult = result;
          this.$message.success('获取成功', '云端地址已获取');
        } else {
          this.cloudUrlError = result.error?.message || '获取云端地址失败';
          this.$message.error('获取失败', this.cloudUrlError);
        }
      } catch (error) {
        this.cloudUrlError = error.message || '获取云端地址时发生错误';
        this.$message.error('获取失败', this.cloudUrlError);
      } finally {
        this.gettingCloudUrl = false;
      }
    },

    async refreshCloudUrl() {
      await this.fetchCloudUrl();
    },

    async copyCloudUrl() {
      if (!this.cloudUrlResult?.url) return;

      try {
        await navigator.clipboard.writeText(this.cloudUrlResult.url);
        this.$message.success('复制成功', '已复制，链接含访问凭证请勿分享');
      } catch (error) {
        this.$message.error('复制失败', error.message);
      }
    },

    openCloudUrl() {
      if (!this.cloudUrlResult?.url) return;

      try {
        window.open(this.cloudUrlResult.url, '_blank');
      } catch (error) {
        this.$message.error('打开链接失败', error.message);
      }
    }
  }
};
</script>

<style scoped>
.font-monospace {
  font-family: var(--font-mono);
}

code {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  padding: 2px 4px;
  border-radius: var(--radius-xs);
  font-size: 0.875em;
}
</style>
