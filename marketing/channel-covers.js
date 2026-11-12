/* Export compositions for the six places a construction photo is published. */
(() => {
  'use strict';

  const style=window.CheonginCoverStyle;
  const formats = {
    carousel: '인스타 피드', reels: '인스타 릴스', shorts: '유튜브 쇼츠',
    youtubeCover: '유튜브 썸네일', naverCover: '네이버 블로그', kakao: '카카오채널'
  };
  const paper = '#f5f1e8', ink = '#272e29', muted = '#4e584e', white = '#fffdf5';
  const categories = {floor:'마루', wall:'벽장재', both:'마루·벽장재'};
  const ruleSet = SignatureCore.create().platforms;
  const join = (...parts) => parts.filter(Boolean).join(' · ');

  function material(info, choice) {
    if (categories[choice]) return choice;
    const description = join(info.structure, info.kind, info.product);
    const wall = /벽장재|시그니월|디자인월|아트월|wall/i.test(description);
    if (wall && /마루\s*[·+&/와과]\s*벽장재|벽장재\s*[·+&/와과]\s*마루/.test(description)) return 'both';
    return wall ? 'wall' : 'floor';
  }

  function suggestedTitle(channel, info, kind, pair, concept=info.pairConcept) {
    if(pair && concept==='preview')return {floor:'한 공간에서 만난 두 가지 결',wall:'가까이서 본 벽의 표정',both:'벽과 바닥이 만나는 자리'}[kind];
    const name = categories[kind];
    const question = {floor:'우리 집에 깔면 어떤 느낌일까요?', wall:'우리 집 벽에도 어울릴까요?', both:'벽과 바닥을 함께 고른다면?'}[kind];
    switch (channel) {
      case 'reels': return {floor:'한 걸음 가까이, 바닥의 결',wall:'한 걸음 가까이, 벽의 표정',both:'벽에서 바닥으로 이어지는 시선'}[kind];
      case 'shorts': return pair ? name + ' 시공 전과 후' : name + ' 가까이 보기';
      case 'youtubeCover': return pair ? '같은 공간,\n' + name + ' 시공 전후' : question;
      case 'naverCover': return info.product || name + ' 시공 기록';
      case 'kakao': return name + ' 시공 상담';
      default: return question;
    }
  }

  function getProjectInfo(photoId) {
    const manual = state.manualOverlay || {};
    const binding = state.signaturePhotos?.[photoId];
    const selected = binding?.productSnapshot || (binding?.productKey && Writer.resolveProduct(state.catalog, binding.productKey))
      || selectedProduct() || state.signatureProjectProduct;
    const product = selected && [selected.brand, selected.model, selected.color].filter((s,i,a) => s && a.indexOf(s) === i).join(' ');
    return {
      product:manual.product || product || '', kind:selected?.category || (selected?.type==='wall' ? '벽장재' : ''),
      spec:manual.spec || selected?.size || '', structure:manual.structure || state.productStructure || '',
      location:manual.location || state.marketingSite || join(state.region, state.space) || state.title || '',
      title:manual.title || ''
    };
  }

  async function render(channel, info, photos, {maxEdge = Infinity, showLogo = true} = {}) {
    const {width:W, height:H} = ruleSet[channel];
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxEdge / Math.max(W,H));
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const g = canvas.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.scale(canvas.width / W, canvas.height / H);
    canvas.typeLayout = [];
    canvas.photoLayout = [];
    const kind = material(info,info.material);
    const pair = Boolean(photos.before && photos.after && photos.before.id !== photos.after.id);
    const headline = info.title?.trim() || suggestedTitle(channel, info, kind, pair);
    const materialLabel = categories[kind] + ' 시공';
    const where = join(info.housing && !info.location?.includes(info.housing) ? info.housing : '', info.location);
    const details = {floor:'바닥의 결',wall:'벽면 질감',both:'소재 디테일'}[kind];
    const allText = [headline, where, info.product, materialLabel, details, '시공 전후 현장 사진으로 상담하기'].join(' ');
    await Promise.all(['Studio Serif','Studio Sans'].map(f => document.fonts.load('400 40px "'+f+'"', allText)));
    await style.loadTitle(headline);
    const logo = showLogo ? await style.logo(info.logoTone) : null;
    const useSerif = '"Studio Serif", "Noto Serif CJK KR", serif';
    const useSans = '"Studio Sans", "Noto Sans CJK KR", sans-serif';
    Object.assign(canvas.dataset,{renderer:'cheongin-channel-cover-v1',platform:channel,exportWidth:W,exportHeight:H,material:kind,pairConcept:info.pairConcept||'compare',comparison:String(pair&&info.pairConcept!=='preview'),slide:'0'});

    function rect(x,y,w,h,color) {
      g.fillStyle = color;
      g.fillRect(x,y,w,h);
    }
    function photo(p,x,y,w,h,{focusY,zoom=1} = {}) {
      const im = p.image;
      const transform=p.transform||{};
      const fit = Math.max(w/im.width,h/im.height)*zoom*Math.max(1,Math.min(3,transform.zoom||1));
      const sw=w/fit, sh=h/fit;
      const anchorY = transform.y ?? focusY ?? p.focusY ?? (kind==='floor' ? .69 : kind==='wall' ? .39 : .53);
      const anchorX = transform.x ?? p.focusX ?? .5;
      const sx=(im.width-sw)*Math.max(0,Math.min(1,anchorX));
      const sy=(im.height-sh)*Math.max(0,Math.min(1,anchorY));
      g.drawImage(im,sx,sy,sw,sh,x,y,w,h);
      canvas.photoLayout.push({id:p.id,target:p.target||'background',anchorX,anchorY,x,y,width:w,height:h,sx,sy,sw,sh,sourceWidth:im.width,sourceHeight:im.height,fit:'cover'});
    }
    function type(value,x,y,w,size,{rows=1,serif=false,color=ink,align='left',leading=1.24} = {}) {
      if (!value) return 0;
      const family = serif ? useSerif : useSans;
      const measured = CheonginType.layout(value,{width:w,fontSize:size,minFontSize:Math.max(16,Math.round(size*.66)),maxLines:rows,leading,
        measure:(line,n) => {g.font=value===headline?style.font(n):'400 '+n+'px '+family; return g.measureText(line).width;}});
      g.textBaseline='top'; g.fillStyle=color; g.font=value===headline?style.font(measured.size):'400 '+measured.size+'px '+family;
      measured.lines.forEach((line,i) => {
        const xx = align==='right' ? x+w-measured.widths[i] : x;
        const yy=y+i*measured.lineHeight;
        window.CheonginCoverStyle.drawText(g,line,xx,yy);
        canvas.typeLayout.push({field:value===headline?'title':value===info.product?'product':value===info.spec?'spec':value===where?'location':null,source:value,x:xx,y:yy,width:measured.widths[i],height:measured.lineHeight,size:measured.size});
      });
      
      if (measured.truncated) canvas.dataset.textTruncated='true';
      return measured.lines.length*measured.lineHeight;
    }
    function brand(x,y,w) {
      if (logo) style.drawLogo(g,canvas,logo,W,x,y);
    }
    function tag(role,x,y) {style.drawLabel(g,canvas,info,role,x,y);}
    function pairStrip(y,height) {
      const gap=12, margin=60, width=(W-2*margin-gap)/2;
      for(const [index,role] of ['before','after'].entries()){
        const x=margin+index*(width+gap);
        rect(x-2,y-2,width+4,height+4,paper);photo(photos[role],x,y,width,height);tag(role,x+12,y+12);
      }
    }
    function fineLine(x,y,w,color) {rect(x,y,w,2,color);}
    const main = photos.hero;

    if (channel==='carousel') {
      photo(main,0,0,W,1150);
      brand(60,42,182);
      
      fineLine(60,148,960,'rgba(255,255,247,.52)');
      type(headline,58,170,920,78,{rows:2,serif:true,color:white});
      if(pair)pairStrip(870,240);
      rect(0,1150,W,H-1150,paper);
      type(where||materialLabel,60,1184,960,27,{color:muted});
      type(info.product||materialLabel,58,1231,964,36,{rows:1,serif:true,leading:1.12});
      type(info.spec,60,1284,960,26,{color:muted});
    } else if (channel==='reels') {
      photo(main,0,0,W,H);
      brand(70,180,170);
      // Keep the lower navigation and the right-hand action rail clear.
      if(pair)pairStrip(560,275);
      type(where||materialLabel,70,1010,770,31,{color:white});
      fineLine(70,1074,80,white);
      const used=type(headline,67,1110,795,94,{rows:2,serif:true,color:white});
      const productHeight=type(info.product,70,1110+used+32,780,35,{rows:2,color:white});type(info.spec,70,1110+used+productHeight+48,780,27,{color:white});
    } else if (channel==='shorts') {
      rect(0,0,W,H,paper);
      photo(pair?photos.before:main,0,0,W,790,{focusY:(pair?photos.before:main).focusY ?? .4});
      const lower=pair ? photos.after : photos.detail || main;
      photo(lower,0,1075,W,H-1075,pair||photos.detail?{}:{zoom:1.65,focusY:kind==='wall' ? .38 : .78});
      brand(68,180,168);
      if (pair) {tag('before',68,699);tag('after',68,1113);}
      type(where||materialLabel,68,822,790,27,{color:muted});
      type(headline,65,878,810,67,{rows:2,serif:true});
    } else if (channel==='youtubeCover') {
      const side=548;
      photo(pair?photos.before:main,0,0,side,H);
      photo(pair?photos.after:main,side+4,0,W-side-4,H,{focusY:(pair?photos.after:main).focusY ?? .46});
      rect(side,0,4,H,paper);
      brand(40,36,144);
      type(materialLabel,40,186,side-72,25,{color:'#eddfbd'});
      const used=type(headline,39,244,side-76,72,{rows:3,serif:true,color:white,leading:1.20});
      const productHeight=type(info.product,40,244+used+30,side-72,25,{rows:2,color:white});type(info.spec,40,244+used+productHeight+44,side-72,22,{color:white});
      if (pair) {tag('before',39,632);tag('after',side+34,632);}
    } else if (channel==='naverCover') {
      const top=715;
      photo(main,0,0,W,top,{focusY:main.focusY ?? .42});
      brand(60,47,165);
      rect(0,top,W,H-top,paper);
      const left=61, right=836;
      type(where||materialLabel,left,top+54,right-left-36,27,{color:muted});
      fineLine(left,top+113,95,'#996143');
      const used=type(headline,left-2,top+145,right-left-30,62,{rows:2,serif:true});
      if (info.product && headline!==info.product) type(info.product,left,top+used+171,right-left-35,32,{rows:2});
      photo(photos.detail||main,right,top+60,305,274,photos.detail?{}:{focusY:kind==='wall' ? .35 : .86,zoom:1.75});
      type(details,right,top+355,305,27,{color:muted});
    } else if (channel==='kakao') {
      photo(main,0,0,W,458,{focusY:main.focusY ?? .44});
      brand(37,32,133);
      rect(0,458,W,272,paper);
      type(where||materialLabel,38,486,724,24,{color:muted});
      const used=type(headline,36,532,730,47,{rows:2,serif:true,leading:1.13});
      type(info.product,38,532+used+12,720,25,{rows:2});
      rect(0,730,W,70,'#354239');
      type(kind==='wall'?'상담 시 시공할 벽면 사진을 보내주세요':kind==='floor'?'상담 시 기존 바닥 사진을 보내주세요':'상담 시 벽과 바닥 사진을 보내주세요',38,750,724,23,{color:white});
    }
    const badgeLines=[info.housing,info.areaPyeong?info.areaPyeong+'평형':''].filter(Boolean);
    if(badgeLines.length){
      const unit=W/1080, margin=channel==='reels'||channel==='shorts'?70*unit:52*unit;
      const y=channel==='reels'||channel==='shorts'?180:channel==='kakao'?32:42;
      g.save();g.font='500 '+25*unit+'px '+useSans;
      const bw=Math.max(118*unit,...badgeLines.map(t=>g.measureText(t).width+40*unit)),bh=(badgeLines.length===2?86:52)*unit,bx=W-margin-bw;
      g.fillStyle='rgba(35,40,35,.42)';g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=unit;g.beginPath();g.roundRect(bx,y,bw,bh,12*unit);g.fill();g.stroke();
      g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
      badgeLines.forEach((t,i)=>{g.font=(i?'400 ':'500 ')+(i?21:25)*unit+'px '+useSans;g.fillText(t,bx+bw/2,y+(badgeLines.length===2?27+i*33:27)*unit);});
      g.restore();
    }
    canvas.previewMeta={title:headline,product:info.product,spec:info.spec,location:info.location,site:info.location};
    return canvas;
  }

  async function fromProject(channel, choice, options={}) {
    const get = id => state.photos.find(p=>p.id===id);
    const best = state.photos.find(p=>state.signaturePhotos?.[p.id]?.role==='after') ||
      state.photos.find(p=>!['before','progress','pair'].includes(state.signaturePhotos?.[p.id]?.role)) || state.photos[0];
    const main = get(choice.photoId) || best;
    if (!main) throw Error('표지 사진을 먼저 선택하세요.');
    const info = getProjectInfo(main.id);
    Object.assign(info,{location:choice.siteText?.trim() || info.location,title:choice.titles?.[channel] || info.title, housing:choice.housing || '', areaPyeong:choice.areaPyeong || '', material:choice.material,logoTone:choice.logoTone,pairConcept:choice.pairConcept,firstScene:choice.firstScene,secondScene:choice.secondScene});
    const src = {hero:main};
    if (['carousel','reels','shorts','youtubeCover'].includes(channel) && get(choice.beforeId) && get(choice.afterId) && choice.beforeId!==choice.afterId) {
      src.before=get(choice.beforeId); src.after=get(choice.afterId);
    }
    if ((channel==='naverCover'||(channel==='shorts'&&!src.before)) && get(choice.detailId)) src.detail=get(choice.detailId);
    const decoded=new Map(), photos={};
    try {
      for (const [role,p] of Object.entries(src)) {
        if (!decoded.has(p.id)) {
          const source=await (options.maxEdge?photoImage(p):loadImage(p.src)), previous=original;
          original=false;
          try {decoded.set(p.id,transformed(source,p.adjust,options.maxEdge?2560:4096));}
          finally {original=previous;if(!options.maxEdge)source.src='';}
        }
        const binding=state.signaturePhotos?.[p.id] || {};
        const target=role==='hero'?'background':role;
        photos[role]={id:p.id,target,transform:choice.transforms?.[target],image:decoded.get(p.id),focusX:binding.focusX,focusY:binding.focusY ?? binding.focus};
      }
      return await render(channel,info,photos,options);
    } finally {for (const canvas of decoded.values()) releaseCanvas(canvas);}
  }

  window.CheonginChannelCovers={formats,render,fromProject,getProjectInfo,material,suggestedTitle};
})();
