import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=file=>fs.readFileSync(path.join(root,'dist',file),'utf8');
const app=load('app.js').split("document.addEventListener('click',e=>{")[0];
const context=vm.createContext({console});
vm.runInContext([load('figma-assets.js'),load('background-art.js'),load('shape-masks.js'),app].join('\n'),context,{timeout:30000});
const evaluate=code=>vm.runInContext(code,context,{timeout:30000});
const checkSvg=(svg,count)=>{
  const ids=[...svg.matchAll(/data-object-id="([^"]+)"/g)].map(match=>match[1]);
  const defined=new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  const broken=[...svg.matchAll(/url\(#([^)]*)\)/g)].map(match=>match[1]).filter(id=>!defined.has(id));
  if(ids.length!==count||broken.length||/<image\b|<foreignObject\b/.test(svg)||!/<g id="background"><rect[^>]+\/><g transform=/.test(svg))throw Error(`Invalid SVG: ${JSON.stringify({ids,broken})}`);
};

evaluate("generateCandidates();state.activeObject='phone';state.duplicates=['phone~2'];state.layerOrder.push('phone~2');generateCandidates(false,true);setEdit('phone~2',{dx:65,dy:45,angle:45,mult:1.15})");
const edited=evaluate('renderSvg()');
checkSvg(edited,4);
if(!edited.includes('data-object-id="phone~2"')||!edited.includes('rotate(45.0 '))throw Error('Duplicate or rotation missing');
if(evaluate("getEdit('book').mult")!==1.15)throw Error('Shared scaling missing');
const handles=evaluate("(()=>{state.activeObject='phone~2';return renderSvg(state.seed,true)})()");
if(!handles.includes('data-rotate-for="phone~2"')||!handles.includes('data-handle-for="phone~2"'))throw Error('On-canvas transformation handles missing');
if(evaluate('angleFromPointer(0,-90,{x:0,y:0},{x:1,y:0})')!==90)throw Error('Rotation drag calculation failed');
const clippedGeometry=evaluate('selectionGeometry({left:-200,top:-150,width:550,height:530},1200,1200)');
if(clippedGeometry.rotateX<=0||clippedGeometry.rotateX>=1200||clippedGeometry.rotateY<=0||clippedGeometry.rotateY>=1200)throw Error('Rotation marker escaped the canvas');
const lockState=evaluate("(()=>{state.scaleLocks[editKey()]=true;const scaleOnly=renderSvg(state.seed,true);delete state.scaleLocks[editKey()];state.rotationLocks[rotationLockKey('phone~2')]=true;const rotationOnly=renderSvg(state.seed,true);return {scaleOnly,rotationOnly}})()");
if(lockState.scaleOnly.includes('data-handle-for="phone~2"')||!lockState.scaleOnly.includes('data-rotate-for="phone~2"')||lockState.rotationOnly.includes('data-rotate-for="phone~2"')||!lockState.rotationOnly.includes('data-handle-for="phone~2"'))throw Error('Scale and rotation must lock independently');
evaluate("state.scaleLocks[editKey()]=true");
const palette=JSON.parse(fs.readFileSync(path.join(root,'source-art','palette-example.json'),'utf8'));
context.importedPalette=palette;
evaluate('installPalettes([importedPalette]);state.customPalettes=[parsePalette(importedPalette)];state.palette=parsePalette(importedPalette).id');
const recolored=evaluate('renderSvg()');
if(!recolored.includes(`fill="${palette.bg.toUpperCase()}"`)||!recolored.includes(`fill="${palette.a.toUpperCase()}"`))throw Error('Imported palette did not recolor canvas and objects');
const customBackground=recolored.split('<g id="background">')[1].split('<g id="objects"')[0];
if(!customBackground.includes(`stroke="${palette.a.toUpperCase()}"`)||!customBackground.includes(`fill="${palette.bg2.toUpperCase()}"`))throw Error('Imported palette did not recolor background artwork');
context.document={querySelector:()=>({hidden:true,textContent:''})};
evaluate('update=()=>{};const savedProject=JSON.parse(JSON.stringify(state));state.palette="lilac";state.duplicates=[];restoreProject(savedProject)');
if(evaluate("getEdit('phone~2').angle")!==45||evaluate('state.duplicates.length')!==1||evaluate('state.customPalettes.length')!==1||!evaluate('scaleLocked()')||!evaluate("rotationLocked('phone~2')"))throw Error('Project restore omitted editing or lock data');
const positionBefore=evaluate("(()=>{const item=sceneFor(state.seed).items.find(x=>x.o.id==='phone');const edit=getEdit('phone');return [item.cx+edit.dx,item.cy+edit.dy]})()");
evaluate("removeSceneObject('phone~2')");
const positionAfter=evaluate("(()=>{const item=sceneFor(state.seed).items.find(x=>x.o.id==='phone');const edit=getEdit('phone');return [item.cx+edit.dx,item.cy+edit.dy]})()");
if(evaluate('state.duplicates.length')!==0||Math.hypot(positionBefore[0]-positionAfter[0],positionBefore[1]-positionAfter[1])>0.01)throw Error('Removing a copy moved another object');
const historyResult=evaluate(`(()=>{
  undoStack.length=0;redoStack.length=0;
  const before=historySnapshot(),start=getEdit('phone').dx;
  setEdit('phone',{...getEdit('phone'),dx:start+20});
  setEdit('phone',{...getEdit('phone'),dx:start+40});
  commitHistory(before);
  const grouped=undoStack.length===1;
  travelHistory(undoStack,redoStack);
  const undone=getEdit('phone').dx===start&&redoStack.length===1;
  travelHistory(redoStack,undoStack);
  const redone=getEdit('phone').dx===start+40;
  travelHistory(undoStack,redoStack);
  withHistory(()=>setEdit('phone',{...getEdit('phone'),dx:start+10}));
  return {grouped,undone,redone,redoCleared:redoStack.length===0};
})()`);
if(Object.values(historyResult).some(value=>!value))throw Error(`Undo/redo failed: ${JSON.stringify(historyResult)}`);
const metaphor=evaluate("state.brief='Мост между людьми';selectByBrief()?[...state.selected]:null");
if(!metaphor?.includes('puzzle')||!metaphor.includes('phone'))throw Error('Metaphor matching failed');
const backgroundPhrase=evaluate("state.brief='Фоновые цветы и книга';selectByBrief()?[...state.selected]:null");
if(!backgroundPhrase?.includes('flowersBg')||!backgroundPhrase.includes('book')||backgroundPhrase.includes('bookBg'))throw Error(`Background description matching failed: ${backgroundPhrase}`);
if(!evaluate("objects.every(o=>['large','small'].every(detail=>!!assetFor(o.id,detail)?.markup))"))throw Error('Source library is incomplete');
for(const size of ['square','wide','portrait'])for(const detail of ['large','small']){
  context.formatCheck={size,detail};
  const svg=evaluate("state.selected=['book','phone'];state.duplicates=[];state.layerOrder=['book','phone'];state.size=formatCheck.size;state.detail=formatCheck.detail;state.palette='lilac';state.variantBase=0;state.seed=0;state.activeObject=null;state.sceneScale={};state.edits={};generateCandidates();renderSvg()");
  checkSvg(svg,2);
  const expected=size==='portrait'?'width="800" height="1200"':size==='wide'?'width="1200" height="630"':'width="1200" height="1200"';
  if(!svg.includes(expected))throw Error(`Wrong canvas for ${size}/${detail}`);
}

const examples=path.join(root,'examples');fs.mkdirSync(examples,{recursive:true});
const scenarios=[
  {name:'01-ideas-square',selected:['phone','puzzle'],size:'square',palette:'lilac',detail:'large'},
  {name:'02-reading-wide',selected:['book','phone'],size:'wide',palette:'apricot',detail:'large'},
  {name:'03-music-portrait',selected:['headphones','flowersBg'],size:'portrait',palette:'mint',detail:'small'}
];
for(const scenario of scenarios){
  context.scenario=scenario;
  const svg=evaluate("state.selected=[...scenario.selected];state.duplicates=[];state.layerOrder=[...scenario.selected];state.size=scenario.size;state.detail=scenario.detail;state.palette=scenario.palette;state.variantBase=0;state.seed=0;state.activeObject=null;state.sceneScale={};state.edits={};generateCandidates();renderSvg()");
  checkSvg(svg,scenario.selected.length);
  fs.writeFileSync(path.join(examples,scenario.name+'.svg'),svg);
}
console.log('Core checks passed: duplication, on-canvas handles, independent locks, shared scale, palette, persistence, removal, metaphor matching and SVG examples.');
