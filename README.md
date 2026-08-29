# Classworks

![GitHub](https://img.shields.io/github/license/Moonrend/Classworks?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/Moonrend/Classworks?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/Moonrend/Classworks?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/Moonrend/Classworks?style=flat-square)
![Classworks](./images/banner.png)

适用于班级大屏的作业板工具

请打开 [https://cs.houlang.cloud](https://cs.houlang.cloud) 立即使用


## 📦 快速开始

### 环境准备

- Node.js 18+（推荐 20.x）
- pnpm 8+（建议使用 `package.json` 中 `packageManager` 声明的 pnpm 11.x）

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/Moonrend/Classworks.git
cd Classworks

# 安装依赖（请使用 pnpm，本仓库使用 pnpm-lock.yaml 管理依赖）
pnpm install

# 复制环境变量示例并进行必要配置
cp .env.example .env   # Windows: copy .env.example .env

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build
```

### 环境变量

项目运行前需要配置 `.env` 文件（参考 `.env.example`），关键变量说明如下：

- `VITE_DEFAULT_KV_SERVER`：默认 KV 存储服务地址。
- `VITE_DEFAULT_AUTH_SERVER`：默认认证服务地址。
- `VITE_ENABLE_MONITORING`：生产监控总开关（`true` 时启用 Sentry 与 Microsoft Clarity；默认 `false`）。
- `VITE_SENTRY_DSN`：Sentry DSN（未配置时使用内置默认值）。
- `VITE_CLARITY_ID`：Microsoft Clarity 项目 ID（未配置时使用内置默认值）。

生产环境构建时，这些变量由 CI/CD 注入，请勿将敏感 Token 等凭据硬编码到源码中。


## 🤝 参与贡献

Classworks 非常欢迎你的加入！[提一个 Issue](https://github.com/Moonrend/Classworks/issues/new) 或者提交一个 Pull Request。对于小白问题，最好在 QQ 群里问，我们会尽力回答。

Moonrend 社区项目遵循 [Contributor Covenant](http://contributor-covenant.org/version/1/3/0/) 行为规范。
<br/>孙悟元 希望你遵循 [提问的智慧](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way/blob/main/README-zh_CN.md)。

## 👥 联系我们

- Moonrend 社区 QQ 交流群：[964979747](https://qm.qq.com/q/4RX45b1Oac)
- 主要开发者：[@SunWuyuan](https://github.com/Sunwuyuan)
- 官网：[Moonrend](https://moonrend.com/)

## 🙏 致谢

感谢所有为项目做出贡献的开发者！

## 📄 开源协议

Moonrend 社区项目 [Classworks](https://github.com/Moonrend/Classworks) 遵循 [AGPL-3.0 许可证](LICENSE)。


Copyright (C) 2020-2026  Sunwuyuan.