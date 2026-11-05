"""Synthetic pixels only. Not a client installation or photo-quality benchmark."""
import base64, struct, zlib

def png(index):
 w,h=1200,900
 def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 rows=[]
 for y in range(h):
  row=bytearray()
  for x in range(w):
   rgb=(190,200,185) if 100<x<600 and 100<y<500 else ((150,135,110) if x%90<3 else (100+index*15,95+index*12,85+index*10))
   row.extend(rgb)
  rows.append(b'\x00'+bytes(row))
 data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
 return 'data:image/png;base64,'+base64.b64encode(data).decode()

def legacy():
 return {'version':1,'title':'테스트 현장 · 합성 검증 이미지','product':'강마루','memo':'기능 검증용 합성 이미지입니다. 실제 시공 사진 아님.','mascot':'none','theme':'editorial','format':'carousel','photos':[{'id':str(i),'name':f'합성 테스트 {i+1}.png','src':png(i),'adjust':{'exposure':0,'warmth':0,'contrast':0,'rotation':0,'zoom':1,'vertical':0,'horizontal':0,'x':0,'y':0}} for i in range(4)],'records':[{'id':'legacy-record','date':'2026-11-05','note':'기존 기록','followers':1500,'leads':0,'contracts':0}]}
