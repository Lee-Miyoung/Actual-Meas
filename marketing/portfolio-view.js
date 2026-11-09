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
// Company consultation range is separate from a project's installed product.
const consultationBrands=Object.freeze(['동화','구정','노바','한솔','네스트']);
function installedProduct(meta){
  const p=meta.productData||{},model=String(p.model||'').trim();
  if(!model||p.id==='unconfirmed'||String(p.id||'').startsWith('category:')||/^(제품\s*(정보\s*)?(미입력|미정|미선택|미지정)|미확인|미지정|선택 안 함|강마루|마감재)$/.test(model))return '';
  return [p.brand,model,String(p.id||'').includes('::')?p.color:''].filter(Boolean).join(' ');
}
function selectionFooter(meta){
  const section=node('section',undefined,'portfolio-selection');section.setAttribute('aria-label','소재 선택과 시공 제품 정보');
  const heading=node('h3'),wall=meta.productData?.type==='wall';
  heading.append(node('span',wall?'우리 집에 어울리는 벽장재,':'우리 집에 어울리는 바닥재,'),node('span','사진과 샘플로 함께 비교해보세요'));
  const description=node('p',undefined,'portfolio-selection-description');description.append(node('span','공간의 분위기와 생활 방식에 맞춰'),node('span','마루와 벽장재를 편하게 선택할 수 있도록 안내합니다.'));
  const facts=node('dl',undefined,'portfolio-selection-facts');
  const add=(label,value,key)=>{const row=node('div');row.dataset.fact=key;row.append(node('dt',label),node('dd',value));facts.append(row);};
  const product=installedProduct(meta);if(product)add('시공 제품',product,'installed-product');
  add('상담 가능 자재',consultationBrands.join(' · ')+' 외','consultation-brands');
  section.append(heading,description,facts);return section;
}
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
  const copy=node('div',undefined,'portfolio-case-copy');
  // Retain the project's existing title and notes as a photographic caption.
  if(meta.title||meta.detail){const caption=node('div',undefined,'portfolio-case-caption');if(meta.title)caption.append(node('p',meta.title,'portfolio-caption-title'));if(meta.detail)caption.append(node('p',meta.detail));copy.append(caption);}
  copy.append(selectionFooter(meta));article.append(head,photos,copy);return article;
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
