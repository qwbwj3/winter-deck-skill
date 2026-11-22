#!/usr/bin/env node
// 真显卡 Chrome / CDP 截图与检查；无 npm 依赖，不修改输入 HTML。
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm, access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectPage, inspectGpu, pngBrightness, pngEdges, stepFindings, reportExitCode } from './checks.mjs';
import { ProcessTree } from './process-tree.mjs';
import { findBrowser } from './browser-paths.mjs';

const ROOT = process.cwd();
import { LocalWebSocket as WebSocket } from './websocket.mjs';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const HELP = `用法：node <SKILL>/scripts/snap.mjs <html路径> [--check] [--out 目录] [--w 1600 --h 900]
参数：
  --check          开启每一步自动检查；无此参数也记录诊断信息和亮度
  --out 目录       默认：当前工作目录 .tmp/check-demo（覆盖同名工具产物）
  --w / --h       截图宽高，默认 1600 / 900，单位 CSS 像素，DPR 固定为 1
  --settle 秒      每步动画快进时长，默认 6；启动快进固定为 6 秒
  --steps 数字     旧 __dbg 接口步数，默认 3；__deck.steps 始终优先
  --timeout 毫秒   启动、接口等待及单条 CDP 命令超时，默认 20000
  --help          显示帮助
退出码：0 无失败（允许警告）；1 检查失败、运行失败或参数错误。`;

function parseArgs(args) {
  const opts = { out: path.join(ROOT, '.tmp', 'check-demo'), w: 1600, h: 900,
    settle: 6, steps: 3, timeout: 20000, check: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--check') { opts.check = true; continue; }
    const key = { '--out': 'out', '--w': 'w', '--h': 'h', '--settle': 'settle',
      '--steps': 'steps', '--timeout': 'timeout' }[arg];
    if (key) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${arg} 缺少参数`);
      opts[key] = key === 'out' ? path.resolve(args[++i]) : Number(args[++i]);
    } else if (arg.startsWith('-')) throw new Error(`未知参数：${arg}`);
    else if (opts.input) throw new Error('只能指定一个 HTML 文件');
    else opts.input = path.resolve(arg);
  }
  if (!opts.input) throw new Error('请指定 HTML 文件');
  for (const key of ['w', 'h']) if (!Number.isInteger(opts[key]) || opts[key] < 1 || opts[key] > 8192)
    throw new Error(`${key} 必须为 1～8192 的整数`);
  if (opts.w * opts.h > 40_000_000) throw new Error('截图总像素不得超过 4000 万');
  if (!Number.isFinite(opts.settle) || opts.settle <= 0 || opts.settle > 60) throw new Error('--settle 必须大于 0 且不超过 60 秒');
  if (!Number.isInteger(opts.steps) || opts.steps < 1 || opts.steps > 300) throw new Error('--steps 必须为 1～300 的整数');
  if (!Number.isInteger(opts.timeout) || opts.timeout < 1000 || opts.timeout > 300000) throw new Error('--timeout 必须为 1000～300000 毫秒');
  return opts;
}

export class CDP {
  constructor(socket, timeout, onEvent) {
    this.socket = socket; this.timeout = timeout; this.sequence = 0; this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const p = this.pending.get(message.id);
        if (!p) return;
        clearTimeout(p.timer); this.pending.delete(message.id);
        if (message.error) p.reject(new Error(`CDP ${p.method}：${JSON.stringify(message.error)}`));
        else p.resolve(message.result);
      } else onEvent(message);
    });
    socket.addEventListener('close', () => this.rejectAll(new Error('CDP 连接已关闭')));
    socket.addEventListener('error', () => this.rejectAll(new Error('CDP WebSocket 连接错误')));
  }
  static async connect(url, timeout, onEvent = () => {}) {
    const socket = new WebSocket(url);
    const cdp = new CDP(socket, timeout, onEvent);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.close(); reject(new Error('CDP WebSocket 连接超时')); }, timeout);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP WebSocket 连接失败')); }, { once: true });
    });
    return cdp;
  }
  send(method, params = {}, timeout = this.timeout) {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState !== WebSocket.OPEN) return reject(new Error('CDP 未连接'));
      const id = ++this.sequence;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP ${method} 超时（${timeout} 毫秒）`)); }, timeout);
      this.pending.set(id, { resolve, reject, timer, method });
      try { this.socket.send(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`页面求值失败：${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
    if (!result.result || result.result.subtype === 'error') throw new Error('页面求值未返回有效结果');
    return result.result.value;
  }
  rejectAll(error) {
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); }
    this.pending.clear();
  }
  close() { this.rejectAll(new Error('CDP 主动关闭')); this.socket.close(); }
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mdText = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
export function renderMarkdown(report) {
  const lines = ['# HTML 动画页截图检查报告', '', `- 结果：**${report.status}**`,
    `- 输入：\`${report.input}\``, `- 时间：${report.startedAt}`,
    `- 检查模式：${report.options.check ? '已开启' : '未开启（仅截图与诊断，不判定布局/黑屏）'}`,
    `- 截图尺寸：${report.options.w} × ${report.options.h}，DPR 1`,
    `- 页面接口：${report.api || '尚未取得'}；计划步数：${report.stepCount ?? '未知'}`,
    `- WebGL2：${report.gpu ? (report.gpu.webgl2 ? '可用' : '不可用') : '未取得'}`,
    `- 显卡渲染器：${mdText(report.gpu?.unmaskedRenderer || report.gpu?.renderer || '未取得')}`,
    `- 真显卡证据：${report.gpu?.hardwareStatus || '未取得'}`,
    `- 浏览器进程组退出：${report.cleanup?.processGroupExited === true ? '已验证' : report.cleanup?.processGroupExited === false ? '未确认' : '未启动'}`,
    `- 完整进程树退出：${report.cleanup?.processTreeExited === true ? '已验证' : report.cleanup?.processTreeExited === false ? '有残留' : '未验证'}`,
    `- 进程组 EPERM 逐进程回退：${report.cleanup?.groupSignalFallback ? '已启用（按本次配置目录追踪，结果见退出验证）' : '未启用'}`,
    `- 临时配置目录删除：${report.cleanup?.profileRemoved === true ? '已完成' : report.cleanup?.profileRemoved === false ? '未完成' : '未创建'}`, ''];
  if (report.findings.length) {
    lines.push('## 全局问题', '');
    for (const f of report.findings) lines.push(`- **${f.severity}**：${mdText(f.message)}`);
    lines.push('');
  }
  lines.push('## 逐步检查', '', '| 步骤 | 结果 | 可见文字元素 | 标题行数 | 中心亮度 | 截图 |', '|---|---|---:|---:|---:|---|');
  for (const step of report.steps) lines.push(`| ${step.number} | ${step.status} | ${step.dom.elements.length} | ${step.dom.title.lines} | ${step.brightness.mean.toFixed(3)} | [查看](${step.screenshot}) |`);
  for (const step of report.steps) {
    lines.push('', `### 第 ${step.number} 步`, '', `标题：${mdText(step.dom.title.text || '无标题')}`);
    for (const f of step.findings) {
      lines.push(`- **${f.severity}**：${mdText(f.message)}`);
      if (f.code === 'text-overlap') for (const d of f.details) lines.push(`  - ${mdText(d.a)}「${mdText(d.aText)}」 / ${mdText(d.b)}「${mdText(d.bText)}」：交叠 ${(d.ratio * 100).toFixed(2)}%`);
      if (f.code === 'outside-stage') for (const d of f.details) lines.push(`  - ${mdText(d.key)}「${mdText(d.text)}」`);
      if (f.code === 'label-near-copy') for (const d of f.details) lines.push(`  - ${mdText(d.label)}「${mdText(d.labelText)}」 / ${mdText(d.copy)}「${mdText(d.copyText)}」：水平距离 ${d.distance.toFixed(2)}px`);
      if (f.code === 'err-element') lines.push(`  - ${mdText(f.details)}`);
    }
    if (!step.findings.length) lines.push(report.options.check ? '- 本步检查未发现问题。' : '- 未启用自动判定，详见 JSON 诊断数据。');
  }
  lines.push('', '## 控制台错误与页面异常', '');
  if (!report.events.length) lines.push('- 无已收集错误。未完成加载时，这不代表页面无错误。');
  for (const event of report.events) lines.push(`- [${event.phase}] ${event.kind}：${mdText(event.text)}`);
  if (report.chromeStderr) lines.push('', '## Chrome 标准错误输出', '', '```text', report.chromeStderr.replace(/```/g, "'''"), '```');
  if (report.contacts?.length) {
    lines.push('', '## 联系表', '', '每行 4 张，每张宽 480 像素；按左上角步号逐张核对。');
    for (const contact of report.contacts) lines.push('', `![第 ${contact.firstStep}～${contact.lastStep} 步](${contact.file})`);
  }
  lines.push('', '## 判定范围', '', '- 重叠仅检查约定选择器的可见文字元素，使用文本 Range 合并包围盒（无文本时退回元素盒），排除 .copy 容器；父子节点不互判。跟随标签距左侧文字水平不足 24px 仅警告。几何筛查不能代替视觉验收。',
    '- 文字对比度检查版式区和 3D 标签中的直接文字；有效 opacity 小于 0.85 或视口外的文字跳过。按计算色与祖先背景的 alpha 合成后计算 WCAG 对比度，字号 ≥24px 或 ≥18.66px 且字重 ≥700 用 3:1，其余用 4.5:1；低于阈值失败。此项不采样图片、渐变或 3D 画布。',
    '- 黑屏检查使用截图中心 50% 宽 × 50% 高区域，按 Rec.709 权重计算 0～255 平均亮度，严格小于 3 才失败。',
    '- 舞台边界以 #stage 实际包围盒为准（含页面缩放）；不修改舞台尺寸或页面内容。',
    '- 启动和当前步骤的错误分别记录；全程任一错误都会令最终结果失败。完整坐标及诊断见 report.json。', '');
  return lines.join('\n');
}

// 使用截图时已经打开的工具浏览器排版，号码为 HTML 文字，不依赖 ffmpeg 字体滤镜。
export function contactPages(screenshots, width, height) {
  const thumb = 480, gap = 16, columns = 4, perPage = 16;
  const thumbH = Math.round(thumb * height / width), captionH = 32;
  const pages = [];
  for (let start = 0; start < screenshots.length; start += perPage) {
    const group = screenshots.slice(start, start + perPage);
    const file = `contact-${String(pages.length + 1).padStart(2, '0')}.png`;
    const rows = Math.ceil(group.length / columns);
    const w = columns * thumb + (columns + 1) * gap;
    const h = rows * (thumbH + captionH) + (rows + 1) * gap;
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:${gap}px;display:grid;grid-template-columns:repeat(${columns},${thumb}px);gap:${gap}px;background:#18202c;color:#fff;font:14px sans-serif}figure{margin:0;width:${thumb}px;position:relative}img{width:${thumb}px;height:${thumbH}px;display:block}.step-number{position:absolute;right:6px;top:${thumbH - 30}px;padding:3px 8px;background:rgba(0,0,0,.72);color:#fff;font:bold 15px sans-serif;border-radius:3px}figcaption{height:${captionH}px;line-height:${captionH}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style>${group.map((s) => `<figure><img src="data:image/png;base64,${s.data}"><span class="step-number">第 ${s.number} 步</span><figcaption>${escapeHtml(s.title || '')}</figcaption></figure>`).join('')}</html>`;
    pages.push({ file, width: w, height: h, firstStep: group[0].number, lastStep: group.at(-1).number, html });
  }
  return pages;
}

export async function writeContactSheets(page, screenshots, opts, onWrite = () => {}) {
  const contacts = [];
  if (!screenshots.length) return contacts;
  await page.send('Page.navigate', { url: 'about:blank' });
  const { frameTree } = await page.send('Page.getFrameTree');
  for (const contact of contactPages(screenshots, opts.w, opts.h)) {
    await page.send('Emulation.setDeviceMetricsOverride', { width: contact.width, height: contact.height, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.setDocumentContent', { frameId: frameTree.frame.id, html: contact.html });
    await page.evaluate('(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()');
    const image = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    await writeFile(path.join(opts.out, contact.file), Buffer.from(image.data, 'base64'));
    const { html, ...metadata } = contact;
    contacts.push(metadata);
    onWrite(metadata);
  }
  return contacts;
}

async function main(opts) {
  await mkdir(opts.out, { recursive: true });
  const report = { tool: 'winter-deck-snap', version: 1, startedAt: new Date().toISOString(), input: opts.input,
    options: opts, status: '失败', gpu: null, events: [], findings: [], steps: [], contacts: [] };
  let child, profile, browser, page, tree, phase = '启动', exitInfo, spawnError, stderr = '';
  let interrupted = false;
  const onSignal = (signal) => {
    interrupted = true;
    report.findings.push({ severity: '失败', code: 'interrupted', message: `收到 ${signal}，已中断并清理浏览器` });
    try { if (child?.pid) process.kill(-child.pid, 'SIGTERM'); } catch {}
    page?.close(); browser?.close();
  };
  const onInt = () => onSignal('SIGINT'), onTerm = () => onSignal('SIGTERM');
  process.once('SIGINT', onInt); process.once('SIGTERM', onTerm);
  const failure = (code, message) => report.findings.push({ severity: '失败', code, message });
  const events = ({ method, params }) => {
    let text, kind;
    if (method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(params.type)) {
      kind = `console.${params.type}`;
      text = params.args.map((a) => a.value !== undefined ? String(a.value) : a.description || a.type).join(' ');
    } else if (method === 'Runtime.exceptionThrown') {
      kind = '页面异常'; text = params.exceptionDetails.exception?.description || params.exceptionDetails.text;
    } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      kind = '浏览器错误'; text = params.entry.text;
    }
    if (kind) report.events.push({ phase, kind, text, time: new Date().toISOString() });
  };
  try {
    const chromePath = await findBrowser();
    await access(opts.input, constants.R_OK);
    if (!(await stat(opts.input)).isFile()) throw new Error('输入路径不是文件');
    // 只清理上一次报告登记的工具产物，避免本轮失败时误认旧截图为新证据。
    try {
      const previous = JSON.parse(await readFile(path.join(opts.out, 'report.json'), 'utf8'));
      if (previous.tool === 'winter-deck-snap') for (const old of previous.steps || []) {
        if (/^step-[1-9]\d*\.png$/.test(old.screenshot))
          await rm(path.join(opts.out, old.screenshot), { force: true });
      }
      if (previous.tool === 'winter-deck-snap') for (const old of previous.contacts || []) {
        if (/^contact-\d{2,}\.png$/.test(old.file)) await rm(path.join(opts.out, old.file), { force: true });
      }
    } catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    await rm(path.join(opts.out, 'contact.png'), { force: true });
    await mkdir(path.join(ROOT, '.tmp'), { recursive: true });
    profile = await mkdtemp(path.join(ROOT, '.tmp', 'snap-profile-'));
    report.profile = profile;
    child = spawn(chromePath, ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
      '--disable-background-networking', '--disable-component-update', '--disable-sync',
      '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      `--window-size=${opts.w},${opts.h + 100}`,
      // 默认无窗口截图（不抢前台）；SNAP_WINDOW=1 时回到有窗口模式排查问题。
      ...(process.env.SNAP_WINDOW === '1' ? [] : ['--headless=new', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--enable-gpu', '--ignore-gpu-blocklist']),
      'about:blank'],
    { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
    report.browserPid = child.pid || null;
    if (child.pid) tree = new ProcessTree(child.pid, profile);
    child.stderr.on('data', (data) => { stderr = (stderr + data).slice(-32768); });
    child.on('error', (error) => { spawnError = error; });
    child.on('exit', (code, signal) => { exitInfo = { code, signal }; });
    let port;
    const deadline = Date.now() + opts.timeout;
    while (Date.now() < deadline) {
      if (interrupted) throw new Error('操作已中断');
      if (spawnError) throw spawnError;
      if (exitInfo) throw new Error(`Chrome 启动失败：退出码 ${exitInfo.code}，信号 ${exitInfo.signal || '无'}`);
      try {
        const lines = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
        port = Number(lines[0]);
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('无效调试端口');
        const version = await (await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) })).json();
        browser = await CDP.connect(version.webSocketDebuggerUrl, opts.timeout);
        break;
      } catch { await sleep(100); }
    }
    if (!browser) throw new Error(`Chrome 启动超时（${opts.timeout} 毫秒），未取得调试端口`);
    await tree?.snapshot();
    try { tree?.addCdpProcesses((await browser.send('SystemInfo.getProcessInfo')).processInfo); } catch {}
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(opts.timeout) })).json();
    const tab = tabs.find((t) => t.type === 'page');
    if (!tab) throw new Error('Chrome 未创建页面');
    page = await CDP.connect(tab.webSocketDebuggerUrl, opts.timeout, events);
    await page.send('Runtime.enable'); await page.send('Log.enable'); await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: opts.w, height: opts.h, deviceScaleFactor: 1, mobile: false });
    const navigation = await page.send('Page.navigate', { url: pathToFileURL(opts.input).href });
    if (navigation.errorText) throw new Error(`页面导航失败：${navigation.errorText}`);
    let ready = false;
    const readyDeadline = Date.now() + opts.timeout;
    while (Date.now() < readyDeadline) {
      if (interrupted) throw new Error('操作已中断');
      try { ready = await page.evaluate('!!(window.__deck || window.__dbg)'); }
      catch (error) {
        if (!/context.*(destroyed|not found)|Cannot find context|navigat/i.test(error.message)) throw error;
      }
      if (ready) break;
      await sleep(100);
    }
    if (!ready) {
      report.lastDom = await page.evaluate(`(${inspectPage.toString()})()`);
      if (report.lastDom.err) failure('err-element', `#err：${report.lastDom.err}`);
      throw new Error(`等待 window.__deck 或 window.__dbg 超时（${opts.timeout} 毫秒）`);
    }
    const api = await page.evaluate(`(() => {
      const d = window.__deck || window.__dbg, modern = !!window.__deck;
      if (typeof d.go !== 'function') throw new Error('页面接口缺少 go(i)');
      if (typeof d[modern ? 'settle' : 'advance'] !== 'function') throw new Error('页面接口缺少动画快进方法');
      return { name: modern ? '__deck' : '__dbg', steps: modern ? d.steps : ${opts.steps} };
    })()`);
    if (!Number.isInteger(api.steps) || api.steps < 1 || api.steps > 300) throw new Error('页面 steps 必须为 1～300 的整数');
    report.api = api.name; report.stepCount = api.steps;
    await page.evaluate(`(async () => {
      await document.fonts.ready;
      const d = window.${api.name};
      if (typeof d.intro === 'function') await d.intro();
      else if (typeof window.intro === 'function') await window.intro();
      await d.${api.name === '__deck' ? 'settle' : 'advance'}(6);
    })()`);
    report.gpu = await page.evaluate(`(${inspectGpu.toString()})()`);
    try { report.gpu.system = (await browser.send('SystemInfo.getInfo')).gpu; }
    catch (error) { report.gpu.systemInfoError = error.message; }
    const renderer = report.gpu.unmaskedRenderer || report.gpu.renderer || '';
    const software = /swiftshader|llvmpipe|softpipe|software|lavapipe|microsoft basic render/i.test(renderer);
    const hardware = !!report.gpu.unmaskedRenderer && !software && !/^(WebKit WebGL|ANGLE)$/i.test(renderer);
    report.gpu.hardwareStatus = !report.gpu.webgl2 ? 'WebGL2 不可用' : software ? '检测到软件渲染' : hardware ? '渲染器标识为硬件，未启用软件渲染开关' : '无法确认硬件渲染';
    if (!report.gpu.webgl2) failure('webgl2-unavailable', 'WebGL2 不可用，不能视为真显卡截图');
    else if (!hardware) failure('hardware-unverified', report.gpu.hardwareStatus);
    const screenshots = [];
    for (let index = 0; index < api.steps; index++) {
      phase = `第 ${index + 1} 步`;
      await page.evaluate(`(async () => {
        const d = window.${api.name}; await d.go(${index});
        await d.${api.name === '__deck' ? 'settle' : 'advance'}(${opts.settle});
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
      const dom = await page.evaluate(`(${inspectPage.toString()})()`);
      const image = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true,
        captureBeyondViewport: false });
      const png = Buffer.from(image.data, 'base64');
      const screenshot = `step-${index + 1}.png`;
      await writeFile(path.join(opts.out, screenshot), png);
      const brightness = pngBrightness(png);
      // 文字背后检查：隐藏左侧文字栏，截文字所在区域，算边缘密度
      try {
        const keys = ['#eyebrow', '#title', '#body'];
        const rs = dom.elements.filter((e) => keys.includes(e.key) || e.key.startsWith('span.chip') || e.key.includes('.chip')).map((e) => e.rect).filter((r) => r.width > 4);
        if (rs.length) {
          const x0 = Math.max(0, Math.min(...rs.map((r) => r.left)) - 8), y0 = Math.max(0, Math.min(...rs.map((r) => r.top)) - 8);
          const x1 = Math.min(opts.w, Math.max(...rs.map((r) => r.right)) + 8), y1 = Math.min(opts.h, Math.max(...rs.map((r) => r.bottom)) + 8);
          await page.evaluate(`(() => { const c = document.querySelector('.copy'); if (c) c.style.visibility = 'hidden'; })()`);
          await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
          const clip = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0, scale: 1 } });
          await page.evaluate(`(() => { const c = document.querySelector('.copy'); if (c) c.style.visibility = ''; })()`);
          const masks = rs.map((r) => [r.left - x0 - 8, r.top - y0 - 8, r.right - x0 + 8, r.bottom - y0 + 8]);
          dom.behindCopy = { ...pngEdges(Buffer.from(clip.data, 'base64'), masks), rect: [x0, y0, x1, y1].map(Math.round) };
        }
      } catch (error) { dom.behindCopyError = error.message; }
      if (brightness.width !== opts.w || brightness.height !== opts.h) throw new Error('截图实际尺寸与指定尺寸不一致');
      const step = { number: index + 1, index, screenshot, dom, brightness, findings: [], status: '已截图' };
      report.steps.push(step); screenshots.push({ number: index + 1, data: image.data, title: dom.title.text });
      console.log(`第 ${index + 1}/${api.steps} 步已截图：${path.join(opts.out, screenshot)}`);
    }
    // 联系表复用本次独立浏览器，错误事件至此停止收集，避免把工具页面算进被测页。
    phase = '联系表';
    await writeContactSheets(page, screenshots, opts, (contact) => {
      report.contacts.push(contact);
      console.log(`联系表已生成：${path.join(opts.out, contact.file)}（第 ${contact.firstStep}～${contact.lastStep} 步）`);
    });
  } catch (error) {
    failure('runtime-error', error.message);
  } finally {
    phase = '清理';
    await tree?.snapshot();
    try { if (browser) tree?.addCdpProcesses((await browser.send('SystemInfo.getProcessInfo', {}, 1500)).processInfo); } catch {}
    report.cleanup = { processGroupExited: null, profileRemoved: null };
    page?.close();
    if (browser) {
      try { await browser.send('Browser.close', {}, 1500); } catch {}
      browser.close();
    }
    if (tree) {
      try {
        Object.assign(report.cleanup, await tree.stop());
        if (!report.cleanup.processGroupExited || report.cleanup.processTreeExited === false)
          failure('cleanup-process', '浏览器进程组或进程树仍存在，请检查残留进程');
        if (report.cleanup.processTreeExited === null) failure('cleanup-tree-unverified',
          '系统禁止进程枚举，不能声称完整进程树已经验证退出');
      } catch (error) { report.cleanup.processGroupExited = false; failure('cleanup-process', `无法确认浏览器进程退出：${error.message}`); }
    }
    report.chromeExit = exitInfo || null;
    if (profile) {
      try {
        if (report.cleanup.processGroupExited === false || report.cleanup.processTreeExited === false || report.cleanup.remainingPids?.length)
          throw new Error('存在已知存活进程或进程组未退出，保留配置目录以免删除仍在使用的数据');
        await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        report.cleanup.profileRemoved = true;
      } catch (error) { report.cleanup.profileRemoved = false; failure('cleanup-profile', `配置目录清理失败：${error.message}`); }
    }
    process.removeListener('SIGINT', onInt); process.removeListener('SIGTERM', onTerm);
    report.chromeStderr = stderr;
    report.finishedAt = new Date().toISOString();
    // 直到截图结束后再归集日志，保留启动以及步骤间异步报错。
    report.events = report.events.filter((e) => !['联系表', '清理'].includes(e.phase));
    if (report.events.length) failure('page-errors', `全程发现 ${report.events.length} 条控制台错误或页面异常，见错误记录`);
    for (const step of report.steps) {
      const logs = report.events.filter((e) => e.phase === '启动' || e.phase === `第 ${step.number} 步`);
      step.events = logs;
      if (opts.check) step.findings = stepFindings(step.dom, step.brightness, logs, step.number);
      else {
        if (step.dom.err) step.findings.push({ severity: '失败', code: 'err-element', message: '#err 有错误内容', details: step.dom.err });
        if (logs.length) step.findings.push({ severity: '失败', code: 'page-errors', message: `控制台或页面异常共 ${logs.length} 条`, details: logs });
      }
      step.status = step.findings.some((f) => f.severity === '失败') ? '失败' : step.findings.length ? '警告' : opts.check ? '通过' : '已截图';
    }
    const exitCode = reportExitCode(report);
    const hasFailure = exitCode === 1;
    // 先设置退出码，避免报告写入异常掩盖已经发现的失败。
    process.exitCode = exitCode;
    report.status = hasFailure ? '失败' : report.steps.some((s) => s.status === '警告') ? '通过（有警告）' : opts.check ? '通过' : '截图完成（未启用自动检查）';
    await writeFile(path.join(opts.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await writeFile(path.join(opts.out, 'report.md'), renderMarkdown(report));
    console.log(`结果：${report.status}；报告：${path.join(opts.out, 'report.md')}`);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) try {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) console.log(HELP);
  else await main(opts);
} catch (error) {
  console.error(`错误：${error.message}\n\n${HELP}`);
  process.exitCode = 1;
}
