# deck · 整份演示

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 组织页面

先确定每页要让观众看懂的判断，再按内容形状选页型。`pages` 按顺序播放，每页讲完自己的步骤才进入下一页；不要把一步当成一页。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `preset` | 是 | 启动风格 id，须在[预设列表](presets.md)中存在。 |
| `presets` | 否 | 非空风格 id 数组，全部有效且包含 `preset`；省略时提供全部风格。 |
| `title` | 否 | 整份演示名称，用于页脚和浏览器标签。 |
| `brand` | 否 | 品牌主色，写成六位十六进制 `#RRGGBB`，随深浅模式调整可读性。 |
| `pages` | 是 | 非空页面对象数组，不可在单页内再次嵌套 `pages`。 |
| `pages[].component` | 是 | 从下面 31 个页型中选一个；其余字段直接平铺在该页，不嵌套 `data`。 |
| `pages[].en` | 否 | 英文小标签字符串，建议 ≤24 字符、≤4 词、不含中文，全稿统一有无。 |
| `pages[].notes`、`steps[].notes` | 否 | 字符串备注；步骤备注优先，页面备注只用于第一步，观众不可见。 |
| `pages[].accent` | 否 | 版式页强调色，仅 `ok`、`bad`、`neutral`；跟随风格须省略，不写空串或色值。 |

页面不用重复 `preset` / `presets`，它们不控制单页风格。各页型必填字段、容量与步数见同名参考文档。版式页共用可选字符串 `eyebrow`、`body`、`takeaway`；`quote` 不显示标题、正文。`takeaway` 建议 ≤30 字，不增加步数。

## 按内容选页型

| 内容 | 页型 |
|---|---|
| 封面、图文阅读、照片、证据截图、图组 | `media`，以 `mode` 区分 |
| 横向比较、环节流失、时间趋势、构成、总量及平摊 | `compare-bars`、`funnel`、`trend`、`share`、`kpi` |
| 目录、独立大数字、四象限、金句 | `chapter`、`figures`、`matrix`、`quote` |
| 工序、里程碑、两方案对照 | `flow`、`timeline`、`versus` |
| 要点、特性、行动、风险 | `points`、`features`、`actions`、`risks` |
| 人物、引述、表格、路线图 | `people`、`testimonial`、`table`、`roadmap` |
| 分解、层级、循环、集合交集 | `tree`、`pyramid`、`cycle`、`venn` |
| 量程进度、面积构成、多维比较、流向 | `gauge`、`treemap`、`radar`、`sankey` |
| 行业竞争结构、探索与收敛 | `forces`、`diamond` |

`narrative`、`process` 已停用；改选 `flow`、`chapter`、`quote`，封面用 `media cover`。

## 写法要点

1. 第一页必须为 `media cover`，全稿最多一张封面。图片规则见 [media](media.md)：本地相对路径或受支持的图位，不写网址。图位只表示待补素材。
2. 标题建议最多两行，每行 ≤13 字。主标题及步骤标题可用 `==关键词==`，必须成对闭合且内容非空；建议只强调一处、固定文字 ≤8 字。数据页数字与名称优先用本页支持的变量，不能自造变量。
3. `compare-bars`、`funnel`、`trend`、`share`、`kpi` 合计超过全稿 60%、同型数据页连用两页或任意数据页连用三页会提醒复核；不要为了比例把有数据形状的内容改成纯文字。
4. 同型版式页连用两页、全稿 `quote` 超过两页会提醒复核；无 `current` 的 `chapter` 用作目录，应在第二页，章节过渡须给有效 `current`。
5. 无图 reading 过多会提醒复核；每段用 `**关键数字**` 或 `figure` 提供视觉锚点。reading 配图必须每段都有或全部没有，不能混配。
6. 页面数量、数据和图位改动后仍需核对讲述内容；保留人工编辑留下的 `_more`，它保存隐藏条目和换版式信息，不是可见内容。

## 示例

示例数据：设备运维团队的季度复盘。封面图位待替换为真实横图。

```json
{
  "title": "运维季度复盘（示例数据）",
  "preset": "keynote-dark",
  "presets": ["keynote-dark", "keynote-light"],
  "brand": "#1F6FEB",
  "pages": [
    {
      "component": "media",
      "mode": "cover",
      "title": "先缩短响应\n再扩大服务",
      "image": {"slot": "运维现场横图"}
    },
    {
      "component": "actions",
      "title": "先试行值班联动",
      "items": [
        {"action": "统一报修入口", "owner": "运维主管", "due": "下周五", "detail": "先在一个车间试行"}
      ],
      "notes": "请现场负责人确认试行范围。"
    }
  ]
}
```
