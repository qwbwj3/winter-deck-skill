// 跨平台查找 Chrome、Chromium 与 Edge；仅检查文件，不启动浏览器。
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export function browserCandidates({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const candidates = [];
  const add = (candidate) => { if (candidate && !candidates.includes(candidate)) candidates.push(candidate); };
  if (env.CHROME_PATH) add(env.CHROME_PATH);
  let commands;
  if (platform === 'win32') {
    // 同时覆盖系统级与用户级安装；在其他平台测试时仍保持 Windows 路径语义。
    const roots = [env.ProgramFiles, env.PROGRAMFILES, env['ProgramFiles(x86)'], env['PROGRAMFILES(X86)'],
      env.LOCALAPPDATA, paths.join(env.SystemDrive || 'C:', paths.sep, 'Program Files'),
      paths.join(env.SystemDrive || 'C:', paths.sep, 'Program Files (x86)'), paths.join(home, 'AppData', 'Local')];
    for (const root of roots.filter(Boolean)) {
      add(paths.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      add(paths.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
    commands = ['chrome.exe', 'msedge.exe', 'chromium.exe'];
  } else if (platform === 'darwin') {
    for (const root of [paths.join(paths.sep, 'Applications'), paths.join(home, 'Applications')]) {
      add(paths.join(root, 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'));
      add(paths.join(root, 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'));
      add(paths.join(root, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
    }
    commands = ['google-chrome', 'chromium', 'microsoft-edge'];
  } else {
    commands = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable'];
  }
  const searchPath = env.PATH || env.Path || env.path || '';
  for (const directory of searchPath.split(platform === 'win32' ? ';' : ':').filter(Boolean)) {
    const cleanDirectory = directory.replace(/^"(.*)"$/, '$1');
    for (const command of commands) add(paths.join(cleanDirectory, command));
  }
  if (platform !== 'win32' && platform !== 'darwin') {
    for (const root of [paths.join(paths.sep, 'usr', 'bin'), paths.join(paths.sep, 'usr', 'local', 'bin'), paths.join(paths.sep, 'snap', 'bin')])
      for (const command of commands) add(paths.join(root, command));
  }
  return candidates;
}

export async function findBrowser(options = {}) {
  const platform = options.platform || process.platform;
  const canExecute = options.canExecute || (async (candidate) => {
    try {
      if (!(await stat(candidate)).isFile()) return false;
      await access(candidate, platform === 'win32' ? constants.F_OK : constants.X_OK);
      return true;
    } catch { return false; }
  });
  for (const candidate of browserCandidates(options)) if (await canExecute(candidate)) return candidate;
  throw new Error('未找到可用的 Chrome、Chromium 或 Microsoft Edge。请先安装浏览器，或把 CHROME_PATH 环境变量设为浏览器可执行文件的完整路径。');
}
