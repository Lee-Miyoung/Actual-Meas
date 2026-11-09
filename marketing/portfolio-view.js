/* Photo portfolio interactions. UI state only; no source images are copied into storage. */
(function(){
'use strict';
const preview=$('production-preview'),zoom=node('dialog');zoom.id='portfolio-zoom';zoom.setAttribute('aria-label','시공 사진 확대');document.body.append(zoom);
let zoomRevision=0,swipedAt=0,pointer;
const pendingThumbs=new Map();
const thumbObserver=window.IntersectionObserver?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){const img=entry.target,p=pendingThumbs.get(img);thumbObserver.unobserve(img);pendingThumbs.delete(img);if(p)photoImage(p).then(()=>{if(img.isConnected&&p.thumbnail)img.src=p.thumbnail;}).catch(()=>{img.alt='사진을 읽지 못했습니다';});}
},{root:$('production-filmstrip'),rootMargin:'0px 80px'}):null;
window.resetPortfolioThumbs=()=>{thumbObserver?.disconnect();pendingThumbs.clear();};
window.ensurePortfolioThumb=(img,p)=>{if(thumbObserver){pendingThumbs.set(img,p);thumbObserver.observe(img);}else photoImage(p).then(()=>{if(img.isConnected)img.src=p.thumbnail||'';}).catch(()=>{});};
window.createPortfolioComparison=function(output){
  if(output.photoLayout?.length!==2||!output.photoLayout.every(p=>p.fit==='pair-contain'))return null;
  const meta=output.previewMeta||{},article=node('article',undefined,'portfolio-comparison');
  const head=node('div',undefined,'portfolio-case-head'),logo=node('img');logo.src='brand/logo-charcoal.svg';logo.alt='청인마루 · 공간의 위로가 되다';logo.width=124;logo.height=48;
  head.append(logo,node('span',meta.site));const photos=node('div',undefined,'portfolio-pair');
  const scale=output.width/1080;
  output.photoLayout.forEach((p,i)=>{
    const figure=node('figure'),label=node('figcaption',i?'시공 후':'시공 전'),image=node('canvas');
    image.width=Math.max(1,Math.round(p.width*scale));image.height=Math.max(1,Math.round(p.height*scale));
    image.getContext('2d').drawImage(output,p.x*scale,p.y*scale,p.width*scale,p.height*scale,0,0,image.width,image.height);
    image.className='portfolio-photo';image.setAttribute('aria-label',(i?'시공 후':'시공 전')+' 사진 크게 보기');image.tabIndex=0;image.setAttribute('role','button');
    figure.append(label,image);photos.append(figure);
  });
  const copy=node('div',undefined,'portfolio-case-copy');copy.append(node('h3',meta.title));if(meta.detail)copy.append(node('p',meta.detail));if(meta.product)copy.append(node('small',meta.product));
  article.append(head,photos,copy);return article;
};
function clearZoom(){zoomRevision++;for(const c of zoom.querySelectorAll('canvas'))releaseCanvas(c);zoom.replaceChildren();}
zoom.addEventListener('close',clearZoom);
function closeZoom(){if(zoom.open)zoom.close();}
window.openPortfolioZoom=async function(){
  if(performance.now()-swipedAt<400||!state.photos.length)return;
  clearZoom();const revision=zoomRevision;
  const toolbar=node('div',undefined,'portfolio-zoom-tools'),title=node('span','시공 기록'),magnify=node('button','확대'),close=node('button','닫기');
  magnify.type=close.type='button';close.onclick=closeZoom;magnify.disabled=true;
  toolbar.append(title,magnify,close);const stage=node('div',undefined,'portfolio-zoom-stage');stage.append(node('p','사진을 불러오고 있습니다.'));zoom.append(toolbar,stage);
  if(!zoom.open)zoom.showModal();
  try{
    const current=$('designs').querySelector('canvas'),slide=Number(current?.dataset.slide||0);
    const c=await card(state.theme,slide,state.format,false,{maxEdge:1440});
    if(revision!==zoomRevision||!zoom.open){releaseCanvas(c);return;}
    c.setAttribute('aria-label','시공 기록 확대 이미지');stage.replaceChildren(c);magnify.disabled=false;
    magnify.onclick=()=>{const enlarged=stage.classList.toggle('is-enlarged');magnify.textContent=enlarged?'화면에 맞추기':'확대';magnify.setAttribute('aria-pressed',String(enlarged));};
  }catch(e){if(revision===zoomRevision)stage.replaceChildren(node('p','사진을 표시하지 못했습니다. 닫은 뒤 다시 시도해 주세요.'));}
};
preview.addEventListener('click',e=>{if(e.target instanceof HTMLCanvasElement)window.openPortfolioZoom();});
preview.addEventListener('keydown',e=>{if(e.target.tagName!=='CANVAS')return;if(['Enter',' '].includes(e.key)){e.preventDefault();window.openPortfolioZoom();}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();$(e.key==='ArrowLeft'?'production-prev':'production-next').click();}});
preview.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.pointerType!=='mouse')pointer={id:e.pointerId,x:e.clientX,y:e.clientY};},{passive:true});
preview.addEventListener('pointercancel',()=>{pointer=null;},{passive:true});
preview.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){swipedAt=performance.now();$(dx<0?'production-next':'production-prev').click();}},{passive:true});
// A hidden page releases only temporary viewing resources. Project edits stay in IndexedDB.
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeZoom();});
})();
