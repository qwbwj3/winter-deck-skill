# timeline · 时间线

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于展示 2～8 个事件随时间发生的变化。
多条工作线并行排期用 roadmap；操作步骤用 flow。

## 每一步画面

1. 共 N 步：横轴事件上下交错，当前节点突出，轴线推进至该点，后续事件淡出；标题指出该事件带来的变化。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 timeline。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 2～8 个事件对象，按讲解顺序填写。 |
| `items[].date` | 是 | 非空字符串，建议 ≤8 字，可写日期或阶段。 |
| `items[].title` | 是 | 非空字符串，建议 ≤10 字。 |
| `items[].desc / tag` | 否 | 字符串，分别建议 ≤26 / 6 字。 |
| `items[].tone` | 否 | ok、bad 或空字符串，控制事件标签的颜色。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 不会按日期排序，事件均匀排列，不表示真实时间间距。
- 不支持 items[].label、items[].t、items[].key、focus、focusTone；改用 date/title/desc/tag。
- 没有最后总览步，steps 数量应与事件数一致。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "timeline",
  "eyebrow": "示例数据 · 门店排班",
  "title": "排班试行先保留基线",
  "items": [
    {
      "date": "第1周",
      "title": "统一记录",
      "desc": "记录原有排班的等待"
    },
    {
      "date": "第2周",
      "title": "开始试行",
      "desc": "增加午间机动人员"
    },
    {
      "date": "第4周",
      "title": "集中复盘",
      "desc": "核对客流变化后再评价"
    }
  ],
  "steps": [
    {
      "title": "先保留原排班基线"
    },
    {
      "title": "调整午间机动人手"
    },
    {
      "title": "同口径复核试行结果"
    }
  ]
}
```
