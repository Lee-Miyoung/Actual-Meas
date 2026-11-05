"""Gateway contract tests use a mocked provider; no real AI image quality claim."""
import base64, contextlib, importlib.util, io, json, os, sqlite3, tempfile, threading, unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('gateway',Path(__file__).parents[1]/'server/server.py')
gateway=importlib.util.module_from_spec(spec);spec.loader.exec_module(gateway)
# Minimal real PNG fixture (1x1) for request contracts.
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
DATA='data:image/png;base64,'+base64.b64encode(PNG).decode()
class GatewayTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();gateway.DB=self.tmp.name+'/usage.sqlite3';gateway.TOKEN='a'*40;gateway.API_KEY='unit-test-provider-key';gateway.DAILY=2;gateway.MONTHLY=1;gateway.ESTIMATE=.5;gateway.init_db();self.server=gateway.ThreadingHTTPServer(('127.0.0.1',0),gateway.Handler);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.url='http://127.0.0.1:'+str(self.server.server_port)
 def tearDown(self):self.server.shutdown();self.server.server_close();self.tmp.cleanup()
 def request(self,path,body=None,auth=True,origin=None):
  headers={'Content-Type':'application/json'}
  if auth:headers['Authorization']='Bearer '+gateway.TOKEN
  if origin:headers['Origin']=origin
  req=Request(self.url+path,data=json.dumps(body).encode() if body else None,headers=headers)
  try:
   with urlopen(req) as r:return r.status,json.load(r)
  except HTTPError as e:return e.code,json.load(e)
 def test_auth_origin_and_health(self):
  self.assertEqual(self.request('/health',auth=False)[0],401);self.assertEqual(self.request('/health',origin='https://evil.example')[0],403);self.assertTrue(self.request('/health')[1]['configured'])
 def test_consent_mask_and_quota(self):
  self.assertEqual(self.request('/edit',{'image':DATA,'mask':DATA,'consent':False})[0],400)
  self.assertEqual(self.request('/edit',{'image':'bad','mask':DATA,'consent':True})[0],400)
  def remote(req,timeout):
   self.assertEqual(req.full_url,'https://api.openai.com/v1/images/edits');self.assertIn(b'name="mask"',req.data);return contextlib.closing(io.BytesIO(json.dumps({'data':[{'b64_json':base64.b64encode(PNG).decode()}]}).encode()))
  with patch.object(gateway,'urlopen',side_effect=remote):
   for _ in range(2):self.assertEqual(self.request('/edit',{'image':DATA,'mask':DATA,'consent':True})[0],200)
   self.assertEqual(self.request('/edit',{'image':DATA,'mask':DATA,'consent':True})[0],400)
  with sqlite3.connect(gateway.DB) as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM usage').fetchone()[0],2)
 def test_missing_key_and_png_limits(self):
  gateway.API_KEY='';self.assertEqual(self.request('/edit',{'image':DATA,'mask':DATA,'consent':True})[0],503)
  with self.assertRaises(ValueError):gateway.decode_png('data:image/png;base64,AAAA')
if __name__=='__main__':unittest.main()
