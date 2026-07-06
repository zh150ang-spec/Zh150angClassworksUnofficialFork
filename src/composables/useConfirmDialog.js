import { reactive } from "vue";

/**
 * 确认保存对话框 composable
 *
 * 管理"修改过往数据需确认保存"的对话框状态。
 * - showConfirmDialog() 返回 Promise，等待用户选择
 * - confirmSave() 触发 resolve
 * - cancelSave() 触发 reject（带"用户取消保存"错误）
 *
 * 设计原则：
 * - 状态自管（confirmDialog：show / resolve / reject）
 * - 无外部依赖，无需 setContext
 * - 模板通过 setup 自动解包 ref 访问 confirmDialog.show / resolve / reject
 *
 * 安全保证：
 * - resolve/reject 为 null 时，confirmSave/cancelSave 静默跳过
 */
export function useConfirmDialog() {
  const confirmDialog = reactive({
    show: false,
    resolve: null,
    reject: null,
  });

  const showConfirmDialog = () => {
    return new Promise((resolve, reject) => {
      confirmDialog.show = true;
      confirmDialog.resolve = () => {
        confirmDialog.show = false;
        resolve();
      };
      confirmDialog.reject = () => {
        confirmDialog.show = false;
        reject(new Error("用户取消保存"));
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
      confirmDialog.reject(new Error("用户取消保存"));
    }
  };

  return {
    confirmDialog,
    showConfirmDialog,
    confirmSave,
    cancelSave,
  };
}
