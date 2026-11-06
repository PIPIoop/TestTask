import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
await page.goto('file:///'+path.join(root,'dist/index.html').replaceAll('\\','/'));
await page.locator('#preview svg').waitFor();

await page.locator('#preview svg [data-object-id="phone"] rect[fill="transparent"]').click({force:true});
await page.locator('#duplicateBtn').click();
if(await page.locator('#preview svg #objects > g').count()!==4||await page.locator('[data-layer-chip="phone~2"]').count()!==1)throw Error('Duplicate was not added as a separate layer');
await page.locator('#rotationInput').fill('45');
await page.locator('#rotationInput').press('Tab');
if(await page.evaluate(()=>getEdit('phone~2').angle)!==45)throw Error('Copy rotation was not saved');
if(!(await page.locator('#preview svg [data-object-id="phone~2"]').getAttribute('transform')).startsWith('rotate(45.0 '))throw Error('Copy rotation was not rendered');
if(await page.evaluate(()=>getEdit('phone').angle)!==0)throw Error('Rotation affected the source');
if(await page.locator('#preview svg .rotate-handle').count()!==1||await page.locator('#preview svg .scale-handle').count()!==1)throw Error('On-canvas handles missing');
await page.locator('#lockScaleBtn').click();
if(!await page.locator('#scaleSlider').isDisabled()||await page.locator('#preview svg .scale-handle').count()!==0||await page.locator('#preview svg .rotate-handle').count()!==1)throw Error('Scale lock also blocked rotation');
await page.locator('#lockRotationBtn').click();
if(!await page.locator('#rotationInput').isDisabled()||await page.locator('#preview svg .rotate-handle').count()!==0)throw Error('Rotation lock failed');
await page.locator('#lockScaleBtn').click();
if(await page.locator('#scaleSlider').isDisabled()||await page.locator('#preview svg .scale-handle').count()!==1||await page.locator('#rotationInput').isDisabled()!==true)throw Error('Scale cannot unlock independently');
await page.locator('#lockRotationBtn').click();

const before=await page.evaluate(()=>{const scene=sceneFor(state.seed);return scene.items.map(item=>({id:item.o.id,width:placement(item,state.seed).width}))});
await page.locator('#scaleSlider').fill('125');
const after=await page.evaluate(()=>{const scene=sceneFor(state.seed);return scene.items.map(item=>({id:item.o.id,width:placement(item,state.seed).width}))});
for(const item of before){const next=after.find(other=>other.id===item.id);if(Math.abs(next.width/item.width-1.25)>.001)throw Error('Relative object sizes changed under scene scale')}

await page.locator('#paletteInput').setInputFiles(path.join(root,'source-art','palette-example.json'));
await page.waitForFunction(()=>state.palette==='custom-синий-вечер');
if(await page.evaluate(()=>state.palette)!=='custom-синий-вечер')throw Error('Palette import did not select the new palette');
if(await page.locator('#preview svg #background rect').getAttribute('fill')!=='#DCE8FA')throw Error('Imported background color was not applied');
const download=page.waitForEvent('download');
await page.locator('#saveBtn').click();
const projectFile=path.join(root,'tests','requirements-project.json');
await (await download).saveAs(projectFile);
const project=JSON.parse(fs.readFileSync(projectFile,'utf8'));
if(!project.duplicates.includes('phone~2')||!project.customPalettes.length||!project.sceneScale)throw Error('Project omitted new editing state');
await page.reload();
await page.locator('#preview svg').waitFor();
if(await page.evaluate(()=>state.palette)!=='custom-синий-вечер'||await page.evaluate(()=>getEdit('phone~2').angle)!==45)throw Error('Project state did not restore');
await page.screenshot({path:path.join(root,'tests','requirements-preview.png')});

const exportDownload=page.waitForEvent('download');
await page.locator('#exportBtn').click();
const exportFile=path.join(root,'tests','requirements-output.svg');
await (await exportDownload).saveAs(exportFile);
const svg=fs.readFileSync(exportFile,'utf8');
const exported=await page.evaluate(source=>{
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  const ids=new Set([...doc.querySelectorAll('[id]')].map(el=>el.id));
  const broken=[...source.matchAll(/url\(#([^)]*)\)/g)].map(match=>match[1]).filter(id=>!ids.has(id));
  return {error:doc.querySelector('parsererror')?.textContent,ids:[...doc.querySelectorAll('#objects > g')].map(el=>el.getAttribute('data-object-id')),angle:doc.querySelector('[data-object-id="phone~2"]')?.getAttribute('transform'),backgroundChildren:doc.querySelector('#background')?.children.length,raster:doc.querySelectorAll('image,foreignObject').length,broken};
},svg);
if(exported.error||exported.ids.length!==4||!exported.ids.includes('phone~2')||!exported.angle.startsWith('rotate(45.0 ')||exported.backgroundChildren<2||exported.raster||exported.broken.length)throw Error('Noncompliant SVG export: '+JSON.stringify(exported));

await page.locator('[data-remove="phone~2"]').click();
if(await page.locator('#preview svg #objects > g').count()!==3||await page.evaluate(()=>state.duplicates.length)!==0)throw Error('Copy removal failed');
await page.locator('[data-mode="brief"]').click();
await page.locator('#briefInput').fill('Мост между людьми');
await page.locator('#generateBtn').click();
if(!(await page.evaluate(()=>state.selected.includes('puzzle')&&state.selected.includes('phone'))))throw Error('Metaphor did not select fitting source objects');
await browser.close();
console.log('Requirement checks passed: duplication, rotation, shared scale, palette import, persistence and vector export.');
