import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1300,height:900}});
await page.goto('file:///'+path.join(root,'dist/index.html').replaceAll('\\','/'));
await page.locator('#preview svg').waitFor();
await page.evaluate(()=>{
  const cases=[
    ['book','phone','puzzle','coin'],
    ['book','phone','flowersBg','coin'],
    ['bookBg','phone','flowersBg','coin'],
    ['book','phone','flowersBg','puzzle','coin'],
    ['headphones','flowersBg','planner','coin'],
    ['book','lamp','phone','flowersBg','coin','pen'],
    ['book','lamp','flowersBg'],
    ['book','lamp','flowersBg','phone'],
    ['book','lamp','flowersBg','coin','pen'],
    ['notebook','planner','coin','phone'],
    ['planner','lampBg','coin','pen'],
    ['bookBg','puzzle','pen','coin']
  ];
  const rows=[];
  for(const size of ['square','wide','portrait'])for(const selected of cases){
    state.size=size;state.detail='large';state.palette='mint';state.selected=selected;
    state.layerOrder=[...selected.filter(id=>id.endsWith('Bg')),...selected.filter(id=>!id.endsWith('Bg'))];
    state.variantBase=0;state.layoutVersion=2;state.edits={};generateCandidates();
    rows.push(`<div class="row"><b>${size} · ${selected.join(', ')}</b><div class="variants">${state.candidates.map((seed,i)=>`<div><span>${i+1}</span>${renderSvg(seed,false,`multi-${rows.length}-${i}`)}</div>`).join('')}</div></div>`);
  }
  document.head.insertAdjacentHTML('beforeend','<style>body{margin:0;padding:18px;background:#f3f2f8;font:14px Arial,sans-serif}.row{background:#fff;padding:12px;margin:0 0 12px;border-radius:8px}.variants{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}.variants>div{display:grid;gap:3px}.variants svg{width:100%;height:260px;object-fit:contain;background:#f7f6fa}.variants span{font-size:11px}</style>');
  document.body.innerHTML=rows.join('');
});
await page.screenshot({path:path.join(root,'tests','multi-audit.png'),fullPage:true});
const rows=await page.locator('.row').count(),casesPerFormat=rows/3;
for(let i=0;i<rows;i++)await page.locator('.row').nth(i).screenshot({path:path.join(root,'tests',`multi-${['square','wide','portrait'][Math.floor(i/casesPerFormat)]}-${i%casesPerFormat+1}.png`)});
await browser.close();
console.log('Multi-object audit saved: tests/multi-audit.png');
