# chapter · 目录与章节

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于开场目录或章节过渡，展示 1～6 个章节。
需要讲解操作步骤用 flow；需要总结多个判断用 points。

## 每一步画面

1. 未填 current：按章节顺序逐栏突出，后续栏淡出；标题说明这一章回答什么问题。
2. 填写 current：只展示一步，指定章节突出并标注本章；标题交代本章重点。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 chapter。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 1～6 个章节对象。 |
| `items[].title` | 是 | 非空字符串，建议 ≤10 字。 |
| `items[].desc` | 否 | 字符串，建议 ≤24 字。 |
| `items[].number` | 否 | 字符串或有限数字；省略时按顺序编号。 |
| `current` | 否 | 从 0 开始的有效整数下标；填写后整页只有一步。 |
| `currentLabel` | 否 | 字符串，替换默认本章标签。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 不填 current 的目录放在整份演示第 2 页；章节过渡页应填写 current。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "chapter",
  "eyebrow": "示例数据 · 门店排班",
  "title": "先看等待再看排班",
  "items": [
    {
      "title": "等待发生在哪",
      "desc": "按时段拆开观察"
    },
    {
      "title": "排班如何调整",
      "desc": "把人手移到高峰"
    }
  ],
  "steps": [
    {
      "title": "先找到等待高峰"
    },
    {
      "title": "再讨论排班调整"
    }
  ]
}
```
