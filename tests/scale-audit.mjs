import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage();
await page.goto('file:///'+path.join(root,'dist/index.html').replaceAll('\\','/'));
await page.locator('#preview svg').waitFor();
const audit=await page.evaluate(()=>{
  const sets=[['book','lamp','flowersBg'],['book','phone','puzzle','coin'],['headphones','flowersBg','planner','coin'],['book','lamp','phone','flowersBg','coin','pen']];
  return sets.flatMap(ids=>['square','wide','portrait'].map(format=>{
    state.selected=ids;state.size=format;state.detail='large';state.variantBase=0;state.edits={};
    state.layerOrder=[...ids.filter(id=>id.endsWith('Bg')),...ids.filter(id=>!id.endsWith('Bg'))];
    const values=[0,1,2,9,10,11].map(seed=>({seed,scale:sceneFor(seed).items[0].baseScale}));
    return {ids:ids.join(','),format,values};
  }));
});
for(const row of audit){
  const scales=row.values.map(value=>value.scale);
  if(Math.max(...scales)-Math.min(...scales)>1e-9)throw Error(`Scale changes between variants: ${row.ids} / ${row.format}`);
}
for(const format of ['square','wide','portrait']){
  const short=audit.find(row=>row.format===format&&row.ids==='book,lamp,flowersBg');
  const full=audit.find(row=>row.format===format&&row.ids==='book,lamp,phone,flowersBg,coin,pen');
  if(Math.abs(short.values[0].scale-full.values[0].scale)>1e-9)throw Error(`Scale changes after adding objects: ${format}`);
}
console.log(`Stable scale verified for ${audit.length} scene/format combinations and regenerated variants.`);
await browser.close();
