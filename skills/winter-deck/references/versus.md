# versus · 双方案对比

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于之前与之后或方案 A/B 的同口径比较。
比较多个对象的单一数值用 compare-bars；多列明细用 table。

## 每一步画面

1. 第 1 步：突出左栏 a，右栏淡出；标题指出原方案的问题。
2. 第 2 步：突出右栏 b；标题说明改变了什么。
3. rows 非空时增加第 3 步：同时标记各行较优一侧；标题归纳取舍，不按行增加步骤。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 versus。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `a / b` | 是 | 两个方案对象，a 在左，b 在右。 |
| `a.title / b.title` | 是 | 非空字符串，各建议 ≤10 字。 |
| `a.desc / b.desc` | 否 | 字符串，各建议 ≤22 字。 |
| `a.label / b.label` | 否 | 字符串，各建议 ≤6 字，默认之前、之后。 |
| `rows` | 否 | 0～5 个比较行对象。 |
| `rows[].label / a / b` | 是 | 非空字符串，各建议 ≤8 字；数值也填展示字符串并写清单位。 |
| `rows[].better` | 否 | a、b 或空字符串，指定较优侧。 |
| `mid` | 否 | 字符串，建议 ≤4 字，默认对比。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- better 必须自行核对，不会按数值大小判断；等待时间等越低越好的指标不能填反。
- rows 为空或省略时只有两步；第三步的好坏标记同时出现。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "versus",
  "eyebrow": "示例数据 · 门店排班",
  "title": "调动工时覆盖午高峰",
  "a": {
    "title": "固定人数排班"
  },
  "b": {
    "title": "按客流调整排班"
  },
  "rows": [
    {
      "label": "日均工时",
      "a": "40小时",
      "b": "38小时",
      "better": "b"
    },
    {
      "label": "高峰等待",
      "a": "6分钟",
      "b": "3分钟",
      "better": "b"
    }
  ],
  "steps": [
    {
      "title": "固定排班难覆盖高峰"
    },
    {
      "title": "挪动工时补午高峰"
    },
    {
      "title": "测算等待可缩短",
      "body": "示例测算，实际效果需试行核对。"
    }
  ]
}
```
