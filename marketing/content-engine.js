/* Pure, offline brand-writing engine. No network and no inferred installation facts. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CheonginContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SLOGAN = "공간의 위로가 되다";
  const MODES = {
    editorial: "공간 화보형",
    product: "제품 소개형",
    craft: "시공 전문형",
    question: "소비자 궁금증형",
  };
  const WORKS = [
    "철거",
    "샌딩",
    "크랙 보수",
    "덧방",
    "황토풀 접착",
    "코너 마감",
    "문선 마감",
  ];
  const TYPES = {
    floor: [
      "강마루",
      "합판마루",
      "원목마루",
      "광폭·대형마루",
      "SPC",
      "미네랄마루",
    ],
    wall: ["벽장재", "시그니월"],
  };
  const clean = (v) => (typeof v === "string" ? v.trim() : "");
  function normalProduct(raw) {
    const p = {
      id: clean(raw.id),
      type: clean(raw.type),
      category: clean(raw.category),
      brand: clean(raw.brand),
      model: clean(raw.model),
      size: clean(raw.size),
      color: clean(raw.color),
      pack: clean(raw.pack),
      coverage: clean(raw.coverage),
      colorOptions: clean(raw.colorOptions),
      status: clean(raw.status),
      note: clean(raw.note),
      material: clean(raw.material),
      features: clean(raw.features),
      source: clean(raw.source),
      verified: raw.verified === true,
      variants: (raw.variants || []).map((v) => ({
        id: clean(v.id),
        name: clean(v.name),
        status: clean(v.status),
        size: clean(v.size),
        pack: clean(v.pack),
        coverage: clean(v.coverage),
      })),
    };
    if (
      p.variants.length > 500 ||
      p.variants.some((v) => !v.id || !v.name) ||
      new Set(p.variants.map((v) => v.id)).size !== p.variants.length
    )
      throw Error("세부모델 식별자가 누락되거나 중복되었습니다.");
    if (!["floor", "wall"].includes(p.type))
      throw Error("구분은 floor(바닥재) 또는 wall(벽장재)이어야 합니다.");
    if (!p.category) throw Error("제품군이 필요합니다.");
    if (
      (p.type === "floor" && TYPES.wall.includes(p.category)) ||
      (p.type === "wall" && TYPES.floor.includes(p.category))
    )
      throw Error("제품군과 바닥재/벽장재 구분이 맞지 않습니다.");
    if (!p.model && !p.category)
      throw Error("제품명 또는 제품군이 필요합니다.");
    if (p.verified && p.features && !p.source)
      throw Error("확인된 특징에는 확인 출처가 필요합니다.");
    if (Object.values(p).some((v) => typeof v === "string" && v.length > 2000))
      throw Error("제품 정보가 너무 깁니다.");
    return p;
  }
  function identity(p) {
    return [p.type, p.category, p.brand, p.model, p.size, p.color, p.material]
      .map((s) => clean(s).toLocaleLowerCase())
      .join("|");
  }
  function label(p) {
    return [p.brand, p.model || p.category, p.id?.includes("::") ? p.color : ""]
      .filter(Boolean)
      .join(" ");
  }
  function resolveProduct(catalog, key) {
    const [baseId, variantId] = key.split("::"),
      base = catalog.find((p) => p.id === baseId);
    if (!base) return null;
    const p = normalProduct(base);
    if (!variantId) return p;
    const v = p.variants.find((v) => v.id === variantId);
    if (!v) return null;
    return {
      ...p,
      id: key,
      color: v.name,
      size: v.size || p.size,
      pack: v.pack || p.pack,
      coverage: v.coverage || p.coverage,
      status: [p.status, v.status].filter(Boolean).join(" / "),
    };
  }
  function facts(p) {
    return [
      p.brand && `브랜드: ${p.brand}`,
      p.model && `모델: ${p.model}`,
      p.size && `규격: ${p.size}`,
      p.color && `색상: ${p.color}`,
      p.material && `소재: ${p.material}`,
      p.pack && `박스 구성: ${p.pack}`,
      p.coverage && `박스 면적: ${p.coverage}`,
      p.colorOptions && `색상 선택: ${p.colorOptions}`,
      p.verified && p.source && p.features && `확인된 특징: ${p.features}`,
    ].filter(Boolean);
  }
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, "");
    let rows = [],
      row = [],
      field = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (!quoted && field.length)
          throw Error("따옴표 위치를 확인하세요.");
        else quoted = !quoted;
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (quoted) throw Error("CSV 따옴표가 닫히지 않았습니다.");
    row.push(field);
    if (row.some((x) => x.trim())) rows.push(row);
    if (rows.length < 2) throw Error("헤더와 제품 행이 필요합니다.");
    const aliases = {
      구분: "type",
      제품군: "category",
      브랜드: "brand",
      모델명: "model",
      규격: "size",
      색상: "color",
      소재: "material",
      박스구성: "pack",
      박스면적: "coverage",
      색상종수: "colorOptions",
      상태: "status",
      메모: "note",
      확인된특징: "features",
      확인출처: "source",
      특징확인: "verified",
    };
    const headers = rows.shift().map((x) => aliases[x.trim()] || x.trim());
    if (new Set(headers).size !== headers.length)
      throw Error("CSV 헤더가 중복되었습니다.");
    if (!headers.includes("type") || !headers.includes("category"))
      throw Error("type, category 헤더가 필요합니다.");
    if (rows.length > 1000) throw Error("CSV는 1000개 제품 이하로 가져오세요.");
    const products = [],
      errors = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        if (rows[i].length !== headers.length)
          throw Error("열 개수가 헤더와 다릅니다.");
        const raw = {};
        headers.forEach((h, n) => {
          if (
            [
              "id",
              "type",
              "category",
              "brand",
              "model",
              "size",
              "color",
              "material",
              "pack",
              "coverage",
              "colorOptions",
              "status",
              "note",
              "features",
              "source",
              "verified",
            ].includes(h)
          )
            raw[h] = rows[i][n];
        });
        raw.type = { 바닥재: "floor", 벽장재: "wall" }[raw.type] || raw.type;
        raw.verified = ["true", "1", "예"].includes(clean(raw.verified));
        products.push(normalProduct(raw));
      } catch (e) {
        errors.push(`${i + 2}행: ${e.message}`);
      }
    }
    return { products, errors };
  }
  function csvTemplate() {
    return "\uFEFFtype,category,brand,model,size,color,material,features,source,verified\r\nfloor,강마루,,,,,,,,false\r\nwall,벽장재,,,,,,,,false\r\n";
  }
  function normalText(text, p) {
    let v = clean(text)
      .toLowerCase()
      .replace(/공간의\s*위로가\s*되다|청인마루/g, "");
    for (const x of [p?.brand, p?.model, p?.category, p?.color])
      if (x) v = v.split(x.toLowerCase()).join("");
    return v.replace(/[^\p{L}\p{N}]/gu, "");
  }
  function similarity(a, b, p) {
    a = normalText(a, p);
    b = normalText(b, p);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const grams = (v) =>
      new Set(
        Array.from({ length: Math.max(0, v.length - 2) }, (_, i) =>
          v.slice(i, i + 3),
        ),
      );
    const x = grams(a),
      y = grams(b);
    let shared = 0;
    for (const g of x) if (y.has(g)) shared++;
    return shared / (x.size + y.size - shared || 1);
  }
  function stats(posts, insights, leads) {
    const measured = posts.filter(
      (p) =>
        p.contentMode &&
        insights.some((i) => i.postId === p.id) &&
        p.status === "게시 완료",
    );
    const rows = Object.keys(MODES)
      .map((mode) => {
        const ps = measured.filter((p) => p.contentMode === mode),
          ids = new Set(ps.map((p) => p.id)),
          values = insights.filter((i) => ids.has(i.postId)),
          inquiries = leads.filter((l) => ids.has(l.postId));
        return {
          mode,
          count: ps.length,
          followers: values.reduce((n, i) => n + i.followers, 0),
          saves: values.reduce((n, i) => n + i.saves, 0),
          shares: values.reduce((n, i) => n + i.shares, 0),
          leads: inquiries.length,
        };
      })
      .filter((r) => r.count);
    return {
      measured: measured.length,
      rows,
      sufficient: measured.length >= 3 && rows.length >= 2,
    };
  }
  function recommend(input, history = [], performance) {
    const modes = Object.keys(MODES),
      recent = history.filter((h) => Object.hasOwn(MODES, h.mode)).slice(-6),
      counts = Object.fromEntries(
        modes.map((m) => [m, recent.filter((h) => h.mode === m).length]),
      );
    let mode = "editorial",
      reason =
        "사진의 실제 내용은 자동 판독하지 않습니다. 공간 중심의 기본 구성을 제안합니다.";
    if (input.works?.length || input.photoKind === "process") {
      mode = "craft";
      reason =
        "선택한 작업 또는 사용자가 지정한 시공 과정 사진을 근거로 추천합니다.";
    } else if (
      input.photoKind === "detail" ||
      (input.product?.size && input.product?.material)
    ) {
      mode = "product";
      reason =
        "소재 근접 사진 지정 또는 입력된 제품 규격·소재를 근거로 추천합니다.";
    } else if (performance?.sufficient) {
      const top = [...performance.rows].sort(
        (a, b) =>
          b.followers / b.count - a.followers / a.count ||
          b.leads / b.count - a.leads / a.count,
      )[0];
      mode = top.mode;
      reason = `기록된 ${top.count}개 ${MODES[mode]} 게시물의 평균 신규 팔로워 ${Number((top.followers / top.count).toFixed(1))}명, 상담 합계 ${top.leads}건을 참고했습니다. 미래 성과 예측이 아닙니다.`;
    } else if (recent.length >= 2) {
      mode = modes.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
      reason =
        "최근 게시 이력에서 덜 사용한 구성을 추천합니다. 성과 표본이 부족해 성과 순위는 만들지 않습니다.";
    }
    return { mode, reason };
  }
  function create(input, history = [], sequence = 0) {
    const p=normalProduct(input.product),mode=Object.hasOwn(MODES,input.mode)?input.mode:'editorial';
    const neutral=p.category==='마감재',wall=p.type==='wall',surface=neutral?'소재':wall?'벽면':'바닥',name=label(p),place=clean(input.region)||clean(input.site),memo=clean(input.memo);
    const works=(input.works||[]).filter(w=>WORKS.includes(w)),count=Math.max(3,Math.min(6,Number(input.count)||5));
    const specs=facts(p),features=p.verified&&p.source?clean(p.features):'',source=clean(input.contact);
    const inquiry=`지역과 현장 사진, 마음에 드는 ${neutral?'소재':wall?'벽장재':'마루'}를 알려주세요. 원하는 분위기와 시공 조건을 함께 살펴보겠습니다.${source?'\n상담 연결: '+source:''}`;
    const banks={
      editorial:['가구를 들이기 전, 집의 분위기를 고르는 일','좋아하는 가구가 어울릴 배경을 고릅니다','오래 머물 집이라면, 바닥부터 천천히','사진 속 이 분위기, 우리 집에도 어울릴까요','문을 열고 들어왔을 때, 어떤 집이고 싶나요','바닥은 매일 보는 집의 가장 큰 배경입니다','마음에 드는 집에는, 마음에 드는 바닥이 있습니다','우리 집의 첫인상, 어디에서 시작할까요'],
      product:['좋아 보이는 소재에서, 우리 집에 맞는 소재로','사진에서 마음에 든 이유를, 제품 정보로 확인하세요','{PRODUCT}, 이름 다음에 살펴볼 것들','컬러만 고르기 전에, 규격도 함께 보세요','우리 집 가구와 함께 놓고 보는 바닥','같은 제품도, 우리 집의 빛에서 다시 보세요','취향을 정했다면, 소재의 크기를 확인할 차례','바닥을 고를 때, 사진 옆에 두어야 할 정보'],
      craft:['마루가 끝나는 자리까지, 보고 결정하세요','전체 사진 다음에는, 연결되는 자리를 봅니다','시공을 맡기기 전, 꼭 보고 싶은 부분들','무슨 작업을 했는지, 사진과 함께 확인하세요','집의 분위기와 마감, 둘 다 보고 고르세요','제품을 고른 다음, 현장의 조건을 살펴봅니다','마음에 든 공간에서, 한 걸음 더 가까이','시공 결과를 볼 때, 어디까지 살펴보시나요'],
      question:['사진 속 이 마루, 우리 집에도 어울릴까요','우리 집 가구에는 어떤 바닥이 어울릴까요','사진과 실제 색이 다르게 느껴지는 이유','마음에 든 바닥, 상담할 때 무엇을 보내면 될까요','바닥 사진 한 장으로, 제품을 결정해도 될까요','색을 고른 다음에는 무엇을 확인할까요','집마다 다른 조건, 상담 전에 같이 볼까요','내 집에 놓일 소재, 어디서부터 고를까요']
    };
    for(const key of Object.keys(banks))banks[key]=banks[key].map(t=>neutral?t.replaceAll('바닥','소재').replaceAll('마루','소재'):wall?t.replaceAll('바닥','벽면').replaceAll('마루','벽장재'):t).map(t=>t.replaceAll('{PRODUCT}',name));
    const leads={
      editorial:wall?'가구를 더하기 전에, 그 뒤에 놓일 벽을 떠올려 보세요. 벽의 색과 표면은 집 안의 물건들이 보이는 배경이 됩니다.':'소파를 고를 때, 그 아래에 놓일 바닥도 함께 떠올려 보세요. 바닥의 색과 결은 가구와 나란히 집의 인상을 만듭니다.',
      product:`마음에 든 사진을 저장했다면, ${surface}의 제품명과 규격도 함께 살펴보세요. 색상 이름만으로 결정하기보다 주변 마감과 실제 샘플을 함께 비교하면 선택이 구체적이 됩니다.`,
      craft:`${surface}의 전체 모습과 주변 마감이 만나는 자리를 함께 살펴보세요. 원하는 마감의 모습을 현장 사진과 함께 이야기하면 상담의 기준도 구체적이 됩니다.`,
      question:`Q. 사진 속 ${neutral?'소재':wall?'벽장재':'마루'}를 우리 집에 사용해도 같은 느낌일까요?\nA. 채광과 주변 마감, 보는 화면에 따라 색의 인상이 달라질 수 있습니다. 마음에 든 사진과 우리 집 사진을 함께 놓고, 실제 샘플로 확인해 보세요.`
    };
    if(neutral)leads.editorial='좋아하는 가구와 함께 놓일 소재를 떠올려 보세요. 집 전체의 분위기는 소재와 가구가 함께 만듭니다.';
    const productLine=[place?`${place} 현장의 선택`:'이번 공간의 선택',p.model?name:`제품군: ${p.category}`,p.size&&`규격: ${p.size}`,p.color&&`색상: ${p.color}`,p.material&&`소재: ${p.material}`,p.pack&&`박스 구성: ${p.pack}`,p.coverage&&`박스 면적: ${p.coverage}`,features].filter(Boolean).join('\n');
    const workLine=works.length?`이 현장에서 진행한 작업: ${works.join(' · ')}.`:'';
    const trust=neutral?'주변 마감과 만나는 부분도 함께 살펴보세요. 구체적인 시공 범위는 현장의 상태를 확인해 안내합니다.':wall?'벽장재와 주변 마감이 만나는 부분도 함께 살펴보세요. 구체적인 시공 범위는 현재 현장의 상태를 확인해 안내합니다.':'마루와 주변 마감이 만나는 부분도 함께 살펴보세요. 구체적인 시공 범위는 현재 현장의 상태를 확인해 안내합니다.';
    const recent=history.slice(-30),candidates=[];
    for(let attempt=0;attempt<banks[mode].length;attempt++){
      const n=(sequence+attempt)%banks[mode].length,opening=banks[mode][n];
      const caption=[opening,leads[mode],memo,productLine,workLine,(mode==='craft'||mode==='question')?trust:'',inquiry,`청인마루\n${SLOGAN}`].filter(Boolean).join('\n\n');
      const overlap=Math.max(0,...recent.map(h=>Math.max(similarity(opening,h.title,p),similarity(caption,h.caption,p))));
      candidates.push({opening,caption,n,overlap,attempt});
    }
    candidates.sort((a,b)=>a.overlap-b.overlap||a.attempt-b.attempt);const chosen=candidates[0];
    const titles=[chosen.opening];
    for(let step=1;step<=banks[mode].length&&titles.length<3;step++){
      const title=banks[mode][(chosen.n+step)%banks[mode].length];
      if(!recent.some(h=>normalText(h.title,p)===normalText(title,p)))titles.push(title);
    }
    for(const title of banks[mode])if(titles.length<3&&!titles.includes(title))titles.push(title);
    const invitation=neutral?'이 분위기, 우리 집에도 어울릴까요?':wall?'이 분위기, 우리 집의 벽에도 어울릴까요?':'이 분위기, 우리 집의 바닥에도 어울릴까요?';
    const allCards=[
      {role:'초대',text:titles[0],kicker:neutral?'소재를 고르는 일':wall?'벽을 고르는 일':'바닥을 고르는 일',detail:'청인마루 · '+SLOGAN,photo:1,layout:'cover'},
      {role:'공간',text:neutral?'가구와 함께 놓고 보는 소재':wall?'가구와 함께 놓고 보는 벽의 색':'가구와 함께 놓고 보는 바닥의 색',kicker:'살고 싶은 공간',detail:place||'',photo:2,layout:'quiet'},
      {role:'제품',text:name,kicker:'이 공간의 선택',detail:[p.size,p.color].filter(Boolean).join(' · '),photo:3,layout:'material'},
      {role:works.length?'시공':'선택 기준',text:works.length?works.join(' · '):neutral?'주변 마감과 만나는 자리까지':wall?'벽면이 만나는 자리까지':'마루가 끝나는 자리까지',kicker:works.length?'실제 진행한 작업':'함께 살펴볼 기준',detail:works.length?workLine:trust,photo:4,layout:'evidence'},
      {role:'문의',text:invitation,kicker:'우리 집을 위한 상담',detail:inquiry,photo:1,layout:'invitation'}
    ];
    let cards=count===3?[allCards[0],allCards[2],allCards[4]]:count===4?[allCards[0],allCards[2],allCards[3],allCards[4]]:allCards;
    if(count===6)cards.splice(4,0,{role:'현장 메모',text:memo||`우리 집의 ${surface}, 사진과 샘플로 함께 고르세요`,kicker:'선택을 구체적으로',detail:features||[p.size,p.color].filter(Boolean).join(' · '),photo:5,layout:'note'});
    cards=cards.map(c=>({...c,photo:Math.min(c.photo,input.photoCount||4)}));
    const tags=['청인마루',p.category,wall?'벽장재시공':'마루시공',p.brand,place?place.replace(/[^\p{L}\p{N}]/gu,'')+'인테리어':''].filter(Boolean).map(t=>'#'+t.replace(/\s/g,''));
    const blog=[[place,name,wall?'벽장재 시공':'마루 시공'].filter(Boolean).join(' '),titles[0],leads[mode],memo,'이 공간에 사용한 제품\n'+productLine,works.length?'실제로 진행한 작업\n'+workLine:'제품을 고를 때 함께 볼 것\n'+trust,'사진을 보는 순서\n전체 공간 → 가구와 소재의 관계 → 제품 정보 → 주변 마감과 만나는 부분','우리 집에 적용하고 싶다면\n'+inquiry,`청인마루 · ${SLOGAN}`].filter(Boolean).join('\n\n');
    return {mode,product:structuredClone(p),works,sequence,titles,selectedTitle:0,caption:chosen.caption,carousel:cards,hook:titles[0],script:cards.map((c,i)=>`${i*3}–${(i+1)*3}초 · 사진 ${c.photo}\n${c.text}`).join('\n\n'),story:titles[0]+'\n'+name+'\n'+SLOGAN,hashtags:[...new Set(tags)].join(' '),comment:inquiry,blog,shorts:titles[0]+' #Shorts\n'+name+'\n'+inquiry,kakao:[invitation,name,p.size,inquiry].filter(Boolean).join('\n'),maxSimilarity:chosen.overlap,copyVersion:2,series:neutral?'청인마루 · 소재를 고르는 일':wall?'청인마루 · 벽을 고르는 일':'청인마루 · 바닥을 고르는 일',warnings:[!p.model?'모델 정보가 없어 제품군만 사용했습니다.':'',p.features&&!features?'미확인 특징은 문구에서 제외했습니다.':'',!works.length?'선택한 특이 작업이 없어 작업 수행 문장을 넣지 않았습니다.':'',chosen.overlap>.65?'최근 문구와 유사도가 높습니다. 원고를 검토하세요.':''].filter(Boolean)};
  }

  return {
    SLOGAN,
    MODES,
    WORKS,
    TYPES,
    normalProduct,
    resolveProduct,
    identity,
    label,
    facts,
    parseCSV,
    csvTemplate,
    similarity,
    stats,
    recommend,
    create,
  };
});
