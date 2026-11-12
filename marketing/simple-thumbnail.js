/* Architectural photo covers: one real image, three fixed layouts, one posting pack. */
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
function mount(){
 if(mounted)return;const grid=document.querySelector('.simple-input-grid');if(!grid||!state?.photos)return;mounted=true;
 const card=el('details',undefined,'simple-thumbnail-card');card.open=true;const sum=el('summary');sum.append(el('span','5. 썸네일 · 게시 문구 한 세트'),el('small','실제 사진 한 장 · 고정 포맷 3종'));card.append(sum);
 const body=el('div',undefined,'simple-thumbnail-body'),fields=el('div',undefined,'simple-thumbnail-selects');
 function field(label,input){const l=el('label',label);l.append(input);fields.append(l);return input;}
 const photo=field('표지 사진',el('select')),layout=field('썸네일 포맷',el('select')),ratio=field('출력 비율',el('select'));
 for(const [k,v]of [['space','A. 공간 화보 · 아래쪽 제목'],['light','B. 빛과 여백 · 위쪽 제목'],['material','C. 소재 기록 · 제품 중심']])layout.add(new Option(v,k));
 for(const [k,v]of [['portrait','인스타 · 4:5'],['vertical','릴스·쇼츠 · 9:16'],['landscape','유튜브 · 16:9']])ratio.add(new Option(v,k));
 const title=el('textarea');title.rows=2;title.maxLength=48;title.id='thumbnail-editorial-title';const titleLabel=el('label','썸네일 제목 · 짧게 두 줄까지');titleLabel.append(title);
 const actions=el('div',undefined,'simple-actions'),preview=el('button','미리보기'),save=el('button','썸네일 PNG 저장'),bundle=el('button','썸네일 + 게시 문구 ZIP','primary');for(const b of [preview,save,bundle])b.type='button';actions.append(preview,save,bundle);
 const view=el('div',undefined,'simple-thumbnail-preview');view.append(el('p','완성 공간 또는 소재 사진 한 장을 선택하세요.','simple-help'));
 const packBox=el('div',undefined,'posting-pack');packBox.append(el('h3','게시할 문구 · 각 항목 수정 후 복사'));
 const areas={};for(const [key,label]of [['thumbnailTitle','썸네일 제목'],['postTitle','게시물·영상 제목'],['instagramCaption','인스타 캡션'],['youtubeDescription','유튜브 설명글'],['pinnedComment','고정댓글'],['hashtags','해시태그']]){const l=el('label',label),a=el('textarea');a.rows=key.includes('Caption')||key.includes('Description')?6:2;a.setAttribute('aria-label',label);const copy=el('button','복사');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(a.value);toast('복사했습니다.');}catch{a.focus();a.select();toast('선택한 문구를 복사해 주세요.');}};l.append(a,copy);packBox.append(l);areas[key]=a;a.onchange=()=>{state.thumbnailPosting??={};state.thumbnailPosting.pack=readPack();persist();};}
 const prepare=el('button','현재 사진·제품으로 게시 문구 준비');prepare.type='button';
 body.append(fields,titleLabel,el('p','표지는 한 장으로 완성합니다. 전후 비교는 캐러셀의 다음 장에 배치하세요. 사진은 일부 크롭되므로 바닥과 공간의 구도를 확인해 주세요.','simple-help'),actions,view,prepare,packBox);card.append(body);const output=grid.querySelector('.simple-output-card');if(output)grid.insertBefore(card,output);else grid.append(card);
 let projectKey='',photoKey='',canvas=null,revision=0;
 function values(){const p=typeof selectedProduct==='function'?selectedProduct():null,m=state.manualOverlay||{};return {title:title.value.trim(),location:m.location||state.region||'',product:m.product||(p?[p.brand,p.model,p.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):''),spec:m.spec||p?.size||'',structure:m.structure||state.productStructure||''};}
 function readPack(){return Object.fromEntries(Object.entries(areas).map(([k,a])=>[k,a.value]));}
 function preparePack(){const pack=postingPack(values());for(const [k,a]of Object.entries(areas))a.value=pack[k]||'';state.thumbnailPosting??={};state.thumbnailPosting.pack=pack;persist();}
 prepare.onclick=preparePack;
 areas.thumbnailTitle.onchange=()=>{title.value=areas.thumbnailTitle.value;remember();state.thumbnailPosting.pack=readPack();persist();};
 function remember(){state.thumbnailPosting={...state.thumbnailPosting,photoId:photo.value,layout:layout.value,ratio:ratio.value,title:title.value};persist();}
 for(const input of [photo,layout,ratio,title])input.onchange=()=>{remember();if(canvas){canvas.width=canvas.height=1;canvas=null;}view.replaceChildren(el('p','설정이 바뀌었습니다. 미리보기를 눌러 확인하세요.','simple-help'));};
 function refresh(){const key=state.projectId||'current',ids=state.photos.map(p=>p.id).join('|');if(projectKey!==key){projectKey=key;photoKey='';const saved=state.thumbnailPosting||{};title.value=saved.title||state.manualOverlay?.title||'마루가 완성한 공간';layout.value=saved.layout||'space';ratio.value=saved.ratio||'portrait';for(const [k,a]of Object.entries(areas))a.value=saved.pack?.[k]||'';if(canvas){canvas.width=canvas.height=1;canvas=null;}view.replaceChildren(el('p','사진을 선택하고 미리보기를 눌러 주세요.','simple-help'));}if(photoKey!==ids){photoKey=ids;const saved=state.thumbnailPosting?.photoId;photo.replaceChildren(...state.photos.map(p=>new Option(p.name,p.id)));const best=state.photos.find(p=>state.signaturePhotos?.[p.id]?.role==='after')||state.photos.find(p=>!['before','progress','pair'].includes(state.signaturePhotos?.[p.id]?.role))||state.photos[0];photo.value=state.photos.some(p=>p.id===saved)?saved:best?.id||'';}}
 async function draw(){
  const p=state.photos.find(p=>p.id===photo.value);if(!p)throw Error('표지 사진을 먼저 선택하세요.');const v=values(),mode=layout.value,[W,H]=ratio.value==='landscape'?[1280,720]:ratio.value==='vertical'?[1080,1920]:[1080,1350];const c=el('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),s=W/1080,h=H/s,vertical=ratio.value==='vertical',wide=ratio.value==='landscape',m=wide?58:72,safeTop=vertical?220:76,safeBottom=vertical?360:100;
  const im=await photoImage(p),was=original;let image;original=false;try{image=transformed(im,p.adjust,2200);}finally{original=was;}if(image?.then)image=await image;
  try{g.scale(s,s);const z=Math.max(1080/image.width,h/image.height),sw=1080/z,sh=h/z,focus=state.signaturePhotos?.[p.id]?.focusY??.55;g.drawImage(image,(image.width-sw)/2,(image.height-sh)*Math.max(0,Math.min(1,focus)),sw,sh,0,0,1080,h);}finally{releaseCanvas(image);}
  await Promise.all([document.fonts.load('400 78px "Studio Serif"',v.title),document.fonts.load('400 30px "Studio Sans"',v.product+v.location+v.spec)]);
  const light=mode==='light',start=light?0:Math.max(0,h-(wide?360:640)),end=light?Math.min(h,wide?460:850):h,gradient=g.createLinearGradient(0,start,0,end);gradient.addColorStop(0,light?'rgba(10,13,9,.64)':'rgba(10,13,9,0)');gradient.addColorStop(1,light?'rgba(10,13,9,0)':'rgba(10,13,9,.68)');g.fillStyle=gradient;g.fillRect(0,start,1080,end-start);
  const mark=await loadImage('brand/wordmark-ivory.svg');try{const mw=208;g.globalAlpha=.92;g.drawImage(mark,m,safeTop,mw,mw*mark.height/mark.width);g.globalAlpha=1;}finally{mark.src='';}
  function text(value,y,size,rows=1,serif=false,alpha=1){if(!value)return 0;const family=serif?'Studio Serif':'Studio Sans',r=CheonginType.layout(value,{width:1080-m*2,fontSize:size,minFontSize:serif?50:25,maxLines:rows,leading:1.3,measure:(str,n)=>{g.font=`400 ${n}px "${family}"`;return g.measureText(str).width;}});g.font=`400 ${r.size}px "${family}"`;g.textBaseline='top';g.fillStyle=`rgba(255,255,255,${alpha})`;g.shadowColor='#0006';g.shadowBlur=4;r.lines.forEach((line,i)=>g.fillText(line,m,y+i*r.lineHeight));g.shadowBlur=0;return r.lines.length*r.lineHeight;}
  const base=light?safeTop+135:h-safeBottom-(wide?175:230);
  if(mode==='material'){text(v.product||v.title,base,wide?49:67,2,true);text([v.spec,v.structure].filter(Boolean).join(' · '),base+(wide?133:180),28,1,false,.88);}else{text(v.title,base,wide?62:78,2,true);text(v.location,base+(wide?151:210),28,1,false,.88);}
  c.dataset.template=mode;c.dataset.renderer='cheongin-editorial-cover-v3';return c;
 }
 async function render(){const version=++revision;const c=await draw();if(version!==revision){releaseCanvas(c);throw Error('설정이 바뀌었습니다. 다시 미리보기를 눌러 주세요.');}if(canvas)releaseCanvas(canvas);canvas=c;view.replaceChildren(c);return c;}
 const busyButtons=[preview,save,bundle];async function run(fn){busyButtons.forEach(b=>b.disabled=true);try{await fn();}catch(e){toast(e.message);}finally{busyButtons.forEach(b=>b.disabled=false);}}
 function blobOf(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('이미지 저장에 실패했습니다.')),'image/png'));}
 preview.onclick=()=>run(render);save.onclick=()=>run(async()=>download(await blobOf(await render()),'청인마루_썸네일.png'));
 bundle.onclick=()=>run(async()=>{if(!areas.thumbnailTitle.value)preparePack();const pack=readPack(),c=await render(),blob=await blobOf(c);const labels={thumbnailTitle:'썸네일 제목',postTitle:'게시물·영상 제목',instagramCaption:'인스타 캡션',youtubeDescription:'유튜브 설명글',pinnedComment:'고정댓글',hashtags:'해시태그'};const txt=Object.entries(pack).map(([k,v])=>labels[k]+'\n'+v).join('\n\n────────\n\n');const zipped=fflate.zipSync({'01_썸네일.png':new Uint8Array(await blob.arrayBuffer()),'02_게시문구.txt':fflate.strToU8(txt),'03_게시문구.json':fflate.strToU8(JSON.stringify(pack,null,2))});if(typeof offerPhotoFiles==='function')offerPhotoFiles([{name:'01_썸네일.png',blob}]);download(new Blob([zipped],{type:'application/zip'}),'청인마루_게시세트.zip');});
 const base=window.renderProductionWorkspace;window.renderProductionWorkspace=function(...args){refresh();return base.apply(this,args);};refresh();
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('thumbnail mode',e);}},250);window.addEventListener('marketing:ready',mount);
})();
