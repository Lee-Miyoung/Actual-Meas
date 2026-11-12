/* Fixed photo-led Korean overlay edition. Previous saved editions retain their original renderer. */
(function(){
'use strict';
const previous=renderSignature;
renderSignature=async function(cfg,ctx,slot,index,format,load,options={}){
 if(cfg.photoEdition!==1)return previous(cfg,ctx,slot,index,format,load,options);
 const covers=window.CheonginChannelCovers, choice=state.thumbnailPosting||{};
 if(index===0 && covers?.formats[format] && (choice.layout==='channels' || !choice.layout) && ctx.photos.length && !window.ArchiveStudio?.comparing){
   return covers.fromProject(format,choice,{...options,showLogo:cfg.show.logo});
 }
 cfg=SignatureCore.validate(cfg);
 const rule=cfg.platforms[format];if(!rule)throw Error('출력 규격을 확인하세요.');
 const lead=ctx.photos.find(p=>p.id===slot.photoIds?.[0])||ctx.photos[0];
 if(!lead)return previous(cfg,ctx,slot,index,format,load,options);
 const ww=rule.natural?Math.min(1600,lead.width||1600):rule.width;
 const hh=rule.natural?Math.round(ww*(lead.height||900)/(lead.width||1200)):rule.height;
 const c=node('canvas'),scale=Math.min(1,(options.maxEdge||Infinity)/Math.max(ww,hh));
 c.width=Math.round(ww*scale);c.height=Math.round(hh*scale);
 const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const unit=c.width/1080,H=c.height/unit,wide=H<900,vertical=['reels','shorts','story'].includes(format);
 const m=wide?52:64,total=Math.max(1,Number(ctx.slideCount)||5);
 g.scale(unit,unit);c.typeLayout=[];c.photoLayout=[];
 Object.assign(c.dataset,{renderer:'cheongin-photo-edition-v2',exportWidth:ww,exportHeight:hh,platform:format,slide:index});
 const info=ctx.photoProducts[slot.photoIds?.at(-1)]||ctx.products[0],manual=ctx.manualOverlay||{},manualTitles=Array.isArray(manual.slideTitles)?manual.slideTitles:[];
 const autoTitle=slot.archiveNote??slot.title??'';
 const savedTitle=manualTitles[index]||((index===0&&manual.title)?manual.title:autoTitle);
 const title=window.CheonginPostCopy?.cleanPhotoCaption(savedTitle)??savedTitle;
 const product=manual.product||((info?[info.brand,info.model,info.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):''));
 const manualDetail=[manual.spec,manual.structure].filter(Boolean).join(' · ');
 const detail=manualDetail||[info?.size,ctx.structure].filter(Boolean).join(' · ');
 const location=manual.location||[ctx.region,ctx.space].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ');
 const all=[title,product,detail,location,'시공 전 시공 후 청인마루 공간의 위로가 되다'].join(' ');
 await Promise.all([document.fonts.load('400 44px "Studio Serif"',all),document.fonts.load('400 26px "Studio Sans"',all)]);
 function text(value,x,y,w,size,{rows=1,weight=400,align='left',alpha=1,family='Studio Sans',field=null,above=false}={}){
  if(!value)return 0;
  const layout=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:Math.min(size,wide?18:21),maxLines:rows,leading:1.32,measure:(s,n)=>{g.font=`${weight} ${n}px "${family}"`;return g.measureText(s).width;}});
  const height=layout.lines.length*layout.lineHeight,top=above?y-height:y;
  g.save();g.font=`${weight} ${layout.size}px "${family}"`;g.fillStyle=`rgba(255,255,255,${alpha})`;g.textBaseline='top';
  for(const [i,line]of layout.lines.entries()){
   const yy=top+i*layout.lineHeight,mt=g.measureText(line),xx=align==='right'?x+w-mt.width:x;
   window.CheonginCoverStyle.drawText(g,line,xx,yy);
   c.typeLayout.push({field,kind:'overlay',source:String(value),x:xx,y:yy,width:mt.width,height:layout.lineHeight,size:layout.size});
  }
  g.restore();if(layout.truncated)c.dataset.textTruncated='true';return height;
 }
 async function photo(id,x,y,w,h,half=null){
  let im;
  try{
   if(options.maxEdge&&window.ArchiveStudio?.comparing){const p=state.photos.find(p=>p.id===id);im=await loadImage(p.originalSrc||p.src);}
   else im=await load(id,Math.min(2200,options.maxEdge||2200));
   const sw=half===null?im.width:im.width/2,sx=half===null?0:half*sw;
   const editKey=format+':'+index+':'+(half??'full'),binding=ctx.bindings[id]||{},frame=binding.frameTransforms?.[editKey]||{},zoom=Math.max(1,Math.min(3,frame.zoom||1));
   const s=Math.max(w/sw,h/im.height)*zoom,cw=w/s,ch=h/s;
   const focusY=Math.max(0,Math.min(1,frame.y??binding.focusY??binding.focus??.58)),focusX=Math.max(0,Math.min(1,frame.x??binding.focusX??.5));
   const sy=(im.height-ch)*focusY;
   g.drawImage(im,sx+(sw-cw)*focusX,sy,cw,ch,x,y,w,h);
   c.photoLayout.push({id,editKey,anchorX:focusX,anchorY:focusY,zoom,fit:'cover',sourceWidth:sw,sourceHeight:im.height,sw:cw,sh:ch,x,y,width:w,height:h,cropFraction:1-cw*ch/(sw*im.height)});
  }finally{if(im?.tagName==='IMG')im.src='';else if(im)releaseCanvas(im);}
 }
 async function topBrand(){
  if(!cfg.show.logo)return 0;
  const style=window.CheonginCoverStyle,mark=await style.logo(ctx.logoTone);
  const topY=wide?30:48,pageSize=wide?17:19;
  const {height:logoH}=style.drawLogo(g,c,mark,1080,m,topY);
  const page=String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  const pageY=topY+Math.max(0,(logoH-pageSize)/2)-1;
  text(page,900,pageY,180-m,pageSize,{align:'right',alpha:.82});
  return topY+logoH;
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
   if(horizontal){g.fillRect(26,labelTop-8,105,42);g.fillRect(572,labelTop-8,105,42);text('시공 전',40,labelTop,90,20);text('시공 후',586,labelTop,90,20);}
   else{g.fillRect(26,labelTop-8,105,42);g.fillRect(26,h+36,105,42);text('시공 전',40,labelTop,90,20);text('시공 후',40,h+44,90,20);}
  }else await photo(lead.id,0,0,1080,H);

  await topBrand();
  // Anchor the last visible row. Each block reserves its measured height, including wrapped lines.
  let bottom=H-(wide?22:vertical?48:42);
  const width=wide?780:760,gap=wide?8:12;
  function place(field,value,size,options){
   if(!value)return;
   bottom-=text(value,m,bottom,width,size,{...options,field,above:true})+gap;
  }
  const comparable=value=>String(value||'').normalize('NFC').replace(/[\s·ㆍ|]+/gu,'');
  if(cfg.show.spec)place('spec',detail,wide?17:21,{rows:2,alpha:.84});
  if(cfg.show.product && comparable(product)!==comparable(title)){
   place('product',product,wide?21:26,{rows:2,weight:600,alpha:.95});
  }
  place('title',title,wide?34:43,{rows:2,alpha:.96,family:'Studio Serif'});
  place('location',location,wide?16:18,{alpha:.78});
  c.previewMeta={title,product,spec:manual.spec||info?.size||'',location,productData:info||{},site:ctx.site,structure:ctx.structure||''};
  return c;
 }catch(e){releaseCanvas(c);throw e;}
};
})();
