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
const seriesSource='https://www.dongwhanewsroom.com/donghwagieob-daehyeong-byeogjae-sigeuniweol-culsi/';
const tessaloSource='https://www.greendongwha.com/product/detail/2598';
function signiwall(product){return /시그니\s*월|signiwall/i.test(product||'');}
function tessalo(product){return /테살로\s*화이트|tessalo\s*white/i.test(product||'');}
function productNotes(product){
 if(!signiwall(product))return '';
 const notes=['제조사에서 확인한 제품 특징',
  '시그니월은 석재 무늬를 입힌 대형 목질 벽장재입니다. 한 패널 안에서 무늬가 이어지고, 옆 판을 붙였을 때 같은 무늬가 반복되는 느낌을 줄인 디자인입니다. 사진에서 보이는 특징 하나를 골라 생활 속 표현으로 풀어 주세요.'];
 if(tessalo(product))notes.push('테살로 화이트는 밝은 바탕에 마블 무늬가 부드럽게 흐르는 패턴입니다. 마지막 사진은 넓은 판에서 그 결이 어떻게 보이는지 한 문장으로 마무리해 주세요.');
 notes.push('제품 특징과 현장 사실을 구분하세요. 전용 실리콘이나 졸리컷은 선택 가능한 마감입니다. 이 현장에 적용했다는 확인이 있을 때만 시공 내용으로 써 주세요.',
  '작성 참고용 제조사 자료 · '+seriesSource);
 if(tessalo(product))notes.push('테살로 화이트 제품 페이지 · '+tessaloSource,'패턴 설명 자료 · 동화 JIN GRANDE SQUARE × SIGNIWALL 카탈로그 46–47쪽');
 return notes.join('\n');
}
// Old pasted packs sometimes use the catalog label as the entire scene caption.
function sceneCaption(value,product){
 const title=cleanPhotoCaption(value);
 if(!signiwall(product))return title;
 const key=v=>v.normalize('NFC').replace(/일반|방염|동화자연마루|[\s·ㆍ|()（）-]/gu,'').toLowerCase();
 const nameOnly=key(title)===key(product)||/^(?:시그니월)?테살로화이트$/u.test(key(title));
 if(!nameOnly)return title;
 return tessalo(product)?'넓은 판 한 장에 흐르는 마블 결':'한 장의 넓은 판에 이어지는 석재 무늬';
}
function prompt(editor){
 const f=editor.facts(),p=state.thumbnailPosting||{},photos=state.photos||[];
 const sequence=state.signatureSequence||[],count=sequence.length||state.slideCount||photos.length||1;
 const compare=p.pairConcept==='compare';
 const rows=[
  ['현장',f.location],['공간',p.housing],['평형',p.areaPyeong&&p.areaPyeong+'평형'],
  ['제품',f.product],['규격',window.CheonginDisplaySpec(f.spec)],['시공 분야',({floor:'마루',wall:'벽장재',both:'마루와 벽장재'})[p.material]],
  ['자재 종류',f.structure||f.kind],['구성',compare?'시공 전·후':'현장 미리보기'],['출력', '표지를 포함해 '+count+'장']
 ];
 const file=id=>photos.find(photo=>photo.id===id)?.name;
 const order=sequence.map((slot,index)=>{
  const ids=index===0 && file(p.photoId)?[p.photoId]:(slot.photoIds||[]);
  const names=ids.map(file).filter(Boolean);
  const note=names.length?names.join(' / '):slot.role==='information'?'현장·제품 정보 장면':'';
  return note?(index===0?'표지':(index+1)+'번째 장면')+' · '+note:'';
 }).filter(Boolean);
 if(!sequence.length&&file(p.photoId))order.push('표지 · '+file(p.photoId));
 if(file(p.beforeId)&&file(p.afterId)&&p.beforeId!==p.afterId){
  order.push((compare?'시공 전':'첫 번째 장면')+' · '+file(p.beforeId),(compare?'시공 후':'두 번째 장면')+' · '+file(p.afterId));
 }
 const headings=[postLabels.thumbnailTitle,'사진문구',...Object.values(postLabels).slice(1)];
 const notes=productNotes(f.product);
 return [
  '청인마루 시공 사례 한 편을 작성해 주세요. 청인마루는 실제 현장에서 마루와 벽장재를 시공하는 업체입니다. 독자는 우리 집이나 매장에 어떤 마감재가 어울릴지 고민하는 고객입니다. 아래 정보와 이 메시지에 함께 첨부한 사진, 아래에 제공된 제품 자료를 바탕으로, 청인마루가 직접 현장을 소개하는 한국어 게시물을 써 주세요.',
  ['이번 현장',...rows.filter(([,v])=>v).map(([k,v])=>k+' · '+v)].join('\n'),
  ...(order.length?[['앱에서 사용할 사진 순서',...order,'파일명과 순서는 사진을 맞춰 보는 용도입니다. 게시 문구에는 싣지 마세요.'].join('\n')]:[]),
  ...(notes?[notes]:[]),
  ['사진을 읽는 방법',
   '시공 대상부터 확인하세요. 벽장재 현장이면 벽면의 무늬·이음·빛을 중심으로, 마루 현장이면 바닥의 결·판의 방향·인접한 마감과의 조화를 중심으로 보세요. 두 자재가 모두 명시된 현장은 각 사진에 실제로 보이는 자재를 다뤄 주세요.',
   compare?'시공 전·후가 확인된 사진끼리만 비교하고, 두 사진에서 눈으로 확인할 수 있는 차이를 써 주세요.':'현장 미리보기입니다. 여러 사진은 같은 현장의 다른 시선입니다. 사진 순서로 시공 전후나 완공 여부를 판단하지 마세요.',
   '사진 순서가 있으면 파일명과 대조하고, 순서를 따로 주지 않으면 첨부 순서대로 쓰세요. 카탈로그·샘플·연출 사진이 섞이면 그 사진은 소재의 패턴을 설명하는 데만 쓰세요. 연출 사진의 가구나 용도를 이 현장의 정보로 옮기지 마세요. 같은 공간이 반복되면 전경, 가까이 보이는 무늬, 빛이 닿는 부분처럼 실제로 달라 보이는 점을 골라 주세요. 사진이 한 장도 보이지 않으면 사진 첨부만 한 번 요청하세요. 현장명이나 평형 등 비어 있는 정보는 생략하세요.'
  ].join('\n'),
  ['문체와 사실 기준',
   '전시장에서 고객에게 사진을 한 장씩 보여주며 설명하듯 짧고 편안한 존댓말을 쓰세요. 사진에서 고객이 직접 찾아볼 수 있는 특징을 짚어 주세요. ‘고급스러운 공간의 완성’ 같은 상투적인 표현, 과장, 이모지는 빼 주세요.',
   '제품명·색상명·규격은 제공한 표기를 따르세요. 제품 특징을 더 확인할 수 있으면 해당 모델의 제조사 홈페이지나 공식 카탈로그에서 찾아 주세요. 검색이 어려운 채팅방에서는 이 요청문에 담긴 자료와 사진으로 확인할 수 있는 특징을 사용하세요. 다른 패턴이나 다른 현장의 시공 사례를 이 현장에 섞지 마세요. 무늬가 닮았다는 이유로 실제 대리석이나 원목이라고 단정하지 마세요. 사진으로 알 수 없는 공법, 성능, 고객 반응, 가격, 박스 수, 연락처는 덧붙이지 마세요.'
  ].join('\n'),
  ['항목별 작성 방법',
   '썸네일 제목은 사진에서 가장 눈길이 가는 특징 하나를 고객의 말로 풀어낸 한 문장입니다. 휴대폰에서 읽기 쉽게 20자 안팎으로 쓰고 줄바꿈은 앱에 맡기세요.',
   '사진문구는 정확히 '+count+'줄입니다. 첫 줄은 썸네일 제목과 같게, 다음 줄부터는 해당 장면에서만 보이는 특징을 한 줄에 하나씩 짧게 쓰세요. 같은 제품의 이름과 규격은 표지의 제품 정보로 충분합니다. 본문은 사진의 특징에 집중하세요. 특히 마지막 줄에는 모델명을 되풀이하지 말고 이 제품을 골랐을 때 눈에 보이는 차이 한 가지를 담으세요. 문장 앞에 숫자, “1장 ·”, “사진 1”, 글머리표를 붙이지 마세요.',
   '게시물·영상 제목은 한 줄로 쓰세요. 확인된 공간 종류나 지역, 제품명 중 필요한 정보와 사진의 특징을 조합해 검색하는 고객도 내용을 짐작할 수 있게 해 주세요.',
   '인스타 캡션은 짧은 2~3문단입니다. 첫 문단은 사진에서 눈에 띄는 장면으로 시작하고, 다음 문단에서 실제 시공 제품을 한 번 소개하고 그 장면에 어울리는 이유를 확인된 제품 특징 하나와 연결해 주세요.',
   '유튜브 설명글은 이 현장의 어떤 부분을 볼 수 있는지 2~3문장으로 소개하세요. 인스타 캡션을 그대로 반복하지 마세요.',
   '고정댓글은 사진을 본 사람이 자기 취향이나 고민을 쉽게 답할 수 있는 구체적인 질문 하나면 됩니다. 해시태그는 #청인마루를 포함해 현장과 직접 관련된 4~7개를 한 줄에 써 주세요.'
  ].join('\n'),
  '앱에 붙여넣을 답변 형식\n아래 일곱 제목의 글자·괄호·순서를 그대로 유지하고, 각 제목 바로 다음 줄에 완성 문구를 채워 주세요. 전체를 복사할 수 있도록 일반 텍스트 코드 블록 하나에 담으세요. 게시 문구에는 파일명, 출처 링크, 인용 기호나 작성 지시를 옮기지 마세요. 블록 밖 인사말, 작업 설명, 대안 제목은 생략하세요.',
  headings.map(label=>'['+label+']').join('\n')
 ].join('\n\n');
}
window.CheonginPostCopy={postLabels,parse,cleanPhotoCaption,sceneCaption};
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
