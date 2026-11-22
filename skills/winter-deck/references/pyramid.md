# pyramid · 金字塔层级

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合 3～5 层递进关系，如能力分层、策略到执行的承接。
同级并列事项改用 `points`，可分叉的结构改用 `tree`。

## 每一步画面
1. 共 N 步，每步点亮一层立体台阶、对应引线与右侧说明；标题说明这一层对整体的作用。
2. 默认从底往上讲，order 为 top 时从顶往下；已讲层保留淡色，未讲层变淡。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `pyramid`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `levels` | 是 | 3～5 个层级对象，数组始终按顶部到底部排列。 |
| `levels[].title` | 是 | 非空字符串，建议 ≤8 字。 |
| `levels[].text` | 否 | 字符串，建议 ≤22 字。 |
| `order` | 否 | 仅 `top`、`bottom` 或空字符串；默认从底往上。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 改变 order 只改变讲解顺序，不改变数组所对应的位置。
- 台阶宽度不代表人数、金额或比例，不用面积证明层级规模。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "pyramid",
  "eyebrow": "客服能力建设 · 示例数据",
  "title": "知识沉淀支撑服务质量",
  "levels": [
    {
      "title": "服务质量",
      "text": "抽检答复准确性与解决率"
    },
    {
      "title": "一线处理",
      "text": "按问题类型检索并答复"
    },
    {
      "title": "知识基础",
      "text": "维护产品与售后知识"
    }
  ],
  "steps": [
    {
      "title": "先维护可靠知识"
    },
    {
      "title": "再让一线准确调用"
    },
    {
      "title": "最后用抽检验证质量"
    }
  ]
}
```
