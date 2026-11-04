import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1250,height:900}});
await page.goto('file:///'+path.join(root,'dist/index.html').replaceAll('\\','/'));
await page.locator('#preview svg').waitFor();
await page.evaluate(()=>{
  const examples=[
    ['square',['phone','puzzle']],
    ['square',['book','phone']],
    ['square',['notebook','planner','coin']],
    ['square',['headphones','flowersBg']],
    ['square',['lampBg','planner','coin']],
    ['square',['bookBg','puzzle','pen']],
    ['wide',['phone','puzzle']],
    ['wide',['book','phone']],
    ['wide',['notebook','planner','coin']],
    ['wide',['headphones','flowersBg']],
    ['wide',['lampBg','planner','coin']],
    ['wide',['bookBg','puzzle','pen']],
    ['portrait',['phone','puzzle']],
    ['portrait',['book','phone']],
    ['portrait',['notebook','planner','coin']],
    ['portrait',['headphones','flowersBg']],
    ['portrait',['lampBg','planner','coin']],
    ['portrait',['bookBg','puzzle','pen']]
  ];
  const rows=[];
  for(const [format,selected] of examples){
    state.size=format;state.detail='large';state.palette='lilac';state.selected=selected;state.layerOrder=[...selected];state.variantBase=0;state.layoutVersion=2;state.edits={};generateCandidates();
    rows.push(`<div class="row"><strong>${format} · ${selected.join(', ')}</strong><div class="variants">${state.candidates.map((seed,i)=>`<div><span>${i+1}</span>${renderSvg(seed,false,`audit-${rows.length}-${i}`)}</div>`).join('')}</div></div>`);
  }
  document.head.insertAdjacentHTML('beforeend','<style>body{margin:0;padding:18px;background:#f3f2f8;font:14px Arial,sans-serif}.row{background:white;padding:10px;margin-bottom:10px;border-radius:8px}.variants{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:5px}.variants>div{display:grid;gap:3px}.variants svg{width:100%;height:165px;object-fit:contain;background:#f7f6fa}.variants span{font-size:11px}</style>');
  document.body.innerHTML=rows.join('');
});
for(const [index,name,w,h] of [[0,'phone-puzzle',500,500],[1,'book-phone',500,500],[3,'headphones',500,500],[4,'lamp',500,500],[6,'wide-phone-puzzle',600,315],[7,'wide-book-phone',600,315],[9,'wide-headphones',600,315],[10,'wide-lamp',600,315],[12,'portrait-phone-puzzle',400,600],[13,'portrait-book-phone',400,600],[15,'portrait-headphones',400,600],[16,'portrait-lamp',400,600]]){
  const svg=page.locator('.row').nth(index).locator('.variants svg').first();
  await svg.evaluate((el,size)=>{el.style.width=`${size.w}px`;el.style.height=`${size.h}px`},{w,h});
  await svg.screenshot({path:path.join(root,'tests',`reference-match-${name}.png`)});
  await svg.evaluate(el=>{el.style.width='';el.style.height=''})
}
await page.screenshot({path:path.join(root,'tests','reference-audit.png'),fullPage:true});
await browser.close();
console.log('Reference audit saved: tests/reference-audit.png');
