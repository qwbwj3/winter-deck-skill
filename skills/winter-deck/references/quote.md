# quote · 金句

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

用于呈现一条值得停顿的结论、原则或可靠引语，拆成 1～4 行。
需要论据与过程用 points；多人的原话用 testimonial。

## 每一步画面

1. 每步亮起下一行，之前的行保留；文字本身承担判断，不另设画面标题。
2. 最后一步显示 by 出处；没有单独的出处或总览步骤。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 quote。 |
| `preset` | 单页是 | 单页填现有预设 id；放入整份演示时由顶层提供。 |
| `eyebrow / takeaway` | 否 | 字符串，分别建议 ≤24 / 30 字，takeaway 持续显示在页底。 |
| `en / accent` | 否 | en 为字符串，建议 ≤24 字符且 ≤4 词；accent 只能为 ok、bad、neutral，省略跟随风格。 |
| `lines` | 是 | 1～4 个非空字符串，按显示顺序填写；每行建议 ≤15 字。 |
| `by` | 否 | 字符串，建议 ≤20 字，填写真实出处或示例说明。 |

## 写法要点

- 本页不替换模板变量，改数据需同步改文案。每行的文字长度为展示建议；lines 数量、非空内容及字段类型必须符合表格。
- 支持用 **内容** 强调短语；不要编造引语及作者。
- title、body 和步骤标题不会显示；直接把结论写进 lines。
- 如填写 steps，须为对象数组，但不会增加行数或显示额外标题。

## 示例

示例数据，非真实经营记录。放入整份演示的 pages 使用。

```json
{
  "component": "quote",
  "lines": [
    "先把**等待**看清楚",
    "再决定往哪里加人"
  ],
  "by": "示例数据：门店复盘结论"
}
```
