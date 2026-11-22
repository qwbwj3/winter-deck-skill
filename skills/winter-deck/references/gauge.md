# gauge · 仪表环

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合 1～4 个有明确量程的完成率、利用率或得分，逐个说明后总览。
无合理上限的绝对数改用 `figures`；需判断越低越好时可用 `compare-bars`。

## 每一步画面
1. 单指标仅 1 步，环弧到达实际比例；标题说明完成情况。
2. 多指标前 N 步依次强调当前环，已讲弧保留、未讲弧为零，非当前环变淡；标题说明当前指标差距。
3. 多指标第 N+1 步全部恢复正常显示；标题给出综合判断。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `gauge`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `items` | 是 | 1～4 个指标对象。 |
| `items[].value` | 是 | 有限数字，不带单位；环弧表示 value 除以有效 max。 |
| `max` / `items[].max` | 否 | 大于 0 的有限数字，分项优先，均省略时为 100。 |
| `items[].target` | 否 | 有限数字，与 value 同单位，显示刻度与目标文字。 |
| `items[].unit` / `.label` / `.text` | 否 | 字符串，分别建议 ≤3、8、16 字；单位逐项填写。 |
| `items[].tone` | 否 | 仅 `ok`、`bad` 或空字符串，手动指定语义色。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 负值画零弧、超量程画满环，中心仍显示原值；目标刻度同样限制在环上。
- 不自动判断达标或好坏；百分比填 92 配 unit 为 %，不能填 0.92 代表 92%。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "gauge",
  "eyebrow": "季度目标 · 示例数据",
  "title": "复购达标转化仍不足",
  "max": 100,
  "items": [
    {
      "label": "会员复购率",
      "value": 41,
      "unit": "%",
      "target": 35,
      "tone": "ok"
    },
    {
      "label": "小程序转化率",
      "value": 18,
      "unit": "%",
      "target": 25,
      "tone": "bad"
    }
  ],
  "steps": [
    {
      "title": "复购超过目标"
    },
    {
      "title": "小程序转化仍不足"
    },
    {
      "title": "下季度先改善转化"
    }
  ]
}
```
