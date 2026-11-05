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
      material: clean(raw.material),
      features: clean(raw.features),
      source: clean(raw.source),
      verified: raw.verified === true,
    };
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
    return [p.brand, p.model || p.category].filter(Boolean).join(" ");
  }
  function facts(p) {
    return [
      p.brand && `브랜드: ${p.brand}`,
      p.model && `모델: ${p.model}`,
      p.size && `규격: ${p.size}`,
      p.color && `색상: ${p.color}`,
      p.material && `소재: ${p.material}`,
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
    for (const x of [p?.brand, p?.model, p?.category])
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
    const p = normalProduct(input.product),
      mode = Object.hasOwn(MODES, input.mode) ? input.mode : "editorial",
      works = (input.works || []).filter((w) => WORKS.includes(w)),
      count = Math.max(3, Math.min(6, Number(input.count) || 5)),
      wall = p.type === "wall",
      surface = wall ? "벽면" : "바닥",
      name = label(p),
      place = clean(input.region) || clean(input.site),
      memo = clean(input.memo),
      specs = facts(p),
      verifiedFeatures = p.verified && p.source ? clean(p.features) : "",
      source = clean(input.contact),
      inquiry = source
        ? `시공 상담은 ${source}에서 안내합니다.`
        : "시공 상담 시 현장 사진과 원하는 소재를 함께 알려주세요.";
    const hooks = {
      editorial: [
        `${surface}에서 시작하는 공간의 인상`,
        `공간을 바라보는 또 하나의 시선`,
        `${name}, 일상의 배경이 되다`,
        `사진으로 남긴 ${surface}의 표정`,
        `소재와 공간 사이의 균형`,
        `오래 바라보고 싶은 공간의 기록`,
        `가까이서 만나는 ${name}`,
        `${place || "오늘의 공간"}의 소재 기록`,
      ],
      product: [
        `${name}를 살펴볼 때 확인할 것`,
        `규격과 색상으로 읽는 ${name}`,
        `${surface} 소재 선택을 위한 기록`,
        `${name}의 제품 정보를 정리했습니다`,
        `공간에 맞는 ${surface} 선택의 기준`,
        `사진과 함께 확인하는 ${name}`,
        `소재를 고르기 전, 제품 정보부터`,
        `${name}를 차분히 들여다봅니다`,
      ],
      craft: [
        `${surface} 시공, 확인한 작업을 기록하다`,
        `현장에 남긴 ${surface}의 디테일`,
        `${name} 시공 현장 노트`,
        `사진과 사실로 전하는 시공 기록`,
        `공간을 완성하는 작업의 순서`,
        `눈에 보이는 마감, 기록하는 이유`,
        `시공 사진에서 확인할 부분`,
        `${surface}를 다루는 현장의 기록`,
      ],
      question: [
        `${name}, 무엇부터 확인하면 좋을까요`,
        `${surface} 소재를 고를 때 묻는 질문`,
        `우리 공간에 맞는 ${name} 선택법`,
        `제품 규격은 어디에서 확인할까요`,
        `사진만으로 알 수 있는 것과 없는 것`,
        `시공 전 어떤 정보를 준비할까요`,
        `${surface} 선택 전에 함께 확인할 내용`,
        `${name} 상담을 위한 작은 안내`,
      ],
    };
    hooks.product = hooks.product.filter(
      (t) => !t.includes("규격과 색상") || (p.size && p.color),
    );
    const recent = history.slice(-30),
      variants = [];
    for (let attempt = 0; attempt < 64; attempt++) {
      const n = (sequence + attempt) % hooks[mode].length,
        opening = hooks[mode][n],
        space = (
          place
            ? [
                `${place}의 ${surface} 시공 사진을 기록합니다.`,
                `${place}, ${surface}를 중심으로 현장을 살펴봅니다.`,
                `${surface}와 함께 담은 ${place}의 시공 기록입니다.`,
                `${place}에서 남긴 ${surface} 사진을 차분히 모았습니다.`,
              ]
            : [
                `이번 ${surface} 시공 사진을 소개합니다.`,
                `${surface}를 중심으로 현장의 모습을 기록했습니다.`,
                `소재를 선택할 때 참고할 ${surface} 시공 사진입니다.`,
                `사진으로 전하는 ${surface} 시공 현장의 기록입니다.`,
              ]
        )[Math.floor((sequence + attempt) / 8) % 4],
        productLine = specs.length
          ? mode === "product" || mode === "question"
            ? `${name}의 제품 정보입니다.\n${specs.join("\n")}`
            : [
                `사용 제품은 ${name}입니다.`,
                [
                  p.size && "규격 " + p.size,
                  p.color && "색상 " + p.color,
                  p.material && "소재 " + p.material,
                ]
                  .filter(Boolean)
                  .join(" / "),
                verifiedFeatures,
              ]
                .filter(Boolean)
                .join("\n")
          : `선택한 제품군은 ${p.category}입니다. 모델과 세부 규격은 확인 후 안내합니다.`,
        workLine = works.length
          ? `이 현장에서 확인한 작업은 ${works.join(" · ")}입니다.`
          : "",
        memoLine = memo ? `현장 기록: ${memo}` : "",
        trust = [
          "소재를 고를 때는 제품 정보와 현장 조건을 함께 살펴봅니다.",
          "제품 표기와 실제 현장 조건을 구분해 안내합니다.",
          "시공 범위는 현장 상태를 확인한 뒤 안내합니다.",
          "상담에서는 원하는 소재와 현재 마감 상태를 함께 확인합니다.",
        ][Math.floor((sequence + attempt) / 2) % 4],
        qa = `Q. ${wall ? "벽장재" : "바닥재"} 선택 전에 무엇을 확인해야 할까요?\nA. 제품의 모델과 규격, 원하는 색상을 먼저 확인하고 현장 사진과 함께 시공 조건을 살펴보세요.`,
        sections =
          mode === "product"
            ? [productLine, space, memoLine, workLine]
            : mode === "craft"
              ? [space, workLine, memoLine, productLine]
              : mode === "question"
                ? [qa, productLine, memoLine, workLine]
                : [space, memoLine, productLine, workLine];
      if ((sequence + attempt) % 2 === 1 && mode !== "question")
        sections.reverse();
      const caption = [
        opening,
        ...sections.filter(Boolean),
        mode === "craft" ||
        mode === "question" ||
        (sequence + attempt) % 3 === 0
          ? trust
          : "",
        mode === "question" || (sequence + attempt) % 2 === 0 ? inquiry : "",
        `청인마루 · ${SLOGAN}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const overlap = Math.max(
        0,
        ...recent.map((h) =>
          Math.max(
            similarity(opening, h.title, p),
            similarity(caption, h.caption, p),
          ),
        ),
      );
      variants.push({
        opening,
        caption,
        n,
        overlap,
        attempt,
        space,
        productLine,
        workLine,
        memoLine,
        trust,
      });
    }
    variants.sort((a, b) => a.overlap - b.overlap || a.attempt - b.attempt);
    const chosen = variants[0],
      titleChoices = [chosen.opening];
    for (
      let step = 1;
      step <= hooks[mode].length && titleChoices.length < 3;
      step++
    ) {
      const candidate = hooks[mode][(chosen.n + step) % hooks[mode].length];
      if (
        !recent.some((h) => normalText(h.title, p) === normalText(candidate, p))
      )
        titleChoices.push(candidate);
    }
    for (const candidate of hooks[mode])
      if (titleChoices.length < 3 && !titleChoices.includes(candidate))
        titleChoices.push(candidate);
    const { space, productLine, workLine, memoLine, trust } = chosen;
    const cards = [
      { role: "공간", text: titleChoices[0], photo: 1 },
      {
        role: "제품",
        text: [name, p.size, p.color].filter(Boolean).join(" · "),
        photo: Math.min(2, input.photoCount || 4),
      },
    ];
    if (works.length)
      cards.push({ role: "시공", text: works.join(" · "), photo: 3 });
    else if (verifiedFeatures)
      cards.push({ role: "확인된 특징", text: verifiedFeatures, photo: 3 });
    else
      cards.push({
        role: "선택 기준",
        text: wall
          ? "벽면과 주변 마감의 조화를 살펴보세요"
          : "전체 공간과 소재의 조화를 살펴보세요",
        photo: 3,
      });
    if (count > 3)
      cards.push({
        role: "현장 기록",
        text: memo || `${surface}의 전체 모습과 가까운 디테일`,
        photo: 4,
      });
    if (count > 4)
      cards.push({
        role: "신뢰",
        text: trust,
        photo: Math.min(5, input.photoCount || 4),
      });
    if (count > 5)
      cards.push({
        role: "문의",
        text: source ? inquiry : `청인마루 · ${SLOGAN}`,
        photo: Math.min(6, input.photoCount || 4),
      });
    const tags = [
      "청인마루",
      p.category,
      wall ? "벽장재시공" : "마루시공",
      "시공기록",
      p.brand,
      place ? place.replace(/[^\p{L}\p{N}]/gu, "") + "인테리어" : "",
    ]
      .filter(Boolean)
      .map((t) => "#" + t.replace(/\s/g, ""));
    const blog = [
      `${place ? place + " " : ""}${name} 시공 기록`,
      space,
      memoLine,
      "제품 정보",
      productLine,
      works.length
        ? "확인한 현장 작업\n" + workLine
        : "사진을 살펴보는 순서\n전체 공간과 소재의 디테일을 차례로 비교해 보세요.",
      "상담 전 준비할 내용\n현장 사진, 대략의 면적, 기존 마감 상태, 원하는 자재와 일정을 정리하면 상담에 도움이 됩니다. 실제 시공 범위와 비용은 현장 조건을 확인한 후 안내합니다.",
      trust,
      inquiry,
      `청인마루 · ${SLOGAN}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      mode,
      product: structuredClone(p),
      works,
      sequence,
      titles: titleChoices,
      selectedTitle: 0,
      caption: chosen.caption,
      carousel: cards,
      hook: titleChoices[1],
      script: cards
        .map((c, i) => `${i * 3}–${(i + 1) * 3}초 · 사진 ${c.photo}\n${c.text}`)
        .join("\n\n"),
      story: `${place ? place + "의 " : ""}${name} 시공 기록\n${titleChoices[0]}\n청인마루 · ${SLOGAN}`,
      hashtags: [...new Set(tags)].join(" "),
      comment: inquiry,
      blog,
      shorts: `${titleChoices[1]} #Shorts\n${name} 시공 사진 기록\n${inquiry}`,
      kakao: `${titleChoices[0]}\n${name}의 공간 기록을 소개합니다.\n${inquiry}`,
      maxSimilarity: chosen.overlap,
      warnings: [
        !p.model ? "모델 정보가 없어 제품군만 사용했습니다." : "",
        p.features && !verifiedFeatures
          ? "미확인 특징은 문구에서 제외했습니다."
          : "",
        !works.length
          ? "선택한 특이 작업이 없어 작업 수행 문장을 넣지 않았습니다."
          : "",
        chosen.overlap > 0.65
          ? "최근 문구와 유사도가 높습니다. 사실 정보는 유지하되 제목·본문을 검토하세요."
          : "",
      ].filter(Boolean),
    };
  }
  return {
    SLOGAN,
    MODES,
    WORKS,
    TYPES,
    normalProduct,
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
