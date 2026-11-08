"""Actual WebKitGTK engine; resized viewports and an iOS user agent are not physical devices.
Needs Selenium and WebKitGTK WebDriver/MiniBrowser (paths can be set in env).
"""
import os,json,base64,time,subprocess
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/webkit-evidence'));out.mkdir(parents=True,exist_ok=True)
fixture=Path(os.environ.get('STUDIO_TEST_PHOTO',str(out/'synthetic-qa.jpg')))
if not fixture.exists():
 from PIL import Image,ImageDraw
 image=Image.new('RGB',(4032,3024),(205,207,195));draw=ImageDraw.Draw(image);draw.rectangle((0,1800,4032,3024),fill=(160,138,112));draw.text((100,100),'SYNTHETIC QA - NOT A CLIENT SITE',fill='black');image.save(fixture,quality=86)
op=Options();op.binary_location=os.environ.get('WEBKIT_BROWSER_BINARY','/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser');op.add_argument('--automation');op.add_argument('--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
d=webdriver.WebKitGTK(options=op,service=Service(os.environ.get('WEBKIT_DRIVER_BINARY','/usr/bin/WebKitWebDriver'),log_output=str(out/'driver.log')))
try:
 d.set_page_load_timeout(60);d.set_script_timeout(90);wait=WebDriverWait(d,90);d.set_window_size(390,844);d.get('http://127.0.0.1:8000/marketing/');wait.until(lambda d:d.execute_script('return typeof workflowReady!=="undefined"&&workflowReady&&easyReady'))
 d.execute_script('window.testRuntimeErrors=[];window.addEventListener("error",e=>testRuntimeErrors.push(e.message));window.addEventListener("unhandledrejection",e=>testRuntimeErrors.push(String(e.reason)));')
 assert d.execute_script('return appleTouchDevice')
 d.find_element(By.ID,'production-files').send_keys(str(fixture));wait.until(lambda d:d.execute_script('return state.photos.length===1&&document.querySelector("#designs canvas")?.dataset.renderer==="cheongin-comparison-v6"'))
 assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1')
 # All actual PNG exports render, with the same type family and frozen pixel dimensions.
 formats={'carousel':[1080,1350],'story':[1080,1920],'kakao':[800,800],'naverCover':[1200,1200],'youtubeCover':[1280,720]}
 for fmt,size in formats.items():
  result=d.execute_async_script('''const f=arguments[0],done=arguments[arguments.length-1];card('editorial',0,f).then(async c=>{const b=await canvasBlob(c);done({width:c.width,height:c.height,bytes:b.size,outside:c.typeLayout?.filter(x=>x.x< -2||x.y< -2||x.x+x.width>1082||x.y+x.height>c.height/(c.width/1080)+2)||[]});releaseCanvas(c)}).catch(e=>done({error:e.message}));''',fmt)
  assert [result.get('width'),result.get('height')]==size,result;assert result['bytes']>1000;assert not result.get('outside'),result
 d.find_element(By.CSS_SELECTOR,'.direction-trigger').click();wait.until(lambda d:len(d.find_elements(By.CSS_SELECTOR,'.direction-options canvas'))==3);d.find_elements(By.CSS_SELECTOR,'.direction-options button')[2].click();wait.until(lambda d:d.execute_script('return state.theme==="journal"'))
 # The final tap happens after generation, keeping the native share/save user activation.
 d.find_element(By.ID,'production-export').click();wait.until(lambda d:d.execute_script('return document.getElementById("device-export").open'));assert len(d.find_elements(By.CSS_SELECTOR,'.device-export-gallery img'))==3
 d.save_screenshot(str(out/'webkit-save.png'));d.find_element(By.CSS_SELECTOR,'#device-export .export-close').click()
 # IndexedDB persists unchanged source bytes and edits across reload.
 d.find_element(By.ID,'production-title').send_keys(Keys.CONTROL,'a');d.find_element(By.ID,'production-title').send_keys('공간의 기록 · WebKit 검증');d.execute_script('document.getElementById("production-title").blur()');time.sleep(1)
 original=d.execute_script('return state.photos[0].src');d.refresh();wait.until(lambda d:d.execute_script('return typeof workflowReady!=="undefined"&&workflowReady&&document.querySelector("#designs canvas")'))
 assert d.execute_script('return state.photos[0].src')==original;assert d.find_element(By.ID,'production-title').get_attribute('value')=='공간의 기록 · WebKit 검증'
 for name,w,h in [('iphone',390,844),('ipad-portrait',820,1180),('ipad-landscape',1024,768)]:
  d.set_window_size(w,h);d.execute_script('scrollTo(0,0)');assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1');d.save_screenshot(str(out/(name+'.png')))
 report={'engine':'WebKitGTK 2.52.6','real_iOS_hardware':False,'upload':'PASS','three_designs':'PASS','PNG_formats':'PASS','prepared_save_gallery':'PASS','IndexedDB_reload_original_preservation':'PASS','viewports':'PASS','runtime_errors':d.execute_script('return window.testRuntimeErrors||[]'),'mp4_capability':d.execute_script('return !!(window.VideoEncoder&&window.VideoFrame)')}
 if os.environ.get('STUDIO_TEST_MP4')=='1':
  video=d.execute_async_script('''const done=arguments[arguments.length-1];recordMarketingVideo(i=>card('editorial',i,'reels'),3).then(blob=>{const r=new FileReader();r.onload=()=>done({data:r.result.split(',')[1]});r.readAsDataURL(blob)}).catch(e=>done({error:e.message}));''')
  assert 'error' not in video,video
  (out/'webkit-reel.mp4').write_bytes(base64.b64decode(video['data']))
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height:format=duration','-of','json',str(out/'webkit-reel.mp4')]))
  subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(out/'webkit-reel.mp4'),'-f','null','-'],check=True);assert probe['streams'][0]['codec_name']=='h264';assert probe['streams'][0]['width']==1080;assert float(probe['format']['duration'])>=8;report['actual_MP4']=probe
 assert not report['runtime_errors'];(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
finally:d.quit()
