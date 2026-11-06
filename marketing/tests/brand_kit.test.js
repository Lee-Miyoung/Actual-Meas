const { test } = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../brand-kit.js');
const example = {
  schema: 'cheonginmaru-production-v1', format: 'youtube', product: '블론테 본오크', size: '230 × 2420 × 8.7mm',
  slides: [1, 2, 3].map(n => ({title: `사진 ${n}`, photo: `photo-${n}.jpg`})),
  captions: {carousel: '인스타 설명\n#청인마루', youtube: '유튜브 설명'},
};
test('ChatGPT code fences preserve Korean copy, platform captions and photo mapping', () => {
  assert.deepEqual(kit.parse('```json\n' + JSON.stringify(example) + '\n```'), example);
});
test('invalid package rejects before any studio state can be applied', () => {
  assert.throws(() => kit.parse(JSON.stringify({...example, format: 'unknown'})));
  assert.throws(() => kit.parse(JSON.stringify({...example, slides: []})));
  assert.throws(() => kit.parse(JSON.stringify({...example, captions: {youtube: 123}})));
  assert.throws(() => kit.parse(JSON.stringify({...example, schema: 'different'})));
});
test('blog keeps original aspect, avoids upscaling, other formats use exact pixel sizes', () => {
  assert.deepEqual(kit.dimensions({natural:true}, 3000, 4000), [1200,1600]);
  assert.deepEqual(kit.dimensions({natural:true}, 750, 1000), [750,1000]);
  assert.deepEqual(kit.dimensions({width:800,height:600}, 3000, 4000), [800,600]);
  assert.deepEqual(kit.dimensions({width:1080,height:1920}, 3000, 4000), [1080,1920]);
});
