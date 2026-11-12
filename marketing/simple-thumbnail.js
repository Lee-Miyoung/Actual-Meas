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
 function text(value,x,y,w,size,lines=1,serif=false){if(!value)return 0;const font=serif?'Studio Serif':'Studio Sans',r=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:serif?34:22,maxLines:lines,leading:1.35,measure:(str,n)=>{g.font=`400 ${n}px "${font}"`;return g.measureText(str).width;}});g.font=`400 ${r.size}px "${font}"`;g.textBaseline='top';g.fillStyle='#303B32';r.lines.forEach((line,i)=>window.CheonginCoverStyle.drawText(g,line,x,y+i*r.lineHeight));return r.lines.length*r.lineHeight;}
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
function thumbnailCrop(width,height,w,h,transform={},start=0){
 const top=height*Math.max(0,Math.min(.9,start)),available=height-top,z=Math.max(w/width,h/available)*Math.max(1,Math.min(3,transform.zoom||1)),sw=w/z,sh=h/z;
 return {sx:(width-sw)*Math.max(0,Math.min(1,transform.x??.5)),sy:top+(available-sh)*Math.max(0,Math.min(1,transform.y??.55)),sw,sh,availableHeight:available};
}
window.CheonginThumbnailCrop=thumbnailCrop;
function mount(){
 if(mounted)return;const grid=document.querySelector('.simple-input-grid');if(!grid||!state?.photos)return;mounted=true;
 const card=el('details',undefined,'simple-thumbnail-card');card.open=true;const sum=el('summary');sum.append(el('span','썸네일 · 자동 미리보기'),el('small','사진을 넣으면 바로 표시됩니다'));card.append(sum);
 const body=el('div',undefined,'simple-thumbnail-body'),fields=el('div',undefined,'simple-thumbnail-selects');
 function field(label,input){const l=el('label',label);l.append(input);fields.append(l);return input;}
 const photo=field('표지 사진',el('select')),layout=field('썸네일 포맷',el('select')),ratio=field('출력 비율',el('select'));
 for(const [k,v]of [['channels','플랫폼별 표지'],['gallery','공간 화보 · 전경 한 컷'],['grain','전경 + 디테일 · 소재 확대'],['social','인스타 감성형 · 하단 공감 문구'],['reference','현장 시공형 · 분류와 전후 사진'],['photo70','사진 중심형 · 공사 사진용'],['full','전체 화보형 · 공간 사진용']])layout.add(new Option(v,k));
 for(const [k,v]of [['portrait','인스타 · 4:5'],['vertical','릴스·쇼츠 · 9:16'],['landscape','유튜브 · 16:9'],['square','블로그·카카오 · 1:1']])ratio.add(new Option(v,k));
 const covers=window.CheonginChannelCovers, style=window.CheonginCoverStyle;
 const channel=field('게시 플랫폼',el('select'));
 for(const [key,label] of Object.entries(covers.formats))channel.add(new Option(label,key));
 const material=field('시공 분야',el('select'));
 for(const [key,label] of [['auto','제품 정보로 선택'],['floor','마루'],['wall','벽장재'],['both','마루 + 벽장재']])material.add(new Option(label,key));
 const detail=field('소재 확대 사진 · 선택',el('select'));
 let titles={},legacyTitle='';
 const housing=field('현장 분류',el('select'));for(const v of ['','단독주택','아파트','상업공간','기타'])housing.add(new Option(v||'분류 선택',v));
 const area=field('평형 배지',el('select'));for(const v of ['','20','24','25','30','32','33','34','40','45','50','직접 입력'])area.add(new Option(v?(v==='직접 입력'?v:v+'평형'):'표시 안 함',v));
 const areaCustom=field('평형 직접 입력',el('input'));areaCustom.type='number';areaCustom.min='1';areaCustom.max='999';areaCustom.step='0.1';areaCustom.placeholder='예: 37';
 function areaValue(){const v=Number(area.value==='직접 입력'?areaCustom.value:area.value);return Number.isFinite(v)&&v>0&&v<=999?String(v):'';}
 function drawSiteBadge(g,right,top){const lines=[housing.value,areaValue()?areaValue()+'평형':''].filter(Boolean);if(!lines.length)return;g.save();g.font='500 25px "Studio Sans"';const w=Math.max(118,...lines.map(v=>g.measureText(v).width+40)),h=lines.length===2?86:52,x=right-w;g.fillStyle='rgba(35,40,35,.42)';g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.beginPath();g.roundRect(x,top,w,h,12);g.fill();g.stroke();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';lines.forEach((v,i)=>{g.font=(i?'400 21':'500 25')+'px "Studio Sans"';g.fillText(v,x+w/2,top+(lines.length===2?27+i*33:27));});g.restore();}
 const beforePhoto=field('시공 전 사진 · 선택',el('select')),afterPhoto=field('시공 후 사진 · 선택',el('select'));
 const pairConcept=field('두 장 구성',el('select'));
 pairConcept.add(new Option('시공 전·후','compare'));
 pairConcept.add(new Option('현장 미리보기','preview'));
 const logoTone=field('로고 색상',el('select'));
 for(const [key,[name]] of Object.entries(style.colors))logoTone.add(new Option(name,key));
 const pairNote=el('p','전·후 사진을 모두 선택하면 하단에 비교 사진이 나타납니다. 한 장만 선택하면 표시하지 않습니다.','simple-help');fields.append(pairNote);
 const exteriorPhoto=field('주택 외관 · 오른쪽 위 원형 사진',el('select'));
 function exteriorSources(){
  const uploaded=state.thumbnailPosting?.exteriorPhoto;
  return uploaded?[uploaded,...state.photos]:state.photos;
 }
 const siteInput=field('현장명 · 지역/아파트명',el('input'));siteInput.placeholder='예: 송도 ○○아파트';
 const floor=field('바닥 시작 높이 · 공구·벽이 빠지도록 조절',el('input'));floor.type='range';floor.min='10';floor.max='90';floor.step='1';floor.value='55';floor.setAttribute('aria-label','견본으로 확대할 바닥 시작 높이');
 const title=el('textarea');title.rows=2;title.maxLength=48;title.id='thumbnail-editorial-title';const titleLabel=el('label','썸네일 제목 · 짧게 두 줄까지');titleLabel.append(title);
 const actions=el('div',undefined,'simple-actions'),preview=el('button','다시 그리기'),save=el('button','썸네일 PNG 저장'),bundle=el('button','썸네일 + 게시 문구 ZIP','primary');for(const b of [preview,save,bundle])b.type='button';const allCovers=el('button','플랫폼 표지 6종 ZIP','primary'); allCovers.type='button';actions.append(save,allCovers,bundle);preview.hidden=true;
 const view=el('div',undefined,'simple-thumbnail-preview');view.tabIndex=0;view.setAttribute('aria-label','표지 편집 · 사진을 선택하고 붙여넣기 또는 드래그');view.append(el('p','공사 사진에서도 바닥이 잘 나온 부분을 견본으로 크게 보여줍니다.','simple-help'));
 const packBox=el('div',undefined,'posting-pack');
 const labels=window.CheonginPostCopy.postLabels;
 const pick=el('select');pick.setAttribute('aria-label','복사할 게시 문구');
 const areas={},areaLabels={};
 for(const [key,label] of Object.entries(labels)){
  pick.add(new Option(label,key));
  const l=el('label',label),a=el('textarea');a.rows=3;a.setAttribute('aria-label',label);l.append(a);
  areas[key]=a;areaLabels[key]=l;l.hidden=true;
  a.oninput=()=>{state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();};
 }
 pick.value='instagramCaption';
 function selectCopy(){for(const [k,l] of Object.entries(areaLabels))l.hidden=k!==pick.value;}
 pick.onchange=selectCopy;selectCopy();
 const copyField=el('button','복사');copyField.type='button';
 copyField.onclick=async()=>{const a=areas[pick.value];if(!a.value.trim())return toast('먼저 게시 문구를 준비해 주세요.');
  try{await navigator.clipboard.writeText(a.value);toast('복사했습니다.');}catch{a.focus();a.select();toast('선택한 문구를 복사해 주세요.');}};
 const prepare=el('button','빈 항목 초안 채우기');prepare.type='button';
 const toolbar=el('div',undefined,'post-copy-bar');toolbar.append(pick,copyField);
 packBox.append(toolbar,...Object.values(areaLabels),prepare);
 body.append(fields,titleLabel,el('p','플랫폼을 선택하면 해당 표지를 미리 볼 수 있습니다. 네이버 블로그에는 소재 확대 사진을, 유튜브·쇼츠에는 시공 전후 사진을 연결할 수 있습니다.','simple-help'),actions,packBox);card.append(body);grid.prepend(card);
 const deskPreview=document.querySelector('.desk-preview'),tabs=el('div',undefined,'thumbnail-live-tabs'),thumbTab=el('button','썸네일'),contentTab=el('button','본문 콘텐츠'),livePane=el('section',undefined,'thumbnail-live-pane'),liveStatus=el('p','사진을 불러오면 썸네일이 자동으로 표시됩니다.','thumbnail-live-status');
 thumbTab.type=contentTab.type='button';tabs.setAttribute('aria-label','미리보기 대상');livePane.setAttribute('aria-label','자동 썸네일 미리보기');liveStatus.setAttribute('role','status');view.setAttribute('aria-busy','false');tabs.append(thumbTab,contentTab);livePane.append(liveStatus,view);
 function showThumbnail(active=true){if(!deskPreview)return;deskPreview.classList.toggle('thumbnail-mode',active);thumbTab.setAttribute('aria-pressed',String(active));contentTab.setAttribute('aria-pressed',String(!active));}
 thumbTab.onclick=()=>showThumbnail();contentTab.onclick=()=>showThumbnail(false);
 if(deskPreview){deskPreview.prepend(tabs,livePane);showThumbnail();}else body.prepend(livePane);
 let projectKey='',photoKey='',canvas=null,revision=0,autoTimer=null,autoBusy=false,autoDirty=false,exporting=false,lastKey='',lastSource=null,lastPhoto=null,lastPairSources=[];
 function values(){if(layout.value==='channels'||covers.editorial?.(layout.value))return {...covers.getProjectInfo(photo.value),...(siteInput.value.trim()?{location:siteInput.value.trim()}:{}),title:title.value.trim()||state.manualOverlay?.title||'',material:material.value};const p=typeof selectedProduct==='function'?selectedProduct():null,m=state.manualOverlay||{};return {title:title.value.trim(),location:siteInput.value.trim()||m.location||state.marketingSite||[state.region,state.space].filter(Boolean).join(' · ')||state.title||'',product:m.product||(p?[p.brand,p.model,p.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):''),spec:cleanDisplaySpec(m.spec||p?.size||''),structure:m.structure||state.productStructure||'',kind:p?.category||''};}
 function readPack(){return Object.fromEntries(Object.entries(areas).map(([k,a])=>[k,a.value]));}
 function preparePack(){const pack=postingPack(values());for(const [k,a]of Object.entries(areas))if(!a.value.trim())a.value=pack[k]||'';state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();}
 prepare.onclick=preparePack;
 areas.thumbnailTitle.oninput=()=>{title.value=areas.thumbnailTitle.value;if(layout.value==='channels')titles[channel.value]=title.value;else legacyTitle=title.value;remember();state.thumbnailPosting.pack=readPack();persist();showThumbnail();scheduleAuto();};
 function remember(){const families={landscape:['youtubeCover'],vertical:['reels','shorts'],square:['naverCover','kakao'],portrait:['carousel']};state.format=layout.value==='channels'?channel.value:((families[ratio.value]||[]).includes(state.format)?state.format:(families[ratio.value]?.[0]||'carousel'));const output=document.getElementById('format');if(output)output.value=state.format;state.thumbnailPosting={...state.thumbnailPosting,photoId:photo.value,layout:layout.value,ratio:ratio.value,title:legacyTitle,siteText:siteInput.value,titles:{...titles},channel:channel.value,material:material.value,detailId:detail.value,exteriorId:exteriorPhoto.value,housing:housing.value,areaPyeong:areaValue(),areaMode:area.value,areaCustom:areaCustom.value,pairConcept:pairConcept.value,logoTone:logoTone.value,beforeId:beforePhoto.value,afterId:afterPhoto.value,referenceVersion:1,floorStart:Number(floor.value)/100,sampleVersion:1};persist();}
 function showFields(){
  const channels=layout.value==='channels';areaCustom.parentElement.hidden=area.value!=='직접 입력';
  channel.parentElement.hidden=allCovers.hidden=!channels;
  material.parentElement.hidden=!channels&&!covers.editorial?.(layout.value);
  ratio.parentElement.hidden=channels;
  floor.parentElement.hidden=layout.value!=='photo70';
  detail.parentElement.hidden=layout.value!=='grain'&&(!channels||!['naverCover','shorts'].includes(channel.value));
  const showPair=['reference','social'].includes(layout.value)||(channels&&['carousel','reels','shorts','youtubeCover'].includes(channel.value));
  beforePhoto.parentElement.hidden=afterPhoto.parentElement.hidden=pairNote.hidden=!showPair;
  pairConcept.parentElement.hidden=!showPair;
  if(channels){
   pairNote.textContent='서로 다른 전·후 사진을 선택하면 두 사진을 비교하는 표지로 바뀝니다.';
   const info=covers.getProjectInfo(photo.value);
   title.placeholder=info.title||covers.suggestedTitle(channel.value,info,covers.material(info,material.value),Boolean(beforePhoto.value&&afterPhoto.value&&beforePhoto.value!==afterPhoto.value),pairConcept.value);
   titleLabel.firstChild.nodeValue='이 플랫폼의 표지 제목 · 비워두면 자동';
  }else{
   pairNote.textContent='전·후 사진을 모두 선택하면 하단에 비교 사진이 나타납니다.';
   titleLabel.firstChild.nodeValue='썸네일 제목 · 짧게 두 줄까지';
   title.placeholder='';
  }
  const previewPair=pairConcept.value==='preview';
  const names=previewPair?['첫 번째 장면','두 번째 장면']:['시공 전','시공 후'];
  const selectors=[beforePhoto,afterPhoto];
  selectors.forEach((select,i)=>{
    const label=names[i]+' 사진';
    if(select.parentElement.firstChild.nodeValue!==label)select.parentElement.firstChild.nodeValue=label;
    if(select.options[0]&&select.options[0].text!==label+' 없음')select.options[0].text=label+' 없음';
    const dest=Array.from(target.options).find(o=>o.value===(i===0?'before':'after'));
    if(dest&&dest.text!==label+'에 넣기')dest.text=label+'에 넣기';
  });
  pairNote.textContent=previewPair?'사진 두 장을 선택하세요. 사진 위 장면 이름을 눌러 바꿀 수 있습니다.':'시공 전 사진과 시공 후 사진을 순서대로 선택하세요.';
 }
 function changed(event){
  if(event.target===exteriorPhoto && exteriorPhoto.value==='add-exterior'){
   exteriorPhoto.value=state.thumbnailPosting?.exteriorId||'';
   selectTarget('exterior');choose.click();return;
  }
  if(event.target===layout && covers.editorial?.(layout.value) && !legacyTitle)legacyTitle=title.value.trim();
  if(event.target===layout||event.target===channel)title.value=layout.value==='channels'?(titles[channel.value]||''):legacyTitle;
  if(event.target===title){areas.thumbnailTitle.value=title.value;state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();if(layout.value==='channels')titles[channel.value]=title.value;else legacyTitle=title.value;}
  if(event.target===exteriorPhoto||event.target===detail){const role=event.target===exteriorPhoto?'exterior':'detail';if(state.thumbnailPosting?.transforms)delete state.thumbnailPosting.transforms[role];if(activeTarget===role)zoom.value='100';}
  remember();showFields();showThumbnail();scheduleAuto();window.renderProductionWorkspace?.();
 }
 for(const input of [photo,layout,ratio,channel,material,detail,title,floor,housing,area,areaCustom,pairConcept,logoTone,beforePhoto,afterPhoto,exteriorPhoto,siteInput])input.addEventListener(input.tagName==='SELECT'?'change':'input',changed);
 function inputKey(){const p=state.photos.find(p=>p.id===photo.value);return JSON.stringify([state.projectId,pairConcept.value,logoTone.value,state.thumbnailPosting?.firstScene,state.thumbnailPosting?.secondScene,photo.value,layout.value,ratio.value,channel.value,material.value,detail.value,Number(floor.value),state.thumbnailPosting?.transforms,housing.value,areaValue(),beforePhoto.value,afterPhoto.value,...[beforePhoto.value,afterPhoto.value,detail.value,exteriorPhoto.value].map(id=>{const p=state.photos.find(p=>p.id===id);return [p?.id,p?.adjust,state.signaturePhotos?.[id]?.focusX,state.signaturePhotos?.[id]?.focusY,state.signaturePhotos?.[id]?.focus];}),values(),p?.adjust,state.signaturePhotos?.[p?.id]]);}
 function scheduleAuto(delay=180){autoDirty=true;revision++;clearTimeout(autoTimer);autoTimer=setTimeout(pumpAuto,delay);}
 async function pumpAuto(){
  if(autoBusy||exporting)return;if(!autoDirty)return;autoDirty=false;
  if(!state.photos.some(p=>p.id===photo.value)){if(canvas){releaseCanvas(canvas);canvas=null;}view.replaceChildren(el('p','사진을 불러오면 여기에서 썸네일을 바로 볼 수 있어요.','simple-help'));liveStatus.textContent='사진을 먼저 불러오세요.';return;}
  autoBusy=true;const version=revision,key=inputKey();view.setAttribute('aria-busy','true');liveStatus.textContent='썸네일을 자동으로 갱신하고 있어요…';
  try{const c=await draw({previewOnly:true});if(version!==revision||key!==inputKey()){releaseCanvas(c);autoDirty=true;}else{if(canvas)releaseCanvas(canvas);canvas=c;view.replaceChildren(c);liveStatus.textContent='사진은 드래그·모서리로 조절하고, 글씨는 눌러서 수정하세요.';}}
  catch(e){if(version===revision){liveStatus.textContent='미리보기를 만들지 못했습니다. 사진이나 설정을 바꾸면 다시 시도합니다. '+e.message;}}
  finally{autoBusy=false;view.setAttribute('aria-busy','false');if(autoDirty){clearTimeout(autoTimer);autoTimer=setTimeout(pumpAuto,80);}}
 }
 function checkAuto(){const p=state.photos.find(p=>p.id===photo.value),key=inputKey(),sources=[beforePhoto.value,afterPhoto.value,detail.value,exteriorPhoto.value].map(id=>state.photos.find(p=>p.id===id)?.src);if(key!==lastKey||p!==lastPhoto||p?.src!==lastSource||sources.some((src,i)=>src!==lastPairSources[i])){lastKey=key;lastPhoto=p;lastSource=p?.src;lastPairSources=sources;scheduleAuto();}}
 function refresh(){const key=state.projectId||'current',ids=exteriorSources().map(p=>p.id).join('|');if(projectKey!==key){projectKey=key;photoKey=null;const saved=state.thumbnailPosting||{};pairConcept.value=saved.pairConcept||((saved.beforeId||saved.afterId)?'compare':'preview');logoTone.value=saved.logoTone||'white';siteInput.value=saved.siteText||'';activeTarget='background';target.value='background';zoom.value=String(Math.round((saved.transforms?.background?.zoom||1)*100));legacyTitle=saved.title||state.manualOverlay?.title||'';titles={...saved.titles};layout.value=['channels','social','reference','photo70','full','grain','gallery'].includes(saved.layout)?saved.layout:'channels';channel.value=covers.formats[state.format]?state.format:(covers.formats[saved.channel]?saved.channel:'carousel');material.value=saved.material||'auto';title.value=layout.value==='channels'?(titles[channel.value]||''):legacyTitle;housing.value=saved.housing||'';area.value=saved.areaMode||(saved.areaPyeong?(Array.from(area.options).some(o=>o.value===saved.areaPyeong)?saved.areaPyeong:'직접 입력'):'');areaCustom.value=saved.areaCustom||saved.areaPyeong||'';floor.value=String(Math.round((saved.floorStart??.55)*100));ratio.value=saved.ratio||'portrait';for(const [k,a]of Object.entries(areas))a.value=saved.pack?.[k]||'';if(canvas){canvas.width=canvas.height=1;canvas=null;}view.replaceChildren(el('p','자동으로 썸네일을 준비합니다.','simple-help'));}if(photoKey!==ids){photoKey=ids;const saved=state.thumbnailPosting?.photoId;for(const [select,label,key]of [[beforePhoto,'시공 전 사진 없음','beforeId'],[afterPhoto,'시공 후 사진 없음','afterId'],[detail,'표지 사진에서 확대','detailId'],[exteriorPhoto,'표시 안 함','exteriorId']]){const was=state.thumbnailPosting?.[key]||'',list=select===exteriorPhoto?exteriorSources():state.photos;select.replaceChildren(new Option(label,''),...list.map(p=>new Option(p.name,p.id)));if(select===exteriorPhoto)select.add(new Option('새 외관 사진 추가…','add-exterior'));select.value=list.some(p=>p.id===was)?was:'';}photo.replaceChildren(...state.photos.map(p=>new Option(p.name,p.id)));const best=state.photos.find(p=>state.signaturePhotos?.[p.id]?.role==='after')||state.photos.find(p=>!['before','progress','pair'].includes(state.signaturePhotos?.[p.id]?.role))||state.photos[0];photo.value=state.photos.some(p=>p.id===saved)?saved:best?.id||'';showThumbnail();}showFields();checkAuto();}
 async function drawCorner(g,c,previewOnly,top,wide,right,withBadge=true){
  const selected=exteriorSources().find(p=>p.id===exteriorPhoto.value);
  let edge=right;
  if(selected){
   const source=await (previewOnly?photoImage(selected):loadImage(selected.src)),previous=original;
   let image;
   try{
    original=false;image=transformed(source,selected.adjust,previewOnly?2560:4096);
    edge=style.exterior(g,c,{id:selected.id,image,transform:state.thumbnailPosting?.transforms?.exterior},1080,right,top,wide);
   }finally{original=previous;if(image)releaseCanvas(image);if(!previewOnly)source.src='';}
  }
  if(withBadge)drawSiteBadge(g,edge,top);
 }
 async function drawReference({previewOnly=false}={}){
  const selected=state.photos.find(p=>p.id===photo.value);if(!selected)throw Error('배경 사진을 먼저 선택하세요.');
  const v=values(),category=housing.value,before=state.photos.find(p=>p.id===beforePhoto.value),after=state.photos.find(p=>p.id===afterPhoto.value),pair=!!(before&&after&&before.id!==after.id);
  const [W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:ratio.value==='square'?(state.format==='kakao'?[800,800]:[1200,1200]):[1080,1350],c=el('canvas'),q=previewOnly?Math.min(1,1440/Math.max(W,H)):1;c.width=Math.round(W*q);c.height=Math.round(H*q);
  const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const scale=c.width/1080,h=H/(W/1080),wide=ratio.value==='landscape',vertical=ratio.value==='vertical',top=vertical?190:32,bottom=vertical?280:48,m=56;
  g.scale(scale,scale);c.typeLayout=[];c.photoLayout=[];
  const titleText=title.value.trim()||[category,'마루 시공'].filter(Boolean).join(' ');
  await Promise.all([document.fonts.load('400 68px "Studio Serif"',v.product),document.fonts.load('400 28px "Studio Sans"',category+v.location+v.spec)]);
  async function picture(p,x,y,w,hh,target='background'){const im=await (previewOnly?photoImage(p):loadImage(p.src)),was=original;let image;original=false;try{image=transformed(im,p.adjust,previewOnly?2560:4096);}finally{original=was;if(!previewOnly)im.src='';}if(image?.then)image=await image;try{const crop=thumbnailCrop(image.width,image.height,w,hh,transformFor(target));g.save();g.beginPath();g.rect(x,y,w,hh);g.clip();g.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,x,y,w,hh);g.restore();c.photoLayout.push({id:p.id,target,x,y,width:w,height:hh,sourceWidth:image.width,sourceHeight:image.height,...crop});}finally{releaseCanvas(image);}}

  function text(value,x,y,w,size,lines=1,color='#3B281A',serif=false,center=false){if(!value)return;const font=serif?'Studio Serif':'Studio Sans',r=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:size*.76,maxLines:lines,leading:1.2,measure:(s,n)=>{g.font=value===titleText?style.font(n):`400 ${n}px "${font}"`;return g.measureText(s).width;}});g.font=value===titleText?style.font(r.size):`400 ${r.size}px "${font}"`;g.textBaseline='top';g.fillStyle=color;const shift=center?(size*1.2*lines-r.lines.length*r.lineHeight)/2:0;r.lines.forEach((line,i)=>{const mt=g.measureText(line),xx=center?x+(w-mt.width)/2:x+(mt.actualBoundingBoxLeft||0),yy=y+shift+i*r.lineHeight;window.CheonginCoverStyle.drawText(g,line,xx,yy);c.typeLayout.push({source:String(value),x:xx,y:yy,width:mt.width,height:r.lineHeight,size:r.size});});if(r.truncated)c.dataset.textTruncated='true';}
  await picture(selected,0,0,1080,h);
  style.drawLogo(g,c,await style.logo(logoTone.value),1080,m,top+8);
  await drawCorner(g,c,previewOnly,top,wide,1080-m);
  await style.loadTitle(titleText);
  const titleY=top+(wide?104:164),titleH=wide?112:156,productY=titleY+titleH+12,productH=wide?65:92;
  text(titleText,72,titleY,936,wide?48:68,2,'#FFFFFF',true,true);
  g.fillStyle='rgba(255,255,255,.5)';g.fillRect(492,productY-10,96,1);
  text(v.product||'제품을 선택해 주세요',138,productY+8,804,wide?28:38,2,'#FFFFFF',true,true);
  const specY=productY+productH+14;text([v.structure||v.kind,v.spec].filter(Boolean).join(' · '),94,specY,892,wide?23:29,1,'#F1EDE4',false,true);
  if(v.location)text('현장 · '+v.location,94,specY+(wide?34:45),892,wide?20:26,1,'#F1EDE4',false,true);
  if(pair){const hh=wide?106:254,y=h-bottom-hh;for(const {role,x,width} of style.sceneFrames(1080,m)){g.fillStyle='#F9F1E5';g.fillRect(x-1,y-1,width+2,hh+2);await picture(role==='before'?before:after,x,y,width,hh,role);style.drawLabel(g,c,channelSettings(),role,x+12,y+12);}if(pairConcept.value==='compare')text('›',522,y+hh/2-24,32,45,1,'#F4F0E8',false,true);}
  c.dataset.renderer='cheongin-reference-site-v2';c.dataset.template='reference';c.dataset.housing=category;c.dataset.pairConcept=pairConcept.value;c.dataset.comparison=String(pair&&pairConcept.value==='compare');c.previewMeta={title:v.title,product:v.product,spec:v.spec,location:v.location};return c;
 }
 async function drawSocial({previewOnly=false}={}){
  const p=state.photos.find(p=>p.id===photo.value);if(!p)throw Error('배경 사진을 먼저 선택하세요.');
  const v=values(),before=state.photos.find(p=>p.id===beforePhoto.value),after=state.photos.find(p=>p.id===afterPhoto.value),pair=!!(before&&after&&before.id!==after.id),category=housing.value;
  const [W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:ratio.value==='square'?(state.format==='kakao'?[800,800]:[1200,1200]):[1080,1350],c=el('canvas'),q=previewOnly?Math.min(1,1440/Math.max(W,H)):1;c.width=Math.round(W*q);c.height=Math.round(H*q);
  const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const scale=c.width/1080,h=H/(W/1080),wide=ratio.value==='landscape',vertical=ratio.value==='vertical',m=wide?48:64,top=vertical?190:42,bottom=vertical?280:56;
  g.scale(scale,scale);c.typeLayout=[];c.photoLayout=[];
  const headline=v.title||'이 마루, 우리 집에도 어울릴까요?',metadata=[v.spec,v.location].filter(Boolean).join(' · ');
  await Promise.all([style.loadTitle(headline),document.fonts.load('400 30px "Studio Sans"',v.product+metadata+category)]);
  async function picture(photo,x,y,w,hh,target='background'){const im=await (previewOnly?photoImage(photo):loadImage(photo.src)),was=original;let image;original=false;try{image=transformed(im,photo.adjust,previewOnly?2560:4096);}finally{original=was;if(!previewOnly)im.src='';}if(image?.then)image=await image;try{const crop=thumbnailCrop(image.width,image.height,w,hh,transformFor(target));g.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,x,y,w,hh);c.photoLayout.push({id:photo.id,target,x,y,width:w,height:hh,sourceWidth:image.width,sourceHeight:image.height,...crop});}finally{releaseCanvas(image);}}
  function text(value,x,y,w,size,maxLines=1,bold=false){if(!value)return;const r=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:size*.8,maxLines,leading:1.22,measure:(s,n)=>{g.font=`${bold?600:400} ${n}px "Studio Sans"`;return g.measureText(s).width;}});g.font=`${bold?600:400} ${r.size}px "Studio Sans"`;g.textBaseline='top';g.fillStyle='#FFFFFF';for(const [i,line]of r.lines.entries()){const mt=g.measureText(line),xx=x+(mt.actualBoundingBoxLeft||0),yy=y+i*r.lineHeight;window.CheonginCoverStyle.drawText(g,line,xx,yy);c.typeLayout.push({source:String(value),x,y:yy,width:mt.width,height:r.lineHeight,size:r.size});}if(r.truncated)c.dataset.textTruncated='true';}
  await picture(p,0,0,1080,h);
  const maxWidth=1080-m*2;
  function lines(value,size,maxLines,bold=false){const weight=bold?600:400;return CheonginType.layout(String(value||''),{width:maxWidth-44,fontSize:size,minFontSize:size*.86,maxLines,leading:bold?1.17:1.22,measure:(s,n)=>{g.font=bold?style.font(n):`400 ${n}px "Studio Sans"`;return g.measureText(s).width;}});}
  const heading=lines(headline,wide?48:70,2,true),kind=v.structure||v.kind||'',productLine=[/^(마루|바닥재|기타)$/.test(kind)?'':kind,v.product].filter(Boolean).join(' · ');
  const details=[{value:productLine,size:wide?22:26,max:2},{value:v.spec,size:wide?22:26,max:1},{value:v.location?'현장 · '+v.location:'',size:wide?20:24,max:1}].filter(r=>r.value).map(r=>({...r,layout:lines(r.value,r.size,r.max)}));
  const paddingX=22,paddingY=16,rowGap=9,boxH=details.length?paddingY*2+details.reduce((sum,r)=>sum+r.layout.lines.length*r.layout.lineHeight,0)+rowGap*(details.length-1):0;
  let measured=0;for(const r of details){g.font=`400 ${r.layout.size}px "Studio Sans"`;for(const line of r.layout.lines)measured=Math.max(measured,g.measureText(line).width);}
  const boxW=Math.min(maxWidth,Math.max(320,measured+paddingX*2)),pairH=wide?106:230,pairY=h-bottom-pairH,boxBottom=pair?pairY-22:h-bottom,infoY=boxBottom-boxH;
  const headingH=heading.lines.length*heading.lineHeight,titleY=(details.length?infoY-22:boxBottom)-headingH;
  style.drawLogo(g,c,await style.logo(logoTone.value),1080,m,top);
  await drawCorner(g,c,previewOnly,top,wide,1080-m);
  function drawMeasured(value,layout,x,y,bold=false){g.font=bold?style.font(layout.size):`400 ${layout.size}px "Studio Sans"`;g.textBaseline='top';g.fillStyle='#FFFFFF';for(const [i,line]of layout.lines.entries()){const mt=g.measureText(line),yy=y+i*layout.lineHeight;window.CheonginCoverStyle.drawText(g,line,x+(mt.actualBoundingBoxLeft||0),yy);c.typeLayout.push({source:String(value),x,y:yy,width:mt.width,height:layout.lineHeight,size:layout.size});}if(layout.truncated)c.dataset.textTruncated='true';}
  drawMeasured(headline,heading,m,titleY,true);
  if(details.length){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.3;g.fillStyle='rgba(20,34,25,.10)';g.beginPath();if(g.roundRect)g.roundRect(m,infoY,boxW,boxH,12);else g.rect(m,infoY,boxW,boxH);g.fill();g.stroke();let yy=infoY+paddingY;for(const r of details){drawMeasured(r.value,r.layout,m+paddingX,yy);yy+=r.layout.lines.length*r.layout.lineHeight+rowGap;}}
  c.socialLayout={titleY,headingH,infoY,boxH,boxW,gap:details.length?infoY-(titleY+headingH):0};

  if(pair){for(const {role,x,width} of style.sceneFrames(1080,m)){g.fillStyle='rgba(255,255,255,.8)';g.fillRect(x-1,pairY-1,width+2,pairH+2);await picture(role==='before'?before:after,x,pairY,width,pairH,role);style.drawLabel(g,c,channelSettings(),role,x+12,pairY+12);}}
  c.dataset.renderer='cheongin-social-empathy-v2';c.dataset.template='social';c.dataset.pairConcept=pairConcept.value;c.dataset.comparison=String(pair&&pairConcept.value==='compare');c.previewMeta={title:v.title,product:v.product,spec:v.spec,location:v.location};return c;
 }
 function channelSettings(){return {...state.thumbnailPosting,photoId:photo.value,titles:{...titles},material:material.value,housing:housing.value,areaPyeong:areaValue(),areaMode:area.value,areaCustom:areaCustom.value,detailId:detail.value,exteriorId:exteriorPhoto.value,pairConcept:pairConcept.value,logoTone:logoTone.value,beforeId:beforePhoto.value,afterId:afterPhoto.value};}
 async function draw({previewOnly=false}={}){
  if(layout.value==='channels'||covers.editorial?.(layout.value)){
   const platform=layout.value==='channels'?channel.value:state.format;
   return covers.fromProject(platform,{...channelSettings(),layout:layout.value,title:title.value.trim()},previewOnly?{maxEdge:1440}:{});
  }
  if(layout.value==='social')return drawSocial({previewOnly});
  if(layout.value==='reference')return drawReference({previewOnly});
  const p=state.photos.find(p=>p.id===photo.value);if(!p)throw Error('표지 사진을 먼저 선택하세요.');
  const v=values(),mode=layout.value==='full'?'full':'photo70',floorStart=Number(floor.value)/100;
  const [W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:ratio.value==='square'?(state.format==='kakao'?[800,800]:[1200,1200]):[1080,1350];
  const c=el('canvas'),previewScale=previewOnly?Math.min(1,1440/Math.max(W,H)):1;c.width=Math.round(W*previewScale);c.height=Math.round(H*previewScale);
  const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const scale=c.width/1080,h=H/(W/1080),wide=ratio.value==='landscape',vertical=ratio.value==='vertical',m=wide?48:64,top=vertical?190:42,bottom=vertical?260:48;
  const kind=v.structure||v.kind||'',onPhoto=mode==='full',ink=onPhoto?'#FFFFFF':'#263C31',muted=onPhoto?'#EEE9DF':'#667667';
  c.typeLayout=[];c.photoLayout=[];g.scale(scale,scale);g.fillStyle='#F4F0E8';g.fillRect(0,0,1080,h);
  const source=await (previewOnly?photoImage(p):loadImage(p.src)),was=original;let image;original=false;try{image=transformed(source,p.adjust,previewOnly?2560:4096);}finally{original=was;if(!previewOnly)source.src='';}if(image?.then)image=await image;
  const photoBox=mode==='full'?{x:0,y:0,w:1080,h}:wide?{x:0,y:0,w:620,h}:{x:0,y:0,w:1080,h:Math.round(h*.68)};
  try{
   const crop=thumbnailCrop(image.width,image.height,photoBox.w,photoBox.h,transformFor('background'),mode==='photo70'?floorStart:0);
   g.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,photoBox.x,photoBox.y,photoBox.w,photoBox.h);c.photoLayout.push({...photoBox,target:'background',width:photoBox.w,height:photoBox.h,sourceWidth:image.width,sourceHeight:image.height,...crop});
  }finally{releaseCanvas(image);}
  style.drawLogo(g,c,await style.logo(logoTone.value),1080,wide&&mode==='photo70'?32:56,top);
  await drawCorner(g,c,previewOnly,top,wide,1080-m,false);
  await Promise.all([document.fonts.load('400 61px "Studio Serif"',v.product+v.title),document.fonts.load('400 44px "Studio Sans"',kind+v.spec+v.location)]);
  const x=wide&&mode==='photo70'?664:m,w=wide&&mode==='photo70'?1080-x-m:1080-m*2;
  const y=mode==='photo70'?(wide?(exteriorPhoto.value?158:108):photoBox.h+34):h-bottom-(wide?245:360),available=h-bottom-y;
  await style.loadTitle(v.title||'우리 집에 어울리는 바닥은?');
  const rows=[{heading:true,value:v.title||'우리 집에 어울리는 바닥은?',size:wide?42:62,min:42,lines:2,serif:true,color:ink,gap:20},{value:[kind,v.product].filter(Boolean).join(' · '),size:wide?27:40,min:29,lines:2,serif:true,color:ink,gap:14},{value:v.spec,size:wide?28:36,min:26,lines:2,color:ink,gap:14},{value:v.location?('현장 · '+v.location):'',size:wide?22:25,min:21,lines:2,color:muted,gap:0}].filter(r=>r.value);
  function measure(row,factor=1){const family=row.serif?'Studio Serif':'Studio Sans';return CheonginType.layout(String(row.value),{width:w,fontSize:row.size*factor,minFontSize:Math.min(row.min,row.size*factor),maxLines:row.lines,leading:1.25,measure:(s,n)=>{g.font=row.heading?style.font(n):`400 ${n}px "${family}"`;return g.measureText(s).width;}});}
  let factor=1,layouts=rows.map(r=>measure(r));const total=()=>layouts.reduce((sum,l,i)=>sum+l.lines.length*l.lineHeight+rows[i].gap*factor,0);
  for(let i=0;i<5&&total()>available;i++){factor*=Math.max(.65,Math.min(.98,available/total()));layouts=rows.map(r=>measure(r,factor));}
  let yy=y;for(let i=0;i<rows.length;i++){const r=rows[i],l=layouts[i];g.font=r.heading?style.font(l.size):`400 ${l.size}px "${r.serif?'Studio Serif':'Studio Sans'}"`;g.fillStyle=r.color;g.textBaseline='top';for(const [j,line]of l.lines.entries()){const ty=yy+j*l.lineHeight;const metrics=g.measureText(line),tx=x+(metrics.actualBoundingBoxLeft||0);window.CheonginCoverStyle.drawText(g,line,tx,ty);c.typeLayout.push({source:r.value,x,y:ty,width:metrics.width,height:l.lineHeight,size:l.size});}if(l.truncated)c.dataset.textTruncated='true';yy+=l.lines.length*l.lineHeight+r.gap*factor;}
  c.dataset.template=mode;c.dataset.renderer='cheongin-approved-product-cover-v1';c.previewMeta={title:v.title,product:v.product,spec:v.spec,location:v.location};return c;
 }
 async function render(){return draw();}
 const busyButtons=[preview,save,bundle,allCovers];async function run(fn){
  if(exporting||importing)return;exporting=true;revision++;const inputs=[photo,layout,ratio,channel,material,detail,title,floor,housing,area,areaCustom,pairConcept,logoTone,beforePhoto,afterPhoto,exteriorPhoto,siteInput,areas.thumbnailTitle,zoom,resetPosition,target,paste],saved=inputs.map(el=>({el,disabled:el.disabled}));busyButtons.forEach(b=>b.disabled=true);inputs.forEach(el=>el.disabled=true);
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
 const photoTools=el('section',undefined,'thumbnail-photo-tools'),dropZone=el('div','사진을 여기에 놓거나 클릭하세요 · Ctrl+V로 붙여넣기','thumbnail-drop-zone'),target=el('select'),choose=el('input'),paste=el('button','사진 붙여넣기'),uploadStatus=el('p','','simple-help');
 dropZone.tabIndex=0;dropZone.setAttribute('role','button');dropZone.setAttribute('aria-label','사진 추가 · 드롭 또는 붙여넣기');choose.type='file';choose.accept='image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';choose.multiple=true;choose.hidden=true;paste.type='button';
 for(const [k,v]of [['background','배경 사진에 넣기'],['before','시공 전 사진에 넣기'],['after','시공 후 사진에 넣기'],['detail','소재 확대 사진에 넣기'],['exterior','주택 외관 원형에 넣기']])target.add(new Option(v,k));target.setAttribute('aria-label','추가할 사진 위치');
 const zoom=el('input'),zoomLabel=el('label','사진 확대 · 사진을 누른 뒤 조절'),resetPosition=el('button','사진 위치 초기화'),moveStatus=el('p','사진을 드래그하면 구도가 바뀝니다. 전후 사진도 각각 움직일 수 있어요.','simple-help');zoom.type='range';zoom.min='100';zoom.max='300';zoom.step='1';zoom.value='100';zoom.setAttribute('aria-label','선택한 사진 확대');zoomLabel.append(zoom);resetPosition.type='button';photoTools.append(target,dropZone,choose,paste,uploadStatus,zoomLabel,resetPosition,moveStatus);body.prepend(photoTools);
 let importing=false,activeTarget='background',gesture=null;
 function transformFor(role){
  const box=canvas?.photoLayout?.find(b=>b.target===role);
  return state.thumbnailPosting?.transforms?.[role]||{x:box?.anchorX??.5,y:box?.anchorY??.55,zoom:1};
 }
 function selectTarget(role){
  activeTarget=role;target.value=role;zoom.value=String(Math.round(transformFor(role).zoom*100));
 }
 target.onchange=()=>selectTarget(target.value);
 function logicalWidth(){return Number(canvas?.dataset.exportWidth)||1080;}
 function putTransform(role,value){state.thumbnailPosting??={};state.thumbnailPosting.transforms??={};state.thumbnailPosting.transforms[role]=value;}
 async function addPhotos(files){
  if(importing||exporting||!files.length)return;const role=target.value,project=state.projectId;importing=true;paste.disabled=true;uploadStatus.textContent='사진을 추가하고 있어요…';
  try{if(role==='exterior'&&files.length!==1)throw Error('원형에 넣을 외관 사진 한 장을 선택하세요.');if(role!=='exterior'&&state.photos.length+files.length>10)throw Error('현재 사진과 합쳐 10장까지 추가할 수 있습니다.');const prepared=[];
   for(const [i,input]of files.entries()){if(input.size>20*1024*1024)throw Error('사진은 장당 20MB 이하로 추가하세요.');if(!/^image\//i.test(input.type)&&! /\.(png|jpe?g|webp|hei[cf])$/i.test(input.name))throw Error('이미지 파일을 선택하세요.');const name=input.name&&/\.(png|jpe?g|webp|hei[cf])$/i.test(input.name)?input.name:'붙여넣기_'+Date.now()+'_'+i+(/webp/i.test(input.type)?'.webp':/jpeg/i.test(input.type)?'.jpg':'.png');const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('사진을 읽지 못했습니다.'));r.readAsDataURL(input);});const p={id:crypto.randomUUID(),name,src,adjust:defaults(),approved:true,autoPrepared:true};await photoImage(p);if(typeof analysePhoto==='function')await analysePhoto(p);prepared.push(p);}
   if(state.projectId!==project)return;
   if(role==='exterior'){
    state.thumbnailPosting??={};state.thumbnailPosting.exteriorPhoto=prepared[0];state.thumbnailPosting.exteriorId=prepared[0].id;
    putTransform('exterior',{x:.5,y:.5,zoom:1});refresh();selectTarget('exterior');remember();showThumbnail();scheduleAuto(0);
    window.renderProductionWorkspace?.();uploadStatus.textContent='표지에 외관 사진을 추가했습니다.';return;
   }
   const hadPhotos=state.photos.length>0;state.photos.push(...prepared);if(!hadPhotos)window.signaturePhotoImport?.({kit:false});if(typeof thumbnails==='function')thumbnails();refresh();const chosen=prepared[0].id;if(role==='before'){beforePhoto.value=chosen;activeTarget='before';}else if(role==='after'){afterPhoto.value=chosen;activeTarget='after';}else if(role==='detail'){detail.value=chosen;activeTarget='detail';}else{photo.value=chosen;activeTarget='background';}putTransform(activeTarget,{x:.5,y:.55,zoom:1});zoom.value='100';remember();showThumbnail();scheduleAuto();window.renderProductionWorkspace?.();uploadStatus.textContent=prepared.length+'장 추가 완료 · 기존 사진은 유지했습니다.';
  }catch(e){uploadStatus.textContent=e.message;}finally{importing=false;paste.disabled=false;choose.value='';}
 }
 choose.onchange=()=>addPhotos([...choose.files]);dropZone.onclick=()=>choose.click();dropZone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose.click();}};
 for(const type of ['dragenter','dragover'])dropZone.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();dropZone.classList.add('dragging');});dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('dragging'));dropZone.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dropZone.classList.remove('dragging');addPhotos([...e.dataTransfer.files]);});
 for(const type of ['dragenter','dragover'])view.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();view.classList.add('drop-active');});view.addEventListener('dragleave',()=>view.classList.remove('drop-active'));
 view.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();view.classList.remove('drop-active');let role='background';if(canvas){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*logicalWidth()/r.width,y=(e.clientY-r.top)*(canvas.height/(canvas.width/logicalWidth()))/r.height,b=[...(canvas.photoLayout||[])].reverse().find(b=>style.hits(b,x,y));if(b?.target)role=b.target;}target.value=role;addPhotos([...e.dataTransfer.files]);});
 document.addEventListener('paste',e=>{const editable=e.target?.closest?.('textarea,input,[contenteditable="true"]');if(editable)return;const files=[...(e.clipboardData?.files||[])].filter(f=>/^image\//.test(f.type));if(!files.length)return;e.preventDefault();e.stopPropagation();addPhotos(files);},true);
 paste.onclick=async()=>{if(!navigator.clipboard?.read){dropZone.focus();uploadStatus.textContent='이 브라우저에서는 사진 영역을 누른 뒤 붙여넣기를 사용하거나 사진 파일을 선택하세요.';return;}try{const items=await navigator.clipboard.read(),files=[];for(const item of items){const type=item.types.find(t=>/^image\//.test(t));if(type){const blob=await item.getType(type);files.push(new File([blob],'붙여넣기_'+Date.now()+(/jpeg/.test(type)?'.jpg':/webp/.test(type)?'.webp':'.png'),{type}));}}if(!files.length)throw Error('클립보드에 사진이 없습니다. 사진을 복사한 뒤 다시 눌러 주세요.');await addPhotos(files);}catch(e){uploadStatus.textContent=e.name==='NotAllowedError'?'클립보드 접근이 허용되지 않았습니다. 사진 영역에서 붙여넣거나 파일을 선택하세요.':e.message;}};
 zoom.oninput=()=>{putTransform(activeTarget,{...transformFor(activeTarget),zoom:Number(zoom.value)/100});persist();showThumbnail();scheduleAuto(32);};resetPosition.onclick=()=>{putTransform(activeTarget,{x:.5,y:.55,zoom:1});zoom.value='100';persist();scheduleAuto();};
 view.addEventListener('pointerdown',e=>{if(exporting||e.button>0||!canvas)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*logicalWidth()/rect.width,y=(e.clientY-rect.top)*(canvas.height/(canvas.width/logicalWidth()))/rect.height,box=[...(canvas.photoLayout||[])].reverse().find(b=>style.hits(b,x,y));if(!box)return;e.preventDefault();activeTarget=box.target||'background';target.value=activeTarget;view.focus({preventScroll:true});const t=transformFor(activeTarget);zoom.value=String(Math.round(t.zoom*100));gesture={pointer:e.pointerId,lastX:e.clientX,lastY:e.clientY,rect,box};view.setPointerCapture?.(e.pointerId);view.classList.add('moving');moveStatus.textContent=({background:'배경 사진',before:'시공 전 사진',after:'시공 후 사진',detail:'소재 확대 사진',exterior:'주택 외관 사진'})[activeTarget]+' 위치 조절 중';});
 view.addEventListener('pointermove',e=>{if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();const b=gesture.box,t=transformFor(activeTarget),width=b.width??b.w,height=b.height??b.h,dx=(e.clientX-gesture.lastX)*logicalWidth()/gesture.rect.width,dy=(e.clientY-gesture.lastY)*(canvas.height/(canvas.width/logicalWidth()))/gesture.rect.height,availableY=b.availableHeight??b.sourceHeight;const x=Math.max(0,Math.min(1,t.x-dx*b.sw/width/Math.max(1,b.sourceWidth-b.sw))),y=Math.max(0,Math.min(1,t.y-dy*b.sh/height/Math.max(1,availableY-b.sh)));putTransform(activeTarget,{...t,x,y});gesture.lastX=e.clientX;gesture.lastY=e.clientY;scheduleAuto(32);});
 function endGesture(e){if(!gesture||gesture.pointer!==e.pointerId)return;gesture=null;view.classList.remove('moving');view.releasePointerCapture?.(e.pointerId);persist();moveStatus.textContent='사진 위치를 저장했습니다. PNG와 게시세트에도 같은 구도가 적용됩니다.';scheduleAuto(32);}
 view.addEventListener('pointerup',endGesture);view.addEventListener('pointercancel',endGesture);
 window.addEventListener('marketing:output-change',event=>{
  const format=event.detail?.format;if(!covers.formats[format])return;
  if(layout.value==='channels'){channel.value=format;title.value=titles[format]||'';}
  else ratio.value=format==='youtubeCover'?'landscape':['reels','shorts'].includes(format)?'vertical':['naverCover','kakao'].includes(format)?'square':'portrait';
  remember();showFields();showThumbnail();scheduleAuto(0);
 });
 window.CheonginThumbnailEditor={
  selectTarget,
  async renderCover(previewOnly){const c=await draw({previewOnly});c.dataset.thumbnail='true';return c;},
  setLogo(key){if(!Object.hasOwn(style.colors,key))return;logoTone.value=key;remember();scheduleAuto(0);window.renderProductionWorkspace?.();},
  applyCopy(v,raw){
   const facts=Object.fromEntries(['location','product','spec','structure'].filter(k=>v[k]).map(k=>[k,v[k]]));
   if(v.thumbnailTitle){facts.title=v.thumbnailTitle;title.value=v.thumbnailTitle;if(layout.value==='channels')titles[channel.value]=title.value;else legacyTitle=title.value;}
   if(v.location)siteInput.value=v.location;
   if(v.structure)state.productStructure=v.structure;
   if(v.slideTitles)facts.slideTitles=[...v.slideTitles,...(state.manualOverlay?.slideTitles||[]).slice(v.slideTitles.length)];
   state.manualOverlay={...state.manualOverlay,...facts,raw};
   for(const [key,a] of Object.entries(areas))if(v[key])a.value=v[key];
   state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();state.signatureCaptionKey='';
   remember();scheduleAuto(0);if(typeof scheduleChannels==='function')scheduleChannels();
   window.renderProductionWorkspace?.();
  },
  facts:values,setFacts(next){for(const key of ['firstScene','secondScene']){if(key in next){state.thumbnailPosting[key]=next[key].trim();remember();scheduleAuto(0);return;}}if('title'in next){areas.thumbnailTitle.value=next.title;state.thumbnailPosting.pack=readPack();title.value=next.title;if(layout.value==='channels')titles[channel.value]=next.title;else legacyTitle=next.title;}if('location'in next)siteInput.value=next.location;state.manualOverlay={...state.manualOverlay,...Object.fromEntries(Object.entries(next).filter(([k])=>k!=='title'))};remember();scheduleAuto(0);},get:transformFor,set(role,value){putTransform(role,value);activeTarget=role;target.value=role;zoom.value=String(Math.round(value.zoom*100));persist();scheduleAuto(0);},
  refresh(){scheduleAuto(0);},busy:()=>exporting||importing
 };
 const base=window.renderProductionWorkspace;window.renderProductionWorkspace=function(...args){refresh();return base.apply(this,args);};refresh();
 const watch=setInterval(()=>{if(!card.isConnected){clearInterval(watch);clearTimeout(autoTimer);return;}if(!document.hidden)refresh();},650);
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('thumbnail mode',e);}},250);window.addEventListener('marketing:ready',mount);
})();


