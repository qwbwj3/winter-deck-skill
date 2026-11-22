#!/usr/bin/env node
// 纯 Node.js 数据校验；仅复用无 DOM 的文字工具，不加载组件、不启动浏览器。
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMedia } from './media-validation.mjs';
import { validatePhotoBrightness } from './photo-brightness.mjs';
import { fill, prune, MISSING, numStr, pctStr, reachIndex } from './text-util.mjs';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = JSON.parse(readFileSync(path.join(SKILL, 'runtime', 'manifest.json'), 'utf8'));
const own = (object, key) => object != null && Object.hasOwn(object, key);
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const number = (v) => typeof v === 'number' && Number.isFinite(v);
// 打包适配与校验共用：只识别明确贴合满分差额、却不贴合目标缺口的有效拆分。
// 不推翻显式配置；自动焦点按最小值选，并列取第一项，与 compare-bars 一致。
export function hasMaxBasedBreakdown(deck) {
  if (deck?.component !== 'compare-bars' || own(deck, 'breakdownBase')) return false;
  const max = deck.max ?? 100, target = deck.target?.value, items = deck.items;
  if (!number(max) || max <= 0 || !number(target) || target < 0 || target > max
    || !Array.isArray(items) || !items.length
    || !items.every((item) => number(item?.value) && item.value >= 0 && item.value <= max)) return false;
  let fi = deck.focus;
  if (!own(deck, 'focus') || fi === 'auto') {
    fi = 0;
    items.forEach((item, i) => { if (item.value < items[fi].value) fi = i; });
  }
  if (!Number.isInteger(fi) || fi < 0 || fi >= items.length) return false;
  const focus = items[fi], parts = focus.breakdown;
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 5
    || !parts.every((part) => number(part?.value) && part.value > 0)) return false;
  const sum = parts.reduce((total, part) => total + part.value, 0);
  return Math.abs(sum - (max - focus.value)) <= 1 && Math.abs(sum - (target - focus.value)) > 1;
}
const validateBetter = (holder, fail, location = 'better') => {
  if (own(holder, 'better') && !['up', 'down', ''].includes(holder.better))
    fail(location, '只能为 "up"、"down" 或空字符串');
};
// 对应 components/compare-bars.js 的 vars()；详细来源见 references/compare-bars.md。
export const TEMPLATE_VARIABLES = Object.freeze([
  'n', 'pass', 'fail', 'unit', 'target', 'gap', 'max', 'maxLabel', 'okName', 'badName',
  'focus', 'focus.code', 'focus.name', 'focus.value', 'focus.breakdown',
  'top', 'top.name', 'top.value', 'top.share', 'top.index',
]);
// 对应 components/funnel.js 的 vars()；不复用 compare-bars 的变量或自定义字段。
export const FUNNEL_TEMPLATE_VARIABLES = Object.freeze([
  'n', 'unit', 'first', 'first.name', 'first.value', 'last', 'last.name', 'last.value',
  'overall', 'totalLost', 'focus', 'focus.from', 'focus.to', 'focus.rate', 'focus.lost',
  'focus.lostShare', 'okName', 'badName',
]);
const hasPath = (value, keys) => {
  for (const key of keys) {
    if (!own(value, key)) return false;
    value = value[key];
  }
  return true;
};

// 单个变量也走运行时 fill，保证 null、空串、破折号及非有限数的缺值语义一致。
// 未知变量仍由各页型报告失败，不能再误报成普通缺值警告。
function warnMissingVariables(text, location, vars, allowed, warn, messageFor) {
  const variables = new Set([...text.matchAll(/\{([\w.]+)\}/g)].map((match) => match[1]));
  const messages = new Set();
  for (const variable of variables) {
    if (!allowed(variable) || !fill(`{${variable}}`, vars).includes(MISSING)) continue;
    const message = messageFor?.(variable) ?? `模板变量 {${variable}} 在当前数据下为空，该句会被省略`;
    if (!messages.has(message)) warn(location, message);
    messages.add(message);
  }
}
// 长度只统计实际会显示的标题，缺值行和数值格式与运行时相同。
const renderedTitle = (text, vars) => prune(fill(text, vars), 'lines');

// 漏斗专项与 compare-bars 分开，保持既有校验行为不变。
function validateFunnel(deck, presets, fail, warn) {
  const stages = Array.isArray(deck.stages) ? deck.stages : [];
  if (!Array.isArray(deck.stages) || stages.length < 3 || stages.length > 6)
    fail('stages', '必须是包含 3～6 个环节的数组');
  stages.forEach((stage, i) => {
    const location = `stages[${i}]`;
    if (!object(stage)) { fail(location, '必须是对象'); return; }
    if (typeof stage.name !== 'string' || !stage.name.trim()) fail(`${location}.name`, '必须填写非空环节名');
    if (!number(stage.value) || stage.value < 0)
      fail(`${location}.value`, '必须是非负的有限数字（不能用数字字符串）');
    if (i === 0 && number(stage.value) && stage.value <= 0) fail(`${location}.value`, '首层数值必须大于 0');
    if (i > 0 && number(stage.value) && number(stages[i - 1]?.value) && stage.value > stages[i - 1].value)
      fail(`${location}.value`, '必须逐层不增，后一层不能大于前一层');
  });
  if (own(deck, 'focusBy') && !['rate', 'lost'].includes(deck.focusBy)) fail('focusBy', '只能为 "rate" 或 "lost"');
  if (own(deck, 'focus') && (!Number.isInteger(deck.focus) || deck.focus < 1 || deck.focus >= stages.length))
    fail('focus', '必须是 1～stages.length−1 的整数（转入环节的下标）');
  for (const key of ['eyebrow', 'unit', 'keepLabel', 'lostLabel', 'keepRateLabel'])
    if (own(deck, key) && typeof deck[key] !== 'string') fail(key, '必须是字符串');

  // 与组件相同：按原始比例选焦点，不能按显示后的百分数选；并列保留第一步。
  const v = stages.map((stage) => number(stage?.value) ? Math.max(0, stage.value) : 0);
  const rates = v.map((x, i) => i === 0 ? 1 : v[i - 1] > 0 ? x / v[i - 1] : 0);
  const lost = v.map((x, i) => i === 0 ? 0 : Math.max(0, v[i - 1] - x));
  let fi = 1;
  for (let i = 2; i < stages.length; i++)
    if (deck.focusBy === 'lost' ? lost[i] > lost[fi] : rates[i] < rates[fi]) fi = i;
  if (Number.isInteger(deck.focus) && deck.focus >= 1 && deck.focus < stages.length) fi = deck.focus;
  const fc = (value) => new Intl.NumberFormat('zh-CN').format(Math.round(value));
  const pct = (ratio) => { const p = ratio * 100; return p < 10 ? pctStr(p, 1) : pctStr(p, 0); };
  const totalLost = (v[0] ?? 0) - (v.at(-1) ?? 0);
  const colors = presets.find((p) => p?.id === deck.preset)?.colors;
  const vars = {
    n: stages.length, unit: deck.unit ?? '',
    first: { name: stages[0]?.name, value: fc(v[0] ?? 0) },
    last: { name: stages.at(-1)?.name, value: fc(v.at(-1) ?? 0) },
    overall: pct(v[0] > 0 ? v.at(-1) / v[0] : 0), totalLost: fc(totalLost),
    focus: { from: stages[fi - 1]?.name, to: stages[fi]?.name, rate: pct(rates[fi] ?? 0), lost: fc(lost[fi] ?? 0),
      lostShare: totalLost > 0 ? pctStr(lost[fi] / totalLost * 100) : undefined },
    okName: colors?.okName, badName: colors?.badName,
  };
  const known = new Set(FUNNEL_TEMPLATE_VARIABLES);
  const names = [...new Set(stages.map((stage) => stage?.name).filter((name) => typeof name === 'string' && name.trim()))];
  const checkTemplate = (value, location, checkNames = false) => {
    if (typeof value !== 'string') { fail(location, '必须是字符串'); return; }
    warnMissingVariables(value, location, vars, (variable) => known.has(variable), warn);
    const literal = value.replace(/\{[^{}]*\}/g, '');
    if (/[0-9]/.test(literal)) warn(location, '数字请用模板变量，否则改数据后文字不会更新');
    if (checkNames && names.some((name) => literal.includes(name)))
      warn(location, '环节名请用 {focus.from}/{focus.to} 等变量');
    for (const match of value.matchAll(/\{([^{}]*)\}/g))
      if (!known.has(match[1])) fail(location, `未知模板变量 {${match[1]}}；funnel 仅支持 references/funnel.md 中的变量`);
  };
  const fillTitle = (text) => renderedTitle(text, vars);
  if (!Array.isArray(deck.steps) || deck.steps.length !== 3) fail('steps', '必须恰好包含 3 步');
  if (Array.isArray(deck.steps)) deck.steps.forEach((step, i) => {
    const location = `steps[${i}]`;
    if (!object(step)) { fail(location, '必须是对象'); return; }
    if (typeof step.title !== 'string' || !step.title.trim()) fail(`${location}.title`, '必须填写非空标题');
    if (own(step, 'title')) {
      checkTemplate(step.title, `${location}.title`, true);
      if (typeof step.title === 'string') {
        const lines = fillTitle(step.title).split(/\r\n|[\r\n]|\\n/);
        if (lines.length > 2) warn(`${location}.title`, `标题共 ${lines.length} 行，超过 2 行`);
        lines.forEach((line, j) => {
          const length = [...line].length;
          if (length > 13) warn(`${location}.title 第 ${j + 1} 行`, `模板填值后共 ${length} 字符，建议不超过 13 个汉字`);
        });
      }
    }
    for (const key of ['body', 'result']) if (own(step, key)) checkTemplate(step[key], `${location}.${key}`, true);
    if (own(step, 'chips')) {
      if (!Array.isArray(step.chips)) fail(`${location}.chips`, '必须是字符串数组');
      else step.chips.forEach((chip, j) => checkTemplate(chip, `${location}.chips[${j}]`));
    }
    if (own(step, 'legend') && typeof step.legend !== 'boolean') fail(`${location}.legend`, '必须是布尔值');
  });
}

// 对应 components/trend.js 的 vars()；对象整体可识别，但不建议用于正文。
export const TREND_TEMPLATE_VARIABLES = Object.freeze([
  'n', 'unit', 'first', 'first.label', 'first.value', 'last', 'last.label', 'last.value',
  'peak', 'peak.label', 'peak.value', 'low', 'low.label', 'low.value', 'change', 'changePct',
  'changeAbs', 'changePctAbs', 'dir', 'dirVerb',
  'mark', 'mark.label', 'mark.text', 'mark.value', 'mark.beforeAvg', 'mark.afterAvg', 'mark.ratio', 'mark.shift',
  'target', 'gap', 'reach', 'reach.label', 'reach.text',
  'forecastEnd', 'forecastEnd.label', 'forecastEnd.value', 'okName', 'badName',
]);

// 对应 components/share.js 的 vars()；不接受其他页型或自定义字段。
export const SHARE_TEMPLATE_VARIABLES = Object.freeze([
  'n', 'unit', 'total',
  'top', 'top.name', 'top.value', 'top.share',
  'second', 'second.name', 'second.value', 'second.share',
  'smallest', 'smallest.name', 'smallest.value', 'smallest.share',
  'focus', 'focus.name', 'focus.value', 'focus.share', 'focus.rank',
  'topTwoShare', 'okName', 'badName',
]);

function validateShare(deck, presets, fail, warn) {
  const items = Array.isArray(deck.items) ? deck.items : [];
  if (!Array.isArray(deck.items) || items.length < 2 || items.length > 8)
    fail('items', '必须是包含 2～8 个分项的数组');
  items.forEach((item, i) => {
    const location = `items[${i}]`;
    if (!object(item)) { fail(location, '必须是对象'); return; }
    if (typeof item.name !== 'string' || !item.name.trim()) fail(`${location}.name`, '必须填写非空分项名');
    if (!number(item.value) || item.value < 0)
      fail(`${location}.value`, '必须是非负的有限数字（不能用数字字符串）');
  });
  if (!items.some((item) => number(item?.value) && item.value > 0)) fail('items', '至少一项 value 必须大于 0');
  if (own(deck, 'focus')) {
    const validIndex = Number.isInteger(deck.focus) && deck.focus >= 0 && deck.focus < items.length;
    const validName = typeof deck.focus === 'string' && items.some((item) => item?.name === deck.focus);
    if (!validIndex && !validName) fail('focus', '必须是合法下标（从 0 开始的整数）或存在的分项 name；自动选最大项请省略');
  }
  if (own(deck, 'focusTone') && !['ok', 'bad'].includes(deck.focusTone)) fail('focusTone', '只能为 "ok" 或 "bad"');
  if (own(deck, 'decimals') && (!Number.isInteger(deck.decimals) || deck.decimals < 0 || deck.decimals > 2))
    fail('decimals', '必须是 0～2 的整数');
  for (const key of ['eyebrow', 'unit', 'totalLabel'])
    if (own(deck, key) && typeof deck[key] !== 'string') fail(key, '必须是字符串');

  // 按原始值排名、默认选最大项；最大余数法与组件一致，并列取数组前项。
  // 非法输入仍要继续收集失败，不让标题格式检查抛异常。
  const v = items.map((item) => number(item?.value) ? Math.max(0, item.value) : 0);
  const sum = v.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum)) fail('items', '分项合计必须是有限数字');
  const total = Number.isFinite(sum) && sum > 0 ? sum : 1;
  const raw = v.map((x) => x / total * 100);
  if (sum > 0 && Number.isFinite(sum)) raw.forEach((share, i) => {
    if (share < 3) warn(`items[${i}].value`, '占比太小的项建议合并成其他');
  });
  const pct = raw.map(Math.floor);
  let rest = 100 - pct.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - pct[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (rest > 0) { pct[i]++; rest--; }
  });
  const order = v.map((_, i) => i).sort((a, b) => v[b] - v[a]);
  let fi = order[0];
  if (Number.isInteger(deck.focus) && deck.focus >= 0 && deck.focus < items.length) fi = deck.focus;
  else if (typeof deck.focus === 'string') {
    const i = items.findIndex((item) => item?.name === deck.focus);
    if (i >= 0) fi = i;
  }
  const dec = Number.isInteger(deck.decimals) && deck.decimals >= 0 && deck.decimals <= 2 ? deck.decimals
    : Math.min(1, Math.max(0, ...items.map((item) => (String(item?.value).split('.')[1] || '').length)));
  const nf = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const itemVars = (i) => ({ name: items[i]?.name, value: nf.format(v[i] ?? 0), share: pct[i] === 0 && v[i] > 0 ? '<1' : String(pct[i] ?? 0) });
  const colors = presets.find((p) => p?.id === deck.preset)?.colors;
  const vars = {
    n: items.length, unit: deck.unit ?? '', total: nf.format(total),
    top: itemVars(order[0]), second: itemVars(order[Math.min(1, items.length - 1)]), smallest: itemVars(order.at(-1)),
    focus: { ...itemVars(fi), rank: String(order.indexOf(fi) + 1) },
    topTwoShare: String((pct[order[0]] ?? 0) + (items.length > 1 ? pct[order[1]] ?? 0 : 0)),
    okName: colors?.okName, badName: colors?.badName,
  };
  const known = new Set(SHARE_TEMPLATE_VARIABLES);
  const names = [...new Set(items.map((item) => item?.name).filter((name) => typeof name === 'string' && name.trim()))];
  const checkTemplate = (value, location, checkNames = false) => {
    if (typeof value !== 'string') { fail(location, '必须是字符串'); return; }
    warnMissingVariables(value, location, vars, (variable) => known.has(variable), warn);
    const literal = value.replace(/\{[^{}]*\}/g, '');
    if (/[0-9]/.test(literal)) warn(location, '数字请用模板变量，否则改数据后文字不会更新');
    if (checkNames && names.some((name) => literal.includes(name))) warn(location, '分项名请用变量');
    for (const match of value.matchAll(/\{([^{}]*)\}/g))
      if (!known.has(match[1])) fail(location, `未知模板变量 {${match[1]}}；share 仅支持 references/share.md 中的变量`);
  };
  const fillTitle = (text) => renderedTitle(text, vars);
  if (!Array.isArray(deck.steps) || deck.steps.length !== 3) fail('steps', '必须恰好包含 3 步');
  if (Array.isArray(deck.steps)) deck.steps.forEach((step, i) => {
    const location = `steps[${i}]`;
    if (!object(step)) { fail(location, '必须是对象'); return; }
    if (typeof step.title !== 'string' || !step.title.trim()) fail(`${location}.title`, '必须填写非空标题');
    if (own(step, 'title')) {
      checkTemplate(step.title, `${location}.title`, true);
      if (typeof step.title === 'string') {
        const lines = fillTitle(step.title).split(/\r\n|[\r\n]|\\n/);
        if (lines.length > 2) warn(`${location}.title`, `标题共 ${lines.length} 行，超过 2 行`);
        lines.forEach((line, j) => {
          const length = [...line].length;
          if (length > 13) warn(`${location}.title 第 ${j + 1} 行`, `模板填值后共 ${length} 字符，建议不超过 13 个汉字`);
        });
      }
    }
    if (own(step, 'body')) checkTemplate(step.body, `${location}.body`, true);
    if (own(step, 'result')) checkTemplate(step.result, `${location}.result`);
    if (own(step, 'chips')) {
      if (!Array.isArray(step.chips)) fail(`${location}.chips`, '必须是字符串数组');
      else step.chips.forEach((chip, j) => checkTemplate(chip, `${location}.chips[${j}]`));
    }
    if (own(step, 'legend') && typeof step.legend !== 'boolean') fail(`${location}.legend`, '必须是布尔值');
  });
}

function validateTrend(deck, presets, fail, warn) {
  const points = Array.isArray(deck.points) ? deck.points : [];
  const forecast = Array.isArray(deck.forecast) ? deck.forecast : [];
  // 有预测段时，3 个历史点也能讲清（如"三个季度实际 + 一个季度预计"）
  const minPts = forecast.length > 0 ? 3 : 4;
  if (!Array.isArray(deck.points) || points.length < minPts || points.length > 16)
    fail('points', forecast.length > 0 ? '必须是包含 3～16 个历史时间点的数组（有预测时最少 3 个）' : '必须是包含 4～16 个时间点的数组（有预测 forecast 时最少 3 个）');
  if (own(deck, 'forecast') && (!Array.isArray(deck.forecast) || forecast.length > 6))
    fail('forecast', '必须是包含 0～6 个时间点的数组');
  for (const [key, entries] of [['points', points], ['forecast', forecast]]) entries.forEach((point, i) => {
    const location = `${key}[${i}]`;
    if (!object(point)) { fail(location, '必须是对象'); return; }
    if (typeof point.label !== 'string' || !point.label.trim()) fail(`${location}.label`, '必须填写非空时间标签');
    if (!number(point.value)) fail(`${location}.value`, '必须是有限数字（不能用数字字符串）');
  });
  validateBetter(deck, fail);
  if (own(deck, 'decimals') && (!Number.isInteger(deck.decimals) || deck.decimals < 0 || deck.decimals > 2))
    fail('decimals', '必须是 0～2 的整数');
  for (const key of ['unit', 'eyebrow'])
    if (own(deck, key) && typeof deck[key] !== 'string') fail(key, '必须是字符串');
  if (own(deck, 'target')) {
    if (!object(deck.target)) fail('target', '必须是包含数字 value 的对象');
    else {
      if (!number(deck.target.value)) fail('target.value', '必须是有限数字（不能用数字字符串）');
      if (own(deck.target, 'label') && typeof deck.target.label !== 'string') fail('target.label', '必须是字符串');
    }
  }
  const allValues = points.concat(forecast).map((p) => p?.value).filter(number);
  if (number(deck.target?.value)) allValues.push(deck.target.value);
  if (own(deck, 'yFrom')) {
    if (!number(deck.yFrom) && deck.yFrom !== 'zero') fail('yFrom', '必须是有限数字或 "zero"；自动范围请省略此字段');
    else if (number(deck.yFrom) && allValues.length && deck.yFrom >= Math.min(...allValues))
      fail('yFrom', '数字须小于所有数据（含预测和目标）的最小值');
  }
  if (own(deck, 'mark')) {
    if (!object(deck.mark)) fail('mark', '必须是对象');
    else if (own(deck.mark, 'index') && (!Number.isInteger(deck.mark.index) || deck.mark.index < 1 || deck.mark.index > points.length - 2))
      fail('mark.index', '必须是 1～points.length−2 的整数（从 0 开始，不能选首尾点）');
  }

  // 复现组件的统计及格式，用于缺值语义和标题长度检查；非法数据已有独立失败项。
  const v = points.map((p) => number(p?.value) ? p.value : 0);
  const dec = Number.isInteger(deck.decimals) && deck.decimals >= 0 && deck.decimals <= 2 ? deck.decimals
    : Math.min(1, Math.max(0, ...points.concat(forecast).map((p) => (String(p?.value).split('.')[1] || '').length)));
  const nf = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fv = (value) => nf.format(value);
  const sg = (value) => (value >= 0 ? '+' : '−') + fv(Math.abs(value));
  let pi = 0, li = 0, mi = 1, best = -1;
  v.forEach((value, i) => { if (value > v[pi]) pi = i; if (value < v[li]) li = i; });
  for (let i = 1; i < v.length - 1; i++) {
    const d2 = Math.abs((v[i + 1] - v[i]) - (v[i] - v[i - 1]));
    if (d2 > best) { best = d2; mi = i; }
  }
  if (Number.isInteger(deck.mark?.index) && deck.mark.index >= 1 && deck.mark.index <= points.length - 2) mi = deck.mark.index;
  const before = mi > 0 ? ((v[mi] ?? 0) - (v[0] ?? 0)) / mi : 0;
  const after = v.length - 1 - mi > 0 ? (v.at(-1) - v[mi]) / (v.length - 1 - mi) : 0;
  const ratio = Math.abs(before) > 1e-9 ? after / before : null;
  const hasTarget = number(deck.target?.value);
  const allPoints = points.concat(forecast);
  const rr = hasTarget ? reachIndex(allPoints.map((p) => (number(p?.value) ? p.value : NaN)), deck.target.value, deck.better === 'down' ? 'down' : 'up') : null;
  const ri = rr ? rr.index : -1;
  const pointVars = (i) => ({ label: points[i]?.label, value: fv(v[i] ?? 0) });
  const colors = presets.find((p) => p?.id === deck.preset)?.colors;
  const vars = {
    n: points.length, unit: deck.unit ?? '', first: pointVars(0), last: pointVars(points.length - 1),
    peak: pointVars(pi), low: pointVars(li), change: sg((v.at(-1) ?? 0) - (v[0] ?? 0)),
    changePct: v[0] ? String(Math.round(((v.at(-1) - v[0]) / v[0]) * 100)) : undefined,
    changeAbs: fv(Math.abs((v.at(-1) ?? 0) - (v[0] ?? 0))),
    changePctAbs: v[0] ? String(Math.abs(Math.round(((v.at(-1) - v[0]) / v[0]) * 100))) : undefined,
    dir: v.at(-1) > v[0] * 1.005 ? '增长' : v.at(-1) < v[0] * 0.995 ? '下降' : '持平',
    dirVerb: v.at(-1) > v[0] * 1.005 ? '涨到' : v.at(-1) < v[0] * 0.995 ? '降到' : '保持在',
    mark: { label: points[mi]?.label, text: deck.mark?.text ?? '', value: fv(v[mi] ?? 0),
      beforeAvg: sg(before), afterAvg: sg(after), ratio: ratio == null || ratio <= 0 ? undefined : (Math.round(ratio * 10) / 10).toFixed(1),
      shift: before >= 0 && after >= 0 ? (after > before * 1.05 ? '加快' : after < before * 0.95 ? '放缓' : '持平')
        : before <= 0 && after <= 0 ? (after < before * 1.05 ? '加速下滑' : after > before * 0.95 ? '下滑放缓' : '持续下滑')
        : after < 0 ? '由升转降' : '由降转升' },
    target: hasTarget ? fv(deck.target.value) : undefined, gap: hasTarget ? fv(Math.max(0, deck.better === 'down' ? (v.at(-1) ?? 0) - deck.target.value : deck.target.value - (v.at(-1) ?? 0))) : undefined,
    reach: ri >= 0 ? { label: allPoints[ri].label, text: ri >= points.length ? `预计${allPoints[ri].label}达标` : rr.always ? `${allPoints[ri].label}起一直达标` : `${allPoints[ri].label}起已达标` }
      : { label: '', text: !hasTarget ? undefined : forecast.length ? '预测期内达不到目标' : '目前还未达标' },
    forecastEnd: forecast.length ? { label: forecast.at(-1)?.label, value: fv(forecast.at(-1)?.value ?? 0) } : {},
    okName: colors?.okName, badName: colors?.badName,
  };
  const known = new Set(TREND_TEMPLATE_VARIABLES);
  const labels = [...new Set(points.map((p) => p?.label).filter((label) => typeof label === 'string' && label.trim()))];
  const checkTemplate = (value, location, checkLabels = false) => {
    if (typeof value !== 'string') { fail(location, '必须是字符串'); return; }
    warnMissingVariables(value, location, vars, (variable) => known.has(variable), warn);
    const literal = value.replace(/\{[^{}]*\}/g, '');
    if (/[0-9]/.test(literal)) warn(location, '数字请用模板变量，否则改数据后文字不会更新');
    if (checkLabels && labels.some((label) => literal.includes(label))) warn(location, '时间标签请用变量');
    if (/^steps\[\d+\]\.(title|body)$/.test(location) && !/\{(?:dir|dirVerb|mark\.shift)\}/.test(value)) {
      if (v.at(-1) < v[0] && /增长|增速|提升|上涨|上升/.test(literal))
        warn(location, '数据在下降，措辞写的是增长；建议用 {dir} / {mark.shift}');
      if (v.at(-1) > v[0] && /下降/.test(literal))
        warn(location, '数据在上升，措辞写的是下降；建议用 {dir} / {mark.shift}');
    }
    for (const match of value.matchAll(/\{([^{}]*)\}/g))
      if (!known.has(match[1])) fail(location, `未知模板变量 {${match[1]}}；trend 仅支持 references/trend.md 中的变量`);
  };
  const fillTitle = (text) => renderedTitle(text, vars);
  if (object(deck.mark) && own(deck.mark, 'text')) checkTemplate(deck.mark.text, 'mark.text');
  if (!Array.isArray(deck.steps) || deck.steps.length !== 3) fail('steps', '必须恰好包含 3 步');
  if (Array.isArray(deck.steps)) deck.steps.forEach((step, i) => {
    const location = `steps[${i}]`;
    if (!object(step)) { fail(location, '必须是对象'); return; }
    if (typeof step.title !== 'string' || !step.title.trim()) fail(`${location}.title`, '必须填写非空标题');
    if (own(step, 'title')) {
      checkTemplate(step.title, `${location}.title`, true);
      if (typeof step.title === 'string') {
        const lines = fillTitle(step.title).split(/\r\n|[\r\n]|\\n/);
        if (lines.length > 2) warn(`${location}.title`, `标题共 ${lines.length} 行，超过 2 行`);
        lines.forEach((line, j) => {
          const length = [...line].length;
          if (length > 13) warn(`${location}.title 第 ${j + 1} 行`, `模板填值后共 ${length} 字符，建议不超过 13 个汉字`);
        });
      }
    }
    if (own(step, 'body')) checkTemplate(step.body, `${location}.body`, true);
    if (own(step, 'result')) checkTemplate(step.result, `${location}.result`);
    if (own(step, 'chips')) {
      if (!Array.isArray(step.chips)) fail(`${location}.chips`, '必须是字符串数组');
      else step.chips.forEach((chip, j) => checkTemplate(chip, `${location}.chips[${j}]`));
    }
    if (own(step, 'legend') && typeof step.legend !== 'boolean') fail(`${location}.legend`, '必须是布尔值');
  });
}

// KPI 模板变量来自组件 vars()；不与七种 2D 页型混用。
export const KPI_TEMPLATE_VARIABLES = Object.freeze([
  'unit', 'value', 'cubeUnit', 'compare', 'compare.label', 'compare.value', 'ratio', 'dir', 'diff', 'diffPct', 'diffPctAbs',
  'per', 'per.label', 'per.count', 'per.value', 'okName', 'badName',
]);

// KPI 专用的模板与标题检查；不改变其他数据页的格式。
function layoutCopyChecker(variables, vars, fail, warn, { names = [], nameMessage, onVariable, missingMessage } = {}) {
  const known = new Set(variables);
  const fillTitle = (text) => renderedTitle(text, vars);
  const check = (value, location, { checkNames = false, numbers = true } = {}) => {
    if (typeof value !== 'string') { fail(location, '必须是字符串'); return; }
    warnMissingVariables(value, location, vars, (variable) => known.has(variable), warn, missingMessage);
    const literal = value.replace(/\{[^{}]*\}/g, '');
    if (numbers && /[0-9]/.test(literal)) warn(location, '数字请用模板变量，否则改数据后文字不会更新');
    if (checkNames && names.some((name) => literal.includes(name))) warn(location, nameMessage);
    for (const match of value.matchAll(/\{([^{}]*)\}/g)) {
      const variable = match[1];
      if (!known.has(variable)) fail(location, `未知模板变量 {${variable}}；仅支持本页型规范中的变量`);
      else onVariable?.(variable, location);
    }
  };
  const title = (value, location, limit = 13) => {
    if (typeof value !== 'string') return;
    const lines = fillTitle(value).split(/\r\n|[\r\n]|\\n/);
    if (lines.length > 2) warn(location, `标题共 ${lines.length} 行，超过 2 行`);
    lines.forEach((line, i) => {
      const length = [...line].length;
      if (length > limit) warn(`${location} 第 ${i + 1} 行`, `模板填值后共 ${length} 字符，建议不超过 ${limit} 个汉字`);
    });
  };
  return { check, title };
}
function checkThreeLayoutSteps(deck, checker, fail) {
  if (!Array.isArray(deck.steps) || deck.steps.length !== 3) fail('steps', '必须恰好包含 3 步');
  if (!Array.isArray(deck.steps)) return;
  deck.steps.forEach((step, i) => {
    const location = `steps[${i}]`;
    if (!object(step)) { fail(location, '必须是对象'); return; }
    if (typeof step.title !== 'string' || !step.title.trim()) fail(`${location}.title`, '必须填写非空标题');
    if (own(step, 'title')) {
      checker.check(step.title, `${location}.title`, { checkNames: true });
      checker.title(step.title, `${location}.title`);
    }
    if (own(step, 'body')) checker.check(step.body, `${location}.body`, { checkNames: true });
    if (own(step, 'result')) checker.check(step.result, `${location}.result`);
    if (own(step, 'chips')) {
      if (!Array.isArray(step.chips)) fail(`${location}.chips`, '必须是字符串数组');
      else step.chips.forEach((chip, j) => checker.check(chip, `${location}.chips[${j}]`));
    }
    if (own(step, 'legend') && typeof step.legend !== 'boolean') fail(`${location}.legend`, '必须是布尔值');
  });
}
const layoutColors = (deck, presets) => {
  const colors = presets.find((p) => p?.id === deck.preset)?.colors;
  return { okName: colors?.okName, badName: colors?.badName };
};
function validateKpi(deck, presets, fail, warn) {
  if (!number(deck.value) || deck.value < 0) fail('value', '必须是非负的有限数字（不能用数字字符串）');
  for (const key of ['label', 'unit', 'eyebrow'])
    if (own(deck, key) && typeof deck[key] !== 'string') fail(key, '必须是字符串');
  if (own(deck, 'decimals') && (!Number.isInteger(deck.decimals) || deck.decimals < 0 || deck.decimals > 2))
    fail('decimals', '必须是 0～2 的整数');
  if (own(deck, 'cubeUnit') && (!number(deck.cubeUnit) || deck.cubeUnit <= 0))
    fail('cubeUnit', '必须是大于 0 的有限数字');
  if (!own(deck, 'compare')) warn('compare', '缺少 compare，参照比较步骤缺少参照信息，建议填写');
  else if (!object(deck.compare)) fail('compare', '必须是对象');
  else {
    if (!number(deck.compare.value) || deck.compare.value < 0) fail('compare.value', '必须是非负的有限数字（不能用数字字符串）');
    if (typeof deck.compare.label !== 'string' || !deck.compare.label.trim()) fail('compare.label', '必须填写非空字符串');
  }
  if (!own(deck, 'per')) warn('per', '缺少 per，平摊步骤缺少分组信息，建议填写');
  else if (!object(deck.per)) fail('per', '必须是对象');
  else {
    if (!Number.isInteger(deck.per.count) || deck.per.count < 2 || deck.per.count > 12) fail('per.count', '表示把总量平均摊成几份，必须是 2～12 的整数；不是总人数或总金额');
    if (typeof deck.per.label !== 'string' || !deck.per.label.trim()) fail('per.label', '必须填写非空字符串');
    if (own(deck.per, 'ticks')) {
      if (!Array.isArray(deck.per.ticks) || deck.per.ticks.length !== deck.per.count) fail('per.ticks', '必须是数组且长度等于 per.count');
      if (Array.isArray(deck.per.ticks)) deck.per.ticks.forEach((tick, i) => {
        if (typeof tick !== 'string') fail(`per.ticks[${i}]`, '必须是字符串');
      });
    }
  }
  if (number(deck.cubeUnit) && deck.cubeUnit > 0) {
    if (number(deck.value) && deck.value / deck.cubeUnit > 1300) warn('cubeUnit', '方块过多会被截断');
    if (number(deck.compare?.value) && deck.compare.value / deck.cubeUnit > 1300) warn('compare.value', '方块过多会被截断');
  }
  const v = number(deck.value) ? Math.max(0, deck.value) : 0;
  const r = number(deck.compare?.value) ? Math.max(0, deck.compare.value) : 0;
  const k = Number.isInteger(deck.per?.count) ? Math.max(2, Math.min(12, deck.per.count)) : 0;
  const nice = (x) => { const e = 10 ** Math.floor(Math.log10(x)), m = x / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
  const cu = number(deck.cubeUnit) && deck.cubeUnit > 0 ? deck.cubeUnit : nice(Math.max(v, r) / 1300);
  const dec = Number.isInteger(deck.decimals) && deck.decimals >= 0 && deck.decimals <= 2 ? deck.decimals
    : Math.min(1, (String(deck.value).split('.')[1] || '').length);
  const nf = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const vars = {
    unit: deck.unit ?? '', value: nf.format(v), cubeUnit: cu >= 1 ? new Intl.NumberFormat('zh-CN').format(cu) : String(+cu.toPrecision(2)),
    compare: deck.compare ? { label: deck.compare.label, value: nf.format(r) } : {},
    ratio: r > 0 && v >= r ? (v / r >= 100 ? numStr(Math.round(v / r)) : String(Math.round(v / r * 10) / 10)) : undefined,
    dir: !deck.compare ? undefined : v > r ? '多' : v < r ? '少' : '持平',
    diff: deck.compare ? nf.format(Math.abs(v - r)) : undefined,
    diffPct: r > 0 ? numStr(Math.round((v - r) / r * 100)) : undefined,
    diffPctAbs: r > 0 ? numStr(Math.abs(Math.round((v - r) / r * 100))) : undefined,
    per: deck.per ? { label: deck.per.label, count: String(k), value: nf.format(Math.round(v / k)) } : {},
    ...layoutColors(deck, presets),
  };
  checkThreeLayoutSteps(deck, layoutCopyChecker(KPI_TEMPLATE_VARIABLES, vars, fail, warn, {
    missingMessage: (variable) => variable === 'ratio' && v < r
      ? '当前值低于参照（value<compare），{ratio} 在此情况下为空，该句会被省略；建议用 {dir} / {diffPctAbs}' : undefined,
  }), fail);
}
// 二十五种版式安静页按组件实际读取的字段校验；字数过长只警告，结构错误为失败。
const PAPER_LAYOUTS = new Set(['chapter', 'figures', 'matrix', 'quote', 'flow', 'timeline', 'versus',
  'points', 'features', 'actions', 'risks', 'people', 'testimonial', 'table', 'roadmap', 'tree', 'pyramid', 'cycle',
  'venn', 'gauge', 'treemap', 'radar', 'sankey', 'forces', 'diamond']);
function validatePaper(data, fail, warn, root) {
  const kind = data.component;
  const length = (v) => [...String(v)].length;
  const text = (holder, key, location, max, required = false) => {
    if (!own(holder, key) && !required) return;
    const value = holder?.[key];
    if (typeof value !== 'string' || required && !value.trim()) {
      fail(location, required ? '必须填写非空字符串' : '必须是字符串'); return;
    }
    if (max && length(value) > max) warn(location, `共 ${length(value)} 字，建议不超过 ${max} 字`);
  };
  const title = (holder, location, required = false) => {
    text(holder, 'title', location, 0, required);
    if (typeof holder.title !== 'string') return;
    const lines = holder.title.split(/\r\n|[\r\n]|\\n/);
    if (lines.length > 2) warn(location, `标题共 ${lines.length} 行，超过 2 行`);
    lines.forEach((line, i) => { if (length(line) > 13) warn(`${location} 第 ${i + 1} 行`, '标题每行建议不超过 13 字'); });
  };
  const list = (key, min, max, holder = data, location = key) => {
    const value = holder?.[key];
    if (!Array.isArray(value) || value.length < min || value.length > max)
      fail(location, min === max ? `必须是恰好包含 ${min} 项的数组` : `必须是包含 ${min}～${max} 项的数组`);
    return Array.isArray(value) ? value : [];
  };
  const eachObject = (values, key, visit) => values.forEach((value, i) => {
    const location = `${key}[${i}]`;
    if (!object(value)) { fail(location, '必须是对象'); return; }
    visit(value, location);
  });
  const tags = (holder, location, max, chars) => {
    if (!own(holder, 'tags')) return;
    if (!Array.isArray(holder.tags)) { fail(`${location}.tags`, '必须是字符串数组'); return; }
    if (holder.tags.length > max) fail(`${location}.tags`, `最多 ${max} 个标签`);
    holder.tags.forEach((_, i) => text(holder.tags, i, `${location}.tags[${i}]`, chars));
  };
  const tone = (holder, location) => {
    if (own(holder, 'tone') && !['ok', 'bad', ''].includes(holder.tone)) fail(`${location}.tone`, '只能是 ok（正向/达标）、bad（风险/未达标）或空字符串（中性）');
  };
  const index = (value, size, location) => {
    if (!Number.isInteger(value) || value < 0 || value >= size) {
      fail(location, '必须是有效下标（从 0 开始的整数）'); return false;
    }
    return true;
  };
  const scalar = (value, location, max) => {
    if (!(typeof value === 'string' || number(value))) fail(location, '必须是字符串或有限数字');
    else if (length(value) > max) warn(location, `共 ${length(value)} 字，建议不超过 ${max} 字`);
  };
  // 复用 media 的本地路径、双版对象及文件可读规则，不引入另一套头像路径规则。
  const image = (item, loc) => {
    if (object(item.image) && own(item.image, 'slot')) {
      fail(`${loc}.image`, 'people / testimonial 的头像不支持图位；请改成不填 image，会显示首字');
      return;
    }
    if (own(item, 'image')) validateMedia({ mode: 'photo', title: '人物', image: item.image }, {
      root, fail: (key, message) => fail(`${loc}.${key}`, message), warn: (key, message) => warn(`${loc}.${key}`, message),
    });
  };
  text(data, 'eyebrow', 'eyebrow', 24);
  text(data, 'takeaway', 'takeaway', 30);
  if (kind === 'quote') {
    if (own(data, 'title') || own(data, 'body')) warn('title/body', '金句页不显示标题和正文');
  } else {
    title(data, 'title', true);
    text(data, 'body', 'body', 0);
  }
  let steps = 0;
  if (kind === 'chapter') {
    const items = list('items', 1, 6);
    eachObject(items, 'items', (item, loc) => {
      text(item, 'title', `${loc}.title`, 10, true); text(item, 'desc', `${loc}.desc`, 24);
      if (own(item, 'number') && !(typeof item.number === 'string' || number(item.number))) fail(`${loc}.number`, '必须是字符串或有限数字');
    });
    if (own(data, 'current') && (!Number.isInteger(data.current) || data.current < 0 || data.current >= items.length))
      fail('current', '必须是 items 范围内从 0 开始的整数');
    text(data, 'currentLabel', 'currentLabel', 0);
    const n = Math.min(items.length, 6);
    steps = Number.isInteger(data.current) && data.current >= 0 && data.current < n ? 1 : n;
  } else if (kind === 'figures') {
    validateBetter(data, fail);
    const items = list('items', 1, 4);
    eachObject(items, 'items', (item, loc) => {
      if (!(typeof item.value === 'string' && item.value.trim() || number(item.value))) fail(`${loc}.value`, '必填，必须是非空字符串或有限数字');
      else if (length(item.value) > 6) warn(`${loc}.value`, '显示长度超过 6 字符，数字会被缩小');
      for (const [key, max] of Object.entries({ unit: 4, label: 8, note: 22, delta: 10, deltaLabel: 0 })) text(item, key, `${loc}.${key}`, max);
      tone(item, loc);
      validateBetter(item, fail, `${loc}.better`);
      if (own(item, 'fill') && (!number(item.fill) || item.fill < 0 || item.fill > 1)) fail(`${loc}.fill`, '必须是 0～1 的有限数字');
    });
    if (own(data, 'overview') && typeof data.overview !== 'boolean') fail('overview', '必须是布尔值');
    const n = Math.min(items.length, 4);
    steps = n + (n > 1 && data.overview !== false ? 1 : 0);
  } else if (kind === 'matrix') {
    if (own(data, 'template') && !['swot', 'pest', 'priority', 'bcg', ''].includes(data.template))
      fail('template', '只能是 swot、pest、priority、bcg 或空字符串');
    const cells = list('cells', 4, 4);
    eachObject(cells, 'cells', (item, loc) => {
      text(item, 'title', `${loc}.title`, 10, true); text(item, 'text', `${loc}.text`, 28);
      text(item, 'label', `${loc}.label`, 0); tags(item, loc, 3, 6); tone(item, loc);
    });
    if (own(data, 'axes') && !object(data.axes)) fail('axes', '必须是包含 x、y 的对象');
    for (const key of ['x', 'y']) {
      if (!own(data.axes, key)) {
        if (!(data.axes === undefined && ['swot', 'priority', 'bcg'].includes(data.template)))
          warn(`axes.${key}`, '省略坐标轴说明，观众可能无法理解象限');
      }
      else if (!Array.isArray(data.axes[key]) || data.axes[key].length !== 2 || !data.axes[key].every((v) => typeof v === 'string'))
        fail(`axes.${key}`, '必须是恰好包含 2 个字符串的数组');
    }
    if (own(data, 'order') && (!Array.isArray(data.order) || data.order.length !== 4 || new Set(data.order).size !== 4 || !data.order.every((v) => Number.isInteger(v) && v >= 0 && v <= 3)))
      fail('order', '必须是 0～3 的排列（各出现一次）');
    steps = Array.isArray(data.order) ? data.order.length : 4;
  } else if (kind === 'quote') {
    const lines = list('lines', 1, 4);
    lines.forEach((line, i) => {
      if (typeof line !== 'string' || !line.trim()) fail(`lines[${i}]`, '必须填写非空字符串');
      else if (length(line.replace(/\*\*/g, '')) > 15) warn(`lines[${i}]`, '每行显示长度（去掉 **）建议不超过 15 字');
    });
    text(data, 'by', 'by', 20);
    steps = Math.max(1, Math.min(lines.length, 4));
  } else if (kind === 'flow') {
    const items = list('items', 2, 6);
    eachObject(items, 'items', (item, loc) => {
      text(item, 'title', `${loc}.title`, 8, true); text(item, 'desc', `${loc}.desc`, 26);
      text(item, 'owner', `${loc}.owner`, 8); tags(item, loc, 2, 0);
    });
    steps = Math.max(1, Math.min(items.length, 6));
  } else if (kind === 'timeline') {
    const items = list('items', 2, 8);
    eachObject(items, 'items', (item, loc) => {
      text(item, 'date', `${loc}.date`, 8, true); text(item, 'title', `${loc}.title`, 10, true);
      text(item, 'desc', `${loc}.desc`, 26); text(item, 'tag', `${loc}.tag`, 6); tone(item, loc);
      for (const key of ['label', 't', 'key']) if (own(item, key)) fail(`${loc}.${key}`, '旧版时间线字段不再支持，请改用 date/title/desc/tag');
    });
    for (const key of ['focus', 'focusTone']) if (own(data, key)) fail(key, '旧版时间线字段不再支持；新版按 items 顺序逐项讲解');
    steps = Math.max(1, Math.min(items.length, 8));
  } else if (kind === 'versus') {
    for (const key of ['a', 'b']) {
      if (!object(data[key])) { fail(key, '必须填写方案对象'); continue; }
      text(data[key], 'title', `${key}.title`, 10, true); text(data[key], 'desc', `${key}.desc`, 22); text(data[key], 'label', `${key}.label`, 6);
    }
    const rows = own(data, 'rows') ? list('rows', 0, 5) : [];
    eachObject(rows, 'rows', (row, loc) => {
      for (const key of ['label', 'a', 'b']) text(row, key, `${loc}.${key}`, 8, true);
      if (own(row, 'better') && !['a', 'b', ''].includes(row.better)) fail(`${loc}.better`, '只能是 a、b 或空字符串');
    });
    text(data, 'mid', 'mid', 4); steps = rows.length ? 3 : 2;
  } else if (['points', 'features', 'actions', 'risks', 'people', 'testimonial', 'cycle'].includes(kind)) {
    const ranges = { points: [2, 6], features: [4, 9], actions: [1, 5], risks: [1, 5], people: [2, 6], testimonial: [1, 3], cycle: [3, 6] };
    const items = list('items', ...ranges[kind]);
    const specs = {
      points: { title: 10, text: 28, tag: 6 }, features: { title: 10, text: 22, icon: 2 },
      actions: { action: 16, detail: 24, owner: 8, due: 10 }, risks: { risk: 16, likelihood: 8, action: 30 },
      people: { name: 8, role: 10, text: 24 }, testimonial: { quote: 40, name: 8, role: 14 }, cycle: { title: 8, text: 18 },
    };
    const required = { points: ['title'], features: ['title'], actions: ['action'], risks: ['risk'],
      people: ['name'], testimonial: ['quote', 'name'], cycle: ['title'] };
    eachObject(items, 'items', (item, loc) => {
      for (const [key, max] of Object.entries(specs[kind])) {
        // 评价支持 **强调**，字符建议按实际显示文字统计。
        const holder = kind === 'testimonial' && key === 'quote' && typeof item[key] === 'string'
          ? { ...item, quote: item.quote.replace(/\*\*(.+?)\*\*/g, '$1') } : item;
        text(holder, key, `${loc}.${key}`, max, required[kind].includes(key));
      }
      if (kind === 'points') tone(item, loc);
      if (kind === 'risks' && !['high', 'mid', 'low'].includes(item.impact)) fail(`${loc}.impact`, '必须是 high、mid 或 low');
      if (['people', 'testimonial'].includes(kind)) image(item, loc);
    });
    if (kind === 'points') {
      if (own(data, 'overview') && typeof data.overview !== 'boolean') fail('overview', '必须是布尔值');
      steps = Math.min(items.length, 6) + (data.overview !== false && items.length > 1 ? 1 : 0);
    } else if (kind === 'features') {
      let highlights = [];
      if (own(data, 'highlight')) {
        if (!Array.isArray(data.highlight)) fail('highlight', '必须是下标数组');
        else highlights = data.highlight.filter((v, i) => index(v, Math.min(items.length, 9), `highlight[${i}]`));
      }
      steps = 1 + highlights.length;
    } else if (kind === 'actions') {
      text(data, 'ask', 'ask', 30);
      for (const key of ['actionLabel', 'ownerLabel', 'dueLabel', 'askLabel']) text(data, key, key, 0);
      steps = Math.min(items.length, 5) + (data.ask ? 1 : 0);
    } else if (kind === 'risks') {
      text(data, 'actionLabel', 'actionLabel', 0); steps = Math.max(1, Math.min(items.length, 5));
    } else if (kind === 'people') {
      const n = Math.min(items.length, 6); steps = n <= 4 ? Math.max(1, n) : 1;
    } else if (kind === 'testimonial') steps = Math.max(1, Math.min(items.length, 3));
    else { text(data, 'center', 'center', 6); steps = Math.max(1, Math.min(items.length, 6)) + 1; }
  } else if (kind === 'table') {
    const columns = list('columns', 2, 6), rows = list('rows', 1, 8);
    columns.forEach((_, i) => text(columns, i, `columns[${i}]`, 8, true));
    eachObject(rows, 'rows', (row, loc) => {
      const cells = list('cells', columns.length, columns.length, row, `${loc}.cells`);
      cells.forEach((value, i) => scalar(value, `${loc}.cells[${i}]`, 10));
      if (own(row, 'tones')) {
        if (!Array.isArray(row.tones)) fail(`${loc}.tones`, '必须是 ok（正向/达标）、bad（风险/未达标）或空字符串（中性）组成的数组');
        else {
          if (row.tones.length > columns.length) fail(`${loc}.tones`, '数量不能超过 columns 列数');
          row.tones.forEach((value, i) => { if (!['ok', 'bad', ''].includes(value)) fail(`${loc}.tones[${i}]`, '只能是 ok（正向/达标）、bad（风险/未达标）或空字符串（中性）'); });
        }
      }
    });
    let count = 0;
    if (own(data, 'highlight')) {
      if (!Array.isArray(data.highlight)) fail('highlight', '必须是下标或 {row,col} 对象组成的数组');
      else data.highlight.forEach((h, i) => {
        const loc = `highlight[${i}]`;
        if (number(h)) { if (index(h, Math.min(rows.length, 8), loc)) count++; }
        else if (object(h)) {
          const valid = index(h.row, Math.min(rows.length, 8), `${loc}.row`);
          if (own(h, 'col')) index(h.col, Math.min(columns.length, 6), `${loc}.col`);
          if (valid) count++;
        } else fail(loc, '必须是行下标或 {row,col} 对象');
      });
    }
    text(data, 'note', 'note', 0); steps = 1 + count;
  } else if (kind === 'roadmap') {
    const periods = list('periods', 2, 12), lanes = list('lanes', 1, 5);
    periods.forEach((_, i) => text(periods, i, `periods[${i}]`, 6, true));
    eachObject(lanes, 'lanes', (lane, loc) => {
      text(lane, 'name', `${loc}.name`, 8, true);
      // 空泳道合法；省略 items 与源码的 (ln.items || []) 一致。
      const items = own(lane, 'items') ? list('items', 0, 6, lane, `${loc}.items`) : [];
      eachObject(items, `${loc}.items`, (item, iloc) => {
        text(item, 'label', `${iloc}.label`, 10, true); tone(item, iloc);
        for (const key of ['start', 'end']) if (!number(item[key]) || item[key] < 0 || item[key] > periods.length)
          fail(`${iloc}.${key}`, '必须是 0～periods.length 的有限数字');
        if (number(item.start) && number(item.end) && item.end <= item.start) fail(`${iloc}.end`, '必须大于 start');
      });
    });
    steps = Math.min(lanes.length, 5) + 1;
  } else if (kind === 'tree') {
    const node = (value, loc) => {
      text(value, 'label', `${loc}.label`, 10, true);
      if (own(value, 'value')) scalar(value.value, `${loc}.value`, 10);
    };
    let kids = [], hasGrandchildren = false;
    if (!object(data.root)) fail('root', '必须是根节点对象');
    else {
      node(data.root, 'root'); kids = list('children', 1, 4, data.root, 'root.children');
      eachObject(kids, 'root.children', (kid, loc) => {
        node(kid, loc);
        const children = own(kid, 'children') ? list('children', 0, 3, kid, `${loc}.children`) : [];
        if (children.length) hasGrandchildren = true;
        eachObject(children, `${loc}.children`, (child, cloc) => {
          node(child, cloc);
          if (own(child, 'children') && (!Array.isArray(child.children) || child.children.length))
            fail(`${cloc}.children`, '最多展示根、分支、子项三层，不支持更深层 children');
        });
      });
    }
    const focused = own(data, 'focus') && index(data.focus, Math.min(kids.length, 4), 'focus');
    text(data, 'operator', 'operator', 2);
    steps = 2 + (hasGrandchildren ? 1 : 0) + (focused ? 1 : 0);
  } else if (kind === 'venn') {
    const sets = list('sets', 2, 3);
    eachObject(sets, 'sets', (set, loc) => {
      text(set, 'label', `${loc}.label`, 6, true); text(set, 'text', `${loc}.text`, 20);
    });
    if (own(data, 'overlaps')) {
      if (!object(data.overlaps)) fail('overlaps', '必须是交集名称对象');
      else for (const key of Object.keys(data.overlaps)) {
        if (!(sets.length === 2 ? ['01'] : ['01', '02', '12']).includes(key))
          fail(`overlaps.${key}`, '只能填写当前集合之间的交集键：两集合为 01，三集合为 01、02、12');
        text(data.overlaps, key, `overlaps.${key}`, 8);
      }
    }
    if (own(data, 'center')) {
      if (!object(data.center)) fail('center', '必须是交集结论对象');
      else for (const [key, max] of Object.entries({ short: 4, title: 14, text: 24 })) text(data.center, key, `center.${key}`, max);
    }
    text(data, 'centerLabel', 'centerLabel', 6);
    steps = Math.min(sets.length, 3) + 1;
  } else if (kind === 'gauge') {
    const items = list('items', 1, 4);
    const checkMax = (value, loc) => {
      if (!number(value) || value <= 0) fail(loc, '必须是大于 0 的有限数字');
    };
    if (own(data, 'max')) checkMax(data.max, 'max');
    eachObject(items, 'items', (item, loc) => {
      if (!number(item.value)) fail(`${loc}.value`, '必填，必须是有限数字（不能用数字字符串）');
      if (own(item, 'max')) checkMax(item.max, `${loc}.max`);
      if (own(item, 'target') && !number(item.target)) fail(`${loc}.target`, '必须是有限数字');
      const max = item.max ?? data.max ?? 100;
      if (number(item.value) && number(max) && max > 0 && item.value > max)
        warn(`${loc}.value`, 'value 超过 max，圆环按满环显示，建议核对量程');
      for (const [key, max] of Object.entries({ unit: 3, label: 8, text: 16 })) text(item, key, `${loc}.${key}`, max);
      tone(item, loc);
    });
    const n = Math.max(1, Math.min(items.length, 4)); steps = n > 1 ? n + 1 : 1;
  } else if (kind === 'treemap') {
    const items = list('items', 2, 8);
    eachObject(items, 'items', (item, loc) => {
      if (!number(item.value) || item.value < 0) fail(`${loc}.value`, '必填，必须是非负的有限数字');
      for (const [key, max] of Object.entries({ label: 8, text: 12, unit: 3 })) text(item, key, `${loc}.${key}`, max);
      tone(item, loc);
    });
    const values = items.map((it) => number(it?.value) && it.value >= 0 ? it.value : 0);
    const total = values.reduce((a, b) => a + b, 0);
    if (!values.some((v) => v > 0)) fail('items', '至少一项 value 必须大于 0，不能全为 0');
    if (!number(total)) fail('items', '分项合计必须是有限数字');
    if (total > 0 && number(total) && values.filter((v) => v / total < .03).length > 2)
      warn('items', '占比 < 3% 的项超过 2 个，太小看不清，建议合并为“其他”');
    let highlights = [];
    if (own(data, 'highlight')) {
      if (!Array.isArray(data.highlight)) fail('highlight', '必须是下标数组');
      else highlights = data.highlight.filter((v, i) => index(v, Math.min(items.length, 8), `highlight[${i}]`));
    }
    steps = 1 + highlights.length;
  } else if (kind === 'radar') {
    const axes = list('axes', 3, 8), series = list('series', 1, 2);
    axes.forEach((_, i) => text(axes, i, `axes[${i}]`, 6, true));
    if (own(data, 'max') && !number(data.max)) fail('max', '必须是有限数字');
    const values = [];
    eachObject(series, 'series', (entry, loc) => {
      text(entry, 'name', `${loc}.name`, 6);
      const vals = list('values', axes.length, axes.length, entry, `${loc}.values`);
      vals.forEach((v, i) => {
        if (!number(v)) fail(`${loc}.values[${i}]`, '必须是有限数字');
        else values.push(v);
      });
    });
    // 显式 0 与组件的 Number(data.max) || 自动范围一致；不把数字字符串当数字接纳。
    const max = number(data.max) && data.max !== 0 ? data.max : Math.max(1, ...values);
    series.forEach((entry, k) => {
      if (Array.isArray(entry?.values)) entry.values.forEach((v, i) => {
        if (number(v) && v > max) warn(`series[${k}].values[${i}]`, '数值超过 max，雷达图顶点会被限制在外圈');
      });
    });
    const focused = own(data, 'focus') && index(data.focus, Math.min(axes.length, 8), 'focus');
    steps = Math.max(1, Math.min(series.length, 2) + (focused ? 1 : 0));
  } else if (kind === 'sankey') {
    const columns = list('columns', 2, 3), nodes = new Map();
    columns.forEach((col, c) => {
      const entries = list(c, 1, 6, columns, `columns[${c}]`);
      eachObject(entries, `columns[${c}]`, (node, loc) => {
        text(node, 'label', `${loc}.label`, 8, true); text(node, 'text', `${loc}.text`, 0);
        if (own(node, 'value') && (!number(node.value) || node.value < 0)) fail(`${loc}.value`, '必须是非负的有限数字');
        if (typeof node.label === 'string' && node.label.trim()) {
          if (nodes.has(node.label)) fail(`${loc}.label`, '节点 label 必须全局唯一，不能重名');
          else nodes.set(node.label, { col: c, incoming: 0, outgoing: 0, loc });
        }
      });
    });
    if (!Array.isArray(data.links)) fail('links', '必须是连线对象数组');
    eachObject(Array.isArray(data.links) ? data.links : [], 'links', (link, loc) => {
      for (const key of ['from', 'to']) {
        if (typeof link[key] !== 'string' || !nodes.has(link[key])) fail(`${loc}.${key}`, '必须是存在的节点 label');
      }
      const from = nodes.get(link.from), to = nodes.get(link.to);
      if (from && to && to.col !== from.col + 1) fail(`${loc}.to`, 'to 必须位于 from 的下一列，不能跨列、同列或反向连接');
      if (!number(link.value) || link.value <= 0) fail(`${loc}.value`, '必须是大于 0 的有限数字');
      else if (from && to && to.col === from.col + 1) { from.outgoing += link.value; to.incoming += link.value; }
    });
    for (const node of nodes.values()) {
      // 用相对浮点容差避免 0.1 + 0.2 与 0.3 的表示误差造成伪警告。
      if (node.col > 0 && node.col < columns.length - 1 && Math.abs(node.incoming - node.outgoing) > 1e-9 * Math.max(1, node.incoming, node.outgoing))
        warn(node.loc, '中间列节点流入总和与流出总和不一致，建议核对流量口径');
    }
    if (own(data, 'headers')) {
      const headers = list('headers', columns.length, columns.length);
      headers.forEach((_, i) => text(headers, i, `headers[${i}]`, 0));
    }
    text(data, 'unit', 'unit', 0);
    if (own(data, 'focus') && (typeof data.focus !== 'string' || !nodes.has(data.focus))) fail('focus', '必须是存在的节点 label');
    const focused = typeof data.focus === 'string' && nodes.has(data.focus);
    steps = Math.max(2, Math.min(columns.length, 3)) - 1 + (focused ? 1 : 0);
  } else if (kind === 'forces') {
    const keys = ['entrants', 'suppliers', 'rivalry', 'buyers', 'substitutes'];
    if (!object(data.forces)) fail('forces', '必须是五力对象');
    else {
      for (const key of Object.keys(data.forces)) {
        const loc = `forces.${key}`, entry = data.forces[key];
        if (!keys.includes(key)) { fail(loc, '只能使用 entrants、suppliers、rivalry、buyers、substitutes 五个键'); continue; }
        if (!object(entry)) { fail(loc, '必须是对象'); continue; }
        text(entry, 'title', `${loc}.title`, 12); text(entry, 'text', `${loc}.text`, 20);
        if (own(entry, 'level') && !['high', 'mid', 'low', ''].includes(entry.level)) fail(`${loc}.level`, '只能是 high、mid、low 或空字符串');
      }
      for (const key of keys) if (!own(data.forces, key)) warn(`forces.${key}`, '五力缺少这一项，画面中对应格将为空');
    }
    if (own(data, 'order')) {
      if (!Array.isArray(data.order)) fail('order', '必须是五力键名数组');
      else data.order.forEach((key, i) => { if (!keys.includes(key)) fail(`order[${i}]`, '只能使用五个合法五力键名'); });
    }
    steps = Array.isArray(data.order) ? Math.max(1, data.order.filter((key) => keys.includes(key)).length) : 5;
  } else if (kind === 'diamond') {
    const phases = list('phases', 4, 4);
    eachObject(phases, 'phases', (phase, loc) => {
      text(phase, 'title', `${loc}.title`, 4); text(phase, 'text', `${loc}.text`, 22); text(phase, 'tag', `${loc}.tag`, 0);
    });
    if (own(data, 'labels')) {
      const labels = list('labels', 2, 2);
      labels.forEach((_, i) => text(labels, i, `labels[${i}]`, 6));
    }
    steps = 4;
  } else if (kind === 'pyramid') {
    const levels = list('levels', 3, 5);
    eachObject(levels, 'levels', (level, loc) => {
      text(level, 'title', `${loc}.title`, 8, true); text(level, 'text', `${loc}.text`, 22);
    });
    if (own(data, 'order') && !['top', 'bottom', ''].includes(data.order)) fail('order', '只能是 top、bottom 或空字符串');
    steps = Math.max(1, Math.min(levels.length, 5));
  }
  if (own(data, 'steps')) {
    if (!Array.isArray(data.steps)) fail('steps', '必须是对象数组');
    else {
      if (data.steps.length !== steps) warn('steps', `应与本页步数 ${steps} 一致，当前 ${data.steps.length} 条；多余步骤不会显示，缺少时回退到页面文案`);
      eachObject(data.steps, 'steps', (step, loc) => {
        if (kind !== 'quote') { title(step, `${loc}.title`); text(step, 'body', `${loc}.body`, 0); }
      });
    }
  }
}

// 仅这三个方向样张可只带一版；普通 family 仍必须深浅成对。
const DIRECTION_SAMPLES = Object.freeze({ stage: 'stage-dark', clay: 'clay-light', blueprint: 'blueprint-dark' });
// 正式新家族参与普通深浅成对规则，不能借用上面的单版样张例外。
const DIRECTION_FAMILIES = new Set([...Object.keys(DIRECTION_SAMPLES), 'poster', 'collage', 'cinema', 'iso', 'ink', 'riso']);
function validateDirectionFields(p, file, fail) {
  const at = (key, message) => fail(`${file}.${key}`, message);
  const group = (key, allowed) => {
    if (!own(p, key)) return false;
    if (!object(p[key])) { at(key, '必须是对象'); return false; }
    for (const name of Object.keys(p[key])) if (!allowed.includes(name)) at(`${key}.${name}`, '未知样张字段');
    return true;
  };
  const range = (key, value, lo, hi) => { if (!number(value) || value < lo || value > hi) at(key, `必须是 ${lo}～${hi} 的有限数字`); };
  if (group('render', ['direction', 'edges', 'scan', 'dimOthers', 'matte', 'rounded', 'dimensions', 'flat', 'paper', 'dof', 'streak', 'grade', 'grain', 'toon3', 'inkWash', 'riso'])) {
    const r = p.render;
    if (own(r, 'direction') && (!DIRECTION_FAMILIES.has(r.direction) || r.direction !== (p.baseFamily ?? p.family))) at('render.direction', '只能为与 baseFamily（省略时 family）一致的 stage、clay、blueprint、poster、collage、cinema、iso、ink、riso');
    for (const key of ['matte', 'dimensions', 'flat', 'paper', 'dof', 'streak', 'toon3', 'inkWash', 'riso']) if (own(r, key) && typeof r[key] !== 'boolean') at(`render.${key}`, '必须为布尔值');
    if (own(r, 'grade') && r.grade !== 'teal-orange') at('render.grade', '只能为 teal-orange；省略时不调色');
    if (own(r, 'grain')) range('render.grain', r.grain, 0, 1);
    if (r.flat === true && r.paper === true) at('render.paper', 'paper 与 flat 不能同时开启');
    if (own(r, 'dimOthers')) range('render.dimOthers', r.dimOthers, 0, 1);
    if (own(r, 'rounded')) range('render.rounded', r.rounded, 0, 0.49);
    if (own(r, 'edges')) {
      if (!object(r.edges)) at('render.edges', '必须是含 opacity、focusOpacity 的对象');
      else {
        for (const key of Object.keys(r.edges)) if (!['opacity', 'focusOpacity'].includes(key)) at(`render.edges.${key}`, '未知轮廓字段');
        for (const key of ['opacity', 'focusOpacity']) range(`render.edges.${key}`, r.edges[key], 0, 1);
        if (number(r.edges.opacity) && number(r.edges.focusOpacity) && r.edges.focusOpacity < r.edges.opacity) at('render.edges.focusOpacity', '焦点填充不能比普通填充更透明');
      }
    }
    if (own(r, 'scan')) {
      if (!object(r.scan)) at('render.scan', '必须是含 duration 的对象');
      else {
        for (const key of Object.keys(r.scan)) if (key !== 'duration') at(`render.scan.${key}`, '未知扫描字段');
        range('render.scan.duration', r.scan.duration, 0.1, 3);
      }
    }
  }
  if (group('camera', ['distScale', 'tilt', 'fov', 'ortho', 'iso'])) {
    for (const key of ['ortho', 'iso']) if (own(p.camera, key) && typeof p.camera[key] !== 'boolean') at(`camera.${key}`, '必须为布尔值');
    for (const [key, lo, hi] of [['distScale', 0.5, 2], ['tilt', -0.7, 0.7], ['fov', 10, 70]]) if (own(p.camera, key)) range(`camera.${key}`, p.camera[key], lo, hi);
  }
  if (own(p.floor, 'mode') && !['matte', 'reflective', 'blueprint'].includes(p.floor.mode)) at('floor.mode', '只能为 matte、reflective、blueprint');
  if (own(p.light, 'shadows') && typeof p.light.shadows !== 'boolean') at('light.shadows', '必须为布尔值');
  if (own(p.light, 'spotCone')) {
    const q = p.light.spotCone;
    if (!object(q)) at('light.spotCone', '必须是含 height、radius、opacity 的对象');
    else {
      for (const key of Object.keys(q)) if (!['height', 'radius', 'opacity'].includes(key)) at(`light.spotCone.${key}`, '未知光锥字段');
      range('light.spotCone.height', q.height, 1, 40); range('light.spotCone.radius', q.radius, 0.1, 10); range('light.spotCone.opacity', q.opacity, 0, 1);
    }
  }
}

// 只读取当前 presets/ 顶层 JSON，不将 _legacy 目录计入可用预设。
export function validatePresets({ root = process.cwd() } = {}) {
  const findings = [];
  const fail = (location, message) => findings.push({ severity: '失败', location, message });
  let files;
  try { files = readdirSync(path.join(SKILL, 'runtime', 'presets')).filter((f) => f.endsWith('.json')); }
  catch { fail('presets', '无法读取预设目录'); return findings; }
  if (!files.length) fail('presets', '必须至少有一组成对的风格预设');
  const families = new Map(), ids = new Set();
  const hex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  // 源码保留两种透明衍生色；它们不是基础色，不能强制抹掉透明度。
  const transparent = (value) => {
    if (hex(value)) return true;
    if (typeof value !== 'string') return false;
    const m = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\.\d+)\s*\)$/);
    return !!m && m.slice(1, 4).every((v) => +v <= 255) && +m[4] >= 0 && +m[4] <= 1;
  };
  for (const file of files) {
    let p;
    try { p = JSON.parse(readFileSync(path.join(SKILL, 'runtime', 'presets', file), 'utf8')); }
    catch { fail(file, '无法读取或解析预设 JSON'); continue; }
    if (!object(p)) { fail(file, '必须是预设对象'); continue; }
    for (const key of ['id', 'name', 'family', 'familyName'])
      if (typeof p[key] !== 'string' || !p[key].trim()) fail(`${file}.${key}`, '必须是非空字符串');
    if (ids.has(p.id)) fail(`${file}.id`, '预设 id 不能重复');
    ids.add(p.id);
    if (p.id !== file.slice(0, -5)) fail(`${file}.id`, '必须与文件名一致');
    // 构图是独立身份，基础方向仍继承源家族；不放宽原方向/深浅/数值校验。
    const composeBases = { keynote: 'ios', journal: 'paper', pinboard: 'collage', isoplan: 'iso' };
    if (own(p, 'compose')) {
      if (!own(composeBases, p.compose)) fail(`${file}.compose`, '只能为 keynote、journal、pinboard、isoplan');
      else {
        if (p.family !== p.compose) fail(`${file}.family`, '构图预设的 family 必须与 compose 一致');
        if (p.baseFamily !== composeBases[p.compose]) fail(`${file}.baseFamily`, '必须为该构图对应的基础 family');
      }
    } else if (own(p, 'baseFamily')) fail(`${file}.baseFamily`, 'baseFamily 必须与合法 compose 一起声明');
    if (!['dark', 'light'].includes(p.scheme)) fail(`${file}.scheme`, '只能为 dark 或 light');
    if (!object(p.shape)) fail(`${file}.shape`, '必须包含圆角配置对象');
    else for (const key of ['radius', 'chipRadius']) if (!number(p.shape[key]) || p.shape[key] < 0) fail(`${file}.shape.${key}`, '必须是非负有限数字');
    if (!object(p.colors)) fail(`${file}.colors`, '必须包含颜色对象');
    else {
      const colorKeys = ['bg', 'surface', 'surface2', 'sep', 'ink', 'muted', 'dim', 'neutral', 'ok', 'bad', 'accent', 'quiet', 'ghost', 'target', 'grid', 'ring', 'spot', 'dust'];
      for (const key of new Set([...colorKeys, ...Object.keys(p.colors)])) {
        if (['okName', 'badName'].includes(key)) continue;
        const alpha = ['shadow', 'badSoft'].includes(key);
        if (!(alpha ? transparent(p.colors[key]) : hex(p.colors[key]))) fail(`${file}.colors.${key}`, alpha ? '必须为 #RRGGBB 或有效 rgba 透明色' : '颜色必须为 #RRGGBB');
      }
      for (const key of ['okName', 'badName']) if (typeof p.colors[key] !== 'string' || !p.colors[key].trim()) fail(`${file}.colors.${key}`, '颜色名称必须非空');
    }
    for (const [group, key] of [['material', 'color'], ['floor', 'color'], ['light', 'key']])
      if (!hex(p[group]?.[key])) fail(`${file}.${group}.${key}`, '颜色必须为 #RRGGBB');
    validateDirectionFields(p, file, fail);
    if (typeof p.family === 'string' && p.family.trim()) {
      const members = families.get(p.family) ?? []; members.push(p); families.set(p.family, members);
    }
  }
  for (const [family, members] of families) {
    const sampleId = own(DIRECTION_SAMPLES, family) ? DIRECTION_SAMPLES[family] : null;
    const singleSample = sampleId && members.length === 1 && members[0].id === sampleId && members[0].scheme === sampleId.split('-').at(-1) && members[0].render?.direction === family;
    if (!singleSample && (members.length !== 2 || members.filter((p) => p.scheme === 'dark').length !== 1 || members.filter((p) => p.scheme === 'light').length !== 1))
      fail(`family:${family}`, '同 family 必须恰好 dark + light 各一；仅指定方向样张允许单版');
    if (new Set(members.map((p) => p.familyName)).size !== 1) fail(`family:${family}`, '同 family 的 familyName 必须一致');
  }
  return findings;
}

// 仅检查原始标题标记，不替换变量、不改动渲染文本。
function validateDecorations(page, fail, warn) {
  if (own(page, 'accent') && !['ok', 'bad', 'neutral'].includes(page.accent))
    fail('accent', '本页强调色只能是 ok、bad、neutral；跟随风格请省略 accent');
  // _more 是编辑器的隐藏数据缓存；各专项仅检查可见字段，不递归检查或渲染此子树。
  const title = (value, location) => {
    if (typeof value !== 'string') return; // 字段类型由各页型负责。
    const marks = value.match(/==/g) || [];
    if (marks.length % 2) fail(location, '标题关键词色块 == 未闭合，标记个数必须为偶数');
    if (Math.floor(marks.length / 2) > 1) warn(location, '一个标题超过 1 处关键词色块，建议只强调一处');
    for (const match of value.matchAll(/==([\s\S]*?)==/g)) {
      if (!match[1].trim()) fail(location, '标题关键词色块不能为空（====）');
      if ([...match[1].replace(/\{[^{}]*\}/g, '')].length > 8)
        warn(location, '关键词色块去掉模板变量后超过 8 字，建议缩短');
    }
  };
  title(page.title, 'title');
  if (Array.isArray(page.steps)) page.steps.forEach((step, i) => title(step?.title, `steps[${i}].title`));
  if (own(page, 'en')) {
    if (typeof page.en !== 'string') fail('en', '英文小标签 en 必须是字符串');
    else {
      if ([...page.en].length > 24) warn('en', '英文小标签超过 24 个字符，建议缩短');
      if (page.en.trim().split(/\s+/).filter(Boolean).length > 4) warn('en', '英文小标签超过 4 个词，建议缩短');
      if (/\p{Script=Han}/u.test(page.en)) warn('en', '英文小标签含中文，应使用英文');
    }
  }
}

export function validateDeck(deck, { root = process.cwd(), brightness = {} } = {}) {
  brightness = { ...brightness, cache: brightness.cache ?? new Map() };
  const findings = [];
  const add = (severity, location, message) => findings.push({ severity, location, message });
  const fail = (location, message) => add('失败', location, message);
  const warn = (location, message) => add('警告', location, message);
  if (!object(deck)) {
    fail('根节点', '必须是 JSON 对象');
    return findings;
  }
  const { component, preset } = deck;
  let presets = [];
  try {
    presets = readdirSync(path.join(SKILL, 'runtime', 'presets')).filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(path.join(SKILL, 'runtime', 'presets', f), 'utf8')));
  } catch { fail('preset', '无法读取 runtime/presets/ 中的预设 JSON'); }
  if (typeof preset !== 'string' || !presets.some((p) => p?.id === preset))
    fail('preset', `找不到预设 ${JSON.stringify(preset) ?? '（未填写）'}（按 runtime/presets/*.json 的 id 匹配）`);
  if (own(deck, 'presets')) {
    (Array.isArray(deck.pages) ? deck.pages : []).forEach((pg, k) => { if (pg && Object.hasOwn(pg, 'notes') && typeof pg.notes !== 'string') fail(`pages.${k}.notes`, '演讲者备注必须是字符串'); (Array.isArray(pg?.steps) ? pg.steps : []).forEach((st, j) => { if (st && Object.hasOwn(st, 'notes') && typeof st.notes !== 'string') fail(`pages.${k}.steps.${j}.notes`, '演讲者备注必须是字符串'); }); });
    if (Object.hasOwn(deck, 'brand') && !/^#[0-9a-fA-F]{6}$/.test(String(deck.brand))) fail('brand', '品牌色必须是 6 位十六进制色值，如 "#1F6FEB"');
    if (!Array.isArray(deck.presets) || !deck.presets.length) fail('presets', '必须是非空的预设 id 数组');
    else {
      deck.presets.forEach((id, i) => {
        if (typeof id !== 'string' || !presets.some((p) => p?.id === id))
          fail(`presets[${i}]`, `找不到预设 ${JSON.stringify(id)}（按 runtime/presets/*.json 的 id 匹配）`);
      });
      const families = new Map();
      for (const id of deck.presets) {
        const p = presets.find((p) => p?.id === id);
        if (!p?.family) continue;
        const modes = families.get(p.family) ?? new Set(); modes.add(p.scheme); families.set(p.family, modes);
      }
      for (const [family, modes] of families) if (!modes.has('dark') || !modes.has('light'))
        warn('presets', `${family} 只有一种深浅，按 P 切不到另一种模式`);
      if (!deck.presets.includes(preset)) fail('presets', '必须包含默认 preset，否则无法打包');
    }
  }
  if (own(deck, 'pages')) {
    // 顶层预设控制整个世界；页面字段不能创建独立的预设切换。
    findings.forEach((finding) => { finding.location = `整份演示：${finding.location}`; });
    const deckFail = (location, message) => fail(`整份演示：${location}`, message);
    const deckWarn = (location, message) => warn(`整份演示：${location}`, message);
    if (!Array.isArray(deck.pages) || !deck.pages.length) {
      deckFail('pages', '必须是包含至少 1 页的数组');
      return findings;
    }
    const first = deck.pages[0];
    if (!(first?.component === 'media' && first.mode === 'cover'))
      fail('第 1 页：component/mode', '第一页必须是 media cover；旧 narrative 请改用 flow / chapter / quote');
    const covers = deck.pages.filter((page) => page?.component === 'media' && page.mode === 'cover');
    if (covers.length > 1) deckFail('pages', '每份最多一张 media cover 封面');
    const dataPages = new Set(['compare-bars', 'funnel', 'trend', 'share', 'kpi']);
    if (deck.pages.filter((page) => page?.component === 'quote').length > 2) deckWarn('pages', '全稿 quote 超过 2 页，金句过多会削弱重点');
    const dataCount = deck.pages.filter((page) => dataPages.has(page?.component)).length;
    // 有数据形状就用数据页；只有超过 60% 才提醒（不要为了压比例把数据改成文字）
    if (dataCount * 5 > deck.pages.length * 3)
      deckWarn('pages', `3D 数据页占比 ${(dataCount / deck.pages.length * 100).toFixed(1)}%（${dataCount}/${deck.pages.length}），超过 60%；考虑合并相近的数据页，或在章节之间加图片页。不要把数据改写成文字页来压比例`);
    const hasEn = (page) => typeof page?.en === 'string' && page.en.trim().length > 0;
    if (deck.pages.some(hasEn) && deck.pages.some((page) => page && (page.component === 'media' || PAPER_LAYOUTS.has(page.component)) && !hasEn(page)))
      deckWarn('en', '有的页有英文小标签 en，有的版式页没有，建议整份统一');
    // 纯文字页（无图、也没有可放大的 **关键数字**）右半屏会空着
    const isBareReading = (page) => page?.component === 'media' && page.mode === 'reading' && !page.image
      && !(Array.isArray(page.paragraphs) ? page.paragraphs : []).some((q) => q && typeof q === 'object' && q.image);
    deck.pages.forEach((page, i) => {
      if (!isBareReading(page)) return;
      const ps = (Array.isArray(page.paragraphs) ? page.paragraphs : []).map((q) => (typeof q === 'string' ? { text: q } : q || {}));
      const missing = ps.filter((q) => !q.figure && !/\*\*.+?\*\*/.test(q.text || '')).length;
      if (missing) warn(`第 ${i + 1} 页：paragraphs`, `不配图的阅读页，右侧显示每段的关键数字；有 ${missing} 段没有 **加粗** 的数字或 figure，那一步右侧会空`);
    });
    const bare = deck.pages.filter(isBareReading).length;
    if (bare > Math.max(1, Math.floor(deck.pages.length / 4)))
      deckWarn('pages', `不配图的阅读页有 ${bare} 页，整份会像文档；合并文字页，或把结论写进数据页的步骤里`);
    deck.pages.forEach((page, i) => {
      const prefix = `第 ${i + 1} 页：`;
      if (!object(page)) { fail(`${prefix}根节点`, '必须是页面对象'); return; }
      if (own(page, 'pages')) { fail(`${prefix}pages`, '页面内不能嵌套整份演示'); return; }
      if (own(page, 'preset') || own(page, 'presets'))
        warn(`${prefix}preset`, '页面的 preset/presets 不生效，统一使用整份演示的预设');
      const { preset: ignoredPreset, presets: ignoredPresets, ...fields } = page;
      const pageFindings = validateDeck({ ...fields, preset,
        ...(Array.isArray(deck.presets) ? { presets: deck.presets } : {}),
      }, { root, brightness });
      // 顶层预设已经检查过，保留逐页内容与亮度结果，避免把模式缺失重复报告到每一页。
      findings.push(...pageFindings.filter((finding) => !/^presets?(?:$|\[)/.test(finding.location)).map((finding) => ({ ...finding, location: prefix + finding.location })));
      // 相邻数据页允许（镜头在同一个世界里飞过去），但同一种页型不要连着用，也不要连续三页
      const prev = deck.pages[i - 1]?.component, prev2 = deck.pages[i - 2]?.component;
      if (i > 0 && dataPages.has(page.component) && page.component === prev)
        warn(`${prefix}component`, `与第 ${i} 页连续使用同一种数据页型（${page.component}），观众会觉得重复；合并成一页，或中间放一页图文`);
      if (PAPER_LAYOUTS.has(page.component) && page.component === prev)
        warn(`${prefix}component`, `连续两页使用同一种 2D 页型（${page.component}），观众会觉得重复`);
      if (page.component === 'chapter' && !own(page, 'current') && i !== 1)
        warn(`${prefix}current`, 'chapter 用作目录（无 current）只能出现在第 2 页');
      if (i > 1 && dataPages.has(page.component) && dataPages.has(prev) && dataPages.has(prev2))
        warn(`${prefix}component`, `连续第三页 3D 数据页；中间放一页图文（照片、截图或章节）让观众喘口气`);
    });
    return findings;
  }
  validateDecorations(deck, fail, warn);
  // 只接受分发清单内的页型，数据仍由各专项校验负责。
  if (['process', 'narrative'].includes(component)) {
    fail('component', component + ' 已停用，请改用 flow / chapter / quote'); return findings;
  }
  if (!MANIFEST.components.includes(component)) {
    fail('component', '未知或未开放组件：' + String(component)); return findings;
  }
  if (component === 'media') {
    // tone 是图片元数据，结构校验仍交给原校验器；只移除已验证的声明，不吞其他未知字段。
    const toned = new Set();
    const image = (spec, location) => {
      if (!object(spec) || !own(spec, 'tone')) return spec;
      if (spec.tone !== 'dark') fail(location + '.tone', '图片 tone 只允许 dark，表示原生暗调照片');
      if (spec.tone === 'dark') toned.add(location + '.light');
      const { tone, ...rest } = spec;
      return rest;
    };
    const media = { ...deck };
    if (own(deck, 'image')) media.image = image(deck.image, 'image');
    if (Array.isArray(deck.paragraphs)) media.paragraphs = deck.paragraphs.map((p, i) => object(p) ? { ...p, ...(own(p, 'image') ? { image: image(p.image, `paragraphs[${i}].image`) } : {}) } : p);
    if (Array.isArray(deck.images)) media.images = deck.images.map((p, i) => object(p) ? { ...p, image: image(p.image, `images[${i}].image`) } : p);
    validateMedia(media, { root, fail, warn });
    validatePhotoBrightness(deck, { ...brightness, root, presets, warn: (location, message) => {
      if (toned.has(location) && message.startsWith('light 版照片偏暗'))
        warn(location, '此图已声明原生暗调（tone: dark），浅色预设下建议换深色版或换图；保留原图亮度');
      else warn(location, message);
    } });
    return findings;
  }

  if (PAPER_LAYOUTS.has(component)) {
    validatePaper(deck, fail, warn, root);
    return findings;
  }
  if (component === 'kpi') {
    validateKpi(deck, presets, fail, warn);
    return findings;
  }
  if (component === 'share') {
    validateShare(deck, presets, fail, warn);
    return findings;
  }
  if (component === 'trend') {
    validateTrend(deck, presets, fail, warn);
    return findings;
  }
  if (component === 'funnel') {
    validateFunnel(deck, presets, fail, warn);
    return findings;
  }
  if (component !== 'compare-bars') return findings;
  validateBetter(deck, fail);
  const max = deck.max ?? 100;
  if (!number(max) || max <= 0) fail('max', '必须是大于 0 的有限数字');
  // 只在可切换预设全部带 compose 时采用新默认；混合/未限制预设仍按旧 max 校验。
  const selected = Array.isArray(deck.presets) ? deck.presets : presets.map((p) => p.id);
  const allCompose = selected.length > 0 && selected.every((id) => presets.some((p) => p.id === id && p.compose));
  const breakdownBase = own(deck, 'breakdownBase') ? deck.breakdownBase
    : allCompose && number(deck.target?.value) ? 'target' : 'max';
  if (allCompose && hasMaxBasedBreakdown(deck))
    warn('breakdownBase', '拆分看起来按满分算，请写 breakdownBase: "max"');
  if (!['max', 'target'].includes(breakdownBase)) fail('breakdownBase', '必须为 "max" 或 "target"');
  if (deck.target && deck.breakdownBase === 'max') warn('breakdownBase', '显式 max 表示距满分 max 的差额，不是距 target 目标的缺口；要拆目标缺口请用 target');
  if (breakdownBase === 'target' && !own(deck, 'target')) fail('target', 'breakdownBase 为 "target" 时必须提供 target');
  if (own(deck, 'decimals') && (!Number.isInteger(deck.decimals) || deck.decimals < 0 || deck.decimals > 2))
    fail('decimals', '必须是 0～2 的整数');
  const inScale = (v) => number(v) && (!number(max) || max <= 0 || (v >= 0 && v <= max));
  const items = Array.isArray(deck.items) ? deck.items : [];
  if (!Array.isArray(deck.items) || items.length < 2 || items.length > 12)
    fail('items', items.length > 12 ? `共 ${items.length} 项，超过上限 12：只画前几名和最差几名、其余合并成"其他"，或者拆成两页` : '必须是包含 2～12 个项目的数组');
  else if (items.length > 8) warn('items', `共 ${items.length} 项：柱子会变窄、名称会缩小，名称尽量 ≤ 4 字`);
  items.forEach((item, i) => {
    if (!object(item)) { fail(`items[${i}]`, '必须是对象'); return; }
    if (!inScale(item.value)) fail(`items[${i}].value`, '必须是 0～max 范围内的有限数字（不能用数字字符串）');
    for (const key of ['code', 'name']) if (own(item, key) && typeof item[key] !== 'string')
      fail(`items[${i}].${key}`, '必须是字符串');
  });
  if (own(deck, 'target')) {
    if (!object(deck.target)) fail('target', '必须是对象');
    else {
      if (!inScale(deck.target.value)) fail('target.value', '必须是 0～max 范围内的有限数字');
      if (own(deck.target, 'label') && typeof deck.target.label !== 'string') fail('target.label', '必须是字符串');
    }
  }
  let fi;
  if (!own(deck, 'focus') || deck.focus === 'auto') {
    if (items.length && items.every((item) => object(item) && number(item.value))) {
      fi = 0;
      items.forEach((item, i) => { if (item.value < items[fi].value) fi = i; });
    }
  } else if (Number.isInteger(deck.focus) && deck.focus >= 0 && deck.focus < items.length) fi = deck.focus;
  else fail('focus', '必须为 "auto" 或 items 的合法下标（从 0 开始）');
  const focus = items[fi];
  const rawParts = Array.isArray(focus?.breakdown) ? focus.breakdown.slice(0, 5) : [];
  const sum = rawParts.reduce((total, part) => total + (number(part?.value) ? part.value : 0), 0) || 1;
  let topIndex = 0;
  rawParts.forEach((part, i) => { if (part?.value > rawParts[topIndex]?.value) topIndex = i; });
  const largest = rawParts[topIndex];
  const hasTarget = number(deck.target?.value);
  const pass = hasTarget ? items.filter((item) => number(item?.value) && item.value >= deck.target.value).length : items.length;
  const vars = {
    n: items.length, pass, fail: items.length - pass, unit: deck.unit ?? '', target: deck.target?.value,
    gap: hasTarget && number(focus?.value) ? deck.target.value - focus.value : 0, max,
    maxLabel: deck.maxLabel ?? '满分', focus,
    top: largest ? { name: largest.name, value: largest.value, share: Math.round(largest.value / sum * 100), index: topIndex } : {},
    okName: presets.find((p) => p?.id === preset)?.colors?.okName,
    badName: presets.find((p) => p?.id === preset)?.colors?.badName,
  };
  const fillTitle = (text) => renderedTitle(text, vars);
  if (object(focus) && own(focus, 'breakdown')) {
    const parts = focus.breakdown;
    const location = `items[${fi}].breakdown`;
    if (!Array.isArray(parts) || parts.length < 1 || parts.length > 5)
      fail(location, '必须是包含 1～5 项的数组');
    if (Array.isArray(parts)) {
      parts.forEach((part, i) => {
        if (!object(part) || !number(part.value) || part.value <= 0)
          fail(`${location}[${i}].value`, '必须是大于 0 的有限数字');
        if (object(part) && own(part, 'name') && typeof part.name !== 'string')
          fail(`${location}[${i}].name`, '必须是字符串');
      });
      if (parts.length && parts.every((part) => object(part) && number(part.value) && part.value > 0) && number(max) && number(focus.value)) {
        const sum = parts.reduce((s, part) => s + part.value, 0);
        const base = breakdownBase === 'target' ? deck.target?.value : max;
        const gap = base - focus.value;
        if (number(base) && Math.abs(sum - gap) > 1)
          warn(location, `分项合计 ${sum}，${breakdownBase === 'target' ? 'target.value' : 'max'} − 焦点值为 ${gap}，相差超过 1；画面会按比例缩放，标签仍显示原值`);
      }
    }
  }
  for (const key of ['eyebrow', 'unit', 'diffUnit', 'maxLabel', 'passLabel', 'failLabel'])
    if (own(deck, key) && typeof deck[key] !== 'string') fail(key, '必须是字符串');

  const known = new Set(TEMPLATE_VARIABLES);
  const checkTemplate = (value, location) => {
    if (typeof value !== 'string') { fail(location, '必须是字符串'); return; }
    warnMissingVariables(value, location, vars, (variable) => known.has(variable)
      || /^focus\.[\w.]+$/.test(variable) && hasPath(focus, variable.split('.').slice(1)), warn,
    (variable) => variable.startsWith('top.') && !rawParts.length
      ? '焦点项没有拆分数据，含 {top.*} 的句子会被省略' : undefined);
    if (/[0-9]/.test(value.replace(/\{[^{}]*\}/g, '')))
      warn(location, '数字请用模板变量，否则改数据后文字不会更新');
    for (const match of value.matchAll(/\{([^{}]*)\}/g)) {
      const variable = match[1];
      const customFocus = /^focus\.[\w.]+$/.test(variable) && hasPath(focus, variable.split('.').slice(1));
      if (!known.has(variable) && !customFocus) fail(location, `未知模板变量 {${variable}}；自定义字段须写成 {focus.字段名} 且在当前焦点项上存在`);
    }
  };
  if (!Array.isArray(deck.steps) || deck.steps.length !== 3) fail('steps', '必须恰好包含 3 步');
  if (Array.isArray(deck.steps)) deck.steps.forEach((step, i) => {
    const location = `steps[${i}]`;
    if (!object(step)) { fail(location, '必须是对象'); return; }
    if (typeof step.title !== 'string' || !step.title.trim()) fail(`${location}.title`, '必须填写非空标题');
    if (own(step, 'title')) {
      checkTemplate(step.title, `${location}.title`);
      if (typeof step.title === 'string') {
        // 同时接受 JSON 的 \n 换行和误写成字面量 \\n 的换行分隔符。
        const lines = fillTitle(step.title).split(/\r\n|[\r\n]|\\n/);
        if (lines.length > 2) warn(`${location}.title`, `标题共 ${lines.length} 行，超过 2 行`);
        lines.forEach((line, j) => {
          const length = [...line].length;
          if (length > 13) warn(`${location}.title 第 ${j + 1} 行`, `模板填值后共 ${length} 字符，建议不超过 13 个汉字`);
        });
      }
    }
    for (const key of ['body', 'result']) if (own(step, key)) checkTemplate(step[key], `${location}.${key}`);
    if (own(step, 'chips')) {
      if (!Array.isArray(step.chips)) fail(`${location}.chips`, '必须是字符串数组');
      else step.chips.forEach((chip, j) => checkTemplate(chip, `${location}.chips[${j}]`));
    }
    if (own(step, 'legend') && typeof step.legend !== 'boolean') fail(`${location}.legend`, '必须是布尔值');
  });
  return findings;
}

export function runCli(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('用法：node <SKILL>/scripts/validate.mjs <deck.json> 或 --presets\n只校验数据，不启动浏览器。退出码：0 无失败（允许警告）；1 数据、文件或参数错误。');
    return 0;
  }
  if (args.length === 1 && args[0] === '--presets') {
    const findings = validatePresets();
    for (const f of findings) console.log(`${f.severity}：${f.location}：${f.message}`);
    const failures = findings.filter((f) => f.severity === '失败').length;
    console.log(`${failures ? '校验失败' : '校验通过'}：presets/；${failures} 项失败。`);
    return failures ? 1 : 0;
  }
  if (args.length !== 1 || args[0].startsWith('-')) {
    console.error('失败：请指定一份数据文件。用法：node <SKILL>/scripts/validate.mjs <deck.json>');
    return 1;
  }
  let deck;
  try { deck = JSON.parse(readFileSync(args[0], 'utf8')); }
  catch (error) { console.error(`失败：无法读取或解析 ${args[0]}：${error.message}`); return 1; }
  const findings = validateDeck(deck);
  for (const finding of findings) console.log(`${finding.severity}：${finding.location}：${finding.message}`);
  const failures = findings.filter((f) => f.severity === '失败').length;
  const warnings = findings.length - failures;
  console.log(`${failures ? '校验失败' : '校验通过'}：${args[0]}；${failures} 项失败，${warnings} 项警告。`);
  return failures ? 1 : 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = runCli(process.argv.slice(2));
