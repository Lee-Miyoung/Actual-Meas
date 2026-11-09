/* Native share needs a fresh tap, after rendering. Never promise a Photos save. */
const appleTouchDevice=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let pendingPhotoFiles=null,exportObjectURLs=[];
function offerPhotoFiles(files){pendingPhotoFiles=files.filter(f=>f.blob.type.startsWith('image/'));}
const exportDialog=document.createElement('dialog');exportDialog.id='device-export';
exportDialog.setAttribute('aria-labelledby','device-export-title');document.body.append(exportDialog);
function showDeviceExport(blob,name,files){
  for(const url of exportObjectURLs)URL.revokeObjectURL(url);exportObjectURLs=[];
  exportDialog.replaceChildren();
  const close=node('button','닫기','export-close');close.type='button';close.onclick=()=>exportDialog.close();
  const heading=node('h2','저장할 콘텐츠가 준비됐어요');heading.id='device-export-title';
  const note=node('p',files.length?'공유 버튼에서 ‘이미지 저장’을 선택하세요. 공유가 지원되지 않으면 사진을 길게 눌러 저장할 수 있습니다.':'파일 저장을 누르면 파일 앱의 다운로드 폴더에 저장할 수 있습니다.');
  const toolbar=node('div',undefined,'device-export-actions');
  const shareables=files.length?files:(blob.type.startsWith('video/')?[{name,blob}]:[]);
  const fileList=shareables.map(f=>new File([f.blob],f.name.split('/').pop(),{type:f.blob.type}));
  let canShare=false;try{canShare=!!(navigator.share&&navigator.canShare?.({files:fileList}));}catch{}
  if(fileList.length&&canShare){const share=node('button',fileList.length>1?'사진 모두 공유 · 사진에 저장':blob.type.startsWith('video/')?'동영상 공유 · 기기에 저장':'공유 · 사진에 저장','primary');share.onclick=async()=>{try{await navigator.share({files:fileList,title:'청인마루'});}catch(e){if(e.name!=='AbortError')toast('공유할 수 없습니다. 사진을 길게 눌러 저장해 주세요.');}};toolbar.append(share);}
  const url=URL.createObjectURL(blob);exportObjectURLs.push(url);const link=node('a',files.length>1?'ZIP 파일 저장':'파일 저장');link.href=url;link.download=name;toolbar.append(link);
  const gallery=node('div',undefined,'device-export-gallery');
  for(const file of files){
    const figure=node('figure'),image=node('img');const src=URL.createObjectURL(file.blob);exportObjectURLs.push(src);image.src=src;image.alt=file.name;image.loading='lazy';
    const caption=node('figcaption',file.name);const save=node('a','사진 파일 저장');save.href=src;save.download=file.name.split('/').pop();figure.append(image,caption,save);gallery.append(figure);
  }
  exportDialog.append(close,heading,note,toolbar,gallery);
  if(!exportDialog.open)exportDialog.showModal();
}
exportDialog.addEventListener('close',()=>{for(const url of exportObjectURLs)URL.revokeObjectURL(url);exportObjectURLs=[];pendingPhotoFiles=null;exportDialog.replaceChildren();});
const downloadBeforeDevice=download;
download=function(blob,name){
  const files=pendingPhotoFiles||(blob?.type.startsWith('image/')?[{name,blob}]:[]);pendingPhotoFiles=null;
  if(!(blob instanceof Blob)||!blob.size)return easyStatus('저장할 파일이 없습니다.',true);
  if(appleTouchDevice){downloadLink(blob,name);showDeviceExport(blob,name,files);easyStatus('파일 준비 완료 · 열린 저장 창에서 공유 또는 파일 저장을 눌러 주세요.');}
  else downloadBeforeDevice(blob,name);
};
// Encode fixed timestamps, then write one MP4. No real-time recording fragments.
async function recordMarketingVideo(renderFrame,count,onProgress=()=>{}){
  if(!window.VideoEncoder||!window.VideoFrame||!window.Mp4Muxer)throw Error('이 브라우저는 호환되는 MP4 출력을 지원하지 않습니다. 사진 PNG로 저장하거나 Safari를 업데이트해 주세요.');
  const config={codec:'avc1.420028',width:1080,height:1920,bitrate:5000000,framerate:24,avc:{format:'avc'}};
  const support=await VideoEncoder.isConfigSupported(config);
  if(!support.supported)throw Error('이 기기에 호환되는 H.264 인코더가 없습니다. 사진 PNG 출력은 사용할 수 있습니다.');
  const target=new Mp4Muxer.ArrayBufferTarget();
  const muxer=new Mp4Muxer.Muxer({target,video:{codec:'avc',width:1080,height:1920,frameRate:24},fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let encoder,encodeError,cancelled=false,stage,canvas,visibilityListener;
  const started=performance.now();
  try{
    encoder=new VideoEncoder({output:(chunk,meta)=>{try{muxer.addVideoChunk(chunk,meta);}catch(e){encodeError=e;}},error:e=>{encodeError=e;}});
    encoder.configure(support.config);
    stage=node('dialog');stage.id='video-stage';const title=node('h2','릴스 영상 만드는 중');const status=node('p','사진과 문구를 영상 파일로 준비합니다. 화면을 열어 두세요.');const cancel=node('button','출력 중단');
    canvas=node('canvas');canvas.width=1080;canvas.height=1920;
    cancel.onclick=()=>{cancelled=true;};stage.addEventListener('cancel',()=>{cancelled=true;});stage.append(title,status,canvas,cancel);document.body.append(stage);stage.showModal();
    visibilityListener=()=>{if(document.hidden)cancelled=true;};document.addEventListener('visibilitychange',visibilityListener);
    const ctx=canvas.getContext('2d'),perSlide=72,total=count*perSlide;
    for(let slide=0;slide<count;slide++){
      if(cancelled)throw Error('영상 출력을 중단했습니다. 원본과 편집 내용은 유지됩니다.');
      const source=await renderFrame(slide);
      try{
        const scale=Math.min(1080/source.width,1920/source.height),w=source.width*scale,h=source.height*scale;
        ctx.fillStyle=EDITORIAL.paper;ctx.fillRect(0,0,1080,1920);ctx.drawImage(source,(1080-w)/2,(1920-h)/2,w,h);
      }finally{releaseCanvas(source);}
      for(let frame=0;frame<perSlide;frame++){
        if(cancelled)throw Error('영상 출력을 중단했습니다. 원본과 편집 내용은 유지됩니다.');
        if(encodeError)throw encodeError;
        if(performance.now()-started>180000)throw Error('영상 출력 시간이 초과됐습니다. 다른 앱을 닫은 뒤 다시 시도하세요.');
        const number=slide*perSlide+frame,timestamp=Math.round(number*1000000/24),duration=Math.round((number+1)*1000000/24)-timestamp;
        const image=new VideoFrame(canvas,{timestamp,duration});
        try{encoder.encode(image,{keyFrame:frame===0});}finally{image.close();}
        if((frame+1)%6===0){
          await encoder.flush();if(encodeError)throw encodeError;
          const message=`MP4 파일 준비 중 · ${Math.round((number+1)/total*100)}%`;status.textContent=message;onProgress(message);await new Promise(r=>setTimeout(r,0));
        }
      }
    }
    await encoder.flush();if(encodeError)throw encodeError;muxer.finalize();
    const blob=new Blob([target.buffer],{type:'video/mp4'});if(blob.size<1000)throw Error('영상 데이터가 부족합니다. 다시 시도하세요.');return blob;
  }finally{
    if(visibilityListener)document.removeEventListener('visibilitychange',visibilityListener);
    if(encoder&&encoder.state!=='closed')encoder.close();releaseCanvas(canvas);if(stage){stage.close();stage.remove();}
  }
}
$('export-reel').onclick=async()=>{
  if(videoBusy)return;if(!state.photos.length)return toast('사진을 먼저 등록하세요.');videoBusy=true;
  const controls=[...document.querySelectorAll('.production-desk input,.production-desk select,.production-desk button')].map(el=>({el,disabled:el.disabled}));
  controls.forEach(({el})=>el.disabled=true);$('export-reel').disabled=true;
  try{const blob=await recordMarketingVideo(i=>card(state.theme,i,'reels'),state.slideCount||5,msg=>{$('video-status').textContent=msg;});download(blob,'청인마루_릴스_1080x1920.mp4');$('video-status').textContent='MP4 파일 준비 완료 · 음악 없음';}
  catch(e){toast(e.message);$('video-status').textContent=e.message;}
  finally{videoBusy=false;controls.forEach(({el,disabled})=>el.disabled=disabled);$('export-reel').disabled=false;}
};
exportJobVideo=async function(job){
  if(workflowVideoBusy)throw Error('영상 출력 중입니다.');workflowVideoBusy=true;
  const content=structuredClone(jobContent(job));
  try{const blob=await recordMarketingVideo(i=>workflowCard(content,i,'story'),content.carousel?.length||5,progress);download(blob,'청인마루_현장릴스.mp4');progress('MP4 파일 준비 완료 · 음악 없음');}finally{workflowVideoBusy=false;}
};

// Progressive disclosure keeps photo work at the centre of the touch screen.
const planner=document.querySelector('.story-planner'),storyDrawer=node('details',undefined,'story-drawer');
storyDrawer.append(node('summary','문구와 콘텐츠 구성 · 필요할 때 열기'));planner.before(storyDrawer);storyDrawer.append(planner);
document.querySelector('.desk-heading h2').textContent='공간을, 오래 남도록.';
document.querySelector('.desk-heading .desk-badge').textContent='CHEONGINMARU / STUDIO';
document.querySelector('#package-drop strong').textContent='01　현장 사진 불러오기';
document.querySelector('#package-drop div p').textContent='사진 4–10장을 선택하세요. 제작 ZIP과 JSON도 그대로 불러올 수 있습니다.';
document.querySelector('.desk-settings .brand-output-panel > p').textContent='같은 서체와 여백으로, 채널에 맞는 기록을 만듭니다.';
const compareButton=node('button','같은 사진으로 디자인 3안 비교','direction-trigger');compareButton.type='button';$('production-platforms').after(compareButton);
const directionDialog=node('dialog');directionDialog.id='direction-dialog';directionDialog.setAttribute('aria-labelledby','direction-dialog-title');document.body.append(directionDialog);
let directionRevision=0;
directionDialog.tabIndex=-1;
directionDialog.addEventListener('close',()=>{directionRevision++;for(const c of directionDialog.querySelectorAll('canvas'))releaseCanvas(c);directionDialog.replaceChildren();});
compareButton.textContent='디자인 3안 크게 비교';
compareButton.onclick=async()=>{
  if(!state.photos.length)return toast('현장 사진을 먼저 선택하세요.');
  const revision=++directionRevision;directionDialog.replaceChildren();
  const header=node('header',undefined,'direction-header'),eyebrow=node('span','CHEONGINMARU / DESIGN','direction-eyebrow');
  const heading=node('h2','같은 사진, 다른 분위기');heading.id='direction-dialog-title';
  const note=node('p','크게 비교하고 마음에 드는 시안을 골라보세요.');
  const close=node('button','×','export-close');close.type='button';close.setAttribute('aria-label','시안 비교 닫기');close.onclick=()=>directionDialog.close();
  header.append(eyebrow,close,heading,note);
  const options=node('div',undefined,'direction-options');options.setAttribute('aria-label','디자인 시안 3개');options.tabIndex=0;
  const nav=node('div',undefined,'direction-navigation'),previous=node('button','←'),next=node('button','→'),counter=node('span','01 / 03');
  previous.type=next.type='button';previous.setAttribute('aria-label','이전 시안');next.setAttribute('aria-label','다음 시안');counter.setAttribute('aria-live','polite');nav.append(previous,counter,next);
  const hint=node('p','옆으로 넘겨 비교할 수 있어요.','direction-swipe-hint');
  directionDialog.append(header,options,hint,nav);directionDialog.showModal();directionDialog.focus({preventScroll:true});
  let active=0,scrollTick;
  const pages=[];
  function syncPage(){
    if(!pages.length)return;
    const step=pages.length>1?pages[1].offsetLeft-pages[0].offsetLeft:pages[0].offsetWidth;
    active=Math.max(0,Math.min(pages.length-1,Math.round(options.scrollLeft/Math.max(1,step))));counter.textContent=String(active+1).padStart(2,'0')+' / 03';previous.disabled=active===0;next.disabled=active===2;
  }
  function move(delta){const i=Math.max(0,Math.min(pages.length-1,active+delta));if(!pages[i])return;options.scrollTo({left:pages[i].offsetLeft-pages[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  previous.onclick=()=>move(-1);next.onclick=()=>move(1);
  options.onscroll=()=>{cancelAnimationFrame(scrollTick);scrollTick=requestAnimationFrame(syncPage);};
  options.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}};
  const definitions=[['editorial','01','공간 화보','사진을 주인공으로, 문구는 여백에.'],['gallery','02','소재 에디션','큰 제목과 선명한 제품 정보.'],['journal','03','시공 저널','짙은 바탕 위에 정돈한 시공의 기준.']];
  for(const [theme,number,label,description]of definitions){
    const page=node('article',undefined,'direction-option');page.setAttribute('aria-label',number+' '+label);
    const art=node('div',undefined,'direction-art');const preparing=node('span','시안을 준비하고 있어요.','direction-preparing');art.append(preparing);
    const caption=node('div',undefined,'direction-caption'),title=node('h3');title.append(node('small',number),node('span',label));caption.append(title,node('p',description));
    const apply=node('button','이 시안 쓰기','direction-apply');apply.type='button';apply.disabled=true;apply.setAttribute('aria-label',number+' '+label+' 적용');
    apply.onclick=()=>{if(window.selectBrandDirection)window.selectBrandDirection(theme);else{state.theme=theme;persist();}directionSelect.value=theme;directionDialog.close();window.renderProductionWorkspace();};
    page.append(art,caption,apply);options.append(page);pages.push(page);
    try{
      const full=await card(theme,0,'carousel',true,{maxEdge:900});
      if(revision!==directionRevision){releaseCanvas(full);return;}
      const thumb=node('canvas');thumb.width=720;thumb.height=900;thumb.getContext('2d').drawImage(full,0,0,720,900);thumb.dataset.design=theme;thumb.dataset.renderer=full.dataset.renderer;thumb.setAttribute('aria-label',label+' 출력 미리보기');releaseCanvas(full);art.replaceChildren(thumb);apply.disabled=false;
    }catch(e){preparing.textContent='시안을 만들지 못했습니다. '+e.message;}
  }
  syncPage();
};

// Refreshing a saved job returns to the same workspace rather than an empty-looking dashboard.
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{try{sessionStorage.setItem('cheonginmaru-marketing-tab',button.dataset.tab);}catch{}});
try{const last=sessionStorage.getItem('cheonginmaru-marketing-tab')||'studio';const button=[...document.querySelectorAll('[data-tab]')].find(b=>b.dataset.tab===last);button?.click();}catch{}

if(!window.VideoEncoder||!window.VideoFrame){
  $('brand-video').disabled=true;$('export-reel').disabled=true;$('brand-video').textContent='MP4 · 최신 Safari 필요';
  const note=node('p','사진·ZIP 저장은 사용할 수 있습니다. MP4는 H.264 영상 인코딩을 지원하는 최신 Safari 또는 Chrome에서 열어 주세요.','hint');$('brand-video').parentElement.after(note);
}
