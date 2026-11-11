/* Versioned, deterministic brand rules. No photo recognition or product inference. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SignatureCore=factory();})(globalThis,function(){
'use strict';
const IDS=['editorial-studio','modern-gallery','material-journal'];
const PLATFORMS={carousel:{width:1080,height:1350},reels:{width:1080,height:1920},story:{width:1080,height:1920},naver:{width:1600,natural:true},naverCover:{width:1200,height:1200},kakao:{width:800,height:800},kakaoWide:{width:800,height:600},shorts:{width:1080,height:1920},youtube:{width:1080,height:1080},youtubeCover:{width:1280,height:720}};
const copy=v=>JSON.parse(JSON.stringify(v));
function create(id='editorial-studio',version=2){
 if(!IDS.includes(id))throw Error('지원하지 않는 디자인 ID입니다.');
 return {schema:'cheonginmaru-signature-v1',id,version,revision:1,palette:version===1?{paper:'#F5F3ED',stone:'#D9D6CE',ink:'#34342F',accent:'#A38A70'}:{paper:'#F5F3ED',stone:'#FAF9F6',ink:'#292B28',accent:'#967F69'},type:{title:'Studio Serif',body:'Studio Sans',titleSize:58,minTitle:42,bodySize:28,minBody:24,leading:1.35},layout:{margin:64,gap:24,fit:version===1?'contain':'smart',placement:'caption'},show:{logo:true,site:true,product:true,spec:true,brands:false},platforms:copy(PLATFORMS),...(version===2?{tokens:{canvasWidth:1080,canvasHeight:1350,safeMargin:64,logoSize:128,logoPosition:'top-left',titleFont:'Studio Serif',titleSize:58,titleLineHeight:1.35,titleMaxLines:2,metadataFont:'Studio Sans',metadataSize:28,metadataGap:24,overlayStrength:.32,imageFocusX:.5,imageFocusY:.68,zoom:1,panX:0,panY:0,textPosition:'bottom',cropLimit:.35,logoOpacity:.9}}:{})};
}
function validate(raw){
 if(!raw||raw.schema!=='cheonginmaru-signature-v1'||![1,2].includes(raw.version)||!IDS.includes(raw.id))throw Error('지원하는 시그니처 설정 파일(v1/v2)이 아닙니다.');
 const c=create(raw.id,raw.version);c.revision=Number.isInteger(raw.revision)&&raw.revision>0?raw.revision:1;
 for(const key of Object.keys(c.palette)){if(!/^#[0-9a-f]{6}$/i.test(raw.palette?.[key]||''))throw Error('팔레트 색상은 #RRGGBB 형식이어야 합니다.');c.palette[key]=raw.palette[key];}
 const luminance=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 for(const bg of [c.palette.paper,c.palette.stone]){const a=luminance(bg),b=luminance(c.palette.ink);if((Math.max(a,b)+.05)/(Math.min(a,b)+.05)<4.5)throw Error('바탕과 글자 색의 대비를 충분히 설정하세요.');}
 for(const key of ['title','body']){if(!['Studio Serif','Studio Sans','Pretendard'].includes(raw.type?.[key]))throw Error('라이선스를 확인한 기본 서체를 선택하세요.');c.type[key]=raw.type[key];}
 for(const [key,min,max]of [['titleSize',42,76],['minTitle',36,42],['bodySize',26,36],['minBody',24,28],['leading',1.2,1.6]]){const v=raw.type?.[key];if(!Number.isFinite(v)||v<min||v>max)throw Error('타이포그래피 범위를 확인하세요: '+key);c.type[key]=v;}
 if(c.type.minTitle>c.type.titleSize||c.type.minBody>c.type.bodySize)throw Error('최소 글자 크기는 기본 크기보다 클 수 없습니다.');
 for(const [key,min,max]of [['margin',48,88],['gap',16,40]]){const v=raw.layout?.[key];if(!Number.isFinite(v)||v<min||v>max)throw Error('여백 범위를 확인하세요.');c.layout[key]=v;}
 if(!(raw.version===2?['smart','contain','cover']:['contain','cover']).includes(raw.layout?.fit)||!['caption','header'].includes(raw.layout?.placement))throw Error('사진 배치 규칙을 확인하세요.');
 c.layout.fit=raw.layout.fit;c.layout.placement=raw.layout.placement;
 for(const key of Object.keys(c.show)){if(typeof raw.show?.[key]!=='boolean')throw Error('정보 표시 설정을 확인하세요.');c.show[key]=raw.show[key];}
 // Export dimensions are part of renderer v1; reject incompatible rules instead of silently stretching.
 if(!raw.platforms||Object.keys(raw.platforms).length!==Object.keys(c.platforms).length||Object.entries(c.platforms).some(([key,rule])=>Object.entries(rule).some(([k,v])=>raw.platforms[key]?.[k]!==v)))throw Error('플랫폼 규격은 시그니처 v1 고정 규격과 일치해야 합니다.');
 if(raw.version===2){
  const t=raw.tokens||{};
  for(const [key,min,max]of [['logoSize',96,160],['overlayStrength',0,.7],['imageFocusX',0,1],['imageFocusY',0,1],['zoom',.8,1.3],['panX',-.2,.2],['panY',-.2,.2],['cropLimit',.1,.5],['logoOpacity',.5,1]]){if(!Number.isFinite(t[key])||t[key]<min||t[key]>max)throw Error('사진 중심 토큰 범위를 확인하세요: '+key);c.tokens[key]=t[key];}
  if(t.logoPosition!=='top-left'||!['bottom','top','caption'].includes(t.textPosition))throw Error('고정된 로고·텍스트 위치를 선택하세요.');c.tokens.textPosition=t.textPosition;
  Object.assign(c.tokens,{safeMargin:c.layout.margin,titleFont:c.type.title,titleSize:c.type.titleSize,titleLineHeight:c.type.leading,metadataFont:c.type.body,metadataSize:c.type.bodySize});
 }
 if(raw.archiveVersion!==undefined){if(raw.archiveVersion!==1||raw.version!==2)throw Error('지원하지 않는 아카이브 디자인입니다.');c.archiveVersion=1;}
 return c;
}
function product(p){if(!p)return null;const out={};for(const k of ['id','type','brand','category','model','color','size','pack','coverage','material'])out[k]=String(p[k]||'').trim().slice(0,2000);if(!out.model||out.id.startsWith('category:')||out.id==='unconfirmed')return null;return out;}
function infer(name,width=0,height=0){if(/before[_-]?after|전후|비교/i.test(name)&&width/height>1.4)return 'pair';if(/(?:^|[_\s-])before(?:[_.\s-]|$)|시공[_ ]?전|철거전/i.test(name))return 'before';if(/(?:^|[_\s-])after(?:[_.\s-]|$)|시공[_ ]?후|완공/i.test(name))return 'after';if(/detail|디테일|걸레받이|문틀|마감/i.test(name))return 'detail';if(/product|제품|샘플/i.test(name))return 'product';if(/progress|공정|시공중/i.test(name))return 'progress';return 'unknown';}
function plan(photos,bindings={},context={}){
 if(!photos.length)return [];
 const quality=(a,b)=>Number(!!a.duplicate)-Number(!!b.duplicate)||(b.score||0)-(a.score||0);
 const meta=p=>bindings[p.id]||{},before=photos.find(p=>meta(p).role==='before'),after=photos.filter(p=>meta(p).role==='after').sort(quality)[0],pair=photos.find(p=>meta(p).role==='pair');
 const used=new Set(),slots=[],title=(p,fallback)=>meta(p).note||[meta(p).area,fallback].filter(Boolean).join(' · ');
 const add=(role,ps,label)=>{ps.forEach(p=>used.add(p.id));slots.push({role,photoIds:ps.map(p=>p.id),title:ps.length===1?title(ps[0],label):label});};
 if(photos.length<=2&&(pair||(before&&after))){add('comparison',pair?[pair]:[before,after],'시공 전과 후');}
 else{
  const cover=after||photos.filter(p=>meta(p).role!=='before'&&p!==pair).sort(quality)[0]||photos[0];add('cover',[cover],context.stage==='complete'?'완성된 공간의 기록':'현장과 소재의 기록');
  if(pair&&pair!==cover)add('comparison',[pair],'시공 전과 후');else if(before&&after)add('comparison',[before,after],'시공 전과 후');
 }
 const remaining=photos.filter(p=>!used.has(p.id));
 const take=(predicate,role,label)=>{const i=remaining.findIndex(predicate);if(i<0)return;const [p]=remaining.splice(i,1);add(role,[p],label);};
 if(slots.length===1&&remaining.length)take(()=>true,'view','현장 사진');
 if(slots.length<3&&remaining.length)take(p=>!['detail','product'].includes(meta(p).role),'space',context.stage==='complete'?'완성 공간':'현장 모습');
 if(slots.length<4&&remaining.some(p=>meta(p).role==='detail'))take(p=>meta(p).role==='detail','detail','시공 디테일');
 while(remaining.length&&slots.length<5)take(()=>true,'view','다른 시점의 현장');
 for(let page=0;page<Math.max(1,Math.ceil((context.materialCount||1)/2));page++)slots.push({role:'information',photoIds:[],title:'현장과 제품 정보',productPage:page});return slots;
}
function publicSite(s){return {id:String(s.projectId||''),site:String(s.marketingSite||s.title||s.authoring?.site||''),region:String(s.region||''),space:String(s.space||''),stage:String(s.siteStage||'unknown'),memo:String(s.authoring?.memo||s.memo||''),works:Array.isArray(s.authoring?.works)?s.authoring.works.slice():[]};}
return {IDS,PLATFORMS,create,validate,product,infer,plan,publicSite,copy};
});
