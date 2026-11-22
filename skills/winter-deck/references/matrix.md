# matrix · 四象限

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于四类判断，支持 SWOT、PEST、优先级、波士顿矩阵。
无分类维度用 points；两方案比较用 versus。

## 每一步画面

1. 突出 order 第 1 格，后续格淡出；标题说明该格的判断。
2. 突出 order 第 2 格，已讲格恢复；标题说明第二类的差异。
3. 突出 order 第 3 格；标题说明该类的依据或处理方向。
4. 突出 order 第 4 格；标题说明最后一类的判断，格子位置始终不变。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 matrix。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字；实际按单行显示。 |
| `body` | 否 | 字符串，补充判断依据。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `steps` | 否 | 对象数组，数量应与实际步数一致；每项可填字符串 title、body 覆盖文案；标题每行 ≤13 字。 |
| `cells` | 是 | 恰好 4 个对象：0 左上、1 右上、2 左下、3 右下。 |
| `cells[].title` | 是 | 非空字符串，建议 ≤10 字。 |
| `cells[].text / label` | 否 | 字符串，text 建议 ≤28 字，label 为顶部分类名。 |
| `cells[].tags` | 否 | 字符串数组，最多 3 个，每个建议 ≤6 字。 |
| `cells[].tone` | 否 | ok、bad 或空字符串，控制当前格语义色。 |
| `template` | 否 | swot、pest、priority、bcg 或空字符串；只补分类标签及部分默认轴。 |
| `axes` | 否 | 对象；x 为左、右端点，y 为上、下端点，各填写恰好 2 个字符串。 |
| `order` | 否 | 0～3 各出现一次的整数排列；默认按位置顺序。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。标题与步骤标题中的 ==强调== 必须成对且内容非空；文字长度为展示建议，类型、必填、数量和枚举必须符合表格。
- 模板不替你归类，仍须填写四格及各格非空标题；axes 一旦填写就整体替换默认轴。
- swot 的四格为优势、劣势、机会、威胁；priority 为重要不紧急、重要紧急、不重要不紧急、不重要紧急。
- bcg 四格为明星、问号、现金牛、瘦狗；横轴左高份额右低份额，纵轴上高增长下低增长。
- pest 四格为政治、经济、社会、技术，无默认坐标轴；自定义矩阵须说明两轴。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "matrix",
  "eyebrow": "示例数据 · 门店排班",
  "title": "先补低客流门店",
  "axes": {
    "x": [
      "客单低",
      "客单高"
    ],
    "y": [
      "客流高",
      "客流低"
    ]
  },
  "cells": [
    {
      "title": "测试套餐"
    },
    {
      "title": "保持服务",
      "tone": "ok"
    },
    {
      "title": "先补到店量",
      "tone": "bad"
    },
    {
      "title": "维持客单做拉新"
    }
  ],
  "steps": [
    {
      "title": "高客流店测试套餐"
    },
    {
      "title": "双高门店保持服务"
    },
    {
      "title": "双低门店先补客流"
    },
    {
      "title": "高客单店补到店量"
    }
  ]
}
```
