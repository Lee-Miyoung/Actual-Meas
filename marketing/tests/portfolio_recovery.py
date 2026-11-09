"""Save/preview failures remain recoverable and pending work survives backgrounding."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/portfolio-recovery'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);a=b.new_page(viewport={'width':1440,'height':1000});errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept());a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&easyReady')
 from PIL import Image
 fixture=out/'synthetic-room.jpg';Image.new('RGB',(1600,1200),(190,185,175)).save(fixture)
 a.locator('#production-files').set_input_files(str(fixture));a.wait_for_function('state.photos.length===1&&document.querySelector("#designs canvas")',timeout=90000);a.wait_for_timeout(1200);source=a.evaluate('state.photos[0].src')
 result=a.evaluate('''async()=>{await saving;const native=db.transaction;try{db.transaction=()=>{throw new DOMException('QA storage limit','QuotaExceededError');};persist();await flushPendingSave();return document.getElementById('save-status').textContent;}finally{db.transaction=native;}}''');assert '실패' in result,result
 a.evaluate('async()=>{persist();await flushPendingSave();}');assert a.locator('#save-status').inner_text()=='이 기기에 저장됨'
 a.evaluate('''async()=>{const native=card;card=async()=>{throw Error('QA failed image')};try{await renderProductionWorkspace();}finally{card=native;}}''');assert a.locator('#designs button').inner_text()=='사진 다시 불러오기';a.locator('#designs button').click();a.wait_for_function('document.querySelector("#designs canvas")');assert a.evaluate('state.photos[0].src')==source
 # Test the handler's actual flush path; physical OS termination is outside this test.
 a.evaluate('''async()=>{state.brandStoryMode='manual';state.brandOutput={...brandSettings(),titles:'배경 전환 전 수정한 문구'};persist();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await saving;delete document.hidden;}''');a.reload();a.wait_for_function('workflowReady&&document.querySelector("#designs canvas")');assert a.evaluate('brandSettings().titles')=='배경 전환 전 수정한 문구';assert a.evaluate('state.photos[0].src')==source
 # Closing the iOS save dialog releases every generated object URL and its DOM.
 a.evaluate('''()=>{const blob=new Blob(['qa'],{type:'image/png'});showDeviceExport(blob,'qa.png',[{name:'qa.png',blob}]);}''');assert a.evaluate('exportObjectURLs.length')==2;a.locator('#device-export .export-close').click();assert a.evaluate('exportObjectURLs.length')==0;assert a.locator('#device-export img').count()==0
 assert not errors,errors;b.close();report={'quota_failure_recovery':'PASS','image_failure_retry':'PASS','visibility_flush_reload':'PASS','unchanged_source_bytes':'PASS','closed_export_URL_release':'PASS','errors':errors};(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report))
