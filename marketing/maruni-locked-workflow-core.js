/* 마루니·루루 고정 5장: 콘텐츠 종류와 사진 순서 연산만 담당하는 순수 모듈 */
(function(host){
  'use strict';
  const COUNT=5;
  // 글자 크기, 말풍선, 로고/캐릭터 디자인은 기존 렌더러에서 잠금.
  const TEMPLATES=Object.freeze({
    product:{
      label:'제품 소개',series:'마루니·루루 | 제품 소개',topic:'동화 시그니월 슬레이트모티프',
      channel:'product',icon:'📦',
      scenes:[
        ['회색 벽인데\n왜 이렇게 고급스러울까?','','은은한 석재 질감이 완성하는 벽'],
        ['은은한 슬레이트 질감','잔잔한 결이 깔끔해!','부드러운 그레이 결로 차분한 인상'],
        ['화이트 수납장과 간접조명','가구와도 잘 어울려!','화이트 가구와 따뜻한 조명의 조화'],
        ['벽과 코너의 연결감','코너도 자연스러워!','벽면과 코너의 흐름을 함께 살펴보기'],
        ['이런 공간에 추천해요','차분한 회색 벽이 좋아!','은은한 스톤 질감을 좋아한다면']
      ]
    },
    episode:{
      label:'현장 에피소드',series:'마루니·루루 | 현장 에피소드',topic:'오늘의 시공 현장 이야기',
      channel:'work',icon:'🛠️',
      scenes:[
        ['현장에서\n무슨 일이 있었을까요?','','오늘 현장에서 있었던 이야기'],
        ['시작 전 확인','여기부터 살펴보자!','현장 상태부터 확인했어요'],
        ['예상과 달랐던 순간','어, 이 부분은?','작업 중 발견한 작은 변수'],
        ['이렇게 해결했어요','차근차근 맞춰보자!','현장 조건에 맞춰 조정한 과정'],
        ['마무리는 이렇게','깔끔하게 마무리!','시공 전후를 비교해 보세요']
      ]
    },
    process:{
      label:'시공 현장',series:'마루니·루루 | 시공 현장',topic:'시공 전후 현장 기록',
      channel:'work',icon:'📐',
      scenes:[
        ['이 공간은\n어떻게 달라졌을까요?','','시공 과정을 사진으로 확인하세요'],
        ['시공 전 모습','먼저 상태를 볼까?','작업 전 현장의 실제 모습'],
        ['준비와 작업 과정','작업 순서도 중요해!','현장에 맞춰 진행한 과정'],
        ['완성된 디테일','마감도 확인하자!','코너와 가장자리를 가까이'],
        ['시공 후 변화','분위기가 달라졌네!','같은 공간의 전후 비교']
      ]
    },
    tips:{
      label:'관리 방법',series:'마루니·루루 | 관리 방법',topic:'집을 오래 예쁘게 쓰는 팁',
      channel:'information',icon:'💡',
      scenes:[
        ['우리 집을 위한\n작은 관리 팁은?','','쉽게 실천하는 생활 정보'],
        ['오늘의 질문','이럴 땐 어떻게 해?','궁금했던 상황을 살펴봐요'],
        ['먼저 확인할 것','여기부터 확인!','상태를 보고 판단해요'],
        ['이렇게 관리해요','간단하게 해보자!','무리하지 않는 기본 관리'],
        ['기억해 두세요','이것만 기억하자!','현장 조건에 따라 다를 수 있어요']
      ]
    },
    everyday:{
      label:'일상 이야기',series:'마루니·루루 | 일상 이야기',topic:'우리의 소소한 하루',
      channel:'daily',icon:'☕',
      scenes:[
        ['오늘은 어떤\n하루였을까요?','','평범해서 더 소중한 순간'],
        ['아침의 작은 시작','오늘은 뭐 할까?','느긋하게 하루를 열어요'],
        ['뜻밖의 순간','어, 이게 뭐지?','평범한 날의 뜻밖의 장면'],
        ['함께한 시간','이 순간이 좋아!','소소하지만 기억하고 싶은 시간'],
        ['오늘의 한마디','오늘도 잘 보냈어!','우리의 하루는 이렇게 지나가요']
      ]
    },
    question:{
      label:'고객 질문',series:'마루니·루루 | 고객 질문',topic:'마루와 도배 시공 순서',
      channel:'question',icon:'💬',
      scenes:[
        ['마루랑 도배, 뭐부터 해야 해요?','','공사 순서를 묻는 고객님께'],
        ['오늘의 질문','두 팀 날짜를 어떻게 잡죠?','일정을 잡기 전에 많이 물어보세요'],
        ['청인마루 현장에서는','보통 마루를 먼저 깔아요.','걸레받이까지 마무리해요'],
        ['그다음 도배','도배할 땐 마루를 보양해요.','새 바닥을 보호해요'],
        ['일정을 잡기 전에','우리 집 공정도 같이 확인해요.','현장 조건에 맞춰 일정을 조율해요']
      ]
    },
    behind:{
      label:'현장 밖 비하인드',series:'마루니·루루 일하는 하루',topic:'청인마루의 일상',
      channel:'daily',icon:'📷',
      scenes:[
        ['현장 밖에서는\n무슨 일을 할까요?','','카메라 밖의 청인마루 하루'],
        ['오늘의 준비','준비부터 꼼꼼히!','현장 가기 전 챙긴 것들'],
        ['이동과 만남','오늘은 여기야!','이동하며 만난 풍경'],
        ['잠깐의 휴식','잠시 쉬었다 가자!','일하는 날의 소소한 쉼표'],
        ['하루를 마치며','수고했어, 오늘도!','일상의 작은 기록']
      ]
    }
  });
  const types=()=>['product','process','episode','question','tips','everyday'].map(id=>[id,TEMPLATES[id]]).map(([id,t])=>({id,label:t.label,icon:t.icon,series:t.series,topic:t.topic,channel:t.channel}));
  function get(type){return TEMPLATES[type]||TEMPLATES.product;}
  function scenesFor(type){
    return get(type).scenes.map(([title,bubble,foot],i)=>({
      title,bubble,foot,maruni:i===0?'maruni-02':i===2?'maruni-02':i===4?'maruni-01':'maruni-03',
      ruru:i===2||i===4?'ruru-01':'ruru-02',side:i>=2?'left':'right'
    }));
  }
  function chooseTemplate(project,type){
    if(!project||!Array.isArray(project.scenes)||project.scenes.length!==COUNT)throw Error('5장 작업에만 형식을 적용할 수 있습니다.');
    if(!Object.prototype.hasOwnProperty.call(TEMPLATES,type))throw Error('지원하지 않는 콘텐츠 형식입니다.');
    const t=TEMPLATES[type],defs=scenesFor(type);
    // 사진, 캐릭터(포즈와 위치), 장면 ID/사진 ID는 덮어쓰지 않는다. 제목/대사만 교체.
    project.type=type;project.series=t.series;project.product=t.topic;
    for(let i=0;i<COUNT;i++){
      const item=project.scenes[i],preset=defs[i];
      item.title=preset.title;item.bubble=preset.bubble;item.foot=preset.foot;
    }
    return project;
  }
  function hasPhoto(s){return Boolean(s&&s.photo);}
  function batchTargets(start,amount){
    const pos=Math.max(0,Math.min(COUNT-1,Math.trunc(Number(start)||0)));
    return Array.from({length:Math.min(Math.max(0,amount),COUNT-pos)},(_,n)=>pos+n);
  }
  function changePhoto(s,photo,id){
    if(!s||!(photo instanceof Blob)||typeof id!=='string'||!id)throw Error('사진 또는 참조 정보가 올바르지 않습니다.');
    s.photo=photo;s.photoId=id;
    return s;
  }
  function swapPhotos(scenes,a,b){
    if(!Array.isArray(scenes)||scenes.length!==COUNT||![a,b].every(i=>Number.isInteger(i)&&i>=0&&i<COUNT))throw Error('사진 순서 범위가 올바르지 않습니다.');
    if(a===b)return scenes;
    for(const key of ['photo','photoId']){const v=scenes[a][key];scenes[a][key]=scenes[b][key];scenes[b][key]=v;}
    return scenes;
  }
  function moveStoryScene(scenes,from,to){
    // 0번 표지는 유지한다. 1~4컷의 문구·사진·캐릭터를 함께 이동.
    if(!Array.isArray(scenes)||scenes.length!==COUNT||![from,to].every(i=>Number.isInteger(i)&&i>0&&i<COUNT))throw Error('본편 1~4컷만 순서를 바꿀 수 있습니다.');
    if(from===to)return scenes;
    const row=scenes.splice(from,1)[0];scenes.splice(to,0,row);return scenes;
  }
  function photoIds(project){
    return [...new Set([...(project.library||[]).map(r=>r.id),...project.scenes.map(s=>s.photoId)].filter(Boolean))];
  }
  function label(type){return get(type).label;}
  const api=Object.freeze({COUNT,TEMPLATES,types,get,label,scenesFor,chooseTemplate,hasPhoto,batchTargets,changePhoto,swapPhotos,moveStoryScene,photoIds});
  host.MaruniLockedWorkflow=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
