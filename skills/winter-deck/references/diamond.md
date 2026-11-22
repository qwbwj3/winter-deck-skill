# diamond · 双钻模型

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合先发散观察、收敛问题，再发散方案、收敛交付的四阶段工作。
只有四个普通里程碑时改用 `timeline`，线性操作步骤改用 `flow`。

## 每一步画面
1. 第 1 步点亮第一个钻形左半与发现卡；标题说明需要观察什么。
2. 第 2 步点亮第一个钻形右半与定义卡；标题写收敛后的问题。
3. 第 3 步点亮第二个钻形左半与开发卡；标题说明待比较的方案。
4. 第 4 步点亮第二个钻形右半与交付卡；标题说明验证与交付标准。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `diamond`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `phases` | 是 | 恰好 4 个阶段对象。 |
| `phases[].title` | 否 | 字符串，建议 ≤4 字，默认依次为发现、定义、开发、交付。 |
| `phases[].text` | 否 | 字符串，建议 ≤22 字，写阶段工作或产出。 |
| `phases[].tag` | 否 | 字符串，默认依次为发散、收敛、发散、收敛。 |
| `labels` | 否 | 恰好 2 个字符串，各建议 ≤6 字，分别标注两个钻形。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 固定 4 步，已讲阶段保留淡色，后续卡片变淡。
- 钻形不表示等工期或进度比例。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "diamond",
  "eyebrow": "门店动线改造 · 示例数据",
  "title": "先验证排队的原因",
  "labels": [
    "明确问题",
    "验证方案"
  ],
  "phases": [
    {
      "text": "观察午高峰顾客动线"
    },
    {
      "text": "确认取餐口与点单口交叉"
    },
    {
      "text": "比较分流与预点单方案"
    },
    {
      "text": "试行分流并记录等待时间"
    }
  ],
  "steps": [
    {
      "title": "先观察实际动线"
    },
    {
      "title": "交叉动线造成拥堵"
    },
    {
      "title": "同时比较两种方案"
    },
    {
      "title": "试行后再决定推广"
    }
  ]
}
```
