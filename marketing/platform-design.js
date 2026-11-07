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
  const entry=content.carousel?.[index]||{},role=entry.layout||(['cover','quiet','material','evidence','invitation'][index%5]);
  const kicker=entry.kicker||(index===0?'우리 집을 위한 선택':'청인마루'),detail=entry.detail||'';
  async function signature(light=false,x=64,y=h-40){const mark=await designMarks[light?'light':'dark'];if(mark)g.drawImage(mark,x,y-22,124,124*mark.height/mark.width);}
  function small(value,x,y,width=900,light=false){text(value,x,y,width,23,2,false,light?'#f7f4ed':EDITORIAL.muted);}
  function headline(value,x,y,width=950,size=66,rows=2,light=false){
    // Prefer a deliberate pause over one orphaned Korean syllable.
    let copy=String(value||'');const comma=copy.indexOf(', ');
    if(comma>3&&comma<copy.length-4&&copy.length>19)copy=copy.slice(0,comma+1)+'\n'+copy.slice(comma+2);
    text(copy,x,y,width,size,rows,true,light?'#fffdf7':EDITORIAL.ink,Math.max(40,size-18));
  }
  function productFacts(x,y,width=325){
    small('이 공간의 선택',x,y,width);text(product,x,y+62,width,35,4,true,EDITORIAL.ink,28);
    let cursor=y+274;
    for(const [label,value]of [['규격',content.product?.size],['컬러',content.product?.color],['소재',content.product?.material]])if(value){small(label,x,cursor,width);text(value,x,cursor+42,width,26,3,false,EDITORIAL.ink,23);cursor+=154;}
  }
  if(natural){
    g.drawImage(image,0,0,1080,h);
  }else if(['story','reels','shorts'].includes(format)){
    photo(0,0,1080,h);gradient(980,h);await signature(true,72,270);
    small(kicker,72,1200,860,true);headline(title,72,1290,850,70,3,true);
    rule(1580,72,850,'#ffffff66');small(product||Writer.SLOGAN,72,1630,850,true);
  }else if(['blog','youtubeCover','kakaoWide'].includes(format)){
    photo(0,0,680,h);g.fillStyle=EDITORIAL.paper;g.fillRect(680,0,400,h);
    small('청인마루 · 집을 위한 선택',722,61,300);headline(content.title||title,722,154,294,46,5);
    small(product,722,h-92,294);await signature(false,722,h-30);
  }else if(['kakao','youtube','naverCover'].includes(format)){
    photo(0,0,1080,h*.70);small(kicker,64,h*.70+50);headline(title,64,h*.70+118,950,53,2);await signature(false,64,h-29);
  }else if(role==='invitation'){
    photo(0,0,1080,h);gradient(h*.52,h);await signature(true,64,76);
    small('이 공간이 마음에 남았다면',64,h-340,950,true);headline(title,64,h-255,950,65,2,true);
    small('지역 · 현장 사진 · 원하는 소재를 알려주세요',64,h-91,950,true);small('공간의 위로가 되다',64,h-41,950,true);
  }else if(role==='material'){
    g.fillStyle='#e9e5da';g.fillRect(0,0,1080,h);photo(0,0,650,h-144);
    productFacts(700,90,320);await signature(false,700,h-47);
    small('소재의 이름을 넘어, 우리 집에 놓였을 때까지.',48,h-73,590);
  }else if(role==='quiet'){
    // A photographic pause: no repeated cover, headline or sales panel.
    photo(0,0,1080,h);gradient(h-280,h);small(title,64,h-92,950,true);await signature(true,64,h-38);
  }else if(role==='evidence'){
    await signature(false,64,62);small(kicker,690,62,320);photo(40,109,1000,h-464);
    headline(title,64,h-255,950,62,2);small(detail,64,h-105,950);small(product,64,h-35,950);
  }else if(theme==='gallery'){
    // A material-minded edition: generous photograph, precise facts in the margin.
    await signature(false,64,62);small('소재를 고르는 안목',710,62,310);photo(40,110,1000,h-401);
    small(kicker,64,h-237);headline(title,64,h-170,950,62,2);small([content.product?.size,content.product?.color].filter(Boolean).join(' · ')||product,64,h-33);
  }else if(theme==='journal'){
    // Construction trust starts with a real room, not an invented badge or score.
    await signature(false,64,62);small('시공을 맡기기 전에',710,62,310);photo(40,110,1000,h-451);
    small(kicker,64,h-274);headline(title,64,h-202,950,66,2);small(product,64,h-33);
  }else{
    // Signature cover. The room comes first; copy lives outside the photograph.
    photo(0,0,1080,h-315);small(kicker,64,h-256);headline(title,64,h-181,950,70,2);
    await signature(false,64,h-31);small(content.product?.color||product,440,h-33,575);
  }
  c.dataset.platform=format;c.dataset.design=theme;c.dataset.renderer='cheongin-stories-v4';return c;
}
workflowCard=async function(content,index,format='carousel'){
  if(!content.photoRefs?.length)throw Error('먼저 현장 사진을 등록하세요.');
  const ref=content.photoRefs[index%content.photoRefs.length],image=await workflowImage(ref,['story','reels','shorts'].includes(format)?2560:1800);
  try{return await renderPlatformDesign(content,image,index,format);}finally{releaseCanvas(image);}
};
const previousPlatformCard=card;
card=async function(theme,slide,format=state.format,proposed=false){
  if(brandSettings().fit==='contain')return previousPlatformCard(theme,slide,format);
  const requested=state.brandSlides?.[slide]?.photo;
  // All directions use the same sequence, so comparisons reflect design, not a different site.
  const photo=ProductionCore.matchPhoto(requested,state.photos)||state.photos[slide%state.photos.length];
  if(!photo)throw Error('먼저 현장 사진을 등록하세요.');
  const vertical=['story','reels','shorts'].includes(format);
  const image=vertical?await loadImage(photo.src):await photoImage(photo),was=original;let corrected;
  original=false;try{corrected=transformed(image,photo.adjust,vertical?2560:1800);}finally{original=was;if(vertical)image.src="";}
  const campaign=(proposed||window.canUseBrandCampaign?.())?window.brandCampaignFor?.(theme):null;
  const draft=campaign||(state.authoring?.draft?.inputSignature===window.currentWritingSignature?.()?state.authoring.draft:{});
  const settings=brandSettings(),custom=settings.titles.split(/\r?\n/).filter(Boolean);
  const carousel=campaign?.carousel||Array.from({length:state.slideCount||5},(_,i)=>({text:custom[i]||draft.carousel?.[i]?.text||state.title||Writer.SLOGAN}));
  let product={...(campaign?.product||selectedProduct()||{})};
  if(!campaign&&settings.product&&settings.product!==Writer.label(product)&&settings.product!==product.model)product={model:settings.product};
  if(settings.size)product.size=settings.size;
  try{return await renderPlatformDesign({...draft,carousel,theme,product,title:campaign?.titles[campaign.selectedTitle||0]||custom[slide]||state.title||Writer.SLOGAN,focus:state.brandSlides?.[slide]?.focus,pair:state.brandSlides?.[slide]?.layout==='pair'||(state.brandSlides?.[slide]?.layout!=='photo'&&/compare|비교|전후/i.test(photo.name))},corrected,slide,format);}finally{releaseCanvas(corrected);}
};
const directionSelect=$('production-style');
directionSelect.replaceChildren(new Option('01 살고 싶은 공간','editorial'),new Option('02 소재를 고르는 안목','gallery'),new Option('03 맡길 수 있는 시공','journal'));
const openPlatformJob=openJob;
openJob=function(id){
  openPlatformJob(id);const j=currentJob();if(!j)return;
  const host=node('div',undefined,'platform-preview');host.id='platform-preview';$('channel-extras').prepend(host);
  host.append(node('small','채널별 출력 미리보기'));
  const content=structuredClone(jobContent(j));if(!content.photoRefs?.length)return;
  workflowCard(content,0,j.channel==='naver'?'blog':j.channel==='kakao'?'kakao':'carousel').then(c=>{if(currentJob()?.id===id&&host.isConnected)host.append(c);else releaseCanvas(c);}).catch(e=>{if(host.isConnected)host.append(node('p',e.message));});
};
