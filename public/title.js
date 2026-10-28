// 封面 / 選角畫面的背景：夜晚的紐約天際線（帝國大廈、克萊斯勒、世貿一號、水塔、亮燈的窗）。
(function () {
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const INK = '#0a0b1a';

  function windows(x, y, w, h, r, density, step = [15, 21]) {
    let out = '';
    const [sx, sy] = step;
    for (let wx = x + 8; wx + 8 < x + w; wx += sx) {
      for (let wy = y + 12; wy + 12 < y + h; wy += sy) {
        const v = r();
        if (v < density) out += `<rect x="${wx}" y="${wy}" width="7" height="10" fill="${r() < 0.82 ? '#ffd36b' : '#9be4ff'}" opacity="${(0.65 + r() * 0.35).toFixed(2)}"/>`;
      }
    }
    return out;
  }

  function skyline({ extra = '' } = {}) {
    const r = rng(20261027);
    let s = `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="夜晚的紐約天際線">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b24"/><stop offset=".55" stop-color="#27195a"/><stop offset="1" stop-color="#8a3f73"/></linearGradient>
      <radialGradient id="moonGlow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".55"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
      <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.5" fill="#fff" opacity=".07"/></pattern>
    </defs>
    <rect x="-900" width="2800" height="700" fill="url(#sky)"/><rect x="-900" width="2800" height="700" fill="url(#dots)"/>`;
    for (let i = 0; i < 70; i++) s += `<circle cx="${(r() * 1000).toFixed(0)}" cy="${(r() * 360).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.25 + r() * 0.7).toFixed(2)}"/>`;
    s += `<circle cx="830" cy="130" r="120" fill="url(#moonGlow)"/><circle cx="830" cy="130" r="46" fill="#fff0bd" stroke="${INK}" stroke-width="4"/>
      <circle cx="816" cy="118" r="9" fill="#e6d49a"/><circle cx="846" cy="144" r="6" fill="#e6d49a"/><circle cx="838" cy="108" r="4" fill="#e6d49a"/>`;

    // 遠景（淡藍剪影）
    let x = -10;
    while (x < 1010) { const w = 34 + r() * 46, h = 110 + r() * 190; s += `<rect x="${x.toFixed(0)}" y="${(640 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#2a2f66"/>${windows(x, 640 - h, w, h, r, 0.1)}`; x += w + 2; }

    // 地標
    // 世貿一號（左）
    s += `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <polygon points="150,640 150,330 186,226 222,330 222,640" fill="#1b2150"/>
      <polygon points="186,226 222,330 222,640 186,640" fill="#12183c"/>
      <line x1="186" y1="226" x2="186" y2="110"/><circle cx="186" cy="108" r="4" fill="#ff5a5f"/></g>
      ${[...Array(10)].map((_, i) => `<line x1="154" y1="${350 + i * 28}" x2="220" y2="${350 + i * 28}" stroke="#4b5aa8" stroke-width="2" opacity=".5"/>`).join('')}`;
    // 克萊斯勒（中左）
    s += `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <rect x="400" y="320" width="82" height="320" fill="#1b2150"/><rect x="412" y="270" width="58" height="52" fill="#232b66"/>
      <path d="M416,270 Q441,190 466,270Z" fill="#c9d3ee"/><path d="M424,258 Q441,208 458,258" fill="none" stroke="#7f8fc4" stroke-width="3"/><path d="M431,246 Q441,218 451,246" fill="none" stroke="#7f8fc4" stroke-width="3"/>
      <line x1="441" y1="196" x2="441" y2="150"/></g><circle cx="441" cy="228" r="26" fill="#ffe9a8" opacity=".12"/>`;
    // 帝國大廈（中右）
    s += `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <rect x="600" y="400" width="130" height="240" fill="#1b2150"/><rect x="620" y="340" width="90" height="62" fill="#1f275c"/>
      <rect x="634" y="290" width="62" height="52" fill="#232b66"/><rect x="646" y="244" width="38" height="48" fill="#27306f"/>
      <rect x="654" y="206" width="22" height="40" fill="#2b3578"/><polygon points="658,206 665,160 672,206" fill="#2f3b82"/>
      <line x1="665" y1="160" x2="665" y2="92"/></g>
      <circle cx="665" cy="206" r="40" fill="#ffd36b" opacity=".18"/><circle cx="665" cy="92" r="4.5" fill="#ff5a5f"/>
      <rect x="655" y="212" width="20" height="30" fill="#ffe08a" opacity=".85"/><rect x="647" y="250" width="36" height="36" fill="#ffe08a" opacity=".55"/>
      ${windows(600, 400, 130, 240, r, 0.45)}${windows(620, 340, 90, 60, r, 0.4)}`;

    // 近景大樓（黑色粗框）
    const near = [[-20, 210, 120], [96, 70, 205], [226, 90, 160], [330, 64, 240], [492, 96, 190], [734, 82, 230], [818, 120, 170], [940, 90, 215]];
    for (const [bx, bw, bh] of near) {
      const by = 700 - bh;
      s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh + 30}" fill="#141836" stroke="${INK}" stroke-width="4"/>${windows(bx, by, bw, bh, r, 0.38)}`;
    }
    // 屋頂水塔（紐約招牌）
    const tower = (tx, ty) => `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round"><line x1="${tx - 12}" y1="${ty}" x2="${tx - 12}" y2="${ty + 26}"/><line x1="${tx + 12}" y1="${ty}" x2="${tx + 12}" y2="${ty + 26}"/>
      <rect x="${tx - 16}" y="${ty - 28}" width="32" height="30" rx="3" fill="#6b4a36"/><polygon points="${tx - 18},${ty - 28} ${tx},${ty - 44} ${tx + 18},${ty - 28}" fill="#4a3426"/></g>`;
    s += tower(310, 700 - 160) + tower(510, 700 - 190) + tower(866, 700 - 170);

    // 前景屋頂
    s += `<rect x="-900" y="640" width="2800" height="70" fill="#0d0f24" stroke="${INK}" stroke-width="5"/><rect x="-900" y="640" width="2800" height="10" fill="#1d2146"/>`;
    s += extra + '</svg>';
    return s;
  }

  window.Title = { skyline };
})();
