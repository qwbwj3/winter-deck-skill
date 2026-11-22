// 字体裁剪：只保留给定文字用到的字形，供构建时把普惠体嵌进 HTML。
// 字体文件取使用者本机已安装的副本，仓库里不放任何字体文件。
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 四种字重，对应 engine/template.html 里的 @font-face。
export const FACES = [
  { weight: 300, names: ['AlibabaPuHuiTi-3-45-Light'], local: 'Alibaba PuHuiTi 3.0 45 Light' },
  { weight: 600, names: ['AlibabaPuHuiTi-3-75-SemiBold'], local: 'Alibaba PuHuiTi 3.0 75 SemiBold' },
  { weight: 800, names: ['AlibabaPuHuiTi-3-105-Heavy'], local: 'Alibaba PuHuiTi 3.0 105 Heavy' },
  { weight: 900, names: ['AlibabaPuHuiTi-3-115-Black'], local: 'Alibaba PuHuiTi 3.0 115 Black' },
];

// 字体查找目录：环境变量 WINTER_DECK_FONT_DIR 优先，其次系统字体目录。
export function fontDirs() {
  const env = process.env.WINTER_DECK_FONT_DIR;
  return [env, join(homedir(), 'Library/Fonts'), '/Library/Fonts',
    join(homedir(), '.local/share/fonts'), join(homedir(), '.fonts'), '/usr/share/fonts',
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft/Windows/Fonts'), 'C:/Windows/Fonts'].filter(Boolean);
}

export function findFont(names, dirs = fontDirs()) {
  for (const d of dirs) for (const n of names) for (const ext of ['.otf', '.ttf']) {
    const p = join(d, n + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

// 裁字引擎：优先用同目录 vendor/ 里随包分发的 wasm（使用端无 npm 依赖），否则用项目依赖。
let hb = null;
function loadHb() {
  if (hb) return hb;
  const local = fileURLToPath(new URL('./vendor/harfbuzz-subset.wasm', import.meta.url));
  const file = existsSync(local) ? local : createRequire(import.meta.url).resolve('harfbuzzjs/dist/harfbuzz-subset.wasm');
  hb = new WebAssembly.Instance(new WebAssembly.Module(readFileSync(file)), {}).exports;
  return hb;
}

// 返回裁剪后的字体字节（格式与原文件相同：otf 仍是 otf，ttf 仍是 ttf）。
export function subsetFont(buf, text) {
  const hb = loadHb();
  const heap = () => new Uint8Array(hb.memory.buffer);
  const ptr = hb.malloc(buf.length);
  heap().set(buf, ptr);
  const blob = hb.hb_blob_create(ptr, buf.length, 2 /* 可写 */, 0, 0);
  const face = hb.hb_face_create(blob, 0);
  hb.hb_blob_destroy(blob);
  const input = hb.hb_subset_input_create_or_fail();
  if (!input) throw new Error('字体裁剪初始化失败');
  const uni = hb.hb_subset_input_unicode_set(input);
  for (const ch of new Set(text)) hb.hb_set_add(uni, ch.codePointAt(0));
  const sub = hb.hb_subset_or_fail(face, input);
  hb.hb_subset_input_destroy(input);
  if (!sub) { hb.hb_face_destroy(face); hb.free(ptr); throw new Error('字体裁剪失败'); }
  const out = hb.hb_face_reference_blob(sub);
  const len = hb.hb_blob_get_length(out);
  const data = hb.hb_blob_get_data(out, 0);
  const bytes = heap().slice(data, data + len);
  hb.hb_blob_destroy(out); hb.hb_face_destroy(sub); hb.hb_face_destroy(face); hb.free(ptr);
  return bytes;
}

// 常用标点、英文数字：编辑时最常新打的字，始终保留。
export const BASE_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  '，。、；：？！“”‘’（）《》【】〔〕—…·％＋－×÷＝→←↑↓▲▼✓✗°￥¥€$';

// 生成 @font-face：先用本机已装的普惠体（编辑时新打的字也能显示），没有再用嵌入的裁剪版。
// 本机找不到字体文件的字重不嵌入，页面退回本机字体或系统黑体。
export function embedFontCss(text, { family = 'PHT', dirs } = {}) {
  const css = [], missing = [];
  let bytes = 0;
  const all = text + BASE_CHARS;
  for (const f of FACES) {
    const local = `local("${f.names[0]}"),local("${f.local}")`;
    const p = findFont(f.names, dirs);
    if (!p) { missing.push(f.names[0]); css.push(`@font-face{font-family:"${family}";font-weight:${f.weight};src:${local};}`); continue; }
    const sub = subsetFont(readFileSync(p), all);
    bytes += sub.length;
    const otf = p.endsWith('.otf');
    css.push(`@font-face{font-family:"${family}";font-weight:${f.weight};font-display:block;src:${local},url(data:font/${otf ? 'otf' : 'ttf'};base64,${Buffer.from(sub).toString('base64')}) format("${otf ? 'opentype' : 'truetype'}");}`);
  }
  return { css: css.join('\n'), missing, bytes };
}

// 把模板里的字体块换成嵌入版；返回新模板和提示信息。模板本身（存进页面供保存用）不变。
export function withEmbeddedFonts(tpl, text, opts) {
  const re = /<style id="deck-fonts">[\s\S]*?<\/style>/;
  if (!re.test(tpl)) return { tpl, note: '模板缺少字体块，未嵌入字体' };
  const { css, missing, bytes } = embedFontCss(text, opts);
  const note = missing.length === FACES.length
    ? '未找到阿里巴巴普惠体 3.0，未嵌入字体：在没装这套字体的电脑上会显示为系统黑体'
    : `已嵌入普惠体（${FACES.length - missing.length} 种字重，${Math.round(bytes / 1024)}KB）` + (missing.length ? `；缺少：${missing.join('、')}` : '');
  if (missing.length === FACES.length) console.warn('⚠ 未找到阿里巴巴普惠体，成品会用系统黑体，换行可能变化');
  return { tpl: tpl.replace(re, () => `<style id="deck-fonts">\n${css}\n</style>`), note };
}
