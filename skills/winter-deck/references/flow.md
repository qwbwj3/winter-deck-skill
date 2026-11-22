# flow · 流程

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于展示 2～6 步有先后关系的工作流程。
按日期讲事件用 timeline；并行工作排期用 roadmap。

## 每一步画面

1. 共 N 步：当前栏突出，进度线向前延伸，已讲步骤打勾，后续栏淡出；标题说明这一环的产出或判断。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 flow。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 2～6 个步骤对象。 |
| `items[].title` | 是 | 非空字符串，建议 ≤8 字。 |
| `items[].desc` | 否 | 字符串，建议 ≤26 字。 |
| `items[].owner` | 否 | 字符串，建议 ≤8 字。 |
| `items[].tags` | 否 | 字符串数组，最多 2 个标签。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 数组顺序就是讲解顺序；不会根据标题或负责人重新排序。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "flow",
  "eyebrow": "示例数据 · 门店排班",
  "title": "先核对问题再安排改进",
  "items": [
    {
      "title": "现场记录",
      "owner": "巡店员",
      "desc": "记录等待发生的时段"
    },
    {
      "title": "核对原因",
      "owner": "店长",
      "desc": "对照客流与排班记录"
    },
    {
      "title": "安排试行",
      "owner": "运营主管",
      "desc": "明确负责人和复盘日期"
    }
  ],
  "steps": [
    {
      "title": "记录具体等待时段"
    },
    {
      "title": "用排班记录核对原因"
    },
    {
      "title": "让改进有人负责"
    }
  ]
}
```
