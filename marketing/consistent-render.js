/* Fixed photo-led Korean overlay edition. Previous saved editions retain their original renderer. */
(function(){
'use strict';
const previous=renderSignature;
renderSignature=async function(cfg,ctx,slot,index,format,load,options={}){
 if(cfg.photoEdition!==1)return previous(cfg,ctx,slot,index,format,load,options);
 cfg=SignatureCore.validate(cfg);
 const rule=cfg.platforms[format];if(!rule)throw Error('출력 규격을 확인하세요.');
 const lead=ctx.photos.find(p=>p.id===slot.photoIds?.[0])||ctx.photos[0];
 if(!lead)return previous(cfg,ctx,slot,index,format,load,options);
 const ww=rule.natural?Math.min(1600,lead.width||1600):rule.width;
 const hh=rule.natural?Math.round(ww*(lead.height||900)/(lead.width||1200)):rule.height;
 const c=node('canvas'),scale=Math.min(1,(options.maxEdge||Infinity)/Math.max(ww,hh));
 c.width=Math.round(ww*scale);c.height=Math.round(hh*scale);
 const g=c.getContext('2d'),unit=c.width/1080,H=c.height/unit,wide=H<900,vertical=['reels','shorts','story'].includes(format);
 const m=wide?52:64,total=Math.max(1,Number(ctx.slideCount)||5);
 g.scale(unit,unit);c.typeLayout=[];c.photoLayout=[];
 Object.assign(c.dataset,{renderer:'cheongin-photo-edition-v2',exportWidth:ww,exportHeight:hh,platform:format,slide:index});
 const info=ctx.photoProducts[slot.photoIds?.at(-1)]||ctx.products[0];
 const title=slot.archiveNote??slot.title??'';
 const product=info?[info.brand,info.model,info.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):'';
 const detail=[info?.size,ctx.structure].filter(Boolean).join(' · ');
 const location=[ctx.region,ctx.space].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');
 const all=[title,product,detail,location,'시공 전 시공 후 청인마루 공간의 위로가 되다'].join(' ');
 await Promise.all([document.fonts.load('400 44px "Studio Serif"',all),document.fonts.load('400 26px "Studio Sans"',all)]);
 function text(value,x,y,w,size,rows=1,weight=400,align='left',alpha=1,family='Studio Sans'){
  if(!value)return 0;
  const layout=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:Math.min(size,wide?18:21),maxLines:rows,leading:1.32,measure:(s,n)=>{g.font=`${weight} ${n}px "${family}"`;return g.measureText(s).width;}});
  g.save();g.font=`${weight} ${layout.size}px "${family}"`;g.fillStyle=`rgba(255,255,255,${alpha})`;g.textBaseline='top';g.shadowColor='rgba(0,0,0,.42)';g.shadowBlur=7;
  for(const [i,line]of layout.lines.entries()){
   const yy=y+i*layout.lineHeight,mt=g.measureText(line),xx=align==='right'?x+w-mt.width:x;
   g.fillText(line,xx,yy);
   c.typeLayout.push({kind:'overlay',source:String(value),x:xx,y:yy,width:mt.width,height:layout.lineHeight,size:layout.size});
  }
  g.restore();if(layout.truncated)c.dataset.textTruncated='true';return layout.lines.length*layout.lineHeight;
 }
 async function photo(id,x,y,w,h,half=null){
  let im;
  try{
   if(options.maxEdge&&window.ArchiveStudio?.comparing){const p=state.photos.find(p=>p.id===id);im=await loadImage(p.originalSrc||p.src);}
   else im=await load(id,Math.min(2200,options.maxEdge||2200));
   const sw=half===null?im.width:im.width/2,sx=half===null?0:half*sw,s=Math.max(w/sw,h/im.height),cw=w/s,ch=h/s;
   const binding=ctx.bindings[id]||{},focusY=Math.max(0,Math.min(1,binding.focusY??binding.focus??.58));
   const sy=(im.height-ch)*focusY;
   g.drawImage(im,sx+(sw-cw)/2,sy,cw,ch,x,y,w,h);
   c.photoLayout.push({fit:'cover',sourceWidth:sw,sourceHeight:im.height,x,y,width:w,height:h,cropFraction:1-cw*ch/(sw*im.height)});
  }finally{if(im?.tagName==='IMG')im.src='';else if(im)releaseCanvas(im);}
 }
 async function topBrand(){
  if(!cfg.show.logo)return 0;
  const mark=await designMarks.light;if(!mark)return 0;
  const logoW=wide?158:176,logoH=logoW*mark.height/mark.width,topY=wide?30:48,pageSize=wide?17:19;
  g.save();g.globalAlpha=.94;g.shadowColor='rgba(0,0,0,.34)';g.shadowBlur=6;g.drawImage(mark,m,topY,logoW,logoH);g.restore();
  const page=String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  const pageY=topY+Math.max(0,(logoH-pageSize)/2)-1;
  text(page,wide?900:900,pageY,1080-(wide?900:900)-m,pageSize,1,400,'right',.82,'Studio Sans');
  return topY+logoH;
 }
 function bottomGradient(){
  const h=wide?245:vertical?510:380,start=Math.max(0,H-h);
  const gradient=g.createLinearGradient(0,start,0,H);
  gradient.addColorStop(0,'rgba(12,15,12,0)');
  gradient.addColorStop(.42,'rgba(12,15,12,.12)');
  gradient.addColorStop(1,'rgba(12,15,12,.78)');
  g.fillStyle=gradient;g.fillRect(0,start,1080,h);
 }
 try{
  if(slot.role==='comparison'){
   const pair=slot.photoIds.length===1&&ctx.bindings[slot.photoIds[0]]?.role==='pair';
   if(!pair&&slot.photoIds.length!==2)throw Error('실제 시공 전·후 사진을 연결해 주세요.');
   const horizontal=wide,w=horizontal?534:1080,h=horizontal?H:(H-10)/2;
   await photo(slot.photoIds[0],0,0,w,h,pair?0:null);
   await photo(pair?slot.photoIds[0]:slot.photoIds[1],horizontal?546:0,horizontal?0:h+10,w,h,pair?1:null);
   g.fillStyle='rgba(20,23,20,.58)';
   const labelTop=wide?82:105;
   if(horizontal){g.fillRect(26,labelTop-8,105,42);g.fillRect(572,labelTop-8,105,42);text('시공 전',40,labelTop,90,20,1,400);text('시공 후',586,labelTop,90,20,1,400);}
   else{g.fillRect(26,labelTop-8,105,42);g.fillRect(26,h+36,105,42);text('시공 전',40,labelTop,90,20,1,400);text('시공 후',40,h+44,90,20,1,400);}
  }else await photo(lead.id,0,0,1080,H);

  if(!rule.natural||format==='naverCover'){
   bottomGradient();
   await topBrand();

   const detailY=H-(wide?44:vertical?76:70);
   const productY=detailY-(wide?35:42);
   const titleY=productY-(wide?58:88);
   if(location)text(location,m,titleY-(wide?28:32),wide?780:760,wide?16:18,1,400,'left',.78,'Studio Sans');
   if(title)text(title,m,titleY,wide?780:760,wide?34:43,2,400,'left',.96,'Studio Serif');
   if(cfg.show.product&&product)text(product,m,productY,wide?760:760,wide?21:26,1,600,'left',.95);
   if(cfg.show.spec&&detail)text(detail,m,detailY,wide?760:760,wide?17:21,1,400,'left',.84);
  }else{
   bottomGradient();
   await topBrand();
   const detailY=H-70,productY=detailY-42,titleY=productY-88;
   if(location)text(location,m,titleY-32,760,18,1,400,'left',.78,'Studio Sans');
   if(title)text(title,m,titleY,760,43,2,400,'left',.96,'Studio Serif');
   if(cfg.show.product&&product)text(product,m,productY,760,26,1,600);
   if(cfg.show.spec&&detail)text(detail,m,detailY,760,21,1,400,'left',.84);
  }
  c.previewMeta={title,productData:info||{},site:ctx.site,structure:ctx.structure||''};
  return c;
 }catch(e){releaseCanvas(c);throw e;}
};
})();
