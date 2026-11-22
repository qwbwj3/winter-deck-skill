# sankey · 桑基图

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合同一种数量从来源到去向的 2～3 列分配关系，如客户来源到成交去向。
只有总量逐环节减少时改用 `funnel`，并列份额改用 `share`。

## 每一步画面
1. 第 1 步展开首列到第二列的流带；标题说明主要流向。
2. 有第三列时第 2 步继续展开流带并保留上一段；标题说明最终去向。
3. 填写 focus 时最后增加 1 步，强调该节点及相连的上下游路径，其他流带变淡；标题说明重点流向。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `sankey`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `columns` | 是 | 2～3 列数组，每列含 1～6 个节点对象。 |
| `columns[][].label` | 是 | 全局唯一的非空字符串，建议 ≤8 字。 |
| `columns[][].value` | 否 | 非负有限数字，非零值覆盖连线合计，省略或为 0 时自动合计。 |
| `columns[][].text` | 否 | 字符串，附在节点数值后。 |
| `links` | 是 | 连线对象数组，可为空。 |
| `links[].from` / `.to` | 是 | 已有节点 label，to 必须在 from 的下一列。 |
| `links[].value` | 是 | 大于 0 的有限数字，全部连线使用相同单位。 |
| `headers` | 否 | 字符串数组，长度必须等于列数。 |
| `unit` | 否 | 字符串，附在所有节点数值后。 |
| `focus` | 否 | 已有节点的 label 字符串。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 节点不可重名，不支持跨列、同列或反向连线。
- 通常不填节点 value；首列按流出、其他列按流入合计，检查中间节点流入流出一致。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "sankey",
  "eyebrow": "线索分配 · 示例数据",
  "title": "官网线索主要交给直销",
  "unit": "条",
  "headers": [
    "来源",
    "承接团队"
  ],
  "columns": [
    [
      {
        "label": "官网"
      },
      {
        "label": "活动"
      }
    ],
    [
      {
        "label": "直销"
      },
      {
        "label": "渠道"
      }
    ]
  ],
  "links": [
    {
      "from": "官网",
      "to": "直销",
      "value": 80
    },
    {
      "from": "官网",
      "to": "渠道",
      "value": 20
    },
    {
      "from": "活动",
      "to": "直销",
      "value": 30
    },
    {
      "from": "活动",
      "to": "渠道",
      "value": 70
    }
  ],
  "focus": "官网",
  "steps": [
    {
      "title": "两类来源分给两队"
    },
    {
      "title": "官网八成进入直销"
    }
  ]
}
```
