# treemap · 矩形树图

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合同一总量下 2～8 个互斥分项，用面积看主力与长尾。
有上下级拆分时改用 `tree`；需要圆环式构成分析时用 `share`。

## 每一步画面
1. 第 1 步显示全部面积构成与占比；标题说明主要构成。
2. 随后按 highlight 顺序每步强调一个分项，其他块变淡；标题说明当前分项的业务意义。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `treemap`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `items` | 是 | 2～8 个分项对象。 |
| `items[].value` | 是 | 非负有限数字，至少一项大于 0，合计也须有限。 |
| `items[].label` / `.text` / `.unit` | 否 | 字符串，分别建议 ≤8、12、3 字；分项须同单位。 |
| `items[].tone` | 否 | 仅 `ok`、`bad` 或空字符串。 |
| `highlight` | 否 | 有效原始 items 整数下标数组，从 0 开始，默认空数组。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 共 1＋highlight 长度步；面积按数值降序排布，下标仍对应原数组。
- 零值不生成矩形；不要聚焦零值，重复下标也会重复计步。
- 小块可能隐藏说明；原值仅在填写 unit 或 text 时出现，重要解释不能只放在小块内。
- 占比自动按合计计算，占比不足 3% 的项目过多时合并为其他。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "treemap",
  "eyebrow": "季度收入构成 · 示例数据",
  "title": "企业订阅贡献六成收入",
  "items": [
    {
      "label": "企业订阅",
      "value": 60,
      "unit": "万元"
    },
    {
      "label": "实施服务",
      "value": 25,
      "unit": "万元"
    },
    {
      "label": "培训服务",
      "value": 15,
      "unit": "万元"
    }
  ],
  "highlight": [
    0
  ],
  "steps": [
    {
      "title": "先看季度收入构成"
    },
    {
      "title": "企业订阅贡献六成"
    }
  ]
}
```
