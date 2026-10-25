import { describe, expect, it } from 'vitest'
import {
  formatNotebookItem,
  mergeNotebookOptions,
  parseCustomNotebooks,
  toPositiveInt,
  validateNotebookItem,
} from './notebookHomework'

describe('notebookHomework 格式化', () => {
  it('保留带空格的作业本名，不再用正则截断', () => {
    const text = formatNotebookItem(
      {
        notebook: '英语 作文本',
        content: '第5课读读写写',
        pageMode: 'range',
        pageStart: 3,
        pageEnd: 5,
        questionMode: 'range',
        questionStart: 1,
        questionEnd: 2,
        repeat: 2,
      },
      1,
    )

    expect(text).toBe('📖 英语 作文本 | 第1次 | 第5课读读写写 | 第3-5页 | 第1-2题 | 写2遍')
  })

  it('多选题目去重、排序并忽略非法值', () => {
    const text = formatNotebookItem(
      {
        content: '订正',
        questionMode: 'multi',
        questions: [5, 3, 5, 0, null, 21],
      },
      2,
    )

    expect(text).toBe('第2次 | 订正 | 第3,5,21题')
  })

  it('单页/单题只输出一次', () => {
    const text = formatNotebookItem(
      { notebook: '作业本', content: '抄写', pageStart: 7, pageEnd: 7, questionStart: 4 },
      3,
    )

    expect(text).toBe('📖 作业本 | 第3次 | 抄写 | 第7页 | 第4题')
  })

  it('切换到单页/单题后忽略残留的结束值', () => {
    const text = formatNotebookItem(
      {
        content: '抄写',
        pageMode: 'single',
        pageStart: 7,
        pageEnd: 9,
        questionMode: 'single',
        questionStart: 4,
        questionEnd: 6,
      },
      1,
    )

    expect(text).toBe('第1次 | 抄写 | 第7页 | 第4题')
  })
})

describe('notebookHomework 校验', () => {
  it('拒绝空内容与纯空格', () => {
    expect(validateNotebookItem({ content: '' })).toBe('请填写内容')
    expect(validateNotebookItem({ content: '   ' })).toBe('请填写内容')
  })

  it('范围模式必须成对填写，且结束不能小于起始', () => {
    expect(
      validateNotebookItem({ content: 'a', pageMode: 'range', pageStart: 5, pageEnd: null }),
    ).toBe('请填写结束页')
    expect(
      validateNotebookItem({ content: 'a', pageMode: 'range', pageStart: 5, pageEnd: 3 }),
    ).toBe('结束页不能小于起始页')
    expect(
      validateNotebookItem({
        content: 'a',
        questionMode: 'range',
        questionStart: 8,
        questionEnd: 6,
      }),
    ).toBe('结束题不能小于起始题')
  })

  it('拒绝 0、负数与小数页码/题号', () => {
    expect(validateNotebookItem({ content: 'a', pageStart: 0 })).toBe('页码必须是正整数')
    expect(validateNotebookItem({ content: 'a', pageStart: 3.5 })).toBe('页码必须是正整数')
    expect(validateNotebookItem({ content: 'a', questionStart: -1 })).toBe('题号必须是正整数')
  })

  it('多选题目不受范围规则影响', () => {
    expect(validateNotebookItem({ content: 'a', questionMode: 'multi', questions: [] })).toBe('')
  })
})

describe('notebookHomework 选项合并', () => {
  it('合并公共作业本、科目作业本和自定义作业本并去重', () => {
    const options = mergeNotebookOptions(
      {
        commonNotebooks: ['练习本', '作业本'],
        notebookTemplates: { 数学: { notebooks: ['作业本', '错题本'] } },
      },
      '数学',
      ['错题本', '数学 草稿本'],
    )

    expect(options.map((item) => item.name)).toEqual(['练习本', '作业本', '错题本', '数学 草稿本'])
  })

  it('配置全空时才回退内置默认值', () => {
    expect(mergeNotebookOptions(null, '语文', []).map((item) => item.name)).toEqual([
      '作业本',
      '作文本',
    ])
  })
})

describe('notebookHomework 其他', () => {
  it('安全解析自定义作业本设置', () => {
    expect(parseCustomNotebooks('["A"," A ","B",null]')).toEqual(['A', 'B'])
    expect(parseCustomNotebooks('not-json')).toEqual([])
    expect(parseCustomNotebooks('{"a":1}')).toEqual([])
  })

  it('toPositiveInt 过滤 0、负数与小数', () => {
    expect(toPositiveInt('3.9')).toBe(3)
    expect(toPositiveInt(0)).toBeNull()
    expect(toPositiveInt(-2)).toBeNull()
    expect(toPositiveInt('abc')).toBeNull()
  })
})
