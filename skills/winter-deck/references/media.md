# media · 图文

> 独立 Skill 版：31 个页型：compare-bars、funnel、trend、share、kpi、media、chapter、figures、matrix、quote、flow、timeline、versus、points、features、actions、risks、people、testimonial、table、roadmap、tree、pyramid、cycle、venn、gauge、treemap、radar、sankey、forces、diamond。8 个预设：keynote-dark、keynote-light、journal-dark、journal-light、pinboard-dark、pinboard-light、isoplan-dark、isoplan-light。命令里的 `<SKILL>` 换成 Skill 绝对路径，在用户工作目录运行。5 份示例及全部引用图片在 examples/，使用时复制其中的内容到工作目录。

## 什么时候用

适合封面、段落说明、现场照片、截图证据或同组照片轮播。
按内容选 cover、reading、photo、evidence、gallery；需要自动计算数据结论时改用相应数据页。

## 每一步画面

1. cover：标题与可选横图，只有 1 步；可省略 image 做纯文字封面。photo：单张图配标题，只有 1 步。标题交代主题或现场结论。
2. reading：每段 1 步，当前段点亮并切换段落配图；无图时显示该段关键数字，标题概括全页判断。
3. evidence：先看全图，有 focus 时第 2 步指认矩形区域；标题写证据支持的判断，文字不随步改。
4. gallery：每图 1 步、依次强调并更新图片说明；标题概括这组材料的共同判断。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| component / mode | 是 | component 固定 media；mode 为 cover、reading、photo、evidence、gallery。 |
| preset | 单页时 | 单页填写已有风格 id，放入整稿时由顶层提供。 |
| title | 是 | 非空字符串；建议最多 2 行，每行 ≤13 字。 |
| eyebrow / body / meta / caption | 否 | 字符串；reading 不显示 body，caption 仅 evidence 使用，建议 ≤20 字。 |
| points | 否 | 字符串数组，显示短标签，不增加步骤。 |
| accent / en | 否 | accent 仅 ok、bad、neutral；en 须为字符串；标题标记规则见[整稿](deck.md)。 |
| presenter / date / venue | 否 | 封面署名、日期、场合；对应 Label 后缀字段可改显示名称，填写字符串。 |
| image | 按模式 | photo、evidence 必填；cover 可省略，reading 可放固定配图，gallery 改填 images。 |
| 图片值 | 按图片 | 本地相对路径，或仅含 slot 的图位对象；氛围图还可用仅含 dark、light 的双路径对象。 |
| slot | 按图位 | 非空字符串，≤16 字；不得混写其他字段，不能放在双版对象内。 |
| paragraphs | reading 必填 | 非空数组；元素为非空字符串或含非空 text 的对象；建议 ≤4 段、每段 ≤60 字、全页 ≤180 字。 |
| paragraphs[].image / figure | 否 | image 为图片值；figure 可用 value、label 指定无图段落右侧关键数字。 |
| steps | 否 | reading 可按段落填写步骤 title、notes，数量须等于 paragraphs；标题随当前高亮段落切换。其他模式不使用此字段。 |
| images | gallery 必填 | 2～5 个对象，每项 image 必填、caption 为可选字符串且宜 ≤20 字。 |
| focus | 否 | 仅 evidence，含有限数字 x、y、w、h，均为 0～1，w、h >0，x+w、y+h 均 ≤1。 |
| aspect | 按证据图 | 有限正数，等于原图宽÷高；evidence 如未填须能读出真图尺寸，图位除外；画面省略时仍按 1.95。 |
| grade | 否 | 0～1 的有限数字，控制氛围调色，默认随风格或 0.82；evidence 忽略。 |

## 写法要点

- 图片必须是存在可读取的本地相对路径，不接受网址、绝对路径或图片编码；双版须同时提供 dark、light。无真图用 slot，交付说明待补位置，不把图位当作证据。
- cover 可无图，配图时仅一张横图，不能再填段落配图或 images；gallery 同组图片比例须一致且能读出尺寸。cover、photo 面板 16:9，reading、gallery 为 4:3，氛围图会裁边。
- reading 配图要么每段都有，要么全段没有；段落图优先于顶层 image。无图时优先显示 figure，否则显示段内首个 **加粗** 内容；body 不充当段落。
- evidence 真图只接受单一路径，不接受双版；保留证据原件与来源，显式填写原图 aspect 避免拉伸，不把调色氛围图称为原样证据。
- focus 的原点在图片左上角，x 向右、y 向下；仅一个矩形，不是像素或 0～100。evidence 的 steps 会被忽略，多区域请拆页。
- 文字不支持数据变量；仅 reading 段落解析 **加粗**。明亮模式照片偏暗时应补适用的 light 版，不靠调色掩盖主体不可读。原生暗调照片可改选深色预设或换图，不必强行提亮；双版图片对象可加 `"tone": "dark"` 声明原生暗调，例如 `{"dark":"assets/img/night.jpg","light":"assets/img/night.jpg","tone":"dark"}`。校验仍检查两条路径；仅将浅色预设的偏暗警告改为建议换深色版或换图，不要求提亮。

## 示例

示例数据，仅演示填写方式。

```json
{
  "component": "media",
  "mode": "reading",
  "eyebrow": "客服响应改善 · 示例数据",
  "title": "先分流再缩短响应",
  "paragraphs": [
    {
      "text": "每月约收到 **1200 单**，重复咨询优先交给知识库。",
      "figure": {
        "value": "1200 单",
        "label": "月均咨询"
      }
    },
    {
      "text": "复杂问题进入人工队列，试点平均响应为 **6 小时**。",
      "figure": {
        "value": "6 小时",
        "label": "试点平均响应"
      }
    }
  ],
  "meta": "示例数据，不代表真实运营记录"
}
```
