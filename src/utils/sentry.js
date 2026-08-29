/**
 * Sentry 异步初始化模块
 *
 * 从 main.js 中异步加载，在 app.mount() 之前完成初始化，
 * 避免 @sentry/vue (~60KB gzip) 阻塞首屏渲染。
 */
import * as Sentry from '@sentry/vue'
import { getVisitorId } from '@/utils/visitorId'

// 保存 feedback integration 实例的引用
let feedbackIntegration = null

/**
 * 异步初始化 Sentry（在 app mount 前调用）
 * @param {import('vue').App} app - Vue app 实例
 * @param {import('vue-router').Router} router - Vue Router 实例
 */
export function initSentry(app, router) {
  const isDev = import.meta.env.DEV;
  const monitoringEnabled = import.meta.env.VITE_ENABLE_MONITORING === 'true';
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN || 'https://dc34ab47426f49c0925445f0d87b7007@report.houlang.cloud/6';

  if (isDev || !monitoringEnabled) {
    return;
  }

  Sentry.init({
    app,
    dsn: sentryDsn,
    enabled: true,
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      feedbackIntegration = Sentry.feedbackIntegration({
        autoInject: false,
        colorScheme: 'system',
        showBranding: false,
        showName: true,
        showEmail: true,
        isNameRequired: false,
        isEmailRequired: false,
        useSentryUser: {
          name: 'username',
          email: 'email',
        },
        themeDark: {
          submitBackground: '#6200EA',
          submitBackgroundHover: '#7C4DFF',
        },
        themeLight: {
          submitBackground: '#6200EA',
          submitBackgroundHover: '#7C4DFF',
        },
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      'localhost',
      /^https?:\/\/cs\.(houlang\.cloud|houlangs\.com)/,
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: true,
    beforeSend(event) {
      // 安全脱敏：移除请求头、URL、breadcrumb 中的敏感凭证（x-app-token、Authorization、x-site-key、?token=）
      // 避免 axios 异常把 error.config.headers 中的 kvToken 上报到远程错误追踪服务
      try {
        // 1. 脱敏 request.headers
        if (event.request?.headers) {
          const sensitiveHeaders = ['x-app-token', 'authorization', 'x-site-key', 'cookie']
          for (const key of Object.keys(event.request.headers)) {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
              event.request.headers[key] = '[Filtered]'
            }
          }
        }
        // 2. 脱敏 request.url 和 request.query_string 中的 token 参数
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/([?&]token=)[^&]*/gi, '$1[Filtered]')
        }
        if (event.request?.query_string) {
          event.request.query_string = event.request.query_string.replace(/([?&]token=)[^&]*/gi, '$1[Filtered]')
        }
        // 3. 脱敏 breadcrumbs 中的 http 请求
        if (Array.isArray(event.breadcrumbs)) {
          for (const crumb of event.breadcrumbs) {
            if (crumb?.type === 'http' && crumb?.data) {
              if (crumb.data.headers) {
                const sensitiveHeaders = ['x-app-token', 'authorization', 'x-site-key', 'cookie']
                for (const key of Object.keys(crumb.data.headers)) {
                  if (sensitiveHeaders.includes(key.toLowerCase())) {
                    crumb.data.headers[key] = '[Filtered]'
                  }
                }
              }
              if (crumb.data.url) {
                crumb.data.url = crumb.data.url.replace(/([?&]token=)[^&]*/gi, '$1[Filtered]')
              }
            }
          }
        }
        // 4. 脱敏 exception stacktrace frames 中的 vars（可能包含 error.config 中的 headers）
        if (event.exception?.values) {
          for (const ex of event.exception.values) {
            if (ex.stacktrace?.frames) {
              for (const frame of ex.stacktrace.frames) {
                if (frame.vars) {
                  const sensitiveVarKeys = ['headers', 'config', 'error', 'err', 'request']
                  for (const key of Object.keys(frame.vars)) {
                    if (sensitiveVarKeys.includes(key)) {
                      frame.vars[key] = '[Filtered]'
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // 脱敏失败不应阻塞事件上报
        console.warn('Sentry 事件脱敏失败:', e)
      }
      return event
    },
  })

  // 异步设置用户 fingerprint
  getVisitorId()
    .then((visitorId) => {
      Sentry.setUser({ id: visitorId, username: visitorId })
      Sentry.setTag('fingerprint', visitorId)
      console.log('Sentry 用户标识已设置:', visitorId)
    })
    .catch((error) => {
      console.warn('设置 Sentry 用户标识失败:', error)
    })

  // 注册全局函数：打开反馈表单
  window.openSentryFeedback = () => {
    try {
      if (!feedbackIntegration) {
        console.warn('Sentry Feedback integration 未初始化')
        return false
      }
      if (typeof feedbackIntegration.createWidget === 'function') {
        const widget = feedbackIntegration.createWidget()
        if (widget && typeof widget.open === 'function') {
          widget.open()
          console.log('Sentry Feedback 对话框已打开')
          return true
        }
      }
      if (typeof feedbackIntegration.openDialog === 'function') {
        feedbackIntegration.openDialog()
        console.log('Sentry Feedback 对话框已打开')
        return true
      }
      console.warn('无法找到打开 Feedback 的方法')
      console.log('可用方法:', Object.keys(feedbackIntegration))
      return false
    } catch (error) {
      console.error('打开 Sentry Feedback 时出错:', error)
      return false
    }
  }

  // 注册全局函数：手动启动录制
  window.startSentryReplay = () => {
    try {
      const client = Sentry.getClient()
      if (!client) {
        console.warn('Sentry 客户端未初始化')
        return false
      }
      const integrations = client.getOptions().integrations || []
      const replayIntegration = integrations.find(
        (integration) => integration && integration.name === 'Replay'
      )
      if (replayIntegration && typeof replayIntegration.start === 'function') {
        replayIntegration.start()
        console.log('Sentry Replay 已手动启动')
        return true
      }
      console.warn('无法找到 Sentry Replay integration')
      return false
    } catch (error) {
      console.error('启动 Sentry Replay 时出错:', error)
      return false
    }
  }
}
