# compare-bars · 横向比较

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

适合 2～12 个同单位、同口径的非负指标，比较达标情况并解释焦点项差距。
时间变化用 `trend`，构成比例用 `share`；有负值时改用 `trend` 或 `table`。

## 每一步画面

1. 全部柱子依次升起：标题给出整体比较判断。
2. 目标平面升起、柱子按达标状态分色：标题判断达标数量或焦点差距；无目标时不分色。
3. 其余柱子退场，焦点项缺口最多拆成 5 块：标题判断主要原因；越低越好时不显示拆分。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| component | 是 | 固定为本页型 id。 |
| preset | 整稿必填 | 使用整稿预设；单页独立使用时也须填写，见[风格](presets.md)。 |
| eyebrow / unit | 否 | 字符串；前者交代范围，后者只显示单位、不换算数值。 |
| steps | 是 | 恰好 3 个对象；每步 title 为非空字符串。 |
| steps[].body / result | 否 | 字符串，分别为补充说明与强调结果。 |
| steps[].chips / legend | 否 | 前者为字符串数组；后者为布尔值。 |
| accent / en | 否 | 强调色仅 ok、bad、neutral；英文小标签须为字符串，通用标题标记见[整稿](deck.md)。 |
| items | 是 | 2～12 个对象，按数组顺序排列；每项 value 为 0～max 的有限数字。 |
| items[].name / code | 否 | 字符串，建议填写短名称；9～12 项时名称宜 ≤4 字。 |
| max / decimals | 否 | max 为有限正数，默认 100；decimals 为 0～2 的整数。 |
| target | 否 | 对象；value 为 0～max 的有限数字，label 为可选字符串。 |
| better | 否 | up、down 或空字符串，默认 up；down 表示越低越好，≤目标算达标；up 按≥目标达标。 |
| focus | 否 | auto 或从 0 起的合法下标；自动选最差项，down 取最大值。 |
| breakdownBase | 否 | max 或 target；显式设置优先。带 compose 的新构图预设有 target 时默认 target，否则默认 max；旧 14 套预设仍默认 max。选 target 时必须填 target。 |
| items[].breakdown | 否 | 焦点项提供时为 1～5 个对象；value 为有限正数，name 为可选字符串。 |
| diffUnit / maxLabel / passLabel / failLabel / gapLabel | 否 | 字符串；分别为拆分单位、参考柱名、达标名、未达标名、无拆分时的缺口名。 |

## 可用变量

仅步骤中的 `title`、`body`、`chips[]`、`result` 支持下表变量；百分比需自行补 `%`。

| 变量 | 含义 |
|---|---|
| {n} / {pass} / {fail} | 项目数、达标数、未达标数；无目标时全部计达标。 |
| {unit} / {target} / {max} / {maxLabel} | 共同单位、目标值、绘图上限、上限参考名。 |
| {gap} | 焦点值与目标的绝对差；无目标为 0。 |
| {focus.code} / {focus.name} / {focus.value} | 当前焦点项的编号、名称、数值。 |
| {top.name} / {top.value} / {top.share} / {top.index} | 最大拆分项的名称、原值、整数占比、从 0 起下标；无有效拆分时缺值。 |
| {okName} / {badName} | 当前风格的达标色与未达标色名称。 |

## 写法要点

- 步骤中的数字必须用变量；缺值会使对应标题行、句子或标签被省略，不引用未填写的数据。
- 标题建议最多 2 行，每行 ≤13 字；用 JSON `\n` 换行，补充说明宜 ≤32 字。
- 越低越好的指标填 better: "down"；缺口为绝对差，不能只据它判断“还差”或“超标”。
- max 决定柱高范围，不自动取样本最大值。未写 breakdownBase 时，带 compose 的新构图预设（keynote/journal/pinboard/isoplan）有 target 就按 target，无 target 就按 max；旧 14 套预设仍按 max，旧稿不变。同一文件按 T 切换时按当前预设重算，不锁定初始预设。
  例如 52.0 对目标 79.7、max 100：新构图默认目标缺口为 27.7，旧预设默认距上限为 48.0。显式 `"breakdownBase": "max"` 覆盖新默认，校验会解释它是距 max 的差额。新构图最终按 max 计算时，单块标签用 maxLabel 或“距满分”，不用“缺口”（旧预设标签保持原样）。
  validate 在 presets 非空且全部为新构图预设时使用新默认；混合新旧预设或未限制 presets（构建器会装入全部预设）保留 max 校验基准。混合预设需一致口径时应显式指定 breakdownBase。
- 拆分合计应等于基准值减焦点值；画面按比例缩放但标签仍显示原值，已达基准不应再拆缺口。
- 自定义字段只能从当前焦点项读取，写成 focus. 后接实际字段路径；键名用字母、数字、下划线，不写计算表达式。

## 示例

示例数据，仅演示填写方式。

```json
{
  "component": "compare-bars",
  "eyebrow": "月度直营店销售 · 示例数据",
  "unit": "万元",
  "diffUnit": "万元",
  "max": 100,
  "target": {
    "value": 80,
    "label": "月目标"
  },
  "breakdownBase": "target",
  "items": [
    {
      "name": "东店",
      "value": 92
    },
    {
      "name": "南店",
      "value": 86
    },
    {
      "name": "西店",
      "value": 58,
      "breakdown": [
        {
          "name": "客流不足",
          "value": 11
        },
        {
          "name": "转化不足",
          "value": 7
        },
        {
          "name": "客单偏低",
          "value": 4
        }
      ]
    },
    {
      "name": "北店",
      "value": 75
    }
  ],
  "steps": [
    {
      "title": "{n}家门店\n{pass}家达标"
    },
    {
      "title": "{focus.name}距目标\n还差{gap}{unit}",
      "legend": true
    },
    {
      "title": "{focus.name}的缺口\n{top.share}%来自{top.name}",
      "result": "先补{top.name}"
    }
  ]
}
```
