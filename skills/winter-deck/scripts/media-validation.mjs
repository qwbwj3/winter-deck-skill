// 图文数据结构与尺寸离线校验。不判断截图真伪，也不启动浏览器。
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const own = (v, key) => v != null && Object.hasOwn(v, key);
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const number = (v) => typeof v === 'number' && Number.isFinite(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const count = (v) => [...v.replace(/\*\*(.+?)\*\*/g, '$1')].length;

// 只探测 PNG / JPEG / WebP 的原始像素宽高；不是完整图片解码或可显示性验证。
export function imageDimensions(b) {
  let width, height;
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && b.toString('ascii', 12, 16) === 'IHDR') {
    width = b.readUInt32BE(16); height = b.readUInt32BE(20);
  } else if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let p = 2;
    const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (p < b.length) {
      if (b[p++] !== 0xff) break;
      while (p < b.length && b[p] === 0xff) p++;
      const marker = b[p++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd8) continue;
      if (p + 2 > b.length) break;
      const length = b.readUInt16BE(p);
      if (length < 2 || p + length > b.length) break;
      if (sof.has(marker) && length >= 8) { height = b.readUInt16BE(p + 3); width = b.readUInt16BE(p + 5); break; }
      p += length;
    }
  } else if (b.length >= 20 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    for (let p = 12; p + 8 <= b.length;) {
      const type = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4), start = p + 8;
      if (start + size > b.length) break;
      if (type === 'VP8X' && size >= 10) { width = 1 + b.readUIntLE(start + 4, 3); height = 1 + b.readUIntLE(start + 7, 3); break; }
      if (type === 'VP8 ' && size >= 10 && b.subarray(start + 3, start + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
        width = b.readUInt16LE(start + 6) & 0x3fff; height = b.readUInt16LE(start + 8) & 0x3fff; break;
      }
      if (type === 'VP8L' && size >= 5 && b[start] === 0x2f) {
        const bits = b.readUInt32LE(start + 1);
        width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; break;
      }
      p = start + size + (size & 1);
    }
  }
  return width > 0 && height > 0 ? { width, height } : null;
}

export function validateMedia(data, { root, fail, warn }) {
  const mode = data.mode;
  if (!['cover', 'reading', 'photo', 'evidence', 'gallery'].includes(mode))
    fail('mode', '只能是 cover、reading、photo、evidence、gallery 五选一');
  if (!text(data.title)) fail('title', '必须填写非空标题');
  for (const key of ['eyebrow', 'title', 'body', 'meta', 'caption'])
    if (own(data, key) && typeof data[key] !== 'string') fail(key, '必须是字符串');
  if (typeof data.title === 'string') {
    const lines = data.title.split(/\r\n|[\r\n]|\\n/);
    if (lines.length > 2) warn('title', `标题共 ${lines.length} 行，超过 2 行`);
    lines.forEach((line, i) => { if ([...line].length > 13) warn(`title 第 ${i + 1} 行`, '标题每行建议不超过 13 字'); });
  }
  const caption = (value, location) => {
    if (typeof value !== 'string') fail(location, '必须是字符串');
    else if ([...value].length > 20) warn(location, 'caption 建议不超过 20 字');
  };
  if (own(data, 'caption') && typeof data.caption === 'string') caption(data.caption, 'caption');
  if (own(data, 'points')) {
    if (!Array.isArray(data.points)) fail('points', '必须是字符串数组');
    else data.points.forEach((point, i) => { if (typeof point !== 'string') fail(`points[${i}]`, '必须是字符串'); });
  }
  if (own(data, 'aspect') && (!number(data.aspect) || data.aspect <= 0)) fail('aspect', '必须是大于 0 的有限数字（原图宽 / 高）');
  if (own(data, 'grade') && (!number(data.grade) || data.grade < 0 || data.grade > 1)) fail('grade', '必须是 0～1 的有限数字');
  if (own(data, 'focus')) {
    if (!object(data.focus)) fail('focus', '必须是包含 x、y、w、h 的对象');
    else {
      for (const key of ['x', 'y', 'w', 'h']) {
        const v = data.focus[key];
        if (!number(v) || v < 0 || v > 1 || (['w', 'h'].includes(key) && v === 0))
          fail(`focus.${key}`, '必须是 0～1 的有限数字，w/h 必须大于 0');
      }
      if (number(data.focus.x) && number(data.focus.w) && data.focus.x + data.focus.w > 1 + 1e-12)
        fail('focus', 'x + w 不能超过 1，聚焦区域不能超出截图');
      if (number(data.focus.y) && number(data.focus.h) && data.focus.y + data.focus.h > 1 + 1e-12)
        fail('focus', 'y + h 不能超过 1，聚焦区域不能超出截图');
    }
    if (mode !== 'evidence') warn('focus', '仅 evidence 使用 focus，当前模式会忽略');
  }
  if (own(data, 'steps') && mode !== 'reading') warn('steps', 'media 步骤数由 mode 和内容数量决定，steps 会被忽略');

  const cache = new Map();
  const slots = [];
  const image = (src, location) => {
    if (!text(src)) { fail(location, '必须填写非空本地图片路径'); return null; }
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src) || path.isAbsolute(src)) {
      fail(location, '图片必须使用相对项目根目录的本地文件路径，不接受网址、data URI 或绝对路径'); return null;
    }
    if (cache.has(src)) {
      const result = cache.get(src);
      if (result.error) fail(location, result.error);
      return result.dimensions;
    }
    let dimensions = null, error;
    try {
      const file = path.resolve(root, src);
      if (!statSync(file).isFile()) throw new Error();
      dimensions = imageDimensions(readFileSync(file));
    } catch { error = `图片文件不存在或不可读取：${src}`; fail(location, error); }
    cache.set(src, { dimensions, error });
    return dimensions;
  };
  const imageSpec = (spec, location) => {
    if (!object(spec)) return [{ key: 'single', src: spec, location, dimensions: image(spec, location) }];
    if (own(spec, 'slot')) {
      if (own(spec, 'dark') || own(spec, 'light')) {
        fail(location, '图位 slot 不能与 dark/light 同时填写'); return [];
      }
      if (Object.keys(spec).some((key) => key !== 'slot'))
        fail(location, '图位对象只能包含 slot 字段');
      if (!text(spec.slot) || [...spec.slot].length > 16) {
        fail(`${location}.slot`, '图位说明必须是非空字符串，且不超过 16 字'); return [];
      }
      const allowed = location === 'image' && ['cover', 'photo', 'evidence', 'reading'].includes(mode)
        || /^paragraphs\[\d+\]\.image$/.test(location) && mode === 'reading'
        || /^images\[\d+\]\.image$/.test(location) && mode === 'gallery';
      if (!allowed) { fail(location, '此位置不支持图位；请使用对应模式的图片字段'); return []; }
      slots.push(location);
      warn(location, `图位：${spec.slot}`);
      return [];
    }
    // 证据截图仍走原样截图层；该层没有按模式切图功能。
    if (mode === 'evidence') { fail(location, 'evidence 证据截图必须使用单一图片路径，不支持 { dark, light }'); return []; }
    if (Object.keys(spec).some((key) => !['dark', 'light'].includes(key)))
      fail(location, '双版图片对象只能包含 dark、light 两个路径字段');
    return ['dark', 'light'].map((key) => ({ key, src: spec[key], location: `${location}.${key}`,
      dimensions: image(spec[key], `${location}.${key}`) }));
  };
  const hasImage = (spec) => text(spec) || object(spec) && (text(spec.slot) || ['dark', 'light'].some((key) => text(spec[key])));
  let main = null, mainVariants = [];
  if (own(data, 'image')) { mainVariants = imageSpec(data.image, 'image'); main = mainVariants[0]?.dimensions; }
  // 封面可用纯文字海报；若显式提供 image，仍完整校验，不把坏图吞掉。
  else if (['photo', 'evidence'].includes(mode)) fail('image', '此模式必须填写一张 image');
  if (mode === 'cover') {
    mainVariants.forEach(({ src, location, dimensions }) => {
      if (dimensions && dimensions.width <= dimensions.height) fail(location, 'cover 只用一张横图，建议 16:9');
      if (text(src) && !dimensions && !cache.get(src)?.error) fail(location, '无法读取图片宽高，不能确认 cover 使用横图');
    });
  }

  const paras = Array.isArray(data.paragraphs) ? data.paragraphs : [];
  if (own(data, 'paragraphs') && !Array.isArray(data.paragraphs)) fail('paragraphs', '必须是字符串或 {text,image} 对象组成的数组');
  const withImage = [];
  let readingLength = 0;
  paras.forEach((para, i) => {
    const location = `paragraphs[${i}]`;
    if (typeof para !== 'string' && !object(para)) { fail(location, '必须是字符串或 {text,image} 对象'); return; }
    const value = typeof para === 'string' ? para : para.text;
    if (!text(value)) fail(`${location}.text`, '必须填写非空段落文字');
    else {
      readingLength += count(value);
      if (mode === 'reading' && count(value) > 60) warn(`${location}.text`, 'reading 每段建议不超过 60 字');
    }
    const suppliedImage = object(para) && own(para, 'image');
    withImage.push(suppliedImage && hasImage(para.image));
    if (suppliedImage) imageSpec(para.image, `${location}.image`);
  });
  if (mode === 'reading') {
    if (!paras.length) fail('paragraphs', 'reading 必须至少有 1 段文字');
    if (paras.length > 4) warn('paragraphs', 'reading 最多建议 4 段');
    if (readingLength > 180) warn('paragraphs', 'reading 全页正文建议不超过 180 字');
    const imageCount = withImage.filter(Boolean).length;
    if (imageCount > 0 && imageCount !== paras.length) fail('paragraphs', '要么每段都配图，要么都不配');
    if (paras.length > 1 && hasImage(data.image) && imageCount === 0)
      warn('image', '图片不随段落变化，建议每段配图或去掉配图');
    if (imageCount > 0 && own(data, 'image')) warn('image', '已有段落配图，顶层 image 会被忽略');
    if (own(data, 'body')) warn('body', 'reading 正文使用 paragraphs，body 会被忽略');
    if (own(data, 'steps')) {
      if (!Array.isArray(data.steps) || data.steps.length !== paras.length)
        fail('steps', 'reading 的步骤数量必须与段落数量一致');
      else data.steps.forEach((step, i) => {
        if (!object(step)) { fail(`steps[${i}]`, '必须是步骤对象'); return; }
        if (own(step, 'title') && !text(step.title)) fail(`steps[${i}].title`, '必须是非空字符串');
        if (own(step, 'notes') && typeof step.notes !== 'string') fail(`steps[${i}].notes`, '必须是字符串');
      });
    }
  }

  const images = Array.isArray(data.images) ? data.images : [];
  if (own(data, 'images') && !Array.isArray(data.images)) fail('images', '必须是 {image,caption} 对象数组');
  const sizes = images.map((entry, i) => {
    const location = `images[${i}]`;
    if (!object(entry)) { fail(location, '必须是 {image,caption} 对象'); return []; }
    if (own(entry, 'caption')) caption(entry.caption, `${location}.caption`);
    return imageSpec(entry.image, `${location}.image`);
  });
  if (mode === 'gallery') {
    if (images.length < 2 || images.length > 5) fail('images', 'gallery 必须有 2～5 张图片');
    sizes.forEach((variants) => {
      variants.forEach(({ src, location, dimensions: size, key }) => {
        if (!size && text(src) && !cache.get(src)?.error)
          fail(location, '无法读取图片宽高，不能确认同组比例一致');
        // 单图会用于两种模式；双版按各自模式比较，允许一个像素的缩放舍入误差。
        // 第一张可能仍是图位；继续比较其余真实图片，不能因此漏掉比例冲突。
        const firsts = sizes.flat().filter((v) => v.dimensions && (key === 'single' || v.key === 'single' || v.key === key));
        for (const { dimensions: first } of firsts)
          if (size && first && Math.abs(size.width / size.height - first.width / first.height) > Math.max(1 / size.height, 1 / first.height) + 1e-12)
            fail(location, 'gallery 同组图片比例必须一致，建议 4:3');
      });
    });
    if (own(data, 'image')) warn('image', 'gallery 使用 images，顶层 image 会被忽略');
    if (own(data, 'caption')) warn('caption', 'gallery 使用每张图片的 caption，顶层 caption 会被忽略');
  }
  if (mode === 'cover' && (paras.some((p) => object(p) && own(p, 'image')) || images.length))
    fail('image', 'cover 只用一张横图，不要填写 paragraphs 配图或 images');
  if (mode === 'evidence') {
    // 包括 points：现有样张把证据声明放在此字段，不能漏掉。
    const hasOriginalClaim = (value) => typeof value === 'string' ? /原样|未做任何修改|未修改/.test(value)
      : Array.isArray(value) ? value.some(hasOriginalClaim)
      : object(value) && Object.values(value).some(hasOriginalClaim);
    if (slots.length && [data.chips, data.body, data.steps, data.points].some(hasOriginalClaim))
      warn('image', '证据页仍有图位，尚无真实截图；请先删除“原样”“未做任何修改”“未修改”等声明，换成真图并核实后再使用');
    const validAspect = number(data.aspect) && data.aspect > 0;
    if (!validAspect && !main && !slots.includes('image')) fail('aspect', 'evidence 必须填写有效 aspect，或使用能读出宽高的图片');
    if (!own(data, 'aspect') && main)
      warn('aspect', `已读取原图比例 ${(main.width / main.height).toFixed(4)}；建议显式填写 aspect，引擎不会自动读取宽高，省略时按 1.95 显示`);
    if (validAspect && main && Math.abs(data.aspect / (main.width / main.height) - 1) > 0.01)
      warn('aspect', 'aspect 与原图宽高比相差超过 1%，证据截图可能被拉伸；请填写原始比例');
    if (own(data, 'grade')) warn('grade', 'evidence 不使用氛围调色，grade 会被忽略');
  }
}
