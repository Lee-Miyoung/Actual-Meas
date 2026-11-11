"""WebKitGTK engine checks, not a claim of physical iOS device validation."""
import os,time,json,base64
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
out=Path('/workspace/auto-photo-review');out.mkdir(exist_ok=True)
op=Options();op.binary_location=os.environ['WEBKIT_BROWSER_BINARY'];op.add_argument('--automation');op.add_argument('--user-agent=Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
d=webdriver.WebKitGTK(options=op,service=Service(os.environ['WEBKIT_DRIVER_BINARY'],log_output=str(out/'webkit-driver.log')))
try:
 d.set_script_timeout(120);d.set_window_size(820,1180);d.get('http://127.0.0.1:8000/marketing/');wait=WebDriverWait(d,120);wait.until(lambda d:d.execute_script('return !!window.signatureReady'))
 d.execute_script('window.photoErrors=[];addEventListener("error",e=>photoErrors.push(e.message));addEventListener("unhandledrejection",e=>photoErrors.push(String(e.reason)));document.querySelector("[data-tab=studio]").click();')
 d.find_element(By.ID,'ap-files').send_keys(str(out/'synthetic-room.png')+'\n'+str(out/'synthetic-roll.png')+'\n'+str(out/'exif6.jpg'));wait.until(lambda d:d.execute_script('return state.autoPhotoBatch?.items.length===3&&state.autoPhotoBatch.items.every(p=>p.plan)&&!document.getElementById("ap-files").disabled'))
 plans=d.execute_script('return state.autoPhotoBatch.items.map(p=>({rotation:p.plan.rotation,orientation:p.exif.orientation,width:p.width,height:p.height}))');assert abs(plans[1]['rotation']-1)<.15;assert plans[2]['orientation']==6;assert [plans[2]['width'],plans[2]['height']]==[80,120]
 # Verify a lossless full-resolution PNG is produced by this engine, not only a preview.
 result=d.execute_async_script('''const done=arguments[arguments.length-1];(async()=>{const p=state.autoPhotoBatch.items[1],c=await AutoPhotoLab.render(p);const blob=await new Promise(r=>c.toBlob(r,'image/png'));const reader=new FileReader();const result={width:c.width,height:c.height};releaseCanvas(c);reader.onload=()=>done({...result,bytes:blob.size,data:reader.result.split(',')[1]});reader.readAsDataURL(blob);})().catch(e=>done({error:e.message}));''');assert 'error' not in result,result;assert [result['width'],result['height']]==[1000,750];assert result['bytes']>1000;(out/'webkit-corrected.png').write_bytes(base64.b64decode(result.pop('data')))
 d.execute_script('document.querySelector(".auto-photo-item").click();document.getElementById("ap-split").value=30;document.getElementById("ap-split").dispatchEvent(new Event("input"));document.getElementById("ap-approve").click();persist();');assert d.execute_script('return document.getElementById("ap-comparison").style.getPropertyValue("--ap-split")')=='30%'
 d.execute_async_script('const done=arguments[arguments.length-1];flushPendingSave().then(()=>done(true));');d.refresh();wait.until(lambda d:d.execute_script('return !!window.signatureReady&&state.autoPhotoBatch?.items.length===3'));assert d.execute_script('return state.autoPhotoBatch.items[0].status')=='approved';d.execute_script('document.querySelector("[data-tab=studio]").click();document.getElementById("auto-photo").scrollIntoView();')
 for name,w,h in [('ipad',820,1180),('iphone',390,844)]:
  d.set_window_size(w,h);time.sleep(.3);assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1');d.save_screenshot(str(out/f'webkit-{name}.png'))
 report={'engine':'WebKitGTK','physical_iPad_iPhone':'UNVERIFIED','upload_worker_EXIF':'PASS','native_PNG':result,'slider':'PASS','approval_persistence':'PASS','viewports':'PASS','errors':d.execute_script('return window.photoErrors||[]')};assert not report['errors'];(out/'webkit-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
finally:d.quit()
