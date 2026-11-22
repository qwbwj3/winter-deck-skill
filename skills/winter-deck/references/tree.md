# tree · 逻辑树

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用
适合一个总问题拆成 1～4 个分支、每支再拆到最多 3 个子项。
无分叉的连续过程用 `flow`，纯层级递进用 `pyramid`。

## 每一步画面
1. 第 1 步只显示并强调根节点；标题交代总问题。
2. 第 2 步出现第一层分支和连线；标题说明拆分依据。
3. 存在子项时增加 1 步，出现第三列和连线；标题说明进一步拆解的判断。
4. 填写 focus 时最后增加 1 步，强调指定分支和连线，其他分支变淡；标题点明重点分支。

## 字段
| 字段 | 必填 | 说明 |
|---|---|---|
| `component` | 是 | 固定为 `tree`。 |
| `preset` | 单页时 | 现有预设名；放入整份演示的 pages 时由顶层提供。 |
| `title` | 是 | 非空字符串，建议每行 ≤13 字，画面按单行显示。 |
| `eyebrow` / `body` / `takeaway` | 否 | 字符串；页眉建议 ≤24 字，底部结论建议 ≤30 字。 |
| `en` | 否 | 英文标签字符串，建议 ≤24 字符、≤4 词。 |
| `accent` | 否 | 仅 `ok`、`bad`、`neutral`，跟随风格时省略。 |
| `steps` | 否 | 对象数组，条数应与画面步数一致，不决定步数。 |
| `steps[].title` / `steps[].body` | 否 | 字符串，替换该步标题或正文，省略则沿用页面文字。 |
| `root` | 是 | 根节点对象。 |
| `root.children` | 是 | 1～4 个分支对象。 |
| `root.children[].children` | 否 | 每支 0～3 个子项对象，只支持根、分支、子项三层。 |
| 各节点 `label` | 是 | 非空字符串，建议 ≤10 字。 |
| 各节点 `value` | 否 | 字符串或有限数字，显示长度建议 ≤10 字，单位写在字符串中。 |
| 子项 `children` | 否 | 只能省略或为空数组，不支持继续向下。 |
| `focus` | 否 | 从 0 开始的有效第一层分支整数下标。 |
| `operator` | 否 | 字符串，建议 ≤2 字，画面不显示。 |

## 写法要点
- 本页不替换模板变量；改数据时同步修改标题和说明。
- 标题建议每行 ≤13 字；使用 ==关键词== 时须成对闭合且内容非空。
- 步数为 2＋有子项时 1 步＋有 focus 时 1 步。
- 不自动计算合计或验证因果，手填数值应有可解释的拆分关系。
- 聚焦时子项保留正常显示，不会整支所有节点都填色。

## 示例
示例数据，用于说明填写方式。

```json
{
  "component": "tree",
  "eyebrow": "季度营收拆分 · 示例数据",
  "title": "营收主要来自企业客户",
  "root": {
    "label": "季度营收",
    "value": "120万元",
    "children": [
      {
        "label": "企业客户",
        "value": "90万元",
        "children": [
          {
            "label": "老客户",
            "value": "60万元"
          },
          {
            "label": "新客户",
            "value": "30万元"
          }
        ]
      },
      {
        "label": "个人客户",
        "value": "30万元"
      }
    ]
  },
  "focus": 0,
  "steps": [
    {
      "title": "先看季度营收"
    },
    {
      "title": "按客户类型拆分"
    },
    {
      "title": "企业收入以老客为主"
    },
    {
      "title": "重点维护企业老客户"
    }
  ]
}
```
