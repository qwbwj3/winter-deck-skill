# points · 要点清单

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于逐条讲清 2～6 个独立判断或议题，每项有短标题与一句依据。
有操作先后关系用 flow；需要按时间分布用 timeline。

## 每一步画面

1. 前 N 步：逐行突出编号与标题，后续行淡出；标题说明当前要点的判断。
2. overview 未关闭时增加最后总览：所有行恢复正常；标题概括共同结论。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 points。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 2～6 个要点对象。 |
| `items[].title` | 是 | 非空字符串，建议 ≤10 字。 |
| `items[].text / tag` | 否 | 字符串，分别建议 ≤28 / 6 字。 |
| `items[].tone` | 否 | ok、bad 或空字符串；决定标签颜色。 |
| `overview` | 否 | 布尔值；默认增加总览，false 关闭。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 每项 text 写依据，页面 body 只作补充，不会替代条目内容。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "points",
  "eyebrow": "示例数据 · 门店排班",
  "title": "扩店前先核对两件事",
  "items": [
    {
      "title": "等待集中在午间",
      "text": "按时段复核客流和等待"
    },
    {
      "title": "排班可以先调整",
      "text": "先做试行再决定加人"
    }
  ],
  "steps": [
    {
      "title": "先确认等待集中时段"
    },
    {
      "title": "再验证排班调整效果"
    },
    {
      "title": "验证完成再谈扩店"
    }
  ]
}
```
