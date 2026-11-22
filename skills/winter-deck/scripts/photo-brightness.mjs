// 氛围照片亮度检查：只解码 sips 生成的小 BMP，不安装依赖、不改写原图。
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0;

// 读取未压缩 24/32 位 BMP；行填充、上下方向均不影响全图平均值。
// 与照片 shader 一致，使用归一化 RGB 加权亮度，而非线性化的 WCAG 对比度。
export function bmpBrightness(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 54 || buffer.toString('ascii', 0, 2) !== 'BM')
    throw new Error('不是完整的 BMP 图片');
  const offset = buffer.readUInt32LE(10), header = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18), height = Math.abs(buffer.readInt32LE(22));
  const bits = buffer.readUInt16LE(28), compression = buffer.readUInt32LE(30);
  if (header < 40 || 14 + header > buffer.length || offset < 14 + header || width <= 0 || height <= 0 ||
      buffer.readUInt16LE(26) !== 1 || ![24, 32].includes(bits) || compression !== 0)
    throw new Error('不支持的 BMP 像素格式');
  const stride = Math.ceil(width * bits / 32) * 4;
  if (!Number.isSafeInteger(stride * height) || offset + stride * height > buffer.length)
    throw new Error('BMP 像素数据截断');
  let sum = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = offset + y * stride + x * bits / 8;
    sum += buffer[p + 2] * .2126 + buffer[p + 1] * .7152 + buffer[p] * .0722;
  }
  return sum / (width * height * 255);
}

export function measurePhotoBrightness(file) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deck-photo-brightness-'));
  try {
    const output = path.join(tmp, 'photo.bmp');
    execFileSync('/usr/bin/sips', ['-s', 'format', 'bmp', '-Z', '64', file, '--out', output],
      { stdio: 'pipe', timeout: 15000, maxBuffer: 1024 * 1024 });
    return bmpBrightness(readFileSync(output));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// 对应 components/media.js 实际创建照片面板的槽位，忽略未使用的顶层图。
export function photoImageSlots(data) {
  if (data?.component !== 'media') return [];
  if (['cover', 'photo'].includes(data.mode)) return [{ image: data.image, location: 'image' }];
  if (data.mode === 'gallery') return (Array.isArray(data.images) ? data.images : [])
    .map((entry, i) => ({ image: entry?.image, location: `images[${i}].image` }));
  if (data.mode === 'reading') {
    const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
    const slots = paragraphs.flatMap((p, i) => object(p) && p.image
      ? [{ image: p.image, location: `paragraphs[${i}].image` }] : []);
    return slots.length ? slots : data.image ? [{ image: data.image, location: 'image' }] : [];
  }
  return [];
}

export function validatePhotoBrightness(data, {
  root, presets, warn, platform = process.platform, measure = measurePhotoBrightness, cache = new Map(),
}) {
  // 与 build.mjs 对齐：省略 presets 时会打包目录内全部预设，preset 只决定默认风格。
  const ids = Array.isArray(data.presets) ? data.presets : null;
  if (!presets.some((p) => (!ids || ids.includes(p?.id)) && p?.scheme === 'light')) return;
  for (const slot of photoImageSlots(data)) {
    const paired = object(slot.image);
    const src = paired ? slot.image.light : slot.image;
    if (!text(src) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src) || path.isAbsolute(src)) continue;
    const location = slot.location + (paired ? '.light' : '');
    if (platform !== 'darwin') {
      warn(location, '照片亮度未检查：当前系统不是 macOS，未运行 sips');
      continue;
    }
    const file = path.resolve(root, src);
    if (!cache.has(file)) {
      try {
        const value = measure(file);
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
          throw new Error('亮度结果无效');
        cache.set(file, { value });
      } catch { cache.set(file, { error: true }); }
    }
    const result = cache.get(file);
    if (result.error) warn(location, `照片亮度未检查：图片读取或 sips 转换失败（${src}）`);
    else if (result.value < (paired ? .45 : .35))
      warn(location, paired
        ? `light 版照片偏暗，平均亮度 ${result.value.toFixed(3)} < 0.45，建议换用更明亮的 light 版`
        : `照片偏暗，与明亮模式不搭，建议提供 { dark, light } 两版（平均亮度 ${result.value.toFixed(3)} < 0.35）`);
  }
}
