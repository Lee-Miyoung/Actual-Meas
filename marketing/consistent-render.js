/* Fixed photo-led Korean overlay edition. Previous saved editions retain their original renderer. */
(function(){
'use strict';
/* A single caption layout feeds preview, finished PNG and every MP4 frame. */
function shortCaption(canvas,g,value,position){
 if(!value)return;
 const width=840,height=1920;
 const font=n=>'500 '+n+'px "Hahmlet Title", "Studio Serif", serif';
 const layout=CheonginType.layout(value,{width,fontSize:65,minFontSize:34,maxLines:4,leading:1.28,measure:(s,n)=>{g.font=font(n);return g.measureText(s).width;}});
 const block=layout.lines.length*layout.lineHeight,center=({top:.27,middle:.5,bottom:.70})[position]||.5;
 const top=height*center-block/2,lines=layout.lines.map((line,i)=>({letters:CheonginType.graphemes(line),x:(1080-layout.widths[i])/2,y:top+i*layout.lineHeight}));
 const count=lines.reduce((n,l)=>n+l.letters.length,0);
 const scale=canvas.width/1080,y=Math.max(0,Math.floor((top-30)*scale));
 const patch=document.createElement('canvas');patch.width=canvas.width;patch.height=Math.min(canvas.height-y,Math.ceil((block+65)*scale));
 patch.getContext('2d').drawImage(canvas,0,y,patch.width,patch.height,0,0,patch.width,patch.height);
 lines.forEach((l,i)=>canvas.typeLayout.push({field:'title',kind:'overlay',source:value,x:l.x,y:l.y,width:layout.widths[i],height:layout.lineHeight,size:layout.size}));
 if(layout.truncated)canvas.dataset.textTruncated='true';
 let painted=-1;
 canvas.drawCaptionProgress=fraction=>{
  const chars=Math.max(0,Math.min(count,Math.floor(fraction*count)));
  if(chars===painted)return;
  painted=chars;
  g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(patch,0,y);g.restore();
  g.save();g.font=font(layout.size);g.textBaseline='top';g.fillStyle='#FFFDF6';
  let left=chars;
  for(const line of lines){
   if(!left)break;
   const part=line.letters.slice(0,left).join('');
   window.CheonginCoverStyle.drawText(g,part,line.x,line.y);
   left=Math.max(0,left-line.letters.length);
  }
  g.restore();
 };
 canvas.drawCaptionProgress(1);
}

const previous=renderSignature;
renderSignature=async function(cfg,ctx,slot,index,format,load,options={}){
 if(cfg.photoEdition!==1)return previous(cfg,ctx,slot,index,format,load,options);
 const covers=window.CheonginChannelCovers, choice=state.thumbnailPosting||{};
 if(index===0 && covers?.formats[format] && ctx.photos.length && !window.ArchiveStudio?.comparing){
   if(!choice.layout||choice.layout==='channels'||covers.editorial?.(choice.layout)){
     return covers.fromProject(format,choice,{...options,showLogo:cfg.show.logo});
   }
   if(format===state.format && document.body.classList.contains('simple-marketing-mode') && window.CheonginThumbnailEditor?.renderCover){
     return window.CheonginThumbnailEditor.renderCover(Boolean(options.maxEdge));
   }
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
 const product=manual.product||((info?[info.brand,info.model,info.color].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '):''));
 const copy=window.CheonginPostCopy;
 const title=(index>0&&manualTitles[index]?copy?.sceneCaption?.(savedTitle,product):copy?.cleanPhotoCaption(savedTitle))??savedTitle;
 const showMaterial=index===0 || (ctx.products.length>1 && !manual.product);
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
  const topY=vertical?128:wide?30:48,pageSize=wide?17:19;
  const {height:logoH}=style.drawLogo(g,c,mark,1080,m,topY);
  const page=String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  const pageY=topY+Math.max(0,(logoH-pageSize)/2)-1;
  text(page,900,pageY,180-m,pageSize,{align:'right',alpha:.82});
  return topY+logoH;
 }
 try{
  const style=window.CheonginCoverStyle,endMode=Object.hasOwn(style.endings,manual.endingStyle)?manual.endingStyle:'signature';
  if((slot.role==='ending'||(ctx.separateEnding===undefined&&index>0&&index===total-1))&&style.endings[endMode]){
   const material=covers.material({product,kind:info?.category,structure:manual.structure||ctx.structure},manual.endingMaterial==='auto'||!manual.endingMaterial?choice.material:manual.endingMaterial);
   const selected=manual['endChoice_'+endMode],key=style.endingTitleKey(endMode,selected),detailKey=style.endingNoteKey(endMode,selected);
   const heading=manual[key]??manual['endTitle_'+endMode]??style.endingText(endMode,manual['endChoice_'+endMode],material==='wall');
   const design=style.endings[endMode],note=manual[detailKey]??manual['endLine_'+endMode]??style.endingNote(endMode,selected,material);
   const tall=H>1650,invitation=endMode==='showroom',inset=invitation||endMode==='partner'||endMode==='ask';
   const theme={
    showroom:{paper:'#F7F0E7',ink:'#563C32',sub:'#674F44',rule:'#B5A08C'},
    signature:{paper:'#F5F1E9',ink:'#253D35',sub:'#41554C',rule:'#A9B5A5'},
    ask:{paper:'#284338',ink:'#FCF9EF',sub:'#E4EAE0',rule:'#8CA398'},
    partner:{paper:'#23322F',ink:'#FAF7EC',sub:'#DEE7DF',rule:'#8B9D93'},
    participate:{paper:'#E8EBDB',ink:'#243A33',sub:'#425649',rule:'#98A68E'}
   }[endMode];
   const edge=wide?36:64,footer=wide?28:tall?H*.15:42;
   const panelX=wide?470:0,x=panelX+edge,w=1080-x-edge;
   const compact=wide||H<1180;
   const phone=style.contact.phone,site=new URL(style.contact.site).host;
   const lightFace='Ending Light';
   await Promise.all([
    style.loadTitle(design.section+heading),
    document.fonts.load('300 24px "'+lightFace+'"',String(note||'')+' '+style.visitNote).catch(()=>[])
   ]);
   function layoutCopy(value,size,rows,width,family,weight=500){
    const font=n=>weight+' '+n+'px "'+family+'", sans-serif';
    const lines=CheonginType.layout(String(value||''),{width,fontSize:size,minFontSize:Math.min(20,size),maxLines:rows,preferClauses:family===lightFace,leading:family==='Hahmlet Title'?1.22:family===lightFace?1.56:1.4,measure:(line,n)=>{g.font=font(n);return g.measureText(line).width;}});
    return {value,font,...lines,h:value?lines.lines.length*lines.lineHeight:0};
   }
   function write(block,left,top,color,field,centerWidth=0){
    if(!block.value)return;
    g.fillStyle=color;g.textBaseline='top';g.textAlign='left';g.font=block.font(block.size);
    block.lines.forEach((line,i)=>{
     const y=top+block.lineHeight*i,width=block.widths[i];
     const lineX=centerWidth?left+(centerWidth-width)/2:left;
     g.fillText(line,lineX,y);
     c.typeLayout.push({field,source:block.value,line,x:lineX,y,width,height:block.lineHeight,size:block.size});
    });
    if(block.truncated)c.dataset.textTruncated='true';
   }
   const label=layoutCopy(design.section,compact?21:25,1,w-48,endMode==='signature'?'Hahmlet Title':'Studio Sans',500);
   const headline=layoutCopy(heading,wide?38:compact?49:56,3,w,'Hahmlet Title',400);
   const body=layoutCopy(note,wide?21:compact?23:25,3,w,lightFace,300);
   const blockGap=compact?14:18;
   const titleHeight=headline.h||headline.lineHeight;
   const bodyHeight=body.h||body.lineHeight;
   const groupH=label.h+blockGap+titleHeight+blockGap+bodyHeight;
   const iconGap=wide?8:10,contactGap=wide?22:36;
   function contactItem(icon,value,size,iconSize,weight){
    const block=layoutCopy(value,size,1,w-iconSize-iconGap,'Studio Sans',weight);
    return {icon,block,iconSize,width:iconSize+iconGap+block.widths[0]};
   }
   const contacts=[
    contactItem('phone',phone,wide?25:29,wide?21:24,500),
    contactItem('site',site,wide?18:23,wide?17:20,400),
    contactItem('chat','카카오채널 청인마루',wide?18:23,wide?17:20,400)
   ];
   const rowWidth=row=>row.reduce((sum,item)=>sum+item.width,contactGap*(row.length-1));
   const rows=rowWidth(contacts)<=w?[contacts]:[[contacts[0]],contacts.slice(1)];
   const rowHeights=rows.map(row=>Math.max(...row.map(item=>item.block.h)));
   const rowGap=compact?5:8;
   const contactH=rowHeights.reduce((sum,height)=>sum+height,rowGap*(rows.length-1));
   const visit=layoutCopy(style.visitNote,wide?16:compact?18:19,2,w,lightFace,300);
   const visitY=H-footer-visit.h;
   const contactTop=visitY-(compact?9:14)-contactH;
   const lineY=contactTop-(compact?15:21);
   const clearance=compact?17:26;
   const bodyTop=wide?Math.max(16,(lineY-clearance-groupH)/2):Math.min(H*.64+clearance,lineY-clearance-groupH);
   const photoBottom=wide?H:Math.max(1,bodyTop-clearance);
   g.fillStyle=theme.paper;g.fillRect(0,0,1080,H);
   const pad=invitation?(wide?24:32):inset?(wide?18:22):0;
   const photoW=(wide?panelX:1080)-2*pad, photoH=photoBottom-2*pad;
   if(photoH>0)await photo(lead.id,pad,pad,photoW,photoH);
   if(cfg.show.logo){
    const mark=await style.logo(ctx.logoTone);style.drawLogo(g,c,mark,1080,wide?48:m,tall?128:wide?38:48);
   }
   // A short rule introduces the signature, keeping the photograph free of ornaments.
   g.fillStyle=theme.rule;g.fillRect(x,bodyTop+label.size*.6,32,2);
   write(label,x+46,bodyTop,theme.sub);
   const headingY=bodyTop+label.h+blockGap;
   write(headline,x,headingY,theme.ink,key);
   const noteY=headingY+titleHeight+blockGap;
   write(body,x,noteY,theme.sub,detailKey);
   // These full-width regions belong to the editor, including when all text was erased.
   c.endingFields=[
    {field:key,source:heading,x,y:headingY,width:w,height:titleHeight,size:headline.size},
    {field:detailKey,source:note,x,y:noteY,width:w,height:bodyHeight,size:body.size}
   ];
   g.strokeStyle=theme.rule;g.lineWidth=1;g.beginPath();g.moveTo(x,lineY);g.lineTo(x+w,lineY);g.stroke();
   write(visit,x,visitY,theme.sub,undefined,w);
   function drawContact({icon,block,iconSize},left,centerY){
    g.font=block.font(block.size);g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle=theme.ink;
    const line=block.lines[0],metrics=g.measureText(line);
    const ascent=metrics.actualBoundingBoxAscent??block.size*.78;
    const descent=metrics.actualBoundingBoxDescent??block.size*.16;
    const textX=left+iconSize+iconGap;
    const iconCenter=icon==='chat'?12.5/24:0.5;
    style.contactIcon(g,icon,left,centerY-iconSize*iconCenter,iconSize,theme.ink);
    g.fillText(line,textX,centerY+(ascent-descent)/2);
    c.typeLayout.push({source:block.value,x:textX,y:centerY-(ascent+descent)/2,width:metrics.width,height:ascent+descent,size:block.size});
   }
   let rowY=contactTop;
   rows.forEach((row,i)=>{
    let left=x+(w-rowWidth(row))/2;
    for(const item of row){
     drawContact(item,left,rowY+rowHeights[i]/2);
     left+=item.width+contactGap;
    }
    rowY+=rowHeights[i]+rowGap;
   });
   c.dataset.ending=endMode;c.previewMeta={[key]:heading,[detailKey]:note};
   return c;
  }
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
  if(showMaterial&&cfg.show.spec)place('spec',detail,wide?17:21,{rows:2,alpha:.84});
  if(showMaterial && cfg.show.product && comparable(product)!==comparable(title)){
   place('product',product,wide?21:26,{rows:2,weight:600,alpha:.95});
  }
  const shortScene=index>0&&['reels','shorts'].includes(format);
  if(!shortScene)place('title',title,wide?34:43,{rows:2,alpha:.96,family:'Studio Serif'});
  place('location',location,wide?16:18,{alpha:.78});
  if(shortScene){
   await style.loadTitle(title);
   shortCaption(c,g,title,ctx.bindings[lead.id]?.shortCaptionPosition);
  }
  c.previewMeta={title,product,spec:manual.spec||info?.size||'',location,productData:info||{},site:ctx.site,structure:ctx.structure||''};
  return c;
 }catch(e){releaseCanvas(c);throw e;}
};
})();
