/**
 * 作业本作业的纯函数工具：选项合并、校验与文本格式化。
 *
 * 组件内部保留结构化条目（作业本/内容/页码/题号/遍数），只在“写入编辑框”这一边界
 * 调用 formatNotebookItem 生成文本，避免再对生成的文本做正则反解。
 */

const DEFAULT_SUBJECT_NOTEBOOKS = {
  语文: ['作业本', '作文本'],
  数学: ['作业本'],
  英语: ['作业本'],
  物理: ['作业本'],
  化学: ['作业本'],
  生物: ['作业本'],
  历史: ['作业本'],
  地理: ['作业本'],
  政治: ['作业本'],
}

/**
 * 安全解析自定义作业本设置（JSON 字符串），过滤空值与重复项。
 * @param {string} raw
 * @returns {string[]}
 */
export function parseCustomNotebooks(raw) {
  try {
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((v) => String(v ?? '').trim()).filter(Boolean))]
  } catch {
    return []
  }
}

/**
 * 合并公共作业本、科目作业本与自定义作业本，去重并保留配置顺序。
 * 全部为空时才退回内置默认值。
 * @param {object|null} config - classworks-config-homework-template
 * @param {string} subject
 * @param {string[]} customNotebooks
 * @returns {{name: string}[]}
 */
export function mergeNotebookOptions(config, subject, customNotebooks = []) {
  const seen = new Set()
  const options = []
  const add = (name) => {
    const value = String(name ?? '').trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    options.push({ name: value })
  }

  for (const notebook of config?.commonNotebooks || []) add(notebook)
  for (const notebook of config?.notebookTemplates?.[subject]?.notebooks || []) add(notebook)
  for (const notebook of customNotebooks) add(notebook)

  if (!options.length) {
    for (const notebook of DEFAULT_SUBJECT_NOTEBOOKS[subject] || ['作业本']) add(notebook)
  }
  return options
}

/**
 * 将输入转换为正整数；非法值返回 null。
 * @param {*} value
 * @returns {number|null}
 */
export function toPositiveInt(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const integer = Math.floor(parsed)
  return integer >= 1 ? integer : null
}

/**
 * 校验一条作业本作业，返回错误文案；通过时返回空字符串。
 * @param {object} item
 * @returns {string}
 */
export function validateNotebookItem(item) {
  if (!String(item?.content || '').trim()) return '请填写内容'

  const invalidNumberInput = (value) => {
    if (value === null || value === undefined || String(value).trim() === '') return false
    const parsed = Number(value)
    return !Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1
  }

  if (invalidNumberInput(item.pageStart) || invalidNumberInput(item.pageEnd)) {
    return '页码必须是正整数'
  }
  if (invalidNumberInput(item.questionStart) || invalidNumberInput(item.questionEnd)) {
    return '题号必须是正整数'
  }

  const pageStart = toPositiveInt(item.pageStart)
  const pageEnd = toPositiveInt(item.pageEnd)
  if (item.pageMode === 'range') {
    if (pageStart && pageEnd && pageEnd < pageStart) return '结束页不能小于起始页'
    if (pageStart && !pageEnd) return '请填写结束页'
  }

  if (item.questionMode === 'multi') return ''

  const questionStart = toPositiveInt(item.questionStart)
  const questionEnd = toPositiveInt(item.questionEnd)
  if (item.questionMode === 'range') {
    if (questionStart && questionEnd && questionEnd < questionStart) return '结束题不能小于起始题'
    if (questionStart && !questionEnd) return '请填写结束题'
  }
  return ''
}

/**
 * 将结构化条目格式化为最终写入编辑框的一行文本。
 * @param {object} item
 * @param {number} times - 第几次
 * @returns {string}
 */
export function formatNotebookItem(item, times) {
  const parts = []
  const notebook = String(item?.notebook || '').trim()
  if (notebook) parts.push(`📖 ${notebook}`)
  parts.push(`第${times}次`)

  const content = String(item?.content || '').trim()
  if (content) parts.push(content)

  const pageStart = toPositiveInt(item?.pageStart)
  const pageEnd = toPositiveInt(item?.pageEnd)
  if (pageStart) {
    const asRange = item?.pageMode === 'range' && pageEnd && pageEnd !== pageStart
    parts.push(asRange ? `第${pageStart}-${pageEnd}页` : `第${pageStart}页`)
  }

  if (item?.questionMode === 'multi') {
    const questions = [...new Set((item.questions || []).map(toPositiveInt).filter(Boolean))].sort(
      (a, b) => a - b,
    )
    if (questions.length) parts.push(`第${questions.join(',')}题`)
  } else {
    const questionStart = toPositiveInt(item?.questionStart)
    const questionEnd = toPositiveInt(item?.questionEnd)
    if (questionStart) {
      const asRange = item?.questionMode === 'range' && questionEnd && questionEnd !== questionStart
      parts.push(asRange ? `第${questionStart}-${questionEnd}题` : `第${questionStart}题`)
    }
  }

  if (item?.repeat) parts.push(`写${item.repeat}遍`)
  return parts.join(' | ')
}
