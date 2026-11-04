import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1000,height:1600},deviceScaleFactor:1});
await page.goto('file:///'+path.join(root,'source-art/reference-scale.svg').replaceAll('\\','/'));
await page.locator('svg').evaluate(svg=>{svg.setAttribute('width','760');svg.setAttribute('height','1497')});
await page.locator('svg').screenshot({path:path.join(root,'tests','reference-scale.png')});
await browser.close();
