import { ref, computed } from "vue";

/**
 * 考试卡片管理 composable
 *
 * 管理首页"考试安排"卡片的添加/移除/详情/编辑流程。
 * 卡片存储在 boardData.homework["exam-${id}"] 中（与作业内容混存，保留原数据结构）。
 *
 * 设计原则：
 * - 状态自管（selectedExamId / showExamDetailDialog / showAddExamDialog / upcomingExams）
 * - 派生状态自管（addedExamIds / hasExamCard，通过 ctx.getBoardData 访问 boardData）
 * - 外部依赖（boardData / synced 标志 / trySave / $message）通过 setContext 延迟绑定
 *   （因为 setup() 中无法访问 this.state / this.trySave，必须在 mounted 中注入）
 * - examStore 直接 import useExamStore() 创建（与原代码 this.examStore 等价）
 *
 * 安全保证：
 * - ctx 未设置时，computed 返回安全默认值（空 Set / false）
 * - ctx 未设置时，方法静默返回（不抛错）
 *   模板事件触发时 mounted 已执行，ctx 必已设置
 */
export function useExamCards() {
  // own 状态
  const selectedExamId = ref(null);
  const showExamDetailDialog = ref(false);
  const showAddExamDialog = ref(false);
  const upcomingExams = ref([]);

  // 延迟绑定的外部上下文
  let ctx = null;

  const setContext = (context) => {
    ctx = context;
  };

  // 派生状态（依赖 boardData，通过 ctx 访问）
  const addedExamIds = computed(() => {
    if (!ctx) return new Set();
    const homework = ctx.getBoardData()?.homework || {};
    const ids = new Set();
    for (const key of Object.keys(homework)) {
      if (key.startsWith("exam-")) {
        ids.add(key.slice(5));
      }
    }
    return ids;
  });

  const hasExamCard = computed(() => {
    if (!ctx) return false;
    const homework = ctx.getBoardData()?.homework || {};
    for (const key in homework) {
      if (key.startsWith("exam-")) return true;
    }
    return false;
  });

  // 方法
  const addExamCard = (examId, forceAdd = false, skipSave = false) => {
    if (!ctx) return;
    const boardData = ctx.getBoardData();
    if (!boardData) return;
    const key = `exam-${examId}`;
    if (!forceAdd && boardData.homework[key]) {
      delete boardData.homework[key];
    } else {
      boardData.homework[key] = {
        type: "exam",
        examId: examId,
        name: "考试安排",
        content: "",
      };
    }
    ctx.setSynced(false);
    if (!skipSave) {
      ctx.trySave(true);
    }
  };

  const openExamDetail = (examId) => {
    selectedExamId.value = examId;
    showExamDetailDialog.value = true;
  };

  const removeCurrentExamCard = () => {
    if (selectedExamId.value) {
      addExamCard(selectedExamId.value); // Toggle off
      showExamDetailDialog.value = false;
    }
  };

  const onExamConfigSaved = async () => {
    if (!ctx) return;
    if (selectedExamId.value) {
      // 通过 store API 失效缓存，强制下次 fetchExam 重新拉取
      ctx.examStore.invalidateExam(selectedExamId.value);
      await ctx.examStore.fetchExam(selectedExamId.value);
      ctx.showMessage("success", "保存成功", "考试配置已更新");
    }
  };

  const onExamConfigDeleted = () => {
    if (!ctx) return;
    removeCurrentExamCard();
    ctx.showMessage("success", "删除成功", "考试配置已删除");
  };

  const isExamCardAdded = (examId) => {
    if (!ctx) return false;
    const boardData = ctx.getBoardData();
    if (!boardData) return false;
    return !!boardData.homework[`exam-${examId}`];
  };

  const addAllUpcomingExams = () => {
    if (!ctx) return;
    let addedCount = 0;
    for (const exam of upcomingExams.value) {
      if (!isExamCardAdded(exam.id)) {
        addExamCard(exam.id, true, true); // skipSave = true
        addedCount++;
      }
    }
    if (addedCount > 0) {
      ctx.trySave(true); // 统一保存一次
      ctx.showMessage("success", "添加成功", `已添加 ${addedCount} 个考试安排`);
    } else {
      ctx.showMessage("info", "提示", "所有考试已添加");
    }
  };

  const checkUpcomingExams = async () => {
    if (!ctx) return;
    upcomingExams.value = await ctx.examStore.getUpcomingExams();
  };

  return {
    selectedExamId,
    showExamDetailDialog,
    showAddExamDialog,
    upcomingExams,
    addedExamIds,
    hasExamCard,
    setContext,
    addExamCard,
    openExamDetail,
    removeCurrentExamCard,
    onExamConfigSaved,
    onExamConfigDeleted,
    isExamCardAdded,
    addAllUpcomingExams,
    checkUpcomingExams,
  };
}
