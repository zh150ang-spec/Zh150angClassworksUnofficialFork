# Components

Vue components in this tree are **auto-imported** by name via [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)
(`globs: ['src/components/**/[A-Z]*.vue']`), so any component can be used in templates without a manual import.

Components are organized by functional domain:

| 目录        | 职责                                            | 示例                                                                            |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `home/`     | 首页业务（作业板 / 考勤 / 浮动工具栏 / 时间卡） | `HomeworkGrid`, `AttendanceSidebar`, `TimeCard`, `FloatingToolbar`, `AppHeader` |
| `common/`   | 通用展示 / 工具型组件                           | `GlobalMessage`, `RelativeTimeDisplay`, `AppIcon`                               |
| `system/`   | 初始化 / 服务 / PWA 基础设施                    | `InitServiceChooser`, `OfflineIndicator`, `PwaInstallCard`                      |
| `editing/`  | 作业 / 考试 / 紧急通知编辑                      | `HomeworkEditDialog`, `ExamConfigEditor`, `UrgentNotification`                  |
| `settings/` | 设置外壳与各设置卡片                            | `SettingsCard`, `cards/*`                                                       |
| `auth/`     | 认证对话框与引导                                | `DeviceAuthDialog`, `FirstTimeGuide`                                            |

示例（组件按文件名自动注册，无需 import）：

```vue
<template>
  <TimeCard />
</template>
```

> 组件文件名为 PascalCase；`directoryAsNamespace: false`，名称仅取文件名，不携带目录前缀。
