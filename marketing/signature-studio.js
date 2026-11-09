/* Brand defaults live in existing settings; each project owns a complete versioned snapshot. */
(function(){
'use strict';
const Core=SignatureCore,names={'editorial-studio':'Editorial Studio · 건축 매거진','modern-gallery':'Modern Gallery · 사진 갤러리','material-journal':'Material Journal · 소재 편집'};
let ready=false,known=new Set(),settingsDraft=Core.create(),previewRevision=0,lastUI='',photoUI='';
const legacyCard=card,legacyWorkflowCard=workflowCard;
function active(){return state.signatureDesign?.schema==='cheonginmaru-signature-v1';}
function profile(){state.settings??={};state.settings.brandDesign??={current:Core.create(),history:[]};return state.settings.brandDesign;}
function defaultConfig(){return Core.validate(profile().current);}
function projectProduct(){return Core.product(window.campaignProduct?campaignProduct():selectedProduct());}
function photoProduct(id){const key=state.signaturePhotos?.[id]?.productKey;if(key)return Core.product(Writer.resolveProduct(state.catalog,key));return projectProduct();}
function context(){
 const photos=state.photos.map(p=>({id:p.id,name:p.name,width:p.sourceWidth||1200,height:p.sourceHeight||900,score:Number(p.analysis?.score)||0,duplicate:!!p.analysis?.duplicateOf})),bindings=Core.copy(state.signaturePhotos||{}),photoProducts={},unique=new Map(),areas={};
 for(const p of photos){const product=photoProduct(p.id);if(product){photoProducts[p.id]=product;const key=[product.id,product.brand,product.model,product.color,product.size].join('|');product.renderKey=key;unique.set(key,product);if(bindings[p.id]?.area)areas[key]=[areas[key],bindings[p.id].area].filter(Boolean).join(' · ');}}
 return {...Core.publicSite(state),photos,bindings,photoProducts,products:[...unique.values()],areas};
}
function effectiveSequence(){const custom=brandSettings().titles.split(/\r?\n/);return (state.signatureSequence||[]).map((s,i)=>({...s,title:custom[i]||s.title}));}
function buildSequence(preserve=true){
 if(!active()||!state.photos.length)return;
 const custom=brandSettings().titles.split(/\r?\n/),before=(state.brandSlides||[]).map((s,i)=>({...s,title:custom[i]||s.title})),previousAuto=state.signatureAutoTitles||{},previousSequence=state.signatureSequence||[],nextAuto={},ctx=context();state.signatureSequence=Core.plan(ctx.photos,ctx.bindings,{...ctx,materialCount:ctx.products.length});
 state.brandSlides=state.signatureSequence.map((slot,i)=>{const p=state.photos.find(p=>p.id===slot.photoIds[0]),key=p?.id||'info:'+slot.productPage,old=preserve?(p?before.find(s=>s.photo===p.name):before[previousSequence.findIndex(s=>s.role==='information'&&s.productPage===slot.productPage)]):null;nextAuto[key]=slot.title;return {photo:p?.name||'',title:old?.title&&old.title!==previousAuto[key]?old.title:slot.title,layout:slot.role==='comparison'&&slot.photoIds.length===1?'pair':'photo'};});state.signatureAutoTitles=nextAuto;
 state.slideCount=state.signatureSequence.length;state.brandOutput={...brandSettings(),titles:state.brandSlides.map(s=>s.title).join('\n')};
 const select=$('slide-count');for(const n of [1,2,7,8,9,10])if(![...select.options].some(o=>o.value===String(n)))select.add(new Option(String(n),String(n)));select.value=String(state.slideCount);
}
function refreshCaptions(){
 const ctx=context();if(!ctx.photos.length)return;const key=JSON.stringify({ctx,sequence:effectiveSequence(),contact:state.settings.kakao||state.settings.website});if(state.signatureCaptionKey===key)return;
 const heading=[ctx.site,ctx.region,ctx.space].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '),notes=ctx.photos.map(p=>ctx.bindings[p.id]).filter(Boolean).map(b=>[b.area,b.note].filter(Boolean).join(' · ')).filter(Boolean),models=ctx.products.map(p=>[p.brand,p.model,p.color].filter(Boolean).join(' | ')),facts=ctx.products.map(p=>[p.brand,p.model,p.color,p.size].filter(Boolean).join(' | '));
 if(ctx.memo&&!notes.includes(ctx.memo))notes.push(ctx.memo);
 const contact=state.settings.kakao||state.settings.website||'지역·현장 사진·원하는 소재를 알려주시면 확인해 안내합니다.',title=effectiveSequence()[0]?.title||heading,works=ctx.works.length?'확인한 작업: '+ctx.works.join(' · '):'',tags=['청인마루',...ctx.products.map(p=>p.brand),ctx.region].filter(Boolean).map(s=>'#'+s.replace(/[^\p{L}\p{N}]/gu,'')).join(' ');
 const caption=[heading,...notes,facts.length?'시공 제품\n'+facts.join('\n'):'',works,'시공 상담\n'+contact,tags].filter(Boolean).join('\n\n');
 const blog=[heading,'현장 기록\n'+notes.join('\n'),facts.length?'제품과 규격\n'+facts.join('\n'):'',works,'사진을 보는 순서\n'+effectiveSequence().map((s,i)=>`${i+1}. ${s.title}`).join('\n'),'소재를 선택하기 전 실제 샘플과 현장 조건을 함께 확인하세요.','문의\n'+contact].filter(Boolean).join('\n\n');
 const short=[title,heading,models.join(' · '),contact].filter(Boolean).join('\n'),kakao=[heading,models.join(' · '),'현장 사진과 원하는 자재를 보내주시면 상담을 안내합니다.',contact].filter(Boolean).join('\n\n');
 const generated={carousel:caption,naver:blog,naverCover:heading,kakao,kakaoWide:kakao,youtube:caption,youtubeCover:title,story:short,reels:short,shorts:short};state.brandCaptions??={};for(const [format,text]of Object.entries(generated))if(!state.signatureEditedCaptions?.[format])state.brandCaptions[format]=text;state.signatureCaptionKey=key;
}
function ensure(){
 if(!ready)return;
 if(!state.signatureDesign){state.signatureDesign=known.has(state.projectId)?{id:'legacy-v6',version:1}:defaultConfig();if(active())buildSequence(false);}
 const productSourceKey=JSON.stringify([state.authoring?.productKey,brandSettings().product,brandSettings().size]);
 if(active()&&(state.signatureProjectProduct===undefined||state.signatureProductSourceKey!==productSourceKey)){state.signatureProjectProduct=projectProduct();state.signatureProductSourceKey=productSourceKey;}
 if(active()&&state.photos.length&&(!state.signatureSequence?.length||state.signatureSequence.some(s=>s.photoIds.some(id=>!state.photos.some(p=>p.id===id))))){state.signaturePhotos??={};for(const p of state.photos)state.signaturePhotos[p.id]??={role:Core.infer(p.name,p.sourceWidth,p.sourceHeight),area:'',productKey:'',note:'',source:'filename'};buildSequence(true);}
 document.querySelector('.campaign-summary').hidden=active();document.querySelector('.story-drawer').hidden=active();
 const daily=$('production-style');daily.disabled=active();daily.closest('label').hidden=active();document.querySelector('.direction-trigger').hidden=true;
 $('brand-fit').closest('label').hidden=active();$('brand-example').hidden=active();document.querySelector('.production-advanced .brand-controls').hidden=active();
 if(active())refreshCaptions();
 $('slide-count').disabled=active();badge.textContent=active()?names[state.signatureDesign.id]+' · v'+state.signatureDesign.version+' / '+state.signatureDesign.revision:'기존 프로젝트 디자인 유지';
 if(active()&&state.signatureSequence){state.slideCount=state.signatureSequence.length;}
 refreshBindings();refreshProjects();
}
window.signatureSlideEdited=function(index,patch){
 if(!active())return;const slot=state.signatureSequence?.[index];if(!slot)return;
 if(patch.photo){const p=ProductionCore.matchPhoto(patch.photo,state.photos);if(p)slot.photoIds=[p.id];}
 if(patch.layout){if(patch.layout==='pair')slot.role='comparison';else if(slot.role==='comparison')slot.role='view';}
 if(patch.title)slot.title=patch.title;
 if(patch.focus!==undefined){state.signaturePhotos??={};for(const id of slot.photoIds)state.signaturePhotos[id]={...state.signaturePhotos[id],focus:patch.focus};}
 state.signatureCaptionKey='';
};
window.ensureSignatureProject=ensure;
window.addEventListener('marketing:ready',()=>{const index=Number(document.querySelector('#designs canvas')?.dataset.slide||0),information=active()&&state.signatureSequence?.[index]?.role==='information';for(const id of ['production-photo','production-kind','production-focus'])$(id).disabled=information;});
window.signaturePhotoImport=function({kit=false}={}){if(!ready)return;ensure();if(!active())return;state.signatureEditedCaptions=kit?Object.fromEntries(Object.keys(state.brandCaptions||{}).map(k=>[k,true])):{};state.signaturePhotos={};for(const p of state.photos)state.signaturePhotos[p.id]={role:Core.infer(p.name,p.sourceWidth,p.sourceHeight),area:'',productKey:'',note:'',source:'filename'};buildSequence(kit);persist();};
window.signatureSource=()=>active()?{design:Core.copy(state.signatureDesign),sequence:Core.copy(effectiveSequence()),context:context()}:null;
async function renderCurrent(config,index,format,options={}){
 const ctx=context(),slot=state.signatureSequence?.[index];if(!slot)throw Error('사진 구성을 먼저 준비하세요.');
 const custom=brandSettings().titles.split(/\r?\n/)[index];const entry={...slot,title:custom||slot.title};
 return renderSignature(config,ctx,entry,index,format,async(id,max)=>{const p=state.photos.find(p=>p.id===id);if(!p)throw Error('연결된 사진이 없습니다.');const image=await photoImage(p),was=original;original=false;try{return transformed(image,p.adjust,max);}finally{original=was;}},options);
}
card=async function(theme,index,format=state.format,proposed=false,options={}){ensure();if(!active())return legacyCard(theme,index,format,proposed,options);return renderCurrent(state.signatureDesign,index,format,options);};
workflowCard=async function(content,index,format='carousel'){
 if(!content.signatureDesign)return legacyWorkflowCard(content,index,format);
 const slot=content.signatureSequence?.[index];if(!slot)throw Error('보관된 사진 구성에 없는 페이지입니다.');
 return renderSignature(content.signatureDesign,content.signatureContext,slot,index,format,async(id,max)=>{const ref=content.photoRefs.find(r=>r.id===id||r.sourceId===id);if(!ref)throw Error('보관된 사진 연결을 찾을 수 없습니다.');return workflowImage(ref,max);});
};
window.signatureExportRenderer=function(){
 if(!active())return null;const source=Core.copy(window.signatureSource()),prefix='signature-export:'+crypto.randomUUID()+':';
 const photos=state.photos.map(p=>({id:prefix+p.id,sourceId:p.id,src:p.src,adjust:Core.copy(p.adjust),thumbnail:p.thumbnail,sourceWidth:p.sourceWidth,sourceHeight:p.sourceHeight}));
 return {count:source.sequence.length,design:source.design,render:(index,format)=>renderSignature(source.design,source.context,source.sequence[index],index,format,async(id,max)=>{const p=photos.find(p=>p.sourceId===id);if(!p)throw Error('출력 원본을 찾지 못했습니다.');const image=await photoImage(p),was=original;original=false;try{return transformed(image,p.adjust,max);}finally{original=was;}}),dispose:()=>{for(const [key,c]of images)if(String(key).startsWith(prefix)){releaseCanvas(c);images.delete(key);}}};
};
const legacyEasyGenerate=easyGenerate;
easyGenerate=async function(force=false){
 ensure();if(!active())return legacyEasyGenerate(force);if(!state.photos.length)return;
 if(easyBusy){clearTimeout(easyTimer);easyTimer=setTimeout(()=>easyGenerate(force),250);return;}
 easyBusy=true;try{await preparePhotos();await generateWriting(false);ensure();await window.renderProductionWorkspace();persist();scheduleChannels();easyStatus('현장 정보와 저장된 브랜드 디자인으로 콘텐츠를 준비했습니다.');}catch(e){easyStatus('콘텐츠 준비 실패 · '+e.message,true);}finally{easyBusy=false;}
};
const baseDrafts=Flow.drafts;
Flow.drafts=function(project,draft,assets,question){
 const list=baseDrafts(project,draft,assets,question),source=window.signatureSource();if(source)for(const d of list){d.signatureDesign=source.design;d.signatureSequence=source.sequence.map((s,i)=>({...s,title:brandSettings().titles.split(/\r?\n/)[i]||s.title}));d.signatureContext=source.context;d.carousel=d.signatureSequence.map((s,i)=>({text:s.title,photo:i+1,role:s.role}));d.photoRefs=d.photoRefs.map((r,i)=>({...r,sourceId:photoOrder()[i]?.id}));const ctx=source.context;
 const details=ctx.photos.map(p=>ctx.bindings[p.id]).filter(Boolean).map(b=>[b.area,b.note].filter(Boolean).join(' · ')).filter(Boolean);
 if(ctx.memo&&!details.includes(ctx.memo))details.push(ctx.memo);
 const materials=ctx.products.map(p=>[p.brand,p.model,p.color,p.size].filter(Boolean).join(' | '));
 const heading=[ctx.region,ctx.space,ctx.site].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · ')||project.number;
 const works=ctx.works.length?'확인한 작업: '+ctx.works.join(' · '):'';
 const contact=state.settings.kakao||state.settings.website||'지역과 현장 사진, 원하는 소재를 보내주시면 확인해 안내하겠습니다.';
 const tags=['청인마루',...ctx.products.map(p=>p.brand),ctx.region].filter(Boolean).map(s=>'#'+s.replace(/[^\p{L}\p{N}]/gu,'')).join(' ');
 const order=d.signatureSequence.map((s,i)=>`${i+1}. ${s.title}`).join('\n');
 if(d.channel==='instagram'){d.title=d.signatureSequence[0]?.title||heading;d.body=[heading,...details,materials.length?'시공 제품\n'+materials.join('\n'):'',works,'시공 상담\n'+contact,tags].filter(Boolean).join('\n\n');d.hook=d.title;d.script=d.signatureSequence.map((s,i)=>`${i*3}–${i*3+3}초 · ${s.title}`).join('\n');d.story=[d.title,heading].join('\n');}
 if(d.channel==='naver'){d.title=[ctx.region,ctx.space,...ctx.products.map(p=>p.model),'현장 기록'].filter(Boolean).join(' ');d.body=[heading,'현장 안내\n'+[ctx.space,...details].filter(Boolean).join('\n'),materials.length?'이 현장의 제품과 규격\n'+materials.join('\n'):'제품 정보는 확인 후 안내합니다.',works,'사진을 보는 순서\n'+order,'상담 전 준비할 것\n지역·현장 사진·원하는 자재를 함께 알려주세요.\n'+contact].filter(Boolean).join('\n\n');}
 if(d.channel==='website'){d.title=heading;d.body=[heading,...details,materials.length?'시공 제품\n'+materials.join('\n'):'',works,'시공 상담\n'+contact].filter(Boolean).join('\n\n');}
 if(d.channel==='kakao'){d.title=heading+' · 시공 상담';d.body=[heading,...details.slice(0,2),materials.join('\n'),'어떤 소재를 선택할지 고민된다면 현장 사진과 함께 문의해 주세요.',contact].filter(Boolean).join('\n\n');}
 d.product=ctx.products[0]?{...draft.product,...ctx.products[0],category:ctx.products[0].category||draft.product.category,type:ctx.products[0].type||draft.product.type}:{...draft.product,brand:'',model:'',size:'',color:'',features:'',verified:false};}
 return list;
};
const section=node('section',undefined,'signature-settings');section.id='signature-settings';section.hidden=true;
section.innerHTML=`<div class="signature-heading"><span>CHEONGINMARU / IDENTITY</span><h2>한 번 정한 기준으로,<br>모든 현장을 기록합니다.</h2><p>기본 디자인은 새 현장에 적용됩니다. 보관된 현장은 저장된 디자인 버전을 유지합니다.</p></div>
<div class="signature-settings-grid"><form id="signature-form"><label>브랜드 디자인<select id="signature-preset"></select></label><div class="signature-fonts"><label>제목 서체<select id="signature-title-font"><option value="Studio Serif">Noto Serif KR · 명조</option><option value="Studio Sans">Noto Sans KR · 고딕</option></select></label><label>정보 서체<select id="signature-body-font"><option value="Studio Sans">Noto Sans KR · 고딕</option><option value="Studio Serif">Noto Serif KR · 명조</option></select></label></div><p class="hint">Noto Serif KR / Noto Sans KR · SIL Open Font License · 기기에 다운로드해 렌더링합니다.</p><div id="signature-colors"></div><div class="signature-fonts"><label>제목 크기<input id="signature-title-size" type="number" min="42" max="76"></label><label>행간<input id="signature-leading" type="number" min="1.2" max="1.6" step=".05"></label><label>기준 여백<input id="signature-margin" type="number" min="48" max="88"></label><label>사진 배치<select id="signature-fit"><option value="contain">원본 전체 보존</option><option value="cover">초점 중심으로 채우기</option></select></label><label>글 배치<select id="signature-placement"><option value="caption">사진 아래 캡션</option><option value="header">사진 위 여백</option></select></label></div><div id="signature-toggles"></div><label class="checkline"><input id="signature-apply-current" type="checkbox" checked>현재 현장에도 이 버전을 명시적으로 적용</label><div class="toolbar"><button type="submit" class="primary">기본 디자인으로 저장</button><button type="button" id="signature-restore">이전 기본 설정 복원</button><button type="button" id="signature-project-restore">이 현장 이전 디자인 복원</button><button type="button" id="signature-export">설정 JSON 내보내기</button><label class="signature-file">설정 가져오기<input type="file" id="signature-import" accept="application/json,.json"></label></div><p id="signature-status" role="status"></p></form><div><div class="signature-preview-heading"><h3>같은 현장으로 비교</h3><button id="signature-preview" type="button">미리보기 갱신</button></div><p class="hint">설정 비교용입니다. 저장하기 전까지 현장의 디자인이나 문구는 바뀌지 않습니다.</p><div id="signature-proofs"></div></div></div>`;
$('studio').before(section);
const nav=node('button','브랜드 디자인 설정');nav.type='button';document.querySelector('aside nav').append(nav);nav.onclick=()=>{document.querySelectorAll('.panel').forEach(p=>p.hidden=true);section.hidden=false;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.remove('active'));fill(defaultConfig());previews();};
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>{section.hidden=true;previewRevision++;for(const c of $('signature-proofs').querySelectorAll('canvas'))releaseCanvas(c);$('signature-proofs').replaceChildren();});
const daily=node('div',undefined,'signature-daily'),badge=node('span');daily.append(badge);const open=node('button','브랜드 디자인 설정');open.type='button';open.onclick=()=>nav.click();daily.append(open);$('production-platforms').before(daily);
for(const id of Core.IDS)$('signature-preset').add(new Option(names[id],id));
for(const [key,label]of Object.entries({paper:'아이보리',stone:'스톤 그레이',ink:'딥 차콜',accent:'우드 브라운'})){const l=node('label',label),input=node('input');input.type='color';input.id='signature-color-'+key;l.append(input);$('signature-colors').append(l);}
for(const [key,label]of Object.entries({logo:'원본 로고',site:'현장 정보',product:'시공 제품',spec:'제품 규격',brands:'정보 카드에 취급 브랜드 안내'})){const l=node('label',label,'checkline'),input=node('input');input.type='checkbox';input.id='signature-show-'+key;l.prepend(input);$('signature-toggles').append(l);}
function fill(cfg){settingsDraft=Core.copy(cfg);$('signature-preset').value=cfg.id;for(const k of ['title','body'])$('signature-'+k+'-font').value=cfg.type[k];for(const k of Object.keys(cfg.palette))$('signature-color-'+k).value=cfg.palette[k];for(const k of Object.keys(cfg.show))$('signature-show-'+k).checked=cfg.show[k];$('signature-title-size').value=cfg.type.titleSize;$('signature-leading').value=cfg.type.leading;$('signature-margin').value=cfg.layout.margin;$('signature-fit').value=cfg.layout.fit;$('signature-placement').value=cfg.layout.placement;}
function read(){const cfg=Core.copy(settingsDraft);cfg.id=$('signature-preset').value;for(const k of ['title','body'])cfg.type[k]=$('signature-'+k+'-font').value;for(const k of Object.keys(cfg.palette))cfg.palette[k]=$('signature-color-'+k).value;for(const k of Object.keys(cfg.show))cfg.show[k]=$('signature-show-'+k).checked;cfg.type.titleSize=Number($('signature-title-size').value);cfg.type.minTitle=Math.min(cfg.type.minTitle,cfg.type.titleSize);cfg.type.leading=Number($('signature-leading').value);cfg.layout.margin=Number($('signature-margin').value);cfg.layout.fit=$('signature-fit').value;cfg.layout.placement=$('signature-placement').value;return Core.validate(cfg);}
$('signature-preset').onchange=()=>{const cfg=read();cfg.id=$('signature-preset').value;fill(cfg);};
let proofQueue=Promise.resolve();
function previews(){const rev=++previewRevision;proofQueue=proofQueue.catch(()=>{}).then(()=>rev===previewRevision?drawPreviews(rev):undefined);return proofQueue;}
async function drawPreviews(rev){
 const host=$('signature-proofs');for(const c of host.querySelectorAll('canvas'))releaseCanvas(c);host.replaceChildren();
 if(!state.photos.length){host.append(node('p','현장 사진을 불러오면 세 디자인을 같은 사진으로 비교합니다.'));return;}
 try{const base=read(),ctx=context(),slot=(state.signatureSequence||Core.plan(ctx.photos,ctx.bindings,ctx))[0];for(const id of Core.IDS){const cfg={...base,id},article=node('article');article.append(node('h4',names[id]));host.append(article);const c=await renderSignature(cfg,ctx,slot,0,'carousel',async(pid,max)=>{const p=state.photos.find(p=>p.id===pid);const image=await photoImage(p),was=original;original=false;try{return transformed(image,p.adjust,max);}finally{original=was;}},{maxEdge:720});if(rev!==previewRevision){releaseCanvas(c);return;}article.append(c);}}catch(e){$('signature-status').textContent=e.message;}
}
$('signature-preview').onclick=previews;
function projectDesignBackup(){const data={photoIds:state.photos.map(p=>p.id)};for(const k of ['signatureDesign','signatureSequence','signaturePhotos','signatureProjectProduct','signatureProductSourceKey','signatureEditedCaptions','signatureAutoTitles','brandOutput','brandSlides','brandCaptions','slideCount'])if(state[k]!==undefined)data[k]=Core.copy(state[k]);return data;}
function saveDefault(cfg,apply){const wasActive=active(),p=profile();if(apply&&!wasActive&&state.photos.length)state.signatureEditedCaptions=Object.fromEntries(Object.keys(state.brandCaptions||{}).map(k=>[k,true]));p.history.push(Core.copy(p.current));if(p.history.length>12)p.history.shift();cfg.revision=p.current.revision+1;p.current=Core.validate(cfg);if(apply){state.signatureDesignHistory??=[];state.signatureDesignHistory.push(projectDesignBackup());if(state.signatureDesignHistory.length>6)state.signatureDesignHistory.shift();state.signatureDesign=Core.copy(p.current);if(!state.signatureSequence)buildSequence(true);}persist();ensure();window.renderProductionWorkspace();$('signature-status').textContent='저장했습니다. 새 현장은 이 디자인을 사용하며 이전 현장의 버전은 유지합니다.';}
$('signature-form').onsubmit=e=>{e.preventDefault();try{saveDefault(read(),$('signature-apply-current').checked);previews();}catch(err){$('signature-status').textContent=err.message;}};
$('signature-restore').onclick=()=>{const p=profile();if(!p.history.length)return $('signature-status').textContent='이전 설정이 없습니다.';const previous=p.history.pop();p.current=Core.validate(previous);fill(p.current);persist();$('signature-status').textContent='이전 기본 설정을 복원했습니다. 기존 프로젝트에는 자동 적용하지 않습니다.';previews();};
$('signature-project-restore').onclick=()=>{const previous=state.signatureDesignHistory?.at(-1);if(!previous)return $('signature-status').textContent='이 현장의 이전 디자인이 없습니다.';if(JSON.stringify(previous.photoIds)!==JSON.stringify(state.photos.map(p=>p.id)))return $('signature-status').textContent='사진 구성이 달라 현재 작업을 유지했습니다. 보관함의 이전 현장을 열어 주세요.';const now=projectDesignBackup();state.signatureDesignHistory.pop();for(const k of ['signatureDesign','signatureSequence','signaturePhotos','signatureProjectProduct','signatureProductSourceKey','signatureEditedCaptions','signatureAutoTitles','brandOutput','brandSlides','brandCaptions','slideCount']){if(previous[k]===undefined)delete state[k];else state[k]=Core.copy(previous[k]);}state.signatureDesignHistory.push(now);state.signatureCaptionKey='';persist();window.renderProductionWorkspace();$('signature-status').textContent='현장의 이전 디자인과 당시 문구를 복원했습니다. 기본 디자인은 유지합니다.';};
$('signature-export').onclick=()=>{try{download(new Blob([JSON.stringify(read(),null,2)],{type:'application/json'}),'cheonginmaru-signature-v1.json');}catch(e){$('signature-status').textContent=e.message;}};
$('signature-import').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>50000)throw Error('설정 파일은 50KB 이하로 선택하세요.');fill(Core.validate(JSON.parse(await f.text())));$('signature-status').textContent='설정 초안을 불러왔습니다. 저장하기 전까지 적용하지 않습니다.';previews();}catch(err){$('signature-status').textContent='가져오기 실패: '+err.message;}finally{e.target.value='';}};
const bindingsDrawer=node('details',undefined,'signature-bindings');bindingsDrawer.innerHTML='<summary>사진별 역할 · 시공 제품 확인</summary><p class="hint">역할 자동 제안은 파일명 기준입니다. 사진으로 제품을 추측하지 않습니다. 확인한 구역·제품만 연결하세요.</p><div id="signature-bindings-list"></div><button type="button" id="signature-replan">제공한 사진으로 구성 다시 추천</button>';$('production-preview').after(bindingsDrawer);
bindingsDrawer.addEventListener('toggle',()=>{if(bindingsDrawer.open){photoUI='';refreshBindings();}});
$('signature-replan').onclick=()=>{if(!active())return toast('브랜드 디자인 설정에서 현재 현장에 적용해 주세요.');buildSequence(false);persist();window.renderProductionWorkspace();};
function refreshBindings(){
 bindingsDrawer.hidden=!active();if(!active()||!bindingsDrawer.open)return;
 const key=JSON.stringify({photos:state.photos.map(p=>[p.id,p.thumbnail]),bindings:state.signaturePhotos,catalog:state.catalog.map(p=>[p.id,p.variants?.length]),project:state.projectId});if(key===photoUI)return;photoUI=key;
 const list=$('signature-bindings-list');list.replaceChildren();
 const sharedList=node('datalist');sharedList.id='signature-product-options';list.append(sharedList);
 const catalogOptions=[];for(const base of state.catalog){catalogOptions.push([base.id,Writer.label(base)]);for(const v of base.variants||[]){const p=Writer.resolveProduct(state.catalog,base.id+'::'+v.id);if(p)catalogOptions.push([p.id,Writer.label(p)]);}}
 for(const [id,label]of catalogOptions){const option=node('option');option.value=label;option.label=id;sharedList.append(option);}
 for(const p of state.photos){
  const b=state.signaturePhotos?.[p.id]||{role:Core.infer(p.name,p.sourceWidth,p.sourceHeight),area:'',productKey:'',note:'',source:'filename'},row=node('div',undefined,'signature-photo-row'),image=node('img');image.alt='';image.src=p.thumbnail||'';image.loading='lazy';image.width=72;image.height=54;
  const fields=node('div'),heading=node('strong',p.name),role=node('select');role.setAttribute('aria-label',p.name+' 사진 역할');for(const [id,label]of [['unknown','확인 전'],['before','시공 전'],['after','시공 후'],['detail','디테일'],['product','제품·샘플'],['progress','시공 중'],['pair','전후 합성본 · 좌우']])role.add(new Option(label,id));role.value=b.role||'unknown';
  const area=node('input');area.value=b.area||'';area.placeholder='시공 구역 · 예: 거실';area.maxLength=80;area.setAttribute('aria-label',p.name+' 시공 구역');
  const product=node('input');product.setAttribute('list',sharedList.id);product.setAttribute('aria-label',p.name+' 시공 제품');product.placeholder='현장 기본 제품 사용 · 검색하여 변경';product.value=b.productKey?catalogOptions.find(x=>x[0]===b.productKey)?.[1]||b.productSnapshot?.model||b.productKey:'';
  const note=node('input');note.value=b.note||'';note.placeholder='확인한 사진 특징 · 선택 입력';note.maxLength=100;note.setAttribute('aria-label',p.name+' 확인한 특징');
  const save=()=>{const text=product.value.trim(),matches=catalogOptions.filter(x=>x[1]===text||x[0]===text);if(text&&matches.length!==1)return toast('제품 도감의 정확한 모델을 선택하세요. 같은 이름은 제품 ID로 구분할 수 있습니다.');state.signaturePhotos??={};const productKey=matches[0]?.[0]||'';state.signaturePhotos[p.id]={role:role.value,area:area.value.trim(),note:note.value.trim(),productKey,productSnapshot:productKey?Core.product(Writer.resolveProduct(state.catalog,productKey)):null,source:'confirmed'};buildSequence(true);persist();window.renderProductionWorkspace();};
  for(const el of [role,area,product,note])el.onchange=save;
  fields.append(heading,role,area,product,note);row.append(image,fields);list.append(row);
 }
}
const projectLink=node('div',undefined,'signature-project-link');projectLink.innerHTML='<label>현장 선택 · 등록 정보 연결<select id="signature-project-link"><option value="">현재 현장 정보 사용</option></select></label><p class="hint">마케팅 보관함의 현장·자재 정보만 연결합니다. 올린 사진은 유지합니다. 제품 정보는 등록된 현장과 제품 도감에서만 연결합니다.</p>';$('package-drop').after(projectLink);
function refreshProjects(){const key=JSON.stringify([state.projectId,state.linkedMarketingProject,state.projectIndex?.map(p=>[p.id,p.title])]);if(key===lastUI)return;lastUI=key;const select=$('signature-project-link'),value=select.value;select.replaceChildren(new Option('현재 현장 정보 사용',''));for(const p of state.projectIndex||[])if(p.id!==state.projectId)select.add(new Option(p.title||p.number,p.id));select.value=state.linkedMarketingProject||value;}
$('signature-project-link').onchange=async e=>{
 if(!e.target.value)return;
 try{const saved=await dbGet('project:'+e.target.value);if(!saved)throw Error('보관한 현장이 없습니다.');const info=Core.publicSite(saved);state.linkedMarketingProject=info.id;state.marketingSite=info.site;state.region=info.region;state.space=info.space;state.siteStage=info.stage;state.authoring.memo=info.memo;state.authoring.works=info.works;
 let product=saved.signatureProjectProduct||Writer.resolveProduct(saved.catalog||[],saved.authoring?.productKey||'');if(!product&&saved.brandOutput?.product)product={id:'project:'+info.id,model:saved.brandOutput.product,size:saved.brandOutput.size||''};state.signatureProjectProduct=Core.product(product);if(state.signatureProjectProduct){state.authoring.productKey=saved.authoring?.productKey||'';state.brandOutput={...brandSettings(),product:[product.brand,product.model,product.color].filter(Boolean).join(' '),size:product.size||''};$('quick-product').value=state.authoring.productKey;}state.signatureProductSourceKey=JSON.stringify([state.authoring?.productKey,brandSettings().product,brandSettings().size]);if(active())buildSequence(false);await generateWriting(false);persist();window.renderProductionWorkspace();toast('현장과 제품 정보를 연결했습니다. 사진은 유지했습니다.');}catch(err){toast(err.message);}
};
for(const id of ['quick-product','engine-product','brand-product','brand-size'])$(id)?.addEventListener('change',()=>{if(!active())return;state.signatureProjectProduct=projectProduct();buildSequence(true);persist();window.renderProductionWorkspace();});
const oldCampaignAllowed=canUseBrandCampaign;canUseBrandCampaign=function(){return active()?false:oldCampaignAllowed();};window.canUseBrandCampaign=canUseBrandCampaign;
$('brand-caption').addEventListener('change',()=>{if(active()){state.signatureEditedCaptions??={};state.signatureEditedCaptions[state.format]=true;persist();}});
const baseValidate=validate;
validate=function(s){baseValidate(s);if(s.signatureDesign?.schema)Core.validate(s.signatureDesign);if(s.settings?.brandDesign){Core.validate(s.settings.brandDesign.current);for(const c of s.settings.brandDesign.history||[])Core.validate(c);}if(s.signatureSequence&&(!Array.isArray(s.signatureSequence)||s.signatureSequence.length>16||s.signatureSequence.some(slot=>!Array.isArray(slot.photoIds)||slot.photoIds.some(id=>typeof id!=='string'))))throw Error('사진 구성 형식 오류');return s;};
const originalKit=currentBrandKit;
currentBrandKit=function(){const kit=originalKit();if(active()){kit.signaturePackage={design:Core.copy(state.signatureDesign),project:Core.publicSite(state),products:context().products,photos:state.photos.map(p=>({name:p.name,binding:Core.copy(state.signaturePhotos?.[p.id]||{}),product:photoProduct(p.id)})),sequence:state.signatureSequence.map(s=>({...s,photoNames:s.photoIds.map(id=>state.photos.find(p=>p.id===id)?.name||'')}))};}return kit;};
window.signatureImportPackage=function(pack){
 if(!pack)return;state.signatureDesign=Core.validate(pack.design);state.signaturePhotos={};for(const item of pack.photos||[]){const p=ProductionCore.matchPhoto(item.name,state.photos);if(p)state.signaturePhotos[p.id]={...item.binding,productSnapshot:Core.product(item.product)};}
 const info=pack.project||{};state.marketingSite=String(info.site||'');state.region=String(info.region||'');state.space=String(info.space||'');state.siteStage=String(info.stage||'unknown');
 state.signatureSequence=(pack.sequence||[]).map(s=>({...s,photoIds:s.photoNames.map(name=>ProductionCore.matchPhoto(name,state.photos)?.id).filter(Boolean)}));if(!state.signatureSequence.length)buildSequence(true);else state.slideCount=state.signatureSequence.length;
};
const originalPhotoProduct=photoProduct;
// Product snapshots take precedence over later edits to the shared catalogue.
photoProduct=function(id){const b=state.signaturePhotos?.[id];if(b?.productSnapshot)return Core.product(b.productSnapshot);if(b?.productKey)return originalPhotoProduct(id);return state.signatureProjectProduct!==undefined?Core.product(state.signatureProjectProduct):projectProduct();};
const boot=setInterval(async()=>{
 if(!workflowReady||!easyReady||!writingReady||ready)return;clearInterval(boot);
 try{const keys=await new Promise((res,rej)=>{const r=db.transaction('projects').objectStore('projects').getAllKeys();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});known=new Set(keys.filter(k=>String(k).startsWith('project:')).map(k=>String(k).slice(8)));if(state.photos.length)known.add(state.projectId);for(const p of state.projectIndex||[])known.add(p.id);
 if(!state.settings?.brandDesign){await dbPut('pre-signature-v1:'+Date.now(),state);profile();}ready=true;window.signatureReady=true;ensure();fill(defaultConfig());persist();window.renderProductionWorkspace();
 }catch(e){$('signature-status').textContent='브랜드 설정 초기화 실패 · '+e.message;}
},100);
})();
