# figures · 关键数字

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于并列展示 1～4 个关键数字，允许各指标采用不同单位。
需要比较一组同口径数值用 compare-bars；单项与基准对比用 kpi。

## 每一步画面

1. 前 N 步：逐栏突出数字与顶部色条，后续栏淡出；标题解释当前数字说明什么。
2. 多项且 overview 未关闭：最后恢复全部数字正常显示；标题给出综合判断。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 figures。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 1～4 个数字对象。 |
| `items[].value` | 是 | 非空字符串或有限数字，建议显示 ≤6 字符。 |
| `items[].unit / label / note` | 否 | 字符串，依次建议 ≤4 / 8 / 22 字；单位与数值分开填。 |
| `items[].delta / deltaLabel` | 否 | 字符串；delta 建议 ≤10 字，deltaLabel 说明比较基准。 |
| `better / items[].better` | 否 | up、down 或空字符串；项级优先，down 表示越低越好。 |
| `items[].tone` | 否 | ok、bad 或空字符串；非空时覆盖变化好坏色。 |
| `items[].fill` | 否 | 0～1 的有限数字；当前画面不显示此字段，通常省略。 |
| `overview` | 否 | 布尔值；多项默认增加最后总览，false 关闭。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 变化值不会自动计算；delta 须与 value 和比较基准对应。
- 箭头只读 delta 开头的正负号；成本、不良率等用 down，不能把下降直接判为坏。
- 总览会取消当前栏的强调，并非所有分栏同时高亮。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "figures",
  "eyebrow": "示例数据 · 门店排班",
  "title": "等待下降工时未增加",
  "items": [
    {
      "value": "3",
      "unit": "分钟",
      "label": "高峰等待",
      "delta": "-3分钟",
      "deltaLabel": "较试行前",
      "better": "down"
    },
    {
      "value": "38",
      "unit": "小时",
      "label": "日均工时",
      "delta": "-2小时",
      "better": "down"
    }
  ],
  "steps": [
    {
      "title": "高峰等待减半"
    },
    {
      "title": "日均工时同步下降"
    },
    {
      "title": "试行值得继续观察"
    }
  ]
}
```
