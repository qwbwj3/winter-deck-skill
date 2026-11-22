# roadmap · 多线排期

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于把 1～5 条并行工作线放到 2～12 个等宽时间段中。
单线事件进展用 timeline；操作顺序用 flow。

## 每一步画面

1. 前 N 步：逐道突出任务条，其余泳道淡出；标题说明该工作线的交付节点。
2. 最后一步：恢复全部泳道；标题说明并行安排或关键依赖。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 roadmap。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `periods` | 是 | 2～12 个非空时间段字符串，每个建议 ≤6 字。 |
| `lanes` | 是 | 1～5 个泳道对象。 |
| `lanes[].name` | 是 | 非空字符串，建议 ≤8 字。 |
| `lanes[].items` | 否 | 每道 0～6 个任务对象，省略表示空泳道。 |
| `lanes[].items[].label` | 是 | 非空字符串，建议 ≤10 字。 |
| `lanes[].items[].start / end` | 是 | 0～periods.length 的有限数字，end 必须大于 start。 |
| `lanes[].items[].tone` | 否 | ok、bad 或空字符串，控制未聚焦任务条的语义色。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- start/end 用时间段边界计量，0 是首段左边界；建议用整数，相差不足一段也会显示成一段。
- 同一泳道的任务条重叠会遮挡；需错开或拆成不同泳道。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "roadmap",
  "eyebrow": "示例数据 · 门店排班",
  "title": "记录与试行同步推进",
  "periods": [
    "第1周",
    "第2周",
    "第3周",
    "第4周"
  ],
  "lanes": [
    {
      "name": "数据记录",
      "items": [
        {
          "label": "统一口径",
          "start": 0,
          "end": 1
        },
        {
          "label": "持续记录",
          "start": 1,
          "end": 4
        }
      ]
    },
    {
      "name": "排班试行",
      "items": [
        {
          "label": "执行与复盘",
          "start": 1,
          "end": 4
        }
      ]
    }
  ],
  "steps": [
    {
      "title": "先把记录口径统一"
    },
    {
      "title": "第二周开始排班试行"
    },
    {
      "title": "第四周汇总复盘"
    }
  ]
}
```
