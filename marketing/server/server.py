"""Private AI edit gateway. Run outside GitHub Pages; stdlib only, TLS via hosting ingress."""
import base64, binascii, hashlib, hmac, json, os, sqlite3, struct, threading, uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ORIGIN=os.environ.get('STUDIO_ORIGIN','https://lee-miyoung.github.io')
TOKEN=os.environ.get('STUDIO_ACCESS_TOKEN','')
API_KEY=os.environ.get('STUDIO_IMAGE_API_KEY','')
DB=os.environ.get('STUDIO_USAGE_DB','/tmp/cheonginmaru-usage.sqlite3')
DAILY=int(os.environ.get('STUDIO_DAILY_LIMIT','5'))
MONTHLY=float(os.environ.get('STUDIO_MONTHLY_BUDGET_USD','10'))
ESTIMATE=float(os.environ.get('STUDIO_RESERVATION_USD','0.50'))
MODEL='gpt-image-1'
MAX_BODY=16*1024*1024
LOCK=threading.Lock()
SEM=threading.BoundedSemaphore(1)
PROMPT=('Edit only the transparent mask region. Remove the selected small unwanted object. '
        'Preserve the flooring and wall material identity, color, wood grain, plank direction, '
        'seams, lighting and room geometry. Reconstruct only the immediately obscured background. '
        'Do not redesign the room or add objects. Keep the image dimensions and viewpoint.')

def init_db():
    with sqlite3.connect(DB) as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS usage (id TEXT PRIMARY KEY, created TEXT, month TEXT, reserved REAL, status TEXT)')

def reserve():
    now=datetime.now(timezone.utc).isoformat(); day=now[:10]; month=now[:7]
    with LOCK,sqlite3.connect(DB) as conn:
        conn.execute('BEGIN IMMEDIATE')
        count=conn.execute('SELECT COUNT(*) FROM usage WHERE created LIKE ?', (day+'%',)).fetchone()[0]
        used=conn.execute('SELECT COALESCE(SUM(reserved),0) FROM usage WHERE month=?',(month,)).fetchone()[0]
        if count>=DAILY or used+ESTIMATE>MONTHLY: raise ValueError('일일 요청 또는 월 예약 예산 한도에 도달했습니다.')
        request_id=str(uuid.uuid4());conn.execute('INSERT INTO usage VALUES (?,?,?,?,?)',(request_id,now,month,ESTIMATE,'reserved'))
        return request_id

def decode_png(value):
    prefix='data:image/png;base64,'
    if not isinstance(value,str) or not value.startswith(prefix): raise ValueError('PNG 이미지가 필요합니다.')
    try: data=base64.b64decode(value[len(prefix):],validate=True)
    except (ValueError,binascii.Error): raise ValueError('이미지 인코딩 오류')
    if len(data)>7*1024*1024 or len(data)<24 or data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('PNG 크기 또는 형식 오류')
    width,height=struct.unpack('>II',data[16:24])
    if not 1<=width<=2048 or not 1<=height<=2048:raise ValueError('각 변 2048px 이하 이미지를 사용하세요.')
    return data,(width,height)

def multipart(image,mask):
    boundary='studio-'+uuid.uuid4().hex; chunks=[]
    for key,value in {'model':MODEL,'prompt':PROMPT,'quality':'low','size':'auto','n':'1'}.items():
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    for key,data in [('image',image),('mask',mask)]:
        chunks.extend([f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{key}.png"\r\nContent-Type: image/png\r\n\r\n'.encode(),data,b'\r\n'])
    chunks.append(f'--{boundary}--\r\n'.encode());return b''.join(chunks),boundary

class Handler(BaseHTTPRequestHandler):
    def log_message(self,fmt,*args): pass  # Do not log URLs, credentials, photos or customer content.
    def respond(self,code,data):
        payload=json.dumps(data,ensure_ascii=False).encode();self.send_response(code)
        if self.headers.get('Origin')==ORIGIN:self.send_header('Access-Control-Allow-Origin',ORIGIN)
        self.send_header('Vary','Origin');self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
    def authorised(self):
        if self.headers.get('Origin') not in (None,ORIGIN):self.respond(403,{'error':'허용되지 않은 출처'});return False
        candidate=self.headers.get('Authorization','')
        if len(TOKEN)<32 or not hmac.compare_digest(candidate,'Bearer '+TOKEN):self.respond(401,{'error':'서버 접속 인증이 필요합니다.'});return False
        return True
    def do_OPTIONS(self):
        if self.headers.get('Origin')!=ORIGIN:return self.respond(403,{'error':'허용되지 않은 출처'})
        self.send_response(204);self.send_header('Access-Control-Allow-Origin',ORIGIN);self.send_header('Vary','Origin')
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type');self.end_headers()
    def do_GET(self):
        if not self.authorised():return
        if self.path!='/health':return self.respond(404,{'error':'경로 없음'})
        self.respond(200,{'configured':bool(API_KEY),'dailyLimit':DAILY,'monthlyBudgetUsd':MONTHLY,'reservedPerAttemptUsd':ESTIMATE,'model':MODEL})
    def do_POST(self):
        if not self.authorised():return
        if self.path!='/edit':return self.respond(404,{'error':'경로 없음'})
        if not API_KEY:return self.respond(503,{'error':'서버 AI API 키가 설정되지 않았습니다.'})
        if not SEM.acquire(blocking=False):return self.respond(429,{'error':'다른 편집 처리 중입니다.'})
        request_id=None
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=MAX_BODY:return self.respond(413,{'error':'요청 크기 초과'})
            body=json.loads(self.rfile.read(size))
            if body.get('consent') is not True:return self.respond(400,{'error':'사진 외부 전송 동의가 필요합니다.'})
            image,shape=decode_png(body.get('image'));mask,mask_shape=decode_png(body.get('mask'))
            if shape!=mask_shape:return self.respond(400,{'error':'사진과 마스크 크기가 다릅니다.'})
            request_id=reserve();payload,boundary=multipart(image,mask)
            req=Request('https://api.openai.com/v1/images/edits',data=payload,headers={'Authorization':'Bearer '+API_KEY,'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
            # Standard HTTPS certificate validation and inherited proxy are retained.
            with urlopen(req,timeout=180) as res:result=json.load(res)
            encoded=result.get('data',[{}])[0].get('b64_json')
            if not encoded:raise ValueError('AI 서비스가 이미지 결과를 반환하지 않았습니다.')
            with sqlite3.connect(DB) as conn:conn.execute('UPDATE usage SET status=? WHERE id=?',('completed',request_id))
            self.respond(200,{'image':'data:image/png;base64,'+encoded,'requestId':request_id})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as exc:self.respond(400,{'error':str(exc)})
        except HTTPError as exc:self.respond(502,{'error':f'AI 서비스 응답 {exc.code}. 서버 API 권한·결제·한도를 확인하세요.'})
        except (URLError,TimeoutError):self.respond(502,{'error':'AI 서비스 연결 실패. 중복 과금을 피하기 위해 사용량 예약은 유지됩니다.'})
        except Exception:self.respond(500,{'error':'서버 처리 실패. 관리자 로그와 설정을 확인하세요.'})
        finally:SEM.release()

if __name__=='__main__':
    if len(TOKEN)<32:raise SystemExit('STUDIO_ACCESS_TOKEN must have at least 32 characters.')
    if DAILY<1 or MONTHLY<=0 or ESTIMATE<=0 or ESTIMATE>MONTHLY:raise SystemExit('Invalid usage budget settings.')
    init_db();server=ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('PORT','8787'))),Handler)
    server.serve_forever()
