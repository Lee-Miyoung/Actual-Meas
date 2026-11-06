/* One photographic identity, adapted to each channel. No generated room geometry. */
const EDITORIAL = Object.freeze({ paper: '#f5f3ed', ink: '#2d332f', muted: '#73796f', line: '#c9cdc2', accent: '#69745e', margin: 72 });
const designMarks = { dark: loadImage('brand/logo-charcoal.svg').catch(()=>null), light: loadImage('brand/logo-white.svg').catch(()=>null) };
function releaseCanvas(c) { if(c instanceof HTMLCanvasElement) c.width=c.height=1; }
function editorialRows(ctx, value, width) {
  const rows=[];
  for(const paragraph of String(value||'').split('\n')) {
    let line='';
    for(const char of paragraph) {
      if(line && ctx.measureText(line+char).width>width){ rows.push(line.trim());line=char.trimStart(); } else line+=char;
    }
    if(line)rows.push(line.trim());
  }
  return rows;
}
async function renderPlatformDesign(content, image, index=0, format='carousel') {
  const preset=OUTPUT_PRESETS[format];
  const natural=format==='naver';
  const dims=natural?CheonginBrandKit.dimensions(OUTPUT_PRESETS.naver,image.width,image.height):format==='blog'?[1080,720]:preset?[preset.width,preset.height]:[1080,1350];
  const c=document.createElement('canvas');[c.width,c.height]=dims;
  const g=c.getContext('2d'),scale=c.width/1080,h=c.height/scale;
  const theme=content.theme||'editorial',product=Writer.label(content.product||{});
  const title=content.carousel?.[index]?.text||content.title||Writer.SLOGAN;
  const spec=[content.product?.size,content.product?.pack,content.product?.coverage].filter(Boolean).join(' · ');
  await Promise.all([document.fonts.load('400 56px "Studio Serif"',title+'청인마루'),document.fonts.load('400 24px "Studio Sans"',product+spec+Writer.SLOGAN)]);
  g.scale(scale,scale);g.fillStyle=EDITORIAL.paper;g.fillRect(0,0,1080,h);
  function text(value,x,y,width,size=24,maxLines=2,serif=false,color=EDITORIAL.ink,minSize=size){
    g.fillStyle=color;let rows;
    do{g.font=`400 ${size}px "${serif?'Studio Serif':'Studio Sans'}"`;rows=editorialRows(g,value,width);if(rows.length<=maxLines||size<=minSize)break;size-=2;}while(size>=minSize);
    if(rows.length>maxLines){rows=rows.slice(0,maxLines);let last=rows[maxLines-1];while(last&&g.measureText(last+'…').width>width)last=last.slice(0,-1);rows[maxLines-1]=last+'…';c.dataset.textTruncated='true';}
    rows.forEach((row,i)=>g.fillText(row,x,y+i*size*1.5));return rows.length*size*1.5;
  }
  function rule(y,x=72,width=936,color=EDITORIAL.line){g.fillStyle=color;g.fillRect(x,y,width,1);}
  function photo(x,y,w,hh){
    g.save();g.beginPath();g.rect(x,y,w,hh);g.clip();
    if(content.focus!=null)image.focus={x:image.focus?.x??.5,y:content.focus};
    if(content.pair&&image.width/image.height>1.4){
      const vertical=hh/w>1.1,sw=image.width*.495;
      for(let i=0;i<2;i++){
        const px=vertical?x:x+i*w/2,py=vertical?y+i*hh/2:y,pw=vertical?w:w/2,ph=vertical?hh/2:hh;
        const crop=ProductionCore.crop(sw,image.height,pw,ph,content.focus??.5);
        g.drawImage(image,(i?image.width-sw:0)+crop.sx,crop.sy,crop.sw,crop.sh,px,py,pw,ph);
        g.fillStyle=EDITORIAL.paper;g.fillRect(px+20,py+20,105,42);text(i?'시공 후':'시공 전',px+33,py+49,100,20,1);
      }
    } else cover(g,image,x,y,w,hh);
    g.restore();
  }
  async function header(light=false,y=66){
    const mark=await designMarks[light?'light':'dark'];
    if(mark)g.drawImage(mark,72,y-25,128,128*mark.height/mark.width);
    else text('청인마루',72,y,300,26,1,true,light?'#fff':EDITORIAL.ink);
    text('SPACE JOURNAL  /  '+String(index+1).padStart(2,'0'),740,y,270,15,1,false,light?'#fff':EDITORIAL.muted);
  }
  function footer(y=h-34,light=false){const color=light?'#f5f3ed':EDITORIAL.muted;if(index===1&&spec){text(product,72,y-34,936,22,1,false,color);text(spec,72,y,936,22,1,false,color);}else text(product||Writer.SLOGAN,72,y,936,24,1,false,color);}
  function gradient(from,to){const a=g.createLinearGradient(0,from,0,to);a.addColorStop(0,'rgba(20,28,23,0)');a.addColorStop(1,'rgba(20,28,23,.88)');g.fillStyle=a;g.fillRect(0,from,1080,to-from);}
  if(natural){
    // Body photos keep their ratio and material colour, without an advertising overlay.
    g.drawImage(image,0,0,1080,h);
  }else if(['story','reels','shorts'].includes(format)){
    photo(0,0,1080,h);gradient(920,h);await header(true,230);
    text('공간의 기록',72,1230,900,22,1,false,'#f5f3ed');
    text(title,72,1320,880,64,3,true,'#fff',48);
    rule(1588,72,880,'#ffffff66');text(product||Writer.SLOGAN,72,1635,860,23,2,false,'#f5f3ed');
    // Main copy stays between the app overlays, away from the right action rail.
  }else if(['blog','youtubeCover','kakaoWide'].includes(format)){
    photo(0,0,688,h);await header(false,64);
    g.fillStyle=EDITORIAL.paper;g.fillRect(688,0,392,h);
    text('청인마루 / 현장 기록',732,70,300,17,1,false,EDITORIAL.muted);
    text(content.title||title,732,170,278,42,5,true,EDITORIAL.ink,32);
    rule(h-130,732,276);text(product,732,h-85,278,21,2,false,EDITORIAL.muted);
  }else if(['kakao','youtube','naverCover'].includes(format)){
    photo(0,0,1080,h*.70);
    text('공간의 기록  /  '+String(index+1).padStart(2,'0'),72,h*.70+57,936,17,1,false,EDITORIAL.muted);
    text(title,72,h*.70+126,936,48,2,true,EDITORIAL.ink,36);
    footer(h-33);
  }else if(theme==='gallery'){
    photo(0,0,1080,h);gradient(h*.51,h);await header(true);
    text('공간의 기록',72,h-303,936,19,1,false,'#f5f3ed');
    text(title,72,h-225,936,58,2,true,'#fff',46);rule(h-88,72,936,'#ffffff66');footer(h-39,true);
  }else if(theme==='journal'){
    await header();rule(102);
    if(index%2===0){
      photo(72,144,792,h-470);
      g.save();g.translate(965,154);g.rotate(Math.PI/2);text('MATERIAL & SPACE',0,0,650,17,1,false,EDITORIAL.muted);g.restore();
      text(title,72,h-232,936,54,2,true,EDITORIAL.ink,44);
    }else{
      text(title,72,205,936,54,2,true,EDITORIAL.ink,44);
      photo(216,374,792,h-512);
    }
    rule(h-88);footer(h-39);
  }else{
    await header();rule(102);
    if(index===0){
      photo(36,144,1008,h-472);
      text('공간의 기록',72,h-266,936,18,1,false,EDITORIAL.muted);
      text(title,72,h-193,936,57,2,true,EDITORIAL.ink,45);
    }else if(index%3===1){
      photo(72,144,936,h-454);
      text(title,72,h-218,936,50,2,true,EDITORIAL.ink,42);
    }else if(index%3===2){
      text(title,72,200,936,50,2,true,EDITORIAL.ink,42);
      photo(72,365,936,h-505);
    }else{
      photo(36,144,1008,h-454);
      text(title,72,h-218,936,50,2,true,EDITORIAL.ink,42);
    }
    rule(h-88);footer(h-39);
  }
  c.dataset.platform=format;c.dataset.design=theme;c.dataset.renderer='editorial-v3';return c;
}
workflowCard=async function(content,index,format='carousel'){
  if(!content.photoRefs?.length)throw Error('먼저 현장 사진을 등록하세요.');
  const ref=content.photoRefs[index%content.photoRefs.length],image=await workflowImage(ref,['story','reels','shorts'].includes(format)?2560:1800);
  try{return await renderPlatformDesign(content,image,index,format);}finally{releaseCanvas(image);}
};
const previousPlatformCard=card;
card=async function(theme,slide,format=state.format){
  if(brandSettings().fit==='contain')return previousPlatformCard(theme,slide,format);
  const requested=state.brandSlides?.[slide]?.photo;
  // All directions use the same sequence, so comparisons reflect design, not a different site.
  const photo=ProductionCore.matchPhoto(requested,state.photos)||state.photos[slide%state.photos.length];
  if(!photo)throw Error('먼저 현장 사진을 등록하세요.');
  const vertical=['story','reels','shorts'].includes(format);
  const image=vertical?await loadImage(photo.src):await photoImage(photo),was=original;let corrected;
  original=false;try{corrected=transformed(image,photo.adjust,vertical?2560:1800);}finally{original=was;if(vertical)image.src="";}
  const draft=state.authoring?.draft?.inputSignature===window.currentWritingSignature?.()?state.authoring.draft:{};
  const settings=brandSettings(),custom=settings.titles.split(/\r?\n/).filter(Boolean);
  const carousel=Array.from({length:state.slideCount||5},(_,i)=>({text:custom[i]||draft.carousel?.[i]?.text||state.title||Writer.SLOGAN}));
  let product={...(selectedProduct()||{})};
  if(settings.product&&settings.product!==Writer.label(product)&&settings.product!==product.model)product={model:settings.product};
  if(settings.size)product.size=settings.size;
  try{return await renderPlatformDesign({...draft,carousel,theme,product,title:custom[slide]||state.title||Writer.SLOGAN,focus:state.brandSlides?.[slide]?.focus,pair:state.brandSlides?.[slide]?.layout==='pair'||(state.brandSlides?.[slide]?.layout!=='photo'&&/compare|비교|전후/i.test(photo.name))},corrected,slide,format);}finally{releaseCanvas(corrected);}
};
const directionSelect=$('production-style');
directionSelect.replaceChildren(new Option('01 공간 화보 · 정돈된 여백','editorial'),new Option('02 공간 갤러리 · 몰입형 사진','gallery'),new Option('03 소재 저널 · 비대칭 편집','journal'));
const openPlatformJob=openJob;
openJob=function(id){
  openPlatformJob(id);const j=currentJob();if(!j)return;
  const host=node('div',undefined,'platform-preview');host.id='platform-preview';$('channel-extras').prepend(host);
  host.append(node('small','채널별 출력 미리보기'));
  const content=structuredClone(jobContent(j));if(!content.photoRefs?.length)return;
  workflowCard(content,0,j.channel==='naver'?'blog':j.channel==='kakao'?'kakao':'carousel').then(c=>{if(currentJob()?.id===id&&host.isConnected)host.append(c);else releaseCanvas(c);}).catch(e=>{if(host.isConnected)host.append(node('p',e.message));});
};
