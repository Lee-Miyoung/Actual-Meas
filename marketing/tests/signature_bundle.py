"""Real all-platform ZIP keeps folders and explicitly distinguishes PNG covers from MP4."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import os,json,zipfile,io
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/signature-bundle'));out.mkdir(parents=True,exist_ok=True);f=out/'qa.jpg';Image.new('RGB',(1600,1200),(196,184,162)).save(f)
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);a=b.new_page(viewport={'width':1440,'height':1050},accept_downloads=True);a.on('dialog',lambda d:d.accept());errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('window.signatureReady');a.locator('#production-files').set_input_files(str(f));a.wait_for_function('state.slideCount===2&&!document.getElementById("production-files").disabled')
 with a.expect_download(timeout=120000)as d:a.locator('#brand-export-all').click()
 d.value.save_as(out/'all-platforms.zip')
 with zipfile.ZipFile(out/'all-platforms.zip')as z:
  assert z.testzip()is None
  for key in ['carousel','reels','story','naver','naverCover','kakao','kakaoWide','shorts','youtube','youtubeCover']:
   pngs=[n for n in z.namelist()if n.startswith(key+'/')and n.endswith('.png')];assert len(pngs)==2,(key,pngs);assert key+'/설명글.txt'in z.namelist()
   for name in pngs:
    im=Image.open(io.BytesIO(z.read(name)));assert im.format=='PNG';assert min(im.size)>200
  assert 'MP4가 아닙니다' in z.read('출력안내.txt').decode();assert json.loads(z.read('브랜드디자인.json'))['id']=='editorial-studio'
 fixed=a.evaluate('''async()=>{const batch=signatureExportRenderer(),before=await batch.render(0,'carousel'),data=before.toDataURL();releaseCanvas(before);const old=state.signatureDesign;state.signatureDesign=SignatureCore.create('material-journal');try{const after=await batch.render(0,'carousel'),same=after.toDataURL()===data;releaseCanvas(after);return same;}finally{state.signatureDesign=old;batch.dispose();}}''');assert fixed
 assert not errors,errors;b.close();r={'ten_platform_folder_compatibility':'PASS','20_actual_PNGs':'PASS','channel_captions':'PASS','pinned_design_manifest':'PASS','inflight_output_snapshot':'PASS','static_cover_vs_MP4_notice':'PASS','errors':errors};(out/'results.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
