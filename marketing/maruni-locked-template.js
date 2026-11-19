/* 청인마루 마루니·루루 고정 4컷 (원본 파일 기반, 별도 저장소) */
(() => {
  'use strict';
  const root = document.getElementById('maruni-locked-template');
  if (!root) return;
  const W = 1080, H = 1350, COUNT = 5, DB_NAME = 'cheonginmaru-maruni-locked-v1';
  const q = s => root.querySelector(s);
  const $ = q('.ml-body');
  $.innerHTML = [
    '<div class="ml-projectbar"><input id="ml-name" maxlength="80" placeholder="현장·시리즈 이름" aria-label="고정 템플릿 작업 이름">',
    '<button id="ml-save" type="button">저장</button><button id="ml-new" type="button">새 작업</button>',
    '<select id="ml-projects" aria-label="저장한 고정 템플릿"><option value="">저장한 작업 선택</option></select><button id="ml-open" type="button">불러오기</button></div>',
    '<p id="ml-status" role="status" aria-live="polite"></p>',
    '<div class="ml-layout"><div class="ml-stage">',
    '<canvas id="ml-canvas" width="540" height="675" aria-label="고정 포맷 4대5 이미지 미리보기"></canvas>',
    '<div id="ml-tabs" class="ml-tabs" aria-label="썸네일 및 4컷 선택"></div>',
    '<div class="ml-actions"><button id="ml-export-one" type="button">현재 장 PNG 저장</button><button id="ml-export-all" class="ml-primary" type="button">썸네일+4컷 ZIP 저장</button>',
    '<button id="ml-share" type="button">현재 장 공유(아이폰)</button></div>',
    '<p class="ml-note">모든 출력 1080×1350px · 로고는 표지만 · 글씨·말풍선·여백은 고정 · 사진은 기기 안에서만 처리합니다. 사진 원본 색상·결 보정 없음.</p>',
    '</div><div class="ml-controls">',
    '<label>제품 / 현장 제품명<input id="ml-product" maxlength="65" placeholder="예: 동화 시그니월 슬레이트모티프"></label>',
    '<label>공통 시리즈 이름<input id="ml-series" maxlength="26" value="마루니·루루 제품 이야기"></label>',
    '<div class="ml-minirow"><label>시공 분야<select id="ml-field"><option>벽장재</option><option>마루</option><option>기타</option></select></label><label>시공 지역<input id="ml-region" maxlength="45" placeholder="예: 인천 송도"></label></div>',
    '<label>제품 규격(확인된 경우만)<input id="ml-spec" maxlength="65" placeholder="예: 1010 × 2460 × 9T"></label>',
    '<label>현재 장 현장 사진(JPG·PNG·WebP)<input id="ml-photo" type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"></label>',
    '<div class="ml-actions"><button id="ml-copy-photo-next" type="button">현재 사진을 다음 컷에 복사</button><button id="ml-copy-photo-all" type="button">현재 사진을 5장에 사용</button></div>',
    '<label>현재 장 제목(위치·크기 고정)<textarea id="ml-title" maxlength="44" rows="2"></textarea></label>',
    '<label id="ml-bubble-wrap">현재 장 짧은 말풍선(1개만)<input id="ml-bubble" maxlength="34"></label>',
    '<label>하단 핵심 문구(한 줄)<input id="ml-foot" maxlength="34"></label>',
    '<div class="ml-minirow"><label>마루니 공식 포즈<select id="ml-maruni"><option value="">없음</option></select></label>',
    '<label>루루 공식 포즈<select id="ml-ruru"><option value="">없음</option></select></label></div>',
    '<div class="ml-minirow"><label>캐릭터 배치 방향<select id="ml-side"><option value="right">오른쪽 아래</option><option value="left">왼쪽 아래</option></select></label>',
    '<label>사진 위아래 위치<input id="ml-photo-y" type="range" min="0" max="100" value="50"></label></div>',
    '<p class="ml-note">공식 캐릭터 PNG만 선택합니다. 포즈를 다시 그리지 않으며 반짝이·장식 효과를 새로 추가하지 않습니다. 표지에만 공식 원본 SVG 로고를 합성합니다.</p>',
    '<div class="ml-divider"></div>',
    '<div class="ml-actions"><button id="ml-copy-caption" type="button">고정 형식 캡션 복사</button><button id="ml-copy-comment" type="button">고정댓글 복사</button></div>',
    '<p class="ml-note">질문형 제목 → 제품 정보 → 현장 특징 → 청인마루 소개 → 문의 → 해시태그 순서로 문구를 정리합니다. 현장 정보는 직접 확인 후 게시하세요.</p>',
    '</div></div>'
  ].join('');
  const ink = '#34251b', green = '#405e2b', bronze = '#a77a4a', paper = '#fffaf0';
  const sceneDefaults = [
    {title:'회색 벽인데\n왜 이렇게 고급스러울까?',bubble:'',foot:'은은한 석재 질감이 완성하는 벽',maruni:'maruni-02',ruru:'ruru-02',side:'right'},
    {title:'은은한 슬레이트 질감',bubble:'잔잔한 결이 깔끔해!',foot:'부드러운 그레이 결로 차분한 인상',maruni:'maruni-03',ruru:'ruru-02',side:'right'},
    {title:'화이트 수납장과 간접조명',bubble:'가구와도 잘 어울려!',foot:'화이트 가구와 따뜻한 조명의 조화',maruni:'maruni-02',ruru:'ruru-01',side:'left'},
    {title:'벽과 코너의 연결감',bubble:'코너도 자연스러워!',foot:'벽면과 코너의 흐름을 함께 살펴보기',maruni:'maruni-03',ruru:'ruru-02',side:'left'},
    {title:'이런 공간에 추천해요',bubble:'차분한 회색 벽이 좋아!',foot:'은은한 스톤 질감을 좋아한다면',maruni:'maruni-01',ruru:'ruru-01',side:'left'}
  ];
  const clone = x => JSON.parse(JSON.stringify(x));
  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : 'p'+Date.now()+'x'+Math.random().toString(16).slice(2));
  function makeProject() {
    return {schema:'cheonginmaru-maruni-locked-v1',id:makeId(),name:'새 마루니·루루 시리즈',series:'마루니·루루 제품 이야기',product:'동화 시그니월 슬레이트모티프',field:'벽장재',region:'',spec:'',
      updatedAt:Date.now(),scenes:sceneDefaults.map(s => Object.assign({},s,{photo:null,focusY:50}))};
  }
  let project=makeProject(), active=0, catalog=[], dbPromise, saving=Promise.resolve(), saveTimer, drawToken=0, busy=false, persistedPhotos=new Set();
  const canvas=q('#ml-canvas'), ctx=canvas.getContext('2d'), imagePromises=new Map(), blobCache=new Map();
  let paintFrame=0, painting=false;
  function status(text, bad=false){q('#ml-status').textContent=text;q('#ml-status').dataset.error=String(bad);}
  function current(){return project.scenes[active];}
  function db(){
    if (dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,2);
      req.onupgradeneeded=()=>{
        const d=req.result;
        if(!d.objectStoreNames.contains('projects'))d.createObjectStore('projects',{keyPath:'id'});
        if(!d.objectStoreNames.contains('media'))d.createObjectStore('media',{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error('저장소를 열 수 없습니다.'));
    });
    return dbPromise;
  }
  async function transact(mode, action) {
    const d=await db();
    return new Promise((resolve,reject)=>{
      const tx=d.transaction('projects',mode), store=tx.objectStore('projects');
      let result;
      try {result=action(store);}catch(e){reject(e);return;}
      tx.oncomplete=()=>resolve(result&&result.result);
      tx.onerror=()=>reject(tx.error||Error('로컬 저장에 실패했습니다.'));
      tx.onabort=()=>reject(tx.error||Error('로컬 저장이 중단됐습니다.'));
    });
  }
  async function listProjects() {
    const d=await db();
    return new Promise((resolve,reject)=>{
      const rows=[],tx=d.transaction('projects','readonly'),req=tx.objectStore('projects').openCursor();
      req.onsuccess=()=>{const cur=req.result;if(cur){rows.push({id:cur.value.id,name:cur.value.name,updatedAt:cur.value.updatedAt||0});cur.continue();}};
      tx.oncomplete=()=>resolve(rows.sort((a,b)=>b.updatedAt-a.updatedAt));
      tx.onerror=()=>reject(tx.error||Error('저장된 작업 목록 오류'));
    });
  }
  async function refreshProjects() {
    const all=await listProjects(),select=q('#ml-projects'),previous=select.value;
    select.replaceChildren(new Option('저장한 작업 선택',''));
    for(const item of all)select.add(new Option(item.name,item.id));
    select.value=all.some(p=>p.id===previous)?previous:project.id;
  }
  async function openProject(id){
    if(!id)return;
    await saving;
    const d=await db();
    const item=await new Promise((resolve,reject)=>{
      const req=d.transaction('projects','readonly').objectStore('projects').get(id);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    if(!item)throw Error('작업을 찾을 수 없습니다.');
    const loaded=checkProject(item),ids=[...new Set(loaded.scenes.map(s=>s.photoId).filter(Boolean))];
    const files=new Map();
    if(ids.length)await new Promise((resolve,reject)=>{
      const tx=d.transaction('media','readonly'),store=tx.objectStore('media');
      for(const key of ids){const req=store.get(key);req.onsuccess=()=>{if(req.result?.blob instanceof Blob)files.set(key,req.result.blob);};}
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    let missing=0;
    for(const scene of loaded.scenes){
      if(scene.photoId&&!scene.photo){scene.photo=files.get(scene.photoId)||null;if(!scene.photo)missing++;}
    }
    project=loaded;persistedPhotos=new Set(files.keys());active=0;fields();preview();
    status(missing?'저장 사진 '+missing+'개가 없어 해당 컷의 사진을 다시 넣어야 합니다.':'저장한 작업을 불러왔습니다.',missing>0);
  }
  async function save() {
    clearTimeout(saveTimer);
    const photos=new Map();
    const scenes=project.scenes.map(scene=>{
      if(scene.photo instanceof Blob){
        if(!scene.photoId)scene.photoId=makeId();
        if(!persistedPhotos.has(scene.photoId))photos.set(scene.photoId,scene.photo);
      }
      const slim={...scene};
      delete slim.photo;  // 사진 Blob은 전용 media 저장소에 한 번만 저장
      return slim;
    });
    const snapshot={...project,updatedAt:Date.now(),scenes};
    project.updatedAt=snapshot.updatedAt;
    saving=saving.catch(()=>{}).then(async()=>{
      const d=await db();
      await new Promise((resolve,reject)=>{
        const tx=d.transaction(['projects','media'],'readwrite'),p=tx.objectStore('projects'),m=tx.objectStore('media');
        for(const [id,blob] of photos)m.put({id,blob});
        p.put(snapshot);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('기기 저장 실패'));tx.onabort=()=>reject(tx.error||Error('기기 저장 취소'));
      });
      for(const id of photos.keys())persistedPhotos.add(id);
      await refreshProjects();
    });
    try{await saving;status('저장 완료 · 사진은 텍스트 수정 때 다시 저장하지 않습니다.');}
    catch(e){status('자동 저장 실패: '+e.message,true);throw e;}
  }
  function changed(){clearTimeout(saveTimer);status('변경 사항 저장 대기');saveTimer=setTimeout(()=>save().catch(()=>{}),800);preview();}
  function checkProject(p) {
    if(!p||p.schema!=='cheonginmaru-maruni-locked-v1'||!Array.isArray(p.scenes)||p.scenes.length!==COUNT)throw Error('지원하지 않는 작업 형식입니다.');
    return p;
  }
  async function openProject(id){
    if(!id)return;
    const d=await db(), item=await new Promise((resolve,reject)=>{
      const tx=d.transaction('projects','readonly'), req=tx.objectStore('projects').get(id);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    if(!item)throw Error('작업을 찾을 수 없습니다.');
    await saving;project=checkProject(item);active=0;fields();preview();status('저장한 작업을 불러왔습니다.');
  }
  function addPhotoBlob(file){
    if(!file||file.size>25*1024*1024||file.size===0||(!/^image\/(png|jpeg|webp|heic|heif)$/.test(file.type)&&!/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name)))throw Error('25MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.');
    return file;
  }
  function assetImage(src){
    if(imagePromises.has(src)){
      const value=imagePromises.get(src);imagePromises.delete(src);imagePromises.set(src,value);return value;
    }
    const promise=new Promise((resolve,reject)=>{
      const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('공식 자산을 불러오지 못했습니다: '+src));im.src=src;
    });
    imagePromises.set(src,promise);
    while(imagePromises.size>8)imagePromises.delete(imagePromises.keys().next().value);
    return promise.catch(e=>{imagePromises.delete(src);throw e;});
  }
  function photoImage(blob){
    if(!blob)return Promise.resolve(null);
    if(blobCache.has(blob)){
      const p=blobCache.get(blob);blobCache.delete(blob);blobCache.set(blob,p);return p;
    }
    const promise=(async()=>{
      const url=URL.createObjectURL(blob),im=new Image();
      try{
        await new Promise((resolve,reject)=>{
          im.onload=resolve;im.onerror=()=>reject(Error('이 사진을 읽을 수 없습니다. 아이패드에서 JPG로 변환한 후 다시 넣어 주세요.'));
          im.src=url;
        });
        if(im.width*im.height>48000000)throw Error('사진 최대 4800만 화소를 넘었습니다.');
        const ratio=Math.min(1,2048/Math.max(im.width,im.height));
        const small=document.createElement('canvas');
        small.width=Math.max(1,Math.round(im.width*ratio));small.height=Math.max(1,Math.round(im.height*ratio));
        small.getContext('2d',{alpha:false}).drawImage(im,0,0,small.width,small.height);
        return small;
      }finally{im.src='';URL.revokeObjectURL(url);}
    })();
    blobCache.set(blob,promise);
    while(blobCache.size>2){
      const key=blobCache.keys().next().value,old=blobCache.get(key);
      blobCache.delete(key);
      old.then(img=>{img.width=1;img.height=1;}).catch(()=>{});
    }
    return promise.catch(e=>{blobCache.delete(blob);throw e;});
  }
  function rounded(x,y,w,h,r,fill,stroke){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
  }
  function font(px,bold=true){ctx.font=(bold?'700 ':'500 ')+px+'px "Maruni Story", "Noto Serif KR", sans-serif';}
  function splitLines(text,maxWidth,maxLines){
    const result=[], paragraphs=String(text||'').split('\n');
    for(const paragraph of paragraphs){
      let line='';
      for(const char of paragraph){
        if(line&&ctx.measureText(line+char).width>maxWidth){result.push(line);line=char;}else line+=char;
      }
      if(line)result.push(line);
    }
    if(result.length>maxLines)throw Error('제목이나 말풍선이 너무 깁니다. '+maxLines+'줄 이내로 줄여 주세요.');
    return result;
  }
  function textBlock(text,x,y,maxWidth,px,lh,maxLines,color,align='left'){
    ctx.save();font(px);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';
    const lines=splitLines(text,maxWidth,maxLines);
    for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x,y+i*lh);
    ctx.restore();return lines.length;
  }
  function photoCover(im,scene){
    const zoom=1, ratio=Math.max(W/im.width,H/im.height)*zoom, dw=im.width*ratio,dh=im.height*ratio;
    const dx=(W-dw)*.5,dy=(H-dh)*Number(scene.focusY||0)/100;
    ctx.drawImage(im,dx,dy,dw,dh);
  }
  function bubble(text){
    if(!text.trim())return;
    const x=110,y=365,w=750,h=158;
    rounded(x,y,w,h,38,'rgba(255,252,246,.96)',ink);
    ctx.beginPath();ctx.moveTo(x+175,y+h);ctx.lineTo(x+211,y+h+34);ctx.lineTo(x+235,y+h);ctx.closePath();ctx.fillStyle='rgba(255,252,246,.96)';ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();
    textBlock(text,x+w/2,y+43,w-90,43,51,2,ink,'center');
  }
  function drawActors(scene,index,images){
    const left=scene.side==='left', y=index===0?865:835, sizeA=315, sizeB=270;
    const aX=left?62:520,bX=left?365:787;
    if(images.maruni)ctx.drawImage(images.maruni,aX,y,sizeA,sizeA);
    if(images.ruru)ctx.drawImage(images.ruru,bX,y+44,sizeB,sizeB);
  }
  function pillCaption(text,y){
    rounded(55,y,970,98,46,'rgba(255,252,246,.94)','#c8b69b');
    textBlock(text,540,y+27,900,36,46,1,ink,'center');
  }
  async function draw(index,guard=()=>true){
    const scene=project.scenes[index];
    if(!scene.photo)throw Error((index===0?'썸네일':index+'컷')+'에 실제 현장 사진을 넣어 주세요.');
    const a=catalog.find(z=>z.id===scene.maruni),b=catalog.find(z=>z.id===scene.ruru);
    // 한 번에 필요한 이미지 읽기. 이후 프레임은 동기적으로 그려 Safari에서 컷 전환이 섞이지 않게 한다.
    const [im,logo,maruni,ruru]=await Promise.all([
      photoImage(scene.photo),
      index===0?assetImage('brand/logo-black.svg'):Promise.resolve(null),
      a?assetImage(a.path):Promise.resolve(null),
      b?assetImage(b.path):Promise.resolve(null),
      window.MaruniStoryRender.fonts()
    ]);
    if(!guard())return false;
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#e6e3dc';ctx.fillRect(0,0,W,H);
    photoCover(im,scene);
    if(index===0){
      const gradient=ctx.createLinearGradient(0,0,0,890);
      gradient.addColorStop(0,'rgba(255,252,246,.89)');gradient.addColorStop(.6,'rgba(255,252,246,.45)');gradient.addColorStop(1,'rgba(255,252,246,0)');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,W,900);
      ctx.drawImage(logo,55,50,235,85);
      rounded(544,63,480,74,37,green,null);
      textBlock(project.series,784,82,420,31,43,1,'#fffaf0','center');
      rounded(50,240,980,365,34,'rgba(255,252,246,.88)',null);
      textBlock(scene.title,88,289,904,72,100,2,ink);
      rounded(80,543,850,74,35,bronze,null);
      textBlock(project.product,505,561,780,34,46,1,'#fffdf7','center');
    }else{
      rounded(0,0,W,285,0,'rgba(255,252,246,.84)',null);
      textBlock(project.series,52,49,600,30,42,1,ink);
      textBlock(project.product,1020,52,460,28,40,1,bronze,'right');
      rounded(54,142,110,112,24,green,null);
      textBlock(String(index).padStart(2,'0'),109,169,100,54,70,1,'#fffdf6','center');
      textBlock(scene.title,185,152,820,62,76,2,ink);
      bubble(scene.bubble);
    }
    drawActors(scene,index,{maruni,ruru});
    pillCaption(scene.foot,1204);
    return true;
  }
  function queuePaint(){
    if(paintFrame||painting||busy)return;
    paintFrame=requestAnimationFrame(async()=>{
      paintFrame=0;
      if(busy||!root.open)return;
      painting=true;
      const token=drawToken,index=active;
      try{
        if(!project.scenes[index].photo){
          ctx.setTransform(1,0,0,1,0,0);
          ctx.fillStyle='#e9e5dd';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.fillStyle='#34251b';ctx.font='22px sans-serif';ctx.fillText((index===0?'썸네일':index+'컷')+' 현장 사진을 선택하세요',35,330);
        }else await draw(index,()=>!busy&&token===drawToken&&index===active);
      }catch(e){if(token===drawToken)status(e.message,true);}
      finally{painting=false;if(token!==drawToken&&!busy)queuePaint();}
    });
  }
  function preview(){drawToken++;queuePaint();}
  function fields(){
    q('#ml-name').value=project.name;
    q('#ml-product').value=project.product;
    q('#ml-series').value=project.series;
    q('#ml-field').value=project.field||'벽장재';
    q('#ml-region').value=project.region||'';
    q('#ml-spec').value=project.spec||'';
    const s=current();
    q('#ml-title').value=s.title;q('#ml-bubble').value=s.bubble;
    q('#ml-foot').value=s.foot;q('#ml-side').value=s.side;
    q('#ml-photo-y').value=s.focusY===undefined?50:s.focusY;
    q('#ml-photo').value='';
    q('#ml-bubble-wrap').classList.toggle('ml-hidden',active===0);
    q('#ml-maruni').value=s.maruni||'';q('#ml-ruru').value=s.ruru||'';
    q('#ml-tabs').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(active===i)));
  }
  function filename(s){return String(s||'현장이야기').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').slice(0,42)||'현장이야기';}
  function png(){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG 변환에 실패했습니다.')),'image/png'));}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
  async function makePng(i){canvas.width=W;canvas.height=H;await draw(i);return png();}
  async function withBusy(fn){
    if(busy)return;busy=true;
    q('#ml-export-one').disabled=q('#ml-export-all').disabled=q('#ml-share').disabled=true;
    clearTimeout(saveTimer);
    try{await save();await fn();status('파일 생성 완료. 저장 위치를 확인해 주세요.');}
    catch(e){status(e.message,true);}
    finally{busy=false;canvas.width=540;canvas.height=675;q('#ml-export-one').disabled=q('#ml-export-all').disabled=q('#ml-share').disabled=false;preview();}
  }
  function caption(){
    const s=project.scenes;
    const region=String(project.region||'').trim(), field=String(project.field||'').trim(), product=String(project.product||'').trim(), spec=String(project.spec||'').trim();
    const brand=product.split(/\s+/)[0]||'', model=product.replace(/\s/g,'');
    const tags=['#청인마루',brand?'#'+brand:null,model?'#'+model:null,region?'#'+region.replace(/\s/g,''):null,field?'#'+field+'시공':null].filter(Boolean).join(' ');
    return [s[0].title.replace(/\n/g,' '),'','제품 · '+product,spec?'규격 · '+spec:null,region?'현장 · '+region:null,'',
      s[1].foot,s[2].foot,s[3].foot,s[4].foot,'',
      '청인마루는 마루와 벽장재를 전문으로 시공합니다. 자재의 색상과 결, 현장 조건, 마감까지 함께 살펴봅니다.','',
      '시공 상담 · 전시장 방문 예약','카카오채널 · 청인마루','032-210-6268','cheonginmaru.com','',tags].filter(v=>v!==null).join('\n');
  }
  async function copyText(s){
    try{await navigator.clipboard.writeText(s);status('복사했습니다. 내용을 검수한 뒤 게시해 주세요.');}
    catch(e){const ta=document.createElement('textarea');ta.value=s;$.append(ta);ta.select();document.execCommand('copy');ta.remove();status('문구 복사를 시도했습니다.');}
  }
  async function prepareCatalog(){
    const res=await fetch('assets/characters/manifest.json',{cache:'no-store'});
    if(!res.ok)throw Error('공식 캐릭터 목록을 읽을 수 없습니다.');
    const data=await res.json();
    catalog=(data.assets||[]).filter(a=>a.status==='ready'&&a.path&&['maruni','ruru'].includes(a.actor));
    if(!catalog.length)throw Error('등록된 공식 캐릭터가 없습니다. 가짜 그림을 대신 사용하지 않습니다.');
    for(const actor of ['maruni','ruru']){
      const sel=q('#ml-'+actor);sel.replaceChildren(new Option('표시 안 함',''));
      for(const asset of catalog.filter(a=>a.actor===actor))sel.add(new Option(asset.label,asset.id));
    }
  }
  function setupEvents(){
    const fixed=[['#ml-name','name'],['#ml-product','product'],['#ml-series','series'],['#ml-field','field'],['#ml-region','region'],['#ml-spec','spec']];
    for(const [selector,key] of fixed)q(selector).addEventListener(selector==='#ml-field'?'change':'input',e=>{project[key]=e.target.value;changed();});
    const sceneFields=[['#ml-title','title'],['#ml-bubble','bubble'],['#ml-foot','foot'],['#ml-maruni','maruni'],['#ml-ruru','ruru'],['#ml-side','side'],['#ml-photo-y','focusY']];
    for(const [selector,key] of sceneFields)q(selector).addEventListener(selector.includes('photo-y')||selector.includes('ml-side')||selector.includes('ml-maruni')||selector.includes('ml-ruru')?'change':'input',e=>{
      current()[key]=key==='focusY'?Number(e.target.value):e.target.value;changed();
    });
    q('#ml-photo').addEventListener('change',async e=>{
      try{if(e.target.files&&e.target.files[0]){if(current().photo&&!confirm('현재 컷의 사진을 새 사진으로 교체할까요?'))return;const file=addPhotoBlob(e.target.files[0]);await photoImage(file);current().photo=file;current().photoId=makeId();changed();}}
      catch(err){status(err.message,true);}
    });
    q('#ml-copy-photo-next').addEventListener('click',()=>{if(!current().photo){status('현재 사진을 먼저 추가해 주세요.',true);return;}const next=(active+1)%COUNT;if(project.scenes[next].photo&&!confirm('다음 컷의 기존 사진을 교체할까요?'))return;project.scenes[next].photo=current().photo;project.scenes[next].photoId=current().photoId;changed();status((next===0?'썸네일':next+'컷')+'에 사진을 복사했습니다.');});
    q('#ml-copy-photo-all').addEventListener('click',()=>{if(!current().photo){status('현재 사진을 먼저 추가해 주세요.',true);return;}if(!confirm('현재 사진을 썸네일과 본편 4장에 모두 적용할까요? 기존 사진도 바뀝니다.'))return;for(const item of project.scenes){item.photo=current().photo;item.photoId=current().photoId;}changed();status('5장에 같은 사진을 적용했습니다.');});
    q('#ml-tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-cut]');if(!b)return;active=Number(b.dataset.cut);fields();preview();});
    q('#ml-save').addEventListener('click',()=>save().catch(()=>{}));
    q('#ml-new').addEventListener('click',async()=>{try{await save();project=makeProject();persistedPhotos=new Set();active=0;fields();await save();preview();}catch(e){status(e.message,true);}});
    q('#ml-open').addEventListener('click',()=>openProject(q('#ml-projects').value).catch(e=>status(e.message,true)));
    q('#ml-export-one').addEventListener('click',()=>withBusy(async()=>{
      const b=await makePng(active),n=active===0?'00_썸네일':String(active).padStart(2,'0')+'_컷';
      download(b,filename(project.name)+'_'+n+'_1080x1350.png');
    }));
    q('#ml-export-all').addEventListener('click',()=>withBusy(async()=>{
      const entries=Object.create(null);
      for(let i=0;i<COUNT;i++){
        status((i===0?'썸네일':i+'컷')+' 생성 중…');
        const b=await makePng(i);
        entries[(i===0?'00_썸네일':String(i).padStart(2,'0')+'_컷')+'.png']=[new Uint8Array(await b.arrayBuffer()),{level:0}];
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      entries['인스타_캡션.txt']=[new TextEncoder().encode(caption()),{level:0}];
      const blob=await new Promise((resolve,reject)=>fflate.zip(entries,(e,v)=>e?reject(e):resolve(new Blob([v],{type:'application/zip'}))));
      download(blob,filename(project.name)+'_썸네일_4컷.zip');
    }));
    q('#ml-share').addEventListener('click',()=>withBusy(async()=>{
      const b=await makePng(active),f=new File([b],filename(project.name)+'_'+active+'.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[f]})&&navigator.share){
        await navigator.share({files:[f],title:project.name});
        status('공유 화면을 열었습니다. 사진 앱 저장 여부는 직접 확인해 주세요.');
      }else download(b,f.name);
    }));
    q('#ml-copy-caption').addEventListener('click',()=>copyText(caption()));
    q('#ml-copy-comment').addEventListener('click',()=>copyText((project.product||'이 마감재')+'을 어느 공간에 적용해 보고 싶으신가요?'));
  }
  async function init(){
    for(let i=0;i<COUNT;i++){
      const b=document.createElement('button');b.type='button';b.dataset.cut=i;
      b.textContent=i===0?'표지':i+'컷';q('#ml-tabs').append(b);
    }
    setupEvents();
    try {
      await prepareCatalog();
      const projects=await listProjects();
      if(projects.length){await openProject(projects[0].id);}
      else await save();
      fields();await refreshProjects();preview();
      status('마루니·루루 4컷 고정 포맷 준비 완료. 사진과 문구만 바꾸세요.');
    } catch(e){status('편집기를 준비하지 못했습니다: '+e.message,true);}
  }
  init();
})();