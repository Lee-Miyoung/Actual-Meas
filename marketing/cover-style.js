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
    signature:{label:'회사 소개 · 청인마루의 일',section:'청인마루  /  마루·벽장재 시공',defaultChoice:7,
      materialNotes:{
        floor:'문틀 옆 좁은 자리, 마루와 걸레받이가 맞닿는 선. 청인마루는 바닥 끝에서 만나는 작은 마감까지 살핍니다.',
        wall:'벽 한가운데의 이음선부터 모서리가 꺾이는 자리까지. 청인마루는 벽을 가까이서 볼 때 눈에 들어오는 선을 살핍니다.',
        both:'마루가 끝나고 벽이 시작되는 자리에는 두 자재의 마감이 함께 보입니다. 청인마루는 그 경계까지 살핍니다.'
      },choices:[
      ['공간의 위로가 되다.','공간의 위로가 되다.','오래 머무는 집일수록 아침마다 눈에 닿는 색이 중요해집니다. 마음에 둔 자재를 나란히 놓고 골라보세요.'],
      ['햇살은 창을 지나, 마루 위에 머뭅니다.','빛이 스치면, 벽의 무늬가 드러납니다.','같은 색도 빛이 닿는 방향에 따라 조금씩 달라 보입니다. 창가에 선 모습과 안쪽에서 본 모습을 함께 살펴보세요.'],
      ['가구가 들어오기 전, 집은 벌써 따뜻합니다.','가구가 들어오기 전, 벽이 먼저 표정을 갖습니다.','아직 비어 있는 공간에 식탁과 소파를 떠올려 보세요. 자재를 고를 때 곁에 놓일 가구도 좋은 기준이 됩니다.'],
      ['집에 돌아와 처음 닿는 곳, 마루.','하루에도 몇 번씩 눈길이 머무는 벽.','집에 들어서면 가장 먼저 눈이 가는 자리가 있습니다. 그곳에 어떤 색이 어울릴지부터 같이 생각해 봅니다.'],
      ['맨발로 걷고 싶은 집.','한 걸음 물러서면 보이는 벽의 표정.','멀리서 본 색이 마음에 들었다면, 이번에는 손 가까이에서 결을 살펴보세요.'],
      ['눈길은 결에, 발길은 집으로.','오후의 빛이 벽에 한 겹 더해집니다.','아침의 빛과 저녁 조명 아래에서 어떤 색이 편안한지, 오래 머무를 시간을 떠올려 보세요.'],
      ['작은 샘플 한 장이 우리 집 마루가 되기까지','작은 샘플 한 장이 한 면의 벽이 되기까지','사진 속에서 마음에 들었던 색을 기억해 두세요. 전시장에서 비슷한 샘플 두 장을 곁에 놓으면 취향이 또렷해집니다.'],
      ['같은 자재도 누가 시공하느냐에 따라 마감이 달라집니다.','같은 자재도 누가 시공하느냐에 따라 마감이 달라집니다.'],
      ['마루를 고르셨다면, 문틀 옆 마감도 눈여겨보세요.','벽장재를 고르셨다면, 모서리 마감도 눈여겨보세요.','문틀 옆이나 모서리처럼 자재가 끝나는 곳을 한 번 더 들여다보세요. 어떤 마감을 원하는지 이야기하기 좋은 자리입니다.'],
      ['잘 깐 마루는 가장자리에서 보입니다.','벽 한 면의 완성도는 이음선에서 보입니다.','공간 전체를 보셨다면 이제 한 걸음 가까이 와 보세요. 두 면이 만나는 선에서 마감의 표정이 보입니다.'],
      ['문을 열고 들어올 때마다, 이 결이 반겨준다면.', '하루가 저물 때, 벽에 남는 빛 한 줄.', '집에서 가장 좋아하는 시간을 떠올려 보세요. 그때의 빛과 잘 어울리는 색을 함께 찾아봅니다.'],
      ['마루 한 장의 색보다, 거실 한 바닥의 느낌.', '샘플 한 장의 무늬보다, 벽 한 면의 느낌.', '작은 샘플에서 좋았던 무늬가 넓어지면 어떨까요? 실제 시공 사진과 샘플을 나란히 보세요.'],
      ['마루가 끝나는 자리에서, 손길이 보입니다.', '두 벽이 만나는 자리에서, 손길이 보입니다.', '어떤 자재를 썼는지 물으셨다면, 어디에서 어떻게 마무리했는지도 함께 물어보세요.'],
      ['오래 볼 바닥이라 천천히 골라도 괜찮아요.', '오래 볼 벽이라 천천히 골라도 괜찮아요.', '밝은 쪽과 차분한 쪽, 둘 다 마음에 드셔도 좋습니다. 두 샘플을 함께 놓고 이야기해요.']
    ]},
    showroom:{label:'전시장 초대 · 송도에서 만나요',section:'청인마루 송도 전시장',choices:[
      ['사진으로 본 나뭇결, 손끝으로 느껴보세요.','사진으로 본 그 결, 손끝으로 느껴보세요.','마음에 담아둔 사진 한 장을 가져오세요. 닮은 색의 샘플을 곁에 놓고, 손끝에 닿는 결을 함께 살펴봅니다.'],
      ['두 가지 색 사이에서 망설이고 계신가요?','두 가지 색 사이에서 망설이고 계신가요?','가구나 커튼 사진이 있으면 더 좋습니다. 눈여겨본 두 샘플에 하나씩 대어 보며 골라요.'],
      ['처음 고르는 마루, 어디서부터 볼까요?','처음 고르는 벽장재, 어디서부터 볼까요?','제품 이름을 정하지 않으셔도 괜찮아요. 좋아하는 공간이나 마음에 드는 색부터 들려주세요.']
    ]},
    ask:{label:'고객 상담 · 우리 집 마감',section:'우리 집 시공 상담',note:'공간 사진과 고민되는 부분을 보내주세요. 어울리는 자재와 마감 방법을 함께 살펴봅니다.',choices:[
      ['우리 집 걸레받이도 그대로 쓸 수 있을까요?','우리 집 벽에도 이 무늬가 어울릴까요?','마음에 둔 자재와 시공할 자리가 함께 보이는 사진을 보내주세요. 지금 집에서 살릴 수 있는 부분부터 살펴봅니다.'],
      ['문 앞에서 마루는 어떻게 만날까요?','모서리에서는 무늬가 어떻게 이어질까요?','자재가 만나는 자리가 사진에 담기면 상담이 한결 수월합니다. 궁금한 부분은 가까이 찍어 보내주세요.'],
      ['우리 집 빛에서는 어떤 색으로 보일까요?','우리 집 빛에서는 어떤 색으로 보일까요?','낮에 찍은 사진과 평소 켜는 조명 아래의 사진을 함께 보면, 집에서 편안하게 느껴질 색을 고르는 데 도움이 됩니다.']
    ]},
    partner:{label:'거래처 협업 · 도면과 일정',section:'거래처 시공 협의',defaultChoice:3,note:'도면이나 현장 사진에 희망 일정을 함께 보내주세요. 자재 규격과 시공 순서를 검토합니다.',choices:[
      ['도면 한 장으로 시작하는 시공 협의','도면 한 장으로 시작하는 시공 협의','도면과 희망 일정을 보내주세요. 마감이 바뀌는 지점부터 현장 담당자와 함께 짚어봅니다.'],
      ['문틀과 마루가 만나는 높이, 도면에서 먼저 봅니다.','코너에서 만나는 벽면, 도면에서 먼저 봅니다.','서로 다른 자재가 이어지는 자리를 도면에 표시해 주세요. 시공 전 함께 확인하겠습니다.'],
      ['다음 공정까지 생각한 마루 시공','다음 공정까지 생각한 벽장재 시공','앞뒤 공정의 일정과 시공 범위를 알려주세요. 자재가 들어갈 시점부터 함께 맞춰봅니다.'],
      ['같은 마루도 문틀 앞에서 시공의 차이가 보입니다.','같은 벽장재도 모서리에서 시공의 차이가 보입니다.']
    ]},
    participate:{label:'참여 · 다음 장면 고르기',section:'다음 현장 이야기',note:'가까이 보고 싶은 곳을 댓글로 알려주세요.',choices:[
      ['다음엔 나뭇결과 문 앞 마감, 어디부터 볼까요?','다음엔 벽 무늬와 코너 마감, 어디부터 볼까요?','사진 한 장을 더 볼 수 있다면 어느 부분이 궁금하세요? 다음에 가까이 담을 곳을 댓글로 알려주세요.'],
      ['넓게 본 공간과 가까이 본 결, 어느 쪽이 좋으세요?','넓게 본 공간과 가까이 본 무늬, 어느 쪽이 좋으세요?','집 전체의 분위기를 보고 싶은지, 실제 결을 자세히 보고 싶은지 들려주세요.']
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
  window.CheonginCoverStyle={colors,font,loadTitle,pairLabel,drawLabel,logo,drawLogo,drawText,sceneFrames,hits,cornerLayout,drawCorner,endings,endingText,endingNoteKey,endingNote,visitNote,contact,pinnedComment,contactIcon};
})();
