"""Additional real WebKitGTK portfolio tests, not a physical iPad test."""
import os,json,time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/portfolio-webkit'));out.mkdir(parents=True,exist_ok=True)
fixture=Path(os.environ.get('STUDIO_TEST_PAIR',str(out/'synthetic-comparison.jpg')))
if not fixture.exists():
 from PIL import Image,ImageDraw
 im=Image.new('RGB',(2400,1200),(192,188,176));g=ImageDraw.Draw(im);g.rectangle((1200,0,2400,1200),fill=(207,202,193));im.save(fixture)
op=Options();op.binary_location=os.environ['WEBKIT_BROWSER_BINARY'];op.add_argument('--automation');op.add_argument('--user-agent=Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
d=webdriver.WebKitGTK(options=op,service=Service(os.environ['WEBKIT_DRIVER_BINARY'],log_output=str(out/'driver.log')))
try:
 d.set_script_timeout(90);d.set_window_size(820,1180);d.get('http://127.0.0.1:8000/marketing/');wait=WebDriverWait(d,90);wait.until(lambda d:d.execute_script('return typeof workflowReady!=="undefined"&&workflowReady&&easyReady'))
 d.execute_script('window.testErrors=[];addEventListener("error",e=>testErrors.push(e.message));addEventListener("unhandledrejection",e=>testErrors.push(String(e.reason)));')
 d.find_element(By.ID,'production-files').send_keys(str(fixture));wait.until(lambda d:d.execute_script('return state.photos.length===1&&document.querySelector("#designs canvas")'))
 d.execute_async_script('''const done=arguments[arguments.length-1];state.brandSlides[0]={...state.brandSlides[0],layout:'pair'};state.brandStoryMode='manual';state.marketingSite='검증 현장';state.brandOutput={...brandSettings(),titles:'주변 마감과 만나는 자리까지'};persist();renderProductionWorkspace().then(()=>done(true));''')
 wait.until(lambda d:len(d.find_elements(By.CSS_SELECTOR,'.portfolio-photo'))==2)
 source=d.execute_script('return state.photos[0].src')
 for name,w,h in [('ipad-portrait',820,1180),('ipad-landscape',1180,820),('iphone',390,844)]:
  d.set_window_size(w,h);time.sleep(.3);assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1')
  cols=d.execute_script('return getComputedStyle(document.querySelector(".portfolio-pair")).gridTemplateColumns.split(" ").length');assert cols==(1 if name=='iphone' else 2)
  d.execute_script('document.getElementById("production-preview").scrollIntoView()');d.save_screenshot(str(out/f'{name}.png'))
 d.find_elements(By.CSS_SELECTOR,'.portfolio-photo')[0].click();wait.until(lambda d:len(d.find_elements(By.CSS_SELECTOR,'#portfolio-zoom canvas'))==1);d.find_elements(By.CSS_SELECTOR,'#portfolio-zoom button')[0].click();assert d.execute_script('return document.querySelector(".portfolio-zoom-stage").classList.contains("is-enlarged")');d.find_elements(By.CSS_SELECTOR,'#portfolio-zoom button')[-1].click();assert not d.find_elements(By.CSS_SELECTOR,'#portfolio-zoom canvas')
 perf=d.execute_async_script('''const done=arguments[arguments.length-1];(async()=>{const base=card;let active=0,max=0,calls=0;card=async(...args)=>{if(args[4]?.maxEdge){active++;max=Math.max(max,active);calls++;try{return await base(...args);}finally{active--;}}return base(...args);};try{for(let i=0;i<80;i++)document.getElementById('production-next').click();await renderProductionWorkspace();return{max,calls};}finally{card=base;}})().then(done).catch(e=>done({error:e.message}));''');assert perf['max']==1 and perf['calls']<=3,perf
 for i in range(15):
  d.find_element(By.ID,'production-next').click();wait.until(lambda d:d.execute_script(f'return document.querySelector("#designs canvas")?.dataset.slide==="{i%3}"'))
 # Restore an explicit selected page after refresh.
 d.find_element(By.ID,'production-next').click();wait.until(lambda d:d.execute_script('return state.productionView.slide===0'));time.sleep(.6);d.refresh();wait.until(lambda d:d.execute_script('return typeof workflowReady!=="undefined"&&workflowReady&&document.querySelector("#designs canvas")'))
 assert d.execute_script('return state.photos[0].src')==source;assert d.execute_script('return state.productionView.slide')==0;assert d.execute_script('return images.size<=2');assert d.execute_script('return window.testErrors||[]')==[]
 report={'engine':'WebKitGTK 2.52.6','physical_iPad':'UNVERIFIED','pair_layouts_and_rotation':'PASS','zoom_release':'PASS','rapid_navigation':perf,'15_sequential_moves':'PASS','saved_photo_and_original_reload':'PASS'};(out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
finally:d.quit()
