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
      ['공간의 위로가 되다.','공간의 위로가 되다.'],
      ['햇살은 창을 지나, 마루 위에 머뭅니다.','빛이 스치면, 벽의 무늬가 드러납니다.'],
      ['가구가 들어오기 전, 집은 벌써 따뜻합니다.','가구가 들어오기 전, 벽이 먼저 표정을 갖습니다.'],
      ['집에 돌아와 처음 닿는 곳, 마루.','하루에도 몇 번씩 눈길이 머무는 벽.'],
      ['맨발로 걷고 싶은 집.','한 걸음 물러서면 보이는 벽의 표정.'],
      ['눈길은 결에, 발길은 집으로.','오후의 빛이 벽에 한 겹 더해집니다.'],
      ['작은 샘플 한 장이 우리 집 마루가 되기까지','작은 샘플 한 장이 한 면의 벽이 되기까지'],
      ['같은 자재도 누가 시공하느냐에 따라 마감이 달라집니다.','같은 자재도 누가 시공하느냐에 따라 마감이 달라집니다.'],
      ['마루를 고르셨다면, 문틀 옆 마감도 눈여겨보세요.','벽장재를 고르셨다면, 모서리 마감도 눈여겨보세요.'],
      ['잘 깐 마루는 가장자리에서 보입니다.','벽 한 면의 완성도는 이음선에서 보입니다.']
    ]},
    ask:{label:'고객 상담 · 우리 집 마감',section:'우리 집 시공 상담',note:'공간 사진과 고민되는 부분을 보내주세요. 어울리는 자재와 마감 방법을 함께 살펴봅니다.',choices:[
      ['우리 집 걸레받이도 그대로 쓸 수 있을까요?','우리 집 벽에도 이 무늬가 어울릴까요?'],
      ['문 앞에서 마루는 어떻게 만날까요?','모서리에서는 무늬가 어떻게 이어질까요?'],
      ['우리 집 빛에서는 어떤 색으로 보일까요?','우리 집 빛에서는 어떤 색으로 보일까요?']
    ]},
    partner:{label:'거래처 협업 · 도면과 일정',section:'거래처 시공 협의',defaultChoice:3,note:'도면이나 현장 사진에 희망 일정을 함께 보내주세요. 자재 규격과 시공 순서를 검토합니다.',choices:[
      ['도면 한 장으로 시작하는 시공 협의','도면 한 장으로 시작하는 시공 협의'],
      ['문틀과 마루가 만나는 높이, 도면에서 먼저 봅니다.','코너에서 만나는 벽면, 도면에서 먼저 봅니다.'],
      ['다음 공정까지 생각한 마루 시공','다음 공정까지 생각한 벽장재 시공'],
      ['같은 마루도 문틀 앞에서 시공의 차이가 보입니다.','같은 벽장재도 모서리에서 시공의 차이가 보입니다.']
    ]},
    participate:{label:'참여 · 다음 장면 고르기',section:'다음 현장 이야기',note:'가까이 보고 싶은 곳을 댓글로 알려주세요.',choices:[
      ['다음엔 나뭇결과 문 앞 마감, 어디부터 볼까요?','다음엔 벽 무늬와 코너 마감, 어디부터 볼까요?'],
      ['넓게 본 공간과 가까이 본 결, 어느 쪽이 좋으세요?','넓게 본 공간과 가까이 본 무늬, 어느 쪽이 좋으세요?']
    ]}
  };
  const contact={phone:'032-210-6268',site:'https://cheonginmaru.com',chat:'https://pf.kakao.com/_xkcwEn/chat'};
  const pinnedComment=[
    '시공이나 전시장 방문이 궁금하시면 청인마루에 편하게 문의해 주세요.',
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
  window.CheonginCoverStyle={colors,font,loadTitle,pairLabel,drawLabel,logo,drawLogo,drawText,sceneFrames,hits,cornerLayout,drawCorner,endings,endingText,contact,pinnedComment,contactIcon};
})();
