#!/usr/bin/env node
// 零依赖使用端构建器：Skill 资源相对 import.meta.url；输入、图片、输出相对 cwd。
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeck } from './validate.mjs';
import { readEmbeddedJson } from './extract.mjs';
import { withEmbeddedFonts } from './font-subset.mjs';
const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const safe = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');
const fingerprint = (data) => {
  const d = JSON.parse(JSON.stringify(data)); delete d.preset;
  return createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0, 16);
};
// 与项目构建器相同：占位符分段拼接，不能连用 replace 误替换运行时代码。
export function fillTpl(tpl, dataText, presetsChunk, bundle) {
  const [a, r1] = tpl.split('__DATA__'); const [b, r2] = r1.split('__PRESETS__');
  const [c, d] = r2.split('/*__BUNDLE__*/');
  return a + dataText + b + presetsChunk + c + bundle + d;
}
export function runCli(args) {
  try {
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
      console.log('用法：node <SKILL>/scripts/build.mjs <deck.json> [--preset 预设id] [--force]\n输出到当前工作目录 out/；遇到浏览器修改先提取，--force 会丢弃修改。'); return 0;
    }
    let input, override, force = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--force' && !force) force = true;
      else if (arg === '--preset' && !override && args[i + 1] && !args[i + 1].startsWith('-')) override = args[++i];
      else if (!arg.startsWith('-') && !input) input = arg;
      else throw new Error('参数无效或缺少参数：' + arg);
    }
    if (!input) throw new Error('请指定 deck JSON');
    let deck = JSON.parse(readFileSync(path.resolve(input), 'utf8'));
    if (override) deck.preset = override;
    const findings = validateDeck(deck);
    for (const f of findings) console.log(f.severity + '：' + f.location + '：' + f.message);
    if (findings.some((f) => f.severity === '失败')) throw new Error('校验失败，未写入 HTML');
    // 旧单页数据也使用预编译的多页引擎，获得相同的编辑与保存能力。
    if (deck && typeof deck === 'object' && !Array.isArray(deck) && !Object.hasOwn(deck, 'pages')) {
      const { preset, presets, ...page } = deck;
      deck = { preset, ...(presets === undefined ? {} : { presets }), pages: [page] };
    }
    const manifest = JSON.parse(readFileSync(path.join(SKILL, 'runtime', 'manifest.json'), 'utf8'));
    let presets = manifest.presets.map((id) => JSON.parse(readFileSync(path.join(SKILL, 'runtime', 'presets', id + '.json'), 'utf8')));
    if (Array.isArray(deck.presets)) presets = deck.presets.map((id) => presets.find((p) => p.id === id));
    if (!presets.some((p) => p?.id === deck.preset)) throw new Error('找不到预设：' + deck.preset);
    const assets = Object.create(null);
    const flat = (v) => v && typeof v === 'object' ? (Object.hasOwn(v, 'slot') ? [] : [v.dark, v.light]) : [v];
    const imgRefs = (pg) => [pg.image, ...(pg.paragraphs || []).map((p) => p && p.image), ...(pg.images || []).map((g) => g.image), ...(pg.items || []).map((it) => it && it.image)].flatMap(flat).filter(Boolean);
    // _more 不参加可见校验；仅把 cwd 内已有的安全本地图片随隐藏数据带回离线 HTML。
    function hiddenImgRefs(value, hidden = false, out = new Set()) {
      if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
        if (hidden && key === 'image') for (const ref of flat(child)) {
          if (typeof ref !== 'string' || /^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(ref) || /[\\\0]/.test(ref) || ref.split('/').some((p) => !p || p === '..') || !/\.(?:png|jpe?g|webp)$/i.test(ref)) continue;
          try {
            const root = realpathSync(process.cwd()), file = realpathSync(path.resolve(ref));
            if (file.startsWith(root + path.sep) && statSync(file).isFile()) out.add(ref);
          } catch {} // 隐藏素材缺失不阻塞构建，原引用仍保留。
        } else hiddenImgRefs(child, hidden || key === '_more', out);
      }
      return [...out];
    }
    for (const pg of deck.pages) for (const ref of [...imgRefs(pg), ...hiddenImgRefs(pg)]) if (!Object.hasOwn(assets, ref)) {
      const ext = path.extname(ref).toLowerCase();
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' }[ext];
      if (!mime) throw new Error('图片仅支持 PNG、JPEG、WebP：' + ref);
      assets[ref] = 'data:' + mime + ';base64,' + readFileSync(path.resolve(ref)).toString('base64');
    }
    const tplText = readFileSync(path.join(SKILL, 'runtime', 'template.html'), 'utf8');
    const js = readFileSync(path.join(SKILL, 'runtime', 'runtime.js'), 'utf8');
    if (js.toLowerCase().includes('</script')) throw new Error('runtime 含脚本结束标签');
    const presetsChunk = safe(presets) + '\n</script>\n<script type="application/json" id="deck-assets">\n' + safe(assets) +
      '\n</script>\n<script type="application/json" id="deck-shell">\n' + safe(tplText);
    // 字体：本机装有阿里巴巴普惠体 3.0 时，只嵌入这份演示用到的字；模板（存进页面供保存用）不变。
    const fonts = withEmbeddedFonts(tplText, tplText + safe(deck) + safe(presets) + js);
    const html = fillTpl(fonts.tpl, safe(deck), presetsChunk, js);
    const out = path.join('out', path.basename(input, '.json') + (override ? '__' + deck.preset : '') + '.html');
    const stamp = out + '.built.json';
    if (existsSync(out) && !force) {
      let previous, current;
      try {
        previous = JSON.parse(readFileSync(stamp, 'utf8')).fingerprint;
        current = fingerprint(readEmbeddedJson(readFileSync(out, 'utf8'), 'slide-data'));
      } catch {}
      // 无有效凭据也保守停下，避免把陌生文件或损坏文件当成可覆盖产物。
      if (!previous || !current || current !== previous) {
        console.error('停止：' + out + ' 被人改过，或缺少有效构建凭据。\n先运行：node <SKILL>/scripts/extract.mjs ' + out + '\n提取并合并修改后再打包；确定丢弃修改才加 --force。'); return 2;
      }
    }
    mkdirSync('out', { recursive: true });
    writeFileSync(out, html);
    writeFileSync(stamp, JSON.stringify({ fingerprint: fingerprint(deck), deck: input, builtAt: new Date().toISOString() }, null, 2) + '\n');
    console.log('打包完成：' + out + '（' + Math.round(Buffer.byteLength(html) / 1024) + ' KiB）；' + fonts.note);
    console.log('实际产物：' + path.resolve(out));
    console.log('【放映兼容提醒】3D 页面需播放机浏览器支持 WebGL 2 并开启图形/硬件加速（Chrome / Edge）；老旧电脑、关闭硬件加速或部分远程桌面（VDI）可能无法渲染且不会自动降级为 2D PPT。拷到别的电脑或会议室上台前请务必先试播并连续翻页，略卡按 Q 降画质（可用 chrome://gpu 或 edge://gpu 检查 WebGL2 状态）。');
    console.log('下一步截图：node ' + JSON.stringify(path.join(SKILL, 'scripts', 'snap.mjs')) + ' ' + JSON.stringify(path.resolve(out)) + ' --check');
    return 0;
  } catch (error) { console.error('打包失败：' + error.message); return 1; }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runCli(process.argv.slice(2));
