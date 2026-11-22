#!/usr/bin/env node
// 将浏览器保存的演示还原为可继续编辑的数据；不执行 HTML 里的脚本。
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function readEmbeddedJson(html, id) {
  const matches = [];
  for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = Object.create(null);
    for (const attr of tag[1].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+))/g))
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4];
    if (attrs.id === id && attrs.type?.toLowerCase() === 'application/json') matches.push(tag[2]);
  }
  if (matches.length !== 1) throw new Error(`${id} 必须恰好有一个 application/json 脚本块，实际找到 ${matches.length} 个`);
  try { return JSON.parse(matches[0]); }
  catch (error) { throw new Error(`${id} 不是有效 JSON：${error.message}`); }
}

export function decodeImage(uri) {
  if (typeof uri !== 'string') throw new Error('图片数据必须是 data URI 字符串');
  const match = /^data:(image\/[a-z\d.+-]+)((?:;[^,]*)?),(.*)$/is.exec(uri);
  if (!match) throw new Error('图片必须使用 image/* data URI');
  let bytes;
  if (/;base64(?:;|$)/i.test(match[2])) {
    const encoded = match[3].replace(/\s/g, '');
    if (!encoded || !/^[A-Za-z\d+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1)
      throw new Error('图片 base64 数据无效');
    bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('图片 base64 数据无效');
  } else {
    // 非 base64 data URI：按字节解码，保留二进制的 %FF 等内容。
    const chunks = [];
    for (let i = 0; i < match[3].length;) {
      if (match[3][i] === '%') {
        if (!/^[\da-f]{2}$/i.test(match[3].slice(i + 1, i + 3))) throw new Error('图片 data URI 百分号编码无效');
        chunks.push(Buffer.from([parseInt(match[3].slice(i + 1, i + 3), 16)])); i += 3;
      } else {
        const c = String.fromCodePoint(match[3].codePointAt(i)); chunks.push(Buffer.from(c)); i += c.length;
      }
    }
    bytes = Buffer.concat(chunks);
  }
  if (!bytes.length) throw new Error('图片数据为空');
  return bytes;
}

// 图片只写项目内部，避免 HTML 中的键或符号链接把文件写到项目之外。
function assetPath(root, ref) {
  if (path.isAbsolute(ref) || /^[a-z][a-z\d+.-]*:/i.test(ref) || ref.startsWith('//') || /[\\\0]/.test(ref) || ref.split('/').some((p) => !p || p === '..'))
    throw new Error(`不安全的图片路径：${ref}（仅接受当前工作目录内的安全相对路径）`);
  const target = path.resolve(root, ref), actualRoot = realpathSync(root);
  let parent = target;
  while (!existsSync(parent)) parent = path.dirname(parent);
  const actual = realpathSync(parent);
  if (actual !== actualRoot && !actual.startsWith(actualRoot + path.sep)) throw new Error(`图片路径通过符号链接指向项目外：${ref}`);
  return target;
}

function imageSlots(value, slots = [], hidden = false) {
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (key === 'image') {
      if (typeof child === 'string') slots.push({ parent: value, key, ref: child, hidden });
      // 图位说明不参与图片提取或路径重写；整份数据直接保留。
      else if (object(child) && !Object.hasOwn(child, 'slot')) for (const variant of ['dark', 'light'])
        if (typeof child[variant] === 'string') slots.push({ parent: child, key: variant, ref: child[variant], hidden });
    } else imageSlots(child, slots, hidden || key === '_more');
  }
  return slots;
}

export function diffFields(before, after, base = '') {
  if (isDeepStrictEqual(before, after)) return [];
  if ((object(before) && object(after)) || (Array.isArray(before) && Array.isArray(after))) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => {
      const field = Array.isArray(after) ? `${base}[${key}]` : base ? `${base}.${key}` : key;
      return diffFields(before[key], after[key], field);
    });
  }
  return [{ field: base || '整份数据', before, after }];
}
const shortValue = (value) => {
  if (value === undefined) return '（无）';
  const text = JSON.stringify(value), chars = [...text];
  return chars.length > 100 ? chars.slice(0, 100).join('') + '…' : text;
};
const label = (field) => {
  const page = /^pages\[(\d+)\](?:\.(.*))?$/.exec(field);
  return page ? `第 ${Number(page[1]) + 1} 页：${page[2] || field}` : `整份数据：${field}`;
};
function availableOutput(requested, force) {
  if (force || !existsSync(requested)) return requested;
  const ext = path.extname(requested), stem = requested.slice(0, requested.length - ext.length);
  let next = `${stem}.edited${ext}`, n = 2;
  while (existsSync(next)) next = `${stem}.edited-${n++}${ext}`;
  return next;
}

export function extractDeck(htmlFile, { root = process.cwd(), out, force = false } = {}) {
  root = path.resolve(root);
  const html = readFileSync(htmlFile, 'utf8');
  const deck = readEmbeddedJson(html, 'slide-data'), assets = readEmbeddedJson(html, 'deck-assets');
  if (!object(deck) || (!Array.isArray(deck.pages) && typeof deck.component !== 'string')) throw new Error('slide-data 必须是演示数据对象（包含 pages 或 component）');
  if (!object(assets)) throw new Error('deck-assets 必须是图片键到 data URI 的对象');
  const name = path.basename(htmlFile).replace(/\.html?$/i, '');
  const sameName = path.join(root, 'decks', `${name}.json`);
  const requested = out ? path.resolve(out) : sameName;
  const output = availableOutput(requested, force);
  // --out 已存在时优先对比指定的数据文件；否则对比 HTML 同名源数据。
  const baseline = out && existsSync(requested) ? requested : sameName;
  let before;
  if (existsSync(baseline)) {
    try { before = JSON.parse(readFileSync(baseline, 'utf8')); }
    catch (error) { throw new Error(`无法读取对比数据 ${baseline}：${error.message}`); }
  }
  const mapping = new Map(), plans = [], reserved = new Set(), plannedFiles = new Map();
  const slots = imageSlots(deck);
  for (const [ref, uri] of Object.entries(assets)) {
    let dest = ref;
    if (ref.startsWith('edited/')) {
      let filename = ref.slice('edited/'.length).replace(/^\d+-/, '');
      if (!filename || filename === '.' || filename === '..' || /[\/\\\0]/.test(filename)) throw new Error(`不安全的编辑图片名：${ref}`);
      const ext = path.posix.extname(filename), stem = filename.slice(0, filename.length - ext.length);
      dest = `assets/img/edited/${filename}`;
      let n = 2;
      while (existsSync(assetPath(root, dest)) || reserved.has(dest)) dest = `assets/img/edited/${stem}-${n++}${ext}`;
      mapping.set(ref, dest);
    }
    const file = assetPath(root, dest);
    // a.jpg 与 ./a.jpg 等价路径只规划一次；内嵌数据若冲突则先失败、不落盘。
    if (plannedFiles.has(file)) {
      if (!plannedFiles.get(file).equals(decodeImage(uri))) throw new Error('同一图片路径对应不同内容：' + ref);
      reserved.add(dest); continue;
    }
    if (existsSync(file)) {
      if (!statSync(file).isFile()) throw new Error(`图片路径不是文件：${dest}`);
      continue; // 原有图片保留，不用 HTML 内嵌副本覆盖。
    }
    // 先验证所有待写内容，再开始落盘。
    let bytes;
    try { bytes = decodeImage(uri); } catch (error) { throw new Error(`${ref}：${error.message}`); }
    plannedFiles.set(file, bytes); reserved.add(dest); plans.push({ ref, dest, file, bytes, edited: ref.startsWith('edited/') });
  }
  for (const slot of slots) {
    if (mapping.has(slot.ref)) slot.parent[slot.key] = mapping.get(slot.ref);
    // 已内嵌的隐藏图片照常恢复并重写；尚无资产的隐藏数据不参与可见图片校验。
    else if (slot.hidden) continue;
    else if (slot.ref.startsWith('edited/')) throw new Error(`deck-assets 缺少编辑图片：${slot.ref}`);
    else if (!reserved.has(slot.ref) && !existsSync(assetPath(root, slot.ref))) throw new Error(`图片既不在本地，也不在 deck-assets 中：${slot.ref}`);
  }
  const changes = before === undefined ? diffFields({}, deck) : diffFields(before, deck);
  const created = [];
  try {
    for (const plan of plans) {
      mkdirSync(path.dirname(plan.file), { recursive: true });
      writeFileSync(plan.file, plan.bytes, { flag: 'wx' }); created.push(plan.file);
    }
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(deck, null, 2) + '\n', { flag: force ? 'w' : 'wx' });
  } catch (error) {
    for (const file of created) unlinkSync(file);
    throw error;
  }
  return { deck, output, requested, baseline: before === undefined ? null : baseline, changes, images: plans.map(({ ref, dest, edited }) => ({ ref, dest, edited })) };
}

export function runCli(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('用法：node <SKILL>/scripts/extract.mjs <编辑过的.html> [--out decks/名称.json] [--force]\n默认写到当前工作目录 decks/同名.json；已存在时另存 .edited.json，仍重名则加序号。--force 才覆盖。'); return 0;
  }
  let input, out, force = false;
  try {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--force' && !force) force = true;
      else if (arg === '--out' && !out && args[i + 1] && !args[i + 1].startsWith('-')) out = args[++i];
      else if (!arg.startsWith('-') && !input) input = arg;
      else throw new Error(`参数无效：${arg}`);
    }
    if (!input) throw new Error('请指定编辑过的 HTML 文件');
    const result = extractDeck(path.resolve(input), { out, force });
    if (result.output !== result.requested) console.log(`原数据已存在，未覆盖；另存为：${result.output}`);
    console.log(`提取完成：${result.output}`);
    console.log(result.baseline ? `字段对比：${result.baseline}` : '未找到同名源数据，以下字段为新增；无法还原编辑前的内容。');
    if (!result.changes.length) console.log('字段无变化。');
    for (const change of result.changes) console.log(`${label(change.field)}：${shortValue(change.before)} → ${shortValue(change.after)}`);
    console.log(`新增图片：${result.images.length} 张`);
    for (const image of result.images) console.log(`  ${image.dest}（${image.edited ? `编辑替换：${image.ref}` : '原图本地缺失，从内嵌数据恢复'}）`);
    return 0;
  } catch (error) { console.error(`提取失败：${error.message}`); return 1; }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runCli(process.argv.slice(2));
