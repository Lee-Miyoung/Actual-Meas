(function(){
'use strict';
let mounted=false;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function live(){return (state.catalog||[]).filter(p=>!/단종|출시 전|재고 없음/.test(String(p.status||'')));}
function uniq(a){return [...new Set(a.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ko'));}
function current(){try{return Writer.resolveProduct(state.catalog,state.authoring?.productKey||'');}catch(_){return null;}}
function baseId(){return String(state.authoring?.productKey||'').split('::')[0];}
function variantId(){return String(state.authoring?.productKey||'').split('::')[1]||'';}
function sync(){state.signatureCaptionKey='';if(typeof indexCurrent==='function')indexCurrent();persist();if(typeof scheduleChannels==='function')scheduleChannels();window.renderProductionWorkspace?.();}
function step(title){const d=el('details',undefined,'sp-step'),s=el('summary'),a=el('span',title),b=el('small','선택하세요'),body=el('div',undefined,'sp-options');s.append(a,b);d.append(s,body);return{d,s,a,b,body};}
function opt(text,selected,click){const b=el('button',text,'sp-option'+(selected?' selected':''));b.type='button';b.onclick=click;return b;}
function mount(){
 if(mounted)return;
 const host=document.querySelector('.simple-product-body');
 if(!host||!window.ProductFinder||!state?.catalog||!state.authoring)return;
 mounted=true;
 host.replaceChildren();
 const brandStep=step('브랜드 선택'),productStep=step('제품 선택'),modelStep=step('세부모델 선택');
 brandStep.d.open=true;
 const structure=el('div',undefined,'sp-structure');
 const structureTitle=el('strong','제품 구조');
 const structureSelect=el('select');
 for(const v of ['', '합판형 강마루','보드형 강마루(HDF)','천연광물','원목마루','SPC','강화마루','벽장재','기타 직접입력'])structureSelect.add(new Option(v||'구조 선택',v));
 const custom=el('input');custom.placeholder='직접 입력';custom.maxLength=60;custom.hidden=true;
 const spec=el('p','규격: 제품을 선택하세요','simple-product-spec');
 structure.append(structureTitle,structureSelect,custom);
 host.append(brandStep.d,productStep.d,modelStep.d,structure,spec);

 function refresh(){
  const p=current(),fid=baseId(),vid=variantId(),brand=p?.brand||state.catalog.find(x=>x.id===fid)?.brand||'';
  brandStep.b.textContent=brand||'선택하세요';
  brandStep.body.replaceChildren();
  for(const b of uniq(live().map(p=>p.brand)))brandStep.body.append(opt(b,b===brand,()=>{state.simpleBrand=b;brandStep.b.textContent=b;brandStep.d.open=false;renderProducts(b);productStep.d.open=true;}));
  renderProducts(brand);
  const family=state.catalog.find(x=>x.id===fid);
  renderModels(family,vid);
  if(p){
   const chosen=[p.brand,p.model,p.color].filter(Boolean).join(' · ');
   const summary=document.querySelector('.simple-product-accordion > summary small');if(summary)summary.textContent=chosen||'제품을 선택하세요';
   spec.textContent='규격: '+(p.size||'등록된 규격 없음')+(state.productStructure?' · '+state.productStructure:'');
  }else spec.textContent='규격: 제품을 선택하세요';
  const sv=state.productStructure||'';
  structureSelect.value=STRUCT(sv);
  custom.hidden=structureSelect.value!=='기타 직접입력';
  if(!custom.hidden)custom.value=sv&&!['합판형 강마루','보드형 강마루(HDF)','천연광물','원목마루','SPC','강화마루','벽장재'].includes(sv)?sv:'';
 }
 function STRUCT(v){return ['합판형 강마루','보드형 강마루(HDF)','천연광물','원목마루','SPC','강화마루','벽장재'].includes(v)?v:(v?'기타 직접입력':'');}
 function renderProducts(brand){
  const fid=baseId(),items=live().filter(p=>!brand||p.brand===brand);
  const family=state.catalog.find(x=>x.id===fid);
  productStep.b.textContent=family?.model||'선택하세요';
  productStep.body.replaceChildren();
  for(const p of items)productStep.body.append(opt(p.model||p.category,p.id===fid,()=>{
   window.ProductFinder.choose('engine',p.id);
   productStep.b.textContent=p.model||p.category;productStep.d.open=false;renderModels(p,'');
   if((p.variants||[]).length)modelStep.d.open=true;else{modelStep.b.textContent='세부모델 없음';modelStep.d.open=false;}
   refresh();sync();
  }));
 }
 function renderModels(p,vid){
  modelStep.body.replaceChildren();
  if(!p){modelStep.b.textContent='제품을 먼저 선택하세요';modelStep.d.open=false;return;}
  const vars=(p.variants||[]).filter(v=>!/단종|출시 전|재고 없음/.test(String(v.status||'')));
  const selected=vars.find(v=>v.id===vid);
  modelStep.b.textContent=selected?.name||(vars.length?'선택하세요':'세부모델 없음');
  if(!vars.length){modelStep.d.open=false;return;}
  for(const v of vars)modelStep.body.append(opt([v.name,v.size].filter(Boolean).join(' · '),v.id===vid,()=>{
   window.ProductFinder.choose('engine',p.id+'::'+v.id);
   modelStep.b.textContent=v.name;modelStep.d.open=false;refresh();sync();
  }));
 }
 structureSelect.onchange=()=>{
  custom.hidden=structureSelect.value!=='기타 직접입력';
  if(structureSelect.value==='기타 직접입력'){custom.focus();return;}
  state.productStructure=structureSelect.value;custom.value='';refresh();sync();
 };
 custom.onchange=()=>{state.productStructure=custom.value.trim();refresh();sync();};

 const baseRender=window.renderProductionWorkspace;
 window.renderProductionWorkspace=function(...args){refresh();return baseRender.apply(this,args);};
 refresh();
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('simple product accordion',e);}},200);
window.addEventListener('marketing:ready',()=>{try{mount();}catch(e){console.error(e);}});
})();