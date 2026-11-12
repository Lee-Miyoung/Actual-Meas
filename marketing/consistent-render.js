/* Fixed photo-led edition. Previous saved editions retain their original renderer. */
(function(){
'use strict';const previous=renderSignature;
renderSignature=async function(cfg,ctx,slot,index,format,load,options={}){
 if(cfg.photoEdition!==1)return previous(cfg,ctx,slot,index,format,load,options);
 cfg=SignatureCore.validate(cfg);const rule=cfg.platforms[format];if(!rule)throw Error('출력 규격을 확인하세요.');
 const lead=ctx.photos.find(p=>p.id===slot.photoIds[0])||ctx.photos[0];
 const ww=rule.natural?Math.min(1600,lead?.width||1600):rule.width,hh=rule.natural?Math.round(ww*(lead?.height||900)/(lead?.width||1200)):rule.height;
 const c=node('canvas'),scale=Math.min(1,(options.maxEdge||Infinity)/Math.max(ww,hh));c.width=Math.round(ww*scale);c.height=Math.round(hh*scale);
 const g=c.getContext('2d'),unit=c.width/1080,H=c.height/unit,wide=H<900,vertical=['reels','shorts','story'].includes(format),m=64,top=vertical?190:70,bottom=vertical?280:70;
 g.scale(unit,unit);c.typeLayout=[];c.photoLayout=[];Object.assign(c.dataset,{renderer:'cheongin-photo-edition-v1',exportWidth:ww,exportHeight:hh,platform:format,slide:index});
 const info=ctx.photoProducts[slot.photoIds.at(-1)]||ctx.products[0],title=slot.archiveNote??slot.title??'',product=info?[info.brand,info.model,info.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):'',all=[title,product,info?.size,ctx.region,'시공 전 시공 후'].join(' ');
 await Promise.all([document.fonts.load('400 68px "Studio Serif"',all),document.fonts.load('400 28px Pretendard',all)]);
 function text(value,x,y,w,size,rows=1,serif=false){if(!value)return;const family=serif?'Studio Serif':'Pretendard',layout=CheonginType.layout(String(value),{width:w,fontSize:size,minFontSize:serif?Math.min(size,44):24,maxLines:rows,leading:1.35,measure:(s,n)=>{g.font=`400 ${n}px "${family}"`;return g.measureText(s).width;}});g.font=`400 ${layout.size}px "${family}"`;g.fillStyle='#fff';g.shadowColor='#0008';g.shadowBlur=8;for(const [i,line]of layout.lines.entries()){const yy=y+i*layout.lineHeight,mt=g.measureText(line);g.fillText(line,x,yy);c.typeLayout.push({kind:serif?'headline':'detail',source:String(value),x,y:yy-layout.size,width:mt.width,height:layout.lineHeight,size:layout.size});}g.shadowBlur=0;if(layout.truncated)c.dataset.textTruncated='true';}
 async function photo(id,x,y,w,h,half=null){let im;try{if(options.maxEdge&&window.ArchiveStudio?.comparing){const p=state.photos.find(p=>p.id===id);im=await loadImage(p.originalSrc||p.src);}else im=await load(id,Math.min(2000,options.maxEdge||2000));const sw=half===null?im.width:im.width/2,sx=half===null?0:half*sw,s=Math.max(w/sw,h/im.height),cw=w/s,ch=h/s,sy=(im.height-ch)*Math.max(0,Math.min(1,ctx.bindings[id]?.focusY??ctx.bindings[id]?.focus??.58));g.drawImage(im,sx+(sw-cw)/2,sy,cw,ch,x,y,w,h);c.photoLayout.push({fit:'cover',sourceWidth:sw,sourceHeight:im.height,x,y,width:w,height:h,cropFraction:1-cw*ch/(sw*im.height)});}finally{if(im?.tagName==='IMG')im.src='';else if(im)releaseCanvas(im);}}
 try{
  if(slot.role==='comparison'){
   const pair=slot.photoIds.length===1&&ctx.bindings[slot.photoIds[0]]?.role==='pair';if(!pair&&slot.photoIds.length!==2)throw Error('실제 시공 전·후 사진을 연결해 주세요.');
   const horizontal=wide,w=horizontal?534:1080,h=horizontal?H:(H-12)/2;
   await photo(slot.photoIds[0],0,0,w,h,pair?0:null);await photo(pair?slot.photoIds[0]:slot.photoIds[1],horizontal?546:0,horizontal?0:h+12,w,h,pair?1:null);
   g.fillStyle='#1c201dcc';g.fillRect(m,top-30,132,44);g.fillRect(horizontal?610:m,horizontal?top-30:h+40,132,44);text('시공 전',m+14,top,160,27);text('시공 후',horizontal?624:m+14,horizontal?top:h+70,160,27);
  }else await photo(lead.id,0,0,1080,H);
  if(!rule.natural){const gradient=g.createLinearGradient(0,H-bottom-360,0,H);gradient.addColorStop(0,'#12160f00');gradient.addColorStop(1,'#12160fcc');g.fillStyle=gradient;g.fillRect(0,Math.max(0,H-bottom-360),1080,bottom+360);
   if(index===0||slot.role==='detail')text(title,m,H-bottom-(wide?104:166),952,wide?53:68,2,true);
   if(cfg.show.product)text(product,m,H-bottom-48,952,wide?27:30);
   if(cfg.show.spec&&info?.size)text(info.size,m,H-bottom,952,25);
   if(cfg.show.logo){const mark=await designMarks.light;if(mark){const w=170,h=w*mark.height/mark.width;g.globalAlpha=.85;g.drawImage(mark,m,top,w,h);g.globalAlpha=1;}}
  }else if(cfg.show.logo){const mark=await designMarks.light;if(mark){const w=170;g.globalAlpha=.45;g.drawImage(mark,(1080-w)/2,(H-w*mark.height/mark.width)/2,w,w*mark.height/mark.width);g.globalAlpha=1;}}
  c.previewMeta={title,productData:info||{},site:ctx.site};return c;
 }catch(e){releaseCanvas(c);throw e;}
};
})();
