# trend · 时间趋势

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

适合单指标按等间隔时间变化，解释变化节点并区分实际与预测。
无预测需 4～16 个实际点，有预测可从 3 个实际点起；多组独立比较改用 `compare-bars`。

## 每一步画面

1. 折线沿时间绘出，镜头跟随线头后拉开：标题判断首末变化。
2. 变化节点立起光柱，前后折线分色：标题判断节点前后的变化节奏。
3. 预测段半透明延伸、目标平面升起并指认持续达标点：标题区分预计达标、已经达标或期内未达标。

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
| points / forecast | 是 / 否 | points 为 4～16 个对象；forecast 为 0～6 个对象且非空时 points 可为 3～16 个。 |
| points[].label / value；forecast[].label / value | 是 | label 为非空时间字符串，value 为有限数字，可为负数。 |
| target | 否 | 对象；value 为有限数字，label 为可选字符串。 |
| better | 否 | up、down 或空字符串，默认 up；down 按低于或等于目标判定达标。 |
| yFrom | 否 | 有限数字或 zero；数字须小于所有实际、预测及目标值的最小值，省略自动取范围。 |
| mark | 否 | 对象；index 如填写须为 1～实际点数减 2 的整数；text 如填写须为字符串并支持变量。 |
| decimals | 否 | 0～2 的整数，控制数值显示精度。 |

## 可用变量

仅步骤中的 `title`、`body`、`chips[]`、`result` 支持下表变量；`mark.text` 也支持，百分比需自行补 `%`。

| 变量 | 含义 |
|---|---|
| {n} / {unit} | 实际点数、共同单位。 |
| {first.label} / {first.value} / {last.label} / {last.value} | 实际首末点的时间、值。 |
| {peak.label} / {peak.value} / {low.label} / {low.value} | 实际峰值、谷值的时间与值。 |
| {change} / {changeAbs} | 首末差的带符号值、绝对值。 |
| {changePct} / {changePctAbs} | 首末变化百分比及其绝对值；首值为 0 时缺值。 |
| {dir} / {dirVerb} | 随首末数据变化的“增长 / 下降 / 持平”和“涨到 / 降到 / 保持在”。 |
| {mark.label} / {mark.text} / {mark.value} | 节点时间、自填说明、节点值。 |
| {mark.beforeAvg} / {mark.afterAvg} | 节点前后每个时间间隔的平均变化，含正负号。 |
| {mark.ratio} / {mark.shift} | 后段变化除以前段变化的正倍数、随数据改变的节奏判断；前段为零或前后反向时倍数缺值。 |
| {target} / {gap} | 目标值；实际末值离目标还差多少（down 时为超出目标的量），已达到为 0。 |
| {reach.label} / {reach.text} | 持续达标点的时间与完整结论；结论区分“预计…达标 / …起一直达标 / …起已达标”。 |
| {forecastEnd.label} / {forecastEnd.value} | 预测末点的时间与值；无预测时缺值。 |
| {okName} / {badName} | 当前风格的正向色与风险色名称。 |

## 写法要点

- 步骤中的数字必须用变量；缺值会使对应标题行、句子或标签被省略，不引用未填写的数据。
- 标题建议最多 2 行，每行 ≤13 字；用 JSON `\n` 换行，补充说明宜 ≤32 字。
- 时间点不自动排序，须按时间先后、等间隔填写；负数须填写低于所有值的 yFrom，避免被零基线截掉；负值数据的方向词可能不准，改用带符号变化值并核对方向。
- 成本、不良率等越低越好的指标填 down；增长或下降只描述数值，不自动等同业务改善。
- 时间、方向、数值用变量；预测必须由材料提供或明确标示假设，不会自动外推。
- 达标要求该点后不再跌出目标；没有达标点时，有预测写“预测期内达不到目标”，无预测写“目前还未达标”；没填目标时不要引用 {reach.text}。

## 示例

示例数据，仅演示填写方式。

```json
{
  "component": "trend",
  "eyebrow": "工单平均响应时长 · 示例数据",
  "unit": "小时",
  "better": "down",
  "points": [
    {
      "label": "一月",
      "value": 12
    },
    {
      "label": "二月",
      "value": 11
    },
    {
      "label": "三月",
      "value": 8
    },
    {
      "label": "四月",
      "value": 7
    }
  ],
  "forecast": [
    {
      "label": "五月",
      "value": 5
    }
  ],
  "target": {
    "value": 6,
    "label": "服务目标"
  },
  "mark": {
    "index": 1,
    "text": "启动分流"
  },
  "steps": [
    {
      "title": "响应时长{dir}\n末期{last.value}{unit}"
    },
    {
      "title": "{mark.label}后\n{mark.shift}",
      "chips": [
        "前段 {mark.beforeAvg}{unit}",
        "后段 {mark.afterAvg}{unit}"
      ]
    },
    {
      "title": "{reach.text}",
      "body": "预测为分流效果持续的假设。"
    }
  ]
}
```
