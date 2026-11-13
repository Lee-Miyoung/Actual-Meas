/* Shared by the cover and content canvases, at preview and export resolution. */
(function () {
  'use strict';
  const colors = {
    white: ['화이트', '#FFFFFF'], ivory: ['아이보리', '#F4F0E8'],
    sage: ['세이지', '#7C8980'], bronze: ['브론즈', '#9D8063'],
    charcoal: ['차콜', '#242321'], black: ['블랙', '#141414']
  };
  const logos = new Map();
  const font = size => '500 ' + size + 'px "Hahmlet Title", "Studio Serif", serif';
  function loadTitle(text) {
    return document.fonts.load('550 46px "Hahmlet Title"', text).catch(() => document.fonts.load('400 46px "Studio Serif"', text));
  }
  function pairLabel(choice, role) {
    if (choice?.pairConcept !== 'preview') return role === 'before' ? '시공 전' : '시공 후';
    const key = role === 'before' ? 'firstScene' : 'secondScene';
    return choice[key] || (role === 'before' ? '장면 01' : '장면 02');
  }
  function drawLabel(g, canvas, choice, role, x, y, limit = 420) {
    const text = pairLabel(choice, role), size = 22, height = 42;
    g.save();
    g.font = '500 ' + size + 'px "Studio Sans", sans-serif';
    const width = Math.min(limit, Math.ceil(g.measureText(text).width) + 28);
    g.fillStyle = 'rgba(250,247,239,.94)';
    g.beginPath(); g.roundRect(x,y,width,height,9); g.fill();
    g.fillStyle = '#283a30'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text,x+width/2,y+height/2,width-20);
    g.restore();
    if (choice?.pairConcept === 'preview') canvas.typeLayout.push({field:role==='before'?'firstScene':'secondScene',source:text,x,y,width,height,size});
  }
  let sample;
  function brightBehind(g,x,y,width,height) {
    if (!(width>0 && height>0)) return false;
    if (!sample) {
      const probe=document.createElement('canvas');
      probe.width=8; probe.height=3;
      sample=probe.getContext('2d',{willReadFrequently:true});
    }
    const t=g.getTransform();
    sample.clearRect(0,0,8,3);
    sample.drawImage(g.canvas,x*t.a+t.e,y*t.d+t.f,width*t.a,height*t.d,0,0,8,3);
    const pixels=sample.getImageData(0,0,8,3).data;
    let bright=0;
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]>160 && .2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]>=208)bright++;
    }
    return bright>=10;
  }
  function softShadow(g) {
    const scale=g.getTransform().a;
    g.shadowColor='rgba(24,22,18,0.20)';
    g.shadowBlur=1.8*scale;g.shadowOffsetX=0;g.shadowOffsetY=.8*scale;
  }
  function lightInk(color) {
    if(typeof color!=='string')return false;
    const rgb=color.startsWith('#') ? (color.length===4?color.slice(1).split('').map(v=>parseInt(v+v,16)):
      [1,3,5].map(i=>parseInt(color.slice(i,i+2),16))) : color.match(/[\d.]+/g)?.slice(0,3).map(Number);
    return rgb && Math.min(...rgb)>=175;
  }
  function drawText(g,line,x,y) {
    if(!lightInk(g.fillStyle)){g.fillText(line,x,y);return;}
    const m=g.measureText(line),top=y-m.actualBoundingBoxAscent;
    const height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    g.save();
    if(brightBehind(g,x,top,m.width,height))softShadow(g);
    g.fillText(line,x,y);g.restore();
  }
  async function logo(tone) {
    const key=Object.hasOwn(colors,tone)?tone:'white';
    if(!logos.has(key))logos.set(key,loadImage('brand/logo-'+key+'.svg').catch(e=>{logos.delete(key);throw e;}));
    return {image:await logos.get(key),key};
  }
  function drawLogo(g,canvas,mark,units,x,y) {
    const width=units*(canvas.height/canvas.width>1.7 ? .225 : .15),height=width*mark.image.height/mark.image.width;
    const box={units,x,y,width,height};
    g.save();g.globalAlpha=1;
    if(lightInk(colors[mark.key][1]) && brightBehind(g,x,y,width,height))softShadow(g);
    g.drawImage(mark.image,x,y,width,height);g.restore();canvas.logoBox=box;return box;
  }
  function sceneFrames(units,margin){
    const gap=units*.048,width=(units-2*margin-gap)/2;
    return [{x:margin,width,role:'before'},{x:margin+width+gap,width,role:'after'}];
  }
  function hits(box,x,y){
    const w=box.width??box.w,h=box.height??box.h;
    if(box.shape==='circle')return Math.hypot((x-box.x-w/2)/(w/2),(y-box.y-h/2)/(h/2))<=1;
    return x>=box.x && x<=box.x+w && y>=box.y && y<=box.y+h;
  }
  const endings={
    signature:{label:'회사 소개 · 청인마루의 일',section:'청인마루, 마루와 벽을 잇다',defaultChoice:7,
      materialNotes:{
        floor:'청인마루의 모든 시공은 현장 실측과 점검에서 시작합니다. 문이 열릴 높이와 마루가 끝나는 자리까지 직접 봅니다.',
        wall:'청인마루의 모든 시공은 현장 실측과 점검에서 시작합니다. 벽면을 재고, 이음선이 놓일 자리와 모서리를 살핍니다.',
        both:'청인마루의 모든 시공은 현장 실측과 점검에서 시작합니다. 마루와 벽이 만나는 높이까지 그 자리에서 확인합니다.'
      },choices:[
      ['공간의 위로가 되다.','공간의 위로가 되다.','오래 머무는 집일수록 아침마다 눈에 닿는 색이 중요해집니다. 마음에 둔 자재를 나란히 놓고 골라보세요.'],
      ['햇살은 창을 지나, 마루 위에 머뭅니다.','빛이 스치면, 벽의 무늬가 드러납니다.','같은 색도 빛이 닿는 방향에 따라 조금씩 달라 보입니다. 창가에 선 모습과 안쪽에서 본 모습을 함께 살펴보세요.'],
      ['가구가 들어오기 전, 집은 벌써 따뜻합니다.','가구가 들어오기 전, 벽이 먼저 표정을 갖습니다.','아직 비어 있는 공간에 식탁과 소파를 떠올려 보세요. 자재를 고를 때 곁에 놓일 가구도 좋은 기준이 됩니다.'],
      ['집에 돌아와 처음 닿는 곳, 마루.','하루에도 몇 번씩 눈길이 머무는 벽.','집에 들어서면 가장 먼저 눈이 가는 자리가 있습니다. 그곳에 어떤 색이 어울릴지부터 같이 생각해 봅니다.'],
      ['맨발로 걷고 싶은 집.','한 걸음 물러서면 보이는 벽의 표정.','멀리서 본 색이 마음에 들었다면, 이번에는 손 가까이에서 결을 살펴보세요.'],
      ['눈길은 결에, 발길은 집으로.','오후의 빛이 벽에 한 겹 더해집니다.','아침의 빛과 저녁 조명 아래에서 어떤 색이 편안한지, 오래 머무를 시간을 떠올려 보세요.'],
      ['작은 샘플 한 장이 우리 집 마루가 되기까지','작은 샘플 한 장이 한 면의 벽이 되기까지','사진 속에서 마음에 들었던 색을 기억해 두세요. 전시장에서 여러 색의 샘플을 곁에 놓으면 취향이 또렷해집니다.'],
      ['같은 자재도 누가 시공하느냐에 따라 마감이 달라집니다.','같은 자재도 누가 시공하느냐에 따라 마감이 달라집니다.'],
      ['마루를 고르셨다면, 문틀 옆 마감도 눈여겨보세요.','벽장재를 고르셨다면, 모서리 마감도 눈여겨보세요.','문틀 옆이나 모서리처럼 자재가 끝나는 곳을 한 번 더 들여다보세요. 어떤 마감을 원하는지 이야기하기 좋은 자리입니다.'],
      ['잘 깐 마루는 가장자리에서 보입니다.','벽 한 면의 완성도는 이음선에서 보입니다.','공간 전체를 보셨다면 이제 한 걸음 가까이 와 보세요. 두 면이 만나는 선에서 마감의 표정이 보입니다.'],
      ['문을 열고 들어올 때마다, 이 결이 반겨준다면.', '하루가 저물 때, 벽에 남는 빛 한 줄.', '집에서 가장 좋아하는 시간을 떠올려 보세요. 그때의 빛과 잘 어울리는 색을 함께 찾아봅니다.'],
      ['마루 한 장의 색보다, 거실 한 바닥의 느낌.', '샘플 한 장의 무늬보다, 벽 한 면의 느낌.', '작은 샘플에서 좋았던 무늬가 넓어지면 어떨까요? 실제 시공 사진과 샘플을 나란히 보세요.'],
      ['마루가 끝나는 자리에서, 손길이 보입니다.', '두 벽이 만나는 자리에서, 손길이 보입니다.', '어떤 자재를 썼는지 물으셨다면, 어디에서 어떻게 마무리했는지도 함께 물어보세요.'],
      ['오래 볼 바닥이라 천천히 골라도 괜찮아요.', '오래 볼 벽이라 천천히 골라도 괜찮아요.', '마음에 드는 색이 여러 가지여도 괜찮아요. 끌리는 샘플을 펼쳐 놓고 하나씩 이야기해요.'],
      ["시공의 첫날, 줄자부터 폅니다.", "시공의 첫날, 줄자부터 폅니다.", "청인마루의 모든 시공은 현장 실측과 점검에서 시작합니다. 도면에 적힌 치수와 실제로 자재가 닿을 자리를 하나씩 맞춰 봅니다.", "실측과 기본"],
      ["현관에서 마루까지, 높이부터 봅니다.", "현관에서 벽 끝까지, 높이부터 봅니다.", "새 자재가 놓일 높이를 기존 마감 옆에서 확인합니다. 문을 열고 들어올 때 처음 보게 될 자리니까요.", "실측과 기본"],
      ["덮으면 보이지 않을 자리부터.", "덮으면 보이지 않을 자리부터.", "완성된 표면 아래에는 원래 바탕이 남습니다. 자재를 놓기 전에 들뜬 곳과 고르지 않은 곳을 먼저 살펴봅니다.", "실측과 기본"],
      ["기본을 지킨다는 말, 현장에서 보여드립니다.", "기본을 지킨다는 말, 현장에서 보여드립니다.", "길이를 재고, 바탕을 보고, 어디까지 마감할지 정합니다. 청인마루가 시공 전에 꼭 거치는 순서입니다.", "실측과 기본"],
      ["문을 닫았을 때도 한 번 더.", "문을 닫았을 때도 한 번 더.", "열린 문에 가려졌던 끝선이 문을 닫으면 보입니다. 실측할 때 문이 움직이는 자리까지 살핍니다.", "마감의 손길"],
      ["오래된 집에는 집마다 다른 선이 있습니다.", "오래된 집에는 집마다 다른 선이 있습니다.", "같은 길이로 그린 두 벽도 현장에서는 조금씩 다릅니다. 자재를 자르기 전 실제 모서리에서 치수를 확인합니다.", "마감의 손길"]
    ]},
    showroom:{label:'전시장 초대 · 송도에서 만나요',section:'청인마루 송도 전시장',choices:[
      ['사진으로 본 나뭇결, 손끝으로 느껴보세요.','사진으로 본 그 결, 손끝으로 느껴보세요.','마음에 담아둔 사진 한 장을 가져오세요. 닮은 색의 샘플을 곁에 놓고, 손끝에 닿는 결을 함께 살펴봅니다.', '샘플과 방문'],
      ['여러 가지 색상 중에서 우리 집에는 어떤 색이 어울릴까요?','여러 가지 색상 중에서 우리 집에는 어떤 색이 어울릴까요?','집에서 계속 쓰실 가구나 커튼 사진을 가져오세요. 마음에 드는 샘플을 나란히 놓고 어떤 색이 자연스럽게 이어지는지 볼 수 있어요.', '색과 조명'],
      ['처음 고르는 마루, 어디서부터 볼까요?','처음 고르는 벽장재, 어디서부터 볼까요?','제품 이름을 정하지 않으셔도 괜찮아요. 좋아하는 공간이나 마음에 드는 색부터 들려주세요.', '샘플과 방문'],
      ["마루 종류가 너무 많아서 뭐가 뭔지 모르겠다고요?", "벽장재 종류가 너무 많아서 뭐가 뭔지 모르겠다고요?", "제품 이름은 잠시 접어두셔도 좋아요. 저장한 사진 한 장에서 어디가 마음에 들었는지, 거기서부터 같이 골라요.", "제품 고르기"],
      ["강마루, 원목마루… 이름부터 어렵죠?", "디자인월, 시그니월… 이름부터 어렵죠?", "평소 어떻게 지내는 공간인지 들려주세요. 궁금한 제품을 직접 만져보면서 소재와 마감 차이를 짚어드려요.", "제품 고르기"],
      ["마음에 든 집 사진은 있는데 제품명을 몰라요.", "이 벽, 이름을 몰라도 찾을 수 있을까요?", "사진 속 색이 좋았는지, 결이 좋았는지만 알려주세요. 비슷한 분위기의 샘플부터 꺼내볼게요.", "제품 고르기"],
      ["무엇을 골라야 할지보다, 싫은 게 더 분명하세요?", "좋아하는 벽보다 피하고 싶은 무늬가 먼저 떠오르세요?", "“너무 노란 건 싫어요.” 그 한마디면 시작할 수 있어요. 마음에 걸리는 색이나 무늬부터 덜어내 봐요.", "제품 고르기"],
      ["같은 오크인데 왜 이렇게 색이 다를까요?", "같은 흰색인데 왜 어떤 벽은 더 포근해 보일까요?", "마음에 둔 샘플을 흰 종이 옆에 나란히 놓아보세요. 단독으로 볼 때 지나쳤던 노란 기와 회색 기가 눈에 들어와요.", "색과 조명"],
      ["낮에는 예뻤는데 밤에도 그럴까요?", "저녁 조명을 켜면 이 벽은 어떤 색일까요?", "가족이 거실에 모이는 건 주로 몇 시인가요? 자주 켜는 조명 아래 찍은 사진을 가져오시면 그 시간의 집을 기준으로 골라요.", "색과 조명"],
      ["휴대폰마다 색이 달라 보여요. 어느 쪽이 맞죠?", "화면에서는 베이지였는데 실제로도 그럴까요?", "눈여겨본 사진은 취향을 알려주는 단서예요. 결정 전에는 실제 샘플을 창가와 안쪽에 놓고 색을 확인해 보세요.", "색과 조명"],
      ["작은 샘플에선 예쁜데 거실에 쫙 깔리면 어떨까요?", "손바닥만 한 샘플로 벽 한 면을 상상하기 어렵죠?", "가까이에서는 결을 보고, 몇 걸음 물러서서는 시공 사진을 보세요. 넓은 면에서 무늬가 얼마나 눈에 띄는지 같이 살펴요.", "색과 조명"],
      ["오크 식탁에 오크 마루, 색을 꼭 맞춰야 할까요?", "원목 식탁 뒤에는 어떤 벽이 어울릴까요?", "식탁 다리가 바닥과 함께 보이는 사진 한 장이면 좋아요. 식탁과 닮은 색, 살짝 다른 색을 곁에 놓고 비교해요.", "가구와 공간"],
      ["싱크대는 그대로예요. 바닥만 바꿔도 어울릴까요?", "주방 문짝 옆에 이 벽을 대면 어떤 느낌일까요?", "주방 문짝과 손잡이까지 보이는 사진을 가져오세요. 그대로 쓸 주방 색을 기준으로 샘플을 추려봅니다.", "가구와 공간"],
      ["가족끼리 고른 색이 전부 달라요.", "한 사람은 무늬 있는 벽, 한 사람은 무지 벽이 좋대요.", "각자 마음에 드는 사진을 한 장씩 골라오세요. 색은 달라도 둘 다 좋아한 공간의 공통점이 보일 때가 있어요.", "가구와 공간"],
      ["아직 가구를 안 골랐는데 마루부터 봐도 될까요?", "아직 소파가 없는데 벽부터 정해도 될까요?", "먼저 정해진 창틀이나 문 색부터 봐요. 지금 집에서 바꾸지 않을 색 하나만 있어도 고를 기준이 생겨요.", "가구와 공간"],
      ["나뭇결이 많으면 거실이 복잡해 보일까요?", "벽 무늬가 크면 소파 뒤가 복잡해 보일까요?", "평소 쓰는 러그나 패브릭 사진을 샘플 옆에 놓아보세요. 어느 정도의 무늬가 편안한지 한눈에 들어옵니다.", "무늬와 규격"],
      ["폭이 넓은 마루, 작은 방에도 어울릴까요?", "큰 판을 작은 벽에 쓰면 무늬가 얼마나 남을까요?", "방 너비나 벽 길이를 알려주세요. 한 면에 몇 줄이 들어가고 끝에 무늬가 얼마나 남는지 함께 그려봐요.", "무늬와 규격"],
      ["화면에선 다 매끈해 보이죠?", "무광과 은은한 광택, 어디서 차이가 날까요?", "샘플을 빛 쪽으로 살짝 기울여 보세요. 정면에서 비슷하던 표면도 빛을 받으면 차이가 보입니다.", "무늬와 규격"],
      ["유행하는 색이 몇 년 뒤에도 좋을까요?", "유행하는 색이 몇 년 뒤에도 좋을까요?", "집에 오래 두고도 여전히 좋아하는 물건을 하나 떠올려 보세요. 그 색을 곁에 두면 오래 보고 싶은 마감을 고르기 쉬워져요.", "취향 찾기"],
      ["부모님 댁 마루, 대신 골라도 될까요?", "부모님 댁 벽장재, 어떤 색을 보여드릴까요?", "실제로 지내실 분이 좋아하는 방 사진을 먼저 골라주세요. 그 방에서 자주 보는 가구와 빛을 기준으로 후보를 추려봐요.", "취향 찾기"]
    ]},
    ask:{label:'고객 상담 · 우리 집 마감',section:'우리 집 시공 상담',note:'공간 사진과 고민되는 부분을 보내주세요. 어울리는 자재와 마감 방법을 함께 살펴봅니다.',choices:[
      ['우리 집 걸레받이도 그대로 쓸 수 있을까요?','우리 집 벽에도 이 무늬가 어울릴까요?','마음에 둔 자재와 시공할 자리가 함께 보이는 사진을 보내주세요. 지금 집에서 살릴 수 있는 부분부터 살펴봅니다.', '시공과 마감'],
      ['문 앞에서 마루는 어떻게 만날까요?','모서리에서는 무늬가 어떻게 이어질까요?','자재가 만나는 자리가 사진에 담기면 상담이 한결 수월합니다. 궁금한 부분은 가까이 찍어 보내주세요.', '시공과 마감'],
      ['우리 집 빛에서는 어떤 색으로 보일까요?','우리 집 빛에서는 어떤 색으로 보일까요?','낮에 찍은 사진과 평소 켜는 조명 아래의 사진을 함께 보면, 집에서 편안하게 느껴질 색을 고르는 데 도움이 됩니다.', '색과 조명'],
      ["강아지가 자주 뛰는 거실, 어떤 마루부터 볼까요?", "반려견이 자꾸 기대는 벽, 어떻게 골라야 할까요?", "반려견이 주로 머무는 자리와 청소 습관을 알려주세요. 후보 제품의 표면을 직접 만져보고 관리 방법도 함께 확인해요.", "생활과 관리"],
      ["아이 식탁 밑은 매일 닦는데, 뭘 보고 고르죠?", "아이 손이 자주 닿는 벽, 관리하기 편할까요?", "어떤 얼룩을 자주 닦는지부터 들려주세요. 제품별로 쓸 수 있는 청소 방법을 확인한 뒤 골라요.", "생활과 관리"],
      ["맨발로 걷는 집인데 촉감도 비교할 수 있나요?", "눈으로 보이는 결이 손끝에도 느껴질까요?", "사진에서 색이 비슷했던 자재도 손으로 짚으면 다르게 느껴질 수 있어요. 마음에 드는 샘플은 직접 만져보세요.", "생활과 관리"],
      ["우리 집 평수만 알면 견적을 받을 수 있나요?", "벽 한 면만 하고 싶은데 어디부터 재야 할까요?", "시공을 원하는 범위를 표시한 도면이나 사진을 보내주세요. 면적과 기존 마감에 따라 더 확인할 항목을 짚어드려요.", "견적과 일정"],
      ["예산은 정했는데, 어떤 것부터 비교할까요?", "자재값 말고 견적에서 또 뭘 봐야 하죠?", "철거를 하는지, 어디까지 마감하는지부터 맞춰보세요. 같은 범위로 놓고 보면 견적의 차이를 읽기가 쉬워져요.", "견적과 일정"],
      ["입주 날짜가 정해졌어요. 언제부터 상의하면 될까요?", "도배 일정이 잡혔는데 벽장재는 언제 시공하죠?", "입주일과 이미 잡힌 공사 일정을 알려주세요. 앞뒤 공정과 자재 준비 시점을 함께 확인합니다.", "견적과 일정"],
      ["거실만 바꾸면 방 앞에서 마루가 어떻게 만날까요?", "벽 한 면만 바꾸면 옆 벽과 만나는 곳은 어떻게 되죠?", "두 마감이 같이 보이게 사진을 한 장 찍어주세요. 경계의 높이와 모양을 보고 가능한 마감 방법을 이야기해요.", "시공과 마감"],
      ["집에 짐이 있는 상태에서도 시공할 수 있나요?", "가구가 놓인 벽도 시공할 수 있을까요?", "공간 전체와 옮기기 어려운 가구가 보이는 사진을 보내주세요. 작업할 자리와 이동 동선을 먼저 살펴볼게요.", "시공과 마감"],
      ["완성 사진에선 다 예쁜데 시공은 어디를 봐야 하죠?", "멀리서 본 벽은 비슷해요. 어디를 가까이 볼까요?", "마루는 문틀 옆, 벽은 모서리가 돌아가는 곳을 보세요. 전체 사진과 같은 자리의 근접 사진을 함께 보면 마감이 보입니다.", "시공과 마감"],
      ["철거 뒤 비용이 달라지면요?", "철거 뒤 비용이 달라지면요?", "어떤 바탕이 드러나는지는 걷어낸 뒤에야 보일 때가 있어요. 추가 작업이 필요한 부분과 비용을 어떻게 확인할지 미리 이야기해요.", "견적과 변경"],
      ["견적서에 걸레받이까지 들어 있나요?", "견적서에 코너 마감까지 들어 있나요?", "벽을 따라가는 길이도, 모서리를 마감하는 방식도 집마다 달라요. 자재와 끝마감이 각각 어디까지 포함되는지 확인해 보세요.", "견적과 변경"],
      ["도면이 없는데 실측을 받을 수 있나요?", "도면이 없는데 실측을 받을 수 있나요?", "집 전체가 보이는 사진과 바꾸고 싶은 곳을 알려주세요. 실제 치수와 시공 범위는 현장에서 함께 확인합니다.", "실측과 범위"],
      ["같은 평형인데 왜 옆집과 견적이 다르죠?", "같은 평형인데 왜 옆집과 견적이 다르죠?", "거실 확장 여부, 붙박이장 자리, 방을 어디까지 바꾸는지에 따라 실제 시공 면적이 달라져요. 우리 집 범위를 먼저 표시해 봐요.", "견적과 변경"],
      ["문이 바닥에 닿지는 않을까요?", "문을 끝까지 열면 새 벽에 닿지 않을까요?", "문이 열리는 방향과 가장 가까워지는 자리를 실측 때 확인해요. 새 마감의 두께를 더해도 움직일 공간이 있는지 봅니다.", "문과 경계"],
      ["타일과 마루 사이, 발에 걸리지 않을까요?", "타일과 벽장재 사이에 턱이 생길까요?", "두 자재의 두께와 지금 마감 높이를 함께 봐야 해요. 경계를 어떻게 이어갈지는 그 차이를 확인한 뒤 정합니다.", "문과 경계"],
      ["기존 마감을 살리고 일부만 바꿀 수 있나요?", "기존 마감을 살리고 일부만 바꿀 수 있나요?", "남길 곳과 바꿀 곳을 사진에 표시해 주세요. 맞닿는 경계와 기존 마감 상태부터 같이 살펴볼게요.", "부분 시공"],
      ["바닥이 조금 울퉁불퉁해도 될까요?", "벽이 조금 굽어 있어도 붙일 수 있나요?", "손이나 발로 느낀 자리를 알려주세요. 실측 때 바탕 상태를 보고 먼저 손볼 곳이 있는지 설명드려요.", "바탕 점검"],
      ["물 샌 자리, 마른 것 같으면 시공할 수 있나요?", "물 샌 자리, 마른 것 같으면 시공할 수 있나요?", "물이 샜던 위치와 마지막으로 젖었던 때를 알려주세요. 겉으로 보이는 색과 함께 바탕 상태도 확인해야 합니다.", "바탕 점검"],
      ["살면서 방 하나씩 바꿀 수 있을까요?", "살면서 방 하나씩 바꿀 수 있을까요?", "밤에 써야 할 방과 비워둘 수 있는 방을 먼저 정해 보세요. 짐을 둘 자리와 작업 순서를 같이 보면 가능한 범위가 보입니다.", "생활과 일정"],
      ["공사하는 동안 어디를 비워둬야 하죠?", "공사하는 동안 어디를 비워둬야 하죠?", "현관에서 작업할 방까지 이어지는 길을 한 번 걸어보세요. 옮기기 힘든 가구와 자재가 지날 자리부터 상의해요.", "생활과 일정"],
      ["마루 시공 뒤 가구는 언제 들일까요?", "새 벽에 선반은 언제 달 수 있나요?", "가구나 선반 설치일을 알려주세요. 선택한 자재와 시공 방식에 맞춰 다음 작업이 가능한 시점을 확인해요.", "생활과 일정"],
      ["공사 끝난 날, 어디부터 같이 볼까요?", "공사 끝난 날, 어디부터 같이 볼까요?", "문 앞과 모서리처럼 매일 눈에 닿는 곳을 함께 둘러보세요. 마음에 걸리는 자리는 그 자리에서 짚어주세요.", "완료와 사후관리"],
      ["시공 후 궁금한 곳은 어떻게 보여드릴까요?", "시공 후 궁금한 곳은 어떻게 보여드릴까요?", "방 전체 한 컷과 궁금한 자리 가까이 한 컷을 보내주세요. 어느 방의 어느 부분인지 알면 상담을 시작하기가 쉬워요.", "완료와 사후관리"],
      ["의자를 자주 끄는 자리, 어떻게 관리하죠?", "식탁 의자가 자꾸 벽에 닿아요.", "같은 자리에서 어떤 움직임이 반복되는지 알려주세요. 의자 다리와 벽 사이 거리, 자재에 맞는 보호 방법을 함께 살펴봅니다.", "생활과 관리"],
      ["다른 집 사진처럼 결 방향을 잡을 수 있을까요?", "벽 무늬 방향도 사진처럼 정할 수 있나요?", "원하시는 사진과 집 입구에서 찍은 사진을 같이 보여주세요. 들어서는 시선과 방의 모양을 놓고 방향을 이야기해요.", "실측과 범위"]
    ]},
    partner:{label:'거래처 협업 · 도면과 일정',section:'거래처 시공 협의',defaultChoice:3,note:'도면이나 현장 사진에 희망 일정을 함께 보내주세요. 자재 규격과 시공 순서를 검토합니다.',choices:[
      ['도면 한 장으로 시작하는 시공 협의','도면 한 장으로 시작하는 시공 협의','도면과 희망 일정을 보내주세요. 마감이 바뀌는 지점부터 현장 담당자와 함께 짚어봅니다.'],
      ['문틀과 마루가 만나는 높이, 도면에서 먼저 봅니다.','코너에서 만나는 벽면, 도면에서 먼저 봅니다.','서로 다른 자재가 이어지는 자리를 도면에 표시해 주세요. 시공 전 함께 확인하겠습니다.'],
      ['다음 공정까지 생각한 마루 시공','다음 공정까지 생각한 벽장재 시공','앞뒤 공정의 일정과 시공 범위를 알려주세요. 자재가 들어갈 시점부터 함께 맞춰봅니다.'],
      ['같은 마루도 문틀 앞에서 시공의 차이가 보입니다.','같은 벽장재도 모서리에서 시공의 차이가 보입니다.'],
      ["도면과 실측이 다르면 어디를 기준으로 잡죠?", "도면과 실측이 다르면 어디를 기준으로 잡죠?", "변경된 벽체와 문 위치를 현장에서 짚고 실제 치수를 도면과 대조합니다. 차이가 나는 자리부터 담당자와 맞춥니다.", "도면과 실측"],
      ["입찰 견적, 어느 범위로 비교할까요?", "입찰 견적, 어느 범위로 비교할까요?", "철거·바탕 정리·자재 반입·끝마감을 같은 항목으로 나눠 보세요. 포함 범위가 같아야 견적 차이도 설명할 수 있습니다.", "견적과 발주"],
      ["평면도 버전이 바뀌었나요?", "평면도 버전이 바뀌었나요?", "최종 도면의 날짜와 수정된 자리를 알려주세요. 발주 전, 현장 실측값과 마지막 도면을 함께 확인합니다.", "도면과 실측"],
      ["입구가 좁은데 긴 자재가 들어갈까요?", "입구가 좁은데 긴 자재가 들어갈까요?", "엘리베이터 문부터 복도 모퉁이까지가 반입 경로입니다. 판의 길이와 실제 회전 공간을 함께 확인합니다.", "반입과 일정"],
      ["자재는 현장 어디에 내려놓을까요?", "자재는 현장 어디에 내려놓을까요?", "반입일과 사용할 층, 자재를 펼칠 자리를 알려주세요. 다른 팀의 통로와 겹치는 곳부터 조율합니다.", "반입과 일정"],
      ["제품 변경, 발주 전에 무엇을 다시 볼까요?", "제품 변경, 발주 전에 무엇을 다시 볼까요?", "이름이 비슷해도 폭·길이·두께가 달라질 수 있습니다. 바뀐 규격이 수량과 만나는 높이에 미치는 영향부터 봅니다.", "견적과 발주"],
      ["같은 색 이름이면 바로 발주해도 될까요?", "같은 색 이름이면 바로 발주해도 될까요?", "승인받은 샘플의 모델명과 색상 코드를 주문서에 같이 적어주세요. 현장에 들어갈 제품과 마지막으로 대조하기 좋습니다.", "견적과 발주"],
      ["철거가 끝나면 어떤 사진이 필요할까요?", "철거가 끝나면 어떤 사진이 필요할까요?", "전체 전경에 더해 남은 접착제, 들뜬 곳, 높이가 바뀌는 자리를 담아주세요. 다음 작업 전에 확인할 위치가 분명해집니다.", "현장 인계"],
      ["목공이 끝나기 전, 어디를 맞춰둘까요?", "목공이 끝나기 전, 어디를 맞춰둘까요?", "문선과 걸레받이, 벽장재가 만나는 단면을 함께 보세요. 마감이 겹치는 자리는 양쪽 작업자가 먼저 맞춰두는 편이 좋습니다.", "공정 조율"],
      ["도배팀에는 어느 선까지 알려줄까요?", "도배팀에는 어느 선까지 알려줄까요?", "벽지 끝이 마감재와 만나는 위치와 작업 순서를 미리 공유해 주세요. 누가 어느 선까지 마감할지가 분명해집니다.", "공정 조율"],
      ["붙박이장 먼저인가요, 마루 먼저인가요?", "붙박이장 뒤 벽도 시공 범위인가요?", "가구 배치도에 바닥과 벽의 시공 범위를 표시해 주세요. 가구팀이 들어오는 날과 함께 보면 공정 사이의 빈 곳을 찾기 쉽습니다.", "공정 조율"],
      ["콘센트 위치, 자재 주문 전에 봐주세요.", "콘센트 위치, 자재 주문 전에 봐주세요.", "벽에 남길 스위치와 콘센트를 도면에 표시해 주세요. 자재 이음선과 개구부가 겹치는지 먼저 살펴봅니다.", "도면과 실측"],
      ["타일팀과 마감 높이를 맞추셨나요?", "타일팀과 마감 높이를 맞추셨나요?", "타일과 만나는 지점의 기준 높이와 자재 두께를 함께 알려주세요. 경계 단면을 보고 마감 방법을 정합니다.", "공정 조율"],
      ["곡선과 기둥, 수량에 반영됐을까요?", "곡선과 기둥, 수량에 반영됐을까요?", "평면 치수만으로 놓치기 쉬운 자리입니다. 현장에서 돌아가는 면과 재단 방향을 확인한 뒤 필요한 수량을 검토합니다.", "도면과 실측"],
      ["다른 층도 같은 치수로 발주할까요?", "다른 층도 같은 치수로 발주할까요?", "같은 평면처럼 보여도 계단 앞과 기둥 옆은 달라질 수 있습니다. 층별로 다른 자리부터 실측합니다.", "도면과 실측"],
      ["공정이 하루 밀리면 어디부터 바꿀까요?", "공정이 하루 밀리면 어디부터 바꿀까요?", "자재 입고, 시공팀 진입, 후속 공정 중 무엇이 영향을 받는지 나눠 봅니다. 이미 확정된 일정도 함께 알려주세요.", "반입과 일정"],
      ["매장 영업을 이어가며 공사할 수 있을까요?", "매장 영업을 이어가며 공사할 수 있을까요?", "손님 동선과 작업 구역을 도면에 나눠 표시해 주세요. 반입 가능한 시간까지 확인한 뒤 나눠 시공할 범위를 상의합니다.", "반입과 일정"],
      ["추가 요청, 현장 팀도 같은 내용을 봤나요?", "추가 요청, 현장 팀도 같은 내용을 봤나요?", "바뀐 위치와 자재, 비용·일정에 미치는 영향을 한곳에 적어 공유해 주세요. 발주와 시공이 같은 내용을 기준으로 움직입니다.", "견적과 발주"],
      ["완료된 구역은 누구에게 넘기나요?", "완료된 구역은 누구에게 넘기나요?", "인계할 담당자와 확인 날짜를 먼저 정해 주세요. 완료 범위와 남은 작업을 현장 사진에 표시해 함께 봅니다.", "현장 인계"],
      ["후속 공사가 남았다면, 어디를 보양할까요?", "후속 공사가 남았다면, 어디를 보양할까요?", "사다리가 놓일 자리와 자재가 오갈 통로를 알려주세요. 누가 언제 보호하고 걷을지도 다음 팀과 맞춰봅니다.", "현장 인계"],
      ["한 장만 교체할 때, 남은 자재를 찾을 수 있나요?", "한 장만 교체할 때, 남은 자재를 찾을 수 있나요?", "인계할 때 사용한 제품 코드와 남은 자재 위치를 같이 남겨두세요. 나중에 보수가 필요할 때 확인할 단서가 됩니다.", "현장 인계"]
    ]},
    participate:{label:'참여 · 다음 장면 고르기',section:'다음 현장 이야기',note:'가까이 보고 싶은 곳을 댓글로 알려주세요.',choices:[
      ['다음엔 나뭇결과 문 앞 마감, 어디부터 볼까요?','다음엔 벽 무늬와 코너 마감, 어디부터 볼까요?','사진 한 장을 더 볼 수 있다면 어느 부분이 궁금하세요? 다음에 가까이 담을 곳을 댓글로 알려주세요.'],
      ['넓게 본 공간과 가까이 본 결, 어느 쪽이 좋으세요?','넓게 본 공간과 가까이 본 무늬, 어느 쪽이 좋으세요?','집 전체의 분위기를 보고 싶은지, 실제 결을 자세히 보고 싶은지 들려주세요.'],
      ["실측하는 날, 가장 먼저 묻고 싶은 건 뭔가요?", "실측하는 날, 가장 먼저 묻고 싶은 건 뭔가요?", "문이 잘 열릴지, 어디까지 철거할지, 내 집에서 걱정되는 자리 하나를 남겨주세요.", "고객 질문"],
      ["아침 햇살과 저녁 조명, 어느 때의 집이 궁금하세요?", "아침 햇살과 저녁 조명, 어느 때의 집이 궁금하세요?", "같은 자리에서 어느 시간대의 색이 보고 싶은지 들려주세요. 다음 현장 사진에 담아볼게요.", "다음 사진"],
      ["견적서에서 뜻이 궁금했던 단어가 있나요?", "견적서에서 뜻이 궁금했던 단어가 있나요?", "양중이나 보양처럼 낯설었던 말을 댓글로 알려주세요. 다음 현장 이야기에서 실제 사진과 함께 풀어볼게요.", "고객 질문"],
      ["여러 가지 색상 중 가장 오래 눈에 남은 색은요?", "여러 가지 색상 중 가장 오래 눈에 남은 색은요?", "사진 한 장을 고르고 어디에 끌렸는지 들려주세요. 잔잔한 결인지, 창가에서 보이는 따뜻한 색인지 궁금해요.", "다음 사진"],
      ["현장 담당자라면 어느 사진을 먼저 받으시겠어요?", "현장 담당자라면 어느 사진을 먼저 받으시겠어요?", "철거 뒤 바탕, 자재가 들어올 통로, 경계의 단면 중 먼저 확인하고 싶은 자리를 알려주세요.", "거래처 질문"]
    ]}
  };
  const contact={phone:'032-210-6268',site:'https://cheonginmaru.com',chat:'https://pf.kakao.com/_xkcwEn/chat'};
  const visitNote='송도 전시장은 미리 예약하신 시간에 맞춰 안내해 드려요.';
  const pinnedComment=[
    '시공 상담은 전화나 카카오채널로 편하게 문의해 주세요.',
    visitNote+' 편하신 방문 시간을 전화나 카카오채널로 알려주세요.',
    '',
    '시공·전시장 상담  '+contact.phone,
    '홈페이지  '+contact.site,
    '카카오채널 문의  '+contact.chat
  ].join('\n');
  function contactIcon(g,key,x,y,size,color){
    g.save();g.translate(x,y);g.scale(size/24,size/24);g.strokeStyle=color;g.lineWidth=1.6;g.lineCap='round';g.lineJoin='round';g.beginPath();
    if(key==='phone'){
      g.moveTo(5,3);g.lineTo(8,3);g.lineTo(10,8);g.lineTo(8,10);g.quadraticCurveTo(10,14,14,16);g.lineTo(16,14);g.lineTo(21,16);g.lineTo(21,19);g.quadraticCurveTo(21,22,17,21);g.bezierCurveTo(10,19,4,13,3,6);g.quadraticCurveTo(3,3,5,3);
    }else if(key==='site'){
      g.arc(12,12,9,0,Math.PI*2);g.moveTo(3,12);g.lineTo(21,12);g.moveTo(12,3);g.bezierCurveTo(6,8,6,16,12,21);g.bezierCurveTo(18,16,18,8,12,3);
    }else{
      g.moveTo(6,4);g.lineTo(18,4);g.quadraticCurveTo(21,4,21,7);g.lineTo(21,15);g.quadraticCurveTo(21,18,18,18);g.lineTo(10,18);g.lineTo(5,21);g.lineTo(5,18);g.quadraticCurveTo(3,18,3,15);g.lineTo(3,7);g.quadraticCurveTo(3,4,6,4);
    }
    g.stroke();g.restore();
  }
  function endingText(mode,choice,wall){
    const list=endings[mode]?.choices||[];
    return (list[choice]||list[endings[mode]?.defaultChoice??0])?.[wall?1:0]||'';
  }
  function endingTitleKey(mode,choice){
    return 'endTitle_'+mode+'_'+(choice??endings[mode].defaultChoice??0);
  }
  function endingNoteKey(mode,choice){
    return 'endLine_'+mode+'_'+(choice??endings[mode].defaultChoice??0);
  }
  function endingNote(mode,choice,material){
    const design=endings[mode],pair=design.choices[choice]||design.choices[design.defaultChoice??0];
    return pair?.[2]??design.materialNotes?.[material]??design.note;
  }
  function cornerLayout(g,units,right,top,wide,housing,area,hasPhoto){
    const u=units/1080,gap=10*u,h=46*u;
    const badges=[];
    let end=right;
    g.save();
    for(const [key,value] of [['area',area ? area+'평형' : ''],['housing',housing]]){
      if(!value)continue;
      const size=(key==='area'?22:24)*u;
      g.font='500 '+size+'px "Studio Sans", sans-serif';
      const width=Math.ceil(g.measureText(value).width+36*u);
      badges.unshift({key,value,x:end-width,y:top,width,height:h,size});
      end-=width+gap;
    }
    g.restore();
    const diameter=Math.round(units*(wide ? .15 : .207));
    const badgeWidth=badges.length?right-badges[0].x:0;
    const groupWidth=Math.max(badgeWidth,hasPhoto?diameter:0);
    const center=right-groupWidth/2;
    for(const b of badges)b.x-=(groupWidth-badgeWidth)/2;
    const y=top+(badges.length?h+16*u:0);
    const circle=hasPhoto?{x:center-diameter/2,y,width:diameter,height:diameter}:null;
    return {u,badges,circle,bottom:circle?y+diameter:badges.length?top+h:top};
  }
  function drawCorner(g,c,layout,p){
    c.badgeLayout=layout.badges;
    g.save();
    for(const b of layout.badges){
      g.fillStyle=b.key==='housing'?'#243C34':'#F7F3E8';
      g.beginPath();g.roundRect(b.x,b.y,b.width,b.height,b.height/2);g.fill();
      g.font='500 '+b.size+'px "Studio Sans", sans-serif';
      g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=b.key==='housing'?'#FFFCF3':'#25392F';
      g.fillText(b.value,b.x+b.width/2,b.y+b.height/2);
    }
    g.restore();
    if(layout.circle&&p?.image)exterior(g,c,p,layout);
  }
  function exterior(g,c,p,layout){
    const {x,y:top,width:diameter}=layout.circle,r=diameter/2;
    const im=p.image,t=p.transform||{},zoom=Math.min(3,Math.max(1,t.zoom||1));
    const side=Math.min(im.width,im.height)/zoom,ax=t.x??.5,ay=t.y??.5;
    const sx=(im.width-side)*ax,sy=(im.height-side)*ay;
    g.save();g.beginPath();g.arc(x+r,top+r,r,0,Math.PI*2);g.clip();
    g.drawImage(im,sx,sy,side,side,x,top,diameter,diameter);g.restore();
    g.save();g.strokeStyle='rgba(255,252,246,.92)';g.lineWidth=layout.u*2.5;
    g.beginPath();g.arc(x+r,top+r,r,0,Math.PI*2);g.stroke();g.restore();
    c.photoLayout.push({id:p.id,target:'exterior',shape:'circle',x,y:top,width:diameter,height:diameter,
      anchorX:ax,anchorY:ay,zoom,sw:side,sh:side,sx,sy,sourceWidth:im.width,sourceHeight:im.height});

  }
  window.CheonginCoverStyle={colors,font,loadTitle,pairLabel,drawLabel,logo,drawLogo,drawText,sceneFrames,hits,cornerLayout,drawCorner,endings,endingText,endingTitleKey,endingNoteKey,endingNote,visitNote,contact,pinnedComment,contactIcon};
})();
