// 用法：node <SKILL>/scripts/playback.mjs <已构建.html> [另一份.html] --out <报告.json>
// 验证实际导航、逐层显隐、布局和连续帧；不能替代真实播放视觉验收。
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDeck } from './playback-browser-session.mjs';

export async function inspectPlayback() {
  const deck = window.__deck, debug = window.__dbg;
  if (!deck || !debug || !deck.data || !Number.isInteger(deck.steps) || deck.steps < 1) throw new Error('需要带 __deck 和 __dbg 接口的已构建 HTML');
  const multipage = Array.isArray(deck.data.pages);
  const checks = [], skipped = [];
  const finish = () => {
    const gl = debug.renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { preset: deck.data.preset, mode: multipage ? '整稿' : '旧单组件', pages: multipage ? deck.data.pages.length : 1, steps: deck.steps,
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), checks, skipped };
  };
  const check = (name, pass, details) => checks.push({ name, pass: !!pass, details });
  const state = () => {
    const boxes = [...document.querySelectorAll('.page-box')];
    return { page: multipage ? boxes.findIndex((box) => Number(box.style.opacity) === 1) : 0,
      step: [...document.querySelectorAll('#dots i')].findIndex((dot) => dot.classList.contains('on')) };
  };
  const press = (key, extra = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
  const same = (a, b) => a.page === b.page && a.step === b.step;
  const rows = [];
  deck.go(0); deck.settle(8);
  for (let index = 0; index < deck.steps; index++) {
    if (index) press('ArrowRight');
    rows.push(state());
  }
  const last = state(); press('ArrowRight');
  check('右边界保持不变', same(last, state()));
  let reversible = true;
  for (let index = rows.length - 2; index >= 0; index--) {
    press('ArrowLeft');
    reversible &&= same(rows[index], state());
  }
  check('前进后退以相同顺序遍历全部步骤', reversible && new Set(rows.map((r) => r.page + ':' + r.step)).size === deck.steps, { steps: rows.length });
  const first = state(); press('ArrowLeft');
  check('左边界保持不变', same(first, state()));
  press('ArrowRight'); const once = state();
  press('ArrowRight', { repeat: true });
  check('长按方向键不连续跳步', same(once, state()));
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'isComposing']) {
    const before = state(); press('ArrowRight', { [modifier]: true });
    check(`${modifier} 不触发翻页`, same(before, state()));
  }
  if (typeof deck.edit === 'function') {
    deck.edit(true); const editing = state(); press('ArrowRight');
    check('编辑模式方向键不翻页', same(editing, state()));
    press('Escape');
    check('Escape 退出编辑', !document.body.classList.contains('editing'));
  } else skipped.push({ name: '整稿编辑模式', reason: '旧单组件没有 __deck.edit 接口' });

  const button = document.createElement('button');
  button.textContent = '播放测试按钮'; document.body.append(button); button.focus();
  for (const key of ['Enter', ' ']) {
    const before = state();
    const native = button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    check(`按钮聚焦时保留 ${key === ' ' ? '空格' : key} 原生行为`, native && same(before, state()));
  }
  button.remove();

  if (!multipage) {
    skipped.push(
      { name: '逐页层级、阅读、高亮、跨页相机检查', reason: '旧单组件没有 pages 页面序列' },
      { name: '纸面重绘计数和连续帧亮度检查', reason: '旧单组件没有 prof、flicker 诊断接口' },
    );
    return finish();
  }

  const entries = new Map();
  rows.forEach((row, index) => { if (!entries.has(row.page)) entries.set(row.page, index); });
  const boxes = [...document.querySelectorAll('.page-box')];
  for (const [pageIndex, start] of entries) {
    const data = deck.data.pages[pageIndex], box = boxes[pageIndex];
    const count = rows.filter((row) => row.page === pageIndex).length;
    if (data.component === 'tree') {
      deck.go(start);
      const hidden = [...box.querySelectorAll('.k1,.k2')].every((node) => {
        const css = getComputedStyle(node);
        return css.visibility === 'hidden' || Number(css.opacity) === 0;
      });
      check(`第 ${pageIndex + 1} 页：进页时隐藏未讲到的树层级`, hidden);
      deck.go(start + 1); deck.settle(6);
      check(`第 ${pageIndex + 1} 页：第一层按步骤高亮`, [...box.querySelectorAll('.k1')].every((node) => node.classList.contains('on')));
    }
    if (['features', 'table'].includes(data.component)) {
      const selector = data.component === 'features' ? '.bx-c' : 'tr.r';
      const nodes = [...box.querySelectorAll(selector)];
      const expected = (data.highlight || []).map((item) => typeof item === 'number' ? item : item.row);
      const actual = [];
      for (let step = 0; step <= expected.length; step++) {
        deck.go(start + step); deck.settle(6);
        actual.push(nodes.flatMap((node, index) => node.classList.contains('on') ? [index] : []));
      }
      check(`第 ${pageIndex + 1} 页：从总览按配置顺序高亮`, JSON.stringify(actual) === JSON.stringify([[], ...expected.map((i) => [i])]), { actual, expected });
    }
    if (data.component === 'media' && data.mode === 'reading' && data.steps) {
      for (let step = 0; step < data.paragraphs.length; step++) {
        deck.go(start + step); deck.settle(6);
        const title = document.getElementById('title').textContent.replace(/\s/g, '');
        check(`第 ${pageIndex + 1} 页：阅读标题对应段落 ${step + 1}`, title === (data.steps[step]?.title ?? data.title ?? '').replace(/==|\s/g, ''));
        const paragraph = data.paragraphs[step];
        const expected = (typeof paragraph === 'string' ? paragraph : paragraph.text).replace(/\*\*|\s/g, '');
        check(`第 ${pageIndex + 1} 页：高亮段落对应标题 ${step + 1}`,
          [...box.querySelectorAll('.on')].some((node) => node.textContent.replace(/\s/g, '').includes(expected)));
      }
    }
    if (String(deck.data.preset).startsWith('keynote') && ['points', 'features', 'actions'].includes(data.component)) {
      deck.go(start); deck.settle(8);
      const snapshots = [];
      for (let step = 0; step < count; step++) {
        deck.go(start + step); deck.settle(6);
        snapshots.push([...box.querySelectorAll('.kn-row')].map((node) => node.getBoundingClientRect().top));
      }
      const drift = Math.max(0, ...snapshots.flatMap((snapshot) => snapshot.map((top, i) => Math.abs(top - snapshots[0][i]))));
      check(`第 ${pageIndex + 1} 页：焦点变化时条目位置稳定`, drift < 1, { maxDriftPx: drift });
    }
    if (['compare-bars', 'funnel', 'trend', 'share', 'kpi'].includes(data.component)) {
      for (let step = 0; step < count; step++) {
        deck.go(start + step); deck.settle(12);
        const metrics = debug.flicker(36, 680, 300, 1220, 650);
        check(`第 ${pageIndex + 1} 页第 ${step + 1} 步：停稳后无重复大幅亮度跳变`, metrics.repeatHotPx < 80, metrics);
      }
    }
  }
  const trend = [...entries].find(([index]) => deck.data.pages[index].component === 'trend');
  if (trend) {
    const [pageIndex, start] = trend, next = entries.get(pageIndex + 1);
    if (next !== undefined) {
      const camera = () => debug.composer.passes[0].camera.position.toArray();
      deck.go(0); deck.settle(8); deck.go(next); deck.settle(8); const direct = camera();
      deck.go(0); deck.settle(8); deck.go(start); deck.settle(.1); deck.go(next); deck.settle(8);
      const rapid = camera(), error = Math.hypot(...rapid.map((v, i) => v - direct[i]));
      check('离开未完成入场的趋势页不影响下一页镜头', error < .001, { direct, rapid, error });
    }
  }
  for (const [photoIndex, photoStart] of entries) {
    const photo = deck.data.pages[photoIndex];
    const chartIndex = photoIndex + 1, chartStart = entries.get(chartIndex);
    if (photo.component !== 'media' || photo.mode !== 'photo' || chartStart === undefined || deck.data.pages[chartIndex].component !== 'compare-bars') continue;
    const baseline = [...entries].find(([index]) => index !== chartIndex && !(deck.data.pages[index].component === 'media' && deck.data.pages[index].mode === 'photo'));
    if (!baseline) {
      skipped.push({ name: `第 ${photoIndex + 1} 页照片转第 ${chartIndex + 1} 页柱图镜头检查`, reason: '缺少可供对照的非照片起始页' });
      continue;
    }
    const camera = () => debug.composer.passes[0].camera.position.toArray();
    deck.go(baseline[1]); deck.settle(8); deck.go(chartStart); deck.settle(8);
    const direct = camera();
    for (let repeat = 0; repeat < 2; repeat++) {
      deck.go(baseline[1]); deck.settle(8); deck.go(photoStart); deck.settle(.1); deck.go(chartStart); deck.settle(8);
      const afterPhoto = camera(), error = Math.hypot(...afterPhoto.map((value, index) => value - direct[index]));
      check(`第 ${photoIndex + 1} 页照片快速转柱图${repeat ? '重复进页' : '首次进页'}不改变镜头`, error < .001, { direct, afterPhoto, error });
    }
  }
  if (debug.renderState?.().paper) {
    const dataPage = [...entries].find(([index]) => ['trend', 'share', 'compare-bars', 'funnel', 'kpi'].includes(deck.data.pages[index].component));
    if (dataPage) {
      deck.go(dataPage[1]); deck.settle(15);
      const before = debug.prof.n;
      let mutations = 0;
      const observer = new MutationObserver((records) => { mutations += records.length; });
      observer.observe(boxes[dataPage[0]], { subtree: true, attributes: true, childList: true, characterData: true });
      for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
      observer.disconnect();
      const after = debug.prof.n;
      check('纸面图表停稳后不再持续重绘', after === before && debug.renderState().remaining === 0, { before, after });
      check('纸面图表停稳后标签停止改写 DOM', mutations === 0, { mutations });
      if (dataPage[1] + 1 < deck.steps) press('ArrowRight');
      else deck.go(dataPage[1]);
      for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
      check('下一步重新唤醒纸面渲染', debug.prof.n > after, { before: after, after: debug.prof.n });
    }
  }
  return finish();
}

export function parsePlaybackArgs(args) {
  const files = [];
  let output = 'playback-report.json';
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--out') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('--out 缺少报告文件路径');
      output = value;
    } else if (arg.startsWith('-')) throw new Error(`未知参数：${arg}`);
    else files.push(arg);
  }
  if (!files.length) throw new Error('请指定至少一份已构建的 HTML');
  return { files, output };
}

export async function runPlayback({ files, output }) {
  const reports = [];
  for (const file of files) {
    let session;
    const report = { input: path.resolve(file), errors: [], checks: [] };
    try {
      session = await openDeck(file);
      Object.assign(report, await session.page.evaluate(`(${inspectPlayback.toString()})()`));
      report.errors.push(...session.errors);
    } catch (error) {
      report.errors.push({ message: error.message });
    } finally {
      if (session) try { await session.close(); }
      catch (error) { report.errors.push({ message: `清理失败：${error.message}` }); }
    }
    reports.push(report);
    console.log(`${path.basename(file)}：${report.checks.filter((c) => c.pass).length}/${report.checks.length} 项通过；${report.renderer || '未取得渲染器信息'}`);
    for (const check of report.checks.filter((c) => !c.pass)) console.log('失败', check.name, JSON.stringify(check.details));
    for (const skipped of report.skipped || []) console.log('未覆盖', skipped.name, skipped.reason);
    for (const error of report.errors) console.log('错误', error.message || JSON.stringify(error));
  }
  await mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await writeFile(output, JSON.stringify(reports, null, 2) + '\n');
  if (reports.some((r) => r.errors.length || r.checks.some((c) => !c.pass))) process.exitCode = 1;
  return reports;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const opts = parsePlaybackArgs(process.argv.slice(2));
    if (opts.help) console.log('用法：node <SKILL>/scripts/playback.mjs <已构建.html> [另一份.html] [--out 报告.json]');
    else await runPlayback(opts);
  } catch (error) {
    console.error(`播放检查失败：${error.message}`);
    process.exitCode = 1;
  }
}
