"""Real browser checks; fixtures are synthetic/reference images, never claimed as company projects."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,zipfile
out=Path('/workspace/auto-photo-review');out.mkdir(exist_ok=True)
expected_rows=len(json.loads((Path(__file__).parents[1]/'data/products.json').read_text())['rows'])
im=Image.new('RGB',(1000,750),(115,112,106));d=ImageDraw.Draw(im);d.rectangle((0,450,1000,750),fill=(157,111,73))
for x in [80,320,680,920]:d.line((x,30,x,440),fill=(25,25,25),width=4)
for y in [40,180,320]:d.line((40,y,960,y),fill=(30,30,30),width=4)
for x in range(0,1000,50):d.line((x,450,x+120,750),fill=(120,78,43),width=2)
room=out/'synthetic-room.png';roll=out/'synthetic-roll.png';im.save(room);im.rotate(1,resample=Image.Resampling.BICUBIC,fillcolor=(115,112,106)).save(roll)
# Tagged sensor pixels are kept unchanged; the browser applies EXIF orientation 6 at decode.
ex=Image.Exif();ex[274]=6;Image.new('RGB',(120,80),(150,100,70)).save(out/'exif6.jpg',exif=ex)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);a=b.new_page(viewport={'width':1440,'height':1050},accept_downloads=True);errors=[];requests=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('request',lambda r:requests.append(r.url));a.on('dialog',lambda d:d.accept());a.route('https://maru-calc.pages.dev/api/marketing-products',lambda r:r.abort());a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('window.signatureReady');a.locator('[data-tab="studio"]').click();a.locator('.archive-correction').evaluate('e=>e.open=true')
 # Use the published product-only mirror, with a deliberately unavailable direct endpoint.
 a.route('https://maru-calc.pages.dev/api/marketing-products',lambda r:r.abort());a.locator('[data-tab="products"]').click();a.locator('#product-feed-sync').click();a.wait_for_function('(n)=>state.settings.productSync?.lastGood?.rows.length===n',arg=expected_rows,timeout=30000);a.wait_for_function('document.getElementById("product-feed-status").textContent.includes("직접 연결 대신")',timeout=30000);assert a.evaluate('state.catalog.some(p=>p.type==="wall"&&p.variants.length>0)');assert a.evaluate('state.catalog.some(p=>p.type==="floor"&&p.variants.length>0)')
 a.locator('[data-tab="studio"]').click();a.locator('.archive-correction').evaluate('e=>e.open=true');a.locator('#ap-files').set_input_files([str(room),str(roll),str(out/'exif6.jpg')]);a.wait_for_function('state.autoPhotoBatch?.items.length===3&&state.autoPhotoBatch.items.every(p=>p.plan)',timeout=90000);a.wait_for_function('!document.getElementById("ap-files").disabled');assert a.evaluate('state.photos.length')==0
 plans=a.evaluate('state.autoPhotoBatch.items.map(p=>({rotation:p.plan.rotation,crop:p.plan.cropFraction,orientation:p.exif.orientation,width:p.width,height:p.height}))');assert plans[0]['rotation']==0;assert abs(plans[1]['rotation']-1)<.15;assert plans[1]['crop']<=.06;assert plans[2]['orientation']==6;assert [plans[2]['width'],plans[2]['height']]==[80,120]
 a.locator('.auto-photo-item').first.click();a.wait_for_timeout(400);a.locator('#ap-split').fill('30');assert a.locator('#ap-comparison').evaluate("e=>e.style.getPropertyValue('--ap-split')")=='30%'
 # Tone is prohibited by default. A manually confirmed safe non-material region allows only bounded exposure.
 original=a.evaluate('state.autoPhotoBatch.items[0].src');a.locator('.auto-material').evaluate('e=>e.open=true');a.locator('#ap-boundary').fill('45');a.locator('#ap-mask-confirm').check();a.locator('#ap-mask-apply').click();a.wait_for_timeout(500)
 pixels=a.evaluate('''async()=>{const p=state.autoPhotoBatch.items[0],a=await AutoPhotoLab.render(p),im=await loadImage(p.src),b=node('canvas');b.width=im.width;b.height=im.height;b.getContext('2d').drawImage(im,0,0);const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let floorChanged=0,upperChanged=0;for(let row=0;row<a.height;row++)for(let col=0;col<a.width;col++){const i=(row*a.width+col)*4;if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2]){if(row>=Math.floor(a.height*.425))floorChanged++;else upperChanged++;}}releaseCanvas(a);releaseCanvas(b);im.src='';return{floorChanged,upperChanged};}''');assert pixels['floorChanged']==0,pixels;assert pixels['upperChanged']>0,pixels
 a.locator('#ap-approve').click()
 with a.expect_download() as dd:a.locator('#ap-save').click()
 dd.value.save_as(out/'protected-correction.png');assert Image.open(out/'protected-correction.png').size==(1000,750)
 a.locator('#ap-reset').click();a.wait_for_timeout(400);assert a.evaluate('state.autoPhotoBatch.items[0].src')==original;assert a.evaluate('state.autoPhotoBatch.items[0].status')=='review';a.locator('#ap-retry').click();a.wait_for_function('!document.getElementById("ap-files").disabled');assert a.evaluate('state.autoPhotoBatch.items[0].src')==original
 # Add up to 30 files. Each is retained, not silently clipped to the legacy 10-photo editor.
 small=out/'small.png';Image.new('RGB',(64,48),(140,110,80)).save(small);a.locator('#ap-files').set_input_files([{'name':f'room-{i}.png','mimeType':'image/png','buffer':small.read_bytes()} for i in range(27)]);a.wait_for_function('state.autoPhotoBatch.items.length===30&&state.autoPhotoBatch.items.every(p=>p.plan)',timeout=120000);a.wait_for_function('!document.getElementById("ap-files").disabled');a.locator('#ap-files').set_input_files(str(small));a.wait_for_function('document.getElementById("ap-status").textContent.includes("최대 30장")');assert a.evaluate('state.autoPhotoBatch.items.length')==30
 a.locator('#ap-approve-all').click();assert a.evaluate('state.autoPhotoBatch.items.every(p=>p.status==="approved")')
 with a.expect_download(timeout=90000) as dd:a.locator('#ap-originals').click()
 dd.value.save_as(out/'originals.zip');z=zipfile.ZipFile(out/'originals.zip');assert len(z.namelist())==31;assert hashlib.sha256(z.read(z.namelist()[0])).digest()==hashlib.sha256(room.read_bytes()).digest();assert hashlib.sha256(z.read(z.namelist()[2])).digest()==hashlib.sha256((out/'exif6.jpg').read_bytes()).digest()
 with a.expect_download(timeout=90000) as dd:a.locator('#ap-zip').click()
 dd.value.save_as(out/'approved.zip');z=zipfile.ZipFile(out/'approved.zip');manifest=json.loads(z.read('검수기록.json'));assert len(manifest['photos'])==30;assert not manifest['generativePixels'];assert all(not p['aiRegions'] for p in manifest['photos'])
 a.locator('.auto-photo-item').nth(1).click();a.wait_for_timeout(300);a.locator('#ap-design-check').check();a.locator('#ap-to-design').click();a.wait_for_function('state.photos.length===1&&!document.getElementById("ap-files").disabled',timeout=60000);assert a.evaluate('state.photos[0].sourceWidth')==1000;assert a.evaluate('state.photos[0].sourceHeight')==750
 # Whole-app backup/restore and refresh keep batch approval, exact originals, product cache and design work.
 a.locator('[data-tab="storage"]').click()
 with a.expect_download() as dd:a.locator('#backup').click()
 dd.value.save_as(out/'workspace.json');backup=json.loads((out/'workspace.json').read_text());assert len(backup['current']['autoPhotoBatch']['items'])==30
 a.evaluate('state.autoPhotoBatch.items=[]');a.locator('#restore').set_input_files(str(out/'workspace.json'));a.wait_for_function('state.autoPhotoBatch.items.length===30');a.evaluate('async()=>{persist();await flushPendingSave();}');a.reload();a.wait_for_function('window.signatureReady&&state.autoPhotoBatch?.items.length===30');assert a.evaluate('state.autoPhotoBatch.items[0].src')==original;assert a.evaluate('state.autoPhotoBatch.items.every(p=>p.status==="approved")');assert a.evaluate('state.settings.productSync.lastGood.rows.length')==expected_rows
 a.locator('[data-tab="studio"]').click();a.locator('.archive-correction').evaluate('e=>e.open=true');a.locator('#auto-photo').scroll_into_view_if_needed()
 for name,w,h in [('desktop',1440,1050),('ipad',820,1180),('iphone',390,844),('galaxy',412,915)]:
  a.set_viewport_size({'width':w,'height':h});a.wait_for_timeout(200);assert a.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),name;a.screenshot(path=str(out/(name+'.png')))
 assert not errors,errors;assert not any('api.openai.com' in u or 'script.google.com' in u for u in requests)
 report={'fixtures':'synthetic with known rotation, EXIF JPEG; actual published five-field product feed','actual_company_photos':'NOT PROVIDED','roll_degrees':plans[1]['rotation'],'floor_colour_pixels_changed':pixels['floorChanged'],'protected_exposure':'PASS','30_file_upload':'PASS','original_ZIP_byte_hashes':'PASS','approved_ZIP_30_files':'PASS','native_resolution':'PASS','approval_design_handoff':'PASS','whole_backup_restore_reload':'PASS','real_product_mirror_rows':expected_rows,'viewports':['desktop','ipad','iphone','galaxy'],'physical_devices':'UNVERIFIED','runtimeErrors':errors};(out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close()
