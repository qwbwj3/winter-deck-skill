# features · 特性网格

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于同时展示 4～9 项功能、服务或能力，再挑重点展开。
少于四项可用 points；需要有先后关系时用 flow。

## 每一步画面

1. 第 1 步：显示全部网格；标题给出整体判断。
2. 后续每步：依 highlight 顺序突出一格，其余淡出；标题说明该项的用途或差异。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 features。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 4～9 个特性对象。 |
| `items[].title` | 是 | 非空字符串，建议 ≤10 字。 |
| `items[].text` | 否 | 字符串，建议 ≤22 字。 |
| `items[].icon` | 否 | 字符串，建议 ≤2 字；省略时显示序号。 |
| `highlight` | 否 | 整数下标数组，均须在 items 范围内；从 0 开始。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 总步数为 1 加 highlight 项数；未填时只有总览，不会自动逐格讲解。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "features",
  "eyebrow": "示例数据 · 门店排班",
  "title": "巡店资料放到同一处",
  "items": [
    {
      "title": "门店档案",
      "text": "集中存放经营资料"
    },
    {
      "title": "现场记录",
      "text": "随时补充问题照片"
    },
    {
      "title": "任务跟进",
      "text": "核对负责人和期限"
    },
    {
      "title": "复盘对照",
      "text": "回看改进前后的记录"
    }
  ],
  "highlight": [
    2
  ],
  "steps": [
    {
      "title": "巡店资料统一归档"
    },
    {
      "title": "任务必须有人跟进"
    }
  ]
}
```
