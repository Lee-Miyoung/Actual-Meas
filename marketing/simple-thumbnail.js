/* Floor sample book from the actual site photo, with overview and posting pack. */
(function(){
'use strict';let mounted=false;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function postingPack(v){
 const facts=[v.location,v.product,v.spec,v.structure].filter(Boolean).join(' · ');
 const subject=v.product||'마루';
 const intro=v.location?`${v.location}의 마루 시공 기록입니다.`:'청인마루의 실제 마루 시공 기록입니다.';
 const body=`${intro}\n\n공간 전체의 분위기와 가까이서 보이는 마루의 결을 함께 담았습니다. 사진 속 색감은 채광과 화면에 따라 다르게 보일 수 있으니, 제품 선택 전 실제 샘플도 함께 확인해 주세요.\n\n${facts}${facts?'\n\n':''}시공 상담은 지역·평수·희망 제품과 현장 사진을 보내주세요.\n\n공간의 위로가 되다, 청인마루`;
 return {thumbnailTitle:v.title||'마루가 완성한 공간',postTitle:[v.location,subject+' 시공 기록','청인마루'].filter(Boolean).join(' | '),instagramCaption:body,youtubeDescription:body,pinnedComment:`영상 속 마루가 궁금하신가요?${v.product?' 시공 제품은 '+v.product+'입니다.':''} 상담은 지역·평수·희망 제품을 남겨주세요. 현장 조건을 확인해 안내드리겠습니다.`,hashtags:['#청인마루','#마루시공','#시공사례',v.product?'#'+v.product.replace(/[^가-힣a-zA-Z0-9]/g,''):''].filter(Boolean).join(' ')};
}
window.CheonginPostingPack={create:postingPack};
function sampleCrop(width,height,w,h,start=.55){
 const top=height*Math.max(.1,Math.min(.9,Number(start)||.55)),available=height-top,z=Math.max(w/width,h/available),sw=w/z,sh=h/z;
 return {sx:(width-sw)/2,sy:top+(available-sh)/2,sw,sh};
}
window.CheonginSampleCrop=sampleCrop;
async function drawSample(g,image,v,h,wide,vertical,start){
 const m=wide?48:64,top=vertical?190:48,bottom=vertical?260:48,gap=28;
 g.fillStyle='#F4F0E8';g.fillRect(0,0,1080,h);
 await Promise.all([document.fonts.load('400 58px "Studio Serif"',v.title+v.product),document.fonts.load('400 28px "Studio Sans"',v.spec+v.location)]);
 const mark=await loadImage('brand/wordmark-forest.svg');try{g.drawImage(mark,m,top,190,190*mark.height/mark.width);}finally{mark.src='';}
 function text(value,x,y,w,size,lines=1,serif=false){if(!value)return 0;const font=serif?'Studio Serif':'Studio Sans',r=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:serif?34:22,maxLines:lines,leading:1.35,measure:(str,n)=>{g.font=`400 ${n}px "${font}"`;return g.measureText(str).width;}});g.font=`400 ${r.size}px "${font}"`;g.textBaseline='top';g.fillStyle='#303B32';r.lines.forEach((line,i)=>g.fillText(line,x,y+i*r.lineHeight));return r.lines.length*r.lineHeight;}
 const photoY=top+84,hero={x:m,y:photoY,w:wide?590:1080-2*m,h:wide?h-photoY-bottom:Math.min(720,(h-photoY-bottom)*.60)};
 const crop=sampleCrop(image.width,image.height,hero.w,hero.h,start);g.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,hero.x,hero.y,hero.w,hero.h);
 const ix=wide?hero.x+hero.w+gap:m,iy=wide?photoY:hero.y+hero.h+gap,iw=wide?1080-m-ix:Math.round((1080-2*m)*.58);
 let yy=iy;yy+=text(v.title||'이 나뭇결, 집에 깔리면',ix,yy,iw,wide?34:54,2,true)+22;
 yy+=text(v.product,ix,yy,iw,wide?24:32,2)+10;
 yy+=text([v.spec,v.structure].filter(Boolean).join(' · '),ix,yy,iw,24,2)+12;
 text(v.location,ix,yy,iw,23);
 const box=wide?{x:ix,y:h-bottom-118,w:iw,h:90}:{x:m+iw+gap,y:iy,w:1080-m-(m+iw+gap),h:Math.max(90,Math.min(250,h-bottom-iy-32))};
 const z=Math.min(box.w/image.width,box.h/image.height),dw=image.width*z,dh=image.height*z,dx=box.x+(box.w-dw)/2,dy=box.y;
 g.drawImage(image,dx,dy,dw,dh);g.strokeStyle='#F4F0E8';g.lineWidth=2;g.strokeRect(dx+crop.sx*z,dy+crop.sy*z,crop.sw*z,crop.sh*z);
 text('같은 현장의 전체 모습',box.x,box.y+box.h+8,box.w,22);
 return {crop,hero,overview:box};
}
function mount(){
 if(mounted)return;const grid=document.querySelector('.simple-input-grid');if(!grid||!state?.photos)return;mounted=true;
 const card=el('details',undefined,'simple-thumbnail-card');card.open=true;const sum=el('summary');sum.append(el('span','썸네일 · 자동 미리보기'),el('small','사진을 넣으면 바로 표시됩니다'));card.append(sum);
 const body=el('div',undefined,'simple-thumbnail-body'),fields=el('div',undefined,'simple-thumbnail-selects');
 function field(label,input){const l=el('label',label);l.append(input);fields.append(l);return input;}
 const photo=field('표지 사진',el('select')),layout=field('썸네일 포맷',el('select')),ratio=field('출력 비율',el('select'));
 for(const [k,v]of [['sample','기본 · 마루 견본집'],['space','공간 화보 · 좋은 전체 사진용'],['light','B. 빛과 여백 · 위쪽 제목'],['material','C. 소재 기록 · 제품 중심']])layout.add(new Option(v,k));
 for(const [k,v]of [['portrait','인스타 · 4:5'],['vertical','릴스·쇼츠 · 9:16'],['landscape','유튜브 · 16:9']])ratio.add(new Option(v,k));
 const floor=field('바닥 시작 높이 · 공구·벽이 빠지도록 조절',el('input'));floor.type='range';floor.min='10';floor.max='90';floor.step='1';floor.value='55';floor.setAttribute('aria-label','견본으로 확대할 바닥 시작 높이');
 const title=el('textarea');title.rows=2;title.maxLength=48;title.id='thumbnail-editorial-title';const titleLabel=el('label','썸네일 제목 · 짧게 두 줄까지');titleLabel.append(title);
 const actions=el('div',undefined,'simple-actions'),preview=el('button','다시 그리기'),save=el('button','썸네일 PNG 저장'),bundle=el('button','썸네일 + 게시 문구 ZIP','primary');for(const b of [preview,save,bundle])b.type='button';actions.append(save,bundle);preview.hidden=true;
 const view=el('div',undefined,'simple-thumbnail-preview');view.append(el('p','공사 사진에서도 바닥이 잘 나온 부분을 견본으로 크게 보여줍니다.','simple-help'));
 const packBox=el('div',undefined,'posting-pack');packBox.append(el('h3','게시할 문구 · 각 항목 수정 후 복사'));
 const areas={};for(const [key,label]of [['thumbnailTitle','썸네일 제목'],['postTitle','게시물·영상 제목'],['instagramCaption','인스타 캡션'],['youtubeDescription','유튜브 설명글'],['pinnedComment','고정댓글'],['hashtags','해시태그']]){const l=el('label',label),a=el('textarea');a.rows=key.includes('Caption')||key.includes('Description')?6:2;a.setAttribute('aria-label',label);const copy=el('button','복사');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(a.value);toast('복사했습니다.');}catch{a.focus();a.select();toast('선택한 문구를 복사해 주세요.');}};l.append(a,copy);packBox.append(l);areas[key]=a;a.onchange=()=>{state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();};}
 const prepare=el('button','현재 사진·제품으로 게시 문구 준비');prepare.type='button';
 body.append(fields,titleLabel,el('p','견본집은 같은 사진의 바닥 부분을 확대하고 전체 모습을 작게 연결합니다. 바닥 시작 높이를 조절해 벽·공구를 피하세요. 사진을 새로 생성하지 않습니다.','simple-help'),actions,prepare,packBox);card.append(body);grid.prepend(card);
 const deskPreview=document.querySelector('.desk-preview'),tabs=el('div',undefined,'thumbnail-live-tabs'),thumbTab=el('button','썸네일'),contentTab=el('button','본문 콘텐츠'),livePane=el('section',undefined,'thumbnail-live-pane'),liveStatus=el('p','사진을 불러오면 썸네일이 자동으로 표시됩니다.','thumbnail-live-status');
 thumbTab.type=contentTab.type='button';tabs.setAttribute('aria-label','미리보기 대상');livePane.setAttribute('aria-label','자동 썸네일 미리보기');liveStatus.setAttribute('role','status');view.setAttribute('aria-busy','false');tabs.append(thumbTab,contentTab);livePane.append(liveStatus,view);
 function showThumbnail(active=true){if(!deskPreview)return;deskPreview.classList.toggle('thumbnail-mode',active);thumbTab.setAttribute('aria-pressed',String(active));contentTab.setAttribute('aria-pressed',String(!active));}
 thumbTab.onclick=()=>showThumbnail();contentTab.onclick=()=>showThumbnail(false);
 if(deskPreview){deskPreview.prepend(tabs,livePane);showThumbnail();}else body.prepend(livePane);
 let projectKey='',photoKey='',canvas=null,revision=0,autoTimer=null,autoBusy=false,autoDirty=false,exporting=false,lastKey='',lastSource=null,lastPhoto=null;
 function values(){const p=typeof selectedProduct==='function'?selectedProduct():null,m=state.manualOverlay||{};return {title:title.value.trim(),location:m.location||state.region||'',product:m.product||(p?[p.brand,p.model,p.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):''),spec:m.spec||p?.size||'',structure:m.structure||state.productStructure||''};}
 function readPack(){return Object.fromEntries(Object.entries(areas).map(([k,a])=>[k,a.value]));}
 function preparePack(){const pack=postingPack(values());for(const [k,a]of Object.entries(areas))a.value=pack[k]||'';state.thumbnailPosting??={};state.thumbnailPosting.pack=pack;persist();}
 prepare.onclick=preparePack;
 areas.thumbnailTitle.oninput=()=>{title.value=areas.thumbnailTitle.value;remember();state.thumbnailPosting.pack=readPack();persist();showThumbnail();scheduleAuto();};
 function remember(){state.thumbnailPosting={...state.thumbnailPosting,photoId:photo.value,layout:layout.value,ratio:ratio.value,title:title.value,floorStart:Number(floor.value)/100,sampleVersion:1};persist();}
 function changed(){remember();showThumbnail();scheduleAuto();}
 for(const input of [photo,layout,ratio,title,floor])input.addEventListener(input.tagName==='SELECT'?'change':'input',changed);
 function inputKey(){const p=state.photos.find(p=>p.id===photo.value);return JSON.stringify([state.projectId,photo.value,layout.value,ratio.value,Number(floor.value),values(),p?.adjust,state.signaturePhotos?.[p?.id]]);}
 function scheduleAuto(){autoDirty=true;revision++;clearTimeout(autoTimer);autoTimer=setTimeout(pumpAuto,180);}
 async function pumpAuto(){
  if(autoBusy||exporting)return;if(!autoDirty)return;autoDirty=false;
  if(!state.photos.some(p=>p.id===photo.value)){if(canvas){releaseCanvas(canvas);canvas=null;}view.replaceChildren(el('p','사진을 불러오면 여기에서 썸네일을 바로 볼 수 있어요.','simple-help'));liveStatus.textContent='사진을 먼저 불러오세요.';return;}
  autoBusy=true;const version=revision,key=inputKey();view.setAttribute('aria-busy','true');liveStatus.textContent='썸네일을 자동으로 갱신하고 있어요…';
  try{const c=await draw({previewOnly:true});if(version!==revision||key!==inputKey()){releaseCanvas(c);autoDirty=true;}else{if(canvas)releaseCanvas(canvas);canvas=c;view.replaceChildren(c);liveStatus.textContent='자동 미리보기 · 변경 사항이 바로 반영됩니다.';}}
  catch(e){if(version===revision){liveStatus.textContent='미리보기를 만들지 못했습니다. 사진이나 설정을 바꾸면 다시 시도합니다. '+e.message;}}
  finally{autoBusy=false;view.setAttribute('aria-busy','false');if(autoDirty){clearTimeout(autoTimer);autoTimer=setTimeout(pumpAuto,80);}}
 }
 function checkAuto(){const p=state.photos.find(p=>p.id===photo.value),key=inputKey();if(key!==lastKey||p!==lastPhoto||p?.src!==lastSource){lastKey=key;lastPhoto=p;lastSource=p?.src;scheduleAuto();}}
 function refresh(){const key=state.projectId||'current',ids=state.photos.map(p=>p.id).join('|');if(projectKey!==key){projectKey=key;photoKey='';const saved=state.thumbnailPosting||{};title.value=saved.title||state.manualOverlay?.title||'이 나뭇결, 집에 깔리면';layout.value=saved.sampleVersion===1?(saved.layout||'sample'):'sample';floor.value=String(Math.round((saved.floorStart??.55)*100));ratio.value=saved.ratio||'portrait';for(const [k,a]of Object.entries(areas))a.value=saved.pack?.[k]||'';if(canvas){canvas.width=canvas.height=1;canvas=null;}view.replaceChildren(el('p','자동으로 썸네일을 준비합니다.','simple-help'));}if(photoKey!==ids){photoKey=ids;const saved=state.thumbnailPosting?.photoId;photo.replaceChildren(...state.photos.map(p=>new Option(p.name,p.id)));const best=state.photos.find(p=>state.signaturePhotos?.[p.id]?.role==='after')||state.photos.find(p=>!['before','progress','pair'].includes(state.signaturePhotos?.[p.id]?.role))||state.photos[0];photo.value=state.photos.some(p=>p.id===saved)?saved:best?.id||'';showThumbnail();}checkAuto();}
 async function draw({previewOnly=false}={}){
  const p=state.photos.find(p=>p.id===photo.value);if(!p)throw Error('표지 사진을 먼저 선택하세요.');const v=values(),mode=layout.value,floorStart=Number(floor.value)/100,[W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:[1080,1350];const c=el('canvas');const previewScale=previewOnly?Math.min(1,720/Math.max(W,H)):1;c.width=Math.round(W*previewScale);c.height=Math.round(H*previewScale);const g=c.getContext('2d'),s=c.width/1080,h=H/(W/1080),vertical=ratio.value==='vertical',wide=ratio.value==='landscape',m=wide?58:72,safeTop=vertical?220:76,safeBottom=vertical?360:100;
  const im=await photoImage(p),was=original;let image;original=false;try{image=transformed(im,p.adjust,previewOnly?1100:2200);}finally{original=was;}if(image?.then)image=await image;
  if(mode==='sample'){try{g.scale(s,s);const meta=await drawSample(g,image,v,h,wide,vertical,floorStart);c.sampleLayout=meta;c.dataset.template='sample';c.dataset.renderer='cheongin-floor-sample-v1';return c;}finally{releaseCanvas(image);}}
  try{g.scale(s,s);const z=Math.max(1080/image.width,h/image.height),sw=1080/z,sh=h/z,focus=state.signaturePhotos?.[p.id]?.focusY??.55;g.drawImage(image,(image.width-sw)/2,(image.height-sh)*Math.max(0,Math.min(1,focus)),sw,sh,0,0,1080,h);}finally{releaseCanvas(image);}
  await Promise.all([document.fonts.load('400 78px "Studio Serif"',v.title),document.fonts.load('400 30px "Studio Sans"',v.product+v.location+v.spec)]);
  const light=mode==='light',start=light?0:Math.max(0,h-(wide?360:640)),end=light?Math.min(h,wide?460:850):h,gradient=g.createLinearGradient(0,start,0,end);gradient.addColorStop(0,light?'rgba(10,13,9,.64)':'rgba(10,13,9,0)');gradient.addColorStop(1,light?'rgba(10,13,9,0)':'rgba(10,13,9,.68)');g.fillStyle=gradient;g.fillRect(0,start,1080,end-start);
  const mark=await loadImage('brand/wordmark-ivory.svg');try{const mw=208;g.globalAlpha=.92;g.drawImage(mark,m,safeTop,mw,mw*mark.height/mark.width);g.globalAlpha=1;}finally{mark.src='';}
  function text(value,y,size,rows=1,serif=false,alpha=1){if(!value)return 0;const family=serif?'Studio Serif':'Studio Sans',r=CheonginType.layout(value,{width:1080-m*2,fontSize:size,minFontSize:serif?50:25,maxLines:rows,leading:1.3,measure:(str,n)=>{g.font=`400 ${n}px "${family}"`;return g.measureText(str).width;}});g.font=`400 ${r.size}px "${family}"`;g.textBaseline='top';g.fillStyle=`rgba(255,255,255,${alpha})`;g.shadowColor='#0006';g.shadowBlur=4;r.lines.forEach((line,i)=>g.fillText(line,m,y+i*r.lineHeight));g.shadowBlur=0;return r.lines.length*r.lineHeight;}
  const base=light?safeTop+135:h-safeBottom-(wide?175:230);
  if(mode==='material'){text(v.product||v.title,base,wide?49:67,2,true);text([v.spec,v.structure].filter(Boolean).join(' · '),base+(wide?133:180),28,1,false,.88);}else{text(v.title,base,wide?62:78,2,true);text(v.location,base+(wide?151:210),28,1,false,.88);}
  c.dataset.template=mode;c.dataset.renderer='cheongin-editorial-cover-v3';return c;
 }
 async function render(){return draw();}
 const busyButtons=[preview,save,bundle];async function run(fn){
  if(exporting)return;exporting=true;revision++;const inputs=[photo,layout,ratio,title,floor,areas.thumbnailTitle],saved=inputs.map(el=>({el,disabled:el.disabled}));busyButtons.forEach(b=>b.disabled=true);inputs.forEach(el=>el.disabled=true);
  try{while(autoBusy)await new Promise(resolve=>setTimeout(resolve,25));await fn();}catch(e){toast(e.message);}finally{exporting=false;busyButtons.forEach(b=>b.disabled=false);saved.forEach(({el,disabled})=>el.disabled=disabled);if(autoDirty)pumpAuto();}
 }
 function blobOf(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('이미지 저장에 실패했습니다.')),'image/png'));}
 preview.onclick=()=>run(render);save.onclick=()=>run(async()=>{const c=await render();try{download(await blobOf(c),'청인마루_썸네일.png');}finally{releaseCanvas(c);}});
 bundle.onclick=()=>run(async()=>{const defaults=postingPack(values());for(const [k,a]of Object.entries(areas))if(!a.value.trim())a.value=defaults[k]||'';state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();const pack=readPack(),c=await render(),blob=await blobOf(c);releaseCanvas(c);const labels={thumbnailTitle:'썸네일 제목',postTitle:'게시물·영상 제목',instagramCaption:'인스타 캡션',youtubeDescription:'유튜브 설명글',pinnedComment:'고정댓글',hashtags:'해시태그'};const txt=Object.entries(pack).map(([k,v])=>labels[k]+'\n'+v).join('\n\n────────\n\n');const zipped=fflate.zipSync({'01_썸네일.png':new Uint8Array(await blob.arrayBuffer()),'02_게시문구.txt':fflate.strToU8(txt),'03_게시문구.json':fflate.strToU8(JSON.stringify(pack,null,2))});if(typeof offerPhotoFiles==='function')offerPhotoFiles([{name:'01_썸네일.png',blob}]);download(new Blob([zipped],{type:'application/zip'}),'청인마루_게시세트.zip');});
 const base=window.renderProductionWorkspace;window.renderProductionWorkspace=function(...args){refresh();return base.apply(this,args);};refresh();
 const watch=setInterval(()=>{if(!card.isConnected){clearInterval(watch);clearTimeout(autoTimer);return;}if(!document.hidden)refresh();},650);
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('thumbnail mode',e);}},250);window.addEventListener('marketing:ready',mount);
})();
