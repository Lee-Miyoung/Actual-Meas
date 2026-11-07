const test = require("node:test"),
  assert = require("node:assert/strict"),
  E = require("../content-engine.js");
const floors = [
  ["강마루", "F1", "90×900mm", "밝은색"],
  ["원목마루", "F2", "120×1200mm", "중간색"],
  ["SPC", "F3", "180×1200mm", "회색"],
].map(([category, model, size, color]) => ({
  id: model,
  type: "floor",
  category,
  brand: "검증용 브랜드",
  model,
  size,
  color,
  material: "검증용 소재",
  features: "검증 전 방수 성능",
  verified: false,
}));
const walls = [
  ["벽장재", "W1", "400×800mm", "백색"],
  ["시그니월", "W2", "600×1200mm", "웜그레이"],
].map(([category, model, size, color]) => ({
  id: model,
  type: "wall",
  category,
  brand: "벽 검증용",
  model,
  size,
  color,
  material: "벽 검증소재",
  features: "확인한 표면 정보",
  verified: true,
  source: "테스트 제품표",
}));
function input(product, mode = "editorial") {
  return {
    product,
    mode,
    count: 5,
    photoCount: 4,
    site: "테스트 현장",
    memo: "",
    works: [],
  };
}
test("3 floor and 2 wall products never borrow identity/specs or unverified claims", () => {
  for (const p of [...floors, ...walls])
    for (const mode of Object.keys(E.MODES)) {
      const out = E.create(input(p, mode)),
        text = JSON.stringify(out.caption);
      assert(text.includes(p.model));
      assert(text.includes(p.size));
      assert(text.includes(p.color));
      if (p.type === "wall") assert(!out.caption.includes("바닥"));
      assert(!text.includes("검증 전 방수 성능"));
      assert(!out.caption.includes("고객 후기"));
      assert.equal(out.carousel.length, 5);
      for (const q of [...floors, ...walls].filter((q) => q.id !== p.id))
        assert(!text.includes("모델: " + q.model));
    }
});
test("work claims only for checked work; absent facts omitted", () => {
  const out = E.create(input(floors[0], "craft"));
  for (const w of E.WORKS) assert(!out.caption.includes(w));
  const specific = E.create({
    ...input(floors[0], "craft"),
    works: ["철거", "크랙 보수", "임의 작업"],
  });
  assert(specific.caption.includes("철거 · 크랙 보수"));
  assert(!specific.caption.includes("황토풀 접착"));
  assert(!specific.caption.includes("임의 작업"));
});
test("category-only and empty optional fields still produce usable copy without invented details", () => {
  const out = E.create({
    product: { type: "wall", category: "벽장재" },
    photoCount: 4,
    count: 3,
  });
  assert(!out.caption.includes("바닥"));
  assert(!out.caption.includes("동화"));
  assert(!out.caption.includes("규격:"));
  assert(!out.caption.includes("미입력"));
  assert.equal(out.carousel.length, 3);
  assert(out.caption.includes(E.SLOGAN));
});
test("features need explicit verification AND source; mismatched product type rejected", () => {
  assert.throws(() => E.normalProduct({ ...floors[0], verified: true }));
  assert.throws(() => E.normalProduct({ type: "floor", category: "시그니월" }));
  assert(!E.create(input(floors[0])).caption.includes(floors[0].features));
  assert(E.create(input(walls[0])).caption.includes(walls[0].features));
});
test("quoted CSV, BOM, Korean headers, multiline fields, and malformed rows", () => {
  const csv =
    '\uFEFF구분,제품군,브랜드,모델명,규격,색상,소재,확인된특징,확인출처,특징확인\r\n벽장재,벽장재,브랜드,"A, B",600mm,백색,소재,"첫 줄\n다음 줄",제품표,true';
  const r = E.parseCSV(csv);
  assert.equal(r.errors.length, 0);
  assert.equal(r.products[0].model, "A, B");
  assert.equal(r.products[0].features, "첫 줄\n다음 줄");
  assert.equal(r.products[0].type, "wall");
  assert.throws(() => E.parseCSV("type,type\nfloor,floor"));
  assert.equal(E.parseCSV("type,category\nfloor,강마루,오류").errors.length, 1);
});
test("similarity avoids recently posted title while preserving brand/product and slogan", () => {
  const previous = E.create(input(floors[0]), [], 1),
    history = [
      {
        title: previous.titles[0],
        caption: previous.caption,
        mode: "editorial",
      },
    ],
    next = E.create(input(floors[0]), history, 2);
  assert.notEqual(next.titles[0], previous.titles[0]);
  assert(next.caption.includes(floors[0].model));
  assert(next.caption.includes(E.SLOGAN));
  assert.equal(
    E.similarity(
      "청인마루 F1 공간의 위로가 되다",
      "청인마루 F1 공간의 위로가 되다",
      floors[0],
    ),
    0,
  );
});
test("recommendations use selected facts/history; insufficient observations never create predictions", () => {
  assert.equal(
    E.recommend({ ...input(floors[0]), works: ["철거"] }, []).mode,
    "craft",
  );
  const one = E.stats(
    [{ id: "1", contentMode: "product", status: "게시 완료" }],
    [{ postId: "1", followers: 2, saves: 1, shares: 0 }],
    [],
  );
  assert.equal(one.sufficient, false);
  assert(!E.recommend(input(floors[0]), [], one).reason.includes("성공"));
  const posts = ["editorial", "product", "product"].map((m, i) => ({
      id: String(i),
      contentMode: m,
      status: "게시 완료",
    })),
    stats = E.stats(
      posts,
      posts.map((p, i) => ({
        postId: p.id,
        followers: i * 2,
        saves: 0,
        shares: 0,
      })),
      [{ postId: "1" }],
    );
  assert(stats.sufficient);
  assert.equal(stats.rows.find((r) => r.mode === "product").leads, 1);
});

test("owner product table: 91 entries, no prices, explicit package specs and no performance inventions", () => {
  const products = require("../data/provided-products.json");
  assert.equal(products.length, 91);
  assert.equal(products.filter((p) => p.type === "wall").length, 4);
  for (const p of products) {
    assert(!Object.hasOwn(p, "price"));
    assert(!/\d[\d,]*원/.test(JSON.stringify(p)));
    E.normalProduct(p);
  }
  const p = products.find((p) => p.model === "스킨마루165"),
    out = E.create(input(p, "product"));
  assert(out.caption.includes("165 × 1205 × 7.2T"));
  assert(out.caption.includes("16pcs"));
  assert(out.caption.includes("3.18㎡/BOX"));
  assert(!out.caption.includes("130,000"));
  assert(
    products
      .filter((p) => p.model.startsWith("시그니월"))
      .every((p) => !p.features && !p.verified),
  );
});

test("detailed model selection resolves only its own color and size variant", () => {
  const products = require("../data/provided-products.json");
  assert.equal(
    products.reduce((n, p) => n + (p.variants || []).length, 0),
    377,
  );
  const terrace = products.find((p) => p.model === "트라빼 초광폭 우드형"),
    short = terrace.variants.find((v) => v.name === "로엔오크1210"),
    long = terrace.variants.find((v) => v.name === "로엔오크2420");
  const s = E.resolveProduct(products, terrace.id + "::" + short.id),
    l = E.resolveProduct(products, terrace.id + "::" + long.id);
  assert.equal(s.size, "230 × 1210 × 8.5T");
  assert.equal(s.pack, "10pcs");
  assert.equal(l.size, "230 × 2420 × 8.5T");
  assert.equal(l.pack, "5pcs");
  assert.equal(s.color, "로엔오크1210");
  assert(E.create({...input(s),photoCount:1}).carousel.every(c=>c.photo===1));
  const out = E.create(input(s, "product"));
  assert(out.caption.includes("로엔오크1210"));
  assert(!out.caption.includes("로엔오크2420"));
  assert(!out.caption.includes("가격"));
  assert.equal(
    E.resolveProduct(products, terrace.id + "::not-a-real-variant"),
    null,
  );
});

test('brand wording preserves wall manufacturer names and does not guess an unknown material',()=>{
 const wall={id:'wall-original-name',type:'wall',category:'벽장재',brand:'동화자연마루',model:'시그니월',size:'1010×2460×9T'};
 const result=E.create(input(wall,'product'),[],2);
 assert(result.titles.some(t=>t.includes('동화자연마루 시그니월')));
 assert(!result.caption.includes('동화자연벽장재'));
 const generic=E.create(input({id:'unknown',type:'floor',category:'마감재'}));
 assert(!generic.caption.includes('바닥'));assert(!generic.caption.includes('규격:'));
 assert.equal(generic.carousel.at(-1).role,'문의');
 assert.equal(generic.carousel[1].layout,'quiet');
});
