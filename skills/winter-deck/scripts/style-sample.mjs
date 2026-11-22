#!/usr/bin/env node
// 用实际内容出样章；浏览器启动、GPU 检查、退出清理由 snap 统一负责。
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const THREE = new Set(['compare-bars', 'funnel', 'trend', 'share', 'kpi', 'gauge', 'treemap', 'radar', 'sankey', 'forces', 'diamond', 'pyramid', 'cycle', 'venn']);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function selectPages(deck, specified) {
  const pages = deck.pages || [deck];
  let indices;
  if (specified) indices = specified.split(',').map(n => Number(n) - 1);
  else {
    const text = pages.findIndex(p => !(p.component === 'media' && p.mode === 'cover') && !THREE.has(p.component));
    const three = pages.findIndex(p => THREE.has(p.component));
    indices = [text, three].filter(i => i >= 0);
    if (!indices.length) indices = [0];
  }
  if (!indices.length || indices.length > 2 || new Set(indices).size !== indices.length || indices.some(i => !Number.isInteger(i) || i < 0 || i >= pages.length)) throw new Error('--pages 需为 1～2 个不重复的有效页码（从 1 开始）');
  return indices;
}
// 在构建副本里压缩截图接口为每页最后一步，不改源码、不推算各组件的步数。
export function sampleHook(count) {
  return `<script>addEventListener('load',()=>{const d=window.__deck;if(!d)return;const total=d.steps,go=d.go.bind(d);const ends=[];for(let i=0;i<total;i++){go(i);const m=document.querySelector('.pgno').textContent.match(/(\\d+)\\s*\\//);if(m)ends[Number(m[1])-1]=i;}if(ends.length!==${count + 1})throw Error('样章页码映射失败');window.__deck={steps:${count},intro:()=>d.intro(),settle:s=>d.settle(s),go:i=>go(ends[i+1])};});</script>`;
}
export function collage(cards) {
  return `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#202024;color:#fff;font:22px "Alibaba PuHuiTi 3.0",sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}section{padding:12px;background:#303036}header{height:66px}b{display:block;font-size:24px}small{font-size:18px}img{display:block;width:100%;margin-top:8px}</style>${cards.map(c => `<section><header><b>${esc(c.familyName)} · ${c.scheme === 'dark' ? '深色' : '浅色'}</b><small>${esc(c.id)}</small></header>${c.images.map(i => `<img src="data:image/png;base64,${i}">`).join('')}</section>`).join('')}<canvas style="position:absolute;width:1px;height:1px;opacity:0"></canvas><script>document.querySelector('canvas').getContext('webgl2');window.__dbg={go(){},advance(){},intro(){}};</script>`;
}
function run(script, args) {
  execFileSync(process.execPath, [script, ...args], { cwd: process.cwd(), stdio: 'inherit', env: { ...process.env, SNAP_WINDOW: '0' } });
}
export function main(args) {
  if (args.includes('--help')) { console.log('用法：node <SKILL>/scripts/style-sample.mjs <deck.json> [--pages 2,3] [--out 目录]\n默认选首张非封面文字页和首张 3D 页，生成八预设 4×2 样章对照图；需要本机 Chrome/Edge。'); return; }
  if (args.includes('--self-test')) {
    assert.deepEqual(selectPages({pages:[{component:'media',mode:'cover'},{component:'points'},{component:'compare-bars'}]}), [1,2]);
    assert.throws(() => selectPages({pages:[{}]}, '0'));
    assert.throws(() => selectPages({pages:[{}]}, '1,1'));
    assert(collage([{familyName:'测试<',scheme:'light',id:'x',images:[]}]).includes('测试&lt;'));
    console.log('样章离线自测通过（选页、非法参数、标签转义；未启动浏览器）'); return;
  }
  let input, specified, out = path.resolve('.tmp/style-sample');
  for(let i=0;i<args.length;i++) {
    if (['--pages','--out'].includes(args[i])) { const k=args[i]; const v=args[++i]; if(!v || v.startsWith('--'))throw Error(k+' 缺少值'); if(k==='--pages')specified=v;else out=path.resolve(v); }
    else if (!input && !args[i].startsWith('-')) input=args[i];else throw Error('参数无效：'+args[i]);
  }
  if(!input)throw Error('请指定 deck JSON');
  const deck=JSON.parse(readFileSync(input,'utf8')), indices=selectPages(deck,specified), pages=deck.pages||[deck];
  // 分发包读取 manifest；源码读取显式分发名单。
  const packaged=existsSync(path.join(ROOT,'runtime/manifest.json'));
  const manifest=packaged?JSON.parse(readFileSync(path.join(ROOT,'runtime/manifest.json'),'utf8')):null;
  const ids=packaged?manifest.presetMetadata.map(p=>p.id):JSON.parse(readFileSync(path.join(ROOT,'tools/release-presets.json'),'utf8'));
  assert.equal(ids.length,8,'必须有八个分发预设');
  mkdirSync(out,{recursive:true});
  const cards=[];
  const cover=pages.find(p=>p.component==='media'&&p.mode==='cover')||{component:'media',mode:'cover',title:'风格样章'};
  for(const id of ids) {
    const preset=JSON.parse(readFileSync(path.join(ROOT,packaged?'runtime/presets':'presets',id+'.json'),'utf8'));
    const source=path.join(out,id+'.json');
    writeFileSync(source,JSON.stringify({...deck,preset:id,presets:ids,pages:[cover,...indices.map(i=>pages[i])]},null,2));
    run(packaged?path.join(HERE,'build.mjs'):path.join(ROOT,'build.mjs'),[source]);
    const built=path.resolve('out',id+'.html');
    const html=path.join(out,id+'.html');
    const content=readFileSync(built,'utf8'), end=content.lastIndexOf('</body>');
    if(end<0)throw Error('构建产物缺少 body 结束标签');
    writeFileSync(html,content.slice(0,end)+sampleHook(indices.length)+content.slice(end));
    const shots=path.join(out,id);
    run(path.join(HERE,'snap.mjs'),[html,'--out',shots,'--w','1600','--h','900']);
    const report=JSON.parse(readFileSync(path.join(shots,'report.json'),'utf8'));
    if(!report.cleanup?.processTreeExited || !report.cleanup?.profileRemoved)throw Error(id+' 浏览器退出清理未确认');
    cards.push({...preset,images:indices.map((_,i)=>readFileSync(path.join(shots,`step-${i+1}.png`)).toString('base64'))});
  }
  // 4 列、深浅各一行。每格同时展示所选 1～2 页。
  cards.sort((a,b)=>(a.scheme==='dark'?0:1)-(b.scheme==='dark'?0:1)||ids.indexOf(a.id)-ids.indexOf(b.id));
  const html=path.join(out,'style-sample.html');writeFileSync(html,collage(cards));
  const height=40+2*(24+66+indices.length*(8+222))+16;
  run(path.join(HERE,'snap.mjs'),[html,'--out',path.join(out,'collage'),'--w','1760','--h',String(height),'--steps','1']);
  copyFileSync(path.join(out,'collage/step-1.png'),path.join(out,'style-sample.png'));
  writeFileSync(path.join(out,'sample.json'),JSON.stringify({input:path.resolve(input),pages:indices.map(i=>i+1),presets:ids},null,2));
  console.log('样章对照图：'+path.join(out,'style-sample.png'));
}
if(process.argv[1] && realpathSync(process.argv[1])===fileURLToPath(import.meta.url))try{main(process.argv.slice(2));}catch(e){console.error('样章生成失败：'+e.message);process.exitCode=1;}
