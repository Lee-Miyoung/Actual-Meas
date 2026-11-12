/* Model-specific editorial notes. Historical examples are for the editor, never projected onto a new job. */
(() => {
 'use strict';
 const entries = [
  {
   id:'blonte', name:'구정 블론테 본오크', brand:'구정', family:/블론테/, color:'본오크',
   facts:'230 × 2420 × 8.7㎜. 한 장의 길이가 2.42m인 광폭 강마루로, 은은한 노란빛과 섬세한 나이테가 특징입니다.',
   site:'춘천 석사동 신축주택 1층 거실·복도',
   question:'긴 마루를 깔면 복도에서 거실까지 어떻게 보일까요?',
   photo:'복도에서 거실을 향한 전경을 먼저 고르고, 판의 끝과 나뭇결이 함께 보이는 사진을 이어 주세요.',
   source:'https://www.kujungmaru.com/product/detail?id=127'
  },
  {
   id:'grand165', name:'구정 그랜드텍스쳐165 본오크', brand:'구정', family:/그랜드텍스(?:처|쳐|차)165/, color:'본오크',
   facts:'165 × 1200 × 7.5㎜. 황색 기가 도는 따뜻한 오크 톤에 잔잔한 나뭇결과 입체적인 표면 질감이 있습니다.',
   site:'단독주택 거실에서 따뜻한 브라운빛 바닥과 창밖 초록이 어우러진 모습을 기록했습니다.',
   question:'햇빛이 드는 거실에서 오크의 노란 기가 얼마나 보일까요?',
   photo:'같은 바닥에 창가와 그늘이 함께 찍힌 사진을 고르세요. 두 번째 컷은 실제 표면의 결이 보이는 근접 사진이 좋습니다.',
   source:'https://www.kujungmaru.com/product/detail?id=124'
  },
  {
   id:'matera', name:'한솔 SB스퀘어 마테라베이지', brand:'한솔', family:/sb스퀘어/, color:'마테라베이지',
   facts:'정사각 판에 따뜻한 베이지색과 사암을 닮은 돌결이 들어갑니다. 같은 색상의 다른 규격이 있어 실제 판 크기는 선택한 제품의 규격을 사용합니다.',
   site:'강화 단독주택',
   question:'타일 느낌의 바닥, 거실이 차가워 보이지 않을까요?',
   photo:'여러 장의 정사각 판이 보이는 전경과 한 장의 베이지색 돌결이 보이는 근접 컷을 짝지어 주세요.',
   source:'https://www.hansolhomedeco.co.kr/home/brand/sbcollection.jsp'
  },
  {
   id:'zen', name:'구정 마뷸러스 젠', brand:'구정', family:/(?:마뷸러스|마블러스|타일형)젠(?!틀)/,
   facts:'597 × 597㎜ 정사각 판. 색상과 무늬는 선택한 세부 패턴에 따라 달라집니다.',
   experience:'청인마루 상담에서는 방의 폭과 꺾이는 구간에 따라 재단하고 남는 양이 달라진다고 안내합니다. 필요한 수량은 도면이나 실측으로 확인합니다.',
   question:'같은 평수인데 정사각 마루는 왜 필요한 양이 달라질까요?',
   photo:'판의 가로·세로 이음이 한눈에 보이는 전경을 고르세요. 재단을 설명할 때는 실제 벽 끝이나 꺾이는 구간이 보이는 사진을 함께 쓰세요.',
   source:'https://www.kujungmaru.com/product/detail?id=95'
  },
  {
   id:'liv', name:'구정 마뷸러스 리브', brand:'구정', family:/(?:마뷸러스|마블러스|타일형)리브/,
   facts:'393 × 797㎜ 직사각 판. 정사각형인 젠과 달리 긴 변이 놓인 방향을 사진에서 확인할 수 있습니다.',
   experience:'같은 평형의 젠·리브 상담에서도 소요량을 각각 산정합니다. 방 모양과 시공 방향을 확인한 뒤 비교합니다.',
   question:'직사각 마루, 긴 쪽을 어느 방향으로 깔면 좋을까요?',
   photo:'판의 긴 변과 거실·복도의 진행 방향이 같이 보이는 전경을 고르세요.',
   source:'https://www.kujungmaru.com/product/detail?id=319'
  },
  {
   id:'mellow', name:'노바 플로 멜로우오크', brand:'노바', family:/플로|flo/, color:'멜로우오크',
   site:'김제 단독주택', question:'오크색은 넓게 깔았을 때 샘플과 어떻게 달라 보일까요?',
   photo:'거실 전경과 같은 자리에서 가까이 본 마루를 비교하세요. 색이나 광택은 첨부한 실제 사진에서 보이는 만큼만 설명해 주세요.'
  },
  {
   id:'dawn', name:'한솔 울트라165 던화이트오크', brand:'한솔', family:/울트라165/, color:'던화이트오크',
   site:'송도 단독주택', question:'흰 벽 옆에 놓으면 바닥이 어떤 색으로 보일까요?',
   photo:'해당 현장에 밝은 벽이 있다면 벽과 바닥의 경계가 함께 보이는 사진을 고르세요. 바닥색을 보정으로 더 밝게 만들지 마세요.'
  },
  {
   id:'folia', name:'한솔 SB강 폴리아오크', brand:'한솔', family:/sb강(?:마루)?/, color:'폴리아오크',
   site:'송도 웰카운티 2단지', question:'창가에서 본 오크색, 거실 안쪽에서도 비슷할까요?',
   photo:'창가와 안쪽이 함께 찍힌 컷이 있을 때만 색을 비교하세요. 판 폭과 구조는 해당 현장의 제품 표기를 따르세요.'
  }
 ];
 const normalize = s => String(s || '').normalize('NFKC').toLowerCase()
   .replace(/단종예정|단종|재고있음/g,'').replace(/[\s\p{P}\p{S}]/gu,'');
 function find(product) {
  if (!product) return null;
  const structured = typeof product === 'object';
  if (structured && product.type === 'wall') return null;
  const brand = structured ? normalize(product.brand) : '';
  const family = normalize(structured ? product.model : product);
  const color = structured ? normalize(product.color) : '';
  if (/벽장재|스토리월|시그니월/.test(family)) return null;
  const mentioned = ['구정','한솔','노바','동화','이건','네스트'].filter(b=>family.includes(b));
  const matches = entries.filter(n=>{
   if (brand && !brand.includes(n.brand)) return false;
   if (mentioned.some(b=>b!==n.brand) || !n.family.test(family)) return false;
   if (!n.color) return true;
   return color ? color===n.color || (n.id==='grand165' && color==='그랜드본오크165') :
    family.endsWith(n.color) || (n.id==='grand165' && family.endsWith('그랜드본오크165'));
  });
  return matches.length===1 ? matches[0] : null;
 }
 function promptNote(note,photosOnly){
  if(!note)return '';
  if(photosOnly)return ['선택 모델에 맞는 사진 · '+note.name,note.photo].join('\n');
  return [note.name+' · 모델별 시공 노트',note.facts,note.experience,
   '고객 질문 예시 · '+note.question,'함께 볼 사진 · '+note.photo,
   note.source?'제품 자료 · '+note.source:'색·결·광택과 규격은 이번 현장의 입력 정보와 원본 사진으로 확인하세요.',
   '질문에 답하는 장면이 첨부된 경우에만 그 질문을 쓰세요. 사진에 없는 현장 상황이나 자재 소요량은 추정하지 마세요.'
  ].filter(Boolean).join('\n');
 }
 window.CheonginFloorNotes={entries,find,promptNote};
})();
