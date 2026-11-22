# funnel · 转化漏斗

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

适合 3～6 个逐层筛选、同批次同单位的环节，如线索到签约、浏览到付款。
各环节应是前一层的子集；独立指标改用 `compare-bars`，非筛选流程改用 `flow`。

## 每一步画面

1. 光丝穿过逐层变细的环：标题判断入口、出口或整体转化。
2. 流失光丝落成颗粒丘，旁边显示留下比例：标题判断总流失或损失集中处。
3. 焦点转换及相邻环被高亮，镜头推近：标题判断优先检查的转换。

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
| stages | 是 | 3～6 个对象；name 为非空字符串，value 为非负有限数字，首层 >0，后层不得大于前层。 |
| focusBy | 否 | rate 或 lost，默认 rate；分别选最低相邻转化率或最大相邻流失量，并列取最先。 |
| focus | 否 | 1～环节数减 1 的整数，是转入环节的下标；填写后覆盖自动选择，不接受 auto。 |
| keepLabel / lostLabel / keepRateLabel | 否 | 字符串；分别命名末层留下量、全程流失量、相邻留下比例，默认“留下 / 流失 / 留下”。 |

## 可用变量

仅步骤中的 `title`、`body`、`chips[]`、`result` 支持下表变量；百分比需自行补 `%`。

| 变量 | 含义 |
|---|---|
| {n} / {unit} | 环节数、共同单位。 |
| {first.name} / {first.value} / {last.name} / {last.value} | 首末环节名称与取整后的数量。 |
| {overall} / {totalLost} | 末层占首层的百分比、首层减末层的流失数量。 |
| {focus.from} / {focus.to} | 焦点转换的起止环节名。 |
| {focus.rate} / {focus.lost} / {focus.lostShare} | 焦点相邻转化率、流失量、占全程流失的百分比；无流失时末项缺值。 |
| {okName} / {badName} | 当前风格的正向色与流失色名称。 |

## 写法要点

- 步骤中的数字必须用变量；缺值会使对应标题行、句子或标签被省略，不引用未填写的数据。
- 标题建议最多 2 行，每行 ≤13 字；用 JSON `\n` 换行，补充说明宜 ≤32 字。
- 数量会取整显示，适合人数、条数；不要依赖小数精度表达金额差异。
- rate 最低与 lost 最大可能是不同环节；手动 focus 后勿未经核对声称“最低”或“最多”。
- 环节名用 first、last、focus 的名称变量，避免改数据后文字与标签不同步。
- keepRateLabel 命名的是留下比例，不能填“流失率”；steps[].legend 为 true 时显示末层量及全程流失量。

## 示例

示例数据，仅演示填写方式。

```json
{
  "component": "funnel",
  "eyebrow": "企业软件试用转化 · 示例数据",
  "unit": "家",
  "focusBy": "lost",
  "stages": [
    {
      "name": "留资",
      "value": 1200
    },
    {
      "name": "试用",
      "value": 480
    },
    {
      "name": "付费",
      "value": 120
    }
  ],
  "steps": [
    {
      "title": "{first.name}{first.value}{unit}\n{last.name}{last.value}{unit}"
    },
    {
      "title": "全程流失\n{totalLost}{unit}",
      "legend": true
    },
    {
      "title": "先检查{focus.to}\n此处流失{focus.lost}{unit}",
      "chips": [
        "留下比例 {focus.rate}%"
      ]
    }
  ]
}
```
