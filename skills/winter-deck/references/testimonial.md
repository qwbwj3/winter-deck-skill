# testimonial · 人物原话与评价

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于呈现 1～3 位受访者的原话，并显示说话人身份。
以团队分工为主用 people；只保留一句原则用 quote。

## 每一步画面

1. 共 N 步：左侧切换为当前原话，右侧对应人物突出；标题说明这段话暴露的问题或待验证判断。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 testimonial。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `items` | 是 | 1～3 个评价对象。 |
| `items[].quote` | 是 | 非空字符串，建议显示 ≤40 字；支持 **内容** 强调。 |
| `items[].name` | 是 | 非空字符串，建议 ≤8 字。 |
| `items[].role` | 否 | 字符串，建议 ≤14 字。 |
| `items[].image` | 否 | 项目内可读图片相对路径，或仅含 dark、light 两个有效路径的对象；省略显示姓名首字。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 原话须有真实来源；虚构演示必须明确标为示例数据，不得作为客户证言。
- 头像不支持图位、网址、data URL 或绝对路径；双版本都须可读取，但优先用 dark，不随模式切换。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "testimonial",
  "eyebrow": "示例数据 · 门店排班",
  "title": "顾客希望午间少等待",
  "items": [
    {
      "quote": "午饭时间短，**排队久了就走**。",
      "name": "林女士",
      "role": "虚构受访者"
    },
    {
      "quote": "想买套餐，但**不知道怎么选**。",
      "name": "周先生",
      "role": "虚构受访者"
    }
  ],
  "steps": [
    {
      "title": "等待可能流失顾客"
    },
    {
      "title": "套餐说明也需核对"
    }
  ]
}
```
