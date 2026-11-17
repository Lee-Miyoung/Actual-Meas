/* Native share needs a fresh tap, after rendering. Never promise a Photos save. */
const appleTouchDevice=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let pendingPhotoFiles=null,exportObjectURLs=[];
function offerPhotoFiles(files){pendingPhotoFiles=files.filter(f=>f.blob.type.startsWith('image/'));}
const exportDialog=document.createElement('dialog');exportDialog.id='device-export';
exportDialog.setAttribute('aria-labelledby','device-export-title');document.body.append(exportDialog);
function showDeviceExport(blob,name,files,options={}){
  for(const url of exportObjectURLs)URL.revokeObjectURL(url);exportObjectURLs=[];
  exportDialog.replaceChildren();
  const close=node('button','닫기','export-close');close.type='button';close.onclick=()=>exportDialog.close();
  const heading=node('h2','저장할 콘텐츠가 준비됐어요');heading.id='device-export-title';
  const note=node('p',files.length?'공유 버튼에서 ‘이미지 저장’을 선택하세요. 공유가 지원되지 않으면 사진을 길게 눌러 저장할 수 있습니다.':'파일 저장을 누르면 파일 앱의 다운로드 폴더에 저장할 수 있습니다.');
  if(options.share)note.textContent='공유 목록에서 게시할 앱을 고르세요. 게시 여부는 해당 앱에서 확인합니다.';
  const toolbar=node('div',undefined,'device-export-actions');
  const shareables=files.length?files:(blob.type.startsWith('video/')?[{name,blob}]:[]);
  const fileList=shareables.map(f=>new File([f.blob],f.name.split('/').pop(),{type:f.blob.type}));
  let canShare=false;try{canShare=!!(navigator.share&&navigator.canShare?.({files:fileList}));}catch{}
  if(options.share&&!canShare)note.textContent='이 기기에서는 파일을 앱으로 바로 보낼 수 없습니다. 아래에서 저장한 뒤 게시 앱에서 선택하세요.';
  if(fileList.length&&canShare){const share=node('button',options.share?'앱으로 공유':fileList.length>1?'사진 모두 공유 · 사진에 저장':blob.type.startsWith('video/')?'동영상 공유 · 기기에 저장':'공유 · 사진에 저장','primary');share.onclick=async()=>{try{await navigator.share({files:fileList,title:'청인마루'});}catch(e){if(e.name!=='AbortError')note.textContent='이 앱이 파일을 받지 못했습니다. 다른 공유 대상을 고르거나 아래에서 파일을 저장하세요.';}};toolbar.append(share);}
  const url=URL.createObjectURL(blob);exportObjectURLs.push(url);const link=node('a',blob.type==='video/mp4'?'MP4 파일 저장':files.length>1?'ZIP 파일 저장':'파일 저장');link.href=url;link.download=name;toolbar.append(link);
  for(const [label,value] of [['캡션 복사',options.caption],['고정댓글 복사',options.comment]]){
    if(!value)continue;
    const copy=node('button',label);copy.type='button';
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(value);note.textContent=label+' 완료';}catch{const field=node('textarea');field.value=value;toolbar.append(field);field.focus();field.select();}};
    toolbar.append(copy);
  }
  const gallery=node('div',undefined,'device-export-gallery');
  if(blob.type==='video/mp4'){
    const player=node('video');player.controls=true;player.playsInline=true;player.preload='metadata';player.src=url;player.setAttribute('aria-label','완성 영상 미리보기');gallery.append(player);
  }
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
// Encode one scene at a time so a long shoot does not keep all full-size canvases in memory.
let softwareEncoderScript;
async function loadSoftwareEncoder(){
  if(window.HME)return window.HME;
  if(!softwareEncoderScript)softwareEncoderScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='vendor/h264-mp4-encoder-1.0.12.js';
    script.onload=()=>resolve(window.HME);
    script.onerror=()=>{softwareEncoderScript=null;script.remove();reject(Error('영상 저장 모듈을 읽지 못했습니다. 연결을 확인한 뒤 다시 눌러 주세요.'));};
    document.head.append(script);
  });
  return softwareEncoderScript;
}
async function nativeMp4(){
  if(!window.VideoEncoder||!window.VideoFrame||!window.Mp4Muxer)return null;
  const config={codec:'avc1.420028',width:1080,height:1920,bitrate:6000000,framerate:24,avc:{format:'avc'}};
  const support=await VideoEncoder.isConfigSupported(config);
  if(!support.supported)return null;
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:'avc',width:1080,height:1920,frameRate:24},fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let fault;
  const encoder=new VideoEncoder({output:(chunk,meta)=>{try{muxer.addVideoChunk(chunk,meta);}catch(e){fault=e;}},error:e=>{fault=e;}});
  const close=()=>{if(encoder.state!=='closed')encoder.close();};
  try{encoder.configure(support.config);}catch(e){close();throw e;}
  return {width:1080,height:1920,fps:24,close,
    async frame(canvas,index,first){
      if(fault)throw fault;
      const ts=Math.round(index*1000000/24),frame=new VideoFrame(canvas,{timestamp:ts,duration:Math.round((index+1)*1000000/24)-ts});
      try{encoder.encode(frame,{keyFrame:first});}finally{frame.close();}
      if(encoder.encodeQueueSize>=8)await encoder.flush();
    },
    async finish(){await encoder.flush();if(fault)throw fault;muxer.finalize();return new Blob([target.buffer],{type:'video/mp4'});}
  };
}
async function portableMp4(){
  const module=await loadSoftwareEncoder(),enc=await module.createH264MP4Encoder();
  try{enc.width=720;enc.height=1280;enc.frameRate=15;enc.kbps=4300;enc.speed=8;enc.groupOfPictures=45;enc.initialize();}
  catch(e){enc.delete();throw e;}
  let pixels;
  return {width:720,height:1280,fps:15,close:()=>enc.delete(),
    frame(canvas,index,first,changed){if(first||changed||!pixels)pixels=canvas.getContext('2d').getImageData(0,0,720,1280).data;enc.addFrameRgba(pixels);},
    finish(){enc.finalize();return new Blob([enc.FS.readFile(enc.outputFilename)],{type:'video/mp4'});}
  };
}
async function recordMarketingVideo(renderFrame,count,onProgress=()=>{}){
  if(!count)throw Error('영상에 넣을 사진을 먼저 선택하세요.');
  const stage=node('dialog'),title=node('h2','동영상 준비 중'),status=node('p','화면을 열어 두세요.'),cancel=node('button','중단'),canvas=node('canvas');
  stage.id='video-stage';stage.append(title,status,canvas,cancel);document.body.append(stage);stage.showModal();
  let aborted=false;
  const stop=()=>{aborted=true;},onHidden=()=>{if(document.hidden)stop();};
  cancel.onclick=stop;stage.addEventListener('cancel',stop);document.addEventListener('visibilitychange',onHidden);
  function check(){if(aborted)throw Error('동영상 저장을 중단했습니다. 다시 눌러 이어서 준비할 수 있습니다.');}
  async function encode(engine){
    canvas.width=engine.width;canvas.height=engine.height;
    const g=canvas.getContext('2d',{willReadFrequently:true}),per=engine.fps*3;
    try{
      for(let slide=0;slide<count;slide++){
        check();const source=await renderFrame(slide);
        try{
          const scale=Math.min(canvas.width/source.width,canvas.height/source.height),w=source.width*scale,h=source.height*scale;
          let previous=-1;
          for(let f=0;f<per;f++){
            check();
            const fraction=source.drawCaptionProgress?Math.min(1,f/(engine.fps*1.5)):1,changed=f===0||fraction!==previous;
            if(changed){source.drawCaptionProgress?.(fraction);g.fillStyle='#f3f0e7';g.fillRect(0,0,canvas.width,canvas.height);g.drawImage(source,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}
            previous=fraction;
            await engine.frame(canvas,slide*per+f,f===0,changed);
            if(f%5===0){const msg='MP4 준비 중 · '+Math.round((slide*per+f+1)*100/(count*per))+'%';status.textContent=msg;onProgress(msg);await new Promise(r=>setTimeout(r,0));}
          }
        }finally{releaseCanvas(source);}
      }
      check();const blob=await engine.finish();if(blob.size<1000)throw Error('영상 데이터가 부족합니다.');return blob;
    }finally{engine.close();}
  }
  try{
    let native;try{native=await nativeMp4();}catch{}
    if(native){try{return await encode(native);}catch(e){check();status.textContent='호환 모드로 다시 저장합니다.';}}
    check();return await encode(await portableMp4());
  }finally{document.removeEventListener('visibilitychange',onHidden);releaseCanvas(canvas);if(stage.open)stage.close();stage.remove();}
}
window.exportShortFilm=async function(format,share=false){
  if(videoBusy)return;
  if(!state.photos.length)return toast('사진을 먼저 등록하세요.');
  window.ensureSignatureProject?.();
  const batch=window.signatureExportRenderer?.(),count=batch?.count||state.slideCount||1;
  const controls=[...document.querySelectorAll('.production-desk input,.production-desk select,.production-desk button')].map(el=>({el,disabled:el.disabled}));
  videoBusy=true;controls.forEach(({el})=>el.disabled=true);
  const button=$('export-reel');button.disabled=true;
  try{
    const name=(format==='shorts'?'청인마루_쇼츠':'청인마루_릴스')+'.mp4';
    const render=i=>batch?batch.render(i,format):card(state.theme,i,format);
    const blob=await recordMarketingVideo(render,count,msg=>{$('video-status').textContent=msg;});
    const saved=state.thumbnailPosting?.pack||{};
    const pack=format==='reels'&&window.CheonginThumbnailEditor?.publishPack?window.CheonginThumbnailEditor.publishPack(saved):saved;
    showDeviceExport(blob,name,[],{share,caption:(format==='shorts'?pack.youtubeDescription:pack.instagramCaption)||'',comment:window.CheonginCoverStyle?.pinnedComment});
    $('video-status').textContent='MP4 준비 완료';
  }catch(e){toast(e.message);$('video-status').textContent=e.message;}
  finally{batch?.dispose();videoBusy=false;controls.forEach(({el,disabled})=>el.disabled=disabled);button.disabled=false;}
};
$('export-reel').onclick=()=>window.exportShortFilm(state.format==='shorts'?'shorts':'reels');
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


