# presets · 风格选择

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 选择风格

4 套风格、8 个深浅预设。按材料选构图，按投影环境选深浅；切换不改数据、页数和步数。

| 系列 | 深色 id | 浅色 id | 场合与构图 |
|---|---|---|---|
| 发布会 | `keynote-dark` | `keynote-light` | 产品发布、科技、对外演讲、路演；判断句做主角，大留白，讲到哪项亮哪项。 |
| 杂志报告 | `journal-dark` | `journal-light` | 咨询、研究、经营汇报；报头、分栏、来源脚注。 |
| 便签拼贴 | `pinboard-dark` | `pinboard-light` | 培训、复盘、工作坊、头脑风暴；正在讲的那项放大成主卡。 |
| 等轴测图 | `isoplan-dark` | `isoplan-light` | 流程、架构、组织机制、空间类；条目变成模块，结构关系可见。 |

默认推荐规则：有明确场合按上表推荐；没有更明确场合时，对外用发布会，对内汇报用杂志报告，培训用便签拼贴。推荐时说理由，并各用一句介绍其他三套。

制作前附 `<SKILL>/assets/style-grid.png`；环境不能发图时给出实际路径。图中选项与上表不一致时，说明风格图待更新，以本表四套列表为准。问用户选哪套、深色还是浅色，等回复后再写 JSON。只有用户原话明确说了“不用问我”“全部按默认”或“直接做不用确认”才跳过确认；未指定深浅时默认浅色，交付时写明实际默认选择。

字体为阿里巴巴普惠体 3.0。打包机器已安装时嵌入所用字形，否则回退系统黑体。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `preset` | 是 | 上表中一个有效 id，设为启动风格。 |
| `presets` | 否 | 非空有效 id 数组，必须包含 `preset`；制作整稿时写全上表 8 个 id，提供全部深浅选择。 |
| `brand` | 否 | 六位十六进制色值 `#RRGGBB`，替换强调色并随深浅调整，不是新增风格。 |
| 页面 `accent` | 否 | 版式页可写 `ok`、`bad`、`neutral`；省略为跟随风格，不接受空串或自定义色值。 |

`preset` / `presets` 写在演示顶层，页内不生效；填数据只选已有 id。

## 切换与写法要点

1. `presets` 建议深浅成对；缺一版有警告，空列表、无效 id 或不含启动预设则失败。
2. **P** 切同系列深浅；缺另一版时转到列表下一项。
3. **T** 按名单顺序切下一系列，尽量保持深浅，否则选该系列首项。
4. 输入框或编辑文字内不响应字母快捷键。旧单页仅支持 P 顺序轮换。
5. 品牌色可能为对比度调亮或调暗；业务好坏必须看文字和字段，不能只猜颜色。
6. 交付时从本次构建输出 HTML 的 `slide-data.preset` 读取实际 id，并核对 `style-presets`，不凭记忆报告。

## 示例

示例数据：检修汇报，启动为杂志报告浅色，可切全部四套深浅；封面图片待补。

```json
{
  "title": "季度检修汇报（示例数据）",
  "preset": "journal-light",
  "presets": ["keynote-dark", "keynote-light", "journal-dark", "journal-light", "pinboard-dark", "pinboard-light", "isoplan-dark", "isoplan-light"],
  "pages": [
    {
      "component": "media",
      "mode": "cover",
      "title": "优先处理重复故障",
      "image": {"slot": "设备检修横图"}
    }
  ]
}
```
