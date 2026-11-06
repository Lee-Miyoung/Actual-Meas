const test = require('node:test');
const assert = require('node:assert/strict');
const {crop, matchPhoto, readZip} = require('../production-core');
const kit = require('../brand-kit');
const zlib = require('node:zlib');
function zip(text, deflate=false) {
  const bytes=Buffer.from(text), data=deflate?zlib.deflateRawSync(bytes):bytes, name=Buffer.from('production.json');
  let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}crc=(crc^0xffffffff)>>>0;
  const h=Buffer.alloc(30),c=Buffer.alloc(46),e=Buffer.alloc(22);
  h.writeUInt32LE(0x04034b50);h.writeUInt16LE(deflate?8:0,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(bytes.length,22);h.writeUInt16LE(name.length,26);
  c.writeUInt32LE(0x02014b50);c.writeUInt16LE(deflate?8:0,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(name.length,28);
  e.writeUInt32LE(0x06054b50);e.writeUInt16LE(1,8);e.writeUInt16LE(1,10);e.writeUInt32LE(c.length+name.length,12);e.writeUInt32LE(h.length+name.length+data.length,16);
  const b=Buffer.concat([h,name,data,c,name,e]);return b.buffer.slice(b.byteOffset,b.byteOffset+b.length);
}
test('fill crop covers both frame edges and respects adjustable vertical focus',()=>{
 for(const [iw,ih,w,h] of [[750,1000,1080,1129],[2400,1500,1080,600],[750,1000,1280,540]]){
  const a=crop(iw,ih,w,h,0),b=crop(iw,ih,w,h,1);
  assert.ok(Math.abs(a.sw/a.sh-w/h)<1e-10);assert.ok(a.sw<=iw && a.sh<=ih);
  assert.equal(a.sy,0);assert.ok(Math.abs(b.sy+b.sh-ih)<1e-8);
 }
});
test('PNG package names match converted JPG only when unambiguous',()=>{
 const photo={name:'05_compare_window.jpg'};
 assert.equal(matchPhoto('photos/05_compare_window.png',[photo]),photo);
 assert.equal(matchPhoto('missing.jpg',[photo]),null);
 assert.equal(matchPhoto('a.png',[{name:'x/a.jpg'},{name:'y/a.webp'}]),null);
});
test('ZIP supports stored/deflated Korean text, and rejects corrupt/truncated data',async()=>{
 for(const compressed of [false,true]){
  const entries=await readZip(zip('춘천 석사동',compressed));
  assert.equal(new TextDecoder().decode(await entries[0].read()),'춘천 석사동');
 }
 await assert.rejects(readZip(new ArrayBuffer(20)));
 const bad=zip('abc');new Uint8Array(bad)[45]^=1;
 const entries=await readZip(bad);await assert.rejects(entries[0].read());
});
test('production settings retain comparison layout and crop position across round trip',()=>{
 const value={schema:'cheonginmaru-production-v1',slides:Array.from({length:3},(_,i)=>({title:'현장',photo:`${i}.png`,layout:'pair',focus:.8})),captions:{}};
 assert.deepEqual(kit.parse(JSON.stringify(value)).slides,value.slides);
 value.slides[0].focus=2;assert.throws(()=>kit.parse(JSON.stringify(value)));
});
