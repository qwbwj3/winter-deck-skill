# venn · 韦恩图与交集

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合 2～3 个条件或集合有真实重叠，逐项说明后落到共同条件。
圆面积不表示人数或份额；需要精确构成时改用 `share`。

## 每一步画面
1. 前 N 步逐个强调左侧集合圆与右侧对应说明，后续集合变淡；标题说明该条件。
2. 第 N+1 步强调中央交集和右侧结论卡，集合说明恢复正常显示；标题说明共同成立的结论。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `venn`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `sets` | 是 | 2～3 个集合对象。 |
| `sets[].label` | 是 | 非空字符串，建议 ≤6 字。 |
| `sets[].text` | 否 | 字符串，建议 ≤20 字。 |
| `overlaps` | 否 | 对象，两集合仅允许键 01，三集合允许 01、02、12，值为字符串且建议 ≤8 字。 |
| `center` | 否 | 交集结论对象。 |
| `center.short` / `.title` / `.text` | 否 | 字符串，分别建议 ≤4、14、24 字，short 默认“交集”。 |
| `centerLabel` | 否 | 字符串，建议 ≤6 字，右侧结论卡标签，默认“交集”。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 共 N+1 步；交集键的数字是 sets 的下标，必须作为字符串键填写。
- 两两交集文字持续显示，不单独计步；集合与交集文字都需手填，不自动推导。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "venn",
  "eyebrow": "门店候选条件 · 示例数据",
  "title": "同时满足客流与租金",
  "sets": [
    {
      "label": "客流达标",
      "text": "午间目标客群超过门槛"
    },
    {
      "label": "租金可承受",
      "text": "租售比在预算范围内"
    }
  ],
  "overlaps": {
    "01": "两项同时满足"
  },
  "center": {
    "short": "候选",
    "title": "进入实地复核",
    "text": "仍需核查客流稳定性与租约"
  },
  "steps": [
    {
      "title": "先筛目标客流"
    },
    {
      "title": "再核对租金承受力"
    },
    {
      "title": "交集进入实地复核"
    }
  ]
}
```
