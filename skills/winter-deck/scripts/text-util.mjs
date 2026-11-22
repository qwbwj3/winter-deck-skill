// 通用小工具：弹簧、阻尼、数字格式、文案模板
export class Spring {
  constructor(v = 0, k = 120, z = 0.8) { this.v = v; this.t = v; this.vel = 0; this.k = k; this.c = 2 * z * Math.sqrt(k); }
  step(dt) { const a = this.k * (this.t - this.v) - this.c * this.vel; this.vel += a * dt; this.v += this.vel * dt; }
  snap(v) { this.v = this.t = v; this.vel = 0; }
}
export class Spring3 {
  constructor(v, k, z) { this.s = [0, 1, 2].map((i) => new Spring(v[i], k, z)); }
  set(v) { this.s.forEach((s, i) => (s.t = v[i])); }
  snap(v) { this.s.forEach((s, i) => s.snap(v[i])); }
  step(dt) { this.s.forEach((s) => s.step(dt)); }
  get() { return this.s.map((s) => s.v); }
}
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
export const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

// 缺值标记：变量没有值（数据里没有、或这种情况下这句话不成立）时填它，引擎再把含它的那一行 / 那一句删掉
export const MISSING = '\u0000';
const nf0 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
// 数字显示：≥1000 加千分位并取整；其余保留 1 位小数（整数原样）
export function numStr(v) {
  if (!Number.isFinite(v)) return MISSING;
  if (Math.abs(v) >= 1000) return nf0.format(Math.round(v));
  return Number.isInteger(v) ? String(v) : fmt(v);
}
// 百分比显示：不为 0 但小到会被四舍五入成 0 的，写成 "<0.1" / "<1"，不让人误以为是 0
export function pctStr(p, digits = 0) {
  if (!Number.isFinite(p)) return MISSING;
  const r = Math.round(p * 10 ** digits) / 10 ** digits;
  if (p > 0 && r === 0) return '<' + (digits ? (1 / 10 ** digits).toString() : '1');
  if (p < 0 && r === 0) return '>-' + (digits ? (1 / 10 ** digits).toString() : '1');
  return digits ? r.toFixed(digits).replace(/\.0+$/, '') : String(r);
}

// "{focus.name}比目标低 {gap} 个点" → 用 vars 填。没有值的变量填 MISSING（不露出花括号、不留空格）
export function fill(str, vars) {
  if (typeof str !== 'string') return '';
  return str.replace(/\{([\w.]+)\}/g, (m, path) => {
    let v = vars;
    for (const k of path.split('.')) { v = v == null ? undefined : v[k]; }
    if (v == null || v === '' || v === '—') return MISSING;
    if (typeof v === 'number') return numStr(v);
    const t = String(v);
    return /NaN|Infinity|undefined/.test(t) ? MISSING : t;
  });
}

// 删掉含缺值标记的部分：标题按行删，正文按句删；全删光时返回 fallback
export function prune(text, mode, fallback = '') {
  if (typeof text !== 'string' || !text.includes(MISSING)) return text;
  const parts = mode === 'lines' ? text.split('\n') : text.split(/(?<=[。；！？!?;])/);
  const keep = parts.filter((p) => !p.includes(MISSING));
  const out = keep.join(mode === 'lines' ? '\n' : '').replace(/[，,、]\s*$/, '');
  return out.trim() ? out : fallback;
}
// 标签（chips 的 HTML）里含缺值标记的那一枚整个去掉
export const pruneChips = (html) => (typeof html === 'string' ? html.replace(/<span class="[^"]*">(?:(?!<\/span>).)*\u0000(?:(?!<\/span>).)*?<\/span>/g, '').replace(/\u0000/g, '') : html);

// 趋势达标点：此后再没掉出目标的第一个下标；先达标后又跌破的不算。返回 { index, always } 或 null
export function reachIndex(values, target, better = 'up') {
  const met = (x) => (better === 'down' ? +x <= target : +x >= target);
  let miss = -1; values.forEach((x, i) => { if (!met(x)) miss = i; });
  return miss + 1 < values.length ? { index: miss + 1, always: miss < 0 } : null;
}
