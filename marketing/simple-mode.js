(function(){
'use strict';

let simpleReady=false;

function el(tag,text,cls){
  const n=document.createElement(tag);
  if(text!==undefined)n.textContent=text;
  if(cls)n.className=cls;
  return n;
}
function option(value,label){return new Option(label,value);}
function uniq(list){return [...new Set(list.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ko'));}

function inferStructure(product){
  if(!product)return '';
  const hay=[product.type,product.category,product.material,product.model].filter(Boolean).join(' ');
  if(product.type==='wall'||/벽장재|시그니월/.test(hay))return '벽장재';
  if(/원목/.test(hay))return '원목마루';
  if(/\bSPC\b|에스피씨/i.test(hay))return 'SPC';
  if(/HDF|보드형|보드 강마루|보드강마루/i.test(hay))return '보드형 강마루(HDF)';
  if(/합판|합판형/i.test(hay))return '합판형 강마루';
  return '';
}
function currentProduct(){
  try{return Writer.resolveProduct(state.catalog,state.authoring?.productKey||'');}
  catch(_){return null;}
}
function currentFamilyId(){
  return String(state.authoring?.productKey||'').split('::')[0];
}
function currentVariantId(){
  return String(state.authoring?.productKey||'').split('::')[1]||'';
}
function syncStateChange(){
  state.signatureCaptionKey='';
  if(typeof indexCurrent==='function')indexCurrent();
  persist();
  if(typeof scheduleChannels==='function')scheduleChannels();
  window.renderProductionWorkspace?.();
}
function ensureFixedDesign(resetSequence=false){
  if(!state.photos?.length)return;
  const current=state.signatureDesign;
  if(!current?.photoEdition){
    const cfg=SignatureCore.create();
    cfg.archiveVersion=1;
    cfg.photoEdition=1;
    cfg.type.title='Pretendard';
    cfg.type.body='Pretendard';
    state.signatureDesign=cfg;
    state.consistentPreviousDesign??=current?SignatureCore.copy({design:current,sequence:state.signatureSequence}):null;
    if(resetSequence)window.signaturePhotoImport?.();
    persist();
  }
}

function init(){
  if(simpleReady)return;
  const studio=document.getElementById('studio');
  const desk=studio?.querySelector('.production-desk');
  const productionFiles=document.getElementById('production-files');
  if(!studio||!desk||!productionFiles||!window.ProductFinder||!window.SignatureCore||!state?.catalog||!state.authoring)return;
  simpleReady=true;

  document.body.classList.add('simple-marketing-mode');
  document.querySelector('[data-tab="studio"]')?.click();

  const panel=el('section',undefined,'simple-marketing-panel');
  panel.id='simple-marketing-panel';

  const top=el('div',undefined,'simple-marketing-heading');
  const titleWrap=el('div');
  titleWrap.append(el('h1','청인마루 현장 콘텐츠'),el('p','보정 완료 사진과 문구를 넣으면 같은 형식으로 바로 출력됩니다.'));
  const advanced=el('button','전체 기능 보기','simple-advanced-toggle');
  advanced.type='button';
  advanced.onclick=()=>{
    const simple=document.body.classList.toggle('simple-marketing-mode');
    advanced.textContent=simple?'전체 기능 보기':'간단 화면으로';
    if(simple)document.querySelector('[data-tab="studio"]')?.click();
  };
  top.append(titleWrap,advanced);

  const grid=el('div',undefined,'simple-input-grid');

  const photoCard=el('section',undefined,'simple-card simple-photo-card');
  photoCard.append(el('strong','1. 현장 사진'));
  const photoLabel=el('label','사진 1–10장 선택','simple-file-label');
  const photoInput=el('input'); photoInput.type='file'; photoInput.multiple=true;
  photoInput.accept='image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
  photoLabel.append(photoInput);
  const photoStatus=el('p','사진을 선택하면 기존 보정·미리보기 기능에 자동 연결됩니다.','simple-help');
  photoCard.append(photoLabel,photoStatus);

  const siteCard=el('section',undefined,'simple-card');
  siteCard.append(el('strong','2. 현장 정보'));
  const region=el('input'); region.id='simple-region'; region.placeholder='예: 춘천 석사동';
  const space=el('input'); space.id='simple-space'; space.placeholder='예: 단독주택 거실';
  const row=el('div',undefined,'simple-two');
  const regionLabel=el('label','지역'); regionLabel.append(region);
  const spaceLabel=el('label','공간'); spaceLabel.append(space);
  row.append(regionLabel,spaceLabel);
  siteCard.append(row);

  const productDetails=el('details',undefined,'simple-product-accordion');
  productDetails.open=true;
  const summary=el('summary');
  const summaryTitle=el('span','3. 제품 선택');
  const summaryValue=el('small','제품을 선택하세요');
  summary.append(summaryTitle,summaryValue);
  productDetails.append(summary);

  const productBody=el('div',undefined,'simple-product-body');
  const brand=el('select'); brand.id='simple-brand';
  const family=el('select'); family.id='simple-family';
  const variant=el('select'); variant.id='simple-variant';
  const structure=el('select'); structure.id='simple-structure';
  structure.replaceChildren(
    option('','구조 표기 안 함'),
    option('합판형 강마루','합판형 강마루'),
    option('보드형 강마루(HDF)','보드형 강마루(HDF)'),
    option('원목마루','원목마루'),
    option('SPC','SPC'),
    option('벽장재','벽장재'),
    option('기타','기타')
  );
  const productGrid=el('div',undefined,'simple-product-grid');
  for(const [labelText,control] of [['브랜드',brand],['제품명',family],['모델명',variant],['구조',structure]]){
    const l=el('label',labelText); l.append(control); productGrid.append(l);
  }
  const spec=el('p','규격: 제품을 선택하세요','simple-product-spec');
  productBody.append(productGrid,spec);
  productDetails.append(productBody);

  const outputCard=el('section',undefined,'simple-card simple-output-card');
  outputCard.append(el('strong','6. 출력'));
  const format=el('select'); format.id='simple-format';
  format.replaceChildren(
    option('carousel','인스타 피드 4:5'),
    option('reels','인스타 릴스 9:16'),
    option('shorts','유튜브 쇼츠 9:16'),
    option('naverCover','네이버 블로그 표지 1:1'),
    option('youtubeCover','유튜브 16:9'),
    option('kakao','카카오 1:1')
  );
  const formatLabel=el('label','크기'); formatLabel.append(format);
  const actions=el('div',undefined,'simple-actions');
  const previewBtn=el('button','미리보기 새로고침');
  const saveBtn=el('button','사진 + 캡션 저장','primary');
  previewBtn.type=saveBtn.type='button';
  actions.append(previewBtn,saveBtn);
  outputCard.append(formatLabel,actions,el('p','선택한 채널의 표지와 본문 콘텐츠를 저장합니다.','simple-help'));

  grid.append(photoCard,siteCard,productDetails,outputCard);
  panel.append(top,grid);
  desk.prepend(panel);

  function fillBrands(){
    const now=currentProduct();
    const brands=uniq(state.catalog.filter(p=>!/단종|출시 전|재고 없음/.test(p.status||'')).map(p=>p.brand));
    brand.replaceChildren(option('','브랜드 선택'),...brands.map(v=>option(v,v)));
    brand.value=now?.brand||'';
    fillFamilies();
  }
  function fillFamilies(){
    const fid=currentFamilyId(), list=state.catalog.filter(p=>(!brand.value||p.brand===brand.value)&&!/단종|출시 전|재고 없음/.test(p.status||''));
    family.replaceChildren(option('','제품명 선택'),...list.map(p=>option(p.id,p.model||p.category||p.id)));
    if(list.some(p=>p.id===fid))family.value=fid;
    fillVariants();
  }
  function fillVariants(){
    const p=state.catalog.find(p=>p.id===family.value),vid=currentVariantId();
    const vars=(p?.variants||[]).filter(v=>!/단종|출시 전|재고 없음/.test(v.status||''));
    variant.replaceChildren(option('',vars.length?'모델명 선택':'세부 모델 없음'),...vars.map(v=>option(v.id,v.name||v.color||v.id)));
    variant.disabled=!vars.length;
    if(vars.some(v=>v.id===vid))variant.value=vid;
    refreshSummary();
  }
  function refreshSummary(){
    const p=currentProduct();
    if(!p){summaryValue.textContent='제품을 선택하세요';spec.textContent='규격: 제품을 선택하세요';return;}
    summaryValue.textContent=[p.brand,p.model,p.color].filter(Boolean).join(' · ');
    spec.textContent='규격: '+(p.size||'등록된 규격 없음')+(state.productStructure?' · '+state.productStructure:'');
    structure.value=state.productStructure||inferStructure(p)||'';
  }
  function choose(){
    if(!family.value)return;
    const key=family.value+(variant.value?'::'+variant.value:'');
    window.ProductFinder.choose('engine',key);
    const p=Writer.resolveProduct(state.catalog,key);
    const inferred=inferStructure(p);
    if(inferred&&!state.productStructure)state.productStructure=inferred;
    refreshSummary();
    syncStateChange();
  }

  brand.onchange=()=>{family.value='';variant.value='';fillFamilies();};
  family.onchange=()=>{fillVariants();choose();};
  variant.onchange=choose;
  structure.onchange=()=>{state.productStructure=structure.value;refreshSummary();syncStateChange();};

  region.onchange=()=>{state.region=region.value.trim();syncStateChange();};
  space.onchange=()=>{state.space=space.value.trim();syncStateChange();};

  format.onchange=()=>{
    state.format=format.value;
    const real=document.getElementById('format');
    if(real){real.value=format.value;real.onchange?.({target:real});}
    persist();window.renderProductionWorkspace?.();
  };

  previewBtn.onclick=()=>{
    ensureFixedDesign(false);
    window.renderProductionWorkspace?.();
    document.querySelector('.desk-preview')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  saveBtn.onclick=()=>{
    ensureFixedDesign(false);
    document.getElementById('production-export')?.click();
  };

  photoInput.onchange=async()=>{
    const files=[...photoInput.files];
    if(!files.length)return;
    if(files.length>10){toast('사진은 10장 이하로 선택하세요.');photoInput.value='';return;}
    const dt=new DataTransfer(); files.forEach(f=>dt.items.add(f));
    productionFiles.files=dt.files;
    photoStatus.textContent='사진을 불러오는 중…';
    productionFiles.dispatchEvent(new Event('change',{bubbles:true}));
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(state.photos?.length||tries>80){
        clearInterval(timer);
        if(state.photos?.length){
          ensureFixedDesign(true);
          photoStatus.textContent='사진 '+state.photos.length+'장 연결됨';
          window.renderProductionWorkspace?.();
        }else photoStatus.textContent='사진을 불러오지 못했습니다. 파일 형식을 확인하세요.';
      }
    },150);
  };

  const baseRender=window.renderProductionWorkspace;
  window.renderProductionWorkspace=function(...args){
    region.value=state.region||'';
    space.value=state.space||'';
    format.value=['carousel','reels','shorts','youtubeCover','naverCover','kakao'].includes(state.format)?state.format:'carousel';
    fillBrands();
    refreshSummary();
    return baseRender.apply(this,args);
  };

  region.value=state.region||'';
  space.value=state.space||'';
  format.value=['carousel','reels','shorts','youtubeCover','naverCover','kakao'].includes(state.format)?state.format:'carousel';
  fillBrands();
  refreshSummary();
  window.renderProductionWorkspace?.();
}

const timer=setInterval(()=>{
  try{init();if(simpleReady)clearInterval(timer);}catch(e){console.error('simple mode init',e);}
},200);
window.addEventListener('marketing:ready',()=>{try{init();}catch(e){console.error(e);}});
})();