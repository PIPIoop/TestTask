import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1000,height:1000}});
await page.goto('file:///'+path.join(root,'source-art/figma-compositions.svg').replaceAll('\\','/'));
const frames=[['square-phone-puzzle',3462,663,1000,1000],['square-book-phone',4550,663,1000,1000],['square-notebook',5638,663,1000,1000],['square-headphones',3462,1776,1000,1000],['square-lamp',4550,1776,1000,1000],['square-book-bg',5638,1776,1000,1000],['wide-phone-puzzle',3462,3377,1200,630],['wide-book-phone',4762,3377,1200,630],['wide-notebook',6062,3377,1200,630],['wide-headphones',3462,4161,1200,630],['wide-lamp',4762,4161,1200,630],['wide-book-bg',6062,4161,1200,630],['portrait-phone-puzzle',3467,5454,800,1200],['portrait-book-phone',4464.5,5454,800,1200],['portrait-notebook',5462,5454,800,1200],['portrait-headphones',3467,6946,800,1200],['portrait-lamp',4464.5,6946,800,1200],['portrait-book-bg',5462,6946,800,1200]];
for(const [name,x,y,w,h] of frames){
  await page.locator('svg').evaluate((svg,frame)=>{svg.setAttribute('viewBox',`${frame.x} ${frame.y} ${frame.w} ${frame.h}`);svg.setAttribute('width',String(frame.w/2));svg.setAttribute('height',String(frame.h/2))},{x,y,w,h});
  await page.locator('svg').screenshot({path:path.join(root,'tests',`ref-${name}.png`)});
}
await browser.close();
