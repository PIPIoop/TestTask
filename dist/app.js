const palettes = [
  {id:'lilac',name:'Лавандовый',subtitle:'Мягкий и творческий',bg:'#D7CDF5',bg2:'#AA9BF0',ink:'#181817',line:'#7864D7',a:'#7864D7',b:'#F9A3AA',c:'#F9ECB0',d:'#FFFFFF',mono:'#7864D7'},
  {id:'apricot',name:'Абрикосовый',subtitle:'Тёплый и энергичный',bg:'#FDD7B9',bg2:'#FAC896',ink:'#181817',line:'#D27532',a:'#D27532',b:'#80DADA',c:'#F9ECB0',d:'#FFFFFF',mono:'#D27532'},
  {id:'mint',name:'Мятный',subtitle:'Свежий и спокойный',bg:'#BEEBEB',bg2:'#80DADA',ink:'#181817',line:'#5ABEBE',a:'#5ABEBE',b:'#6D7BFC',c:'#FFD4F2',d:'#FFFFFF',mono:'#5ABEBE'}
];
const objects = [
  {id:'book',name:'Книга',type:'main',words:['книг','читать','чтение','учеба','учёба','образование','book']},
  {id:'phone',name:'Телефон',type:'main',words:['телефон','смартфон','мобильн','phone','digital']},
  {id:'puzzle',name:'Пазл',type:'main',words:['пазл','идея','креатив','puzzle']},
  {id:'coin',name:'Монета',type:'main',words:['монет','деньг','финанс','оплат','coin']},
  {id:'headphones',name:'Наушники',type:'main',words:['наушник','музык','звук','аудио','подкаст']},
  {id:'lamp',name:'Лампа',type:'main',words:['лампа','свет','рабоч','стол','офис','desk']},
  {id:'flowers',name:'Цветы',type:'main',words:['цвет','растен','уют','природ','flower']},
  {id:'planner',name:'Ежедневник',type:'main',words:['ежедневник','планер','планиров','план']},
  {id:'notebook',name:'Блокнот',type:'main',words:['блокнот','заметк','запис','план','ежедневник','paper']},
  {id:'pen',name:'Карандаш',type:'main',words:['ручка','карандаш','писать','рисовать','pen']},
  {id:'bookBg',name:'Книга · фон',type:'background',words:[]},
  {id:'phoneBg',name:'Телефон · фон',type:'background',words:[]},
  {id:'puzzleBg',name:'Пазл · фон',type:'background',words:[]},
  {id:'coinBg',name:'Монета · фон',type:'background',words:[]},
  {id:'headphonesBg',name:'Наушники · фон',type:'background',words:[]},
  {id:'lampBg',name:'Лампа · фон',type:'background',words:[]},
  {id:'flowersBg',name:'Цветы · фон',type:'background',words:[]},
  {id:'plannerBg',name:'Ежедневник · фон',type:'background',words:[]},
  {id:'notebookBg',name:'Блокнот · фон',type:'background',words:[]},
  {id:'penBg',name:'Карандаш · фон',type:'background',words:[]}
];
const initial = {size:'square',detail:'large',palette:'lilac',customPalettes:[],duplicates:[],sceneScale:{},scaleLocks:{},rotationLocks:{},mode:'manual',selected:['book','phone','puzzle'],layerOrder:['book','phone','puzzle'],seed:0,variantBase:0,layoutVersion:2,candidates:[],edits:{},activeObject:null,brief:''};
let state = {...initial};
const refinedLayoutCache=new Map(),maskAreaCache=new Map();
const $ = s => document.querySelector(s);
const templateId=id=>String(id).replace(/~\d+$/,'');
const findObject = id => {const source=objects.find(o=>o.id===templateId(id));return source?{...source,id,sourceId:source.id}:undefined};
const sceneIds=()=>[...state.selected,...(state.duplicates||[])];
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const tokenMaps = {
  lilac: {},
  apricot: {'#D7CDF5':'#FDD7B9','#AA9BF0':'#FAC896','#7864D7':'#D27532','#F9A3AA':'#80DADA','#FFE3E1':'#BEEBEB'},
  mint: {'#D7CDF5':'#BEEBEB','#AA9BF0':'#80DADA','#7864D7':'#5ABEBE','#F9ECB0':'#FFD4F2','#F9A3AA':'#6D7BFC','#FFE3E1':'#B6C6FE'}
};
const assetFor = (id,detail) => figmaAssets[detail][templateId(id)];
const paletteColor=value=>typeof value==='string'&&/^#[\da-fA-F]{6}$/.test(value)?value.toUpperCase():null;
function parsePalette(data){
  if(!data||typeof data.name!=='string'||!data.name.trim()||data.name.length>40)throw Error('Укажите название палитры до 40 символов');
  const colors={};
  for(const key of ['bg','bg2','a','b','c']){colors[key]=paletteColor(data[key]);if(!colors[key])throw Error(`Неверный цвет ${key}: нужен формат #RRGGBB`)}
  colors.d=paletteColor(data.d)||'#FFFFFF';
  const id=`custom-${data.name.trim().toLocaleLowerCase('ru').replace(/[^а-яa-z0-9]+/g,'-')}`;
  return {id,name:data.name.trim(),subtitle:'Загруженная палитра',...colors,ink:'#181817',line:colors.a,mono:colors.a};
}
function installPalettes(items){
  for(const entry of items||[]){const p=parsePalette(entry);const index=palettes.findIndex(other=>other.id===p.id);if(index>=3)palettes.splice(index,1);palettes.push(p)}
}
function recolor(source,p,variant){
  const special=variant==='yellowPlanner'?{'#D7CDF5':'#F9ECB0','#F9ECB0':'#F9A3AA'}:{};
  const prepared=variant==='softBackground'?source.replace(/fill="#7864D7"/g,`fill="${p.bg2}"`):source;
  const tokens=tokenMaps[p.id]||{'#D7CDF5':p.bg,'#AA9BF0':p.bg2,'#7864D7':p.a,'#F9A3AA':p.b,'#F9ECB0':p.c,'#FFE3E1':p.d};
  return prepared.replace(/#[0-9a-fA-F]{6}/g,color=>{const original=color.toUpperCase(),styled=special[original]||original;return tokens[styled]||styled});
}
function fragment(asset,p,prefix,variant){
  const namespaced=s=>s.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}-${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}-${id})`);
  return `<defs>${namespaced(recolor(asset.defs,p,variant))}</defs>${namespaced(recolor(asset.markup,p,variant))}`;
}
function background(w,h,p,variant,referenceKey=null){
  return `<rect width="${w}" height="${h}" fill="${p.bg}"/>`;
}
const priority={book:10,notebook:9,headphones:8,lamp:7,phone:6,flowers:5,planner:5,puzzle:4,pen:3,coin:2};
const objectPriority=id=>priority[templateId(id).replace(/Bg$/,'')]||0;
const referencePresets={
  'phone|puzzle':{
    square:{scale:1,slots:{phone:[.47,.61],puzzle:[.59,.32]}},
    wide:{scale:1.2,slots:{phone:[.41,.60],puzzle:[.77,.35]}},
    portrait:{scale:1.36,slots:{phone:[.41,.57],puzzle:[.57,.28]}}
  },
  'book|phone':{
    square:{scale:1.35,slots:{book:[.10,.51],phone:[.53,.45]}},
    wide:{scale:1.55,slots:{book:[.22,.28],phone:[.78,.28]}},
    portrait:{scale:1.85,slots:{book:[.26,.51],phone:[.73,.55]}}
  },
  'coin|notebook|planner':{
    square:{scale:1.08,slots:{notebook:[.61,.31],planner:[.17,.72],coin:[.62,.81]}},
    wide:{scale:1.14,slots:{notebook:[.67,.22],planner:[.16,.66],coin:[.46,.77]}},
    portrait:{scale:1.55,slots:{notebook:[.57,.24],planner:[.17,.69],coin:[.67,.84]}}
  },
  'flowersBg|headphones':{
    square:{scale:1.27,slots:{flowersBg:[.16,-.02],headphones:[.69,.67]}},
    wide:{scale:1.27,slots:{flowersBg:[.17,.04],headphones:[.68,.65]}},
    portrait:{scale:1.65,slots:{flowersBg:[.74,.10],headphones:[.54,.71]}}
  },
  'coin|lampBg|planner':{
    square:{scale:1.16,slots:{lampBg:[.39,-.03],planner:[.44,.74],coin:[.76,.53]}},
    wide:{scale:1.33,slots:{lampBg:[.40,-.35],planner:[.48,.78],coin:[.83,.34]}},
    portrait:{scale:1.5,slots:{lampBg:[.38,.01],planner:[.40,.75],coin:[.72,.52]}}
  },
  'bookBg|pen|puzzle':{
    square:{scale:1.52,slots:{bookBg:[.45,.25],puzzle:[.31,.24],pen:[.39,.89]}},
    wide:{scale:1.5,slots:{bookBg:[.58,.28],puzzle:[.52,.13],pen:[.25,.76]}},
    portrait:{scale:1.55,slots:{bookBg:[.46,.32],puzzle:[.27,.23],pen:[.36,.88]}}
  }
};
function referencePreset(placed,format){return referencePresets[placed.map(o=>o.id).sort().join('|')]?.[format]||null}
function sceneRecipe(placed){
  const ids=new Set(placed.map(o=>o.id)),main=placed.filter(o=>o.type==='main');
  if(placed.length<4&&!(placed.length>=3&&ids.has('book')&&ids.has('lamp')))return null;
  if(ids.has('book')&&ids.has('lamp')&&main.every(o=>['book','lamp','phone','puzzle','coin','pen'].includes(o.id)))return 'reading-desk';
  if(ids.has('book')&&ids.has('phone')&&main.every(o=>['book','phone','puzzle','coin','pen'].includes(o.id)))return 'book-phone';
  if(ids.has('headphones')&&ids.has('flowersBg')&&main.every(o=>['headphones','planner','notebook','coin','pen'].includes(o.id)))return 'audio';
  if(ids.has('phone')&&ids.has('puzzle')&&main.every(o=>['phone','puzzle','coin','pen'].includes(o.id)))return 'digital';
  if(ids.has('notebook')&&ids.has('planner')&&main.every(o=>['notebook','planner','phone','coin','pen'].includes(o.id)))return 'paper-desk';
  if(ids.has('planner')&&ids.has('lampBg')&&ids.has('coin')&&main.every(o=>['planner','phone','coin','pen'].includes(o.id)))return 'planner-lamp';
  if(ids.has('bookBg')&&ids.has('puzzle')&&ids.has('pen')&&main.every(o=>['puzzle','phone','coin','pen'].includes(o.id)))return 'idea-book';
  if(ids.has('phone')&&ids.has('bookBg')&&ids.has('flowersBg')&&main.every(o=>['phone','puzzle','coin','pen'].includes(o.id)))return 'phone-backdrop';
  return null;
}
function stableHeroScale(placed,format,canvasWidth,recipe){
  const heroId=recipe==='reading-desk'||recipe==='book-phone'?'book':recipe==='audio'?'headphones':recipe==='digital'||recipe==='phone-backdrop'?'phone':recipe==='paper-desk'?'notebook':recipe==='planner-lamp'?'planner':recipe==='idea-book'?'puzzle':null;
  const hero=heroId?placed.find(o=>o.id===heroId):placed.filter(o=>o.type==='main').sort((a,b)=>objectPriority(b.id)-objectPriority(a.id))[0]||placed[0];
  const ratio=recipe==='planner-lamp'?(format==='wide'?.5:format==='portrait'?.7:.58)
    :recipe==='idea-book'?(format==='wide'?.42:format==='portrait'?.64:.5)
      :recipe==='paper-desk'?(format==='wide'?.62:format==='portrait'?.82:.66)
        :recipe==='audio'?(format==='wide'?.58:format==='portrait'?.8:.64)
          :recipe==='phone-backdrop'?(format==='wide'?.52:format==='portrait'?.73:.62)
      :format==='wide'?.62:format==='portrait'?.88:.76;
  return canvasWidth*ratio/assetFor(hero.id,state.detail).box[2];
}
function recipePositions(placed,format,seed,w,h,recipe,lockedScale){
  const byId=new Map(placed.map(o=>[o.id,o])),points=new Map(),motif=seed%3,side=motif===1?-1:1,vertical=motif===2?-1:1;
  const size=id=>{const box=assetFor(id,state.detail).box;return {w:box[2],h:box[3]}};
  const put=(id,x,y)=>{if(byId.has(id))points.set(id,{x,y})};
  const portrait=format==='portrait';
  if(recipe==='reading-desk'){
    const book=size('book'),lamp=size('lamp');
    const deskSide=portrait?side:1;
    put('book',0,0);
    put('lamp',portrait?deskSide*book.w*.2:deskSide*(book.w*.5+lamp.w*.5-450),
      portrait?-vertical*(book.h*.55+lamp.h*.5+30):format==='wide'?book.h*(motif===0?.2:motif===1?.26:.32):book.h*(motif===0?.65:motif===1?.47:.3));
    put('phone',portrait?-deskSide*book.w*.16:deskSide*book.w*.1,-book.h*.37);
    put('puzzle',deskSide*book.w*.16,-book.h*.54);
    put('coin',deskSide*book.w*.31,book.h*.59);
    put('pen',-deskSide*book.w*.1,book.h*.63);
    const flowers=size('flowersBg');
    put('flowersBg',-deskSide*book.w*.34,-book.h*.43-flowers.h*.05);
  }else if(recipe==='book-phone'){
    const book=size('book'),phone=size('phone');
    put('book',0,0);
    put('phone',portrait?side*book.w*.13:side*(book.w*.34+phone.w*.27),portrait?-vertical*(book.h*.56+phone.h*.35):motif===2?book.h*.2:-book.h*.28);
    const p=points.get('phone');
    put('puzzle',p.x+side*phone.w*.1,p.y-phone.h*.32);
    put('coin',p.x-side*phone.w*.27,p.y+phone.h*.66);
    put('pen',side*book.w*.28,book.h*.61);
    put('flowersBg',-side*book.w*.38,-book.h*.46);
  }else if(recipe==='audio'){
    const headphones=size('headphones'),planner=byId.has('planner')?size('planner'):null,notebook=byId.has('notebook')?size('notebook'):null;
    put('headphones',0,0);
    if(portrait){
      if(planner)put('planner',side*headphones.w*.1,-vertical*(headphones.h*.55+planner.h*.4));
      if(notebook)put('notebook',-side*headphones.w*.08,-vertical*(headphones.h*.62+notebook.h*.38+(planner?planner.h*.65:0)));
      const accent=points.get(planner?'planner':notebook?'notebook':'headphones'),accentSize=planner||notebook||headphones;
      put('coin',accent.x+side*accentSize.w*.42,accent.y+vertical*accentSize.h*.48);
    }else{
      if(planner)put('planner',motif===2?side*headphones.w*.13:side*(headphones.w*.33+planner.w*.25),motif===2?headphones.h*.58:headphones.h*.23);
      if(notebook)put('notebook',motif===2?-side*headphones.w*.2:side*(headphones.w*.37+notebook.w*.22),motif===2?-headphones.h*.55:-headphones.h*.29);
      const accent=points.get(planner?'planner':notebook?'notebook':'headphones'),accentSize=planner||notebook||headphones;
      put('coin',accent.x+side*accentSize.w*.38,accent.y+accentSize.h*.31);
    }
    put('pen',-side*headphones.w*.2,headphones.h*.56);
    put('flowersBg',-side*headphones.w*.35,portrait?-vertical*headphones.h*.45:-headphones.h*.43);
  }else if(recipe==='paper-desk'){
    const notebook=size('notebook'),planner=size('planner'),phone=byId.has('phone')?size('phone'):null;
    put('notebook',0,0);
    put('planner',portrait?side*notebook.w*.08:motif===2?side*notebook.w*.22:-side*(notebook.w*.25+planner.w*.08),portrait?vertical*(notebook.h*.62+planner.h*.38):motif===2?-notebook.h*.46:notebook.h*.3+planner.h*.12);
    const p=points.get('planner');
    if(phone)put('phone',portrait?-side*notebook.w*.12:motif===2?-side*notebook.w*.44:side*(notebook.w*.38+phone.w*.08),portrait?vertical*notebook.h*.18:motif===2?notebook.h*.4:-notebook.h*.25);
    put('coin',p.x+side*planner.w*.36,p.y+planner.h*.2);
    put('pen',p.x-side*planner.w*.23,p.y+planner.h*.68);
    put('lampBg',-side*notebook.w*.35,-notebook.h*.55);
    put('flowersBg',side*notebook.w*.34,-notebook.h*.42);
  }else if(recipe==='planner-lamp'){
    const planner=size('planner'),coin=size('coin'),lamp=size('lampBg');
    put('planner',0,0);
    put('lampBg',motif===2?side*(planner.w*.35+lamp.w*.15):-side*(planner.w*.36+lamp.w*.16),-planner.h*.58-lamp.h*.26);
    put('coin',side*(planner.w*.35+coin.w*.15),motif===2?planner.h*.32:-planner.h*.19);
    put('pen',motif===2?side*planner.w*.16:-side*planner.w*.17,planner.h*.6);
    put('phone',side*planner.w*.52,-planner.h*.63);
  }else if(recipe==='idea-book'){
    const puzzle=size('puzzle'),book=size('bookBg'),pen=size('pen');
    put('puzzle',0,0);
    put('bookBg',side*book.w*.1,puzzle.h*.35);
    put('pen',side*(puzzle.w*.3+pen.w*.3),puzzle.h*.75+pen.h*.24);
    put('coin',side*puzzle.w*.54,-puzzle.h*.13);
    put('phone',side*(puzzle.w*.4+size('phone').w*.3),-puzzle.h*.32);
  }else if(recipe==='phone-backdrop'){
    const phone=size('phone'),book=size('bookBg'),flowers=size('flowersBg');
    put('phone',motif===2?side*phone.w*.12:0,motif===2?-phone.h*.18:0);
    put('bookBg',motif===2?-side*phone.w*.31:side*phone.w*.27,motif===2?phone.h*.27:-phone.h*.43-book.h*.18);
    put('flowersBg',motif===2?side*phone.w*.36:-side*phone.w*.39,-phone.h*.5-flowers.h*.16);
    put('puzzle',side*phone.w*.19,-phone.h*.53);
    put('coin',motif===2?-side*phone.w*.42:side*phone.w*.47,phone.h*.44);
    put('pen',-side*phone.w*.2,phone.h*.68);
  }else{
    const phone=size('phone');
    put('phone',0,0);
    put('puzzle',side*phone.w*.22,vertical*phone.h*.74);
    put('coin',side*phone.w*.44,phone.h*.48);
    put('pen',-side*phone.w*.26,phone.h*.73);
  }
  const heroId=recipe==='reading-desk'||recipe==='book-phone'?'book':recipe==='audio'?'headphones':recipe==='paper-desk'?'notebook':recipe==='planner-lamp'?'planner':recipe==='idea-book'?'puzzle':'phone';
  const hero=size(heroId);
  placed.filter(o=>o.type==='background'&&!points.has(o.id)).forEach((o,i)=>{
    const d=size(o.id);put(o.id,side*(i%2?hero.w*.38:-hero.w*.35),-hero.h*.34-d.h*.08);
  });
  const principal=placed.filter(o=>o.type==='main');
  const visible=principal.length?principal:placed;
  const bounds=visible.reduce((box,o)=>{
    const p=points.get(o.id),d=size(o.id);
    return {left:Math.min(box.left,p.x-d.w/2),top:Math.min(box.top,p.y-d.h/2),right:Math.max(box.right,p.x+d.w/2),bottom:Math.max(box.bottom,p.y+d.h/2)};
  },{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
  const coverage=portrait?{x:.96,y:.93}:format==='wide'?{x:.98,y:.93}:{x:1,y:.94};
  const fitScale=Math.min(w*coverage.x/(bounds.right-bounds.left),h*coverage.y/(bounds.bottom-bounds.top));
  const scale=lockedScale??fitScale;
  const centerX=(bounds.left+bounds.right)/2,centerY=(bounds.top+bounds.bottom)/2;
  const targetX=w*(recipe==='reading-desk'&&!portrait?motif===0?.48:motif===1?.52:.5:.5);
  const targetY=h*(recipe==='book-phone'&&motif===2?.64:.51);
  return {scale,positions:new Map([...points].map(([id,p])=>[id,[(targetX+(p.x-centerX)*scale)/w,(targetY+(p.y-centerY)*scale)/h]]))};
}
function gridShape(count,format){
  const aspect=format==='wide'?1200/630:format==='portrait'?800/1200:1;
  const cols=Math.min(count,Math.max(1,Math.ceil(Math.sqrt(count*aspect))));
  return {cols,rows:Math.ceil(count/cols)};
}
function usesPackedLayout(placed,format){
  const key=placed.map(o=>o.id).sort().join('|');
  return placed.length>=4&&placed.length<=6&&!referencePreset(placed,format)&&key!=='book|phone|puzzle';
}
function packedPositions(placed,format,seed,w,h,lockedScale){
  const main=placed.filter(o=>o.type==='main').sort((a,b)=>objectPriority(b.id)-objectPriority(a.id));
  const back=placed.filter(o=>o.type==='background').sort((a,b)=>objectPriority(b.id)-objectPriority(a.id));
  const leading=main.length?main:back,rest=main.length?back:[];
  const size=o=>{const box=assetFor(o.id,state.detail).box;return {w:box[2],h:box[3]}};
  const points=new Map(),hero=leading[0],a=size(hero),motif=seed%3;
  const side=motif===1?-1:1,vertical=motif===2?1:-1;
  points.set(hero.id,{x:0,y:0});
  const put=(o,x,y)=>{if(o)points.set(o.id,{x,y})};
  const companion=leading[1],b=companion?size(companion):null;
  if(companion)put(companion,
    format==='portrait'?side*(a.w*.10+b.w*.15):side*(a.w*.34+b.w*.31),
    format==='portrait'?vertical*(a.h*.55+b.h*.35):vertical*(a.h*.24+b.h*.18));
  const second=companion?points.get(companion.id):{x:0,y:0},companionSize=b||a;
  for(let i=2;i<leading.length;i++){
    const o=leading[i],d=size(o),small=d.w*d.h<a.w*a.h*.38;
    if(i===2){
      const compactAccent=o.id==='coin'||o.id==='pen';
      const besideBook=companion.id==='lamp'&&o.id==='phone';
      put(o,besideBook?-side*a.w*.15:compactAccent?second.x-side*b.w*.3:small?second.x-side*b.w*.08:side*a.w*.12,
        besideBook?vertical*(a.h*.4+d.h*.2):compactAccent?second.y-vertical*(b.h*.42+d.h*.1):small?second.y+vertical*(b.h*.37+d.h*.34):-vertical*(a.h*.29+d.h*.24));
    }
    else if(i===3)put(o,side*(a.w*.29+d.w*.22),-vertical*(a.h*.37+d.h*.25));
    else if(i===4)put(o,second.x+side*(b.w*.23+d.w*.16),-vertical*(b.h*.31+d.h*.22));
    else put(o,-side*(a.w*.23+d.w*.2),vertical*(a.h*.27+d.h*.22));
  }
  rest.forEach((o,i)=>{
    const d=size(o),same=o.id===`${hero.id}Bg`;
    if(same){put(o,-side*a.w*.12,vertical*a.h*.12);return}
    const slots=format==='portrait'?[
      {x:-side*(a.w*.24+d.w*.17),y:second.y+vertical*(companionSize.h*.28+d.h*.15)},
      {x:side*(a.w*.24+d.w*.17),y:-vertical*(a.h*.27+d.h*.2)},
      {x:second.x+side*(companionSize.w*.2+d.w*.15),y:second.y+vertical*(companionSize.h*.27+d.h*.15)},
      {x:-side*(a.w*.24+d.w*.17),y:-vertical*(a.h*.27+d.h*.2)}
    ]:[
      {x:-side*(a.w*.27+d.w*.18),y:vertical*(a.h*.23+d.h*.15)},
      {x:-side*(a.w*.24+d.w*.16),y:-vertical*(a.h*.25+d.h*.18)},
      {x:second.x+side*(companionSize.w*.24+d.w*.16),y:vertical*(companionSize.h*.25+d.h*.18)},
      {x:second.x+side*(companionSize.w*.26+d.w*.17),y:-vertical*(companionSize.h*.25+d.h*.18)}
    ];
    const overlap=(p,q,qSize)=>Math.max(0,Math.min(p.x+d.w/2,q.x+qSize.w/2)-Math.max(p.x-d.w/2,q.x-qSize.w/2))*Math.max(0,Math.min(p.y+d.h/2,q.y+qSize.h/2)-Math.max(p.y-d.h/2,q.y-qSize.h/2));
    const accents=leading.filter(item=>['coin','pen'].includes(item.id));
    const ranked=slots.map((p,j)=>({p,score:accents.reduce((sum,item)=>sum+overlap(p,points.get(item.id),size(item))/(size(item).w*size(item).h),0)*10+Math.hypot(p.x,p.y)/Math.max(w,h)*.08+(j-i%4+4)%4*.01}));
    ranked.sort((x,y)=>x.score-y.score);put(o,ranked[0].p.x,ranked[0].p.y);
  });
  const bounds=leading.reduce((box,o)=>{const p=points.get(o.id),d=size(o);return {left:Math.min(box.left,p.x-d.w/2),top:Math.min(box.top,p.y-d.h/2),right:Math.max(box.right,p.x+d.w/2),bottom:Math.max(box.bottom,p.y+d.h/2)}},{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
  const coverage=format==='wide'?{x:1.02,y:.94}:format==='portrait'?{x:.98,y:.98}:{x:1.02,y:.95};
  const fitScale=Math.min(w*coverage.x/(bounds.right-bounds.left),h*coverage.y/(bounds.bottom-bounds.top));
  const scale=lockedScale??fitScale;
  const centerX=(bounds.left+bounds.right)/2,centerY=(bounds.top+bounds.bottom)/2;
  const targetX=w*.5,targetY=h*(format==='wide'?.51:.52);
  return {scale,positions:new Map([...points].map(([id,p])=>[id,[(targetX+(p.x-centerX)*scale)/w,(targetY+(p.y-centerY)*scale)/h]]))};
}
function denseSlots(count,format){
  const {cols,rows}=gridShape(count,format),slots=[],start=count<=12?.14:.08,span=count<=12?.72:.84;
  for(let row=0;row<rows;row++){
    const inRow=Math.min(cols,count-row*cols),offset=(cols-inRow)/2;
    for(let col=0;col<inRow;col++)slots.push([start+span*(col+offset+.5)/cols,start+span*(row+.5)/rows]);
  }
  return slots;
}
const sceneSchemas={
  square:[
    {main:[[.28,.78],[.76,.29],[.72,.74],[.2,.25],[.52,.52]],back:[[.08,.12],[.9,.12],[.85,.88]]},
    {main:[[.76,.2],[.22,.76],[.77,.78],[.23,.23],[.5,.52]],back:[[.04,.06],[.92,.83],[.1,.9]]},
    {main:[[.53,.8],[.19,.3],[.82,.31],[.18,.78],[.72,.7]],back:[[.9,.08],[.03,.1],[.89,.88]]}
  ],
  wide:[
    {main:[[.24,.86],[.78,.28],[.8,.78],[.42,.18],[.48,.68]],back:[[.05,.08],[.95,.1],[.91,.9]]},
    {main:[[.79,.14],[.2,.77],[.79,.77],[.46,.2],[.4,.72]],back:[[.03,.06],[.97,.85],[.12,.88]]},
    {main:[[.52,.88],[.14,.25],[.87,.31],[.17,.78],[.72,.76]],back:[[.93,.08],[.05,.05],[.95,.89]]}
  ],
  portrait:[
    {main:[[.47,.86],[.66,.3],[.18,.47],[.78,.63],[.3,.17]],back:[[.05,.08],[.95,.16],[.86,.91]]},
    {main:[[.78,.24],[.25,.73],[.71,.88],[.2,.21],[.52,.53]],back:[[.05,.04],[.95,.87],[.07,.91]]},
    {main:[[.28,.82],[.76,.33],[.2,.27],[.75,.69],[.47,.51]],back:[[.9,.04],[.05,.11],[.92,.88]]}
  ]
};
function compositionPositions(placed,format,seed){
  const schema=sceneSchemas[format][seed%3],positions=new Map();
  const main=placed.filter(o=>o.type==='main').sort((a,b)=>objectPriority(b.id)-objectPriority(a.id));
  const back=placed.filter(o=>o.type==='background').sort((a,b)=>objectPriority(b.id)-objectPriority(a.id));
  if(usesPackedLayout(placed,format))return positions;
  if(placed.length>3){
    const slots=denseSlots(placed.length,format),motif=seed%3;
    const ranked=[...slots].sort((a,b)=>Math.hypot(a[0]-.5,a[1]-.5)-Math.hypot(b[0]-.5,b[1]-.5));
    const inner=ranked.slice(0,main.length),outer=ranked.slice(main.length);
    main.forEach((o,i)=>positions.set(o.id,inner[(i+motif)%inner.length]));
    back.forEach((o,i)=>positions.set(o.id,outer[(i+motif)%outer.length]));
    return positions;
  }
  main.forEach((o,i)=>positions.set(o.id,schema.main[i]));
  back.forEach((o,i)=>positions.set(o.id,schema.back[i]||schema.main[4-i]));
  const ids=new Set(placed.map(o=>o.id));
  if(ids.has('phone')&&ids.has('puzzle')&&!ids.has('book')&&main.length<=2){positions.set('phone',format==='portrait'?[.32,.8]:[.3,.77]);positions.set('puzzle',format==='portrait'?[.73,.27]:[.74,.28]);}
  if(ids.has('notebook')&&ids.has('planner')&&ids.has('coin')){positions.set('notebook',format==='portrait'?[.68,.24]:[.79,.17]);positions.set('planner',format==='portrait'?[.28,.72]:[.23,.77]);positions.set('coin',[.78,.77]);}
  if(ids.has('headphones')&&ids.has('flowersBg')){positions.set('headphones',format==='portrait'?[.62,.8]:[.7,.8]);positions.set('flowersBg',[.08,.06]);}
  if(ids.has('lampBg')&&ids.has('planner')&&ids.has('coin')){positions.set('lampBg',[.04,.04]);positions.set('planner',[.7,.76]);positions.set('coin',[.82,.35]);}
  if(ids.has('bookBg')&&ids.has('puzzle')&&ids.has('pen')){positions.set('bookBg',[.86,.18]);positions.set('puzzle',[.32,.31]);positions.set('pen',[.3,.84]);}
  return positions;
}
function editKey(seed=state.seed){return `${state.size}-${state.detail}-${seed}`}
const rotationLockKey=(id,seed=state.seed)=>`${editKey(seed)}|${id}`;
const scaleLocked=(seed=state.seed)=>state.scaleLocks?.[editKey(seed)]===true;
const rotationLocked=(id,seed=state.seed)=>state.rotationLocks?.[rotationLockKey(id,seed)]===true;
const normalizeAngle=value=>((value+180)%360+360)%360-180;
const angleFromPointer=(original,startAngle,center,point)=>Math.round(normalizeAngle(original+Math.atan2(point.y-center.y,point.x-center.x)*180/Math.PI-startAngle)*10)/10;
function getEdit(id,seed=state.seed){
  const value=state.edits?.[editKey(seed)]?.[id]||{};
  const shared=state.sceneScale?.[editKey(seed)];
  return {dx:Number.isFinite(value.dx)?value.dx:0,dy:Number.isFinite(value.dy)?value.dy:0,angle:Number.isFinite(value.angle)?Math.max(-180,Math.min(180,value.angle)):0,mult:Number.isFinite(shared)?Math.min(1.8,Math.max(.4,shared)):1};
}
function setEdit(id,value,seed=state.seed){
  const key=editKey(seed);
  state.edits[key]??={};
  state.edits[key][id]={dx:Math.max(-2400,Math.min(2400,value.dx)),dy:Math.max(-2400,Math.min(2400,value.dy)),angle:Math.max(-180,Math.min(180,value.angle||0))};
  if(Number.isFinite(value.mult)){state.sceneScale??={};state.sceneScale[key]=Math.max(.4,Math.min(1.8,value.mult))}
}
function syncLayerOrder(){
  const ids=sceneIds(),selected=new Set(ids),seen=new Set();
  const existing=(Array.isArray(state.layerOrder)?state.layerOrder:[]).filter(id=>selected.has(id)&&!seen.has(id)&&seen.add(id));
  const missing=ids.filter(id=>!seen.has(id));
  state.layerOrder=[...missing.filter(id=>findObject(id)?.type==='background'),...existing,...missing.filter(id=>findObject(id)?.type==='main')];
}
function sceneFor(seed){
  syncLayerOrder();
  const format=state.size,w=format==='portrait'?800:1200,h=format==='wide'?630:1200,p=palettes.find(x=>x.id===state.palette);
  const selected=sceneIds().map(findObject).filter(Boolean),placed=[...selected.filter(o=>o.type==='background'),...selected.filter(o=>o.type==='main')];
  let positions=compositionPositions(placed,format,seed);
  const preset=referencePreset(placed,format);
  if(preset)for(const [id,slot] of Object.entries(preset.slots))positions.set(id,slot);
  const largest=Math.max(1,...placed.map(o=>assetFor(o.id,state.detail).box[2]));
  const large=largest>1000,coverage=format==='wide'?(large?.82:.6):format==='portrait'?(large?.92:.71):(large?1.1:.82);
  let baseScale=w*coverage/largest*(preset?.scale||1);
  if(placed.length>3){
    const {cols,rows}=gridShape(placed.length,format),maxHeight=Math.max(...placed.map(o=>assetFor(o.id,state.detail).box[3]));
    const fill=placed.length<=6?1.65:placed.length<=9?1.4:placed.length<=12?1.52:1.38;
    baseScale=Math.min(baseScale,fill*w/cols/largest,fill*h/rows/maxHeight);
  }
  const recipe=!preset&&sceneRecipe(placed);
  if(recipe){
    const arranged=recipePositions(placed,format,seed,w,h,recipe,stableHeroScale(placed,format,w,recipe));
    positions=arranged.positions;baseScale=arranged.scale;
  }else if(usesPackedLayout(placed,format)){
    const packed=packedPositions(placed,format,seed,w,h,stableHeroScale(placed,format,w,null));
    positions=packed.positions;baseScale=packed.scale;
  }
  const stableItems=placed.map((o,i)=>{
    const asset=assetFor(o.id,state.detail),slot=positions.get(o.id)||[.5,.5];
    const series=state.layoutVersion===2?Math.floor(seed/9)%4:0;
    const motif=seed%3,shift=preset&&motif!==0?(motif===1?[format==='portrait'?.05:.07,-.045]:[format==='portrait'?-.05:-.07,.045]):[0,0];
    let px=slot[0]+shift[0],py=slot[1]+shift[1];
    const x=series===1||series===3?1-px:px,y=series===2||series===3?1-py:py;
    return {o,asset,baseScale,cx:w*(x+Math.sin(seed*4.3+i*1.7)*.012),cy:h*(y+Math.cos(seed*3.1+i*2.3)*.012),index:i};
  });
  if(placed.length>=4){
    const key=[format,state.detail,state.layoutVersion,seed,...placed.map(o=>o.id).sort(),...state.layerOrder].join('|');
    let centers=refinedLayoutCache.get(key);
    if(!centers){
      refineSceneItems(stableItems,w,h,seed);
      centers=Object.fromEntries(stableItems.map(item=>[item.o.id,[item.cx,item.cy]]));
      if(refinedLayoutCache.size>180)refinedLayoutCache.clear();
      refinedLayoutCache.set(key,centers);
    }else for(const item of stableItems){item.cx=centers[item.o.id][0];item.cy=centers[item.o.id][1]}
  }
  const items=state.layerOrder.map(id=>stableItems.find(item=>item.o.id===id)).filter(Boolean);
  return {w,h,p,items,seed};
}
function placement(item,seed,ignoreEdits=false){
  const [bx,by,bw,bh]=item.asset.box,edit=ignoreEdits?{dx:0,dy:0,mult:1,angle:0}:getEdit(item.o.id,seed),scale=item.baseScale*edit.mult;
  const width=bw*scale,height=bh*scale;
  return {bx,by,width,height,scale,angle:edit.angle,cx:item.cx+edit.dx,cy:item.cy+edit.dy,left:item.cx+edit.dx-width/2,top:item.cy+edit.dy-height/2};
}
function rotatedBounds(r){
  const rad=r.angle*Math.PI/180,c=Math.abs(Math.cos(rad)),s=Math.abs(Math.sin(rad)),width=r.width*c+r.height*s,height=r.width*s+r.height*c;
  return {...r,width,height,left:r.cx-width/2,top:r.cy-height/2};
}
function maskOverlap(a,b,scene){
  const maskA=shapeMasks[state.detail][templateId(a.item.o.id)].body,maskB=shapeMasks[state.detail][templateId(b.item.o.id)].body;
  const left=Math.max(0,a.left,b.left),top=Math.max(0,a.top,b.top),right=Math.min(scene.w,a.left+a.width,b.left+b.width),bottom=Math.min(scene.h,a.top+a.height,b.top+b.height);
  if(right<=left||bottom<=top)return 0;
  const step=Math.min(scene.w,scene.h)/96;
  let overlap=0;
  for(let y=top+step/2;y<bottom;y+=step){
    const ay=Math.max(0,Math.min(31,Math.floor((y-a.top)/a.height*32))),by=Math.max(0,Math.min(31,Math.floor((y-b.top)/b.height*32)));
    for(let x=left+step/2;x<right;x+=step){
      const ax=Math.max(0,Math.min(31,Math.floor((x-a.left)/a.width*32))),bx=Math.max(0,Math.min(31,Math.floor((x-b.left)/b.width*32)));
      if(((maskA[ay]>>>ax)&1)&&((maskB[by]>>>bx)&1))overlap+=step*step;
    }
  }
  return overlap;
}
function bodyMaskArea(item,r){
  const key=`${state.detail}-${item.o.id}`;
  let fraction=maskAreaCache.get(key);
  if(fraction===undefined){
    const rows=shapeMasks[state.detail][templateId(item.o.id)].body;
    let cells=0;
    for(let bits of rows){bits>>>=0;while(bits){bits&=bits-1;cells++}}
    fraction=cells/1024;maskAreaCache.set(key,fraction);
  }
  return Math.max(1,r.width*r.height*fraction);
}
function visibleBodyFraction(item,r,w,h){
  const rows=shapeMasks[state.detail][templateId(item.o.id)].body;
  let visible=0,total=0;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if((rows[y]>>>x)&1){
    total++;
    const px=r.left+(x+.5)*r.width/32,py=r.top+(y+.5)*r.height/32;
    if(px>=0&&px<=w&&py>=0&&py<=h)visible++;
  }
  return total?visible/total:0;
}
function refineSceneItems(items,w,h,seed){
  const main=items.filter(item=>item.o.type==='main').sort((a,b)=>objectPriority(b.o.id)-objectPriority(a.o.id));
  if(main.length<3)return;
  const heroArea=main[0].asset.box[2]*main[0].asset.box[3];
  const movable=main.slice(2).filter(item=>item.asset.box[2]*item.asset.box[3]<heroArea*.75);
  const scene={w,h},step=Math.min(w,h)*.04;
  for(const item of movable){
    const origin={x:item.cx,y:item.cy};
    const quality=()=>{
      const r=placement(item,seed,true),box={item,...r},visible=visibleBodyFraction(item,r,w,h);
      let cost=5*Math.max(0,.72-visible)**2,nearest=Infinity;
      for(const other of main){
        if(other===item)continue;
        const q=placement(other,seed,true),otherBox={item:other,...q};
        const dx=Math.max(0,r.left-(q.left+q.width),q.left-(r.left+r.width));
        const dy=Math.max(0,r.top-(q.top+q.height),q.top-(r.top+r.height));
        nearest=Math.min(nearest,Math.hypot(dx/w,dy/h));
        const ids=[item.o.id,other.o.id].sort().join('|');
        const allowed=ids==='book|phone'?.3:ids==='phone|puzzle'?.2:.08;
        const overlap=maskOverlap(box,otherBox,scene)/Math.min(bodyMaskArea(item,r),bodyMaskArea(other,q));
        cost+=['coin','pen'].includes(item.o.id)?4*overlap:7*Math.max(0,overlap-allowed)**2;
      }
      cost+=3*Math.max(0,nearest-.025)**2;
      cost+=.16*Math.hypot(item.cx-origin.x,item.cy-origin.y)/Math.min(w,h);
      return cost;
    };
    let best={x:item.cx,y:item.cy,cost:quality()};
    for(const ox of [-2,-1,0,1,2])for(const oy of [-2,-1,0,1,2]){
      item.cx=origin.x+ox*step;item.cy=origin.y+oy*step;
      const cost=quality();if(cost<best.cost-1e-6)best={x:item.cx,y:item.cy,cost};
    }
    item.cx=best.x;item.cy=best.y;
  }
}
function selectionGeometry(r,w,h){
  const radius=Math.min(w,h)*.018,padding=radius+4;
  const left=r.left,top=r.top,right=left+r.width,bottom=top+r.height;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const candidates=[];
  const verticalStart=Math.max(top,padding),verticalEnd=Math.min(bottom,h-padding);
  const horizontalStart=Math.max(left,padding),horizontalEnd=Math.min(right,w-padding);
  if(verticalStart<=verticalEnd){
    if(right>=padding&&right<=w-padding)candidates.push({x:right,y:clamp(bottom,verticalStart,verticalEnd)});
    if(left>=padding&&left<=w-padding)candidates.push({x:left,y:clamp(bottom,verticalStart,verticalEnd)});
  }
  if(horizontalStart<=horizontalEnd){
    if(bottom>=padding&&bottom<=h-padding)candidates.push({x:clamp(right,horizontalStart,horizontalEnd),y:bottom});
    if(top>=padding&&top<=h-padding)candidates.push({x:clamp(right,horizontalStart,horizontalEnd),y:top});
  }
  candidates.sort((a,b)=>(right-a.x)**2+(bottom-a.y)**2-((right-b.x)**2+(bottom-b.y)**2));
  const anchor=candidates[0]||{x:clamp(right,padding,w-padding),y:clamp(bottom,padding,h-padding)};
  const visibleLeft=Math.max(0,left),visibleRight=Math.min(w,right),visibleTop=Math.max(0,top),visibleBottom=Math.min(h,bottom);
  const rotateX=clamp((visibleLeft+visibleRight)/2,padding,w-padding);
  let rotateY=clamp(visibleTop,padding,h-padding);
  if(Math.hypot(rotateX-anchor.x,rotateY-anchor.y)<radius*3)rotateY=clamp(visibleBottom,padding,h-padding);
  return {left,top,width:r.width,height:r.height,x:anchor.x,y:anchor.y,rotateX,rotateY,radius};
}
function scoreCandidate(seed){
  const scene=sceneFor(seed),rects=scene.items.map(item=>{
    const r=placement(item,seed,true),x1=Math.max(0,r.left),y1=Math.max(0,r.top),x2=Math.min(scene.w,r.left+r.width),y2=Math.min(scene.h,r.top+r.height);
    const area=Math.max(0,x2-x1)*Math.max(0,y2-y1);
    return {item,area,total:r.width*r.height,x1,y1,x2,y2,left:r.left,top:r.top,width:r.width,height:r.height};
  });
  const crowded=scene.items.length>=4,hero=scene.items.filter(item=>item.o.type==='main').sort((a,b)=>objectPriority(b.o.id)-objectPriority(a.o.id))[0]?.o.id;
  let score=0,visible=0,weightedX=0,weightedY=0;
  rects.forEach((r,i)=>{
    const fraction=r.total?r.area/r.total:0,weight=r.item.o.type==='background'?.55:1;
    const target=crowded?(r.item.o.type==='background'?.7:r.item.o.id===hero?.8:.9):(i===0?.62:.74);
    score+=weight*(1-Math.abs(fraction-target));
    if(crowded&&r.item.o.type==='main'&&fraction<.62)score-=4*(.62-fraction);
    if(r.item.o.type==='main'){
      const bodyVisible=visibleBodyFraction(r.item,r,scene.w,scene.h);
      const minimum=r.item.o.id===hero?(hero==='headphones'?.84:.68):['coin','puzzle','planner','notebook'].includes(r.item.o.id)?.84:.76;
      score-=12*Math.max(0,minimum-bodyVisible);
    }
    if(fraction<.23)score-=1.5;
    visible+=r.area;weightedX+=r.area*(r.x1+r.x2)/2;weightedY+=r.area*(r.y1+r.y2)/2;
  });
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
    if(rects[i].item.o.type==='background'||rects[j].item.o.type==='background')continue;
    const a=rects[i],b=rects[j],overlap=Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
    score-=Math.max(0,overlap/Math.max(1,Math.min(a.area,b.area))-(crowded?.28:.18))*(crowded?1.1:1.4);
    const ids=[a.item.o.id,b.item.o.id].sort().join('|');
    const allowed=ids==='book|phone'?.28:ids==='phone|puzzle'?.18:.08;
    const visibleBody=Math.max(1,Math.min(a.area,b.area)*.55);
    score-=Math.max(0,maskOverlap(a,b,scene)/visibleBody-allowed)*4.5;
  }
  if(crowded){
    for(const rect of rects){
      const neighbors=rects.filter(other=>other!==rect&&(rect.item.o.type==='background'||other.item.o.type==='main'));
      if(!neighbors.length)continue;
      const nearest=Math.min(...neighbors.map(other=>{
        const dx=Math.max(0,rect.x1-other.x2,other.x1-rect.x2);
        const dy=Math.max(0,rect.y1-other.y2,other.y1-rect.y2);
        return Math.hypot(dx/scene.w,dy/scene.h);
      }));
      score-=Math.max(0,nearest-(rect.item.o.type==='background'?.12:.035))*(rect.item.o.type==='background'?1.4:3.2);
    }
    const mainRects=rects.filter(rect=>rect.item.o.type==='main');
    if(mainRects.length>1){
      const connected=new Set([0]);
      while(connected.size<mainRects.length){
        let nearest={index:-1,gap:Infinity};
        for(const index of connected)for(let other=0;other<mainRects.length;other++){
          if(connected.has(other))continue;
          const a=mainRects[index],b=mainRects[other];
          const dx=Math.max(0,a.x1-b.x2,b.x1-a.x2),dy=Math.max(0,a.y1-b.y2,b.y1-a.y2);
          const gap=Math.hypot(dx/scene.w,dy/scene.h);
          if(gap<nearest.gap)nearest={index:other,gap};
        }
        score-=5*Math.max(0,nearest.gap-.025);
        connected.add(nearest.index);
      }
    }
  }
  const book=rects.find(rect=>rect.item.o.id==='book'),lamp=rects.find(rect=>rect.item.o.id==='lamp');
  if(book&&lamp){
    const region=(rect,[x,y,width,height])=>({left:rect.left+rect.width*x,top:rect.top+rect.height*y,right:rect.left+rect.width*(x+width),bottom:rect.top+rect.height*(y+height)});
    const pages=region(book,[.06,.05,.85,.72]),base=region(lamp,[.03,.76,.7,.22]);
    const overlap=Math.max(0,Math.min(pages.right,base.right)-Math.max(pages.left,base.left))*Math.max(0,Math.min(pages.bottom,base.bottom)-Math.max(pages.top,base.top));
    score-=8*overlap/Math.max(1,(base.right-base.left)*(base.bottom-base.top));
  }
  if(visible){score-=Math.hypot(weightedX/visible/scene.w-.5,weightedY/visible/scene.h-.5)*.35;}
  return score;
}
function generateCandidates(nextBatch=false,preserve=false){
  if(nextBatch)state.variantBase=(Number.isInteger(state.variantBase)?state.variantBase:0)+18;
  const base=Number.isInteger(state.variantBase)?state.variantBase:0,prior=state.seed;
  const scores=new Map(),score=seed=>{if(!scores.has(seed))scores.set(seed,scoreCandidate(seed));return scores.get(seed)};
  const centerCache=new Map(),centers=seed=>{
    if(!centerCache.has(seed)){
      const scene=sceneFor(seed);
      centerCache.set(seed,new Map(scene.items.map(item=>[item.o.id,[item.cx/scene.w,item.cy/scene.h,item.o.type==='main'?1:.45]])));
    }
    return centerCache.get(seed);
  };
  const distance=(a,b)=>{
    const first=centers(a),second=centers(b),shared=[...first.keys()].filter(id=>second.has(id));
    const weight=shared.reduce((sum,id)=>sum+first.get(id)[2],0);
    return weight?shared.reduce((sum,id)=>sum+first.get(id)[2]*Math.hypot(first.get(id)[0]-second.get(id)[0],first.get(id)[1]-second.get(id)[1]),0)/weight:0;
  };
  const pool=Array.from({length:18},(_,index)=>base+index),first=[...pool].sort((a,b)=>score(b)-score(a))[0],chosen=[first];
  while(chosen.length<3){
    const options=pool.filter(seed=>!chosen.includes(seed));
    const distinct=options.filter(seed=>Math.min(...chosen.map(other=>distance(seed,other)))>=.12);
    (distinct.length?distinct:options).sort((a,b)=>{
      const merit=seed=>score(seed)-10*Math.max(0,.14-Math.min(...chosen.map(other=>distance(seed,other))));
      return merit(b)-merit(a);
    });
    chosen.push((distinct.length?distinct:options)[0]);
  }
  state.candidates=chosen;
  const selectedObjects=sceneIds().map(findObject).filter(Boolean);
  if(referencePreset(selectedObjects,state.size))state.candidates.sort((a,b)=>(a%3===0?-1:b%3===0?1:0));
  if(preserve&&Number.isInteger(prior)&&prior>=0&&!state.candidates.includes(prior)){
    const sameMotif=state.candidates.findIndex(seed=>seed%3===prior%3);
    state.candidates[sameMotif>=0?sameMotif:state.candidates.length-1]=prior;
  }
  state.seed=preserve&&state.candidates.includes(prior)?prior:state.candidates[0];
  if(!sceneIds().includes(state.activeObject))state.activeObject=null;
}
function renderSvg(seed=state.seed,interactive=false,prefix='export'){
  const scene=sceneFor(seed),{w,h,p,items}=scene;
  const objectKey=items.map(item=>item.o.id).sort().join('|'),referenceKey=referencePreset(items.map(item=>item.o),state.size)?objectKey:null;
  const yellowPlanner=objectKey==='coin|lampBg|planner';
  const layers=items.map(item=>{
    const r=placement(item,seed),{o,asset,index}=item;
    const colorVariant=yellowPlanner&&o.id==='planner'?'yellowPlanner':referenceKey&&['lampBg','flowersBg'].includes(o.id)?'softBackground':null;
    const safeId=o.id.replace(/[^A-Za-z0-9_-]/g,'-');
    return `<g id="${prefix}-${safeId}-${index+1}" data-object-id="${esc(o.id)}" data-name="${esc(o.name)}" transform="rotate(${r.angle.toFixed(1)} ${r.cx.toFixed(1)} ${r.cy.toFixed(1)}) translate(${r.left.toFixed(1)} ${r.top.toFixed(1)}) scale(${r.scale.toFixed(5)})"><g transform="translate(${-r.bx} ${-r.by})">${fragment(asset,p,`${prefix}-scene-${safeId}-${index}`,colorVariant)}${interactive?`<rect x="${r.bx}" y="${r.by}" width="${asset.box[2]}" height="${asset.box[3]}" fill="transparent" pointer-events="all"/>`:''}</g></g>`;
  }).join('\n  ');
  const selected=interactive?items.find(item=>item.o.id===state.activeObject):null;
  const outline=selected?(()=>{const r=rotatedBounds(placement(selected,seed)),frame=selectionGeometry(r,w,h),rotationRadius=frame.radius*1.12;return `<g class="selection-frame"><rect x="${frame.left}" y="${frame.top}" width="${frame.width}" height="${frame.height}" fill="none" stroke="#6959DF" stroke-width="${Math.min(w,h)*.003}" stroke-dasharray="12 8" pointer-events="none"/>${scaleLocked(seed)?'':`<circle class="scale-handle" data-handle-for="${esc(selected.o.id)}" cx="${frame.x}" cy="${frame.y}" r="${frame.radius}" fill="white" stroke="#6959DF" stroke-width="3"/>`}${rotationLocked(selected.o.id,seed)?'':`<g class="rotate-handle" data-rotate-for="${esc(selected.o.id)}" transform="translate(${frame.rotateX} ${frame.rotateY})"><circle r="${rotationRadius}" fill="#6959DF" stroke="white" stroke-width="3"/><text text-anchor="middle" dominant-baseline="central" fill="white" font-size="${rotationRadius*1.65}" font-family="Arial,sans-serif" pointer-events="none">↻</text></g>`}</g>`})():'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden" role="img" aria-label="Композиция из ${items.length} объектов"><title>Композиция</title><desc>Отдельные редактируемые векторные объекты</desc><defs><clipPath id="${prefix}-canvas"><rect width="${w}" height="${h}"/></clipPath></defs><g id="background">${background(w,h,p,seed,referenceKey)}</g><g id="objects" clip-path="url(#${prefix}-canvas)">${layers}</g>${outline}</svg>`;
}
function renderPreview(){
  $('.preview').innerHTML=renderSvg(state.seed,true,'preview');
  $('.preview svg').classList.toggle('wide',state.size==='wide');
  $('.preview svg').classList.toggle('portrait',state.size==='portrait');
  updateSelectionControls();
}
function renderCandidates(){
  $('#variantGrid').innerHTML=state.candidates.map((seed,i)=>`<button class="variant-option ${seed===state.seed?'active':''}" data-variant="${seed}" aria-pressed="${seed===state.seed}"><span class="variant-thumb">${renderSvg(seed,false,`variant-${i}`)}</span><span class="variant-caption">Вариант ${i+1}<small>${i===0?'Рекомендуемый':'Выбрать'}</small></span></button>`).join('');
}
function updateSelectionControls(){
  const active=state.activeObject&&sceneIds().includes(state.activeObject)?findObject(state.activeObject):null;
  $('#emptySelection').hidden=!!active;$('#selectionControls').hidden=!active;
  document.querySelectorAll('.layer-chip').forEach(chip=>chip.classList.toggle('active',chip.querySelector('[data-layer-id]')?.dataset.layerId===state.activeObject));
  if(active){$('#selectedObjectName').textContent=active.name;const edit=getEdit(active.id),percent=Math.round(edit.mult*100),index=state.layerOrder.indexOf(active.id),lockedScale=scaleLocked(),lockedRotation=rotationLocked(active.id),scaleButton=$('#lockScaleBtn'),rotationButton=$('#lockRotationBtn');$('#scaleSlider').value=String(percent);$('#scaleSlider').disabled=lockedScale;$('#scaleValue').textContent=`${percent}%`;$('#rotationInput').value=String(edit.angle);$('#rotationInput').disabled=lockedRotation;scaleButton.classList.toggle('active',lockedScale);scaleButton.setAttribute('aria-pressed',String(lockedScale));scaleButton.textContent=lockedScale?'🔒 Масштаб':'🔓 Масштаб';scaleButton.title=lockedScale?'Снять фиксацию масштаба всей композиции':'Зафиксировать масштаб всей композиции';rotationButton.classList.toggle('active',lockedRotation);rotationButton.setAttribute('aria-pressed',String(lockedRotation));rotationButton.textContent=lockedRotation?'🔒 Поворот':'🔓 Поворот';rotationButton.title=lockedRotation?'Снять фиксацию поворота выбранного объекта':'Зафиксировать поворот выбранного объекта';$('#layerDownBtn').disabled=index<=0;$('#layerUpBtn').disabled=index>=state.layerOrder.length-1;}
}
function updateLiveObject(id){
  const svg=$('#preview svg'),scene=sceneFor(state.seed),item=scene.items.find(x=>x.o.id===id);
  if(!svg||!item)return;
  const r=placement(item,state.seed),group=[...svg.querySelectorAll('#objects > g')].find(g=>g.dataset.objectId===id);
  if(group)group.setAttribute('transform',`rotate(${r.angle.toFixed(1)} ${r.cx.toFixed(1)} ${r.cy.toFixed(1)}) translate(${r.left.toFixed(1)} ${r.top.toFixed(1)}) scale(${r.scale.toFixed(5)})`);
  const frame=svg.querySelector('.selection-frame');
  if(frame){const rect=frame.querySelector('rect'),scaleHandle=frame.querySelector('.scale-handle'),rotateHandle=frame.querySelector('.rotate-handle'),geometry=selectionGeometry(rotatedBounds(r),scene.w,scene.h);for(const [key,value] of Object.entries({x:geometry.left,y:geometry.top,width:geometry.width,height:geometry.height}))rect.setAttribute(key,value);if(scaleHandle){scaleHandle.setAttribute('cx',geometry.x);scaleHandle.setAttribute('cy',geometry.y)}if(rotateHandle)rotateHandle.setAttribute('transform',`translate(${geometry.rotateX} ${geometry.rotateY})`);}
  $('#scaleValue').textContent=`${Math.round(getEdit(id).mult*100)}%`;
  $('#scaleSlider').value=String(Math.round(getEdit(id).mult*100));
  $('#rotationInput').value=String(Math.round(getEdit(id).angle*10)/10);
}
function update(){
  const p=palettes.find(x=>x.id===state.palette);
  $('#paletteList').innerHTML=palettes.map(x=>`<button class="palette-option ${state.palette===x.id?'active':''}" data-palette="${esc(x.id)}" role="radio" aria-checked="${state.palette===x.id}"><span class="palette-swatch" style="--swatch-bg:${x.bg};--swatch-a:${x.a};--swatch-b:${x.b};--swatch-c:${x.c};--swatch-d:${x.d}"></span><span><span class="palette-title">${esc(x.name)}</span><span class="palette-subtitle">${esc(x.subtitle)}</span></span><span class="radio"></span></button>`).join('');
  $('#objectGrid').innerHTML=objects.map(o=>`<button class="object-choice ${state.selected.includes(o.id)?'active':''}" data-object="${o.id}" aria-pressed="${state.selected.includes(o.id)}" title="${o.name}">${o.type==='background'?'<span class="bg-marker" title="Фоновый элемент">◌</span>':''}<span class="thumb"><svg viewBox="${assetFor(o.id,state.detail).box.join(' ')}" aria-hidden="true">${fragment(assetFor(o.id,state.detail),p,`thumb-${o.id}`)}</svg></span><span>${o.name.replace(' · фон','')}</span></button>`).join('');
  renderPreview();renderCandidates();
  $('#previewMeta').textContent=`${state.size==='portrait'?800:1200} × ${state.size==='wide'?630:1200} · SVG · ${p.name} · ${state.detail==='large'?'L':'S'}`;
  $('#layerCount').textContent=`${sceneIds().length} объектов`;
  $('#layerList').innerHTML=sceneIds().length?state.layerOrder.map(id=>{const o=findObject(id),label=`${o.name}${id!==o.sourceId?' · копия':''}`;return `<span class="layer-chip ${state.activeObject===id?'active':''}" data-layer-chip="${id}" draggable="true"><span class="layer-grip" aria-hidden="true">⋮⋮</span><button type="button" class="layer-select" data-layer-id="${id}" aria-label="Выбрать слой ${esc(label)}">${esc(label)}</button><button data-remove="${id}" aria-label="Удалить ${esc(label)}">×</button></span>`}).join(''):'<span class="hint">Пока нет объектов. Выберите их слева.</span>';
  document.querySelectorAll('.size-option').forEach(b=>{const active=b.dataset.size===state.size;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  document.querySelectorAll('.detail-option').forEach(b=>{const active=b.dataset.detail===state.detail;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  document.querySelectorAll('.mode-tab').forEach(b=>{const active=b.dataset.mode===state.mode;b.classList.toggle('active',active);b.setAttribute('aria-selected',active)});
  $('#manualControls').hidden=state.mode!=='manual';$('#briefControls').hidden=state.mode!=='brief';
  if(document.activeElement!==$('#briefInput')) $('#briefInput').value=state.brief;
}
const briefAliases={
  book:['книг','чтен','читать','book'],phone:['телефон','смартфон','phone'],puzzle:['пазл','puzzle'],coin:['монет','coin'],
  headphones:['наушник','headphone'],lamp:['ламп','lamp'],flowers:['цвет','букет','flower'],planner:['ежедневник','планер','planner'],
  notebook:['блокнот','notebook'],pen:['карандаш','ручк','pen']
};
const briefConcepts=[
  [/учеб|образован|знан|урок|курс|экзамен|студент|исслед/,{book:5,notebook:4,pen:3,lampBg:2}],
  [/иде|креатив|творч|вдохнов|решен|задач|собир|кусоч|фрагмент|головолом|мозг/,{puzzle:6,notebook:3,phone:2}],
  [/финанс|деньг|бизнес|бюджет|оплат|капитал|прибыл|эконом/,{coin:5,planner:3,phone:2}],
  [/цифр|технолог|онлайн|мобиль|приложен|стартап|сервис|интернет/,{phone:5,puzzle:3,notebook:2}],
  [/музык|аудио|подкаст|звук|слуш|мелоди/,{headphones:6,phone:3,flowersBg:1}],
  [/уют|дом|интерьер|атмосфер|декор|комфорт/,{flowersBg:5,lampBg:4,book:2}],
  [/рабоч|работ|офис|стол|продуктив/,{lampBg:5,planner:4,notebook:3,pen:2}],
  [/цвет|растен|природ|весн|эколог|сад/,{flowers:5,flowersBg:3,notebook:2}],
  [/план|цель|расписан|организ|проект|тайм/,{planner:5,notebook:4,pen:2}],
  [/путешеств|дорог|маршрут|поездк/,{phone:4,notebook:3,coin:2}],
  [/команд|сотруднич|партнер|совмест|соедин|связ/,{puzzle:5,phone:4,notebook:2}],
  [/будущ|развит|прогресс|инновац|новатор|рост/,{phone:5,puzzle:4,planner:2}],
  [/отдых|спокойств|гармон|баланс|релакс/,{headphones:4,flowersBg:4,book:2}],
  [/чтен|читать|книг|литератур/,{book:6,lampBg:3,notebook:2}],
  [/мысл|замысл|озарен|фантази|воображ|придум|созда|открыти/,{puzzle:5,notebook:4,pen:2}],
  [/путь|шаг|старт|начал|финиш|достиж|успех|побед|результат/,{planner:5,puzzle:4,phone:2}],
  [/свет|ясн|прозрен|поиск|ответ/,{lampBg:5,book:4,puzzle:2}],
  [/врем|час|момент|срок|дедлайн/,{planner:5,coin:3,pen:2}],
  [/мост|общен|диалог|встреч|разговор|люд/,{puzzle:5,phone:4,notebook:2}],
  [/забот|тепл|семь|близк/,{flowersBg:5,book:3,lampBg:2}]
];
function selectByBrief(){
  const text=state.brief.toLocaleLowerCase('ru').replaceAll('ё','е'),tokens=[...text.matchAll(/[а-яa-z]+/g)],scores=new Map(),explicit=[];
  const add=(id,value)=>scores.set(id,(scores.get(id)||0)+value);
  for(const [id,aliases] of Object.entries(briefAliases)){
    const match=tokens.find(token=>aliases.some(word=>token[0].startsWith(word)));
    if(!match)continue;
    const index=match.index,before=text.slice(Math.max(0,index-28),index);
    const backgroundCue=/(?:^|[^а-яa-z])(?:фон[а-яa-z]*|позади|на\s+фоне|на\s+заднем\s+плане)\s*$/u.test(before);
    const chosen=backgroundCue?`${id}Bg`:id;
    explicit.push(chosen);add(chosen,15);
  }
  for(const [pattern,weights] of briefConcepts)if(tokens.some(token=>token[0].match(pattern)?.index===0))for(const [id,value] of Object.entries(weights))add(id,value);
  const ranked=[...scores].sort((a,b)=>b[1]-a[1]||objects.findIndex(o=>o.id===a[0])-objects.findIndex(o=>o.id===b[0]));
  const selected=[];
  const addUnique=id=>{if(!findObject(id)||selected.includes(id)||selected.some(other=>other.replace(/Bg$/,'')===id.replace(/Bg$/,'')))return;selected.push(id)};
  explicit.forEach(addUnique);
  const target=explicit.length>=2?explicit.length:Math.min(3,Math.max(2,ranked.length));
  for(const [id] of ranked){if(selected.length>=target)break;addUnique(id)}
  if(!selected.length){$('#briefFeedback').textContent='Не удалось определить тему. Добавьте, например, «учёба», «идеи», «финансы», «музыка» или названия предметов.';$('#briefFeedback').hidden=false;return false}
  $('#briefFeedback').hidden=true;state.selected=selected;state.duplicates=[];return true;
}
function download(name,mime,content){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function restoreProject(data){
  if(!data||!['square','wide','portrait'].includes(data.size)||!Array.isArray(data.selected))throw Error('Неверный формат проекта');
  const customPalettes=Array.isArray(data.customPalettes)?data.customPalettes.map(parsePalette):[];
  if(!palettes.slice(0,3).some(p=>p.id===data.palette)&&!customPalettes.some(p=>p.id===data.palette))throw Error('Неизвестная палитра проекта');
  palettes.splice(3);
  installPalettes(customPalettes);
  const duplicates=[...new Set((Array.isArray(data.duplicates)?data.duplicates:[]).filter(id=>typeof id==='string'&&/~[2-9]\d*$/.test(id)&&!!findObject(id)))];
  const sceneScale={};
  for(const [key,value] of Object.entries(data.sceneScale||{}))if(/^(square|wide|portrait)-(large|small)-\d+$/.test(key)&&Number.isFinite(value))sceneScale[key]=Math.max(.4,Math.min(1.8,value));
  const scaleLocks={};
  for(const [key,value] of Object.entries(data.scaleLocks||{}))if(/^(square|wide|portrait)-(large|small)-\d+$/.test(key)&&value===true)scaleLocks[key]=true;
  const rotationLocks={};
  for(const [key,value] of Object.entries(data.rotationLocks||{})){const [sceneKey,id]=key.split('|');if(/^(square|wide|portrait)-(large|small)-\d+$/.test(sceneKey)&&findObject(id)&&value===true)rotationLocks[key]=true}
  const edits={};
  for(const [key,changes] of Object.entries(data.edits||{})){
    if(!/^(square|wide|portrait)-(large|small)-\d+$/.test(key)||!changes||typeof changes!=='object')continue;
    edits[key]={};
    for(const [id,value] of Object.entries(changes))if(findObject(id)&&value&&Number.isFinite(value.dx)&&Number.isFinite(value.dy)){
      edits[key][id]={dx:Math.max(-2400,Math.min(2400,value.dx)),dy:Math.max(-2400,Math.min(2400,value.dy)),angle:Number.isFinite(value.angle)?Math.max(-180,Math.min(180,value.angle)):0};
      if(sceneScale[key]===undefined&&Number.isFinite(value.mult)&&value.mult!==1)sceneScale[key]=Math.max(.4,Math.min(1.8,value.mult));
    }
  }
  state={...initial,...data,customPalettes,duplicates,sceneScale,scaleLocks,rotationLocks,detail:['large','small'].includes(data.detail)?data.detail:'large',selected:[...new Set(data.selected.filter(id=>objects.some(o=>o.id===id)))],variantBase:Number.isInteger(data.variantBase)?Math.max(0,data.variantBase):0,seed:Number.isInteger(data.seed)?Math.max(0,data.seed):0,layoutVersion:data.layoutVersion===2?2:1,edits,activeObject:null,candidates:[]};
  generateCandidates(false,true);update();
}
function removeSceneObject(id){
  const before=sceneFor(state.seed),positions=new Map(before.items.map(item=>{const edit=getEdit(item.o.id);return [item.o.id,{x:item.cx+edit.dx,y:item.cy+edit.dy,angle:edit.angle}]}));
  state.selected=state.selected.filter(other=>other!==id);
  state.duplicates=state.duplicates.filter(other=>other!==id);
  if(state.activeObject===id)state.activeObject=null;
  generateCandidates(false,true);
  for(const item of sceneFor(state.seed).items){const target=positions.get(item.o.id);if(!target)continue;const edit=getEdit(item.o.id);setEdit(item.o.id,{...edit,dx:target.x-item.cx,dy:target.y-item.cy,angle:target.angle})}
  update();
}
document.addEventListener('click',e=>{
  const size=e.target.closest('[data-size]');if(size){state.size=size.dataset.size;state.activeObject=null;generateCandidates(false);update();return}
  const detail=e.target.closest('[data-detail]');if(detail){state.detail=detail.dataset.detail;state.activeObject=null;generateCandidates(false);update();return}
  const palette=e.target.closest('[data-palette]');if(palette){state.palette=palette.dataset.palette;update();return}
  const mode=e.target.closest('[data-mode]');if(mode){state.mode=mode.dataset.mode;update();return}
  const variant=e.target.closest('[data-variant]');if(variant){state.seed=Number(variant.dataset.variant);state.activeObject=null;renderPreview();renderCandidates();return}
  const layer=e.target.closest('[data-layer-id]');if(layer){state.activeObject=layer.dataset.layerId;update();return}
  const object=e.target.closest('[data-object]');if(object){const id=object.dataset.object;if(state.selected.includes(id))removeSceneObject(id);else{state.selected.push(id);generateCandidates(false);update()}return}
  const remove=e.target.closest('[data-remove]');if(remove){removeSceneObject(remove.dataset.remove);return}
});
$('#briefInput').addEventListener('input',e=>{state.brief=e.target.value;$('#briefFeedback').hidden=true});
$('#generateBtn').addEventListener('click',()=>{if(state.mode==='brief'&&!selectByBrief())return;state.layoutVersion=2;generateCandidates(true);update()});
$('#regenerateBtn').addEventListener('click',()=>{state.layoutVersion=2;generateCandidates(true);update()});
$('#shuffleBtn').addEventListener('click',()=>{const i=state.candidates.indexOf(state.seed);state.seed=state.candidates[(i+1)%state.candidates.length];state.activeObject=null;renderPreview();renderCandidates()});
$('#clearBtn').addEventListener('click',()=>{state.selected=[];state.duplicates=[];state.activeObject=null;state.scaleLocks={};state.rotationLocks={};generateCandidates(false);update()});
$('#exportBtn').addEventListener('click',()=>download(`composition-${state.size}-${state.palette}-v${state.candidates.indexOf(state.seed)+1}.svg`,'image/svg+xml;charset=utf-8',renderSvg()));
$('#saveBtn').addEventListener('click',()=>{localStorage.setItem('composition-project',JSON.stringify(state));download('composition-project.json','application/json;charset=utf-8',JSON.stringify({version:2,...state},null,2))});
$('#importPaletteBtn').addEventListener('click',()=>$('#paletteInput').click());
$('#paletteInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=parsePalette(JSON.parse(await file.text()));installPalettes([parsed]);state.customPalettes=state.customPalettes.filter(p=>p.id!==parsed.id).concat(parsed);state.palette=parsed.id;$('#paletteFeedback').hidden=true;update()}catch(err){$('#paletteFeedback').textContent=err.message;$('#paletteFeedback').hidden=false}e.target.value=''});
$('#loadBtn').addEventListener('click',()=>$('#loadInput').click());
$('#loadInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{restoreProject(JSON.parse(await file.text()))}catch(err){alert('Не удалось загрузить проект: '+err.message)}e.target.value=''});
$('#scaleSlider').addEventListener('input',e=>{if(!state.activeObject||scaleLocked())return;state.sceneScale[editKey()]=Number(e.target.value)/100;renderPreview()});
$('#scaleSlider').addEventListener('change',()=>renderCandidates());
$('#rotationInput').addEventListener('change',e=>{if(!state.activeObject||rotationLocked(state.activeObject))return;const edit=getEdit(state.activeObject);setEdit(state.activeObject,{...edit,angle:Math.max(-180,Math.min(180,Number(e.target.value)||0))});renderPreview();renderCandidates()});
$('#lockScaleBtn').addEventListener('click',()=>{if(!state.activeObject)return;const key=editKey();if(scaleLocked())delete state.scaleLocks[key];else state.scaleLocks[key]=true;renderPreview()});
$('#lockRotationBtn').addEventListener('click',()=>{if(!state.activeObject)return;const key=rotationLockKey(state.activeObject);if(rotationLocked(state.activeObject))delete state.rotationLocks[key];else state.rotationLocks[key]=true;renderPreview()});
$('#duplicateBtn').addEventListener('click',()=>{
  const source=state.activeObject;if(!source)return;
  const before=sceneFor(state.seed),where=new Map(before.items.map(item=>{const edit=getEdit(item.o.id);return [item.o.id,{x:item.cx+edit.dx,y:item.cy+edit.dy,angle:edit.angle}]}));
  const base=templateId(source);let number=2;while(sceneIds().includes(`${base}~${number}`))number++;
  const copy=`${base}~${number}`;state.duplicates.push(copy);
  const index=state.layerOrder.indexOf(source);state.layerOrder.splice(index+1,0,copy);
  generateCandidates(false,true);
  const next=sceneFor(state.seed);where.set(copy,{x:where.get(source).x+Math.min(next.w,next.h)*.045,y:where.get(source).y+Math.min(next.w,next.h)*.035,angle:where.get(source).angle});
  for(const item of next.items){const target=where.get(item.o.id);if(!target)continue;const edit=getEdit(item.o.id);setEdit(item.o.id,{...edit,dx:target.x-item.cx,dy:target.y-item.cy,angle:target.angle})}
  state.activeObject=copy;update();
});
$('#resetObjectBtn').addEventListener('click',()=>{if(!state.activeObject)return;delete state.edits[editKey()]?.[state.activeObject];renderPreview();renderCandidates()});
function moveLayer(direction){
  const index=state.layerOrder.indexOf(state.activeObject),next=index+direction;
  if(index<0||next<0||next>=state.layerOrder.length)return;
  [state.layerOrder[index],state.layerOrder[next]]=[state.layerOrder[next],state.layerOrder[index]];
  update();
}
$('#layerDownBtn').addEventListener('click',()=>moveLayer(-1));
$('#layerUpBtn').addEventListener('click',()=>moveLayer(1));
const layerList=$('#layerList');
let draggedLayer=null;
layerList.addEventListener('dragstart',e=>{
  const chip=e.target.closest('[data-layer-chip]');
  if(!chip||e.target.closest('[data-remove]')){e.preventDefault();return}
  draggedLayer=chip.dataset.layerChip;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',draggedLayer);
  chip.classList.add('dragging');
});
layerList.addEventListener('dragover',e=>{
  if(!draggedLayer)return;
  e.preventDefault();e.dataTransfer.dropEffect='move';
  layerList.querySelectorAll('.drop-before,.drop-after').forEach(chip=>chip.classList.remove('drop-before','drop-after'));
  const target=e.target.closest('[data-layer-chip]');
  if(!target||target.dataset.layerChip===draggedLayer)return;
  const box=target.getBoundingClientRect();
  target.classList.add(e.clientX<box.left+box.width/2?'drop-before':'drop-after');
});
layerList.addEventListener('drop',e=>{
  if(!draggedLayer)return;
  e.preventDefault();
  const target=e.target.closest('[data-layer-chip]');
  const from=state.layerOrder.indexOf(draggedLayer);
  const to=target?state.layerOrder.indexOf(target.dataset.layerChip):state.layerOrder.length;
  if(from>=0&&to>=0&&from!==to){
    const after=target&&e.clientX>=target.getBoundingClientRect().left+target.getBoundingClientRect().width/2;
    const insertAt=to+(after?1:0)-(from<to+(after?1:0)?1:0);
    state.layerOrder.splice(from,1);
    state.layerOrder.splice(insertAt,0,draggedLayer);
    state.activeObject=draggedLayer;
  }
  draggedLayer=null;update();
});
layerList.addEventListener('dragend',()=>{draggedLayer=null;layerList.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(chip=>chip.classList.remove('dragging','drop-before','drop-after'))});
function svgPoint(svg,event){const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse())}
let pointerAction=null;
$('#preview').addEventListener('pointerdown',e=>{
  const scaleHandle=e.target.closest?.('[data-handle-for]'),rotateHandle=e.target.closest?.('[data-rotate-for]'),group=e.target.closest?.('[data-object-id]'),id=scaleHandle?.dataset.handleFor||rotateHandle?.dataset.rotateFor||group?.dataset.objectId;
  if(!id){if(state.activeObject){state.activeObject=null;renderPreview()}return}
  if((scaleHandle&&scaleLocked())||(rotateHandle&&rotationLocked(id)))return;
  state.activeObject=id;renderPreview();
  const svg=$('#preview svg'),start=svgPoint(svg,e),edit=getEdit(id),item=sceneFor(state.seed).items.find(x=>x.o.id===id);
  const center={x:item.cx+edit.dx,y:item.cy+edit.dy};
  pointerAction={pointerId:e.pointerId,id,mode:rotateHandle?'rotate':scaleHandle?'scale':'move',start,edit,center,startAngle:Math.atan2(start.y-center.y,start.x-center.x)*180/Math.PI};
  try{svg.setPointerCapture(e.pointerId)}catch{}
  e.preventDefault();
});
document.addEventListener('pointermove',e=>{
  if(!pointerAction||e.pointerId!==pointerAction.pointerId)return;
  const svg=$('#preview svg'),point=svgPoint(svg,e),a=pointerAction;
  if(a.mode==='move')setEdit(a.id,{...a.edit,dx:a.edit.dx+point.x-a.start.x,dy:a.edit.dy+point.y-a.start.y});
  else if(a.mode==='scale'&&!scaleLocked()){const before=Math.max(1,Math.hypot(a.start.x-a.center.x,a.start.y-a.center.y)),after=Math.hypot(point.x-a.center.x,point.y-a.center.y);setEdit(a.id,{...a.edit,mult:a.edit.mult*after/before})}
  else if(a.mode==='rotate'&&!rotationLocked(a.id))setEdit(a.id,{...a.edit,angle:angleFromPointer(a.edit.angle,a.startAngle,a.center,point)});
  if(a.mode==='scale')renderPreview();else updateLiveObject(a.id);e.preventDefault();
});
function finishPointer(e){if(!pointerAction||e.pointerId!==pointerAction.pointerId)return;pointerAction=null;renderCandidates()}
document.addEventListener('pointerup',finishPointer);document.addEventListener('pointercancel',finishPointer);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.activeObject){state.activeObject=null;renderPreview()}});
try{const saved=JSON.parse(localStorage.getItem('composition-project'));if(saved)restoreProject(saved);else{generateCandidates();update()}}catch{state={...initial};generateCandidates();update()}
