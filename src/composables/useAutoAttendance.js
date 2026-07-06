import { getSetting } from "@/utils/settings";

/**
 * 自动出勤规则引擎 composable
 *
 * 根据 attendance.autoRules 设置项自动应用出勤状态。
 * 规则类型：dateRange / daily / weekly，详见 AutoAttendanceCard.vue 的 rule 对象结构。
 *
 * 设计原则：
 * - 纯函数式 composable（无内部状态）
 * - 接收 boardData 作为参数，避免对组件实例的耦合
 * - 不自动注册 onMounted，由外部在数据加载完成后调用
 *
 * @param {Object} boardData - 作业看板数据，需包含 attendance 字段
 *   attendance 结构：{ absent: string[], late: string[], exclude: string[] }
 */
export function useAutoAttendance() {
  const applyAutoAttendanceRules = (boardData) => {
    const rules = getSetting("attendance.autoRules") || [];
    if (rules.length === 0) return;

    if (!boardData || !boardData.attendance) return;

    const attendance = boardData.attendance;
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeNum = currentHour * 60 + currentMinute;

    for (const rule of rules) {
      if (!rule.student) continue;

      let shouldApply = false;

      if (rule.type === "dateRange") {
        const startDate = rule.startDate;
        const endDate = rule.endDate || "9999-12-31";
        if (currentDate >= startDate && currentDate <= endDate) {
          shouldApply = true;
        }
      } else if (rule.type === "daily") {
        if (rule.startTime && rule.endTime) {
          const [startH, startM] = rule.startTime.split(":").map(Number);
          const [endH, endM] = rule.endTime.split(":").map(Number);
          const startTimeNum = startH * 60 + startM;
          const endTimeNum = endH * 60 + endM;
          if (currentTimeNum >= startTimeNum && currentTimeNum <= endTimeNum) {
            shouldApply = true;
          }
        }
      } else if (rule.type === "weekly") {
        if (rule.weekdays && rule.weekdays.includes(currentDay)) {
          if (rule.startTime && rule.endTime) {
            const [startH, startM] = rule.startTime.split(":").map(Number);
            const [endH, endM] = rule.endTime.split(":").map(Number);
            const startTimeNum = startH * 60 + startM;
            const endTimeNum = endH * 60 + endM;
            if (currentTimeNum >= startTimeNum && currentTimeNum <= endTimeNum) {
              shouldApply = true;
            }
          } else {
            shouldApply = true;
          }
        }
      }

      if (shouldApply) {
        const student = rule.student;

        // 先从所有列表中移除
        ["absent", "late", "exclude"].forEach((list) => {
          const idx = attendance[list].indexOf(student);
          if (idx > -1) attendance[list].splice(idx, 1);
        });

        // 添加到对应列表
        if (rule.status === "absent") {
          if (!attendance.absent.includes(student)) {
            attendance.absent.push(student);
          }
        } else if (rule.status === "late") {
          if (!attendance.late.includes(student)) {
            attendance.late.push(student);
          }
        } else if (rule.status === "exclude") {
          if (!attendance.exclude.includes(student)) {
            attendance.exclude.push(student);
          }
        }
      }
    }
  };

  return { applyAutoAttendanceRules };
}
