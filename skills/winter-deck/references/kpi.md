# kpi · 关键指标

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

适合一个可累加的非负总量，依次说明体量、参照差异和等额平摊，如营收、产量、处理单量。
多个独立指标用 `figures`；实际分组不相等时用 `compare-bars`，不要把平均值当作实测分布。

## 每一步画面

1. 大数字计数，小方块落下堆出体量：标题判断当前规模。
2. 参照方块堆出现，当前值高于参照时超出部分亮起：标题判断比较差异。
3. 当前方块重排为若干小堆：标题判断平均每份数量。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| component | 是 | 固定为本页型 id。 |
| preset | 整稿必填 | 使用整稿预设；单页独立使用时也须填写，见[风格](presets.md)。 |
| eyebrow / unit | 否 | 字符串；前者交代范围，后者只显示单位、不换算数值。 |
| steps | 是 | 恰好 3 个对象；每步 title 为非空字符串。 |
| steps[].body / result | 否 | 字符串，分别为补充说明与强调结果。 |
| steps[].chips / legend | 否 | 前者为字符串数组；后者须为布尔值，但本页不生成图例。 |
| accent / en | 否 | 强调色仅 ok、bad、neutral；英文小标签须为字符串，通用标题标记见[整稿](deck.md)。 |
| value | 是 | 非负有限数字，不接受数字字符串。 |
| label | 否 | 字符串，当前指标名称。 |
| compare | 否，建议 | 对象；value 为非负有限数字，label 为非空字符串；省略后第二步缺少参照。 |
| per | 否，建议 | 对象；count 为 2～12 的整数，label 为非空字符串；省略后第三步缺少分组。 |
| per.ticks | 否 | 字符串数组，长度必须等于 per.count，为各堆标签。 |
| cubeUnit | 否 | 有限正数，表示每块对应数量；省略自动取值，当前量及参照各最多显示 1300 块。 |
| decimals | 否 | 0～2 的整数，控制数值精度。 |

## 可用变量

仅步骤中的 `title`、`body`、`chips[]`、`result` 支持下表变量；百分比需自行补 `%`。

| 变量 | 含义 |
|---|---|
| {unit} / {value} / {cubeUnit} | 共同单位、当前值、每块对应数量。 |
| {compare.label} / {compare.value} | 参照名称与数值。 |
| {ratio} | 当前值与参照的倍数；参照为 0 或当前值较小时缺值。 |
| {dir} / {diff} | 随比较变化的“多 / 少 / 持平”、差额绝对值。 |
| {diffPct} / {diffPctAbs} | 相对参照的变化百分比、其绝对值；参照为 0 时缺值。 |
| {per.label} / {per.count} / {per.value} | 平摊单位名、份数、取整后的每份平均值。 |
| {okName} / {badName} | 当前风格的正向色与风险色名称。 |

## 写法要点

- 步骤中的数字必须用变量；缺值会使对应标题行、句子或标签被省略，不引用未填写的数据。
- 标题建议最多 2 行，每行 ≤13 字；用 JSON `\n` 换行，补充说明宜 ≤32 字。
- 当前值较低时用 dir、diff 或 diffPctAbs，不用 ratio；同口径、同单位才有比较意义。
- per 表示等额平均，并不展示各组真实分布；per.value 先取整，不宜用于要求精确小数的均值。
- cubeUnit 过小会使方块截顶，不能用方块数代替读数；零总量宜显式填写正 cubeUnit。
- 成本等越低越好的指标需自行写清业务判断，本页没有 better 字段；legend 不会生成图例。

## 示例

示例数据，仅演示填写方式。

```json
{
  "component": "kpi",
  "eyebrow": "共享服务中心年度处理量 · 示例数据",
  "label": "本年工单",
  "unit": "单",
  "value": 12000,
  "compare": {
    "label": "上年",
    "value": 10000
  },
  "per": {
    "label": "每月",
    "count": 12
  },
  "steps": [
    {
      "title": "全年处理\n{value}{unit}"
    },
    {
      "title": "比{compare.label}{dir}\n{diff}{unit}"
    },
    {
      "title": "平摊至{per.count}个月\n每月{per.value}{unit}"
    }
  ]
}
```
