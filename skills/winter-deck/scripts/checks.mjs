// 浏览器内检查与 PNG 检查；仅依赖 Node 内置模块。
import { inflateSync } from 'node:zlib';

// 必须保持自包含：通过 CDP 将函数序列化后在页面内执行。
export function inspectPage() {
  const box = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height,
    left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    const own = getComputedStyle(el);
    if (own.visibility === 'hidden' || own.visibility === 'collapse') return false;
    let opacity = 1;
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.contentVisibility === 'hidden') return false;
      opacity *= Number(s.opacity);
    }
    return opacity > 0.05;
  };
  // Range 只取可见文本的行矩形，再合成文字包围盒，不使用块级容器的宽度。
  const textRects = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!text.textContent.trim() || !visible(text.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(box(r));
    }
    return rects;
  };
  const textBox = (el) => {
    const rects = textRects(el);
    if (!rects.length) return box(el.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom));
    return { x: left, y: top, left, top, right, bottom, width: right - left, height: bottom - top };
  };
  const copySelector = '#eyebrow, #title, #body, #chips .chip';
  const labelSelector = '.val, .name, .slab, .tlabel';
  const selector = `[data-safe], ${copySelector}, ${labelSelector}`;
  const nodes = [...document.querySelectorAll(selector)]
    // 即使 .copy 带有 data-safe，也不把整个文字栏纳入检查。
    // 空的文字栏元素（比如这一步没有正文）看不见，不参与检查
    .filter((el) => !el.matches('.copy') && visible(el) && !(el.matches(copySelector) && !el.textContent.trim()));
  const elements = nodes.map((el, i) => ({
    key: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}[${i}]`,
    text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 200),
    rect: textBox(el),
  }));
  // 遮挡：空间里前后叠放的实心卡片（2D 页型的 .pp-card），前面那张不透明、而且明显更靠前时，
  // 后面那张被挡住的部分本来就看不见，不算文字冲突。同一深度的卡片互相压到仍然算失败。
  const effOpacity = (el) => { let o = 1; for (let p = el; p; p = p.parentElement) o *= Number(getComputedStyle(p).opacity); return o; };
  const solid = (el) => {
    if (!el.classList.contains('pp-card')) return false;
    const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
    const alpha = m ? (m[1].split(',')[3] === undefined ? 1 : Number(m[1].split(',')[3])) : 0;
    return alpha >= 0.99 && effOpacity(el) >= 0.95;
  };
  const zOf = (el) => { const z = parseInt(getComputedStyle(el).zIndex, 10); return Number.isFinite(z) ? z : 0; };
  // 卡片溢出：2D 卡片里的文字超出卡片边框（按透视变换后的屏幕位置比）
  const cardOverflow = [];
  for (const card of document.querySelectorAll('.pp-card')) {
    if (!visible(card)) continue;
    // 没有底色的卡片（金句）看不出边界，不算溢出
    const bg = getComputedStyle(card).backgroundColor; if (/rgba\([^)]*,\s*0\)|transparent/.test(bg)) continue;
    const cr = card.getBoundingClientRect();
    for (const t of textRects(card)) {
      const out = Math.max(cr.left - t.left, t.right - cr.right, cr.top - t.top, t.bottom - cr.bottom);
      if (out > 4) { cardOverflow.push({ card: [...card.classList].join('.'), text: card.textContent.trim().slice(0, 40), out: Math.round(out) }); break; }
    }
  }
  const occluded = [];
  const overlaps = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
    const zi = zOf(nodes[i]), zj = zOf(nodes[j]);
    if ((zi - zj >= 10 && solid(nodes[i])) || (zj - zi >= 10 && solid(nodes[j]))) { occluded.push({ a: elements[i].key, b: elements[j].key }); continue; }
    const a = elements[i].rect, b = elements[j].rect;
    const area = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const ratio = area / Math.min(a.width * a.height, b.width * b.height);
    if (ratio > 0.08) overlaps.push({ a: elements[i].key, b: elements[j].key,
      aText: elements[i].text, bText: elements[j].text, area, ratio });
  }
  const nearCopy = [];
  for (let i = 0; i < nodes.length; i++) {
    if (!nodes[i].matches(labelSelector)) continue;
    for (let j = 0; j < nodes.length; j++) {
      if (!nodes[j].matches(copySelector) || nodes[i] === nodes[j] ||
          nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
      const a = elements[i].rect, b = elements[j].rect;
      // 水平投影相交时距离为 0；不按垂直位置过滤。
      const distance = Math.max(0, a.left - b.right, b.left - a.right);
      if (distance < 24) nearCopy.push({ label: elements[i].key, copy: elements[j].key,
        labelText: elements[i].text, copyText: elements[j].text, distance });
    }
  }
  // 对比度只检查版式区和 3D 标签中的直接文字，不重复检查整块容器。
  // 与 inspectPage 一起序列化进入浏览器，不能依赖模块外的函数。
  const parseColor = (value) => {
    const s = String(value || '').trim().toLowerCase();
    if (s === 'transparent') return [0, 0, 0, 0];
    const hex = s.match(/^#([\da-f]{3,8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
      if (h.length === 6 || h.length === 8) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1);
    }
    // Chrome 的 color-mix(in srgb, ...) 计算值也可能保留为 color(srgb ...)。
    const m = s.match(/^(rgba?|color)\((.*)\)$/);
    if (!m || m[1] === 'color' && !m[2].startsWith('srgb ')) return null;
    const srgb = m[1] === 'color';
    const parts = m[2].replace(/^srgb\s+/, '').trim().split(/[\s,/]+/);
    if (parts.length < 3 || parts.length > 4) return null;
    const c = parts.map((v, i) => parseFloat(v) / (v.endsWith('%') ? 100 : i < 3 && !srgb ? 255 : 1));
    if (!c.every(Number.isFinite)) return null;
    if (c.length === 3) c.push(1);
    return c.map((v) => Math.max(0, Math.min(1, v)));
  };
  const over = (fg, bg) => {
    const a = fg[3] + bg[3] * (1 - fg[3]);
    return fg.slice(0, 3).map((v, i) => a ? (v * fg[3] + bg[i] * bg[3] * (1 - fg[3])) / a : 0).concat(a);
  };
  const bodyStyle = document.body ? getComputedStyle(document.body) : null;
  const deck = globalThis.window?.__deck;
  const presetBg = parseColor(bodyStyle?.getPropertyValue?.('--bg')) || parseColor(deck?.colors?.bg || deck?.data?.colors?.bg);
  const canvasBg = presetBg ? over(presetBg, [1, 1, 1, 1]) : [1, 1, 1, 1];
  const backgroundAt = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const c = parseColor(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      // 第一个不透明底色已遮住后面的背景；半透明底色继续与下一层合成。
      if (c?.[3] === 1) break;
    }
    if (!layers.length && bodyStyle) {
      const c = parseColor(bodyStyle.backgroundColor); if (c) layers.push(c);
    }
    return layers.reduceRight((bg, c) => over(c, bg), canvasBg);
  };
  // SVG 背景是绘制在文字之前的兄弟图形，不能只沿 DOM 祖先找 CSS 底色。
  // 采样点是屏幕坐标，先逆变换到各图形局部坐标，再由浏览器做真实填充命中判断。
  const svgBackgrounds = (el, base) => {
    const svg = el.ownerSVGElement;
    if (!svg?.querySelectorAll) return [base];
    const root = { el: svg, children: [] }, groups = new Map([[svg, root]]);
    const groupFor = (node) => {
      if (groups.has(node)) return groups.get(node);
      const parent = groupFor(node.parentElement);
      const group = { el: node, children: [] };
      groups.set(node, group); parent.children.push(group); return group;
    };
    for (const shape of svg.querySelectorAll('*')) {
      // tspan/textPath 也不能把所属 text 之后的图形算进背景。
      if (shape === el || /^(text|textpath)$/i.test(shape.localName || '') && shape.contains(el)) break;
      if (shape.ownerSVGElement !== svg || typeof shape.isPointInFill !== 'function') continue;
      if (shape.closest?.('defs, clipPath, mask, marker, pattern, symbol')) continue;
      let hidden = false;
      for (let p = shape; p && p !== svg.parentElement; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || s.contentVisibility === 'hidden') { hidden = true; break; }
      }
      if (hidden) continue;
      const s = getComputedStyle(shape);
      const fill = parseColor(String(s.fill).toLowerCase() === 'currentcolor' ? s.color : s.fill);
      if (!fill) continue;
      const fillOpacity = parseFloat(s.fillOpacity);
      fill[3] *= Number.isFinite(fillOpacity) ? fillOpacity : 1;
      if (!fill[3]) continue;
      const parent = groupFor(shape.parentElement);
      parent.children.push({ el: shape, fill, children: [] });
    }
    const r = el.getBoundingClientRect();
    const points = [[.5, .5], [.25, .5], [.75, .5], [.5, .25], [.5, .75]]
      .map(([x, y]) => ({ x: r.left + r.width * x, y: r.top + r.height * y }));
    const paint = (node, point) => {
      let color = [0, 0, 0, 0];
      if (node.fill) {
        try {
          const matrix = node.el.getScreenCTM();
          if (matrix) {
            const p = svg.createSVGPoint(); p.x = point.x; p.y = point.y;
            if (node.el.isPointInFill(p.matrixTransform(matrix.inverse()))) color = node.fill.slice();
          }
        } catch { /* 不可逆变换/不可绘制图形不能覆盖文字采样点。 */ }
      }
      for (const child of node.children) color = over(paint(child, point), color);
      // 组先合成再应用组透明度，避免半透明组中的重叠图形被重复乘 alpha。
      const opacity = parseFloat(getComputedStyle(node.el).opacity);
      color[3] *= Number.isFinite(opacity) ? opacity : 1;
      return color;
    };
    return points.map((p) => over(paint(root, p), base));
  };
  const luminance = (c) => c.slice(0, 3).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = [];
  const vw = globalThis.innerWidth || document.documentElement?.clientWidth || 1920;
  const vh = globalThis.innerHeight || document.documentElement?.clientHeight || 1080;
  for (const el of document.querySelectorAll('.bd, .bd *, #labels *')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !visible(el)) continue;
    const text = [...(el.childNodes || [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    const r = el.getBoundingClientRect(), opacity = effOpacity(el);
    if (opacity < 0.85 || r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) continue;
    const s = getComputedStyle(el);
    // SVG 实际用 fill 绘字；仅 currentColor 回退到 CSS color，不能把 none 当文字色。
    const svgText = el.namespaceURI === 'http://www.w3.org/2000/svg' && /^(text|tspan|textpath)$/i.test(el.localName || el.tagName);
    const paint = svgText ? (String(s.fill).toLowerCase() === 'currentcolor' ? s.color : s.fill) : s.color;
    const fg = parseColor(paint);
    if (!fg) continue;
    fg[3] *= opacity;
    const backgrounds = svgText ? svgBackgrounds(el, backgroundAt(el)) : [backgroundAt(el)];
    // 多点中取最差对比度，文字部分落在图形外时不能被中心点的好结果掩盖。
    const samples = backgrounds.map((bg) => {
      const a = luminance(over(fg, bg)), b = luminance(bg);
      return { bg, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
    const { bg, ratio } = samples.reduce((a, b) => a.ratio <= b.ratio ? a : b);
    const size = parseFloat(s.fontSize), weight = s.fontWeight === 'bold' ? 700 : parseFloat(s.fontWeight);
    const threshold = size >= 24 || size >= 18.66 && weight >= 700 ? 3 : 4.5;   // WCAG 大字：18pt，或 14pt 粗体
    contrast.push({ text: [...text].slice(0, 12).join(''), ratio, threshold, opacity,
      color: fg, background: bg, fontSize: size, fontWeight: weight });
  }
  const stage = document.querySelector('#stage');
  const stageRect = stage ? box(stage.getBoundingClientRect()) : null;
  const outside = stageRect ? elements.filter(({ rect: r }) =>
    r.left < stageRect.left || r.top < stageRect.top ||
    r.right > stageRect.right || r.bottom > stageRect.bottom) : [];
  // 墨色右栏：逐个量内容后代及其文本，不仅量可能已经缩小的板面外框。
  const inkReservationOverflow = [];
  if (stageRect && document.body?.dataset?.family === 'ink' && document.body.dataset.inkTitle === 'vertical') {
    const scale = stageRect.width / 1920;
    const copyRects = ['#title', '#body'].map(s => document.querySelector(s)).filter(n => n?.textContent?.trim() && visible(n)).map(n => n.getBoundingClientRect());
    const left = Math.min(...copyRects.map(r => r.left));
    const limit = left - 32 * scale;
    for (const node of document.querySelectorAll('.ink-content-zone *, .page-box [data-safe]')) {
      if (!visible(node)) continue;
      const r = node.getBoundingClientRect(), text = textBox(node);
      const right = Math.max(r.right, text.right);
      if (right > limit + .05) inkReservationOverflow.push({ tag: node.tagName, text: node.textContent?.trim().slice(0, 48) || '', right: (right - stageRect.left) / scale, limit: (limit - stageRect.left) / scale });
    }
  }
  const title = document.querySelector('#title');
  const rects = title && visible(title) ? textRects(title) : [];
  // 兼容逐字 span 标题，不能把每个 span 的矩形都当成一行。
  const heights = rects.map((r) => r.height).sort((a, b) => a - b);
  const tolerance = Math.max(2, (heights[Math.floor(heights.length / 2)] || 0) * 0.45);
  const rows = [];
  for (const r of rects.sort((a, b) => a.top - b.top)) {
    const y = r.top + r.height / 2;
    if (!rows.some((v) => Math.abs(v - y) <= tolerance)) rows.push(y);
  }
  return { stage: stageRect, stageLayout: stage ? { width: stage.offsetWidth, height: stage.offsetHeight } : null,
    selector, elements, overlaps, occluded, cardOverflow, nearCopy, outside, contrast, inkReservationOverflow, title: { text: title?.textContent?.trim() || '', lines: rows.length },
    err: document.querySelector('#err')?.textContent?.trim() || '',
    // 文字语义：引擎记录的缺值、方向矛盾；再兜底查露出来的模板痕迹
    textIssues: [...(globalThis.window?.__deck?.issues?.() || []), ...(/\{[\w.]+\}|NaN|undefined|Infinity/.test(document.querySelector('.copy')?.innerText || '') ? ['文字里露出了未填的变量或 NaN'] : [])] };
}

export function inspectGpu() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return { webgl2: false, renderer: null, unmaskedRenderer: null, vendor: null };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const info = { webgl2: true, renderer: gl.getParameter(gl.RENDERER),
    unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) };
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return info;
}

// Chrome 截图是非交错 8-bit RGB/RGBA PNG。实现全部五种 PNG 行滤波。
export function pngBrightness(png) {
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    throw new Error('截图不是 PNG');
  let width, height, channels;
  const chunks = [];
  for (let p = 8; p < png.length;) {
    if (p + 12 > png.length) throw new Error('PNG 数据截断');
    const len = png.readUInt32BE(p), type = png.toString('ascii', p + 4, p + 8);
    if (p + len + 12 > png.length) throw new Error('PNG 块数据截断');
    const data = png.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      channels = data[9] === 2 ? 3 : data[9] === 6 ? 4 : 0;
      if (data[8] !== 8 || !channels || data[10] !== 0 || data[11] !== 0 || data[12] !== 0)
        throw new Error('暂只支持 Chrome 的非交错 8-bit RGB/RGBA PNG');
    }
    if (type === 'IDAT') chunks.push(data);
    p += len + 12;
    if (type === 'IEND') break;
  }
  if (!width || !height || !channels || width * height > 100_000_000) throw new Error('PNG 尺寸无效或过大');
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height });
  if (raw.length !== (stride + 1) * height) throw new Error('PNG 像素数据长度错误');
  const x0 = Math.floor(width * 0.25), x1 = Math.ceil(width * 0.75);
  const y0 = Math.floor(height * 0.25), y1 = Math.ceil(height * 0.75);
  let previous = Buffer.alloc(stride), sum = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const row = Buffer.allocUnsafe(stride), filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error(`未知 PNG 滤波类型：${filter}`);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0, b = previous[x];
      const c = x >= channels ? previous[x - channels] : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      row[x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
    if (y >= y0 && y < y1) for (let x = x0; x < x1; x++) {
      const i = x * channels, alpha = channels === 4 ? row[i + 3] / 255 : 1;
      sum += (0.2126 * row[i] + 0.7152 * row[i + 1] + 0.0722 * row[i + 2]) * alpha;
    }
    previous = row;
  }
  return { width, height, region: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    mean: sum / ((x1 - x0) * (y1 - y0)), threshold: 3 };
}

export function stepFindings(dom, brightness, logs = [], stepNumber = 1) {
  const findings = [];
  const add = (severity, code, message, details) => findings.push({ severity, code, message, details });
  if (logs.length) add('失败', 'page-errors', `控制台或页面异常共 ${logs.length} 条`, logs);
  if (dom.err) add('失败', 'err-element', '#err 有错误内容', dom.err);
  if (!dom.stage || dom.stage.width <= 0 || dom.stage.height <= 0)
    add('失败', 'missing-stage', '缺少有尺寸的 #stage，无法检查舞台边界');
  if (dom.overlaps.length) add('失败', 'text-overlap', `发现 ${dom.overlaps.length} 组文字包围盒重叠`, dom.overlaps);
  { const t = dom.behindCopy?.tileMax ?? 0; if (t > 0.08) add(t > 0.15 ? '失败' : '警告', 'object-behind-copy', `左侧文字背后有画面物体或别的标签（最密的一格强边缘占 ${(t * 100).toFixed(0)}%），文字可能压在上面`, dom.behindCopy); }
  if (dom.inkReservationOverflow?.length) add('失败', 'ink-reservation-overflow', `${dom.inkReservationOverflow.length} 个内容子元素进入墨色右栏32px安全带`, dom.inkReservationOverflow);
  if (dom.cardOverflow?.length) add('失败', 'card-overflow', `${dom.cardOverflow.length} 张卡片里的文字超出了卡片边框（文字太长，按页型字数上限缩短）`, dom.cardOverflow);
  for (const c of dom.contrast || []) if (c.ratio < c.threshold)
    add('失败', 'text-contrast', `第 ${stepNumber} 步 /「${c.text}」/ 对比度 ${c.ratio.toFixed(2)}:1 / 阈值 ${c.threshold}:1`, c);
  if (dom.textIssues?.length) add('失败', 'text-semantics', '文字和数据对不上：' + dom.textIssues.join('；'), dom.textIssues);
  if (dom.nearCopy?.length) add('警告', 'label-near-copy', `发现 ${dom.nearCopy.length} 组跟随标签离左侧文字的水平距离不足 24px`, dom.nearCopy);
  if (dom.outside.length) add('失败', 'outside-stage', `发现 ${dom.outside.length} 个文字元素超出舞台`, dom.outside);
  if (dom.title.lines > 2) add('警告', 'title-lines', `标题共 ${dom.title.lines} 行，超过 2 行`);
  // 深色版式页中间本来就主要是文字：中间区域有可见文字时不算黑屏
  const W = brightness.width || 1600, H = brightness.height || 900;
  const centerText = (dom.elements || []).some(({ key, rect: r }) => /\.bd\b|\.pp-card/.test(key) || (r.right > W * 0.25 && r.left < W * 0.75 && r.bottom > H * 0.25 && r.top < H * 0.75 && r.width > 4));
  if (brightness.mean < 3 && !centerText) add('失败', 'black-frame', `截图中心区域平均亮度 ${brightness.mean.toFixed(3)}，低于 3`, brightness);
  return findings;
}

// 与截图 CLI 共用最终退出码规则；警告不会令进程失败。
export function reportExitCode(report) {
  return report.findings.some((f) => f.severity === '失败') ||
    report.steps.some((s) => s.status === '失败' || s.findings.some((f) => f.severity === '失败')) ? 1 : 0;
}


// 文字背后有没有 3D 物体：把左侧文字隐藏后截下文字区域，算边缘密度（物体轮廓、线条会形成大量强边缘；
// 地面渐变、暗角、零星浮尘很少）。返回强边缘像素占比与平均梯度。
export function pngEdges(png, masks = null) {
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('截图不是 PNG');
  let width, height, channels; const chunks = [];
  for (let p = 8; p < png.length;) {
    const len = png.readUInt32BE(p), type = png.toString('ascii', p + 4, p + 8), data = png.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 2 ? 3 : data[9] === 6 ? 4 : 0; }
    if (type === 'IDAT') chunks.push(data);
    p += len + 12; if (type === 'IEND') break;
  }
  const stride = width * channels, raw = inflateSync(Buffer.concat(chunks));
  const L = new Float32Array(width * height); let prev = Buffer.alloc(stride);
  const paeth = (a, b, c) => { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? row[i - channels] : 0, b = prev[i], c = i >= channels ? prev[i - channels] : 0;
      row[i] = (row[i] + (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0)) & 255;
    }
    for (let x = 0; x < width; x++) { const o = x * channels; L[y * width + x] = row[o] * 0.2126 + row[o + 1] * 0.7152 + row[o + 2] * 0.0722; }
    prev = row;
  }
  // 切成 48px 小格统计：局部压字（物体只占文字区一角）也能抓到，取最满那格
  const T = 48, tw = Math.ceil(width / T), th = Math.ceil(height / T), ts = new Uint32Array(tw * th), tn = new Uint32Array(tw * th);
  let strong = 0, sum = 0, n = 0;
  for (let y = 0; y < height - 1; y++) for (let x = 0; x < width - 1; x++) {
    const i = y * width + x, g = Math.abs(L[i + 1] - L[i]) + Math.abs(L[i + width] - L[i]);
    const t = ((y / T) | 0) * tw + ((x / T) | 0); tn[t]++;
    sum += g; n++; if (g > 14) { strong++; ts[t]++; }
  }
  // masks：只统计落在具体文字元素区域里的格子（各元素之间的空白不算）
  const inMask = (t) => { if (!masks) return true; const cx = ((t % tw) + 0.5) * T, cy = (((t / tw) | 0) + 0.5) * T; return masks.some(([x0, y0, x1, y1]) => cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1); };
  let tileMax = 0; for (let t = 0; t < ts.length; t++) if (tn[t] > T * T * 0.5 && inMask(t)) tileMax = Math.max(tileMax, ts[t] / tn[t]);
  return { width, height, strongRatio: n ? strong / n : 0, tileMax, meanGrad: n ? sum / n : 0 };
}
