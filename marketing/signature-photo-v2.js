/* Photo-led renderer v2; v1 is kept intact for pinned projects and approvals. */
const renderSignatureV1=renderSignature;
renderSignature=async function(config,...args){return config.version===1?renderSignatureV1(config,...args):renderPhotoSignatureV2(config,...args);};
async function renderPhotoSignatureV2(config,content,slot,index,format,load,options={}){
 const cfg=SignatureCore.validate(config),t=cfg.tokens,rule=cfg.platforms[format];if(!rule)throw Error('지원하지 않는 플랫폼입니다.');
 const lead=content.photos.find(p=>p.id===slot.photoIds[0])||content.photos.find(p=>content.bindings[p.id]?.role==='after')||content.photos[0];
 const iw=lead?.width||1200,ih=lead?.height||900,ns=Math.min(1,1600/Math.max(iw,ih));
 const native=rule.natural?[Math.round(iw*ns),Math.round(ih*ns+300*iw*ns/1080)]:[rule.width,rule.height],ratio=Math.min(1,(options.maxEdge||Infinity)/Math.max(...native));
 const c=node('canvas');c.width=Math.max(1,Math.round(native[0]*ratio));c.height=Math.max(1,Math.round(native[1]*ratio));c.dataset.exportWidth=native[0];c.dataset.exportHeight=native[1];
 const g=c.getContext('2d'),scale=c.width/1080,h=c.height/scale,m=t.safeMargin,wide=h<900,vertical=['reels','story','shorts'].includes(format),safeTop=vertical?240:m,safeBottom=vertical?280:m,titleSize=wide?42:t.titleSize,bodySize=wide?26:t.metadataSize,lh=t.titleLineHeight;
 c.typeLayout=[];c.photoLayout=[];c.overlayLayout=[];g.scale(scale,scale);g.fillStyle=cfg.palette.paper;g.fillRect(0,0,1080,h);
 const all=[slot.title,content.site,content.region,content.space,...content.products.flatMap(p=>[p.brand,p.category,p.model,p.color,p.size]),'시공 전 후 현장 제품 브랜드 규격 구역 마루와 벽장재 청인마루에서 함께 상담하세요'].join(' ');
 await Promise.all([document.fonts.load(`400 60px "${t.titleFont}"`,all),document.fonts.load(`400 28px "${t.metadataFont}"`,all)]);
 const text=(value,x,y,width,size,rows=2,title=false,color=cfg.palette.ink)=>{
  if(!value)return 0;const family=title?t.titleFont:t.metadataFont,min=title?Math.min(size,cfg.type.minTitle):Math.min(size,cfg.type.minBody);
  const r=CheonginType.layout(String(value),{width,fontSize:size,minFontSize:min,maxLines:rows,leading:lh,preferPause:title,measure:(s,n)=>{g.font=`400 ${n}px "${family}"`;return g.measureText(s).width;}});g.font=`400 ${r.size}px "${family}"`;g.fillStyle=color;
  r.lines.forEach((line,i)=>{const by=y+i*r.lineHeight,b=g.measureText(line);g.fillText(line,x,by);c.typeLayout.push({kind:title?'headline':'detail',source:String(value),x:x-(b.actualBoundingBoxLeft||0),y:by-(b.actualBoundingBoxAscent||r.size*.85),width:(b.actualBoundingBoxRight||b.width)+(b.actualBoundingBoxLeft||0),height:(b.actualBoundingBoxAscent||r.size*.85)+(b.actualBoundingBoxDescent||r.size*.2),size:r.size});});if(r.truncated)c.dataset.textTruncated='true';return r.lines.length*r.lineHeight;
 };
 function gradient(y,hh,strength,reverse=false){if(strength<=0)return;const grad=g.createLinearGradient(0,y,0,y+hh);grad.addColorStop(0,`rgba(41,43,40,${reverse?strength:0})`);grad.addColorStop(1,`rgba(41,43,40,${reverse?0:strength})`);g.fillStyle=grad;g.fillRect(0,y,1080,hh);c.overlayLayout.push({x:0,y,width:1080,height:hh,strength});}
 async function photo(id,box,part=null,forceContain=false){
  const im=await load(id,Math.min(2000,options.maxEdge?Math.max(1080,options.maxEdge):2000));
  try{
   const b=content.bindings[id]||{},sw=part===null?im.width:im.width/2,sx=part===null?0:part*sw,sourceAspect=sw/im.height,targetAspect=box.w/box.hh,visible=Math.min(sourceAspect/targetAspect,targetAspect/sourceAspect),crop=1-visible;
   const zoom=b.zoom??t.zoom,fx=Math.max(0,Math.min(1,(b.focusX??t.imageFocusX)+(b.panX??t.panX))),fy=Math.max(0,Math.min(1,(b.focusY??b.focus??t.imageFocusY)+(b.panY??t.panY)));
   const contain=forceContain||cfg.layout.fit==='contain'||zoom<1||(cfg.layout.fit==='smart'&&crop>t.cropLimit)||Math.max(box.w/sw,box.hh/im.height)*scale>1.5;
   let dx=box.x,dy=box.y,dw=box.w,dh=box.hh,rx=sx,ry=0,rw=sw,rh=im.height;
   if(contain){const s=Math.min(box.w/sw,box.hh/im.height,1.5/scale)*Math.min(1,zoom);dw=sw*s;dh=im.height*s;dx=box.x+(box.w-dw)/2;dy=box.y+(box.hh-dh)/2;g.drawImage(im,sx,0,sw,im.height,dx,dy,dw,dh);}
   else{const factor=Math.max(box.w/sw,box.hh/im.height)*zoom;rw=box.w/factor;rh=box.hh/factor;rx=sx+(sw-rw)*fx;ry=(im.height-rh)*fy;g.drawImage(im,rx,ry,rw,rh,box.x,box.y,box.w,box.hh);}
   const record={fit:contain?'contain':'cover',sourceWidth:sw,sourceHeight:im.height,x:dx,y:dy,width:dw,height:dh,crop:{x:rx,y:ry,width:rw,height:rh},cropFraction:contain?0:1-rw*rh/(sw*im.height)};c.photoLayout.push(record);return record;
  }finally{releaseCanvas(im);}
 }
 function sample(y,hh){const s=node('canvas');s.width=s.height=32;try{s.getContext('2d',{willReadFrequently:true}).drawImage(c,0,Math.max(0,y*scale),c.width,Math.max(1,Math.min(h-y,hh)*scale),0,0,32,32);const data=s.getContext('2d').getImageData(0,0,32,32).data;let sum=0,sum2=0;for(let i=0;i<data.length;i+=4){const v=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;sum+=v;sum2+=v*v;}const mean=sum/1024;return {mean,sd:Math.sqrt(Math.max(0,sum2/1024-mean*mean))};}finally{releaseCanvas(s);}}
 async function logo(onPhoto=true){if(!cfg.show.logo)return;const light=onPhoto,mark=await designMarks[light?'light':'dark'];if(!mark)return;const hh=t.logoSize*mark.height/mark.width;if(light){g.save();g.beginPath();g.rect(0,0,m*2+t.logoSize+70,safeTop+hh+40);g.clip();gradient(0,safeTop+hh+40,.24,true);g.restore();}g.globalAlpha=t.logoOpacity;g.drawImage(mark,m,safeTop,t.logoSize,hh);g.globalAlpha=1;c.typeLayout.push({kind:'logo',x:m,y:safeTop,width:t.logoSize,height:hh});}
 const product=content.photoProducts[slot.photoIds.at(-1)],binding=content.bindings[slot.photoIds[0]]||{},region=cfg.show.site?[content.region,content.space].filter(Boolean).join(' · ')||content.site:'';
 let title=slot.title||'',detail=slot.role==='detail'&&binding.note&&binding.note!==title?binding.note:'';
 if(['space','view'].includes(slot.role)&&/^(완성 공간|현장 모습|다른 시점의 현장|현장 사진)$/.test(title)&&!binding.note)title='';
 try{
  if(slot.role==='comparison'){
   const y=safeTop+100,bottom=h-safeBottom-(title?110:25),w=(1080-2*m-16)/2,hh=bottom-y;
   for(let i=0;i<2;i++){const x=m+i*(w+16);text(i?'시공 후':'시공 전',x,y-18,w,26,1);await photo(slot.photoIds.length===1?slot.photoIds[0]:slot.photoIds[i],{x,y,w,hh},slot.photoIds.length===1?i:null,true);}
   g.fillStyle=cfg.palette.accent;g.globalAlpha=.3;g.fillRect(539,y,1,hh);g.globalAlpha=1;await logo(false);if(title)text(title,m,h-safeBottom-24,1080-2*m,wide?36:44,1,true);
  }else if(slot.role==='information'){
   if(lead)await photo(lead.id,{x:0,y:0,w:1080,hh:h});
   const ps=content.products.slice((slot.productPage||0)*2,(slot.productPage||0)*2+2),cols=ps.length>1?2:1,col=(1080-2*m-28*(cols-1))/cols;
   const rows=wide?2:3,productBlock=cfg.show.product?36+rows*bodySize*lh:0,specBlock=cfg.show.spec?76:0,regionBlock=region?65:0,areaBlock=ps.some(p=>content.areas[p.renderKey||p.id])?85:0,panelHeight=Math.min(h-safeTop-90,Math.max(wide?300:420,regionBlock+productBlock+specBlock+areaBlock+150));
   const top=h-safeBottom-panelHeight;g.fillStyle='rgba(245,243,237,.93)';g.fillRect(0,top,1080,h-top);c.dataset.alternative='information-panel';
   let cursor=top+48;if(region){text('시공 현장',m,cursor,150,24,1);text(region,m+170,cursor,1080-2*m-170,bodySize,1);cursor+=65;}
   if(!ps.length)text('등록한 현장 사진을 기준으로 상담을 안내합니다',m,cursor,1080-2*m,bodySize,2);
   ps.forEach((p,i)=>{const x=m+i*(col+28);let yy=cursor;if(cfg.show.product){text('시공 제품',x,yy,col,24,1);text([p.brand,p.category,p.model,p.color].filter((v,j,a)=>v&&a.indexOf(v)===j).join(' · '),x,yy+40,col,bodySize,rows);yy+=productBlock+12;}if(cfg.show.spec&&p.size){text('제품 규격',x,yy,col,24,1);text(p.size,x,yy+36,col,bodySize,wide?1:2);yy+=specBlock+20;}const area=content.areas[p.renderKey||p.id];if(area&&yy+64<h-safeBottom-54){text('시공 구역',x,yy,col,24,1);text(area,x,yy+36,col,bodySize,1);}});
   text('마루와 벽장재, 청인마루에서 함께 상담하세요.',m,h-safeBottom,1080-2*m,24,1);await logo(c.photoLayout.some(p=>m>=p.x&&m<=p.x+p.width&&safeTop>=p.y&&safeTop<=p.y+p.height));
  }else{
   const minimal=['space','view'].includes(slot.role),showProduct=slot.role==='cover'&&cfg.show.product&&product,rows=minimal?1:2;
   const titleHeight=title?rows*titleSize*lh:0,metaHeight=(region&&!minimal?bodySize*lh+16:0)+(showProduct?bodySize*lh*2+16:0)+(detail?bodySize*lh+12:0),band=Math.max(120,titleHeight+metaHeight+90);
   const cropLoss=lead?1-Math.min((lead.width/lead.height)/(1080/h),(1080/h)/(lead.width/lead.height)):0;
   const overlay=binding.overlayStrength??t.overlayStrength;
   let caption=t.textPosition==='caption'||cfg.layout.fit==='contain'||(cfg.layout.fit==='smart'&&cropLoss>t.cropLimit),topText=t.textPosition==='top'||(binding.focusY??binding.focus??t.imageFocusY)>.85;
   let rect;
   if(caption){const photoH=Math.max(h*.52,h-safeBottom-band-40);rect=await photo(slot.photoIds[0],{x:0,y:0,w:1080,hh:photoH},null,true);c.dataset.alternative='semi-full';}
   else{rect=await photo(slot.photoIds[0],{x:0,y:0,w:1080,hh:h});const sm=sample(h-safeBottom-band,band);if(title&&(sm.mean>212||sm.sd>75)&&overlay<.48){caption=true;c.dataset.alternative='contrast-panel';}}
   let color='#FAF9F6',start;
   if(caption){const top=Math.max(safeTop+160,h-safeBottom-band-25);g.fillStyle=cfg.palette.paper;g.fillRect(0,top,1080,h-top);color=cfg.palette.ink;start=top+titleSize+28;}
   else if(topText){gradient(0,safeTop+120+band,Math.min(.6,overlay+.1),true);start=safeTop+t.logoSize*.45+100+titleSize;c.dataset.alternative='top-grid';}
   else{const gy=Math.max(h*.58,h-safeBottom-band-120);gradient(gy,h-gy,overlay);start=h-safeBottom-metaHeight-(title?titleSize*lh*(rows-1):0);}
   if(title){text(title,m,start,1080-2*m,titleSize,rows,true,color);start+=titleSize*lh*(rows-1)+32;}
   if(detail){text(detail,m,start,1080-2*m,bodySize,1,false,color);start+=bodySize*lh+12;}
   if(region&&!minimal){text(region,m,start,1080-2*m,bodySize,1,false,color);start+=bodySize*lh+16;}
   if(showProduct)text([product.brand,product.category,product.model].filter((v,j,a)=>v&&a.indexOf(v)===j).join(' · '),m,start,1080-2*m,bodySize,2,false,color);
   const onPhoto=m>=rect.x&&m<=rect.x+rect.width&&safeTop>=rect.y&&safeTop<=rect.y+rect.height;await logo(onPhoto);
  }
  c.dataset.renderer='cheongin-photo-signature-v2';c.dataset.design=cfg.id;c.dataset.platform=format;c.dataset.signatureVersion='2';c.dataset.signatureRevision=cfg.revision;
  c.previewMeta={title:slot.title,productData:product||{},site:content.site};return c;
 }catch(e){releaseCanvas(c);throw e;}
}
