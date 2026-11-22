# risks · 风险与应对

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于列出 1～5 条风险，区分影响程度并给出应对。
只需交代执行事项用 actions；需要比较方案权衡用 versus。

## 每一步画面

1. 共 N 步：先按影响高、中、低排列，再逐条突出；标题指出当前风险及应对重点。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 risks。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 1～5 个风险对象。 |
| `items[].risk` | 是 | 非空字符串，建议 ≤16 字。 |
| `items[].impact` | 是 | high、mid 或 low，分别表示高、中、低影响。 |
| `items[].likelihood / action` | 否 | 字符串，分别建议 ≤8 / 30 字。 |
| `actionLabel` | 否 | 字符串，替换默认应对栏名。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 实际展示会按 impact 排序；steps 须按排序后的风险写，相同影响保留原顺序。
- likelihood 可写高、中、低及补充文字；全部不填时隐藏可能性整列。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "risks",
  "eyebrow": "示例数据 · 门店排班",
  "title": "先控制试行对服务的影响",
  "items": [
    {
      "risk": "高峰缺人",
      "impact": "high",
      "likelihood": "中",
      "action": "保留一名机动人员"
    },
    {
      "risk": "记录口径不一",
      "impact": "mid",
      "likelihood": "中",
      "action": "统一等待时间的记录方法"
    }
  ],
  "steps": [
    {
      "title": "机动人员兜住高峰"
    },
    {
      "title": "统一记录再比较效果"
    }
  ]
}
```
