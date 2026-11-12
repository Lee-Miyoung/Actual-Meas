(function(){
'use strict';
const postLabels={thumbnailTitle:'썸네일 제목',postTitle:'게시물·영상 제목',instagramCaption:'인스타 캡션',youtubeDescription:'유튜브 설명글',pinnedComment:'고정댓글',hashtags:'해시태그'};
const aliases={
 location:['현장','지역','현장명'],product:['제품','제품명'],spec:['규격'],structure:['구조','코어'],
 slideTitles:['사진문구','사진별문구'],thumbnailTitle:['썸네일제목','제목','표지제목'],
 postTitle:['게시물·영상제목','게시물제목','영상제목','게시제목','유튜브제목'],
 instagramCaption:['인스타캡션','인스타그램캡션','캡션'],youtubeDescription:['유튜브설명글','유튜브설명'],
 pinnedComment:['고정댓글'],hashtags:['해시태그']
};
const lookup=new Map(Object.entries(aliases).flatMap(([key,names])=>names.map(n=>[n,key])));
// Only remove list markers at the start of a photo line. Keep measurements and floor numbers.
function cleanPhotoCaption(value){
 const text=String(value??'').trim().replace(/^[-*•·]\s+/u,'').replace(/^\*\*([^*]+?)\*\*/u,'$1');
 const marker=/^(?:\[(?:(?:사진|슬라이드)\s*)?\d{1,2}(?:\s*(?:장|번|컷))?\]|\(\d{1,2}\)|[①-⑳]|\d\uFE0F?\u20E3|(?:(?:사진|슬라이드)\s*\d{1,2}(?:\s*(?:장|번|컷))?|\d{1,2}\s*(?:장|번(?:\s*사진)?|컷))\s*[·ㆍ:：.．)–—-]|\d{1,2}[.)](?!\d))\s*/u;
 return text.replace(marker,'').trim();
}
function parse(raw){
 const groups={},plain=[];let active;
 for(const original of raw.replace(/\r/g,'').split('\n')){
  if(/^\s*(?:```.*|[-─]{3,})\s*$/.test(original))continue;
  const text=cleanPhotoCaption(original).replace(/^#{1,6}\s+|^[-*]\s+(?=\[|\*\*)/,'').replace(/\*\*/g,'');
  const m=text.match(/^\[([^\]]+)\]\s*[:：]?\s*(.*)$/)||text.match(/^([^:：|]+)\s*[:：|]\s*(.*)$/);
  const name=(m?m[1]:text).replace(/\s/g,'');
  const key=lookup.get(name);
  if(key){active=key;groups[key]=[];if(m?.[2])groups[key].push(m[2]);continue;}
  if(active)groups[active].push(original.trimEnd());else if(original.trim())plain.push(original.trim());
 }
 const result={};
 for(const [key,lines] of Object.entries(groups)){
  const value=lines.join('\n').trim();
  if(!value)continue;
  if(key==='slideTitles'){
   const titles=value.split('\n').map(cleanPhotoCaption).filter(Boolean);
   if(titles.length)result[key]=titles;
  }else if(key==='thumbnailTitle'){
   const title=cleanPhotoCaption(value);if(title)result[key]=title;
  }else result[key]=value;
 }
 return {result,legacy:Object.keys(groups).length?[]:plain};
}
function prompt(editor){
 const f=editor.facts(),p=state.thumbnailPosting||{};
 const details=[['현장',f.location],['공간',p.housing],['평형',p.areaPyeong&&p.areaPyeong+'평형'],['제품',f.product],['규격',window.CheonginDisplaySpec(f.spec)],['구조',f.structure]].filter(([,v])=>v).map(([k,v])=>k+' · '+v);
 const slides=state.slideCount||state.photos.length||1;
 return ['청인마루 시공 게시물 한 세트를 작성해 줘. 첨부한 실제 사진과 다음 현장 정보만 사용해 줘.',
 ...details,'구성 · '+(p.pairConcept==='compare'?'시공 전·후':'현장 미리보기'),
 '먼저 사진을 보고 바닥이나 벽의 색·결 또는 공간에서 실제로 보이는 특징 하나를 골라 줘. 과장, 가격, 박스 수, 확인되지 않은 시공 정보는 빼 줘.',
 '썸네일 제목은 고객이 궁금해할 자연스러운 한 문장으로 짧게. 인스타 캡션은 짧은 문단 두세 개, 유튜브 설명은 영상 소개용, 고정댓글은 사진과 연결된 질문 하나로 써 줘.',
 '아래 대괄호 제목을 그대로 사용하고 답변 전체를 복사할 수 있게 한 블록으로 줘. 사진문구는 표지를 포함해 '+slides+'장 순서대로, 각 줄에 사진 위에 표시할 문장만 써 줘. 줄 앞에 번호, ‘1장 ·’, ‘사진 1’, 글머리표를 붙이지 마. 제품명과 규격은 앱에서 따로 표시하니 사진문구에는 사진에서 보이는 특징을 짧게 써 줘.',
 ...[postLabels.thumbnailTitle,'사진문구',...Object.values(postLabels).slice(1)].map(v=>'['+v+']')].join('\n');
}
window.CheonginPostCopy={postLabels,parse,cleanPhotoCaption};
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
let mounted=false;
function mount(){
 const editor=window.CheonginThumbnailEditor,grid=document.querySelector('.simple-input-grid'),pack=document.querySelector('.posting-pack');
 if(mounted||!grid||!editor||!pack)return;
 mounted=true;
 const card=el('section',undefined,'simple-card simple-copy-card');
 card.append(el('strong','4. 문구 붙여넣기'),el('p','요청문과 현장 사진을 ChatGPT에 보내세요. 답변을 한 번 붙여넣으면 사진과 게시 문구에 반영됩니다.','simple-help'));
 const actions=el('div',undefined,'simple-actions'),copy=el('button','요청문 복사'),paste=el('button','답변 붙여넣기','primary');
 const manual=el('div'),input=el('textarea'),apply=el('button','적용'),cancel=el('button','닫기'),legacy=el('button','기존 현장 양식 적용');
 const row=el('div',undefined,'simple-actions'),status=el('p','','simple-help');
 for(const b of [copy,paste,apply,cancel,legacy])b.type='button';
 input.id='simple-copy-paste';input.rows=4;input.setAttribute('aria-label','ChatGPT 문구');input.placeholder='[썸네일 제목]\n[인스타 캡션]\n[고정댓글]';
 status.setAttribute('role','status');row.append(apply,legacy,cancel);manual.append(input,row);manual.hidden=true;legacy.hidden=true;actions.append(copy,paste);
 card.append(actions,manual,status,pack);
 const output=grid.querySelector('.simple-output-card');grid.insertBefore(card,output);
 let project=null;
 function close(){input.blur();manual.hidden=true;input.value='';legacy.hidden=true;}
 function entry(value,copyMode=false){
  manual.hidden=false;apply.hidden=copyMode;legacy.hidden=true;input.readOnly=copyMode;
  input.value=value;input.focus({preventScroll:true});if(copyMode)input.select();
 }
 function importText(raw,allowLegacy=false){
  const parsed=parse(raw),v=parsed.result;
  if(!Object.keys(v).length && allowLegacy && parsed.legacy.length){
   const [location,thumbnailTitle,product,spec,structure,...slideTitles]=parsed.legacy;
   Object.assign(v,Object.fromEntries(Object.entries({location,thumbnailTitle,product,spec,structure}).filter(([,value])=>value)));
   if(slideTitles.length)v.slideTitles=slideTitles.map(cleanPhotoCaption);
  }
  if(!Object.keys(v).length){
   entry(raw);legacy.hidden=!parsed.legacy.length;status.textContent='항목 이름을 확인하세요. 현장·제목·제품·규격 순서의 예전 문구는 기존 현장 양식으로 적용할 수 있습니다.';return;
  }
  editor.applyCopy(v,raw);close();
  const count=v.slideTitles?.length||0;
  status.textContent=Object.keys(v).length+'개 항목 적용'+(count?' · 사진 문구 '+count+'장':'');
 }
 copy.onclick=async()=>{
  const value=prompt(editor);try{await navigator.clipboard.writeText(value);status.textContent='요청문을 복사했습니다. ChatGPT에 현장 사진과 함께 보내세요.';}
  catch{entry(value,true);status.textContent='선택된 요청문을 복사하세요.';}
 };
 paste.onclick=async()=>{
  const id=state.projectId;
  try{const text=await navigator.clipboard.readText();if(state.projectId!==id)return;
   if(text.trim()){importText(text);return;}}
  catch{}
  if(state.projectId!==id)return;
  entry('');status.textContent='입력칸을 길게 눌러 붙여넣거나 키보드로 붙여넣으세요.';
 };
 input.onpaste=e=>{if(input.readOnly)return;const text=e.clipboardData?.getData('text/plain');if(text&&Object.keys(parse(text).result).length){e.preventDefault();importText(text);}};
 apply.onclick=()=>importText(input.value);legacy.onclick=()=>importText(input.value,true);cancel.onclick=close;
 function syncProject(){if(project===state.projectId)return;project=state.projectId;close();status.textContent='';}
 syncProject();setInterval(syncProject,500);
}
const timer=setInterval(()=>{mount();if(mounted)clearInterval(timer);},200);
window.addEventListener('marketing:ready',mount);
})();
