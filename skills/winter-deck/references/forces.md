# forces · 波特五力

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合围绕同一市场分析五类竞争压力，说明它们如何影响经营空间。
只比较两个方案时改用 `versus`，单纯列风险时改用 `risks`。

## 每一步画面
1. 默认前 4 步依次强调进入者、供应商、买方、替代品卡片及其箭头；标题说明当前压力。
2. 默认第 5 步强调中央同行竞争卡；标题总结行业内竞争判断。
3. 填写 order 后改为逐项按其顺序强调，步数至少 1 步；标题应对应当步力量。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `forces`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `forces` | 是 | 对象，仅允许 entrants、suppliers、rivalry、buyers、substitutes 五个键。 |
| `forces[键]` | 否 | 对象，分别表示进入者、供方、同行、买方、替代品；缺项位置仍保留。 |
| `forces[键].title` / `.text` | 否 | 字符串，判断建议 ≤12 字、依据建议 ≤20 字。 |
| `forces[键].level` | 否 | 仅 `high`、`mid`、`low` 或空字符串，依次显示强、中、弱或不显示。 |
| `order` | 否 | 五力键名数组，默认 entrants、suppliers、buyers、substitutes、rivalry。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 建议 order 包含五键各一次；重复键只在首次出现时点亮，空数组没有点亮项。
- 强度由你判断，不会根据描述自动计算；五项证据须属于同一市场与时期。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "forces",
  "eyebrow": "园区咖啡店 · 示例数据",
  "title": "买方比价增加压力",
  "forces": {
    "entrants": {
      "title": "连锁品牌进入",
      "text": "园区新增两家门店",
      "level": "high"
    },
    "suppliers": {
      "title": "原料可替换",
      "text": "已备选三家供货商",
      "level": "low"
    },
    "rivalry": {
      "title": "同价位门店密集",
      "text": "午高峰争夺相同客群",
      "level": "high"
    },
    "buyers": {
      "title": "平台比价方便",
      "text": "顾客可随时切换门店",
      "level": "high"
    },
    "substitutes": {
      "title": "便利店提供现磨",
      "text": "覆盖赶时间的早餐客",
      "level": "mid"
    }
  }
}
```
