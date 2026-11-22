// 只清理本次 detached Chrome 实例的进程组及可追踪子进程。
import { execFile, spawnSync as require_spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function selectOwnedProcesses(rows, rootPid, profile, known = new Set()) {
  const owned = new Set([...known, rootPid]);
  const marker = `--user-data-dir=${profile}`;
  for (const row of rows) {
    const start = row.command.indexOf(marker), end = start + marker.length;
    const matchesProfile = start >= 0 && (end === row.command.length || /[\s"']/.test(row.command[end]));
    if (row.pgid === rootPid || matchesProfile) owned.add(row.pid);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) if (owned.has(row.ppid) && !owned.has(row.pid)) {
      owned.add(row.pid); changed = true;
    }
  }
  return new Set(rows.filter((row) => owned.has(row.pid) && row.pid !== process.pid).map((row) => row.pid));
}

export function processExists(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

const WIN = process.platform === 'win32';
// Windows 没有 ps 和进程组：用 PowerShell 列进程（命令行用来认出本次的配置目录），pgid 记为 -1
const listWindows = async () => {
  const { stdout } = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress'],
  { timeout: 15000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  const data = JSON.parse(stdout || '[]');
  return (Array.isArray(data) ? data : [data]).map((r) => ({ pid: r.ProcessId, ppid: r.ParentProcessId, pgid: -1, command: r.CommandLine || '' }));
};
// Windows 结束进程：taskkill /T 连同子进程一起结束（Node 的 process.kill 不支持负数进程组）
const killWindows = (pid, sig) => {
  if (sig === 0) return process.kill(Math.abs(pid), 0);
  const r = require_spawnSync('taskkill', ['/PID', String(Math.abs(pid)), '/T', '/F'], { windowsHide: true, encoding: 'utf8' });
  if (r.status !== 0 && /not found|没有找到|找不到/i.test((r.stdout || '') + (r.stderr || ''))) { const e = new Error('ESRCH'); e.code = 'ESRCH'; throw e; }
};
const listProcesses = async () => {
  if (WIN) return listWindows();
  const { stdout } = await exec('/bin/ps', ['-axo', 'pid=,ppid=,pgid=,command='], { timeout: 2000, maxBuffer: 8 * 1024 * 1024 });
  return stdout.split('\n').flatMap((line) => {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : [];
  });
};

export class ProcessTree {
  // 可注入系统操作，离线测试权限拒绝与进程竞态，不操作真实浏览器。
  constructor(rootPid, profile, { list = listProcesses, kill = WIN ? killWindows : process.kill.bind(process), pause = sleep } = {}) {
    this.rootPid = rootPid; this.profile = profile; this.known = new Set([rootPid]);
    this.auditAvailable = false; this.auditError = null;
    this.list = list; this.kill = kill; this.pause = pause;
    this.active = null; this.rows = []; this.groupSignalFallback = false;
    this.signalErrors = [];
  }
  async snapshot() {
    try {
      const rows = await this.list();
      const active = selectOwnedProcesses(rows, this.rootPid, this.profile, this.known);
      for (const pid of active) this.known.add(pid);
      this.auditAvailable = true; this.rows = rows; this.active = active;
      return active;
    } catch (error) {
      this.auditError = error.message; this.auditAvailable = false; this.active = null;
      return null;
    }
  }
  addCdpProcesses(processes) {
    for (const p of processes) if (Number.isInteger(p.id) && p.id > 0 && p.id !== process.pid) this.known.add(p.id);
  }
  async signal(sig) {
    try { this.kill(-this.rootPid, sig); }
    catch (error) {
      if (error.code === 'EPERM') {
        this.groupSignalFallback = true;
        // 进程组被拒绝不代表仍有残留；重新按本次配置目录查找，逐 PID 清理。
        await this.snapshot();
      } else if (error.code !== 'ESRCH') throw error;
    }
    for (const pid of this.active ?? this.known) {
      if (pid === process.pid) continue;
      try { this.kill(pid, sig); }
      catch (error) {
        if (error.code === 'EPERM') this.signalErrors.push({ pid, signal: sig, code: error.code });
        else if (error.code !== 'ESRCH') throw error;
      }
    }
  }
  exists(pid) {
    try { this.kill(pid, 0); return true; }
    catch (error) {
      if (error.code === 'ESRCH') return false;
      if (error.code === 'EPERM') return true; // 无法枚举时保守地视为存活。
      throw error;
    }
  }
  async waitForExit(attempts) {
    for (let i = 0; i <= attempts; i++) {
      const active = await this.snapshot();
      if (active !== null ? active.size === 0
        : !this.exists(-this.rootPid) && ![...this.known].some((pid) => this.exists(pid))) return;
      if (i < attempts) await this.pause(100);
    }
  }
  async stop() {
    await this.snapshot();
    await this.signal('SIGTERM');
    await this.waitForExit(20);
    if (this.active === null || this.active.size) {
      await this.signal('SIGKILL');
      await this.waitForExit(30);
    }
    // 二次扫描抓取清理期间 fork 或重新托管、带本次配置目录的进程。
    const active = await this.snapshot();
    if (active?.size) {
      await this.signal('SIGKILL');
      await this.waitForExit(20);
    }
    const final = await this.snapshot();
    const remainingPids = final !== null ? [...final] : [...this.known].filter((pid) => this.exists(pid));
    return {
      // 成功枚举时以真实进程表为准，避免 kill(-pgid, 0) 的 EPERM 误报失败。
      processGroupExited: WIN ? (final !== null ? remainingPids.length === 0 : !this.exists(this.rootPid)) : final !== null ? !this.rows.some((row) => row.pgid === this.rootPid)
        : !this.exists(-this.rootPid),
      processTreeExited: final !== null ? remainingPids.length === 0 : null,
      trackedPids: [...this.known].sort((a, b) => a - b), remainingPids: remainingPids.sort((a, b) => a - b),
      groupSignalFallback: this.groupSignalFallback, processSignalErrors: this.signalErrors,
      processAuditError: this.auditError,
    };
  }
}
