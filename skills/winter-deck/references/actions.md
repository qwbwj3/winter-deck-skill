# actions · 行动与决策

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于结尾交代具体行动、负责人和期限。
需要观众拍板时加一条决策请求；展示过程顺序用 flow。

## 每一步画面

1. 前 N 步：逐行突出行动，未讲行淡出；标题说明当前该做什么。
2. 填写 ask 时增加最后一步：底部请求出现；标题明确需要决定什么。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 actions。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 1～5 个行动对象。 |
| `items[].action` | 是 | 非空字符串，建议 ≤16 字。 |
| `items[].detail / owner / due` | 否 | 字符串，依次建议 ≤24 / 8 / 10 字。 |
| `ask` | 否 | 字符串，建议 ≤30 字；非空时增加一步。 |
| `actionLabel / ownerLabel / dueLabel / askLabel` | 否 | 字符串，替换做什么、负责、时间、请决定的栏名。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 负责人或期限全部未填时，对应整列隐藏；只填部分时其余项显示空白或破折号。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "actions",
  "eyebrow": "示例数据 · 门店排班",
  "title": "先试排班再决定扩店",
  "items": [
    {
      "action": "完成高峰排班试行",
      "owner": "店长",
      "due": "下周五"
    },
    {
      "action": "复核等待与工时",
      "owner": "运营主管",
      "due": "两周后"
    }
  ],
  "ask": "是否批准两周试行",
  "steps": [
    {
      "title": "店长先跑两周试行"
    },
    {
      "title": "运营复核等待与工时"
    },
    {
      "title": "请批准两周试行"
    }
  ]
}
```
