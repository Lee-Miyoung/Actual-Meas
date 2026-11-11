import os,json,time,base64
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.webkitgtk.options import Options
from selenium.webdriver.webkitgtk.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait,Select
out=Path('/workspace/archive-studio-review');op=Options();op.binary_location=os.environ['WEBKIT_BROWSER_BINARY'];op.add_argument('--automation');op.add_argument('--user-agent=Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')
d=webdriver.WebKitGTK(options=op,service=Service(os.environ['WEBKIT_DRIVER_BINARY'],log_output=str(out/'webkit-driver.log')))
try:
 d.set_script_timeout(120);d.set_window_size(1180,820);d.get('http://127.0.0.1:8000/marketing/');wait=WebDriverWait(d,120);wait.until(lambda d:d.execute_script('return !!window.signatureReady&&state.catalog?.length>150'))
 d.execute_script('window.qaErrors=[];addEventListener("error",e=>qaErrors.push(e.message));addEventListener("unhandledrejection",e=>qaErrors.push(String(e.reason)));document.querySelector("[data-tab=studio]").click();')
 d.find_element(By.ID,'production-files').send_keys('\n'.join(str(out/(x+'.png')) for x in ['qa-before','qa-after','qa-detail']));wait.until(lambda d:d.execute_script('return state.photos.length===3&&!document.getElementById("production-files").disabled&&document.querySelector("#designs canvas")?.dataset.renderer==="cheongin-archive-v1"'))
 Select(d.find_element(By.ID,'quick-type')).select_by_value('floor');Select(d.find_element(By.ID,'quick-category')).select_by_value('SPC');Select(d.find_element(By.ID,'quick-brand')).select_by_value('네스트');family=d.execute_script('return state.catalog.find(p=>p.brand==="네스트"&&p.model.includes("우드")&&p.model.toLowerCase().includes("spc")).id');Select(d.find_element(By.ID,'quick-family')).select_by_value(family);Select(d.find_element(By.ID,'quick-variant')).select_by_index(1);assert '::'in d.execute_script('return state.authoring.productKey')
 d.find_element(By.ID,'quick-product-search').send_keys('네스트 150 x 1220');assert d.find_element(By.ID,'quick-results').is_displayed();assert d.find_elements(By.CSS_SELECTOR,'#quick-results button[data-product-key]')
 outputs=[]
 for fmt in ['carousel','reels','naver']:
  result=d.execute_async_script('''const f=arguments[0],done=arguments[arguments.length-1];card('',0,f).then(c=>{const result={format:f,width:c.width,height:c.height,renderer:c.dataset.renderer,ratios:c.photoLayout.every(p=>Math.abs(p.width/p.height-p.sourceWidth/p.sourceHeight)<.001)};releaseCanvas(c);done(result);}).catch(e=>done({error:e.message}));''',fmt);assert 'error' not in result,result;assert result['ratios'];outputs.append(result)
 assert [outputs[0]['width'],outputs[0]['height']]==[1080,1350];assert [outputs[1]['width'],outputs[1]['height']]==[1080,1920];assert abs(outputs[2]['width']/outputs[2]['height']-1000/1300)<.002
 selected=d.execute_script('return state.authoring.productKey');original=d.execute_script('return state.photos[0].src');d.execute_async_script('const done=arguments[arguments.length-1];persist();flushPendingSave().then(()=>done(true));');d.refresh();wait.until(lambda d:d.execute_script('return !!window.signatureReady&&!!document.querySelector("#designs canvas")'));assert d.execute_script('return state.authoring.productKey')==selected;assert d.execute_script('return state.photos[0].src')==original;assert d.execute_script('return state.signatureDesign.archiveVersion')==1
 for name,w,h in [('ipad-landscape',1180,820),('ipad-portrait',820,1180),('iphone',390,844)]:
  d.set_window_size(w,h);d.execute_script('document.querySelector("[data-tab=studio]").click();scrollTo(0,0);');time.sleep(.3);assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth+1');d.save_screenshot(str(out/('webkit-'+name+'.png')))
 report={'engine':'WebKitGTK','physical_iOS':'UNVERIFIED','hierarchy_native_selects':'PASS','multiword_search':'PASS','exports':outputs,'original_and_product_reload':'PASS','archive_marker_reload':'PASS','responsive_rotation':'PASS','errors':d.execute_script('return window.qaErrors||[]')};assert not report['errors'];(out/'webkit-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
finally:d.quit()
