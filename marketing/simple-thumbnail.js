(function(){
'use strict';
let mounted=false,previewCanvas=null;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function photoById(id){return (state.photos||[]).find(p=>p.id===id);}
function defaultByRole(role,pattern){
 const byRole=(state.photos||[]).find(p=>state.signaturePhotos?.[p.id]?.role===role);
 if(byRole)return byRole;
 if(pattern)return (state.photos||[]).find(p=>pattern.test(p.name||''));
 return null;
}
function cover(ctx,img,x,y,w,h,focus=.5){
 const s=Math.max(w/img.width,h/img.height),sw=w/s,sh=h/s;
 const sx=(img.width-sw)/2,sy=(img.height-sh)*Math.max(0,Math.min(1,focus));
 ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
async function renderedPhoto(p,max=2200){
 const im=await photoImage(p),was=original;original=false;
 try{return transformed(im,p.adjust,max);}finally{original=was;}
}
async function drawThumb(after,before,exterior,site,work){
 if(!after)throw Error('대표 시공 후 사진을 선택하세요.');
 await Promise.all([document.fonts.load('400 72px "Studio Serif"',site+work),document.fonts.load('400 24px "Studio Sans"','시공 전 시공 후 외관 청인마루')]);
 const c=document.createElement('canvas');c.width=1080;c.height=1920;
 const g=c.getContext('2d');g.fillStyle='#eeeae1';g.fillRect(0,0,c.width,c.height);
 const gap=8,hasSide=!!(before||exterior),leftW=hasSide?330:0,rightX=hasSide?leftW+gap:0,rightW=1080-rightX;
 const resources=[];
 try{
  const ai=await renderedPhoto(after);resources.push(ai);
  cover(g,ai,rightX,0,rightW,1920,state.signaturePhotos?.[after.id]?.focusY??.55);
  if(before&&exterior){
   const ei=await renderedPhoto(exterior),bi=await renderedPhoto(before);resources.push(ei,bi);
   cover(g,ei,0,0,leftW,900,state.signaturePhotos?.[exterior.id]?.focusY??.5);
   cover(g,bi,0,900+gap,leftW,1920-900-gap,state.signaturePhotos?.[before.id]?.focusY??.5);
  }else if(exterior||before){
   const p=exterior||before,pi=await renderedPhoto(p);resources.push(pi);
   cover(g,pi,0,0,leftW,1920,state.signaturePhotos?.[p.id]?.focusY??.5);
  }

  if(hasSide){g.fillStyle='rgba(244,240,232,.95)';g.fillRect(leftW,0,gap,1920);if(before&&exterior)g.fillRect(0,900,leftW,gap);}

  const gradient=g.createLinearGradient(0,1030,0,1640);
  gradient.addColorStop(0,'rgba(15,15,13,0)');
  gradient.addColorStop(.45,'rgba(15,15,13,.16)');
  gradient.addColorStop(1,'rgba(15,15,13,.66)');
  g.fillStyle=gradient;g.fillRect(rightX,1030,rightW,610);

  function label(text,x,y){g.save();g.font='400 21px "Studio Sans"';g.fillStyle='rgba(255,255,255,.9)';g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=5;g.fillText(text,x,y);g.restore();}
  label('시공 후',rightX+rightW-112,52);
  if(exterior)label('외관',24,118);
  if(before)label('시공 전',24,exterior?952:118);

  try{
   const mark=await loadImage('brand/watermark-white.svg');
   const mw=176,mh=mw*mark.height/mark.width;
   g.save();g.globalAlpha=.94;g.shadowColor='rgba(0,0,0,.34)';g.shadowBlur=6;g.drawImage(mark,40,40,mw,mh);g.restore();mark.src='';
  }catch(_){}

  const tx=rightX+Math.max(50,Math.round(rightW*.08)),tw=rightW-Math.max(100,Math.round(rightW*.16));
  g.fillStyle='rgba(255,255,255,.72)';g.fillRect(tx,1190,62,2);
  g.save();g.fillStyle='#fff';g.shadowColor='rgba(0,0,0,.42)';g.shadowBlur=8;g.textAlign='left';
  g.font='400 50px "Studio Serif"';g.fillText(site||'청인마루 시공 현장',tx,1260);
  g.font='400 68px "Studio Serif"';
  const words=Array.from(work||'마루 시공');let line='',y=1360,lines=[];
  for(const ch of words){if(g.measureText(line+ch).width>tw&&line){lines.push(line);line=ch;}else line+=ch;}
  if(line)lines.push(line);
  lines.slice(0,2).forEach((line,i)=>g.fillText(line,tx,y+i*88));
  g.restore();

  return c;
 }finally{for(const r of resources){r.width=r.height=1;}}
}
function mount(){
 if(mounted)return;
 const grid=document.querySelector('.simple-input-grid');
 if(!grid||!state?.photos)return;
 mounted=true;
 const card=el('details',undefined,'simple-thumbnail-card');card.open=true;
 const sum=el('summary'),sumTitle=el('span','4. 썸네일 만들기'),sumNote=el('small','외관 + 시공 전 + 시공 후');
 sum.append(sumTitle,sumNote);card.append(sum);
 const body=el('div',undefined,'simple-thumbnail-body');
 const selects=el('div',undefined,'simple-thumbnail-selects');
 const afterSel=el('select'),beforeSel=el('select'),exteriorSel=el('select');
 for(const [name,sel]of[['대표 시공 후',afterSel],['시공 전 · 선택',beforeSel],['단독주택 외관 · 선택',exteriorSel]]){const l=el('label',name);l.append(sel);selects.append(l);}
 const site=el('input');site.placeholder='예: 춘천 석사동';
 const work=el('input');work.placeholder='예: 신축주택 마루 시공';
 const siteL=el('label','제목 1줄');siteL.append(site);const workL=el('label','제목 2줄');workL.append(work);
 const titles=el('div',undefined,'simple-two');titles.append(siteL,workL);
 const actions=el('div',undefined,'simple-actions'),preview=el('button','썸네일 미리보기'),save=el('button','썸네일 PNG 저장','primary');preview.type=save.type='button';actions.append(preview,save);
 const view=el('div',undefined,'simple-thumbnail-preview');view.append(el('p','사진을 선택하면 이곳에 썸네일이 표시됩니다.','simple-help'));
 body.append(selects,titles,actions,el('p','릴스 세로 표지 기준. 중요한 제목은 가운데 안전 영역에 두고, 외관·전·후 사진은 얇은 선으로만 나눕니다.','simple-help'),view);card.append(body);
 const output=grid.querySelector('.simple-output-card');if(output)grid.insertBefore(card,output);else grid.append(card);

 function options(sel,empty){
  const was=sel.value;sel.replaceChildren(new Option(empty,''),...(state.photos||[]).map(p=>new Option(p.name,p.id)));
  if([...sel.options].some(o=>o.value===was))sel.value=was;
 }
 function refresh(){
  options(afterSel,'대표 시공 후 선택');options(beforeSel,'시공 전 없음');options(exteriorSel,'외관 없음');
  if(!afterSel.value){const p=defaultByRole('after',/after|완공|시공.?후/i)||state.photos?.[0];if(p)afterSel.value=p.id;}
  if(!beforeSel.value){const p=defaultByRole('before',/before|시공.?전|철거.?전/i);if(p)beforeSel.value=p.id;}
  if(!exteriorSel.value){const p=defaultByRole('',/외관|전경|exterior|facade|house|주택.?외부/i);if(p)exteriorSel.value=p.id;}
  if(document.activeElement!==site)site.value=state.region||state.title||'';
  if(document.activeElement!==work&&!work.value)work.value=/단독|주택/.test([state.title,state.space].join(' '))?'단독주택 마루 시공':'마루 시공';
 }
 async function render(){
  const c=await drawThumb(photoById(afterSel.value),photoById(beforeSel.value),photoById(exteriorSel.value),site.value.trim(),work.value.trim());
  if(previewCanvas)previewCanvas.width=previewCanvas.height=1;previewCanvas=c;view.replaceChildren(c);
  return c;
 }
 preview.onclick=async()=>{try{await render();}catch(e){toast(e.message);}};
 save.onclick=async()=>{try{const c=previewCanvas||await render();await new Promise(resolve=>c.toBlob(b=>{if(b)download(b,'청인마루_썸네일.png');resolve();},'image/png'));}catch(e){toast(e.message);}};
 const base=window.renderProductionWorkspace;window.renderProductionWorkspace=function(...args){refresh();return base.apply(this,args);};
 refresh();
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('thumbnail mode',e);}},250);
window.addEventListener('marketing:ready',()=>{try{mount();}catch(e){console.error(e);}});
})();