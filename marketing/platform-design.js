/* Photo-led layouts shared by the studio and immutable channel exports. */
async function renderPlatformDesign(content, image, index=0, format='carousel') {
  await Promise.all([document.fonts.load('400 56px "Studio Serif"'),document.fonts.load('400 24px "Studio Sans"')]);
  const c=document.createElement('canvas');c.width=1080;c.height=format==='story'?1920:format==='kakao'?1080:format==='blog'?720:1350;
  const g=c.getContext('2d'),h=c.height, theme=content.theme||'editorial', ink='#292b27',paper='#f4f1e9';
  const text=(s,x,y,size=24,width=944,rows=2,serif=false)=>{g.font=`400 ${size}px "${serif?'Studio Serif':'Studio Sans'}"`;lines(g,String(s||''),x,y,width,size*1.48,rows)};
  const rule=(y,x=64,w=952)=>{g.fillRect(x,y,w,1)};
  const brand=(light=false)=>{g.fillStyle=light?'#fffdf5':ink;text('CHEONGINMARU',64,66,19);text(String(index+1).padStart(2,'0')+' / SPACE & MATERIAL',720,66,15,300,1)};
  const title=content.carousel?.[index]?.text||content.title||Writer.SLOGAN;
  const product=Writer.label(content.product||{}),spec=[content.product?.size,content.product?.pack,content.product?.coverage].filter(Boolean).join(' · ');
  const photo=(x,y,w,hh)=>cover(g,image,x,y,w,hh);
  const shade=(y)=>{const a=g.createLinearGradient(0,y,0,h);a.addColorStop(0,'#10181500');a.addColorStop(1,'#101815e8');g.fillStyle=a;g.fillRect(0,y,1080,h-y)};
  g.fillStyle=paper;g.fillRect(0,0,1080,h);
  if(format==='story'){
    photo(0,0,1080,h);shade(h*.45);brand(true);g.fillStyle='#fffdf5';text('SPACE NOTES / '+(content.region||'청인마루'),72,h-475,18);text(title,72,h-390,62,900,3,true);rule(h-125,72,936);text(product,72,h-77,22,900,1);
  }else if(format==='kakao'){
    photo(0,0,1080,690);g.fillStyle=ink;g.fillRect(0,690,1080,390);g.fillStyle='#e9dec8';text('청인마루  /  시공 사례',60,750,20);g.fillStyle='#fffdf5';text(content.title,60,813,40,960,2,true);text(product,60,970,21,960,1);text('공간의 위로가 되다',60,1030,18);
  }else if(format==='blog'){
    photo(0,0,655,720);g.fillStyle=ink;g.fillRect(655,0,425,720);g.fillStyle='#e5d8bb';text('CHEONGINMARU',695,68,17,340,1);text('현장 기록',695,160,22);g.fillStyle='#fffdf5';text(content.title,695,240,37,325,6,true);text(content.region||Writer.SLOGAN,695,660,18,330,1);
  }else if(theme==='gallery'){
    photo(0,0,1080,h);shade(h*.52);brand(true);g.fillStyle='#fffdf5';text(index===0?'THE SPACE EDIT':'DETAIL / '+String(index+1).padStart(2,'0'),64,h-330,17);text(title,64,h-255,60,930,2,true);rule(h-100);text(index===1?spec:product,64,h-57,21,944,1);
  }else if(theme==='journal'){
    g.fillStyle='#ded6c5';g.fillRect(0,0,1080,h);brand();
    if(index%2===0){photo(0,114,810,h-370);g.fillStyle=ink;g.save();g.translate(1015,150);g.rotate(Math.PI/2);text('MATERIAL / '+String(index+1).padStart(2,'0'),0,0,25,650,1);g.restore();text(title,64,h-185,49,940,2,true)}
    else {text(title,64,190,48,940,2,true);photo(235,340,845,h-505);text('MATERIAL NOTES',64,h-110,16,900,1)}
    g.fillStyle=ink;text(index===1?spec:product,64,h-45,20,950,1);
  }else{
    brand();g.fillStyle=ink;rule(94);
    if(index===0){text('공간의 기록',64,155,18);text(title,64,232,58,944,2,true);photo(36,405,1008,h-535)}
    else if(index%3===1){photo(36,128,1008,h-440);g.fillStyle=ink;text('MATERIAL STUDY',64,h-250,17);text(title,64,h-183,45,944,2,true)}
    else if(index%3===2){photo(150,128,780,h-460);g.fillStyle=ink;text(title,64,h-235,49,944,2,true);text(index===2?spec:'공간의 위로가 되다',64,h-105,20,944,1)}
    else {photo(36,128,1008,h-365);g.fillStyle=ink;text(title,64,h-190,49,944,2,true)}
    g.fillStyle=ink;rule(h-73);text(product,64,h-32,18,944,1);
  }
  if(typeof brandMark!=='undefined'){
    const logo=await brandMark;g.save();g.globalAlpha=.42;
    const w=112;g.drawImage(logo,1080-w-48,108,w,w*logo.height/logo.width);g.restore();
  }
  return c;
}
workflowCard=async function(content,index,format='carousel'){
  if(!content.photoRefs?.length)throw Error('먼저 현장 사진을 등록하세요.');
  return renderPlatformDesign(content,await workflowImage(content.photoRefs[index%content.photoRefs.length],2400),index,format);
};
if(typeof layoutSelect!=='undefined'){
 layoutSelect.replaceChildren(new Option('01 여백의 미학 · 매거진','editorial'),new Option('02 공간 갤러리 · 사진 중심','gallery'),new Option('03 소재의 기록 · 비대칭','journal'));
}
const previousPlatformCard=card;
card=async function(theme,slide,format=state.format){
  if(!["carousel","story","reels","shorts","kakao"].includes(format)||brandSettings().fit==="contain"||state.brandSlides?.[slide]?.layout==="pair")return previousPlatformCard(theme,slide,format);
  const ordered=photoOrder();if(!ordered.length)throw Error('먼저 현장 사진을 등록하세요.');
  const offset=theme==='gallery'?1:theme==='journal'?ordered.length-1:0;
  const p=ProductionCore.matchPhoto(state.brandSlides?.[slide]?.photo,state.photos)||ordered[(slide+offset)%ordered.length],image=await photoImage(p),was=original;let corrected;
  original=false;try{corrected=transformed(image,p.adjust,2400)}finally{original=was}
  const draft=state.authoring?.draft?.inputSignature===window.currentWritingSignature?.()?state.authoring.draft:{};
  const custom=brandSettings().titles.split(/\r?\n/).filter(Boolean);
  const carousel=Array.from({length:state.slideCount||5},(_,i)=>({text:custom[i]||draft.carousel?.[i]?.text||state.title||Writer.SLOGAN}));
  const product={...(selectedProduct()||{})};if(brandSettings().product)product.model=brandSettings().product;if(brandSettings().size)product.size=brandSettings().size;
  const c=await renderPlatformDesign({...draft,carousel,theme,product,title:custom[slide]||draft.titles?.[draft.selectedTitle||0]||state.title||Writer.SLOGAN},corrected,slide,['story','reels','shorts'].includes(format)?'story':format==='kakao'?'kakao':format==='naverCover'?'blog':'carousel');
  const preset=OUTPUT_PRESETS[format];if(preset&&c.width!==preset.width){const out=document.createElement('canvas');out.width=preset.width;out.height=preset.height;out.getContext('2d').drawImage(c,0,0,out.width,out.height);return out}return c;
};
const openPlatformJob=openJob;
openJob=function(id){
  openPlatformJob(id);const j=currentJob();if(!j)return;
  let host=document.getElementById('platform-preview');if(!host){host=node('div',undefined,'platform-preview');host.id='platform-preview';$('channel-extras').prepend(host)}
  host.replaceChildren(node('small','플랫폼 디자인 미리보기 · 내보내는 파일과 같은 편집'));
  const content=structuredClone(jobContent(j));
  if(!content.photoRefs?.length)return;
  workflowCard(content,0,j.channel==='naver'?'blog':j.channel==='kakao'?'kakao':'carousel').then(c=>{if(currentJob()?.id===id&&host.isConnected)host.append(c)}).catch(e=>host.append(node('p',e.message)));
};
