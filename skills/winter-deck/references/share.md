# share · 构成占比

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

适合 2～8 个互不重叠、可相加分项，说明总量、结构与重点来源。
不同单位或互相重叠的数据不能拼成构成；独立指标比较用 `compare-bars`，时间变化用 `trend`。

## 每一步画面

1. 一整块实体出现并扫光：标题判断总量。
2. 实体按占比切开、标名称与百分比：标题判断结构是否集中。
3. 焦点段抬起前推，其余下沉变暗：标题判断该项的业务意义。

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
| items | 是 | 2～8 个对象；name 为非空字符串，value 为非负有限数字；至少一项 >0，合计须有限。 |
| focus | 否 | 从 0 起的合法整数下标或已有 name；省略选最大项，并列取最先，不写 auto。 |
| focusTone | 否 | ok 或 bad，默认 ok；成本、损失等风险项可用 bad。 |
| decimals | 否 | 0～2 的整数；控制数值而非百分比精度。 |
| totalLabel | 否 | 字符串，默认“合计”。 |

## 可用变量

仅步骤中的 `title`、`body`、`chips[]`、`result` 支持下表变量；百分比需自行补 `%`。

| 变量 | 含义 |
|---|---|
| {n} / {unit} / {total} | 分项数、共同单位、全部分项合计。 |
| {top.name} / {top.value} / {top.share} | 最大项名称、数值、显示占比。 |
| {second.name} / {second.value} / {second.share} | 第二大项名称、数值、显示占比。 |
| {smallest.name} / {smallest.value} / {smallest.share} | 最小项名称、数值、显示占比。 |
| {focus.name} / {focus.value} / {focus.share} / {focus.rank} | 焦点项名称、数值、占比、从 1 起排名。 |
| {topTwoShare} | 最大两项显示占比之和。 |
| {okName} / {badName} | 当前风格的正向色与风险色名称。 |

## 写法要点

- 步骤中的数字必须用变量；缺值会使对应标题行、句子或标签被省略，不引用未填写的数据。
- 标题建议最多 2 行，每行 ≤13 字；用 JSON `\n` 换行，补充说明宜 ≤32 字。
- 传入原始金额或数量，不必先算百分比；如直接填百分数须确认其合计与业务口径。
- 显示占比按整数分配，总计 100%；极小正项可能显示 <1，占比变量不含 %。
- 小于 3% 的项宜合并为“其他”；不要把图形长度或颜色当作精确数字。
- 分项名用变量；手动选焦点后勿声称其为最大项，风险判断须由业务内容支撑。

## 示例

示例数据，仅演示填写方式。

```json
{
  "component": "share",
  "eyebrow": "季度营收来源 · 示例数据",
  "unit": "万元",
  "items": [
    {
      "name": "订阅",
      "value": 600
    },
    {
      "name": "服务",
      "value": 300
    },
    {
      "name": "培训",
      "value": 100
    }
  ],
  "steps": [
    {
      "title": "季度合计\n{total}{unit}"
    },
    {
      "title": "主要来源集中\n前两项占{topTwoShare}%"
    },
    {
      "title": "{focus.name}是主力\n占比{focus.share}%",
      "body": "{focus.name}贡献{focus.value}{unit}。"
    }
  ]
}
```
