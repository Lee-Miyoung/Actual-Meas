import os,time,json,base64,subprocess
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait,Select
out=Path('/workspace/unified-studio-review');op=Options();op.binary_location=os.environ['WEBKIT_BROWSER_BINARY'];op.add_argument('--automation');op.add_argument('--user-agent=Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
d=webdriver.WebKitGTK(options=op,service=Service(os.environ['WEBKIT_DRIVER_BINARY'],log_output=str(out/'webkit-driver.log')))
try:
 print('START',flush=True);d.set_script_timeout(180);d.set_window_size(1180,820);d.get('http://127.0.0.1:8000/marketing/');wait=WebDriverWait(d,120);wait.until(lambda d:d.execute_script('return !!window.PhotoLibrary&&!!window.signatureReady'));d.execute_script('window.qaErrors=[];addEventListener("error",e=>qaErrors.push(e.message));addEventListener("unhandledrejection",e=>qaErrors.push(String(e.reason)));document.querySelector("[data-tab=studio]").click();');print('READY',flush=True);paths=[out/f'{i:02d}-{role}.png'for i,role in enumerate(['after','before','progress','detail','exterior','other','after','detail','progress','other'])];d.find_element(By.ID,'scene-files').send_keys('\n'.join(map(str,paths)));WebDriverWait(d,30).until(lambda d:d.execute_script('return state.photos.length===10&&!document.getElementById("scene-files").disabled'))
 print('UPLOADED',flush=True)
 ids=d.execute_script('return state.photos.map(p=>p.id)');original=d.execute_script('return state.photos[0].src');roles=['after','before','progress','detail','exterior','other','after','detail','progress','other']
 for id,role in zip(ids,roles):
  field=d.find_element(By.CSS_SELECTOR,f'.scene-photo[data-photo-id="{id}"] select');d.execute_script('arguments[0].scrollIntoView({block:"center"})',field);Select(field).select_by_value(role)
 assert d.execute_script('return state.signatureSequence.length<=6');d.find_element(By.ID,'scene-files').send_keys(str(paths[0]));wait.until(lambda d:d.execute_script('return !document.getElementById("scene-files").disabled'));assert d.execute_script('return state.photos.length')==10
 print('CLASSIFIED',flush=True)
 result=d.execute_async_script('''const done=arguments[arguments.length-1];UnifiedStudioExport.produce('video').then(async files=>{const blob=files.find(f=>f.name.endsWith('.mp4')).blob,r=new FileReader();r.onload=()=>done({data:r.result.split(',')[1]});r.readAsDataURL(blob);}).catch(e=>done({error:e.message}));''');assert 'error'not in result,result;(out/'webkit-reel-15s.mp4').write_bytes(base64.b64decode(result['data']));probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height:format=duration','-of','json',str(out/'webkit-reel-15s.mp4')]));assert abs(float(probe['format']['duration'])-15)<.05;assert probe['streams'][0]['codec_name']=='h264';subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(out/'webkit-reel-15s.mp4'),'-f','null','-'],check=True)
 d.execute_async_script('const done=arguments[arguments.length-1];persist();flushPendingSave().then(()=>done(true));');d.refresh();wait.until(lambda d:d.execute_script('return !!window.PhotoLibrary&&!!window.signatureReady&&state.photos.length===10'));assert d.execute_script('return state.photos[0].src')==original
 for name,w,h in [('ipad-landscape',1180,820),('ipad-portrait',820,1180),('iphone',390,844)]:
  d.set_window_size(w,h);d.execute_script('document.querySelector("[data-tab=studio]").click();scrollTo(0,0)');time.sleep(.2);assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1');d.save_screenshot(str(out/('webkit-'+name+'.png')))
 report={'engine':'WebKitGTK','physical_iOS':'UNVERIFIED','actual_Nova_photos':'NOT PROVIDED','ten_shared_photos':'PASS','duplicate_skip':'PASS','classification':'PASS','MP4':probe,'original_bytes_reload':'PASS','portrait_landscape_phone_viewports':'PASS','errors':d.execute_script('return window.qaErrors||[]')};assert not report['errors'];(out/'webkit-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
except Exception:
 print('DIAGNOSTICS',d.execute_script('return {photos:state.photos.length,status:document.getElementById("scene-status").textContent,files:[...document.getElementById("scene-files").files].map(f=>({name:f.name,type:f.type,size:f.size})),errors:window.qaErrors}'),flush=True);d.save_screenshot(str(out/'webkit-failure.png'));raise
finally:d.quit()
