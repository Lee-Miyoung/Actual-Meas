/* Portable, credential-free ChatGPT -> studio production handoff. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CheonginBrandKit = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const platforms = ["carousel", "naver", "naverCover", "kakao", "kakaoWide", "youtube", "youtubeCover", "story", "reels", "shorts"];
  function parse(text) {
    if (typeof text !== "string" || text.length > 50000) throw Error("제작 설정은 50,000자 이하로 입력하세요.");
    const value = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    if (value.schema !== "cheonginmaru-production-v1") throw Error("청인마루 제작 설정 형식을 확인하세요.");
    const string = (input, max, label) => {
      if (typeof input !== "string" || input.length > max) throw Error(label + " 입력을 확인하세요.");
      return input.trim();
    };
    if (!Array.isArray(value.slides) || value.slides.length < (value.signaturePackage?1:3) || value.slides.length > (value.signaturePackage?16:6)) throw Error("사진별 문구는 3~6개가 필요합니다.");
    const slides = value.slides.map((slide) => {
      const result = { title: string(slide.title, 100, "제목"), photo: string(slide.photo || "", 200, "사진 파일명") };
      if (slide.layout !== undefined) {
        if (!["auto", "photo", "pair"].includes(slide.layout)) throw Error("사진 종류를 확인하세요.");
        result.layout = slide.layout;
      }
      if (slide.focus !== undefined) {
        if (typeof slide.focus !== "number" || !Number.isFinite(slide.focus) || slide.focus < 0 || slide.focus > 1) throw Error("사진 구도를 확인하세요.");
        result.focus = slide.focus;
      }
      return result;
    });
    const captions = {};
    for (const [platform, caption] of Object.entries(value.captions || {})) {
      if (!platforms.includes(platform)) throw Error("지원하지 않는 플랫폼입니다.");
      captions[platform] = string(caption, 10000, "설명글");
    }
    const format = value.format || "carousel";
    if (!platforms.includes(format)) throw Error("출력 플랫폼을 확인하세요.");
    let signaturePackage;
    if(value.signaturePackage){
      const pack=value.signaturePackage,core=globalThis.SignatureCore;if(!core)throw Error('시그니처 설정을 불러온 뒤 다시 시도하세요.');
      core.validate(pack.design);if(!Array.isArray(pack.photos)||pack.photos.length>30||!Array.isArray(pack.sequence)||pack.sequence.length!==slides.length)throw Error('시그니처 사진 구성 형식 오류');
      if(pack.photos.some(p=>typeof p.name!=='string'||p.name.length>200)||pack.sequence.some(s=>!Array.isArray(s.photoNames)||s.photoNames.some(n=>typeof n!=='string'||!pack.photos.some(p=>p.name===n))))throw Error('시그니처 사진 연결 오류');
      signaturePackage=pack;
    }
    return { ...(signaturePackage?{signaturePackage}:{}),schema: value.schema, format, product: string(value.product || "", 150, "제품명"), size: string(value.size || "", 200, "규격"), slides, captions };
  }
  function dimensions(preset, width, height) {
    if (!preset.natural) return [preset.width, preset.height];
    const scale = Math.min(1, 1600 / Math.max(width, height));
    return [Math.round(width * scale), Math.round(height * scale)];
  }
  return { platforms, parse, dimensions };
});
