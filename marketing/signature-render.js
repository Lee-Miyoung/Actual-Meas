/* Renderer v1. Every placement comes from a fixed platform grid, never an AI layout. */
async function renderSignature(config,content,slot,index,format,load,options={}){
 const cfg=SignatureCore.validate(config),rule=cfg.platforms[format];if(!rule)throw Error('지원하지 않는 플랫폼입니다.');
 const natural=rule.natural,naturalRef=content.photos.find(p=>p.id===slot.photoIds[0]);
 const iw=naturalRef?.width||1200,ih=naturalRef?.height||900,ns=Math.min(1,rule.width/Math.max(iw,ih));
 const native=natural?[Math.round(iw*ns),Math.round(ih*ns+480*iw*ns/1080)]:[rule.width,rule.height];
 const ratio=Math.min(1,(options.maxEdge||Infinity)/Math.max(...native)),c=node('canvas');c.width=Math.round(native[0]*ratio);c.height=Math.round(native[1]*ratio);c.dataset.exportWidth=native[0];c.dataset.exportHeight=native[1];
 const g=c.getContext('2d'),scale=c.width/1080,h=c.height/scale,m=cfg.layout.margin,gap=cfg.layout.gap,wide=h<900,vertical=['story','reels','shorts'].includes(format),top=vertical?244:58,bottom=vertical?300:48;
 const labelInk='#'+[1,3,5].map(i=>Math.round(parseInt(cfg.palette.ink.slice(i,i+2),16)*.75+parseInt(cfg.palette.accent.slice(i,i+2),16)*.25).toString(16).padStart(2,'0')).join('');
 const paper=cfg.id==='material-journal'?cfg.palette.stone:cfg.palette.paper,ink=cfg.palette.ink;
 g.scale(scale,scale);g.fillStyle=paper;g.fillRect(0,0,1080,h);c.typeLayout=[];c.photoLayout=[];
 const allText=[slot.title,content.site,content.region,content.space,...content.products.flatMap(p=>[p.brand,p.category,p.model,p.color,p.size]),'시공 현장 제품 규격 확인한 작업 상담 가능 자재 동화 구정 노바 한솔 네스트 외 시공 전 후 현장 사진과 샘플을 함께 비교해보세요'].join(' ');
 await Promise.all([document.fonts.load(`400 60px "${cfg.type.title}"`,allText),document.fonts.load(`400 28px "${cfg.type.body}"`,allText)]);
 function text(value,x,y,width,size,rows=2,serif=false,min=size,color=ink){
  if(!value)return 0;const family=serif?cfg.type.title:cfg.type.body;
  const r=CheonginType.layout(String(value),{width,fontSize:size,minFontSize:min,maxLines:rows,leading:cfg.type.leading,preferPause:serif,measure:(s,n)=>{g.font=`400 ${n}px "${family}"`;return g.measureText(s).width;}});
  g.font=`400 ${r.size}px "${family}"`;g.fillStyle=color;
  r.lines.forEach((s,i)=>{const baseline=y+i*r.lineHeight,mt=g.measureText(s);g.fillText(s,x,baseline);c.typeLayout.push({kind:serif?'headline':'detail',source:String(value),x:x-(mt.actualBoundingBoxLeft||0),y:baseline-(mt.actualBoundingBoxAscent||r.size*.85),width:(mt.actualBoundingBoxRight||mt.width)+(mt.actualBoundingBoxLeft||0),height:(mt.actualBoundingBoxAscent||r.size*.85)+(mt.actualBoundingBoxDescent||r.size*.2),size:r.size});});
  if(r.truncated)c.dataset.textTruncated='true';return r.lines.length*r.lineHeight;
 }
 async function logo(){if(!cfg.show.logo)return;
   if(content.logoTone){
     const style=window.CheonginCoverStyle;
     const box=style.drawLogo(g,c,await style.logo(content.logoTone),1080,m,top-24);
     c.typeLayout.push({kind:'logo',...box});return;
   }
   const lightSurface=[1,3,5].map(i=>parseInt(paper.slice(i,i+2),16)).reduce((a,v)=>a+v,0)>384,im=await designMarks[lightSurface?'dark':'light'];if(im){const hh=120*im.height/im.width;g.drawImage(im,m,top-24,120,hh);c.typeLayout.push({kind:'logo',x:m,y:top-24,width:120,height:hh});}}
 function meta(label,value,x,y,width,rows=3){if(!value)return 0;text(label,x,y,width,24,1,false,24,labelInk);const used=text(value,x,y+44,width,cfg.type.bodySize,rows,false,cfg.type.minBody);return 44+used+28;}
 async function photo(id,x,y,w,hh,part=null,label=''){
  const im=await load(id,Math.min(1800,options.maxEdge||1800));
  try{
   let sx=part===null?0:part*im.width/2,sw=part===null?im.width:im.width/2;
   const contain=slot.role==='comparison'||cfg.layout.fit==='contain'||Math.max(w/sw,hh/im.height)*scale>1;
   let dx=x,dy=y,dw=w,dh=hh;
   if(contain){const s=Math.min(w/sw,hh/im.height,1/scale);dw=sw*s;dh=im.height*s;dx=x+(w-dw)/2;dy=y+(hh-dh)/2;g.drawImage(im,sx,0,sw,im.height,dx,dy,dw,dh);}
   else{const crop=ProductionCore.crop(sw,im.height,w,hh,content.bindings[id]?.focus??.5);g.drawImage(im,sx+crop.sx,crop.sy,crop.sw,crop.sh,x,y,w,hh);}
   c.photoLayout.push({fit:slot.role==='comparison'?'pair-contain':contain?'contain':'cover',sourceWidth:sw,sourceHeight:im.height,x:dx,y:dy,width:dw,height:dh,labelBottom:label?y-6:undefined});
  }finally{releaseCanvas(im);}
 }
 try{
  await logo();if(cfg.show.site)text([content.region,content.space].filter(Boolean).join(' · ')||content.site,m+190,top+9,1080-m*2-190,24,1);
  const labels={cover:'현장 기록',comparison:'시공 전후',space:content.stage==='complete'?'완성 공간':'현장 모습',detail:'시공 디테일',view:'다른 시점',information:'시공 정보'};
  if(slot.role==='information'){
   text(slot.title,m,top+124,1080-m*2,wide?44:58,1,true,42);
   const products=content.products.slice((slot.productPage||0)*2,(slot.productPage||0)*2+2);
   const columns=products.length>1?2:1,cell=(1080-m*2-gap*(columns-1))/columns;
   let start=top+(wide?210:240);
   if(!wide&&cfg.show.site)start+=meta('시공 현장',[content.site,content.space].filter(Boolean).join(' · '),m,start,1080-m*2);
   if(!products.length)text('현장 사진과 샘플을 함께 비교해보세요',m,start,1080-m*2,28,2);
   let deepest=start;
   products.forEach((p,i)=>{
    const x=m+i*(cell+gap),area=content.areas[p.renderKey||p.id]||'';let cursor=start;
    if(cfg.show.product)cursor+=meta(area?'시공 제품 · '+area:'시공 제품',[p.brand,p.category,p.model,p.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' | '),x,cursor,cell,wide?2:3);
    if(cfg.show.spec&&p.size)cursor+=meta('제품 규격',p.size,x,cursor,cell,wide?1:3);
    deepest=Math.max(deepest,cursor);
   });
   const note=(content.works||[]).join(' · ');if(note&&deepest<h-bottom-240)meta('확인한 작업',note,m,deepest,1080-m*2);
   if(cfg.show.brands)text('상담 가능 자재 · 동화 · 구정 · 노바 · 한솔 · 네스트 외',m,h-bottom,1080-m*2,24,2);
  }else{
   const header=!wide&&(cfg.layout.placement==='header'||cfg.id==='modern-gallery');
   const p=content.photoProducts[slot.photoIds[0]],journal=cfg.id==='material-journal'&&!wide&&!vertical,hasProduct=cfg.show.product&&p&&!journal;
   const titleSize=wide?42:cfg.type.titleSize,productBaseline=h-bottom-cfg.type.bodySize*cfg.type.leading,titleY=header?top+120:hasProduct?productBaseline-40-titleSize*cfg.type.leading:h-bottom-titleSize*cfg.type.leading,titleH=titleSize*cfg.type.leading*2;
   const photoY=header?titleY+titleH+44:top+76,photoEnd=header?hasProduct?productBaseline-60:h-bottom-20:titleY-titleSize-36;
   const photoX=cfg.id==='modern-gallery'?m+18:m,photoW=journal?Math.min(620,1080-photoX*2-gap-280):1080-photoX*2,photoH=Math.max(90,photoEnd-photoY);
   if(slot.role==='comparison'){
    const pair=slot.photoIds.length===1,stack=vertical,gutter=gap;
    for(let i=0;i<2;i++){
     const x=stack?photoX:photoX+i*(photoW+gutter)/2,y=stack?photoY+i*(photoH+gutter)/2:photoY,w=stack?photoW:(photoW-gutter)/2,hh=(stack?(photoH-gutter)/2:photoH)-40;
     text(i?'시공 후':'시공 전',x,y+24,w,24,1);await photo(slot.photoIds[pair?0:i],x,y+40,w,hh,pair?i:null,i?'after':'before');
    }
   }else await photo(slot.photoIds[0],photoX,photoY,photoW,photoH);
   if(journal&&p){const x=photoX+photoW+gap,w=1080-m-x;let y=photoY+70;if(cfg.show.product)y+=meta('시공 제품',[p.brand,p.category,p.model,p.color].filter(Boolean).join(' | '),x,y,w,3);if(cfg.show.spec&&p.size)meta('제품 규격',p.size,x,y,w,2);}
   text(slot.title||labels[slot.role],m,titleY,1080-m*2,titleSize,2,true,cfg.type.minTitle);
   if(hasProduct){text('시공 제품',m,productBaseline,170,24,1,false,24,labelInk);text([p.brand,p.model,p.color].filter(Boolean).join(' | '),m+180,productBaseline,1080-m*2-180,cfg.type.bodySize,2,false,cfg.type.minBody);}
  }
  c.dataset.renderer='cheongin-signature-v1';c.dataset.platform=format;c.dataset.design=cfg.id;c.dataset.signatureVersion=String(cfg.version);c.dataset.signatureRevision=String(cfg.revision);
  c.previewMeta={title:slot.title,detail:'',product:content.photoProducts[slot.photoIds[0]]?.model||'',productData:content.photoProducts[slot.photoIds[0]]||{},site:content.site};
  return c;
 }catch(e){releaseCanvas(c);throw e;}
}
