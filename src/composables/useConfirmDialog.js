import { reactive } from "vue";

/**
 * useConfirmDialog — 通用确认对话框 composable
 *
 * 管理"执行前需用户确认"的对话框状态，如破坏性操作（清除/删除/重置/覆盖）二次确认。
 * - showConfirmDialog(options) 返回 Promise，用户确认后 resolve，取消后 reject（带"用户取消"错误）
 * - confirmSave() 触发 resolve
 * - cancelSave() 触发 reject
 *
 * 设计原则：
 * - 状态自管（confirmDialog：show / resolve / reject / title / text / color / confirmText）
 * - 无外部依赖，无需 setContext
 * - 模板通过 setup 自动解包 ref 访问 confirmDialog.show / resolve / reject
 *
 * 安全保证：
 * - resolve/reject 为 null 时，confirmSave/cancelSave 静默跳过
 * - 未传 options 时使用默认标题/文案，保持向后兼容（"修改过往数据需确认保存"）
 */
export function useConfirmDialog() {
  const confirmDialog = reactive({
    show: false,
    title: "确认操作",
    text: "确定要执行此操作吗？",
    color: "warning", // 确认按钮语义色：warning/error/primary/success
    confirmText: "确认",
    resolve: null,
    reject: null,
  });

  /**
   * 弹出确认对话框，等待用户选择
   * @param {object} [options]
   * @param {string} [options.title]     对话框标题
   * @param {string} [options.text]      询问文案
   * @param {string} [options.color]     确认按钮颜色（warning/error/primary/success）
   * @param {string} [options.confirmText] 确认按钮文字
   * @returns {Promise<void>} 用户确认后 resolve；取消后 reject(Error("用户取消"))
   */
  const showConfirmDialog = (options = {}) => {
    return new Promise((resolve, reject) => {
      confirmDialog.title = options.title || "确认操作";
      confirmDialog.text = options.text || "确定要执行此操作吗？";
      confirmDialog.color = options.color || "warning";
      confirmDialog.confirmText = options.confirmText || "确认";
      confirmDialog.show = true;
      confirmDialog.resolve = () => {
        confirmDialog.show = false;
        resolve();
      };
      confirmDialog.reject = () => {
        confirmDialog.show = false;
        reject(new Error("用户取消"));
      };
    });
  };

  const confirmSave = () => {
    confirmDialog.show = false;
    if (confirmDialog.resolve) {
      confirmDialog.resolve(true);
    }
  };

  const cancelSave = () => {
    confirmDialog.show = false;
    if (confirmDialog.reject) {
      confirmDialog.reject(new Error("用户取消"));
    }
  };

  return {
    confirmDialog,
    showConfirmDialog,
    confirmSave,
    cancelSave,
  };
}