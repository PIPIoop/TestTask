import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage();
await page.goto('file:///'+path.join(root,'dist/index.html').replaceAll('\\','/'));
await page.locator('#preview svg').waitFor();
const masks=await page.evaluate(async()=>{
  const result={};
  for(const detail of ['large','small']){
    result[detail]={};
    for(const o of objects){
      const asset=assetFor(o.id,detail),[x,y,w,h]=asset.box,p=palettes[0];
      const markup=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="${x} ${y} ${w} ${h}">${fragment(asset,p,`mask-${detail}-${o.id}`)}</svg>`;
      const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'}));
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,32,32);
      URL.revokeObjectURL(url);
      const pixels=context.getImageData(0,0,32,32).data,silhouette=[],body=[];
      for(let row=0;row<32;row++){
        let shapeBits=0,bodyBits=0;
        for(let col=0;col<32;col++){
          const i=(row*32+col)*4,alpha=pixels[i+3];
          if(alpha>40)shapeBits|=1<<col;
          if(alpha>75&&pixels[i]+pixels[i+1]+pixels[i+2]>165)bodyBits|=1<<col;
        }
        silhouette.push(shapeBits);body.push(bodyBits);
      }
      result[detail][o.id]={silhouette,body};
    }
  }
  return result;
});
fs.writeFileSync(path.join(root,'dist','shape-masks.js'),`const shapeMasks = ${JSON.stringify(masks)};\n`);
await browser.close();
console.log('Shape masks generated for '+Object.keys(masks.large).length+' objects in two detail levels.');
