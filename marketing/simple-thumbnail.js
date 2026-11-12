/* Floor sample book from the actual site photo, with overview and posting pack. */
(function(){
'use strict';let mounted=false;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function cleanDisplaySpec(value){
 return String(value||'').replace(/\([^)]*(?:box|pcs|박스|개입|입수)[^)]*\)/gi,'').replace(/(?:\d+(?:\.\d+)?\s*)?(?:boxes|box|pcs|박스|개입|입수)\b/gi,'').replace(/[,;/|\s]+$/g,'').replace(/\s*\*\s*/g,' × ').replace(/\s+/g,' ').trim();
}
window.CheonginDisplaySpec=cleanDisplaySpec;
function postingPack(v){
 const kind=CheonginChannelCovers.material(v,v.material);
 const subject={floor:'마루',wall:'벽장재',both:'마루·벽장재'}[kind];
 const facts=[v.location,v.product,v.spec,v.structure||v.kind].filter(Boolean).join(' · ');
 const intro=[v.location,subject+' 시공 기록'].filter(Boolean).join(' ')+'입니다.';
 const observation={floor:'공간 전체에서 보이는 바닥의 색과 가까이에서 보이는 결을 담았습니다.',wall:'벽면을 넓게 본 모습과 가까이에서 보이는 질감을 담았습니다.',both:'벽과 바닥이 만나는 자리와 두 소재의 조화를 담았습니다.'}[kind];
 const body=[intro,observation,facts,'시공 상담은 지역과 시공할 공간의 사진을 보내주세요.','공간의 위로가 되다, 청인마루'].filter(Boolean).join('\n\n');
 return {thumbnailTitle:v.title||CheonginChannelCovers.suggestedTitle('carousel',v,kind,false),postTitle:[v.location,v.product||subject,subject+' 시공 기록'].filter(Boolean).join(' | '),instagramCaption:body,youtubeDescription:body,pinnedComment:`사진 속 ${subject}가 궁금하신가요? ${v.product?'시공 제품은 '+v.product+'입니다. ':''}지역과 현장 사진을 남겨주시면 상담을 도와드리겠습니다.`,hashtags:['#청인마루',...({floor:['#마루시공'],wall:['#벽장재시공'],both:['#마루시공','#벽장재시공']}[kind]),v.product?'#'+v.product.replace(/[^가-힣a-zA-Z0-9]/g,''):''].filter(Boolean).join(' ')};

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
 let yy=iy;yy+=text(v.title||'우리 집에 깔리면, 어떤 느낌일까요?',ix,yy,iw,wide?34:54,2,true)+22;
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
 for(const [k,v]of [['channels','플랫폼별 표지'],['reference','현장 시공형 · 분류와 전후 사진'],['photo70','사진 중심형 · 공사 사진용'],['full','전체 화보형 · 공간 사진용']])layout.add(new Option(v,k));
 for(const [k,v]of [['portrait','인스타 · 4:5'],['vertical','릴스·쇼츠 · 9:16'],['landscape','유튜브 · 16:9']])ratio.add(new Option(v,k));
 const covers=window.CheonginChannelCovers;
 const channel=field('게시 플랫폼',el('select'));
 for(const [key,label] of Object.entries(covers.formats))channel.add(new Option(label,key));
 const material=field('시공 분야',el('select'));
 for(const [key,label] of [['auto','제품 정보로 선택'],['floor','마루'],['wall','벽장재'],['both','마루 + 벽장재']])material.add(new Option(label,key));
 const detail=field('소재 확대 사진 · 선택',el('select'));
 let titles={},legacyTitle='';
 const housing=field('현장 분류',el('select'));for(const v of ['','단독주택','아파트','상업공간','기타'])housing.add(new Option(v||'분류 선택',v));
 const beforePhoto=field('시공 전 사진 · 선택',el('select')),afterPhoto=field('시공 후 사진 · 선택',el('select'));
 const pairNote=el('p','전·후 사진을 모두 선택하면 하단에 비교 사진이 나타납니다. 한 장만 선택하면 표시하지 않습니다.','simple-help');fields.append(pairNote);
 const floor=field('바닥 시작 높이 · 공구·벽이 빠지도록 조절',el('input'));floor.type='range';floor.min='10';floor.max='90';floor.step='1';floor.value='55';floor.setAttribute('aria-label','견본으로 확대할 바닥 시작 높이');
 const title=el('textarea');title.rows=2;title.maxLength=48;title.id='thumbnail-editorial-title';const titleLabel=el('label','썸네일 제목 · 짧게 두 줄까지');titleLabel.append(title);
 const actions=el('div',undefined,'simple-actions'),preview=el('button','다시 그리기'),save=el('button','썸네일 PNG 저장'),bundle=el('button','썸네일 + 게시 문구 ZIP','primary');for(const b of [preview,save,bundle,allCovers])b.type='button';const allCovers=el('button','플랫폼 표지 6종 ZIP','primary'); allCovers.type='button';actions.append(save,allCovers,bundle);preview.hidden=true;
 const view=el('div',undefined,'simple-thumbnail-preview');view.append(el('p','공사 사진에서도 바닥이 잘 나온 부분을 견본으로 크게 보여줍니다.','simple-help'));
 const packBox=el('div',undefined,'posting-pack');packBox.append(el('h3','게시할 문구 · 각 항목 수정 후 복사'));
 const areas={};for(const [key,label]of [['thumbnailTitle','썸네일 제목'],['postTitle','게시물·영상 제목'],['instagramCaption','인스타 캡션'],['youtubeDescription','유튜브 설명글'],['pinnedComment','고정댓글'],['hashtags','해시태그']]){const l=el('label',label),a=el('textarea');a.rows=key.includes('Caption')||key.includes('Description')?6:2;a.setAttribute('aria-label',label);const copy=el('button','복사');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(a.value);toast('복사했습니다.');}catch{a.focus();a.select();toast('선택한 문구를 복사해 주세요.');}};l.append(a,copy);packBox.append(l);areas[key]=a;a.onchange=()=>{state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();};}
 const prepare=el('button','현재 사진·제품으로 게시 문구 준비');prepare.type='button';
 body.append(fields,titleLabel,el('p','플랫폼을 선택하면 해당 표지를 미리 볼 수 있습니다. 네이버 블로그에는 소재 확대 사진을, 유튜브·쇼츠에는 시공 전후 사진을 연결할 수 있습니다.','simple-help'),actions,prepare,packBox);card.append(body);grid.prepend(card);
 const deskPreview=document.querySelector('.desk-preview'),tabs=el('div',undefined,'thumbnail-live-tabs'),thumbTab=el('button','썸네일'),contentTab=el('button','본문 콘텐츠'),livePane=el('section',undefined,'thumbnail-live-pane'),liveStatus=el('p','사진을 불러오면 썸네일이 자동으로 표시됩니다.','thumbnail-live-status');
 thumbTab.type=contentTab.type='button';tabs.setAttribute('aria-label','미리보기 대상');livePane.setAttribute('aria-label','자동 썸네일 미리보기');liveStatus.setAttribute('role','status');view.setAttribute('aria-busy','false');tabs.append(thumbTab,contentTab);livePane.append(liveStatus,view);
 function showThumbnail(active=true){if(!deskPreview)return;deskPreview.classList.toggle('thumbnail-mode',active);thumbTab.setAttribute('aria-pressed',String(active));contentTab.setAttribute('aria-pressed',String(!active));}
 thumbTab.onclick=()=>showThumbnail();contentTab.onclick=()=>showThumbnail(false);
 if(deskPreview){deskPreview.prepend(tabs,livePane);showThumbnail();}else body.prepend(livePane);
 let projectKey='',photoKey='',canvas=null,revision=0,autoTimer=null,autoBusy=false,autoDirty=false,exporting=false,lastKey='',lastSource=null,lastPhoto=null,lastPairSources=[];
 function values(){if(layout.value==='channels')return {...covers.getProjectInfo(photo.value),title:title.value.trim()||state.manualOverlay?.title||'',material:material.value};const p=typeof selectedProduct==='function'?selectedProduct():null,m=state.manualOverlay||{};return {title:title.value.trim(),location:m.location||state.marketingSite||[state.region,state.space].filter(Boolean).join(' · ')||state.title||'',product:m.product||(p?[p.brand,p.model,p.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):''),spec:cleanDisplaySpec(m.spec||p?.size||''),structure:m.structure||state.productStructure||'',kind:p?.category||''};}
 function readPack(){return Object.fromEntries(Object.entries(areas).map(([k,a])=>[k,a.value]));}
 function preparePack(){const pack=postingPack(values());for(const [k,a]of Object.entries(areas))a.value=pack[k]||'';state.thumbnailPosting??={};state.thumbnailPosting.pack=pack;persist();}
 prepare.onclick=preparePack;
 areas.thumbnailTitle.oninput=()=>{title.value=areas.thumbnailTitle.value;if(layout.value==='channels')titles[channel.value]=title.value;else legacyTitle=title.value;remember();state.thumbnailPosting.pack=readPack();persist();showThumbnail();scheduleAuto();};
 function remember(){state.thumbnailPosting={...state.thumbnailPosting,photoId:photo.value,layout:layout.value,ratio:ratio.value,title:legacyTitle,titles:{...titles},channel:channel.value,material:material.value,detailId:detail.value,housing:housing.value,beforeId:beforePhoto.value,afterId:afterPhoto.value,referenceVersion:1,floorStart:Number(floor.value)/100,sampleVersion:1};persist();}
 function showFields(){
  const channels=layout.value==='channels';
  channel.parentElement.hidden=material.parentElement.hidden=allCovers.hidden=!channels;
  ratio.parentElement.hidden=channels;
  floor.parentElement.hidden=layout.value!=='photo70';
  detail.parentElement.hidden=!channels||!['naverCover','shorts'].includes(channel.value);
  const showPair=layout.value==='reference'||(channels&&['shorts','youtubeCover'].includes(channel.value));
  beforePhoto.parentElement.hidden=afterPhoto.parentElement.hidden=pairNote.hidden=!showPair;
  if(channels){
   pairNote.textContent='서로 다른 전·후 사진을 선택하면 두 사진을 비교하는 표지로 바뀝니다.';
   const info=covers.getProjectInfo(photo.value);
   title.placeholder=info.title||covers.suggestedTitle(channel.value,info,covers.material(info,material.value),Boolean(beforePhoto.value&&afterPhoto.value&&beforePhoto.value!==afterPhoto.value));
   titleLabel.firstChild.nodeValue='이 플랫폼의 표지 제목 · 비워두면 자동';
  }else{
   pairNote.textContent='전·후 사진을 모두 선택하면 하단에 비교 사진이 나타납니다.';
   titleLabel.firstChild.nodeValue='썸네일 제목 · 짧게 두 줄까지';
   title.placeholder='';
  }
 }
 function changed(event){
  if(event.target===layout||event.target===channel)title.value=layout.value==='channels'?(titles[channel.value]||''):legacyTitle;
  if(event.target===title){if(layout.value==='channels')titles[channel.value]=title.value;else legacyTitle=title.value;}
  remember();showFields();showThumbnail();scheduleAuto();
 }
 for(const input of [photo,layout,ratio,channel,material,detail,title,floor,housing,beforePhoto,afterPhoto])input.addEventListener(input.tagName==='SELECT'?'change':'input',changed);
 function inputKey(){const p=state.photos.find(p=>p.id===photo.value);return JSON.stringify([state.projectId,photo.value,layout.value,ratio.value,channel.value,material.value,detail.value,Number(floor.value),housing.value,beforePhoto.value,afterPhoto.value,...[beforePhoto.value,afterPhoto.value,detail.value].map(id=>{const p=state.photos.find(p=>p.id===id);return [p?.id,p?.adjust,state.signaturePhotos?.[id]?.focusX,state.signaturePhotos?.[id]?.focusY,state.signaturePhotos?.[id]?.focus];}),values(),p?.adjust,state.signaturePhotos?.[p?.id]]);}
 function scheduleAuto(){autoDirty=true;revision++;clearTimeout(autoTimer);autoTimer=setTimeout(pumpAuto,180);}
 async function pumpAuto(){
  if(autoBusy||exporting)return;if(!autoDirty)return;autoDirty=false;
  if(!state.photos.some(p=>p.id===photo.value)){if(canvas){releaseCanvas(canvas);canvas=null;}view.replaceChildren(el('p','사진을 불러오면 여기에서 썸네일을 바로 볼 수 있어요.','simple-help'));liveStatus.textContent='사진을 먼저 불러오세요.';return;}
  autoBusy=true;const version=revision,key=inputKey();view.setAttribute('aria-busy','true');liveStatus.textContent='썸네일을 자동으로 갱신하고 있어요…';
  try{const c=await draw({previewOnly:true});if(version!==revision||key!==inputKey()){releaseCanvas(c);autoDirty=true;}else{if(canvas)releaseCanvas(canvas);canvas=c;view.replaceChildren(c);liveStatus.textContent='자동 미리보기 · 변경 사항이 바로 반영됩니다.';}}
  catch(e){if(version===revision){liveStatus.textContent='미리보기를 만들지 못했습니다. 사진이나 설정을 바꾸면 다시 시도합니다. '+e.message;}}
  finally{autoBusy=false;view.setAttribute('aria-busy','false');if(autoDirty){clearTimeout(autoTimer);autoTimer=setTimeout(pumpAuto,80);}}
 }
 function checkAuto(){const p=state.photos.find(p=>p.id===photo.value),key=inputKey(),sources=[beforePhoto.value,afterPhoto.value,detail.value].map(id=>state.photos.find(p=>p.id===id)?.src);if(key!==lastKey||p!==lastPhoto||p?.src!==lastSource||sources.some((src,i)=>src!==lastPairSources[i])){lastKey=key;lastPhoto=p;lastSource=p?.src;lastPairSources=sources;scheduleAuto();}}
 function refresh(){const key=state.projectId||'current',ids=state.photos.map(p=>p.id).join('|');if(projectKey!==key){projectKey=key;photoKey='';const saved=state.thumbnailPosting||{};legacyTitle=saved.title||state.manualOverlay?.title||'이 나뭇결, 집에 깔리면';titles={...saved.titles};layout.value=['channels','reference','photo70','full'].includes(saved.layout)?saved.layout:'channels';channel.value=covers.formats[saved.channel]?saved.channel:'carousel';material.value=saved.material||'auto';title.value=layout.value==='channels'?(titles[channel.value]||''):legacyTitle;housing.value=saved.housing||'';floor.value=String(Math.round((saved.floorStart??.55)*100));ratio.value=saved.ratio||'portrait';for(const [k,a]of Object.entries(areas))a.value=saved.pack?.[k]||'';if(canvas){canvas.width=canvas.height=1;canvas=null;}view.replaceChildren(el('p','자동으로 썸네일을 준비합니다.','simple-help'));}if(photoKey!==ids){photoKey=ids;const saved=state.thumbnailPosting?.photoId;for(const [select,label,key]of [[beforePhoto,'시공 전 사진 없음','beforeId'],[afterPhoto,'시공 후 사진 없음','afterId'],[detail,'표지 사진에서 확대','detailId']]){const was=state.thumbnailPosting?.[key]||'';select.replaceChildren(new Option(label,''),...state.photos.map(p=>new Option(p.name,p.id)));select.value=state.photos.some(p=>p.id===was)?was:'';}photo.replaceChildren(...state.photos.map(p=>new Option(p.name,p.id)));const best=state.photos.find(p=>state.signaturePhotos?.[p.id]?.role==='after')||state.photos.find(p=>!['before','progress','pair'].includes(state.signaturePhotos?.[p.id]?.role))||state.photos[0];photo.value=state.photos.some(p=>p.id===saved)?saved:best?.id||'';showThumbnail();}showFields();checkAuto();}
 async function drawReference({previewOnly=false}={}){
  const selected=state.photos.find(p=>p.id===photo.value);if(!selected)throw Error('배경 사진을 먼저 선택하세요.');
  const v=values(),category=housing.value,before=state.photos.find(p=>p.id===beforePhoto.value),after=state.photos.find(p=>p.id===afterPhoto.value),pair=!!(before&&after&&before.id!==after.id);
  const [W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:[1080,1350],c=el('canvas'),q=previewOnly?Math.min(1,720/Math.max(W,H)):1;c.width=Math.round(W*q);c.height=Math.round(H*q);
  const g=c.getContext('2d'),scale=c.width/1080,h=H/(W/1080),wide=ratio.value==='landscape',vertical=ratio.value==='vertical',top=vertical?190:32,bottom=vertical?280:48,m=56;
  g.scale(scale,scale);c.typeLayout=[];c.photoLayout=[];
  const titleText=title.value.trim()||[category,'마루 시공'].filter(Boolean).join(' ');
  await Promise.all([document.fonts.load('400 68px "Studio Serif"',titleText+v.product),document.fonts.load('400 28px "Studio Sans"',category+v.location+v.spec)]);
  async function picture(p,x,y,w,hh){const im=await photoImage(p),was=original;let image;original=false;try{image=transformed(im,p.adjust,previewOnly?1100:2200);}finally{original=was;}if(image?.then)image=await image;try{const z=Math.max(w/image.width,hh/image.height),sw=w/z,sh=hh/z,sx=(image.width-sw)/2,sy=(image.height-sh)*Math.max(0,Math.min(1,state.signaturePhotos?.[p.id]?.focusY??.55));g.save();g.beginPath();g.rect(x,y,w,hh);g.clip();g.drawImage(image,sx,sy,sw,sh,x,y,w,hh);g.restore();c.photoLayout.push({id:p.id,x,y,width:w,height:hh});}finally{releaseCanvas(image);}}
  function text(value,x,y,w,size,lines=1,color='#3B281A',serif=false,center=false){if(!value)return;const font=serif?'Studio Serif':'Studio Sans',r=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:size*.76,maxLines:lines,leading:1.2,measure:(s,n)=>{g.font=`400 ${n}px "${font}"`;return g.measureText(s).width;}});g.font=`400 ${r.size}px "${font}"`;g.textBaseline='top';g.fillStyle=color;const shift=center?(size*1.2*lines-r.lines.length*r.lineHeight)/2:0;r.lines.forEach((line,i)=>{const mt=g.measureText(line),xx=center?x+(w-mt.width)/2:x+(mt.actualBoundingBoxLeft||0),yy=y+shift+i*r.lineHeight;g.fillText(line,xx,yy);c.typeLayout.push({source:String(value),x:xx,y:yy,width:mt.width,height:r.lineHeight,size:r.size});});if(r.truncated)c.dataset.textTruncated='true';}
  await picture(selected,0,0,1080,h);
  const wash=g.createLinearGradient(0,top+64,0,top+(wide?340:510));wash.addColorStop(0,'rgba(255,247,230,.1)');wash.addColorStop(.35,'rgba(255,247,230,.85)');wash.addColorStop(.72,'rgba(255,247,230,.74)');wash.addColorStop(1,'rgba(255,247,230,0)');g.fillStyle=wash;g.fillRect(0,top+64,1080,wide?300:450);
  const corner=g.createLinearGradient(0,0,0,top+100);corner.addColorStop(0,'rgba(30,25,18,.3)');corner.addColorStop(1,'rgba(30,25,18,0)');g.fillStyle=corner;g.fillRect(0,0,1080,top+100);
  const logo=await loadImage('brand/logo-ivory.svg');try{g.save();g.globalAlpha=.78;const w=wide?140:166;g.drawImage(logo,m,top+8,w,w*logo.height/logo.width);g.restore();}finally{logo.src='';}
  if(category){const x=1080-m-162,y=top-32,bh=wide?96:156,tip=wide?116:184;g.fillStyle='#362615';g.strokeStyle='#D5AE67';g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+162,y);g.lineTo(x+162,y+bh);g.lineTo(x+81,y+tip);g.lineTo(x,y+bh);g.closePath();g.fill();g.stroke();text(category,x+10,y+(wide?20:54),142,wide?24:28,1,'#F9EEDB',false,true);text('시공사례',x+10,y+(wide?59:94),142,wide?19:23,1,'#E3C89A',false,true);}
  const titleY=top+(wide?104:164),titleH=wide?112:156,productY=titleY+titleH+12,productH=wide?65:92;
  text(titleText,72,titleY,936,wide?48:68,2,'#342416',true,true);
  const gold=g.createLinearGradient(118,0,962,0);gold.addColorStop(0,'#B9833C');gold.addColorStop(.5,'#B17C37');gold.addColorStop(1,'#CCA360');g.fillStyle=gold;g.fillRect(118,productY,844,productH);
  text(v.product||'제품을 선택해 주세요',138,productY+8,804,wide?28:38,2,'#FFFFFF',true,true);
  const specY=productY+productH+14;text([v.structure||v.kind,v.spec].filter(Boolean).join(' · '),94,specY,892,wide?23:29,1,'#3C2B1C',false,true);
  if(v.location)text('현장 · '+v.location,94,specY+(wide?34:45),892,wide?20:26,1,'#3C2B1C',false,true);
  if(pair){const y=h-bottom-(wide?106:254),w=468,hh=wide?106:254;for(const [p,x,label]of [[before,56,'시공 전'],[after,556,'시공 후']]){g.fillStyle='#F9F1E5';g.fillRect(x-4,y-4,w+8,hh+8);await picture(p,x,y,w,hh);g.fillStyle='#5A3C20';g.fillRect(x+14,y-16,120,40);text(label,x+20,y-9,108,23,1,'#FFF8EC',false,true);}text('›',522,y+hh/2-24,32,45,1,'#D6A35D',false,true);}
  c.dataset.renderer='cheongin-reference-site-v1';c.dataset.template='reference';c.dataset.housing=category;c.dataset.comparison=String(pair);return c;
 }
 function channelSettings(){return {...state.thumbnailPosting,photoId:photo.value,titles:{...titles},material:material.value,housing:housing.value,detailId:detail.value,beforeId:beforePhoto.value,afterId:afterPhoto.value};}
 async function draw({previewOnly=false}={}){
  if(layout.value==='channels')return covers.fromProject(channel.value,channelSettings(),previewOnly?{maxEdge:720}:{});
  if(layout.value==='reference')return drawReference({previewOnly});
  const p=state.photos.find(p=>p.id===photo.value);if(!p)throw Error('표지 사진을 먼저 선택하세요.');
  const v=values(),mode=layout.value==='full'?'full':'photo70',floorStart=Number(floor.value)/100;
  const [W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:[1080,1350];
  const c=el('canvas'),previewScale=previewOnly?Math.min(1,720/Math.max(W,H)):1;c.width=Math.round(W*previewScale);c.height=Math.round(H*previewScale);
  const g=c.getContext('2d'),scale=c.width/1080,h=H/(W/1080),wide=ratio.value==='landscape',vertical=ratio.value==='vertical',m=wide?48:64,top=vertical?190:42,bottom=vertical?260:48;
  const kind=v.structure||v.kind||'',onPhoto=mode==='full',ink=onPhoto?'#FFFFFF':'#263C31',muted=onPhoto?'#EEE9DF':'#667667';
  c.typeLayout=[];c.photoLayout=[];g.scale(scale,scale);g.fillStyle='#F4F0E8';g.fillRect(0,0,1080,h);
  const source=await photoImage(p),was=original;let image;original=false;try{image=transformed(source,p.adjust,previewOnly?1100:2200);}finally{original=was;}if(image?.then)image=await image;
  const photoBox=mode==='full'?{x:0,y:0,w:1080,h}:wide?{x:0,y:0,w:620,h}:{x:0,y:0,w:1080,h:Math.round(h*.68)};
  try{
   let sx,sy,sw,sh;
   if(mode==='photo70'){({sx,sy,sw,sh}=sampleCrop(image.width,image.height,photoBox.w,photoBox.h,floorStart));}
   else{const z=Math.max(photoBox.w/image.width,photoBox.h/image.height);sw=photoBox.w/z;sh=photoBox.h/z;sx=(image.width-sw)/2;sy=(image.height-sh)*Math.max(0,Math.min(1,state.signaturePhotos?.[p.id]?.focusY??.55));}
   g.drawImage(image,sx,sy,sw,sh,photoBox.x,photoBox.y,photoBox.w,photoBox.h);c.photoLayout.push({...photoBox,sourceWidth:image.width,sourceHeight:image.height,sx,sy,sw,sh});
  }finally{releaseCanvas(image);}
  if(onPhoto){const start=Math.max(0,h-(wide?320:vertical?690:550)),grad=g.createLinearGradient(0,start,0,h);grad.addColorStop(0,'rgba(20,36,26,0)');grad.addColorStop(.45,'rgba(20,36,26,.38)');grad.addColorStop(1,'rgba(20,36,26,.82)');g.fillStyle=grad;g.fillRect(0,start,1080,h-start);}
  const mark=await loadImage('brand/logo-ivory.svg');try{const w=wide?124:148;g.save();g.globalAlpha=.58;g.drawImage(mark,wide&&mode==='photo70'?32:56,top,w,w*mark.height/mark.width);g.restore();}finally{mark.src='';}
  await Promise.all([document.fonts.load('400 61px "Studio Serif"',v.product+v.title),document.fonts.load('400 44px "Studio Sans"',kind+v.spec+v.location)]);
  const x=wide&&mode==='photo70'?664:m,w=wide&&mode==='photo70'?1080-x-m:1080-m*2;
  const y=mode==='photo70'?(wide?108:photoBox.h+34):h-bottom-(wide?245:360),available=h-bottom-y;
  const rows=[{value:v.title||'우리 집에 어울리는 바닥은?',size:wide?42:62,min:42,lines:2,serif:true,color:ink,gap:20},{value:[kind,v.product].filter(Boolean).join(' · '),size:wide?27:40,min:29,lines:2,serif:true,color:ink,gap:14},{value:v.spec,size:wide?28:36,min:26,lines:2,color:ink,gap:14},{value:v.location?('현장 · '+v.location):'',size:wide?22:25,min:21,lines:2,color:muted,gap:0}].filter(r=>r.value);
  function measure(row,factor=1){const family=row.serif?'Studio Serif':'Studio Sans';return CheonginType.layout(String(row.value),{width:w,fontSize:row.size*factor,minFontSize:Math.min(row.min,row.size*factor),maxLines:row.lines,leading:1.25,measure:(s,n)=>{g.font=`400 ${n}px "${family}"`;return g.measureText(s).width;}});}
  let factor=1,layouts=rows.map(r=>measure(r));const total=()=>layouts.reduce((sum,l,i)=>sum+l.lines.length*l.lineHeight+rows[i].gap*factor,0);
  for(let i=0;i<5&&total()>available;i++){factor*=Math.max(.65,Math.min(.98,available/total()));layouts=rows.map(r=>measure(r,factor));}
  let yy=y;for(let i=0;i<rows.length;i++){const r=rows[i],l=layouts[i];g.font=`400 ${l.size}px "${r.serif?'Studio Serif':'Studio Sans'}"`;g.fillStyle=r.color;g.textBaseline='top';for(const [j,line]of l.lines.entries()){const ty=yy+j*l.lineHeight;const metrics=g.measureText(line),tx=x+(metrics.actualBoundingBoxLeft||0);g.fillText(line,tx,ty);c.typeLayout.push({source:r.value,x,y:ty,width:metrics.width,height:l.lineHeight,size:l.size});}if(l.truncated)c.dataset.textTruncated='true';yy+=l.lines.length*l.lineHeight+r.gap*factor;}
  c.dataset.template=mode;c.dataset.renderer='cheongin-approved-product-cover-v1';return c;
 }
 async function render(){return draw();}
 const busyButtons=[preview,save,bundle,allCovers];async function run(fn){
  if(exporting)return;exporting=true;revision++;const inputs=[photo,layout,ratio,channel,material,detail,title,floor,housing,beforePhoto,afterPhoto,areas.thumbnailTitle],saved=inputs.map(el=>({el,disabled:el.disabled}));busyButtons.forEach(b=>b.disabled=true);inputs.forEach(el=>el.disabled=true);
  try{while(autoBusy)await new Promise(resolve=>setTimeout(resolve,25));await fn();}catch(e){toast(e.message);}finally{exporting=false;busyButtons.forEach(b=>b.disabled=false);saved.forEach(({el,disabled})=>el.disabled=disabled);if(autoDirty)pumpAuto();}
 }
 function blobOf(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('이미지 저장에 실패했습니다.')),'image/png'));}
 allCovers.onclick=()=>run(async()=>{
  const settings=channelSettings(),files={};
  for(const [key,label] of Object.entries(covers.formats)){
   const output=await covers.fromProject(key,settings);
   try{files[label+'.png']=new Uint8Array(await (await blobOf(output)).arrayBuffer());}
   finally{releaseCanvas(output);}
  }
  const zipped=fflate.zipSync(files,{level:0});
  download(new Blob([zipped],{type:'application/zip'}),'청인마루_플랫폼표지_6종.zip');
 });
 preview.onclick=()=>run(render);save.onclick=()=>run(async()=>{const c=await render();try{download(await blobOf(c),(layout.value==='channels'?covers.formats[channel.value]:'청인마루_썸네일')+'.png');}finally{releaseCanvas(c);}});
 bundle.onclick=()=>run(async()=>{const defaults=postingPack(values());for(const [k,a]of Object.entries(areas))if(!a.value.trim())a.value=defaults[k]||'';state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();const pack=readPack(),c=await render(),blob=await blobOf(c);releaseCanvas(c);const labels={thumbnailTitle:'썸네일 제목',postTitle:'게시물·영상 제목',instagramCaption:'인스타 캡션',youtubeDescription:'유튜브 설명글',pinnedComment:'고정댓글',hashtags:'해시태그'};const txt=Object.entries(pack).map(([k,v])=>labels[k]+'\n'+v).join('\n\n────────\n\n');const zipped=fflate.zipSync({'01_썸네일.png':new Uint8Array(await blob.arrayBuffer()),'02_게시문구.txt':fflate.strToU8(txt),'03_게시문구.json':fflate.strToU8(JSON.stringify(pack,null,2))});if(typeof offerPhotoFiles==='function')offerPhotoFiles([{name:'01_썸네일.png',blob}]);download(new Blob([zipped],{type:'application/zip'}),'청인마루_게시세트.zip');});
 const base=window.renderProductionWorkspace;window.renderProductionWorkspace=function(...args){refresh();return base.apply(this,args);};refresh();
 const watch=setInterval(()=>{if(!card.isConnected){clearInterval(watch);clearTimeout(autoTimer);return;}if(!document.hidden)refresh();},650);
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('thumbnail mode',e);}},250);window.addEventListener('marketing:ready',mount);
})();


