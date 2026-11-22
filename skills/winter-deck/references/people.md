# people · 人物与团队

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于介绍 2～6 位成员、客户或合作方，交代各自角色。
以原话为主用 testimonial；需要明确负责人和期限用 actions。

## 每一步画面

1. 2～4 人：每步突出一位，后续人物淡出；标题说清此人的角色或职责。
2. 5～6 人：全体一步展示；标题概括团队分工，不会逐人讲解。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 people。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 2～6 个人物对象。 |
| `items[].name` | 是 | 非空字符串，建议 ≤8 字。 |
| `items[].role / text` | 否 | 字符串，分别建议 ≤10 / 24 字。 |
| `items[].image` | 否 | 项目内可读图片相对路径，或仅含 dark、light 两个有效路径的对象；省略显示姓名首字。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 头像不支持图位、网址、data URL 或绝对路径；双版本必须都可读取。
- 双版本头像优先取 dark，不会随深浅模式切换；需要稳定显示时用单一路径。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "people",
  "eyebrow": "示例数据 · 门店排班",
  "title": "排班试行由两人协作",
  "items": [
    {
      "name": "林店长",
      "role": "现场执行",
      "text": "安排人手并记录等待"
    },
    {
      "name": "周主管",
      "role": "效果复核",
      "text": "对照客流与工时变化"
    }
  ],
  "steps": [
    {
      "title": "店长负责现场执行"
    },
    {
      "title": "主管负责效果复核"
    }
  ]
}
```
