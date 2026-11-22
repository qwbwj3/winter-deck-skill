# table · 表格

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于展示 2～6 列、1～8 行结构化数据，再点出关键行或单元格。
只比较单一数值的高低用 compare-bars；两方案的优劣用 versus。

## 每一步画面

1. 第 1 步：显示全表；标题给出整体判断。
2. 后续每步：按 highlight 突出一行，其余行淡出；指定 col 时该格变强调色，标题解释差距。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 table。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `columns` | 是 | 2～6 个非空列名字符串，每个建议 ≤8 字。 |
| `rows` | 是 | 1～8 个行对象。 |
| `rows[].cells` | 是 | 数组，项数等于列数；各项为字符串或有限数字，建议 ≤10 字符。 |
| `rows[].tones` | 否 | ok、bad 或空字符串数组，数量不超过列数，按列对应。 |
| `highlight` | 否 | 数组；各项为行整数下标或对象，row 必填、col 可选，均为从 0 开始的有效整数。 |
| `note` | 否 | 字符串，说明来源、单位或统计口径。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 总步数为 1 加 highlight 项数；突出同一行两次也占两步。
- 数值不自动附单位；在列名或单元格中写清单位，tones 不会自动计算优劣。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "table",
  "eyebrow": "示例数据 · 门店排班",
  "title": "午高峰等待需要先处理",
  "columns": [
    "时段",
    "客流",
    "等待"
  ],
  "rows": [
    {
      "cells": [
        "上午",
        "40人",
        "1分钟"
      ]
    },
    {
      "cells": [
        "午间",
        "120人",
        "6分钟"
      ],
      "tones": [
        "",
        "",
        "bad"
      ]
    }
  ],
  "highlight": [
    {
      "row": 1,
      "col": 2
    }
  ],
  "note": "示例数据；等待为现场记录均值",
  "steps": [
    {
      "title": "等待集中在午高峰"
    },
    {
      "title": "午间等待达到六分钟"
    }
  ]
}
```
