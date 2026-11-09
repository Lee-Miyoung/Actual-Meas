from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw
import json,os
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/signature-ten'));out.mkdir(exist_ok=True);files=[]
for i in range(10):
 im=Image.new('RGB',(4032,3024),(205-i*3,198,180));ImageDraw.Draw(im).text((200,200),'SYNTHETIC QA / NOT A CLIENT SITE '+str(i),fill='black');f=out/f'room-{i}.jpg';im.save(f,quality=85);files.append(f)
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);a=b.new_page(viewport={'width':820,'height':1180},has_touch=True);errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept());a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('window.signatureReady');a.locator('#production-files').set_input_files([str(f)for f in files]);a.wait_for_function('state.photos.length===10&&!document.getElementById("production-files").disabled&&document.querySelector("#designs canvas")?.dataset.renderer==="cheongin-signature-v1"',timeout=120000);assert a.evaluate('images.size<=2');assert a.evaluate('state.photos.every(p=>p.sourceWidth===4032&&p.thumbnail)');assert a.evaluate('state.slideCount')==6;a.evaluate('async()=>{persist();await flushPendingSave();}');a.reload();a.wait_for_function('window.signatureReady&&state.photos.length===10');assert a.evaluate('images.size<=2');assert not errors,errors;b.close();r={'ten_12MP_originals':'PASS','lightweight_thumbnails':'PASS','working_cache_max_2':'PASS','six_curated_cards':'PASS','reload_10_originals':'PASS','errors':errors};(out/'results.json').write_text(json.dumps(r));print(json.dumps(r))
