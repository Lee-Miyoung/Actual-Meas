"""Signature identity on WebKitGTK, never a claim of physical iPad validation."""
import os,json,time,base64,subprocess
from pathlib import Path
from PIL import Image
from selenium import webdriver
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/signature-webkit'));out.mkdir(parents=True,exist_ok=True)
f=out/'after-qa.jpg';Image.new('RGB',(4032,3024),(200,190,174)).save(f,quality=85)
op=Options();op.binary_location=os.environ['WEBKIT_BROWSER_BINARY'];op.add_argument('--automation');op.add_argument('--user-agent=Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
d=webdriver.WebKitGTK(options=op,service=Service(os.environ['WEBKIT_DRIVER_BINARY'],log_output=str(out/'driver.log')))
try:
 d.set_script_timeout(120);d.set_page_load_timeout(60);d.set_window_size(820,1180);d.get('http://127.0.0.1:8000/marketing/');wait=WebDriverWait(d,90);wait.until(lambda d:d.execute_script('return !!window.signatureReady'))
 d.execute_script('window.testErrors=[];addEventListener("error",e=>testErrors.push(e.message));addEventListener("unhandledrejection",e=>testErrors.push(String(e.reason)));');d.find_element(By.ID,'production-files').send_keys(str(f));wait.until(lambda d:d.execute_script('return state.photos.length===1&&state.slideCount===2&&document.querySelector("#designs canvas")?.dataset.renderer==="cheongin-signature-v1"'));original=d.execute_script('return state.photos[0].src')
 for name,w,h in [('ipad-portrait',820,1180),('ipad-landscape',1180,820),('iphone',390,844)]:
  d.set_window_size(w,h);time.sleep(.2);assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1');d.save_screenshot(str(out/f'{name}.png'))
 result=d.execute_async_script('''const done=arguments[arguments.length-1];(async()=>{const base=card;let active=0,max=0,calls=0;card=async(...a)=>{if(a[4]?.maxEdge){active++;max=Math.max(max,active);calls++;try{return await base(...a);}finally{active--;}}return base(...a);};try{for(let i=0;i<80;i++)document.getElementById('production-next').click();await renderProductionWorkspace();return{max,calls};}finally{card=base;}})().then(done).catch(e=>done({error:e.message}));''');assert result['max']==1 and result['calls']<=3,result
 assert d.execute_script('return window.testErrors||[]')==[]
 d.execute_async_script('''const done=arguments[arguments.length-1];persist();flushPendingSave().then(()=>done(true));''');d.refresh();wait.until(lambda d:d.execute_script('return !!window.signatureReady&&!!document.querySelector("#designs canvas")'));assert d.execute_script('return state.photos[0].src')==original
 d.execute_script('window.testErrors=[];addEventListener("error",e=>testErrors.push(e.message));addEventListener("unhandledrejection",e=>testErrors.push(String(e.reason)));')
 # Actual high resolution platform outputs, with independent portrait / wide grids.
 for fmt,dims in [('carousel',[1080,1350]),('story',[1080,1920]),('youtubeCover',[1280,720])]:
  actual=d.execute_async_script('''const f=arguments[0],done=arguments[arguments.length-1];card('',0,f).then(async c=>{const b=await canvasBlob(c),h=c.height/(c.width/1080);done({width:c.width,height:c.height,bytes:b.size,outside:c.typeLayout.filter(b=>b.x< -2||b.y< -2||b.x+b.width>1082||b.y+b.height>h+2)});releaseCanvas(c);}).catch(e=>done({error:e.message}));''',fmt);assert [actual['width'],actual['height']]==dims,actual;assert actual['bytes']>1000;assert not actual['outside'],actual
 video=d.execute_async_script('''const done=arguments[arguments.length-1];recordMarketingVideo(i=>card('',i,'reels'),2).then(blob=>{const r=new FileReader();r.onload=()=>done({data:r.result.split(',')[1]});r.readAsDataURL(blob);}).catch(e=>done({error:e.message}));''');assert 'error'not in video,video;(out/'reel.mp4').write_bytes(base64.b64decode(video['data']));probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height:format=duration','-of','json',str(out/'reel.mp4')]));subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(out/'reel.mp4'),'-f','null','-'],check=True);assert probe['streams'][0]['codec_name']=='h264';assert float(probe['format']['duration'])>=6
 assert d.execute_script('return window.testErrors||[]')==[];assert d.execute_script('return images.size<=2')
 report={'engine':'WebKitGTK 2.52.6','physical_iPad':'UNVERIFIED','default_signature_reload':'PASS','viewports_rotation':'PASS','rapid_navigation':result,'PNG_platforms':'PASS','H264_MP4_full_decode':probe,'original_bytes':'PASS','working_cache_max_2':'PASS'};(out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
finally:d.quit()
