# radar · 雷达图

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合同一量纲、同一评分方向的 3～8 个维度，比较 1～2 组数据。
原始单位混杂时先转换为可解释的同尺度评分；单一指标比较用 `compare-bars`。

## 每一步画面
1. 第 1 步显示第一组多边形与数值；标题说明这组的主要特征。
2. 有第二组时第 2 步叠加多边形与第二列数值；标题说明两组差异。
3. 填写 focus 时最后增加 1 步，强调指定轴与对应行，第二组区域变淡；标题说明该维度的判断。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `radar`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `axes` | 是 | 3～8 个非空字符串，各建议 ≤6 字。 |
| `series` | 是 | 1～2 个数据组对象。 |
| `series[].name` | 否 | 字符串，建议 ≤6 字，两组时显示图例。 |
| `series[].values` | 是 | 有限数字数组，长度等于 axes，顺序逐项对应。 |
| `max` | 否 | 有限数字，省略或为 0 时取所有数据最大值且至少为 1。 |
| `focus` | 否 | 从 0 开始的有效 axes 整数下标。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- max 应大于 0 且覆盖数据；图形比例只画在 0～1 之间，表中仍显示原值。
- 不自动归一化、识别越低越好或挑选差距最大的维度；focus 需手填。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "radar",
  "eyebrow": "门店服务评分 · 示例数据",
  "title": "环境评分差距最大",
  "axes": [
    "服务",
    "环境",
    "速度",
    "清洁"
  ],
  "max": 100,
  "series": [
    {
      "name": "五角场",
      "values": [
        75,
        41,
        70,
        85
      ]
    },
    {
      "name": "门店均值",
      "values": [
        78,
        74,
        66,
        82
      ]
    }
  ],
  "focus": 1,
  "steps": [
    {
      "title": "先看五角场评分"
    },
    {
      "title": "对照各店平均表现"
    },
    {
      "title": "环境是优先改善项"
    }
  ]
}
```
