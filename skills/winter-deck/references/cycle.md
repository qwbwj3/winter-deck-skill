# cycle · 循环与飞轮

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合有回流关系的 3～6 个环节，如复购带来转介绍、转介绍带来新客。
没有回到起点的关系时改用 `flow`。

## 每一步画面
1. 前 N 步按数组顺序逐个点亮环上节点与右侧条目，进度弧顺时针推进；标题说明当前环节如何带动下一环。
2. 第 N+1 步进度弧闭合，所有节点完成、条目恢复正常显示；标题说明循环成立的条件。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `cycle`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `items` | 是 | 3～6 个环节对象，按推进顺序排列。 |
| `items[].title` | 是 | 非空字符串，建议 ≤8 字。 |
| `items[].text` | 否 | 字符串，建议 ≤18 字。 |
| `center` | 否 | 圆心字符串，建议 ≤6 字。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 共 N+1 步；闭合的图形不能代替业务回流证据。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "cycle",
  "eyebrow": "会员运营 · 示例数据",
  "title": "老客推荐带来新客",
  "center": "会员循环",
  "items": [
    {
      "title": "首单体验",
      "text": "记录首单满意度"
    },
    {
      "title": "会员复购",
      "text": "复购后发放推荐券"
    },
    {
      "title": "老客推荐",
      "text": "被推荐者完成首单"
    }
  ],
  "steps": [
    {
      "title": "首单体验决定回访"
    },
    {
      "title": "复购后邀请推荐"
    },
    {
      "title": "推荐者带来新客"
    },
    {
      "title": "回流效果需要追踪"
    }
  ]
}
```
