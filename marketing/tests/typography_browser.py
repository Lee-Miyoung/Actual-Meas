"""Actual font metrics: headlines, logos and facts must fit without collisions."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from legacy_fixture import png
import base64,json,os
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/typography-evidence'));out.mkdir(parents=True,exist_ok=True)
photo=out/'synthetic-room.png';photo.write_bytes(base64.b64decode(png(0).split(',',1)[1]))
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);a=b.new_page(viewport={'width':1440,'height':1050});a.on('dialog',lambda d:d.accept());errors=[];a.on('pageerror',lambda e:errors.append(str(e)))
 a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&typeof CheonginType!=="undefined"');a.locator('#production-files').set_input_files(str(photo));a.wait_for_function('state.photos.length===1&&state.brandStoryMode==="auto"',timeout=60000)
 results=a.evaluate('''async()=>{
 const failures=[],report=[];
 for(const theme of ['editorial','gallery','journal'])for(const format of ['carousel','story','kakao','naverCover','youtubeCover','blog'])for(let i=0;i<5;i++){
   const draft=structuredClone(brandCampaignFor(theme));draft.product={...draft.product,brand:'한솔홈데코',model:'스킨마루165',size:'165 × 1205 × 7.2T',color:'조슈아 내추럴'};
   const image=await photoImage(state.photos[0]);const c=await renderPlatformDesign({...draft,theme},image,i,format),h=c.height/(c.width/1080),boxes=c.typeLayout;
   const id=theme+'/'+format+'/'+i;
   for(const box of boxes)if(box.x< -2||box.y< -2||box.x+box.width>1082||box.y+box.height>h+2)failures.push({id,reason:'outside',box});
   for(let x=0;x<boxes.length;x++)for(let y=x+1;y<boxes.length;y++){
    const a=boxes[x],b=boxes[y],ix=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),iy=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
    if(ix>2&&iy>2)failures.push({id,reason:'collision',a,b});
   }
   report.push({id,textBoxes:boxes.length,truncated:c.dataset.textTruncated==='true'});releaseCanvas(c);
 }
 const image=await photoImage(state.photos[0]);
 for(const format of ['carousel','story','kakao','blog']){
   const c=await renderPlatformDesign({theme:'editorial',title:'가구를 고르기 전 우리 집에 어울리는 소재를 천천히 살펴보는 일 '.repeat(5),carousel:[{text:'우리 집의 분위기와 함께 고르는 아주 긴 제목 '.repeat(8)}],product:{model:'원목마루 스페셜 에디션 1900',size:'190 × 1900 × 15T'}},image,0,format);
   if(!c.dataset.textTruncated)failures.push({reason:'long-copy-not-signalled',format});
   if(c.typeLayout.some(b=>b.y+b.height>c.height/(c.width/1080)+2))failures.push({reason:'long-copy-outside',format});releaseCanvas(c);
 }
 return {failures,report};}''')
 (out/'typography-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));assert not results['failures'],json.dumps(results['failures'][:3],ensure_ascii=False)
 assert not errors,errors;b.close();print(json.dumps({'layouts':len(results['report']),'collisions':'PASS','bounds':'PASS','long_copy':'PASS','runtime_errors':errors}))
