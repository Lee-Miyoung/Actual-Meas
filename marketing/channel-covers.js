/* Export compositions for the six places a construction photo is published. */
(() => {
  'use strict';

  const style=window.CheonginCoverStyle;
  const formats = {
    carousel: '인스타 피드', reels: '인스타 릴스', shorts: '유튜브 쇼츠',
    youtubeCover: '유튜브 썸네일', naverCover: '네이버 블로그', kakao: '카카오채널'
  };
  const feedLayouts={
    walkthrough:{name:'공간 산책 · 두 장면',hint:'전경과 한 걸음 들어간 장면을 고르세요. 전후 기록도 같은 자리에서 비교할 수 있습니다.'},
    finish:{name:'마감 돋보기 · 근접 컷',hint:'결이나 모서리가 잘 보이는 근접 사진을 고르세요. 비워 두면 표지 사진에서 확대합니다.'},
    vote:{name:'취향 투표 · A/B',hint:'같은 현장에서 보여주고 싶은 사진 두 장을 고르세요. A와 B 중 다음에 더 보고 싶은 장면을 물어보세요.'}
  };
  const editorial=key=>key==='gallery'||key==='grain'||Object.hasOwn(feedLayouts,key);
  function feedTitle(layout,kind,pair,compare){
    if(layout==='walkthrough')return pair?(compare?'같은 자리, 어떻게 달라졌을까요?':'한 걸음 들어가면 무엇이 보일까요?'):'이 공간, 어디부터 볼까요?';
    if(layout==='finish')return kind==='wall'?'가까이서 보면 어떤 무늬일까요?':'가까이서 보면 어떤 결일까요?';
    if(layout==='vote')return pair?'A와 B, 어느 쪽이 더 궁금하세요?':'어느 부분을 더 보고 싶으세요?';
    return '';
  }
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
      spec:window.CheonginDisplaySpec?.(manual.spec || selected?.size || '') ?? (manual.spec || selected?.size || ''), structure:manual.structure || state.productStructure || '',
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
    const pair = (!editorial(info.layout)||['vote','walkthrough'].includes(info.layout)) && Boolean(photos.before && photos.after && photos.before.id !== photos.after.id);
    const defaultHeadline=feedTitle(info.layout,kind,pair,info.pairConcept!=='preview') || (info.layout==='grain'?(kind==='wall'?'멀리서도 벽의 결이 보일까요?':'바닥의 결, 멀리서도 보일까요?'):suggestedTitle(channel,info,kind,pair));
    const headline=info.title?.trim()||defaultHeadline;
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
    function photo(p,x,y,w,h,{focusY,zoom=1,target=p.target||'background'} = {}) {
      const im = p.image;
      const transform=p.transform||{};
      const fit = Math.max(w/im.width,h/im.height)*zoom*Math.max(1,Math.min(3,transform.zoom||1));
      const sw=w/fit, sh=h/fit;
      const anchorY = transform.y ?? focusY ?? p.focusY ?? (kind==='floor' ? .69 : kind==='wall' ? .39 : .53);
      const anchorX = transform.x ?? p.focusX ?? .5;
      const sx=(im.width-sw)*Math.max(0,Math.min(1,anchorX));
      const sy=(im.height-sh)*Math.max(0,Math.min(1,anchorY));
      g.drawImage(im,sx,sy,sw,sh,x,y,w,h);
      canvas.photoLayout.push({id:p.id,target,anchorX,anchorY,x,y,width:w,height:h,sx,sy,sw,sh,sourceWidth:im.width,sourceHeight:im.height,fit:'cover'});
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
      for(const {role,x,width} of style.sceneFrames(W,60)){
        rect(x-1,y-1,width+2,height+2,paper);photo(photos[role],x,y,width,height);tag(role,x+12,y+12);
      }
    }
    function fineLine(x,y,w,color) {rect(x,y,w,2,color);}
    const main = photos.hero;
    const u=W/1080;
    const tallChannel=channel==='reels'||channel==='shorts';
    const cornerTop=tallChannel?(editorial(info.layout)?128*u:180):channel==='kakao'?32:42;
    const corner=style.cornerLayout(g,W,W-(tallChannel?70:52)*u,cornerTop,W>H,info.housing,info.areaPyeong,!!photos.exterior);

    function editorialCover(){
      const wide=W>H,tall=H/W>1.55,grain=info.layout==='grain',u=W/1080;
      const bg=grain?'#f3efe5':'#213b35',bodyInk=grain?'#24332b':'#fffaf0',smallInk=grain?'#596157':'#d8ded1';
      const margin=(wide?39:54)*u;
      rect(0,0,W,H,bg);
      // The image carries the first glance. Keep the actual site, title and specifications on one quiet panel.
      let px,py,pw,ph;
      if(wide){px=W*.60;py=0;pw=W-px;ph=H;}
      else{px=0;py=H-(tall?510:Math.min(365,H/u*.34))*u;pw=W;ph=H-py;}
      const imgW=wide?px:W,imgH=wide?H:py;
      if(grain){
        const gap=imgW*.035,detailW=imgW*.35;
        const portraitDetail=photos.detail||{...main,transform:info.transforms?.detail||{}};
        photo(main,0,0,imgW-gap-detailW,imgH);
        photo(portraitDetail,imgW-detailW,0,detailW,imgH,{target:'detail',zoom:photos.detail?1:1.65,focusY:kind==='floor' ? .76 : .42});
      }else photo(main,0,0,imgW,imgH);
      brand(margin,tall?128*u:32*u);
      const x=px+margin,width=pw-2*margin;
      const headSize=(wide?47:tall?68:58)*u,titleRows=wide?3:2;
      // Reserve the actual typography height. On a landscape cover the circular photo and badge live above the text.
      const headerSpace=wide&&(photos.exterior||info.housing||info.areaPyeong)?corner.bottom+12*u:0;
      const place=(value,size,rows,serif,color,y)=>type(value,x,y,width,size,{rows,serif,color,leading:1.2});
      const items=[
        {value:info.location===info.housing?'':info.location,size:(wide?19:23)*u,rows:1,color:smallInk,gap:12*u},
        {value:headline,size:headSize,rows:titleRows,serif:true,color:bodyInk,gap:18*u},
        {value:info.product,size:(wide?23:29)*u,rows:2,color:bodyInk,gap:4*u},
        {value:info.spec,size:(wide?19:25)*u,rows:1,color:smallInk,gap:0}
      ].filter(item=>item.value);
      const lineHeight=item=>{
        const family=item.serif?useSerif:useSans;
        const l=CheonginType.layout(item.value,{width,fontSize:item.size,minFontSize:Math.max(16,Math.round(item.size*.66)),maxLines:item.rows,leading:1.2,
          measure:(v,n)=>{g.font=item.value===headline?style.font(n):'400 '+n+'px '+family;return g.measureText(v).width;}});
        return l.lines.length*l.lineHeight;
      };
      function groupHeight(){return items.reduce((sum,item)=>sum+lineHeight(item)+item.gap,0);}
      const inset=tall?105*u:18*u;
      const available=ph-headerSpace-inset-14*u;
      let height=groupHeight();
      if(height>available){const factor=available/height;items.forEach(item=>{item.size=Math.max(16,item.size*factor);item.gap*=factor;});height=groupHeight();}
      let y=py+headerSpace+Math.max(10*u,(ph-headerSpace-inset-height)/2);
      for(const item of items)y+=place(item.value,item.size,item.rows,item.serif,item.color,y)+item.gap;
      canvas.dataset.template=info.layout;
    }

    function feedCover(){
      const layout=info.layout,wide=W>H,tall=H/W>1.55,u=W/1080;
      const margin=(wide?40:50)*u,gap=14*u,top=tall?128*u:32*u;
      const first=pair?photos.before:main,second=photos.after;
      function caption(x,y,w,h,bg,fg,small){
        rect(x,y,w,h,bg);
        const left=x+margin,width=w-2*margin;
        const rows=[
          {v:info.location===info.housing?'':info.location,size:21,lines:1,color:small,gap:9},
          {v:headline,size:wide?47:59,lines:2,color:fg,gap:15},
          {v:headline===info.product?'':info.product,size:26,lines:2,color:fg,gap:4},
          {v:info.spec,size:22,lines:1,color:small,gap:0}
        ].filter(r=>r.v);
        const usable=h-(tall&&y+h>=H-1?90*u:0);
        function height(factor){
          return rows.reduce((sum,r)=>{
            const n=r.size*u*factor;
            const l=CheonginType.layout(r.v,{width,fontSize:n,minFontSize:Math.max(16,Math.round(n*.66)),maxLines:r.lines,leading:1.18,
              measure:(line,s)=>{g.font=r.v===headline?style.font(s):'400 '+s+'px '+useSans;return g.measureText(line).width;}});
            return sum+l.lines.length*l.lineHeight+r.gap*u*factor;
          },0);
        }
        let f=1;
        for(let i=0;i<3&&height(f)>usable-26*u;i++)f*=Math.max(.72,(usable-26*u)/height(f));
        let yy=y+Math.max(8*u,(usable-height(f))/2);
        for(const r of rows)yy+=type(r.v,left,yy,width,r.size*u*f,{rows:r.lines,color:r.color,leading:1.18})+r.gap*u*f;
      }
      if(layout==='walkthrough'){
        const bg='#EFE7DB';
        rect(0,0,W,H,bg);
        if(wide){
          const split=W*.58;
          if(pair){
            const mid=H*.55;
            photo(first,0,0,split,mid);photo(second,0,mid+gap,split,H-mid-gap);
            tag('before',margin,mid-57*u);tag('after',margin,H-57*u);
          }else photo(main,0,0,split,H);
          const start=corner.bottom+14*u;
          caption(split,start,W-split,H-start,bg,'#382D28','#6D5B50');
        }else if(pair){
          const upper=H*(tall ? .47 : .44),band=Math.min(H*.265,322*u);
          photo(first,0,0,W,upper);
          caption(0,upper,W,band,bg,'#382D28','#6D5B50');
          photo(second,0,upper+band,W,H-upper-band);
          tag('before',margin,upper-58*u);tag('after',margin,upper+band+18*u);
        }else{
          const split=H*(tall ? .69 : .70);
          photo(main,0,0,W,split);caption(0,split,W,H-split,bg,'#382D28','#6D5B50');
        }
      }else if(layout==='finish'){
        const bg='#263B37',ink='#FCF4E4',soft='#D1DFD3';
        const detail=photos.detail||{...main,transform:info.transforms?.detail||{}};
        const macro=(x,y,w,h)=>photo(detail,x,y,w,h,{target:'detail',zoom:photos.detail?1:1.8,focusY:kind==='floor' ? .78 : .47});
        rect(0,0,W,H,bg);
        if(wide){
          const split=W*.55;
          macro(0,0,split,H);
          const thumbW=(W-split)*.42,thumbH=H*.24;
          photo(main,split+margin,30*u,thumbW,thumbH);
          const start=Math.max(thumbH+45*u,corner.bottom+12*u);
          caption(split,start,W-split,H-start,bg,ink,soft);
        }else{
          const split=H*(tall ? .65 : .69),thumbW=W*.25;
          macro(0,0,W,split);
          const thumbH=Math.min((H-split)*.63,thumbW*1.05);
          const y=split+(H-split-(tall?90*u:0)-thumbH)/2;
          photo(main,margin,y,thumbW,thumbH);
          caption(margin+thumbW,split,W-margin-thumbW,H-split,bg,ink,soft);
        }
      }else{
        const bg='#EEE8BE',split=H*(wide ? .62 : tall ? .65 : .68),divider=18*u;
        rect(0,0,W,H,bg);
        if(pair){
          const left=Math.round((W-divider)*.52);
          photo(first,0,0,left,split);photo(second,left+divider,0,W-left-divider,split);
          for(const [letter,x] of [['A',margin],['B',left+divider+margin]]){
            const side=51*u,y=split-side-24*u;
            g.save();g.fillStyle=bg;g.beginPath();g.roundRect(x,y,side,side,side/2);g.fill();
            g.fillStyle='#2E3B2C';g.font='600 '+28*u+'px '+useSans;g.textAlign='center';g.textBaseline='middle';g.fillText(letter,x+side/2,y+side/2);g.restore();
          }
        }else photo(main,0,0,W,split);
        caption(0,split,W,H-split,bg,'#283829','#55604D');
      }
      brand(margin,top);canvas.dataset.template=layout;
    }

    if(Object.hasOwn(feedLayouts,info.layout))feedCover();
    else if(editorial(info.layout))editorialCover();
    else if (channel==='carousel') {
      photo(main,0,0,W,1150);
      brand(60,42,182);
      
      fineLine(60,photos.exterior?corner.bottom+20:148,960,'rgba(255,255,247,.52)');
      type(headline,58,photos.exterior?corner.bottom+38:170,920,78,{rows:2,serif:true,color:white});
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
      const gap=pair?Math.round(W*.041):4,side=548;
      photo(pair?photos.before:main,0,0,side,H);
      photo(pair?photos.after:main,side+gap,0,W-side-gap,H,{focusY:(pair?photos.after:main).focusY ?? .46});
      rect(side,0,gap,H,paper);
      brand(40,36,144);
      type(materialLabel,40,186,side-72,25,{color:'#eddfbd'});
      const used=type(headline,39,244,side-76,72,{rows:3,serif:true,color:white,leading:1.20});
      const productHeight=type(info.product,40,244+used+30,side-72,25,{rows:2,color:white});type(info.spec,40,244+used+productHeight+44,side-72,22,{color:white});
      if (pair) {tag('before',39,632);tag('after',side+gap+30,632);}
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
    style.drawCorner(g,canvas,corner,photos.exterior);
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
    Object.assign(info,{layout:choice.layout,transforms:choice.transforms,location:choice.siteText?.trim() || info.location,title:(editorial(choice.layout)?choice.title:choice.titles?.[channel]) || info.title, housing:choice.housing || '', areaPyeong:choice.areaPyeong || '', material:choice.material,logoTone:choice.logoTone,pairConcept:choice.layout==='vote'?'preview':choice.pairConcept,firstScene:choice.firstScene,secondScene:choice.secondScene});
    const src = {hero:main};
    const seriesPair=['walkthrough','vote'].includes(choice.layout);
    const first=get(choice.beforeId)||(seriesPair&&info.pairConcept==='preview'?main:null),second=get(choice.afterId);
    if ((seriesPair||(!editorial(choice.layout)&&['carousel','reels','shorts','youtubeCover'].includes(channel))) && first && second && first.id!==second.id) {
      src.before=first;src.after=second;
    }
    if ((['grain','finish'].includes(choice.layout)||channel==='naverCover'||(channel==='shorts'&&!src.before)) && get(choice.detailId)) src.detail=get(choice.detailId);
    const outside=choice.exteriorId&&(get(choice.exteriorId)||(choice.exteriorPhoto?.id===choice.exteriorId?choice.exteriorPhoto:null));
    if(outside)src.exterior=outside;
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

  window.CheonginChannelCovers={formats,render,fromProject,getProjectInfo,material,suggestedTitle,editorial,feedLayouts,feedTitle};
})();
