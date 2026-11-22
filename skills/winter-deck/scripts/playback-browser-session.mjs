import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CDP } from './snap.mjs';
import { findBrowser } from './browser-paths.mjs';
import { ProcessTree } from './process-tree.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 使用独立配置和进程树，不连接用户已打开的浏览器。
export async function openDeck(file) {
  if (!(await stat(path.resolve(file))).isFile()) throw new Error('输入 HTML 不是文件');
  const executable = await findBrowser();
  const temporaryRoot = path.resolve(os.tmpdir());
  const profile = await mkdtemp(path.join(temporaryRoot, 'winter-deck-playback-'));
  const child = spawn(executable, [
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-sync', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--headless=new', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
    '--enable-gpu', '--window-size=1600,1000', 'about:blank',
  ], { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.resume();
  let startupError;
  child.once('error', (error) => { startupError = error; });
  const tree = child.pid ? new ProcessTree(child.pid, profile) : null;
  let browser, page;
  const errors = [];
  async function close() {
    if (!tree) { await rm(profile, { recursive: true, force: true }); return { processGroupExited: true, processTreeExited: true }; }
    await tree.snapshot();
    try { tree.addCdpProcesses((await browser.send('SystemInfo.getProcessInfo')).processInfo); } catch {}
    try { await browser?.send('Browser.close', {}, 1500); } catch {}
    page?.close(); browser?.close();
    const cleanup = await tree.stop();
    if (!cleanup.processGroupExited || cleanup.processTreeExited !== true)
      throw new Error('无法确认播放检查浏览器进程树已经退出');
    const resolved = path.resolve(profile);
    if (!resolved.startsWith(temporaryRoot + path.sep) || !path.basename(resolved).startsWith('winter-deck-playback-'))
      throw new Error('临时配置路径不符合预期');
    await rm(resolved, { recursive: true, force: true });
    return cleanup;
  }
  try {
    let port;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      if (child.exitCode !== null) throw new Error(`播放检查浏览器提前退出：${child.exitCode}`);
      try {
        port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
        const version = await (await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) })).json();
        browser = await CDP.connect(version.webSocketDebuggerUrl, 60000);
        break;
      } catch { await sleep(100); }
    }
    if (!browser) throw new Error('播放检查浏览器启动超时');
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = await CDP.connect(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl, 60000, (event) => {
      if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails);
    });
    await page.send('Runtime.enable'); await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    const url = pathToFileURL(path.resolve(file));
    url.search = 'q=high'; // 固定质量，避免质量自适应干扰帧稳定性采样。
    await page.send('Page.navigate', { url: url.href });
    let ready = false;
    while (Date.now() < deadline) {
      try { ready = await page.evaluate('!!window.__deck'); } catch {}
      if (ready) break;
      await sleep(100);
    }
    if (!ready) throw new Error('播放运行时未就绪：需要带 __deck 接口的已构建 HTML');
    await page.evaluate('(async () => { await document.fonts.ready; __deck.settle(8); })()');
    return { page, errors, close };
  } catch (error) {
    try { await close(); } catch (cleanupError) { error.message += `；清理失败：${cleanupError.message}`; }
    throw error;
  }
}
