(function(){
'use strict';
let mounted=false;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function parseBlock(raw){
 const out={location:'',title:'',product:'',spec:'',structure:'',slideTitles:[],raw:String(raw||'')};
 const lines=String(raw||'').replace(/\r/g,'').split('\n');
 let photoMode=false,unlabeled=[];
 for(const original of lines){
  const line=original.trim();if(!line)continue;
  if(/^사진\s*문구\s*[:：]?$/i.test(line)){photoMode=true;continue;}
  if(photoMode){out.slideTitles.push(line.replace(/^[-•·]\s*/,''));continue;}
  const m=line.match(/^(현장|지역|제목|제품|제품명|규격|구조|코어)\s*[:：|]\s*(.+)$/i);
  if(m){
   const k=m[1],v=m[2].trim();
   if(/현장|지역/.test(k))out.location=v;
   else if(k==='제목')out.title=v;
   else if(/제품/.test(k))out.product=v;
   else if(k==='규격')out.spec=v;
   else out.structure=v;
  }else unlabeled.push(line);
 }
 if(!out.location&&!out.title&&!out.product&&!out.spec&&!out.structure&&unlabeled.length){
  [out.location,out.title,out.product,out.spec,out.structure]=unlabeled.slice(0,5);
  if(unlabeled.length>5)out.slideTitles=unlabeled.slice(5);
 }
 return out;
}
function mount(){
 if(mounted)return;
 const grid=document.querySelector('.simple-input-grid');
 if(!grid||!state)return;
 mounted=true;
 const card=el('section',undefined,'simple-card simple-copy-card');
 card.append(el('strong','4. 문구 붙여넣기'));
 const hint=el('p','내가 만들어준 문구 블록을 그대로 붙여넣으면 같은 위치와 크기로 출력됩니다.','simple-help');
 const area=el('textarea');area.id='simple-copy-paste';area.rows=8;
 area.placeholder='현장: 춘천 석사동 · 단독주택\n제목: 신축주택 마루 시공\n제품: 구정 블론테 본오크\n규격: 230 × 2420 × 7T\n구조: 합판형 강마루\n\n사진문구:\n빛이 머무는 나뭇결';
 const actions=el('div',undefined,'simple-actions');
 const apply=el('button','붙여넣기 적용','primary'),clear=el('button','복붙 문구 비우기');
 apply.type=clear.type='button';actions.append(apply,clear);
 const status=el('div',undefined,'simple-copy-status');
 card.append(hint,area,actions,status);
 const output=grid.querySelector('.simple-output-card');if(output)grid.insertBefore(card,output);else grid.append(card);

 function summary(v){
  status.replaceChildren();
  const rows=[['현장',v.location],['제목',v.title],['제품',v.product],['규격',v.spec],['구조',v.structure],['사진별 문구',v.slideTitles?.length?v.slideTitles.join(' / '):'']];
  for(const [k,val]of rows)if(val){const p=el('p');p.append(el('b',k+' '),document.createTextNode(val));status.append(p);}
  if(!status.children.length)status.append(el('p','적용된 복붙 문구가 없습니다.','simple-help'));
 }
 apply.onclick=()=>{
  const parsed=parseBlock(area.value);
  if(![parsed.location,parsed.title,parsed.product,parsed.spec,parsed.structure].some(Boolean)&&!parsed.slideTitles.length)return toast('붙여넣은 문구를 확인해 주세요.');
  state.manualOverlay=parsed;
  if(parsed.structure)state.productStructure=parsed.structure;
  state.signatureCaptionKey='';
  persist();
  if(typeof scheduleChannels==='function')scheduleChannels();
  window.renderProductionWorkspace?.();
  summary(parsed);
  toast('복붙 문구를 고정 포맷에 적용했습니다.');
 };
 clear.onclick=()=>{
  state.manualOverlay={};area.value='';state.signatureCaptionKey='';persist();window.renderProductionWorkspace?.();summary({});
 };
 const existing=state.manualOverlay||{};
 area.value=existing.raw||'';
 summary(existing);
}
const timer=setInterval(()=>{try{mount();if(mounted)clearInterval(timer);}catch(e){console.error('copy paste mode',e);}},200);
window.addEventListener('marketing:ready',()=>{try{mount();}catch(e){console.error(e);}});
})();