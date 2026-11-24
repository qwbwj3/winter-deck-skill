#!/usr/bin/env node
// 零依赖安装器；所有用户目录由系统返回，兼容 Windows、macOS 和 Linux。
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(REPO, 'skills', 'winter-deck');
// 将现有父目录中的链接解析掉，避免别名路径绕过源目录保护。
function canonical(file) {
  if (existsSync(file)) return realpathSync(file);
  const parent = path.dirname(file);
  return parent === file ? file : path.join(canonical(parent), path.basename(file));
}
const inside = (parent, child) => { const rel = path.relative(parent, child); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); };
const present = (file) => { try { lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
function main(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('用法：node install.mjs [--claude] [--codex] [--dir <路径>] [--uninstall]');
    console.log('--dir 指安装父目录，Skill 将放在 <路径> 下的 winter-deck 目录。');
    return;
  }
  let claude = false, codex = false, directory, uninstall = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--claude') claude = true;
    else if (arg === '--codex') codex = true;
    else if (arg === '--uninstall') uninstall = true;
    else if (arg === '--dir' && directory === undefined && args[i + 1] && !args[i + 1].startsWith('--')) directory = path.resolve(args[++i]);
    else throw new Error('参数无效或缺少路径：' + arg);
  }
  const home = os.homedir();
  if (!claude && !codex && directory === undefined) {
    claude = existsSync(path.join(home, '.claude'));
    codex = existsSync(path.join(home, '.codex'));
    if (!claude && !codex) claude = true;
  }
  const parents = [
    ...(claude ? [path.join(home, '.claude', 'skills')] : []),
    ...(codex ? [path.join(home, '.codex', 'skills')] : []),
    ...(directory === undefined ? [] : [directory]),
  ];
  if (!uninstall && !existsSync(path.join(SOURCE, 'SKILL.md'))) throw new Error('安装包缺少 skills 中的 winter-deck，请重新取得完整仓库。');
  for (const parent of new Set(parents.map((p) => path.resolve(p)))) {
    const target = path.join(parent, 'winter-deck');
    // 不能把源 Skill 当成安装目标或在其内部递归安装。
    const canonicalSource = canonical(SOURCE), canonicalTarget = canonical(target);
    if (inside(canonicalSource, canonicalTarget) || inside(canonicalTarget, canonicalSource))
      throw new Error('安装目标不能是仓库内的源 Skill、其子目录或其上级目录。');
    if (uninstall) {
      if (present(target)) { rmSync(target, { recursive: true, force: true }); console.log('已卸载：' + target); }
      else console.log('未安装，无需卸载：' + target);
      continue;
    }
    mkdirSync(parent, { recursive: true });
    // 备份位于 skills 的同级隐藏目录，Agent 不会把旧版识别为第二份 Skill。
    const backups = path.join(path.dirname(canonical(parent)), '.winter-deck-backups');
    if (inside(canonical(parent), canonical(backups)) || inside(canonicalSource, canonical(backups)) || inside(canonical(backups), canonicalSource))
      throw new Error('备份目录不能位于 skills 或源 Skill 内，也不能覆盖源 Skill。');
    const nextBackup = () => {
      mkdirSync(backups, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      let dest = path.join(backups, stamp);
      for (let n = 1; present(dest); n++) dest = path.join(backups, stamp + '-' + n);
      return dest;
    };
    for (const name of readdirSync(parent).filter((name) => name.startsWith('winter-deck.bak-'))) {
      const destination = nextBackup();
      renameSync(path.join(parent, name), destination);
      console.log('已迁出 skills 内的旧备份：' + name + ' → ' + destination);
    }
    let backup;
    if (present(target)) {
      backup = nextBackup();
      renameSync(target, backup);
    }
    try { cpSync(SOURCE, target, { recursive: true }); }
    catch (error) {
      rmSync(target, { recursive: true, force: true });
      if (backup) renameSync(backup, target);
      throw error;
    }
    if (existsSync(backups)) {
      const saved = readdirSync(backups).filter((name) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-\d+)?$/.test(name))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const name of saved.slice(3)) rmSync(path.join(backups, name), { recursive: true, force: true });
    }
    console.log('备份位置：' + backups + (existsSync(backups) ? '（仅保留最近 3 份）' : '（尚无备份；升级时仅保留最近 3 份）'));
    console.log('已安装：' + target);
  }
  if (!uninstall) {
    console.log('对你的 Agent 说：用 winter-deck 帮我把这份材料做成演示');
    console.log('');
    console.log('【重要提醒｜播放机 WebGL 2 兼容性】');
    console.log('- 本 Skill 导出的 3D HTML 演示依赖播放机浏览器的 WebGL 2 与图形加速（推荐最新版 Chrome / Edge）。');
    console.log('- 老旧电脑（老集显/旧驱动）、关闭硬件加速的浏览器、或部分远程桌面/云桌面（VDI）可能无法渲染，且不会自动退化成普通 2D PPT。');
    console.log('- 拷到别的电脑或会议室上台前，务必先在目标播放机试播一页 3D 图表并连续翻页；能打开但略卡可按 Q 降画质（地址栏输 chrome://gpu 或 edge://gpu 可查 WebGL2 状态）。');
  }
}
try { main(process.argv.slice(2)); }
catch (error) { console.error('操作失败：' + error.message); process.exitCode = 1; }
