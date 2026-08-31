// 各配置卡片的默认值唯一来源（纯数据，无逻辑）。
// 加载兜底行为由 composables/useConfigDefaults 负责，两者分离。

// 科目管理（SubjectManagementCard）
export const defaultSubjects = [
  { name: '语文', order: 0 },
  { name: '数学', order: 1 },
  { name: '英语', order: 2 },
  { name: '物理', order: 3 },
  { name: '化学', order: 4 },
  { name: '生物', order: 5 },
  { name: '政治', order: 6 },
  { name: '历史', order: 7 },
  { name: '地理', order: 8 },
  { name: '其他', order: 9 },
]

// 作业模板（HomeworkTemplateCard）
export const defaultHomeworkTemplate = {
  subjects: {
    语文: { books: { 课本: ['第一单元', '第二单元'], 练习册: ['第一章', '第二章'] } },
    数学: { books: { 课本: ['第一章', '第二章'], 习题册: ['基础练习', '提高练习'] } },
    英语: { books: { 课本: ['Unit 1', 'Unit 2'], 练习册: ['Chapter 1', 'Chapter 2'] } },
  },
  commonSubject: {
    books: { 试卷: ['单元测试', '期中测试', '期末测试'], 假期作业: ['必做题', '选做题'] },
  },
  actions: ['写完', '下一课', '不交', '明天交'],
  notebookTemplates: {
    语文: { notebooks: ['练习本', '作文本', '听写本'] },
    数学: { notebooks: ['练习本', '习题本'] },
    英语: { notebooks: ['练习本', '听写本', '单词本'] },
  },
  commonNotebooks: ['练习本', '作业本', '习题本'],
}
