// 雙語文字：T('中文', 'English') 產生 { zh, en }；伺服器送畫面給玩家前，用 loc() 換成那位玩家選的語言。
const T = (zh, en) => ({ zh, en: en === undefined ? zh : en });
const isT = (x) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 2 && typeof x.zh === 'string' && typeof x.en === 'string';
function loc(x, lang) {
  if (isT(x)) return lang === 'en' ? x.en : x.zh;
  if (Array.isArray(x)) return x.map((v) => loc(v, lang));
  if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = loc(x[k], lang); return o; }
  return x;
}
module.exports = { T, loc, isT };
