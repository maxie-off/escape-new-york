// 場景 3 的畫面與互動：機場。
//   開場（兩人同畫面）：大廳 → 兩人走進來 → 廣播 → 警察衝進來 → Raccoony：「我們去幫忙把炸彈拆除吧！」Slothy：「嗯，一起去抓犯人吧！」→ 各自的畫面。
//   A（Raccoony）視角 0：大廳 + 航班看板（今天日期、8 個航班）；視角 1：電腦分割畫面（左：旅遊貼文；右：terminal）。
//   B（Slothy）視角 0：和警察圍著打開的行李箱（點開看內容物：雜物裡信用卡、衣物、小物比較明顯）＋「選擇登機口」；視角 1：電腦 terminal（圖形題目）。
// 只負責「畫」和「把操作變成 action」；正確答案由伺服器判定。
(function () {
  const A = window.Art;
  const INK = A.INK;
  const ST = A.st(4);
  const ST2 = A.st(2.5);
  const FONT = A.FONT;
  const HELV = A.SIGN;
  const MONO = A.MONO;
  const GRN = '#39ff6a', GRN2 = '#1f9e44', TBG = '#040a06';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PA_TEXT = '緊急狀況，機場收到炸彈客預警通知，機場收到炸彈客預警通知，請乘客不要慌張，警察還在調查中。';
  const PA_EN = 'Attention please. The airport has received a bomb threat. Please stay calm. The police are investigating.';
  const LINE_R = () => tr('我們去幫忙把炸彈拆除吧！', 'Let’s go help defuse the bomb!');
  const LINE_S = () => tr('嗯，一起去抓犯人吧！', 'Yeah, let’s catch the culprit together!');
  const T_R = 10600, T_S = 13200, T_BOMB = 15200, INTRO_MS = 18600;
  const BOMB_LINE = () => tr('💣 炸彈開始倒數了！只剩 10 分鐘！！', '💣 The bomb starts ticking! Only 10 minutes left!!');

  const fresh = () => ({ modal: null, gate: '', view: 0, seen: {}, pendingAir: null, saidHack: false });
  let ui = fresh();
  let introDone = false, introStarted = false, introTimers = [];
  let ctx = null, data = null, box = null;
  let tAt = 0, timeoutSent = false, unlockDrawn = false, ticker = 0;
  let bombAt = 0, bombOn = false, boomSent = false, lastBoom = null, booming = false, boomTimer = 0;
  const $modal = () => document.getElementById('modal');
  const SVG_OPEN = (label) => `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="${label}">`;
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---------- 共用：機場大廳背景（參考 JFK 航廈：白色挑高天花板、淺色地板、報到機台、黃色指標） ----------
  function lightsAndCeiling() {
    const spots = Array.from({ length: 11 }, (_, i) => `${i % 3 === 1 ? A.lightGlow(30 + i * 96, 44 + i * 3, 150, 120, 0.045) : ''}<ellipse cx="${30 + i * 96}" cy="${38 + i * 3}" rx="30" ry="9" fill="#f3ecc8" ${A.st(2)}/>`).join('');
    return `<rect x="-900" width="2800" height="700" fill="#3b424d"/>
      <rect x="-900" y="96" width="2800" height="340" fill="#505967"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${-40 + i * 80},120 V436" stroke="#444c59" stroke-width="2"/><path d="M${-38 + i * 80},120 V436" stroke="#5d6675" stroke-width="1"/>`).join('')}<rect x="-900" y="96" width="2800" height="340" fill="url(#gWallShade)"/>
      <rect x="330" y="120" width="300" height="250" fill="#3a414d" ${A.st(2)}/>
      ${[0, 1, 2].map((i) => `<rect x="${345 + i * 95}" y="136" width="82" height="218" fill="#262c36" ${A.st(2)}/>`).join('')}
      <polygon points="-900,-10 1900,-10 1900,70 -900,130" fill="#2b2f37" ${ST}/>
      <polygon points="-900,130 1900,70 1900,92 -900,152" fill="#20242b" ${ST2}/>
      ${spots}
      <rect x="150" y="84" width="46" height="352" fill="#566b66" ${ST}/><rect x="780" y="76" width="46" height="360" fill="#566b66" ${ST}/>
      <rect x="150" y="84" width="46" height="26" fill="#3b4a46" ${ST2}/><rect x="780" y="76" width="46" height="26" fill="#3b4a46" ${ST2}/>`;
  }
  // 整體壓暗 + 暗角（鐵灰、陰沉的感覺，像地鐵站）
  function dim() {
    return `<defs><radialGradient id="dimv" cx="50%" cy="50%" r="72%"><stop offset=".35" stop-color="#0a0d12" stop-opacity=".15"/><stop offset="1" stop-color="#0a0d12" stop-opacity=".72"/></radialGradient></defs>
      <rect x="-900" width="2800" height="700" fill="url(#dimv)" style="pointer-events:none"/>`;
  }
  // 地板：跟地鐵站共用的拋光地磚
  const floor = () => A.tileFloor(436, { lights: [126, 414, 702], reflect: 0.045 }) + `<rect x="-900" y="436" width="2800" height="10" fill="#5d646e"/>`;
  // 報到機台：白色底座 + 藍色底光 + 斜放螢幕
  function kiosk(x, y, s = 1, screen = '#3a8cff') {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <rect x="-26" y="-70" width="52" height="70" rx="8" fill="#aab0bb" ${ST2}/>
      <polygon points="-22,-76 22,-76 28,-52 -28,-52" fill="#2b3040" ${ST2}/><polygon points="-18,-72 18,-72 22,-56 -22,-56" fill="${screen}" opacity=".9"/>
      <rect x="-26" y="-6" width="52" height="8" rx="3" fill="#6fa8ff" opacity=".9"/>
      <ellipse cx="0" cy="8" rx="34" ry="8" fill="#6fa8ff" opacity=".25"/>
    </g>`;
  }
  function counters() {
    const desks = [0, 1, 2, 3].map((i) => {
      const x = 60 + i * 235;
      return `<g>
        <rect x="${x + 70}" y="130" width="64" height="48" rx="5" fill="#c9701a" ${ST2}/><text x="${x + 102}" y="166" text-anchor="middle" font-size="32" fill="#fff" ${HELV}>${i + 1}</text>
        <rect x="${x + 98}" y="178" width="8" height="120" fill="#8b93a3"/>
        <rect x="${x}" y="338" width="200" height="104" rx="8" fill="#9aa1ad" ${ST}/>
        <rect x="${x}" y="338" width="200" height="16" rx="6" fill="#737b87" ${ST2}/>
        <rect x="${x + 14}" y="372" width="60" height="38" rx="5" fill="#2b3040" ${ST2}/><rect x="${x + 128}" y="372" width="60" height="38" rx="5" fill="#2b3040" ${ST2}/>
        <rect x="${x}" y="430" width="200" height="8" fill="#6fa8ff" opacity=".85"/>
      </g>`;
    }).join('');
    // 黃色指標（高掛）
    const sign = `<g><rect x="610" y="104" width="6" height="30" fill="#6c7385"/><rect x="884" y="104" width="6" height="30" fill="#6c7385"/>
      <rect x="560" y="132" width="400" height="86" rx="6" fill="#c99a24" ${ST}/><rect x="560" y="174" width="400" height="6" fill="${INK}"/>
      <text x="580" y="164" font-size="25" fill="${INK}" ${HELV}>← Check-in</text><text x="790" y="164" font-size="25" fill="${INK}" ${HELV}>All Gates ↑</text>
      <rect x="560" y="180" width="400" height="38" fill="#1b1b1f"/><text x="578" y="207" font-size="19" fill="#c99a24" ${HELV}>Baggage Claim ↘</text><text x="944" y="207" text-anchor="end" font-size="19" fill="#fff" ${HELV}>${tr('出境 Departures', 'Departures')}</text></g>`;
    return `${desks}${sign}${[120, 355, 590, 825].map((x) => kiosk(x + 30, 470, 0.7)).join('')}`;
  }

  // ---------- 旅客：跟地鐵站路人同一種畫風（粗描邊、圓頭、腮紅、四肢分開） ----------
  // 機場旅客：跟地鐵站路人一樣，每個人都有自己的樣子（帽子、圍巾、眼鏡、手上的東西）。
  // 顏色以暗色為主（咖啡、灰、黑、深藍、暗紅、深綠，一點點芥末黃）；只有一兩個人穿亮色。
  const C = { brown: '#6b4a33', camel: '#9a7350', gray: '#6f737b', charcoal: '#3c3f46', black: '#25262b', navy: '#253252', maroon: '#6e2f35', green: '#2f4b3c', mustard: '#b8902f', denim: '#3e4f6b', cream: '#d9cdb4' };
  const t25 = A.st(2.5);
  const H = {
    short: (c) => `<path d="M-40,-208 Q-42,-262 0,-262 Q42,-262 40,-208 Q24,-232 0,-230 Q-24,-232 -40,-208Z" fill="${c}" ${t25}/>`,
    long: (c) => `<path d="M-42,-204 Q-46,-258 0,-258 Q46,-258 42,-204 L42,-166 Q32,-176 31,-206 Q0,-194 -31,-206 Q-32,-176 -42,-166Z" fill="${c}" ${t25}/>`,
    bun: (c) => `${H.short(c)}<circle cx="0" cy="-266" r="13" fill="${c}" ${t25}/>`,
    beanie: (c, band) => `<path d="M-41,-212 Q-44,-266 0,-266 Q44,-266 41,-212Z" fill="${c}" ${t25}/><rect x="-43" y="-224" width="86" height="14" rx="6" fill="${band || c}" ${t25}/><path d="M-30,-250 v24 M-15,-258 v32 M0,-260 v34 M15,-258 v32 M30,-250 v24" stroke="#000" stroke-width="1.5" opacity=".18"/>`,
    cap: (c) => `<path d="M-40,-214 Q-42,-262 0,-262 Q42,-262 40,-214Z" fill="${c}" ${t25}/><path d="M10,-218 Q48,-222 62,-210 Q40,-206 10,-210Z" fill="${c}" ${t25}/><circle cx="0" cy="-262" r="4" fill="${c}" ${t25}/>`,
    flatcap: (c) => `${H.short('#3b2a20')}<path d="M-42,-222 Q-38,-256 4,-256 Q40,-254 48,-226 Q52,-216 30,-216 L-40,-214Z" fill="${c}" ${t25}/><path d="M-30,-240 Q0,-248 36,-236" stroke="#000" stroke-width="1.5" opacity=".2" fill="none"/>`,
    fedora: (c, band) => `<ellipse cx="0" cy="-226" rx="58" ry="11" fill="${c}" ${t25}/><path d="M-34,-226 Q-36,-270 0,-272 Q36,-270 34,-226Z" fill="${c}" ${t25}/><rect x="-35" y="-238" width="70" height="10" fill="${band}"/><path d="M-6,-270 Q0,-262 6,-270" stroke="#000" stroke-width="2" opacity=".3" fill="none"/>`,
  };
  const scarf = (c) => `<path d="M-30,-176 Q0,-160 30,-176 L30,-160 Q0,-144 -30,-160Z" fill="${c}" ${t25}/><rect x="10" y="-160" width="14" height="44" rx="3" fill="${c}" ${t25}/><path d="M12,-118 v8 M17,-118 v8 M22,-118 v8" stroke="${INK}" stroke-width="2"/>`;
  const glasses = `<circle cx="-14" cy="-208" r="11" fill="none" ${t25}/><circle cx="14" cy="-208" r="11" fill="none" ${t25}/><path d="M-3,-208 h6" ${t25}/>`;
  const coffee = `<g transform="translate(2,58)"><path d="M-9,-20 L9,-20 L7,6 L-7,6Z" fill="#fff" ${t25}/><rect x="-10" y="-24" width="20" height="5" rx="2" fill="#4a3b30"/><rect x="-8" y="-10" width="16" height="7" fill="#a0642d"/></g>`;
  const phone = `<g transform="translate(-2,52)"><rect x="-7" y="-14" width="14" height="24" rx="3" fill="#1b1b1f" ${A.st(2)}/><rect x="-5" y="-11" width="10" height="16" fill="#7fb4ff"/></g>`;
  const paper = `<g transform="translate(0,70) rotate(-8)"><rect x="-22" y="-6" width="44" height="30" fill="#ecebe5" ${t25}/><path d="M-16,2 h32 M-16,9 h26 M-16,16 h30" stroke="#777" stroke-width="2"/></g>`;
  const briefcase = `<g transform="translate(0,78)"><rect x="-24" y="-8" width="48" height="34" rx="5" fill="#3b2a20" ${t25}/><path d="M-9,-8 v-8 h18 v8" fill="none" ${t25}/></g>`;
  const backpack = (c) => `<rect x="-46" y="-178" width="92" height="96" rx="18" fill="${c}" ${A.st(4)}/><rect x="-46" y="-120" width="92" height="10" fill="#000" opacity=".18"/>`;
  const coatFront = (c) => `<path d="M0,-170 V-46" stroke="#000" stroke-width="2" opacity=".35"/>${[-150, -126, -102].map((y) => `<circle cx="-7" cy="${y}" r="2.6" fill="${c}" ${A.st(1.2)}/>`).join('')}<path d="M-22,-170 L-4,-136 L0,-170 M22,-170 L4,-136 L0,-170" fill="none" stroke="#000" stroke-width="2" opacity=".35"/>`;
  const LOOKS = [
    { skin: '#f1c9a5', top: C.camel, bottom: C.charcoal, shoe: C.black, hair: H.flatcap(C.gray), torso: coatFront(C.brown) + scarf(C.maroon), torsoBottom: -46, handR: briefcase },
    { skin: '#8d5a3b', top: C.navy, bottom: C.denim, shoe: C.black, hair: H.beanie(C.mustard, '#9a7726'), handR: coffee },
    { skin: '#e0ac82', top: C.green, bottom: C.black, shoe: '#5a3b26', hair: H.long('#3b2a20'), torso: scarf(C.cream), face: glasses, handL: phone },
    { skin: '#f6d7bd', top: C.black, bottom: C.charcoal, shoe: C.black, hair: H.fedora(C.charcoal, C.maroon), torso: coatFront(C.charcoal), torsoBottom: -46, handL: paper },
    { skin: '#c58c64', top: '#c8443d', bottom: C.denim, shoe: '#e9e9e9', hair: H.cap(C.navy), back: backpack(C.charcoal) },
    { skin: '#e8b88f', top: C.maroon, bottom: C.black, shoe: C.black, hair: H.bun('#5a3b26'), torso: scarf(C.gray), handR: phone },
    { skin: '#d9a07a', top: C.gray, bottom: C.navy, shoe: C.black, hair: H.short('#1b1b1f'), face: glasses, torso: `<path d="M0,-170 l7,12 l-7,40 l-7,-40Z" fill="${C.navy}" ${A.st(2)}/>`, handL: briefcase },
    { skin: '#f1c9a5', top: C.mustard, bottom: C.charcoal, shoe: C.black, hair: H.beanie(C.charcoal), torso: scarf(C.navy), back: backpack(C.brown) },
    { skin: '#a8714d', top: C.brown, bottom: C.denim, shoe: '#5a3b26', hair: H.short('#2a1d14'), torso: coatFront(C.black), torsoBottom: -50, handR: coffee },
    { skin: '#efc6a6', top: C.navy, bottom: C.gray, shoe: C.black, hair: H.long('#8a5a30'), torso: scarf(C.mustard) },
  ];
  const BRIGHT = 4; // 亮紅外套那位
  function traveler(x, y, s, look, bag = false, flip = false) {
    const t = A.st(2.5), suit = ['#3c3f46', '#253252', '#6b4a33', '#6e2f35', '#2f4b3c'][Math.abs(Math.round(x * 7 + y)) % 5];
    const luggage = bag && !look.back ? `<g transform="translate(${flip ? -62 : 62},-4)"><rect x="-20" y="-74" width="40" height="74" rx="8" fill="${suit}" ${t}/><rect x="-20" y="-74" width="40" height="14" rx="6" fill="#fff" opacity=".18"/><path d="M0,-74 V-98" stroke="${INK}" stroke-width="4"/><circle cx="-12" cy="2" r="5" fill="#222"/><circle cx="12" cy="2" r="5" fill="#222"/></g>` : '';
    return `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">${luggage}${A.human({ torsoBottom: -66, ...look })}</g>`;
  }
  function crowd(n, seed, y0 = 520, y1 = 690) {
    const r = rng(seed);
    const list = Array.from({ length: n }, () => ({ x: -20 + r() * 1040, y: y0 + r() * (y1 - y0), k: Math.floor(r() * LOOKS.length), bag: r() < 0.4, flip: r() < 0.5 }));
    let bright = 0; for (const p of list) if (p.k === BRIGHT && bright++) p.k = (p.k + 1 + (Math.floor(p.x) % 5)) % LOOKS.length; // 亮色的人最多一個
    list.sort((a, b) => a.y - b.y);
    return list.map((p) => traveler(p.x, p.y, 0.3 + ((p.y - y0) / (y1 - y0)) * 0.3, LOOKS[p.k], p.bag, p.flip)).join('');
  }
  // 躺在地上的舊手提箱（扁扁長長的，被丟棄的感覺）
  function suitcaseDrawing(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s}) rotate(-4)">
      <ellipse cx="0" cy="16" rx="150" ry="20" fill="#000" opacity=".35"/>
      <polygon points="-128,-8 128,-8 112,-48 -112,-48" fill="#6a5b49" ${ST}/>
      <polygon points="-128,-8 128,-8 128,24 -128,24" fill="#4a3e31" ${ST}/>
      <polygon points="-112,-48 112,-48 118,-42 -118,-42" fill="#7d6c57" opacity=".8"/>
      <path d="M-70,-34 q14,-6 30,0 M20,-26 q22,-8 44,-2 M-100,-22 l30,-4" fill="none" stroke="#3a2f24" stroke-width="3" opacity=".6" stroke-linecap="round"/>
      <ellipse cx="46" cy="-30" rx="30" ry="8" fill="#3a2f24" opacity=".35"/>
      <polygon points="-24,-46 28,-46 31,-42 -27,-42" fill="#2f261d" opacity=".5"/>
      <path d="M-24,-8 v-16 h48 v16" fill="none" stroke="#1f1913" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,6)"/>
      <rect x="-90" y="-2" width="26" height="14" rx="3" fill="#a07a3a" ${ST2}/><rect x="64" y="-2" width="26" height="14" rx="3" fill="#a07a3a" ${ST2}/>
      <path d="M72,-4 l8,4 M-84,2 l9,3" stroke="#5a3a1c" stroke-width="2.5" opacity=".7"/>
      <polygon points="-128,-8 -108,-8 -112,-48 -118,-42" fill="#2f261d" opacity=".55"/><polygon points="128,-8 108,-8 112,-48 118,-42" fill="#2f261d" opacity=".55"/>
      <path d="M-128,24 q20,-4 34,-2 M100,24 l24,-5" stroke="#2a2118" stroke-width="3" opacity=".6"/>
      <g transform="translate(100,18) rotate(18)"><rect x="-6" y="0" width="22" height="30" rx="2" fill="#d9d0a8" ${A.st(2)}/><path d="M-6,0 q4,-6 8,0" fill="none" stroke="${INK}" stroke-width="2"/></g>
      <rect x="-44" y="-30" width="60" height="16" fill="#cfc9a8" opacity=".75" transform="rotate(-6)"/>
    </g>`;
  }
  // 警察（站姿；圓臉、藍帽）
  // 紐約市警（參考 NYPD 制服；用共用人物模板）：深藍短袖、肩章、金色警徽、黑色勤務腰帶；八角帽、飛行員墨鏡。沒有嘴巴。
  function cop(x, y, s, shade) {
    const shirt = shade || '#232a45', t2 = A.st(2), tw = 84;
    const patch = `<path d="M-7,-2 h14 v9 c0,5 -3,9 -7,11 c-4,-2 -7,-6 -7,-11Z" fill="#2a5bd0" stroke="#e2b53c" stroke-width="2"/><circle cx="0" cy="6" r="2.6" fill="#e2b53c"/>`;
    const torso = `<path d="M-11,-172 L0,-156 L11,-172Z" fill="#0d0e12" ${t2}/>
      <path d="M-20,-173 L-4,-173 L-6,-156 L-16,-162Z M20,-173 L4,-173 L6,-156 L16,-162Z" fill="${shirt}" ${t2}/>
      <path d="M0,-156 V-100" stroke="#0d0e12" stroke-width="1.5" opacity=".6"/>${[-144, -128, -112].map((yy) => `<circle cx="0" cy="${yy}" r="2" fill="#0d0e12"/>`).join('')}
      <rect x="-32" y="-144" width="24" height="22" rx="2" fill="none" stroke="#0d0e12" stroke-width="1.6" opacity=".7"/><path d="M-32,-138 h24" stroke="#0d0e12" stroke-width="1.6" opacity=".7"/>
      <rect x="10" y="-146" width="24" height="22" rx="2" fill="none" stroke="#0d0e12" stroke-width="1.6" opacity=".7"/><path d="M10,-140 h24" stroke="#0d0e12" stroke-width="1.6" opacity=".7"/>
      <text x="-20" y="-150" text-anchor="middle" font-size="8.5" fill="#e2b53c" font-family="${A.SIGNF}" font-weight="800" letter-spacing=".4">NYPD</text>
      <path d="M22,-168 L32,-164 L31,-154 C30,-149 26,-146 22,-145 C18,-146 14,-149 13,-154 L12,-164Z" fill="#e2b53c" ${t2}/><circle cx="22" cy="-156" r="4" fill="#2a5bd0"/>
      <rect x="-44" y="-100" width="88" height="16" rx="3" fill="#0d0e12" ${ST2}/><rect x="-7" y="-99" width="14" height="14" rx="2" fill="#b9bdc6" ${A.st(1.5)}/>
      ${[[-38, 12], [16, 10], [27, 10]].map(([px, w]) => `<rect x="${px}" y="-102" width="${w}" height="22" rx="3" fill="#15161b" ${A.st(1.5)}/><circle cx="${px + w / 2}" cy="-95" r="1.8" fill="#d9b04a"/>`).join('')}`;
    const hat = `<g transform="translate(0,14)">
      <path d="M-27,-231 L-7,-229 M27,-231 L7,-229" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-30,-226 C-30,-229 -27,-230 -24,-230 H-6 C-3,-230 -2,-228 -3,-225 C-4,-216 -9,-210 -17,-210 C-26,-210 -30,-217 -30,-226Z M30,-226 C30,-229 27,-230 24,-230 H6 C3,-230 2,-228 3,-225 C4,-216 9,-210 17,-210 C26,-210 30,-217 30,-226Z" fill="#2c313c" stroke="#c9a640" stroke-width="2"/>
      <path d="M-26,-226 L-18,-226 L-25,-214Z M8,-226 L16,-226 L9,-214Z" fill="#fff" opacity=".35"/><path d="M-3,-228 Q0,-232 3,-228" fill="none" stroke="#c9a640" stroke-width="2"/>
      <path d="M-30,-228 L-38,-232 M30,-228 L38,-232" stroke="#c9a640" stroke-width="2"/>
      <path d="M-55,-270 C-55,-280 -46,-284 -34,-284 H34 C46,-284 55,-280 55,-270 L45,-247 H-45Z" fill="#1c2340" ${ST2}/>
      <path d="M-44,-276 H44" stroke="#2e3760" stroke-width="3" opacity=".8"/>
      <rect x="-46" y="-250" width="92" height="13" rx="3" fill="#0b0c10" ${ST2}/><path d="M-40,-246 H40" stroke="#fff" stroke-width="1.6" opacity=".35"/>
      <circle cx="-40" cy="-243" r="3.2" fill="#e2b53c" ${A.st(1)}/><circle cx="40" cy="-243" r="3.2" fill="#e2b53c" ${A.st(1)}/>
      <path d="M-46,-238 Q0,-222 46,-238 Q40,-228 0,-225 Q-40,-228 -46,-238Z" fill="#0b0c10" ${ST2}/><path d="M-30,-233 Q0,-227 30,-233" fill="none" stroke="#fff" stroke-width="1.6" opacity=".4"/>
      <path d="M0,-276 C6,-276 10,-272 10,-266 C14,-264 14,-258 10,-256 L8,-251 H-8 L-10,-256 C-14,-258 -14,-264 -10,-266 C-10,-272 -6,-276 0,-276Z" fill="#e2b53c" ${A.st(1.6)}/>
      <path d="M-6,-266 Q0,-262 6,-266 M0,-272 V-254" stroke="#9a7a20" stroke-width="1.4" fill="none"/></g>`;
    const P = { skin: '#e8bd98', top: shirt, short: true, bottom: '#181c2e', shoe: '#0d0e12', torsoW: tw, torsoBottom: -82, shoeW: 20,
      torso, sleeveMark: patch, hair: hat, eyes: false, mouth: false, blush: false };
    return `<g transform="translate(${x},${y}) scale(${s})">${A.human(P)}</g>`;
  }
  // 文字寬度估算：中日文一字約 22，英文約 11.5（字級 22）
  const textW = (t) => [...String(t)].reduce((a, c) => a + (/[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(c) ? 22 : 11.5), 0);
  function bubble(x, y, w, lines, tailX, tailY) {
    const lh = 30, h = lines.length * lh + 22;
    w = Math.max(w, Math.ceil(Math.max(...lines.map(textW)) + 34));
    if (x + w > 990) x = Math.max(10, 990 - w);
    const bx = Math.min(Math.max(tailX, x + 30), x + w - 30); // 尾巴的根部一定在泡泡裡
    return `<g>
      <path d="M${bx - 14},${y + h - 3} L${tailX},${tailY} L${bx + 16},${y + h - 3}Z" fill="#fff" ${ST2}/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#fff" ${ST}/>
      <rect x="${bx - 12}" y="${y + h - 6}" width="26" height="8" fill="#fff"/>
      <text x="${x + 16}" y="${y + 34}" font-size="22" fill="${INK}" ${FONT}>${lines.map((l, i) => `<tspan x="${x + 16}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text>
    </g>`;
  }

  // ---------- 行李裡的東西（小圖示；不用 emoji）----------
  function itemIcon(id, x, y, s = 1) {
    const g = (inner) => `<g transform="translate(${x},${y}) scale(${s})">${inner}</g>`;
    const t = A.st(2.5);
    switch (id) {
      case 'sunglasses': return g(`<path d="M-30,-4 h60" stroke="${INK}" stroke-width="4"/><rect x="-30" y="-10" width="24" height="18" rx="8" fill="#1b1b1f" ${t}/><rect x="6" y="-10" width="24" height="18" rx="8" fill="#1b1b1f" ${t}/><path d="M-24,-6 l8,0" stroke="#7d8696" stroke-width="3"/>`);
      case 'wetsuit': return g(`<path d="M-14,-30 h28 l14,12 -8,10 -6,-6 v44 h-10 l-4,-24 -4,24 h-10 v-44 l-6,6 -8,-10Z" fill="#1d3557" ${t}/><path d="M-14,-12 h28" stroke="#3aa0ff" stroke-width="4"/>`);
      case 'surfwax': return g(`<rect x="-18" y="-12" width="36" height="24" rx="10" fill="#ffd8e4" ${t}/><text x="0" y="5" text-anchor="middle" font-size="11" fill="${INK}" ${HELV}>WAX</text>`);
      case 'tshirt': return g(`<path d="M-12,-22 h24 l16,10 -7,12 -7,-4 v26 h-28 v-26 l-7,4 -7,-12Z" fill="#ffb84d" ${t}/><path d="M-6,-22 q6,6 12,0" fill="none" ${t}/>`);
      case 'shorts': return g(`<path d="M-20,-16 h40 l4,30 h-18 l-6,-14 -6,14 h-18Z" fill="#3aa0ff" ${t}/><path d="M-20,-10 h40" stroke="${INK}" stroke-width="2"/>`);
      case 'sunscreen': return g(`<rect x="-10" y="-20" width="20" height="40" rx="6" fill="#fff3a0" ${t}/><rect x="-6" y="-28" width="12" height="9" fill="#ff7a1a" ${t}/><circle cx="0" cy="2" r="6" fill="#ff7a1a"/>`);
      case 'skigloves': return g(`<path d="M-26,18 v-26 q0,-10 8,-10 v-6 q0,-6 6,-6 q6,0 6,6 v28 Z" fill="#e5382f" ${t}/><path d="M4,18 v-26 q0,-10 8,-10 v-6 q0,-6 6,-6 q6,0 6,6 v28 Z" fill="#e5382f" ${t}/><path d="M-26,12 h20 M4,12 h20" stroke="#fff" stroke-width="4"/>`);
      case 'goggles': return g(`<path d="M-34,-2 h68" stroke="#e5382f" stroke-width="6"/><rect x="-26" y="-14" width="52" height="26" rx="12" fill="#ffb000" ${t}/><rect x="-20" y="-9" width="40" height="16" rx="8" fill="#ff7a1a" opacity=".7"/>`);
      case 'scarf': return g(`<path d="M-26,-14 q26,-12 52,0 v10 q-26,-12 -52,0Z" fill="#c5262c" ${t}/><rect x="10" y="-6" width="14" height="30" fill="#c5262c" ${t}/><path d="M12,24 v6 M17,24 v6 M22,24 v6" stroke="${INK}" stroke-width="2"/>`);
      case 'downjacket': return g(`<path d="M-14,-26 h28 l14,10 v40 h-12 v-26 v34 h-32 v-34 v26 h-12 v-40Z" fill="#2f6fe0" ${t}/>${[-12, -2, 8].map((yy) => `<path d="M-14,${yy} h28" stroke="${INK}" stroke-width="2"/>`).join('')}<path d="M0,-26 v42" stroke="${INK}" stroke-width="2"/>`);
      case 'jpbook': return g(`<rect x="-20" y="-26" width="40" height="52" rx="3" fill="#ffffff" ${t}/><rect x="-20" y="-26" width="40" height="14" fill="#e5382f"/><circle cx="0" cy="4" r="8" fill="#e5382f"/><text x="0" y="-15" text-anchor="middle" font-size="9.5" fill="#fff" font-weight="700">かいわ</text><text x="0" y="22" text-anchor="middle" font-size="8.5" fill="${INK}" font-weight="700">にほんご</text>`);
      case 'beanie': return g(`<path d="M-24,8 q0,-30 24,-30 q24,0 24,30Z" fill="#8e6bbf" ${t}/><rect x="-26" y="4" width="52" height="12" rx="4" fill="#6a4ea0" ${t}/><circle cx="0" cy="-24" r="7" fill="#fff" ${t}/>`);
      case 'tripod': return g(`<rect x="-10" y="-30" width="20" height="10" rx="2" fill="#2b2b33" ${t}/><path d="M0,-20 L-18,28 M0,-20 L18,28 M0,-20 V28" stroke="#4a4f5c" stroke-width="4" stroke-linecap="round"/>`);
      case 'camera': return g(`<rect x="-24" y="-14" width="48" height="32" rx="6" fill="#2b2b33" ${t}/><rect x="-10" y="-20" width="20" height="8" rx="2" fill="#2b2b33" ${t}/><circle cx="0" cy="2" r="11" fill="#7d8696" ${t}/><circle cx="0" cy="2" r="5" fill="#1b1b1f"/>`);
      case 'thermos': return g(`<rect x="-10" y="-24" width="20" height="48" rx="6" fill="#4aa3a2" ${t}/><rect x="-11" y="-30" width="22" height="9" rx="3" fill="#2b2b33" ${t}/><path d="M-10,0 h20" stroke="#fff" stroke-width="3" opacity=".7"/>`);
      case 'picnic': return g(`<rect x="-28" y="-14" width="56" height="28" rx="6" fill="#fff" ${t}/>${[0, 1, 2, 3].map((i) => `<rect x="${-28 + i * 14}" y="-14" width="7" height="28" fill="#e5382f" opacity=".75"/>`).join('')}<path d="M-28,0 h56" stroke="#e5382f" stroke-width="7" opacity=".55"/><circle cx="18" cy="-20" r="5" fill="#ffb7c9" ${A.st(1.5)}/>`);
      case 'lightjacket': return g(`<path d="M-14,-26 h28 l14,10 v40 h-12 v-26 v34 h-32 v-34 v26 h-12 v-40Z" fill="#cfe86a" ${t}/><path d="M0,-26 v42" stroke="${INK}" stroke-width="2"/><circle cx="-6" cy="-6" r="2" fill="${INK}"/><circle cx="-6" cy="6" r="2" fill="${INK}"/>`);
      case 'toothbrush': return g(`<rect x="-26" y="-4" width="44" height="8" rx="4" fill="#3aa0ff" ${t}/><rect x="16" y="-12" width="12" height="10" rx="2" fill="#fff" ${t}/>`);
      case 'charger': return g(`<rect x="-14" y="-12" width="28" height="24" rx="5" fill="#fff" ${t}/><path d="M-6,-12 v-10 M6,-12 v-10" stroke="${INK}" stroke-width="3"/><path d="M0,12 q0,16 18,16" fill="none" stroke="${INK}" stroke-width="3"/>`);
      case 'socks': return g(`<path d="M-20,-24 h14 v26 l12,8 q4,10 -6,10 l-20,-10Z" fill="#ff9bb0" ${t}/><path d="M6,-24 h14 v26 l12,8 q4,10 -6,10 l-20,-10Z" fill="#5ad17a" ${t}/>`);
      case 'bikini': return g(`<path d="M-22,-28 L-4,-26 M4,-26 L22,-28" stroke="${INK}" stroke-width="2"/><path d="M-24,-26 q-2,14 9,18 q10,-3 11,-18Z" fill="#ff5d8f" ${t}/><path d="M4,-26 q1,15 11,18 q11,-4 9,-18Z" fill="#ff5d8f" ${t}/><path d="M-4,-22 h8" stroke="${INK}" stroke-width="2.5"/><path d="M-22,6 h44 l-7,10 q-15,12 -30,0Z" fill="#ff5d8f" ${t}/><circle cx="-12" cy="-16" r="2" fill="#fff"/><circle cx="14" cy="-16" r="2" fill="#fff"/><circle cx="0" cy="12" r="2" fill="#fff"/>`);
      case 'sweater': return g(`<path d="M-16,-26 h32 l18,12 -6,28 -9,-3 v19 h-38 v-19 l-9,3 -6,-28Z" fill="#c9463d" ${t}/><path d="M-12,-26 q12,10 24,0" fill="#f3e7d3" ${t}/><path d="M-16,-14 l4,-4 4,4 4,-4 4,4 4,-4 4,4 4,-4 4,4" fill="none" stroke="#f3e7d3" stroke-width="3"/><path d="M-13,-6 h26" stroke="#f3e7d3" stroke-width="2" stroke-dasharray="3 3"/><path d="M-19,24 h38" stroke="#f3e7d3" stroke-width="3"/>`);
      default: return '';
    }
  }


  // ---------- 行李裡的衣物與小物：美漫風（稜角分明、粗黑邊、硬陰影 + 網點、白色反光）----------
  const HT = `<pattern id="s3ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r="1.2" fill="#000" opacity=".42"/></pattern>`;
  function comicIcon(id, x, y, s = 1) {
    const g = (inner) => `<g transform="translate(${x},${y}) scale(${s})">${inner}</g>`;
    const o = A.st(3.2);
    const shade = (d, c) => `<path d="${d}" fill="${c}"/><path d="${d}" fill="url(#s3ht)"/>`;
    const glint = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`;
    const body = (D, c, shadeD, dark) => `<path d="${D}" fill="${c}"/>${shade(shadeD, dark)}<path d="${D}" fill="none" ${o}/>`;
    switch (id) {
      case 'tshirt': return g(`${body('M-12,-26 L-5,-26 L0,-20 L5,-26 L12,-26 L32,-13 L23,1 L15,-4 L15,28 L-15,28 L-15,-4 L-23,1 L-32,-13Z', '#ffb21e', 'M5,-26 L12,-26 L32,-13 L23,1 L15,-4 L15,28 L5,28Z', '#d9731a')}
        <path d="M-5,-26 L0,-20 L5,-26" fill="none" ${o}/><path d="M-15,-4 L-15,4 M15,-4 L15,4" ${A.st(2.4)}/>${glint('M-9,-14 L-6,0')}`);
      case 'bikini': return g(`<path d="M-17,-30 L-22,-37 M17,-30 L22,-37 M-29,-8 L-37,-6 M29,-8 L37,-6 M-5,-8 L5,-8" ${A.st(3)}/>
        ${body('M-17,-30 L-5,-8 L-29,-8Z', '#ff2e74', 'M-17,-30 L-11,-8 L-5,-8Z', '#b5174f')}${body('M17,-30 L29,-8 L5,-8Z', '#ff2e74', 'M17,-30 L29,-8 L21,-8Z', '#b5174f')}
        ${body('M-25,6 L25,6 L18,13 L5,27 L-5,27 L-18,13Z', '#ff2e74', 'M6,6 L25,6 L18,13 L5,27 L2,27Z', '#b5174f')}
        <path d="M-22,10 L-16,14 L-10,10 L-4,14 L2,10" fill="none" stroke="#fff" stroke-width="2"/>${glint('M-18,-20 L-21,-13')}`);
      case 'sunglasses': return g(`<path d="M-33,-10 L-40,-4 M33,-10 L40,-4" ${A.st(3.5)}/>
        <path d="M-33,-12 L-3,-12 L-6,8 L-29,10Z" fill="#15161b" ${o}/><path d="M3,-12 L33,-12 L29,10 L6,8Z" fill="#15161b" ${o}/><path d="M-3,-9 L3,-9" ${A.st(4)}/>
        <path d="M-31,-12 L-3,-12 L-3.6,-7 L-32,-7Z M3,-12 L31,-12 L32,-7 L3.6,-7Z" fill="#e5382f"/>
        ${glint('M-24,-3 L-19,5 M-15,-3 L-12,2')}${glint('M12,-3 L17,5 M21,-3 L24,2')}`);
      case 'sweater': return g(`${body('M-14,-28 L14,-28 L34,-16 L29,18 L20,16 L20,30 L-20,30 L-20,16 L-29,18 L-34,-16Z', '#d8342c', 'M6,-28 L14,-28 L34,-16 L29,18 L20,16 L20,30 L6,30Z', '#951c17')}
        <path d="M-10,-28 L0,-19 L10,-28Z" fill="#f3e7d3" ${A.st(2.6)}/>
        <path d="M-19,-13 L-13,-19 L-7,-13 L-1,-19 L5,-13 L11,-19 L17,-13" fill="none" stroke="#f3e7d3" stroke-width="3.6" stroke-linejoin="miter"/>
        <path d="M-19,-6 L19,-6" stroke="#f3e7d3" stroke-width="2.4" stroke-dasharray="4 3"/><path d="M-20,24 L20,24 M-29,13 L-20,12 M29,13 L20,12" stroke="#f3e7d3" stroke-width="3.4"/>${glint('M-12,0 L-10,12')}`);
      case 'downjacket': return g(`${body('M-14,-30 L14,-30 L31,-18 L33,22 L20,22 L20,30 L-20,30 L-20,22 L-33,22 L-31,-18Z', '#2f6fe0', 'M4,-30 L14,-30 L31,-18 L33,22 L20,22 L20,30 L4,30Z', '#173c94')}
        <path d="M-13,-36 L13,-36 L15,-29 L-15,-29Z" fill="#2f6fe0" ${A.st(2.6)}/>
        <path d="M-20,-15 L20,-15 M-20,0 L20,0 M-20,15 L20,15 M-31,-4 L-20,-4 M31,-4 L20,-4 M-32,10 L-20,10 M32,10 L20,10" ${A.st(2.4)}/>
        <path d="M0,-36 L0,30" ${A.st(3)}/><path d="M-2,-24 L2,-24" stroke="#ffd23f" stroke-width="4"/>${glint('M-15,-24 L-9,-24 M-15,-8 L-11,-8')}`);
      case 'goggles': return g(`<path d="M-32,-4 L-44,-4 M32,-4 L44,-4" stroke="#15161b" stroke-width="8" stroke-linecap="square"/>
        <path d="M-31,-15 L31,-15 L33,6 L11,13 L5,5 L-5,5 L-11,13 L-33,6Z" fill="#ff7a1a"/>
        <path d="M-31,-15 L31,-15 L32,-7 L-32,-7Z" fill="#ffd23f"/>${shade('M-32.5,0 L32.5,0 L33,6 L11,13 L5,5 L-5,5 L-11,13 L-33,6Z', '#a8327f')}
        <path d="M-31,-15 L31,-15 L33,6 L11,13 L5,5 L-5,5 L-11,13 L-33,6Z" fill="none" ${A.st(3.6)}/>${glint('M-21,-11 L-14,2 M-12,-11 L-9,-5')}`);
      case 'tripod': return g(`${body('M-3,-12 L-25,34 L-19,34 L1,-10Z', '#6b7080', 'M-3,-12 L-25,34 L-22,34 L-1,-11Z', '#3f4350')}${body('M3,-12 L25,34 L19,34 L-1,-10Z', '#6b7080', 'M3,-12 L25,34 L22,34 L1,-11Z', '#3f4350')}
        ${body('M-2,-12 L2,-12 L2,34 L-2,34Z', '#6b7080', 'M0,-12 L2,-12 L2,34 L0,34Z', '#3f4350')}
        <path d="M-14,12 L-9,12 M9,12 L14,12" ${A.st(4)}/>
        <path d="M-6,-20 L6,-20 L4,-12 L-4,-12Z" fill="#2b2b33" ${A.st(2.6)}/>
        ${body('M-20,-42 L-9,-42 L-6,-47 L6,-47 L9,-42 L20,-42 L20,-20 L-20,-20Z', '#2b2b33', 'M6,-47 L9,-42 L20,-42 L20,-20 L6,-20Z', '#111216')}
        <path d="M0,-40 L9,-35 L9,-25 L0,-21 L-9,-25 L-9,-35Z" fill="#7d8696" ${A.st(2.4)}/><path d="M0,-36 L5,-33 L5,-27 L0,-25 L-5,-27 L-5,-33Z" fill="#15161b"/>${glint('M-3,-34 L-1,-30')}`);
      default: return itemIcon(id, x, y, s);
    }
  }

  // ---------- 行李箱與裡面的東西：寫實畫風（真實比例、布料皺摺、縫線、柔和明暗）----------
  const INK2 = '#24242a';
  const ln = (w = 1.6) => `stroke="${INK2}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const lg = (id, stops, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const REAL = [
    lg('rlTee', [[0, '#f3cf6b'], [0.55, '#dcaa3e'], [1, '#a9782a']]),
    lg('rlBik', [[0, '#ff7d78'], [0.6, '#e2484f'], [1, '#a92c3a']]),
    lg('rlLens', [[0, '#5a5048'], [0.45, '#1a1714'], [1, '#3b2c22']], 0, 1),
    lg('rlAcet', [[0, '#3a3532'], [0.5, '#141212'], [1, '#2a2522']], 0, 1),
    lg('rlSw', [[0, '#a8434a'], [0.55, '#86303a'], [1, '#561a22']]),
    lg('rlDn', [[0, '#5b78ad'], [0.45, '#2f4a7c'], [1, '#1b2b4d']], 0, 1),
    lg('rlGog', [[0, '#ffe08a'], [0.3, '#ff8a3c'], [0.62, '#b0418f'], [1, '#2f6fd0']]),
    lg('rlAlu', [[0, '#eef0f3'], [0.45, '#a9b0ba'], [1, '#5d636d']], 1, 0),
    lg('rlCam', [[0, '#4a4c53'], [0.6, '#1f2024'], [1, '#121316']], 0, 1),
    lg('rlShell', [[0, '#4d5a63'], [0.5, '#2f3a42'], [1, '#1d252b']], 0, 1),
    lg('rlLining', [[0, '#8d97a8'], [1, '#6b7486']], 0, 1),
    lg('rlCard', [[0, '#22325f'], [0.55, '#14204a'], [1, '#0a1230']]),
    lg('rlChip', [[0, '#f4dc8c'], [0.5, '#c9a24a'], [1, '#e8cf7a']]),
    `<radialGradient id="rlGlass" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#6d7fa3"/><stop offset=".35" stop-color="#1f2a40"/><stop offset="1" stop-color="#05070c"/></radialGradient>`,
    `<pattern id="rlWeave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0,3 h6 M3,0 v6" stroke="#fff" stroke-width=".5" opacity=".12"/></pattern>`,
  ].join('');
  const fold = (d, o = 0.32) => `<path d="${d}" fill="none" stroke="${INK2}" stroke-width="1" opacity="${o}" stroke-linecap="round"/>`;
  const hl = (d, o = 0.35) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.4" opacity="${o}" stroke-linecap="round"/>`;
  const shadeP = (d, o = 0.18) => `<path d="${d}" fill="#000" opacity="${o}"/>`;
  // 有寬度的棒子（腳架）：用多邊形畫，才能上金屬漸層
  const rod = (x0, y0, x1, y1, w0, w1 = w0) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; return `<polygon points="${[[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="url(#rlAlu)" ${ln(1)}/>`; };
  function realIcon(id, x, y, s = 1) {
    const g = (inner) => `<g transform="translate(${x},${y}) scale(${s})">${inner}</g>`;
    switch (id) {
      case 'tshirt': { const D = 'M-10,-30 C-6,-25 6,-25 10,-30 L24,-26 L39,-13 L31,-2 L22,-8 L22,30 C8,32 -8,32 -22,30 L-22,-8 L-31,-2 L-39,-13 L-24,-26 Z';
        return g(`<path d="${D}" fill="url(#rlTee)"/>${shadeP('M14,-27 L24,-26 L39,-13 L31,-2 L22,-8 L22,30 C18,31 15,31 12,31 C16,10 16,-10 14,-27Z', 0.14)}
          <path d="${D}" fill="none" ${ln()}/><path d="M-8,-28 C-4,-21 4,-21 8,-28" fill="none" ${ln(1.2)}/><path d="M-36,-9 L-28,-1 M36,-9 L28,-1" ${ln(1)} stroke-dasharray="1.6 1.6"/>
          <path d="M-21,26 C-7,28 7,28 21,26" fill="none" ${ln(0.9)} stroke-dasharray="1.6 1.6"/>
          ${fold('M-14,-6 C-10,4 -12,14 -8,24')}${fold('M10,-18 C6,-8 12,4 8,12')}${fold('M-24,-22 C-20,-16 -22,-12 -22,-8', 0.25)}${hl('M-6,-12 C-4,-4 -6,6 -3,14')}`); }
      case 'bikini': {
        const cup = 'M-6,-14 C-9,-22 -14,-30 -18,-35 C-22,-27 -27,-18 -31,-12 C-22,-9 -12,-9 -6,-14Z';
        const bot = 'M-27,4 C-10,9 10,9 27,4 C23,12 13,22 5,28 C2,30 -2,30 -5,28 C-13,22 -23,12 -27,4Z';
        return g(`<path d="M-18,-35 C-16,-41 -11,-44 -6,-46 M18,-35 C16,-41 11,-44 6,-46 M-31,-12 C-37,-11 -41,-9 -45,-6 M31,-12 C37,-11 41,-9 45,-6 M-6,-14 C-2,-12 2,-12 6,-14" fill="none" stroke="#a92c3a" stroke-width="1.8" stroke-linecap="round"/>
          <path d="${cup}" fill="url(#rlBik)" ${ln(1.3)}/><g transform="scale(-1,1)"><path d="${cup}" fill="url(#rlBik)" ${ln(1.3)}/></g>
          ${shadeP('M-6,-14 C-9,-22 -14,-30 -18,-35 C-15,-26 -12,-17 -12,-10 C-9,-10 -7,-12 -6,-14Z', 0.16)}${shadeP('M6,-14 C9,-22 14,-30 18,-35 C17,-26 18,-17 20,-10 C14,-9 9,-11 6,-14Z', 0.2)}
          ${hl('M-20,-26 C-22,-22 -24,-18 -26,-14', 0.5)}${hl('M14,-28 C13,-24 12,-20 11,-16', 0.35)}
          <path d="${bot}" fill="url(#rlBik)" ${ln(1.3)}/>${shadeP('M8,7 C17,6 22,5 27,4 C23,12 13,22 5,28 C2,30 0,29 0,28 C6,20 8,14 8,7Z', 0.18)}
          <path d="M-24,7 C-10,11 10,11 24,7" fill="none" stroke="#fff" stroke-width=".8" opacity=".45" stroke-dasharray="1.6 1.4"/>
          <path d="M-27,4 L-35,1 M-27,4 L-34,9 M27,4 L35,1 M27,4 L34,9" fill="none" stroke="#a92c3a" stroke-width="1.8" stroke-linecap="round"/>
          ${fold('M-10,14 C-6,18 -2,20 2,22', 0.3)}${hl('M-18,9 C-14,13 -10,17 -6,20', 0.35)}`); }
      case 'sunglasses': {
        const fr = 'M-38,-13 C-38,-17 -35,-18 -31,-18 L-6,-16 C-2,-16 -1,-13 -1,-10 L-3,4 C-4,11 -10,13 -17,13 L-27,13 C-34,13 -37,9 -38,2Z';
        const lens = 'M-34,-12 C-34,-14 -32,-15 -30,-15 L-7,-13 C-4,-13 -4,-11 -4,-9 L-6,3 C-7,8 -11,10 -17,10 L-26,10 C-31,10 -33,7 -34,2Z';
        const half = `<path d="${fr}" fill="url(#rlAcet)" ${ln(1.3)}/><path d="${lens}" fill="url(#rlLens)"/><path d="M-30,-12 L-22,-12 L-30,6 L-33,4Z" fill="#fff" opacity=".22"/><path d="M-19,-12 L-16,-12 L-24,8 L-26,8Z" fill="#fff" opacity=".14"/><rect x="-39" y="-15" width="4" height="3" rx="1" fill="#c9ccd2"/>`;
        return g(`<path d="M-38,-14 C-44,-14 -48,-11 -50,-6 M38,-14 C44,-14 48,-11 50,-6" fill="none" stroke="#2a2522" stroke-width="2.4" stroke-linecap="round"/>
          ${half}<g transform="scale(-1,1)">${half}</g><path d="M-1,-11 C-1,-15 1,-15 1,-11" fill="none" stroke="#2a2522" stroke-width="3"/>${hl('M-36,-16 L-8,-14', 0.4)}${hl('M8,-14 L36,-16', 0.3)}`); }
      case 'sweater': { const D = 'M-12,-30 C-6,-26 6,-26 12,-30 L28,-24 C34,-20 38,-10 40,4 L42,22 L32,24 L28,0 L26,30 C10,33 -10,33 -26,30 L-28,0 L-32,24 L-42,22 L-40,4 C-38,-10 -34,-20 -28,-24 Z';
        const cable = (cx) => `<path d="${Array.from({ length: 7 }, (_, i) => `M${cx - 3},${-20 + i * 7} C${cx + 3},${-17 + i * 7} ${cx + 3},${-14 + i * 7} ${cx - 3},${-13 + i * 7}`).join(' ')}" fill="none" stroke="#c7686f" stroke-width="2.2" stroke-linecap="round"/><path d="${Array.from({ length: 7 }, (_, i) => `M${cx + 3},${-20 + i * 7} C${cx - 3},${-17 + i * 7} ${cx - 3},${-14 + i * 7} ${cx + 3},${-13 + i * 7}`).join(' ')}" fill="none" stroke="#5e1a22" stroke-width="1.2" opacity=".7"/>`;
        const rib = (x0, x1, y0, y1) => Array.from({ length: Math.round((x1 - x0) / 2.6) }, (_, i) => `<path d="M${(x0 + i * 2.6).toFixed(1)},${y0} V${y1}" stroke="#4a1219" stroke-width=".9" opacity=".55"/>`).join('');
        return g(`<path d="${D}" fill="url(#rlSw)" ${ln()}/>${cable(-9)}${cable(9)}${cable(0)}
          <path d="M-16,-22 V26 M16,-22 V26" stroke="#c7686f" stroke-width="1.3" stroke-dasharray="1.2 2" opacity=".8"/>
          ${rib(-25, 25, 25, 31)}${rib(-41, -33, 18, 23)}${rib(33, 41, 18, 23)}
          <path d="M-12,-30 C-6,-26 6,-26 12,-30 L10,-25 C5,-21 -5,-21 -10,-25Z" fill="#7a2730" ${ln(1.1)}/>${rib(-9, 9, -27, -22)}
          ${shadeP('M16,-27 L28,-24 C34,-20 38,-10 40,4 L42,22 L32,24 L28,0 L26,30 C22,31 19,31 16,31Z', 0.15)}${fold('M-22,-6 C-20,2 -24,10 -22,18', 0.35)}${hl('M-30,-18 C-33,-10 -35,0 -36,8')}`); }
      case 'downjacket': { const D = 'M-12,-34 L12,-34 L14,-26 L26,-24 C34,-20 38,-12 40,0 L42,24 L32,26 L28,4 L26,32 L-26,32 L-28,4 L-32,26 L-42,24 L-40,0 C-38,-12 -34,-20 -26,-24 L-14,-26Z';
        const ys = [-26, -14, -2, 10, 22];
        return g(`<path d="${D}" fill="url(#rlDn)" ${ln()}/>
          ${ys.slice(1).map((yy) => `<path d="M-26,${yy} Q-13,${yy + 3} 0,${yy} Q13,${yy + 3} 26,${yy}" fill="none" ${ln(1.1)}/>`).join('')}
          ${[-6, 6, 16].map((yy) => `<path d="M-40,${yy} L-29,${yy + 1} M40,${yy} L29,${yy + 1}" ${ln(1)}/>`).join('')}
          ${ys.slice(0, 4).map((yy) => `<ellipse cx="-13" cy="${yy + 6}" rx="8" ry="2.2" fill="#fff" opacity=".28"/><ellipse cx="13" cy="${yy + 6}" rx="7" ry="2" fill="#fff" opacity=".14"/>`).join('')}
          ${[-34, -22, -10, 2, 14].map((xx, i) => `<ellipse cx="${xx < 0 ? -35 : 35}" cy="${-12 + i * 9}" rx="2.4" ry="1" fill="#fff" opacity=".18"/>`).join('')}
          <path d="M-12,-34 L12,-34 L14,-26 L-14,-26Z" fill="#26406e" ${ln(1.2)}/>
          <path d="M0,-34 V32" stroke="#c9ccd2" stroke-width="2.2" stroke-dasharray="1.2 1.2"/><path d="M0,-34 V32" stroke="${INK2}" stroke-width=".6"/>
          <rect x="-1.8" y="-24" width="3.6" height="7" rx="1" fill="#d7dade" ${ln(.8)}/>
          ${shadeP('M14,-26 L26,-24 C34,-20 38,-12 40,0 L42,24 L32,26 L28,4 L26,32 L14,32Z', 0.15)}`); }
      case 'goggles': {
        const fr = 'M-36,-14 C-36,-20 -30,-22 -24,-22 L24,-22 C30,-22 36,-20 36,-14 L36,6 C36,12 30,14 24,14 L10,14 C6,14 4,8 0,8 C-4,8 -6,14 -10,14 L-24,14 C-30,14 -36,12 -36,6Z';
        return g(`<path d="M-36,-11 L-50,-12 L-50,1 L-36,2Z M36,-11 L50,-12 L50,1 L36,2Z" fill="#2b2d33" ${ln(1)}/><path d="M-50,-7 L-36,-6 M-50,-3 L-36,-2 M36,-6 L50,-7 M36,-2 L50,-3" stroke="#c94a5a" stroke-width="1.4"/>
          <path d="${fr}" fill="#1d1e22" ${ln(1.3)}/><g transform="translate(0,-3) scale(.86)"><path d="${fr}" fill="url(#rlGog)"/></g>
          <path d="M-27,-17 L-15,-17 L-26,4 L-31,4Z" fill="#fff" opacity=".4"/><path d="M-11,-17 L-7,-17 L-17,4 L-20,4Z" fill="#fff" opacity=".25"/>
          <path d="M-24,-20 L24,-20" stroke="#6b6f78" stroke-width="1.2" stroke-dasharray="3 2"/>${hl('M-34,-14 C-34,-18 -30,-20 -24,-20', 0.45)}`); }
      case 'tripod': {
        const legs = [[-3, -16, -17, 8, -29, 36], [3, -16, 17, 8, 29, 36], [0, -14, 1, 10, 2, 38]];
        return g(`${legs.map(([ax, ay, bx, by, cx2, cy2]) => `${rod(bx, by, cx2, cy2, 1.5, 1.2)}${rod(ax, ay, bx, by, 2.4, 2)}<rect x="${bx - 3}" y="${by - 2}" width="6" height="4" rx="1" fill="#1d1e22" transform="rotate(${Math.atan2(cy2 - by, cx2 - bx) * 57.3 - 90} ${bx} ${by})"/><ellipse cx="${cx2}" cy="${cy2 + 1}" rx="2.6" ry="1.4" fill="#1d1e22"/>`).join('')}
          <path d="M-9,-18 L9,-18 L6,-12 L-6,-12Z" fill="#2a2b30" ${ln(1)}/>${rod(0, -27, 0, -15, 2.2)}
          <circle cx="0" cy="-29" r="4.2" fill="#3a3c42" ${ln(1)}/><path d="M-1.5,-31 a2,2 0 0 1 2.5,-0.5" stroke="#fff" opacity=".5" fill="none"/>
          <rect x="-9" y="-35" width="18" height="3.4" rx="1" fill="#2a2b30" ${ln(.8)}/>
          <path d="M-24,-56 L-9,-56 L-6,-61 L6,-61 L9,-56 L24,-56 C26,-56 27,-55 27,-53 L27,-37 C27,-35 26,-34 24,-34 L-24,-34 C-26,-34 -27,-35 -27,-37 L-27,-53 C-27,-55 -26,-56 -24,-56Z" fill="url(#rlCam)" ${ln(1.2)}/>
          <path d="M-27,-52 C-31,-50 -31,-38 -27,-36" fill="#1a1b1f" ${ln(1)}/><ellipse cx="-19" cy="-57.5" rx="3.2" ry="1.3" fill="#8a8f98"/>
          <circle cx="3" cy="-45" r="12" fill="#18191d" ${ln(1.2)}/><circle cx="3" cy="-45" r="9.5" fill="none" stroke="#3a3c42" stroke-width="2" stroke-dasharray="1 1"/><circle cx="3" cy="-45" r="7" fill="url(#rlGlass)"/><circle cx="0.5" cy="-47.5" r="2" fill="#fff" opacity=".55"/>
          <rect x="16" y="-53" width="6" height="4" rx="1" fill="#5a5d64"/>${hl('M-23,-54 L20,-54', 0.25)}`); }
      default: return itemIcon(id, x, y, s);
    }
  }

  // ---------- 行李裡的雜物（比較暗、不能點）----------
  const CL = [
    lg('rlNavy', [[0, '#3d4a63'], [1, '#262f42']], 0, 1), lg('rlHeather', [[0, '#b9bcc2'], [1, '#8f939b']], 0, 1),
    lg('rlBeige', [[0, '#d8c8a8'], [1, '#b3a07c']], 0, 1), lg('rlOlive', [[0, '#7d8060'], [1, '#5d6045']], 0, 1),
    lg('rlPink', [[0, '#e8b4bd'], [1, '#c98a96']], 0, 1), lg('rlCanvas', [[0, '#34446a'], [1, '#1f2a45']], 0, 1),
    lg('rlCup', [[0, '#ffffff'], [0.6, '#eceef3'], [1, '#c9ced8']], 1, 0),
  ].join('');
  // 一疊摺好的衣服
  function foldedStack(x, y, s = 1) {
    const L = [['rlNavy', 0, -6], ['rlHeather', 4, -24], ['rlBeige', -3, -42], ['rlOlive', 2, -58]];
    return `<g transform="translate(${x},${y}) scale(${s})">${L.map(([c, dx, dy], i) => `<g transform="translate(${dx},${dy}) rotate(${(i % 2 ? 1.5 : -1.2)})">
      <path d="M-62,-10 C-64,-16 -60,-19 -54,-19 H54 C60,-19 64,-16 62,-10 L62,6 C62,10 58,12 54,12 H-54 C-58,12 -62,10 -62,6Z" fill="url(#${c})" ${ln(1.2)}/>
      <path d="M-54,-8 H54" stroke="#fff" stroke-width="1" opacity=".18"/>${fold('M-30,-14 C-28,-6 -30,2 -28,8', 0.35)}${fold('M24,-15 C26,-6 24,2 26,9', 0.3)}
      ${i === 1 ? '<path d="M-6,-19 C-4,-13 4,-13 6,-19" fill="none" stroke="#6d7179" stroke-width="1.4"/>' : ''}</g>`).join('')}</g>`;
  }
  // 化妝包（拉鍊袋）
  function pouch(x, y, s = 1, kind = 0, rot = 0) {
    const c = kind ? 'rlBeige' : 'rlPink', D = 'M-46,-26 C-46,-30 -42,-32 -38,-32 H38 C42,-32 46,-30 46,-26 L50,22 C50,28 46,30 40,30 H-40 C-46,30 -50,28 -50,22Z';
    const pattern = kind ? [-28, -10, 8].map((yy) => `<path d="M-46,${yy} H46" stroke="#8f7c58" stroke-width=".9" opacity=".5"/>`).join('') + [-30, -10, 10, 30].map((xx) => `<path d="M${xx},-26 V28" stroke="#8f7c58" stroke-width=".9" opacity=".5"/>`).join('')
      : [[-28, -12], [-6, 6], [18, -14], [30, 14], [-30, 16], [6, -20]].map(([px, py]) => `<g transform="translate(${px},${py})"><circle r="3.4" fill="#fff" opacity=".75"/><circle r="1.4" fill="#e07a8a"/></g>`).join('');
    return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><path d="${D}" fill="url(#${c})" ${ln(1.3)}/>${pattern}
      <path d="M-44,-24 H44" stroke="#6b6f78" stroke-width="3"/><path d="M-44,-24 H44" stroke="#c9ccd2" stroke-width="1.6" stroke-dasharray="1.4 1.4"/>
      <path d="M30,-24 l6,12 l-6,4 l-4,-12Z" fill="#c9ccd2" ${ln(.8)}/>${shadeP('M20,-26 H38 C42,-32 46,-30 46,-26 L50,22 C50,28 46,30 40,30 H24Z', 0.12)}${hl('M-40,-14 C-42,-4 -42,8 -40,18', 0.3)}</g>`;
  }
  // 一雙帆布鞋（俯視）
  function sneakers(x, y, s = 1) {
    const shoe = (dx, flip) => `<g transform="translate(${dx},0) scale(${flip ? -1 : 1},1)">
      <path d="M0,-58 C16,-58 22,-40 22,-20 C22,4 18,30 14,46 C11,56 -11,56 -14,46 C-18,30 -22,4 -22,-20 C-22,-40 -16,-58 0,-58Z" fill="#f2f0ea" ${ln(1.3)}/>
      <path d="M0,-52 C12,-52 17,-38 17,-20 C17,2 13,26 10,40 C8,46 -8,46 -10,40 C-13,26 -17,2 -17,-20 C-17,-38 -12,-52 0,-52Z" fill="url(#rlCanvas)"/>
      <path d="M0,-52 C12,-52 16,-42 16,-34 H-16 C-16,-42 -12,-52 0,-52Z" fill="#f2f0ea" ${ln(.9)}/><path d="M-15,-31 H15" stroke="#e8e4da" stroke-width="2"/>
      <path d="M-8,-22 C-5,-4 -5,12 -6,26 H6 C5,12 5,-4 8,-22Z" fill="#1a2238"/>
      ${[-16, -6, 4, 14].map((yy) => `<circle cx="-9" cy="${yy}" r="1.6" fill="#c9ccd2"/><circle cx="9" cy="${yy}" r="1.6" fill="#c9ccd2"/><path d="M-9,${yy} L9,${yy + 6} M9,${yy} L-9,${yy + 6}" stroke="#f4f1e8" stroke-width="1.6" stroke-linecap="round"/>`).join('')}
      <path d="M-4,26 C-10,34 -14,36 -18,34 M4,26 C10,32 16,34 20,30" fill="none" stroke="#f4f1e8" stroke-width="1.6" stroke-linecap="round"/>
      ${hl('M-14,-30 C-17,-14 -17,4 -14,20', 0.3)}</g>`;
    return `<g transform="translate(${x},${y}) scale(${s}) rotate(-12)">${shoe(-26, false)}<g transform="translate(4,8) rotate(14)">${shoe(26, true)}</g></g>`;
  }
  // 來一客泡麵（側躺）
  function cupNoodle(x, y, s = 1, rot = -70) {
    return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">
      <path d="M-34,-36 L34,-36 L26,40 L-26,40Z" fill="url(#rlCup)" ${ln(1.3)}/>
      <path d="M-33,-26 L33,-26 L32,-14 L-32,-14Z" fill="#3a5ea8"/><path d="M-26,40 L26,40 L27,30 L-27,30Z" fill="#3a5ea8"/>
      <path d="M-30,-6 C-14,2 14,-10 30,-2 L28,22 C12,14 -12,26 -28,18Z" fill="#e9eef8"/>
      <text x="0" y="14" text-anchor="middle" font-size="19" fill="#1b2a52" font-family="'GenSekiH','GenSeki',serif" font-weight="900" transform="rotate(-4)">來一客</text>
      <rect x="-24" y="20" width="22" height="8" rx="1.5" fill="#2f5fbf"/><text x="-13" y="26.5" text-anchor="middle" font-size="5.6" fill="#fff" font-weight="700" font-family="'GenSeki',sans-serif">鮮蝦魚板</text>
      <path d="M-40,-44 L40,-44 L38,-36 L-38,-36Z" fill="#f4f5f8" ${ln(1.2)}/><path d="M-36,-42 H36" stroke="#3a5ea8" stroke-width="2"/>
      ${shadeP('M14,-36 L34,-36 L26,40 L12,40Z', 0.12)}${hl('M-26,-30 L-20,34', 0.5)}</g>`;
  }

  // ---------- 信用卡 ----------
  function creditCard(x, y, s = 1, rot = 0) {
    const c = data.card;
    return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">
      <rect x="2" y="4" width="220" height="138" rx="12" fill="#000" opacity=".25"/>
      <rect x="0" y="0" width="220" height="138" rx="12" fill="url(#rlCard)" ${ln(1.4)}/>
      <path d="M0,104 C70,78 150,128 220,86 V126 Q220,138 208,138 H12 Q0,138 0,126Z" fill="#fff" opacity=".06"/>
      <path d="M140,0 L220,0 L220,60Z" fill="#fff" opacity=".05"/>
      <path d="M28,12 L31.5,22 L42,22 L33.5,28.5 L36.8,39 L28,32.5 L19.2,39 L22.5,28.5 L14,22 L24.5,22Z" fill="#f2cf63" ${ln(.8)}/>
      <rect x="20" y="50" width="34" height="27" rx="5" fill="url(#rlChip)" ${ln(.9)}/><path d="M20,59 h10 M20,68 h10 M44,59 h10 M44,68 h10 M30,50 v27 M44,50 v27 M30,63.5 h14" stroke="#8a6a24" stroke-width=".9" fill="none"/>
      <path d="M188,54 q6,8 0,16 M194,50 q9,12 0,24 M200,46 q12,16 0,32" fill="none" stroke="#cfd6ff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
      <text x="20" y="102" font-size="16" fill="#e9ecf5" letter-spacing=".5" ${MONO} style="paint-order:stroke" stroke="#000" stroke-opacity=".35" stroke-width="1.2">${esc(c.number)}</text>
      <text x="20" y="127" font-size="14" fill="#e9ecf5" letter-spacing="1" ${HELV}>${esc(c.name)}</text>
      <text x="204" y="127" text-anchor="end" font-size="9" fill="#b9c2e8" ${HELV}>VALID THRU 08/29</text>
    </g>`;
  }
  // ---------- 旅遊貼文的「照片」（插畫風）----------
  function person(x, y, s, o = {}) {
    const t = A.st(1.6), sk = o.skin || '#f1c9a5', top = o.top || '#c9463d';
    return `<g transform="translate(${x},${y}) scale(${s})">
      <rect x="-7" y="-27" width="6" height="27" rx="2" fill="${o.legs || '#2b3040'}" ${t}/><rect x="1" y="-27" width="6" height="27" rx="2" fill="${o.legs || '#2b3040'}" ${t}/>
      <rect x="-15" y="-50" width="6" height="22" rx="3" fill="${top}" ${t}/><rect x="9" y="-50" width="6" height="22" rx="3" fill="${top}" ${t}/>
      <rect x="-11" y="-54" width="22" height="30" rx="7" fill="${top}" ${t}/>
      ${o.yoke ? `<path d="M-11,-47 l3.6,3 3.6,-3 3.6,3 3.6,-3 3.6,3 3.6,-3" fill="none" stroke="${o.yoke}" stroke-width="2"/><path d="M-11,-41 h22" stroke="${o.yoke}" stroke-width="1.5" stroke-dasharray="2 2"/>` : ''}
      ${o.scarf ? `<rect x="-11" y="-57" width="22" height="7" rx="3" fill="${o.scarf}" ${t}/><rect x="4" y="-52" width="6" height="14" fill="${o.scarf}" ${t}/>` : ''}
      <circle cx="0" cy="-65" r="10" fill="${sk}" ${t}/>
      ${o.beanie ? `<path d="M-10,-66 q0,-13 10,-13 q10,0 10,13Z" fill="${o.beanie}" ${t}/><circle cx="0" cy="-80" r="3" fill="#fff" ${A.st(1)}/>` : `<path d="M-10,-65 q0,-12 10,-12 q10,0 10,12 q-10,-6 -20,0Z" fill="${o.hair || '#3b2a20'}"/>`}
      <circle cx="-3.5" cy="-64" r="1.4" fill="${INK}"/><circle cx="3.5" cy="-64" r="1.4" fill="${INK}"/>
      ${o.breath ? `<g fill="#fff" opacity=".85"><circle cx="15" cy="-62" r="3"/><circle cx="21" cy="-66" r="4.5"/></g>` : ''}
    </g>`;
  }
  const snow = (seed, n = 26) => { const r = rng(seed); return Array.from({ length: n }, () => `<circle cx="${(r() * 200).toFixed(0)}" cy="${(r() * 120).toFixed(0)}" r="${(1 + r() * 1.6).toFixed(1)}" fill="#fff" opacity=".9"/>`).join(''); };
  function photo(id, k) {
    const t = A.st(1.6);
    if (id === 'syd' && k === 0) return `<rect width="200" height="120" fill="#8fd8ff"/><circle cx="168" cy="24" r="13" fill="#ffe066"/>
      <path d="M0,34 Q22,28 44,44 L56,60 H0Z" fill="#d9b77a" ${t}/><path d="M150,52 q20,-14 50,-10 V60 H146Z" fill="#c9a870" ${t}/>
      <rect x="0" y="58" width="200" height="24" fill="#1f8fd6"/>${[62, 70, 78].map((y, i) => `<path d="M${i * 7},${y} q10,-4 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0" fill="none" stroke="#fff" stroke-width="2" opacity=".85"/>`).join('')}
      <path d="M0,80 Q100,72 200,80 V120 H0Z" fill="#f3d9a0"/>
      <path d="M118,104 V74" stroke="${INK}" stroke-width="2"/><path d="M118,74 h16 v10 h-16Z" fill="#ffd23f" ${A.st(1)}/><path d="M118,74 l16,10 h-16Z" fill="#e5382f"/>
      <path d="M150,104 V76" stroke="${INK}" stroke-width="2"/><path d="M150,76 h16 v10 h-16Z" fill="#ffd23f" ${A.st(1)}/><path d="M150,76 l16,10 h-16Z" fill="#e5382f"/>
      <ellipse cx="40" cy="98" rx="16" ry="4" fill="#ff7a1a" ${A.st(1)} transform="rotate(-8 40 98)"/><ellipse cx="74" cy="106" rx="16" ry="4" fill="#3aa0ff" ${A.st(1)} transform="rotate(10 74 106)"/>
      <path d="M20,94 a14,10 0 0 1 28,0Z" fill="#fff" ${A.st(1)}/><path d="M20,94 a14,10 0 0 1 9,-9 l5,9Z" fill="#e5382f"/><path d="M34,94 v10" stroke="${INK}" stroke-width="1.5"/>`;
    if (id === 'syd') return `<rect width="200" height="120" fill="#9fe0ff"/><circle cx="30" cy="20" r="12" fill="#ffe066"/>
      <rect x="0" y="46" width="200" height="16" fill="#1f8fd6"/><path d="M0,52 q10,-4 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0" fill="none" stroke="#fff" stroke-width="2"/>
      <rect x="0" y="60" width="200" height="60" fill="#f3d9a0"/>
      <path d="M128,60 a34,22 0 0 1 68,0Z" fill="#fff" ${t}/>${[0, 1, 2].map((i) => `<path d="M${128 + i * 22},60 a34,22 0 0 1 ${i === 1 ? 24 : 11},${i === 1 ? -22 : -18} l${i === 1 ? -2 : 4},22Z" fill="#ff5d8f" opacity=".85"/>`).join('')}<path d="M162,60 v52" stroke="${INK}" stroke-width="2.5"/>
      <rect x="140" y="104" width="44" height="8" rx="3" fill="#3aa0ff" ${A.st(1.2)}/>
      <g transform="translate(78,118)">
        <rect x="-8" y="-30" width="6.5" height="30" rx="3" fill="#f1c9a5" ${t}/><rect x="1.5" y="-30" width="6.5" height="30" rx="3" fill="#f1c9a5" ${t}/>
        <path d="M-15,-58 Q-24,-46 -20,-34" fill="none" stroke="#f1c9a5" stroke-width="6" stroke-linecap="round"/><path d="M15,-58 Q26,-68 22,-80" fill="none" stroke="#f1c9a5" stroke-width="6" stroke-linecap="round"/>
        <path d="M-11,-62 h22 l-2,28 h-18Z" fill="#f1c9a5" ${t}/>
        <path d="M-10,-36 h20 l-3,8 q-7,4 -14,0Z" fill="#ff5d8f" ${t}/>
        <path d="M-10,-58 q4,8 9,0 M1,-58 q4,8 9,0" fill="#ff5d8f" ${t}/><path d="M-1,-57 h2" stroke="${INK}" stroke-width="1.5"/>
        <path d="M-13,-70 q-4,-22 13,-22 q17,0 13,22 q2,10 -2,16 l-4,-12 h-14 l-4,12 q-4,-6 -2,-16Z" fill="#7a4a24" ${t}/>
        <circle cx="0" cy="-74" r="10" fill="#f1c9a5" ${t}/><path d="M-10,-80 q10,-8 20,0" fill="#7a4a24"/>
        <rect x="-9" y="-78" width="8" height="5" rx="2" fill="#15161b"/><rect x="1" y="-78" width="8" height="5" rx="2" fill="#15161b"/><path d="M-1,-76 h2" stroke="#15161b" stroke-width="1.5"/>
        <path d="M-3,-68 q3,2 6,0" fill="none" stroke="#b33a3a" stroke-width="1.5"/>
      </g>`;
    if (id === 'lis' && k === 0) return `<rect width="200" height="120" fill="#8fd0ff"/><circle cx="172" cy="20" r="11" fill="#ffe066"/>
      ${[[0, '#f7b2a6'], [40, '#ffe08a'], [80, '#9fd8cf'], [120, '#f3f0e6'], [160, '#c9b3e6']].map(([x, c], i) => `<rect x="${x}" y="${30 + i * 8}" width="40" height="90" fill="${c}" ${t}/><path d="M${x - 2},${30 + i * 8} l22,-14 22,14Z" fill="#d9603b" ${t}/>${[0, 1].map((j) => `<rect x="${x + 8 + j * 16}" y="${44 + i * 8}" width="8" height="10" fill="#5a6f8a"/>`).join('')}`).join('')}
      <path d="M0,120 L0,96 L200,62 L200,120Z" fill="#8b8e96" ${t}/><path d="M0,104 L200,70" stroke="#c9ccd2" stroke-width="2"/>
      <g transform="translate(96,86) rotate(-10)"><rect x="-36" y="-30" width="72" height="34" rx="6" fill="#ffcc00" ${t}/><rect x="-36" y="-2" width="72" height="6" fill="#f2f2ee" ${A.st(1)}/>
        ${[0, 1, 2, 3].map((i) => `<rect x="${-30 + i * 16}" y="-24" width="11" height="12" rx="2" fill="#cfe9ff" ${A.st(1)}/>`).join('')}<path d="M0,-30 v-12 l10,-6" fill="none" stroke="${INK}" stroke-width="2"/>
        <circle cx="-22" cy="6" r="4" fill="#2b2b33"/><circle cx="22" cy="6" r="4" fill="#2b2b33"/><text x="0" y="-33" text-anchor="middle" font-size="7" fill="${INK}" ${HELV}>28</text></g>`;
    if (id === 'lis') return `<rect width="200" height="120" fill="#a9e4ff"/><circle cx="34" cy="22" r="13" fill="#ffe066"/>
      <rect x="0" y="70" width="200" height="50" fill="#1f8fd6"/>
      <path d="M40,120 C40,60 90,24 150,30 C190,34 200,60 186,74 C172,84 150,70 160,58 C140,56 120,80 118,120Z" fill="#2b9de8" ${t}/>
      <path d="M150,30 C180,32 196,52 186,70" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M60,104 q20,-30 50,-46" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>
      <g transform="translate(96,76) rotate(-20)"><ellipse cx="0" cy="0" rx="26" ry="5" fill="#fff" ${t}/><path d="M-20,0 h40" stroke="#e5382f" stroke-width="2"/></g>
      <g transform="translate(96,70) rotate(-12)">${person(0, 0, 0.7, { top: '#1d3557', legs: '#1d3557', hair: '#3b2a20' })}</g>
      ${[[22, 112], [60, 116], [180, 110]].map(([x, y]) => `<path d="M${x},${y} q6,-6 12,0" fill="none" stroke="#fff" stroke-width="2"/>`).join('')}`;
    if (id === 'hok' && k === 0) return `<rect width="200" height="120" fill="#b9c9dc"/>${snow(11, 18)}
      <path d="M0,40 L200,110 V120 H0Z" fill="#fff" ${t}/><path d="M0,60 L200,120 H0Z" fill="#eef4fb"/>
      ${[[20, 40], [44, 46], [160, 98], [182, 104]].map(([x, y]) => `<path d="M${x},${y - 30} l12,30 h-24Z" fill="#2f5a3c" ${t}/><path d="M${x - 5},${y - 18} l5,-6 5,6Z" fill="#fff"/>`).join('')}
      <path d="M58,88 q30,-30 70,-26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>
      <g transform="translate(106,70) rotate(-18)">
        <path d="M-30,10 l60,10" stroke="#1b1b1f" stroke-width="3.5" stroke-linecap="round"/><path d="M-26,4 l60,10" stroke="#1b1b1f" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M-18,-20 l-12,30 M18,-20 l14,28" stroke="#4a4f5c" stroke-width="2"/>
        ${person(0, 10, 0.62, { top: '#e5382f', legs: '#23262e', beanie: '#2f6fe0' })}
        <rect x="-6" y="-37" width="12" height="5" rx="2" fill="#ffb000" ${A.st(1)}/></g>`;
    if (id === 'hok') return `<rect width="200" height="120" fill="#7d8fb0"/>${snow(23, 30)}
      ${[[0, '#8a5a3b'], [70, '#6e4a33'], [140, '#8a5a3b']].map(([x, c]) => `<rect x="${x + 4}" y="40" width="58" height="56" fill="${c}" ${t}/><path d="M${x},42 l33,-22 33,22Z" fill="#fff" ${t}/>${[0, 1].map((j) => `<rect x="${x + 12 + j * 24}" y="54" width="14" height="14" fill="#ffd98a" ${A.st(1)}/>`).join('')}`).join('')}
      <ellipse cx="116" cy="56" rx="6" ry="8" fill="#e5382f" ${A.st(1.2)}/><path d="M116,46 v2" stroke="${INK}" stroke-width="1.5"/>
      <rect x="0" y="94" width="200" height="26" fill="#f4f7fb"/>
      ${person(72, 116, 0.95, { top: '#c9463d', yoke: '#f3e7d3', scarf: '#2f6fe0', beanie: '#f3e7d3', legs: '#2b3040', breath: 1 })}`;
    if (id === 'rek' && k === 0) return `<rect width="200" height="120" fill="#0d1838"/>${snow(5, 14).replace(/fill="#fff"/g, 'fill="#e8f0ff"')}
      <path d="M-10,52 C30,20 70,60 110,30 S180,30 210,14" fill="none" stroke="#39ff8a" stroke-width="16" opacity=".35"/><path d="M-10,52 C30,20 70,60 110,30 S180,30 210,14" fill="none" stroke="#7dffb4" stroke-width="4" opacity=".8"/>
      <path d="M-10,70 C40,44 90,74 130,48 S190,52 210,40" fill="none" stroke="#3affd0" stroke-width="12" opacity=".25"/><path d="M60,10 C80,30 70,50 90,70" fill="none" stroke="#b07dff" stroke-width="6" opacity=".25"/>
      <path d="M0,92 L36,66 60,84 92,58 128,86 160,70 200,90 V120 H0Z" fill="#141a2b" ${t}/><path d="M0,104 Q100,96 200,104 V120 H0Z" fill="#e8eef8"/>
      <g transform="translate(150,118)"><path d="M0,-34 L-14,0 M0,-34 L14,0 M0,-34 V0" stroke="#c9ccd2" stroke-width="2.5" stroke-linecap="round"/><rect x="-12" y="-46" width="24" height="14" rx="3" fill="#2b2b33" ${A.st(1.2)}/><circle cx="-12" cy="-39" r="5" fill="#4a4f5c" ${A.st(1)}/></g>`;
    return `<rect width="200" height="120" fill="#9fb4cc"/>${snow(41, 26)}
      <path d="M120,96 V40 l6,-4 V22 l4,-4 V6 l4,8 V18 l4,4 V36 l6,4 V96Z" fill="#c9ccd2" ${t}/><path d="M96,96 V58 l24,-12 V96Z M168,96 V58 l-24,-12 V96Z" fill="#b7bcc6" ${t}/>
      ${[[0, '#e5382f'], [36, '#ffd23f'], [176, '#2f6fe0']].map(([x, c]) => `<rect x="${x + 2}" y="62" width="32" height="36" fill="${c}" ${t}/><path d="M${x},64 l18,-14 18,14Z" fill="#fff" ${t}/><rect x="${x + 12}" y="72" width="10" height="10" fill="#fff6c8" ${A.st(1)}/>`).join('')}
      <rect x="0" y="96" width="200" height="24" fill="#f4f7fb"/>
      ${person(84, 118, 0.95, { top: '#5a4a3a', yoke: '#f3e7d3', beanie: '#2f6fe0', legs: '#23262e', breath: 1 })}`;
  }
  function photoTag(id, k, x, y, w, h) { return `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" fill="#fff" ${A.st(1.5)}/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">${photo(id, k)}</svg>`; }
  const pin = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0,8 C-8,-2 -8,-10 0,-10 C8,-10 8,-2 0,8Z" fill="#e5382f" ${A.st(1.2)}/><circle cx="0" cy="-4" r="2.6" fill="#fff"/></g>`;
  function postCard(p, x, y, w) {
    const ph = Math.round((w - 16) * 0.6);
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${ph * 2 + 48}" rx="8" fill="#fff" ${ST2}/>
      ${pin(x + 14, y + 17, 1)}<text x="${x + 26}" y="${y + 22}" font-size="13" fill="${INK}" ${HELV}>${esc(p.place)}</text>
      ${photoTag(p.id, 0, x + 8, y + 32, w - 16, ph)}${photoTag(p.id, 1, x + 8, y + 38 + ph, w - 16, ph)}</g>`;
  }

  // ---------- 駭客 terminal：圖形、選項 ----------
  const TDEFS = `<defs><pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.6" fill="#000" opacity=".35"/></pattern>
    <filter id="tglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  function shapePath(kind, cx, cy, r) {
    if (kind === 'star') return `<polygon points="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(' ')}"`;
    if (kind === 'triangle') return `<polygon points="${cx},${cy - r} ${(cx + r * 0.95).toFixed(1)},${(cy + r * 0.7).toFixed(1)} ${(cx - r * 0.95).toFixed(1)},${(cy + r * 0.7).toFixed(1)}"`;
    return `<path d="M${cx},${cy + r * 0.85} C${cx - r * 1.5},${cy - r * 0.15} ${cx - r * 0.75},${cy - r * 1.25} ${cx},${cy - r * 0.42} C${cx + r * 0.75},${cy - r * 1.25} ${cx + r * 1.5},${cy - r * 0.15} ${cx},${cy + r * 0.85}Z"`;
  }
  // 綠色線條，疊兩層（內細外粗淡）做出螢幕上一條條堆疊的感覺
  const gline = (open, w = 3) => `${open} fill="none" stroke="${GRN}" stroke-width="${w * 2.6}" opacity=".18" stroke-linejoin="round" stroke-linecap="round"/>${open} fill="none" stroke="${GRN}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const shapeG = (kind, cx, cy, r, w = 3) => gline(shapePath(kind, cx, cy, r), w);
  function arrowG(d, cx, cy, r, w = 3) {
    const p = `M0,${-r} L${r * 0.72},${-r * 0.12} L${r * 0.28},${-r * 0.12} L${r * 0.28},${r} L${-r * 0.28},${r} L${-r * 0.28},${-r * 0.12} L${-r * 0.72},${-r * 0.12}Z`;
    return `<g transform="translate(${cx},${cy}) rotate(${d * 90})">${gline(`<path d="${p}"`, w)}</g>`;
  }
  const qmark = (cx, cy, size) => `<text x="${cx}" y="${cy + size * 0.36}" text-anchor="middle" font-size="${size}" fill="${GRN}" filter="url(#tglow)" ${MONO}>?</text>`;
  // 拼半邊的圖：code＝「L/R/F-幾邊形-圓」（L 左半、R 右半、F 完整）；圓：solid 實心、hollow 空心、top 上半實心、bottom 下半實心
  let clipN = 0;
  function halfPiece(code, cx, cy, r) {
    const [side, ns, fill] = String(code).split('-'), n = Number(ns);
    const shift = side === 'L' ? r * 0.42 : side === 'R' ? -r * 0.42 : 0, x = cx + shift;
    const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return `${(x + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
    const rc = r * 0.36, bot = n % 2 ? r * Math.cos(Math.PI / n) : r;
    const half = (up) => `<path d="M${x - rc},${cy} A${rc},${rc} 0 0 ${up ? 1 : 0} ${x + rc},${cy}Z" fill="${GRN}"/>`;
    const dot = fill === 'solid' ? `<circle cx="${x}" cy="${cy}" r="${rc}" fill="${GRN}"/>` : fill === 'top' ? half(true) : fill === 'bottom' ? half(false) : '';
    const body = `${gline(`<polygon points="${pts}"`, 3)}${dot}${gline(`<circle cx="${x}" cy="${cy}" r="${rc}"`, 2.6)}`;
    if (side === 'F') return body;
    const id = `hp${++clipN}`, cut = gline(`<path d="M${x},${cy - r} V${(cy + bot).toFixed(1)}"`, 3);
    return `<defs><clipPath id="${id}"><rect x="${side === 'L' ? x - r - 8 : x}" y="${cy - r - 8}" width="${r + 8}" height="${2 * r + 16}"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>${cut}`;
  }
  const opText = (t, cx, cy, size = 40) => `<text x="${cx}" y="${cy + size * 0.36}" text-anchor="middle" font-size="${size}" fill="${GRN}" filter="url(#tglow)" ${MONO}>${esc(t)}</text>`;
  function figure(h, cx, cy) {
    if (h.kind === 'floors') {
      const { n, mark } = h.fig, fh = Math.min(56, 330 / n), w = 210, x0 = cx - 150, bot = cy + (n * fh) / 2;
      let o = gline(`<path d="M${x0 - 30},${bot} H${x0 + w + 30}"`, 3);
      for (let i = 0; i < n; i++) {
        const y = bot - (i + 1) * fh;
        o += gline(`<rect x="${x0}" y="${y.toFixed(1)}" width="${w}" height="${fh.toFixed(1)}"`, 2.6);
        for (let j = 0; j < 4; j++) o += gline(`<rect x="${x0 + 22 + j * 46}" y="${(y + fh * 0.28).toFixed(1)}" width="28" height="${(fh * 0.44).toFixed(1)}"`, 1.6);
        const lab = i === 0 ? '1F' : i === n - 1 ? `${n}F` : i + 1 === mark ? '?' : '';
        if (lab) o += `${gline(`<path d="M${x0 + w + 54},${(y + fh / 2).toFixed(1)} h-28 m10,-9 l-10,9 l10,9"`, 3)}<text x="${x0 + w + 64}" y="${(y + fh / 2 + 10).toFixed(1)}" font-size="30" fill="${GRN}" filter="url(#tglow)" ${MONO}>${lab}</text>`;
      }
      return o + gline(`<path d="M${x0 - 6},${bot - n * fh} L${x0 + w / 2},${bot - n * fh - 26} L${x0 + w + 6},${bot - n * fh}"`, 2.6);
    }
    const cell = 112, gx = cx - cell * 1.5, gy = cy - cell * 1.5;
    let o = '';
    for (let i = 0; i <= 3; i++) o += gline(`<path d="M${gx},${gy + i * cell} h${cell * 3} M${gx + i * cell},${gy} v${cell * 3}"`, 1.8);
    h.fig.forEach((c, i) => {
      const x = gx + (i % 3) * cell + cell / 2, y = gy + Math.floor(i / 3) * cell + cell / 2;
      o += c === null ? qmark(x, y, 64) : h.kind === 'halves' ? halfPiece(c, x, y, 40) : typeof c === 'string' ? opText(c, x, y, 42) : arrowG(c, x, y, 34);
    });
    return o;
  }
  function optionG(kind, v, cx, cy) {
    if (kind === 'floors') return `<text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="44" fill="${GRN}" filter="url(#tglow)" ${MONO}>${esc(v)}</text>`;
    return kind === 'halves' ? halfPiece(v, cx, cy, 40) : arrowG(Number(v), cx, cy, 30);
  }
  const hk = () => { const h = (data && data.hack) || { phase: 'idle' }; return h.phase === 'locked' && Date.now() >= tAt ? { phase: 'idle' } : h; };
  const secLeft = () => Math.max(0, Math.ceil((tAt - Date.now()) / 1000));
  const cdText = () => `00:${String(secLeft()).padStart(2, '0')}`;
  function termFrame(x, y, w, h, inner) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${TBG}" ${ST2}/>
      <rect x="${x}" y="${y}" width="${w}" height="28" rx="8" fill="#1d2a22"/><rect x="${x}" y="${y + 20}" width="${w}" height="8" fill="#1d2a22"/>
      ${['#ff5f57', '#febc2e', '#28c840'].map((c, i) => `<circle cx="${x + 18 + i * 18}" cy="${y + 14}" r="5.5" fill="${c}"/>`).join('')}
      <text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" font-size="13" fill="#8fbf9c" ${MONO}>terminal — airline_db</text>
      <g>${inner}</g>
      <rect x="${x}" y="${y + 28}" width="${w}" height="${h - 28}" fill="url(#scan)" style="pointer-events:none"/>`;
  }
  const gtext = (x, y, s, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${s}" fill="${o.c || GRN}" ${o.mid ? 'text-anchor="middle"' : ''} ${o.id ? `id="${o.id}"` : ''} filter="url(#tglow)" ${MONO}>${esc(txt)}</text>`;
  const RED = '#ff5a4f';

  // A 的 terminal（右半邊）
  function termA(x, y, w, h) {
    const H = hk(), L = x + 22, cx = x + w / 2;
    let inner = '';
    if (H.phase === 'idle') {
      inner = gtext(cx, y + h / 2 - 10, 48, 'TERMINAL', { mid: 1 })
        + `<text x="${cx}" y="${y + h / 2 + 40}" text-anchor="middle" font-size="18" fill="#8fdca5" filter="url(#tglow)" ${MONO}>${esc(tr('等待遠端連線', 'Waiting for remote connection'))}<tspan class="s3-dot1">.</tspan><tspan class="s3-dot2">.</tspan><tspan class="s3-dot3">.</tspan></text>`;
    } else if (H.phase === 'locked') {
      inner = gtext(cx, y + 190, 30, 'ACCESS DENIED', { c: RED, mid: 1 }) + gtext(cx, y + 232, 18, tr('資料庫不對！安全鎖定中', 'WRONG DATABASE · SECURITY LOCK'), { c: RED, mid: 1 }) + gtext(cx, y + 300, 46, cdText(), { c: RED, mid: 1, id: 's3-cd' });
    } else if (H.phase === 'puzzle') {
      inner = gtext(L, y + 64, 20, `CHALLENGE ${H.step + 1}/${H.total}`) + gtext(x + w - 22, y + 64, 26, cdText(), { id: 's3-cd' }).replace('<text ', '<text text-anchor="end" ')
        + gtext(L, y + 94, 15, tr('問 Slothy 螢幕上的題目，選出答案：', 'Ask Slothy what’s on the screen, then pick:'), { c: '#8fdca5' })
        + H.opts.map((v, i) => { const yy = y + 112 + i * 124; return `<g class="hot" data-hot="opt-${i}"><rect x="${L}" y="${yy}" width="${w - 44}" height="108" rx="8" fill="#0a1a0f" stroke="${GRN2}" stroke-width="2.5"/>${gtext(L + 16, yy + 36, 18, String.fromCharCode(65 + i) + '.')}${optionG(H.kind, v, cx, yy + 54)}</g>`; }).join('');
    } else if (H.phase === 'retry') {
      inner = gtext(cx, y + 200, 32, 'ACCESS DENIED', { c: RED, mid: 1 }) + gtext(cx, y + 240, 17, tr('防火牆把你踢出來了', 'The firewall kicked you out'), { c: RED, mid: 1 })
        + `<g class="hot" data-hot="retry"><rect x="${cx - 100}" y="${y + 290}" width="200" height="60" rx="8" fill="#0a1a0f" stroke="${GRN}" stroke-width="3"/>${gtext(cx, y + 329, 24, tr('[ 重試 ]', '[ RETRY ]'), { mid: 1 })}</g>`;
    } else if (H.phase === 'done') {
      const bw = (w - 54) / 2;
      inner = `<g class="hot" data-hot="manifest"><rect x="${x}" y="${y + 30}" width="${w}" height="${h - 30}" fill="${TBG}"/>${gtext(L, y + 62, 20, 'ACCESS GRANTED ✓')}${gtext(L, y + 90, 17, tr('旅客名單 PASSENGER LIST', 'PASSENGER LIST'), { c: '#8fdca5' })}
        ${H.manifest.map((m, i) => { const bx = L + (i % 2) * (bw + 10), by = y + 106 + Math.floor(i / 2) * 196; return `<rect x="${bx}" y="${by}" width="${bw}" height="184" rx="6" fill="#0a1a0f" stroke="${GRN2}" stroke-width="2"/>${gtext(bx + 12, by + 28, 20, `✈ ${m.flight}`)}<path d="M${bx + 10},${by + 38} h${bw - 20}" stroke="${GRN2}" stroke-width="1.5"/>${m.names.map((n, j) => gtext(bx + 14, by + 64 + j * 24, 17, n)).join('')}`; }).join('')}
        ${ui.seen.manifest ? '' : `<rect class="pulse" x="${x + 8}" y="${y + 36}" width="${w - 16}" height="${h - 44}" rx="10" fill="none" stroke="#ffd23f" stroke-width="5"/>`}</g>`;
    }
    return termFrame(x, y, w, h, inner);
  }
  // B 的 terminal（整個螢幕）
  function termB(x, y, w, h) {
    const H = hk(), cx = x + w / 2, cy = y + h / 2 + 20;
    let inner = '';
    if (H.phase === 'idle') {
      const L = x + 40, bw = w - 80;
      inner = gtext(L, y + 70, 20, '> connect airline_db') + gtext(L, y + 116, 28, tr('選擇一間航空公司：', 'SELECT AN AIRLINE:'))
        + data.airlines.map((a, i) => { const yy = y + 146 + i * 96; return `<g class="hot" data-hot="air-${a.code}"><rect x="${L}" y="${yy}" width="${bw}" height="80" rx="8" fill="#0a1a0f" stroke="${GRN2}" stroke-width="2.5"/>
          ${gtext(L + 22, yy + (a.zh ? 36 : 50), 28, `[${a.code}] ${a.name}`)}${a.zh ? gtext(L + 22, yy + 64, 18, a.zh, { c: '#8fdca5' }) : ''}</g>`; }).join('')
        + (ui.seen.air ? '' : `<rect class="pulse" x="${L - 8}" y="${y + 138}" width="${bw + 16}" height="${data.airlines.length * 96}" rx="12" fill="none" stroke="#ffd23f" stroke-width="5"/>`)
        + `<text x="${L}" y="${y + h - 30}" font-size="22" fill="${GRN}" ${MONO}>&gt; <tspan class="s3-caret">_</tspan></text>`;
    }
    else if (H.phase === 'locked') inner = gtext(cx, cy - 40, 44, 'ACCESS DENIED', { c: RED, mid: 1 }) + gtext(cx, cy + 6, 20, tr('安全鎖定中', 'SECURITY LOCK'), { c: RED, mid: 1 }) + gtext(cx, cy + 70, 46, cdText(), { c: RED, mid: 1, id: 's3-cd' });
    else if (H.phase === 'puzzle') inner = gtext(x + 24, y + 62, 22, `CHALLENGE ${H.step + 1}/${H.total}`) + gtext(x + w - 24, y + 66, 34, cdText(), { id: 's3-cd' }).replace('<text ', '<text text-anchor="end" ') + figure(H, cx, cy + 10);
    else if (H.phase === 'retry') inner = gtext(cx, cy - 20, 48, 'ACCESS DENIED', { c: RED, mid: 1 }) + gtext(cx, cy + 30, 20, tr('等 Raccoony 按重試……', 'Waiting for Raccoony to retry…'), { c: RED, mid: 1 });
    else if (H.phase === 'done') inner = gtext(cx, cy - 30, 48, 'ACCESS GRANTED ✓', { mid: 1 }) + gtext(cx, cy + 20, 20, tr('旅客名單已傳到 Raccoony 的電腦', 'Passenger list sent to Raccoony’s computer'), { mid: 1, c: '#8fdca5' });
    return termFrame(x, y, w, h, inner);
  }

  // ---------- 爆炸：美漫風「BOOM!」----------
  function roomBoom() {
    const star = (r1, r2, n, rot = 0) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + (i * Math.PI) / n, r = i % 2 ? r2 : r1 * (0.85 + ((i * 37) % 7) / 30); return `${(500 + r * Math.cos(a)).toFixed(0)},${(350 + r * Math.sin(a)).toFixed(0)}`; }).join(' ');
    return `${SVG_OPEN('BOOM')}<defs>${HT}</defs>
      <rect x="-900" width="2800" height="700" fill="#1b0b06"/>
      <g class="s3-boom">
        <polygon points="${star(560, 300, 14)}" fill="#c5262c" ${ST}/>
        <polygon points="${star(430, 230, 12, 0.2)}" fill="#ff7a1a" ${ST}/><polygon points="${star(430, 230, 12, 0.2)}" fill="url(#s3ht)"/>
        <polygon points="${star(300, 170, 10, 0.45)}" fill="#ffd23f" ${ST}/>
        ${[[140, 120, 60], [860, 140, 70], [120, 590, 70], [880, 580, 60], [500, 70, 50]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4a4f5c" ${ST}/><circle cx="${x + r * 0.5}" cy="${y - r * 0.4}" r="${r * 0.6}" fill="#6b7080" ${ST2}/>`).join('')}
        <g transform="translate(500,395) rotate(-8)">
          <text x="0" y="0" text-anchor="middle" font-size="170" fill="#ffd23f" stroke="${INK}" stroke-width="30" stroke-linejoin="round" font-family="'Bebas Neue',Impact,sans-serif" letter-spacing="6">BOOM!</text>
          <text x="0" y="0" text-anchor="middle" font-size="170" fill="#fff36b" font-family="'Bebas Neue',Impact,sans-serif" letter-spacing="6">BOOM!</text>
        </g>
      </g>
      <text x="500" y="640" text-anchor="middle" font-size="30" fill="#fff" ${FONT}>${tr('炸彈爆炸了……時間倒回去，再來一次！', 'The bomb went off… time rewinds. Try again!')}</text>
    </svg>`;
  }
  function startBoom() {
    booming = true; bombOn = false; bombClock();
    ui = fresh(); introDone = false; introStarted = false; introTimers.forEach(clearTimeout); introTimers = [];
    if (window.Music) { if (Music.hush) Music.hush(); if (Music.boom) Music.boom(); }
    draw();
    clearTimeout(boomTimer);
    boomTimer = setTimeout(() => { booming = false; draw(); startIntro(); }, 4000);
  }

  // ---------- 開場：兩人同畫面（走進大廳 → 廣播 → 警察衝進來 → 兩人對話）----------
  function roomIntro() {
    const copsL = [0, 1, 2].map((i) => `<g class="s3-rush-l" style="animation-delay:${8.0 + i * 0.12}s">${cop(470 + i * 80, 600 - (i % 2) * 24, 0.62)}</g>`).join('');
    const copsR = [0, 1, 2].map((i) => `<g class="s3-rush-r" style="animation-delay:${8.05 + i * 0.12}s">${cop(940 - i * 80, 612 - (i % 2) * 22, 0.66)}</g>`).join('');
    return `${SVG_OPEN('機場大廳')}${lightsAndCeiling()}${floor()}${counters()}
      ${crowd(12, 77, 540, 640)}
      ${dim()}
      <g class="s3-walkin">${A.shadow(250, 688, 90, 12)}${A.shadow(330, 694, 90, 12)}${A.raccoony(250, 690, 0.52)}${A.slothy(330, 696, 0.58)}</g>
      ${copsL}${copsR}
      <g class="s3-alert">${[200, 800].map((x) => `<circle cx="${x}" cy="58" r="26" fill="#ff3b30" opacity=".35"/><circle cx="${x}" cy="58" r="13" fill="#ff3b30" ${ST2}/>`).join('')}</g>
      <g class="s3-say" style="animation-delay:${T_R / 1000}s">${bubble(40, 300, 300, [LINE_R()], 240, 590)}</g>
      <g class="s3-say" style="animation-delay:${T_S / 1000}s">${bubble(300, 376, 300, [LINE_S()], 336, 590)}</g>
    </svg>`;
  }

  // ---------- A：大廳 + 航班看板（視角 0）／電腦：貼文 + terminal（視角 1）----------
  function navBtn(dir, x0, y0) {
    const x = x0 ?? (dir === 'right' ? 930 : 70), y = y0 ?? 360;
    const tri = dir === 'right' ? 'M-8,-15 L13,0 L-8,15Z' : 'M8,-15 L-13,0 L8,15Z';
    const key = 'nav' + data.role + ui.view;
    return `<g class="hot" data-hot="nav-${dir}"><circle cx="${x}" cy="${y}" r="36" fill="#ffd23f" ${ST}/><path d="${tri}" transform="translate(${x},${y})" fill="${INK}"/>
      ${ui.seen[key] ? '' : `<circle class="pulse" cx="${x}" cy="${y}" r="48" fill="none" stroke="#ff5a5f" stroke-width="6"/>`}</g>`;
  }
  function walkers() {
    const r = rng(31);
    return Array.from({ length: 9 }, (_, i) => {
      const y = 560 + r() * 120, dur = 9 + r() * 8, dl = -r() * dur, dir = i % 2 ? 'rtl' : 'ltr';
      let k = Math.floor(r() * LOOKS.length); if (k === BRIGHT && i > 0) k = (k + 1 + i) % LOOKS.length; // 亮色的人最多一個
      return `<g class="s3-walk ${dir}" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${dl.toFixed(1)}s">${traveler(0, y, 0.3 + ((y - 560) / 120) * 0.25, LOOKS[k], r() < 0.5, dir === 'rtl')}</g>`;
    }).join('');
  }
  function boardSvg() {
    const rows = data.flights.map((f, i) => {
      const y = 200 + i * 32;
      return `<rect x="190" y="${y - 22}" width="620" height="30" fill="${i % 2 ? '#141820' : '#1b2029'}"/>
        <text x="206" y="${y}" font-size="19" fill="#ffd23f" ${HELV}>${esc(f.time)}</text>
        <text x="290" y="${y}" font-size="19" fill="#cfd3da" ${HELV}>${esc(f.flight)}</text>
        <text x="400" y="${y}" font-size="19" fill="#fff" ${HELV}>${esc(f.dest)}</text>
        
        <text x="760" y="${y}" text-anchor="middle" font-size="20" fill="#5ad17a" ${HELV}>${f.gate}</text>`;
    }).join('');
    return `<rect x="176" y="96" width="648" height="370" rx="12" fill="#0d0f14" ${ST}/>
      <text x="196" y="130" font-size="24" fill="#fff" ${HELV}>${tr('DEPARTURES 出境', 'DEPARTURES')}</text>
      <text x="804" y="130" text-anchor="end" font-size="22" fill="#ffd23f" ${HELV}>TODAY · ${esc(data.date.label)}</text>
      <text x="206" y="162" font-size="13" fill="#6d737c" ${HELV}>TIME</text><text x="290" y="162" font-size="13" fill="#6d737c" ${HELV}>FLIGHT</text>
      <text x="400" y="162" font-size="13" fill="#6d737c" ${HELV}>DESTINATION</text><text x="760" y="162" text-anchor="middle" font-size="13" fill="#6d737c" ${HELV}>GATE</text>
      ${rows}`;
  }
  function desk() {
    return `<rect x="-900" y="560" width="2800" height="30" fill="#8a5a2b" ${ST}/><rect x="-900" y="590" width="2800" height="120" fill="#5b3d22"/>`;
  }
  function roomA() {
    if (ui.view === 1) {
      const pw = 186;
      return `${SVG_OPEN('電腦：旅遊貼文與 terminal')}${TDEFS}${lightsAndCeiling()}${floor()}${dim()}${desk()}
        <rect x="112" y="18" width="864" height="552" rx="16" fill="#1b1d24" ${ST}/>
        <g class="hot" data-hot="posts"><rect x="128" y="34" width="400" height="520" rx="6" fill="#eef1f6"/>${data.posts.map((p, i) => postCard(p, 136 + (i % 2) * (pw + 12), 40 + Math.floor(i / 2) * 256, pw)).join('')}
          ${ui.seen.posts ? '' : `<rect class="pulse" x="124" y="30" width="408" height="528" rx="10" fill="none" stroke="#ffd23f" stroke-width="5"/>`}</g>
        ${termA(536, 34, 424, 520)}
        ${A.raccoony(62, 700, 0.42)}
        ${navBtn('left', 56, 360)}
      </svg>`;
    }
    return `${SVG_OPEN('機場大廳與航班看板')}${lightsAndCeiling()}${floor()}
      ${dim()}
      <g class="hot" data-hot="board">${boardSvg()}</g>
      ${walkers()}
      ${A.shadow(110, 698, 90, 12)}${A.raccoony(110, 700, 0.5)}
      ${navBtn('right')}
    </svg>`;
  }

  // ---------- B：和警察圍著地上打開的行李箱（視角 0）／電腦 terminal（視角 1）----------
  // 地上的行李箱（參考照片：硬殼箱側躺，從側面看）：咖啡色硬殼、凸起的肋條、中間一圈拉鍊、提把、密碼鎖、左邊兩個萬向輪。
  // 拉鍊右半邊被拉開了一段，衣服從縫裡掉出來，一隻袖子垂到地上；點了才看到裡面。
  function openSuitcase(x, y, s) {
    const SLEEVE = { tshirt: '#dcaa3e', sweater: '#86303a', downjacket: '#2f4a7c' };
    const sl = SLEEVE[data.clothing.find((c) => SLEEVE[c])] || '#8a8f98';
    const L = -200, R = 200, T = -112, M = -48, B = 14; // 左右、上緣、拉鍊、下緣
    const half = (y0, y1, top) => `<path d="M${L + 14},${y0} H${R - 18} Q${R},${y0} ${R},${y0 + 16} V${y1 - 4} Q${R},${y1} ${R - 6},${y1} H${L + 6} Q${L},${y1} ${L},${y1 - 4} V${y0 + 16} Q${L},${y0} ${L + 14},${y0}Z" fill="url(#cs${top ? 'T' : 'B'})" ${ln(2.4)}/>
      <path d="M${L + 26},${y0 + 10} H${R - 30} V${y1 - 10} H${L + 26}Z" fill="#fff" opacity=".05" ${ln(1)}/>
      ${[-104, 104].map((cx) => `<path d="M${cx - 30},${y0 + 2} h60 v${y1 - y0 - 4} h-60Z" fill="#000" opacity=".1"/><path d="M${cx - 30},${y0 + 2} v${y1 - y0 - 4} M${cx + 30},${y0 + 2} v${y1 - y0 - 4}" stroke="#000" stroke-width="1.6" opacity=".35"/><path d="M${cx - 28},${y0 + 3} v${y1 - y0 - 6}" stroke="#fff" stroke-width="1.4" opacity=".12"/>`).join('')}
      <path d="M${L + 14},${y0 + 2} H${R - 18}" stroke="#fff" stroke-width="2" opacity=".15"/>`;
    const gap0 = 10, gap1 = 140; // 拉鍊拉開的那一段（鎖在它右邊）
    return `<g transform="translate(${x},${y}) scale(${s})">
      <defs>
        <linearGradient id="csT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a524a"/><stop offset=".6" stop-color="#4f3c36"/><stop offset="1" stop-color="#3d2e29"/></linearGradient>
        <linearGradient id="csB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4540"/><stop offset=".5" stop-color="#4a3833"/><stop offset="1" stop-color="#2f2420"/></linearGradient>
      </defs>
      <ellipse cx="18" cy="${B + 8}" rx="236" ry="14" fill="#000" opacity=".4"/>
      ${[[L - 2, T + 18], [L - 2, B - 18]].map(([wx, wy]) => `<rect x="${wx - 10}" y="${wy - 10}" width="14" height="20" rx="3" fill="#1d1a19" ${ln(1.6)}/><circle cx="${wx - 20}" cy="${wy}" r="14" fill="#1d1a19" ${ln(2)}/><circle cx="${wx - 20}" cy="${wy}" r="5" fill="#6b6e75"/>`).join('')}
      ${half(T, M - 4, true)}${half(M + 4, B, false)}
      <rect x="${L}" y="${M - 6}" width="${R - L}" height="12" fill="#1d1a19" ${ln(1.6)}/>
      <path d="M${L + 4},${M} H${gap0} M${gap1},${M} H${R - 4}" stroke="#55504c" stroke-width="2.4" stroke-dasharray="2 2"/>
      <path d="M${gap0},${M - 4} C${gap0 + 30},${M - 22} ${gap1 - 30},${M - 22} ${gap1},${M - 4} L${gap1},${M + 4} C${gap1 - 30},${M + 18} ${gap0 + 30},${M + 18} ${gap0},${M + 4}Z" fill="#120f0e" ${ln(1.6)}/>
      <path d="M${gap0 + 10},${M - 6} C${gap0 + 40},${M - 16} ${gap1 - 40},${M - 16} ${gap1 - 8},${M - 6} L${gap1 - 20},${M + 2} C${gap1 - 50},${M - 4} ${gap0 + 50},${M - 4} ${gap0 + 18},${M + 2}Z" fill="#7d8060" ${ln(1.2)}/>
      <path d="M${gap0 + 60},${M + 4} C${gap0 + 64},${M + 30} ${gap0 + 52},${M + 56} ${gap0 + 60},${B - 2} L${gap0 + 84},${B + 2} C${gap0 + 80},${M + 50} ${gap0 + 92},${M + 26} ${gap0 + 96},${M + 6}Z" fill="${sl}" ${ln(1.8)}/>
      <path d="M${gap0 + 70},${M + 10} C${gap0 + 72},${M + 30} ${gap0 + 64},${M + 48} ${gap0 + 70},${B - 6}" fill="none" stroke="#000" stroke-width="1.3" opacity=".3"/>
      <path d="M${gap0 + 56},${B - 4} L${gap0 + 86},${B} L${gap0 + 84},${B + 14} L${gap0 + 52},${B + 10}Z" fill="${sl}" ${ln(1.6)}/><path d="M${gap0 + 56},${B - 4} L${gap0 + 86},${B} L${gap0 + 84},${B + 14} L${gap0 + 52},${B + 10}Z" fill="#000" opacity=".2"/>
      <path d="M${gap0 + 102},${M + 2} C${gap0 + 112},${M + 14} ${gap0 + 108},${M + 26} ${gap0 + 118},${M + 34} L${gap0 + 132},${M + 30} C${gap0 + 124},${M + 22} ${gap0 + 126},${M + 10} ${gap0 + 118},${M}Z" fill="#d8c8a8" ${ln(1.4)}/>
      <rect x="${gap1 - 8}" y="${M - 9}" width="10" height="18" rx="2" fill="#8a8f98" ${ln(1.2)}/>
      <rect x="-56" y="${M + 18}" width="112" height="18" rx="9" fill="#1d1a19" ${ln(1.8)}/><rect x="-44" y="${M + 22}" width="88" height="6" rx="3" fill="#3a3330"/>
      <rect x="${R - 46}" y="${M + 8}" width="34" height="20" rx="4" fill="#2a2524" ${ln(1.4)}/>${[0, 1, 2].map((i) => `<rect x="${R - 42 + i * 9}" y="${M + 12}" width="6" height="12" rx="1" fill="#9a9ea6"/>`).join('')}<circle cx="${R - 18}" cy="${M + 18}" r="2.2" fill="#e5382f"/>
    </g>`;
  }
  function roomB() {
    if (ui.view === 1) {
      const H = hk();
      const ask = H.phase === 'idle' || H.phase === 'locked';
      const lines = tr(['我們應該要駭入哪個航空公司的', '資料庫，去找行李箱主人的名字呢？'], ['Which airline’s database should we hack', 'to find the suitcase owner’s name?']);
      return `${SVG_OPEN('電腦 terminal')}${TDEFS}${lightsAndCeiling()}${floor()}${dim()}${desk()}
        <rect x="112" y="14" width="776" height="510" rx="16" fill="#1b1d24" ${ST}/>
        ${termB(128, 30, 744, 478)}
        <rect x="470" y="524" width="60" height="36" fill="#2b2b33" ${ST2}/>
        ${A.slothy(918, 700, 0.62)}
        ${ask ? bubble(860 - Math.ceil(Math.max(...lines.map(textW)) + 34), 542, 300, lines, 880, 640) : ''}
        ${navBtn('left', 56, 360)}
      </svg>`;
    }
    const p1 = tr(['嫌犯應該是搶走了行李主人的', '登機證和護照，假扮成她。'], ['The suspect must have stolen', 'this owner’s boarding pass and passport.']);
    const pulse = ui.seen.case ? '' : `<ellipse class="pulse" cx="545" cy="580" rx="250" ry="88" fill="none" stroke="#ff5a5f" stroke-width="6"/>`;
    const pulseBtn = ui.seen.case && !ui.seen.pick ? `<rect class="pulse" x="350" y="10" width="300" height="72" rx="36" fill="none" stroke="#ff5a5f" stroke-width="5"/>` : '';
    return `${SVG_OPEN('警察圍著打開的行李箱')}<defs>${HT}${REAL}${CL}</defs>${lightsAndCeiling()}${floor()}
      ${dim()}
      ${cop(250, 560, 0.86)}${cop(760, 556, 0.86)}${cop(860, 640, 0.92)}
      ${bubble(60, 120, 330, p1, 250, 300)}
      <g class="hot" data-hot="case">${openSuitcase(545, 612, 0.9)}${pulse}</g>
      ${A.shadow(110, 690, 130, 16)}${A.slothy(110, 692, 0.95)}
      <g class="hot" data-hot="pick"><rect x="360" y="18" width="280" height="56" rx="28" fill="#ffd23f" ${ST}/><text x="500" y="56" text-anchor="middle" font-size="26" fill="${INK}" ${FONT}>${tr('選擇登機口', 'Pick a gate')}</text>${pulseBtn}</g>
      ${navBtn('right')}
    </svg>`;
  }

  // ---------- 彈出層 ----------
  // 行李箱裡比較明顯的東西：卡片、兩件衣物、一個小物
  const keyItems = () => [['card'], ['c0', data.clothing[0]], ['c1', data.clothing[1]], ['g0', data.gadgets[0]]].filter((x) => x[0] === 'card' || x[1]);
  function caseHtml() {
    const pos = { c0: [-196, 124, -8, 2.0], c1: [-34, 128, 6, 2.0], g0: [data.gadgets[0] === 'tripod' ? 168 : 150, data.gadgets[0] === 'tripod' ? 10 : -8, -5, data.gadgets[0] === 'tripod' ? 1.75 : 2.1] };
    const key = keyItems().map(([k, id]) => {
      if (k === 'card') return `<g>${creditCard(-282, -62, 0.92, -6)}</g>`;
      const [x, y, r, sc] = pos[k];
      return `<g transform="translate(${x},${y}) rotate(${r})"><g transform="translate(4,6)" opacity=".22">${realIcon(id, 0, 0, sc).replace(/url\(#rl\w+\)/g, '#000')}</g>${realIcon(id, 0, 0, sc)}</g>`;
    }).join('');
    return `<div class="s3-zoom"><button class="x" data-act="close">✕</button>
      <svg viewBox="-330 -230 660 460" class="s3-zoom-svg" role="img" aria-label="打開的行李箱內部"><defs>${REAL}${CL}</defs>
        <rect x="-322" y="-222" width="644" height="444" rx="34" fill="url(#rlShell)" ${ln(3)}/>
        ${Array.from({ length: 13 }, (_, i) => `<path d="M${-300 + i * 50},-222 V-200 M${-300 + i * 50},200 V222" stroke="#fff" stroke-width="2" opacity=".1"/>`).join('')}
        <rect x="-302" y="-202" width="604" height="404" rx="20" fill="#c9ccd2" opacity=".5"/>
        <rect x="-302" y="-202" width="604" height="404" rx="20" fill="none" stroke="#e2e4e8" stroke-width="5" stroke-dasharray="3 2" opacity=".55"/>
        <rect x="-294" y="-194" width="588" height="388" rx="16" fill="url(#rlLining)" ${ln(1.5)}/>
        <rect x="-294" y="-194" width="588" height="388" rx="16" fill="url(#rlWeave)"/>
        <g style="filter:saturate(.7)" opacity=".92">${foldedStack(-196, -112, 1.25)}${cupNoodle(-30, -132, 1.05, -78)}${pouch(96, -140, 0.95, 0, 6)}${pouch(222, -128, 0.9, 1, -10)}${sneakers(238, 112, 0.95)}${foldedStack(76, 168, 0.8)}</g>
        ${key}
      </svg></div>`;
  }
  function boardHtml() {
    return `<div class="modal-card s3-board"><button class="x" data-act="close">✕</button>
      <div class="s3-board-head"><b>${tr('DEPARTURES 出境', 'DEPARTURES')}</b><span>TODAY · ${esc(data.date.label)}${tr(`（${esc(data.date.long)}）`, '')}</span></div>
      <table><thead><tr><th>${tr('時間', 'Time')}</th><th>${tr('航班', 'Flight')}</th><th>${tr('目的地', 'Destination')}</th><th>${tr('登機口', 'Gate')}</th></tr></thead><tbody>
      ${data.flights.map((f) => `<tr><td>${esc(f.time)}</td><td>${esc(f.flight)}</td><td>${esc(f.dest)}</td><td>${f.gate}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function postsHtml() {
    const ph = (id, k) => `<svg viewBox="0 0 200 120" class="s3-photo">${photo(id, k)}</svg>`;
    return `<div class="modal-card s3-posts"><button class="x" data-act="close">✕</button>
      <div class="s3-post-grid">${data.posts.map((p) => `<div class="s3-post"><div class="s3-post-top"><svg viewBox="-10 -12 20 22" width="16" height="18">${pin(0, 0, 1)}</svg>${esc(p.place)}</div><div class="s3-post-ph">${ph(p.id, 0)}${ph(p.id, 1)}</div></div>`).join('')}</div></div>`;
  }
  function confirmHtml() {
    const a = data.airlines.find((x) => x.code === ui.pendingAir) || {};
    return `<div class="modal-card s3-term-card"><p class="s3-t-big">⚠ You only have one chance.</p>
      <p>${tr('你只有一次機會。確定要駭入這家航空公司嗎？', 'Are you sure you want to hack this airline?')}</p>
      <p class="s3-t-air">[${esc(a.code)}] ${esc(a.name)}</p>
      <div class="row center"><button class="s3-t-btn" data-act="airyes">YES</button><button class="s3-t-btn ghost" data-act="close">NO</button></div></div>`;
  }
  function manifestHtml() {
    const m = (data.hack && data.hack.manifest) || [];
    return `<div class="modal-card s3-term-card"><button class="x" data-act="close">✕</button><p class="s3-t-big">PASSENGER LIST</p>
      <div class="s3-man">${m.map((f) => `<div><b>✈ ${esc(f.flight)}</b>${f.names.map((n) => `<span>${esc(n)}</span>`).join('')}</div>`).join('')}</div></div>`;
  }
  function gateHtml() {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-act="key" data-k="${n}">${n}</button>`).join('');
    const n = Number(ui.gate);
    const ok = ui.gate !== '' && n >= 1 && n <= data.maxGate;
    return `<div class="modal-card s3-gate">
      <button class="x" data-act="close">✕</button>
      <h2>${tr('要去幾號登機口？', 'Which gate?')}</h2>
      <div class="s3-display">${ui.gate === '' ? '<em>1 ~ ' + data.maxGate + '</em>' : 'GATE ' + esc(ui.gate)}</div>
      <div class="s3-keys">${keys}<button data-act="del">⌫</button><button data-act="key" data-k="0">0</button><button class="go" data-act="go" ${ok ? '' : 'disabled'}>${tr('前往', 'Go')}</button></div></div>`;
  }
  function renderModal() {
    const el = $modal();
    if (ui.modal === 'manifest' && !(data.hack && data.hack.manifest)) ui.modal = null;
    if (!ui.modal) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = { case: caseHtml, board: boardHtml, gate: gateHtml, posts: postsHtml, confirm: confirmHtml, manifest: manifestHtml }[ui.modal]();
    el.hidden = false;
  }
  function closeModal() { ui.modal = null; renderModal(); }

  async function onModalClick(e) {
    if (e.target === $modal()) return closeModal();
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    switch (t.dataset.act) {
      case 'close': return closeModal();
      case 'airyes': { const code = ui.pendingAir; ui.pendingAir = null; closeModal(); return ctx.send({ type: 'airline', code }); }
      case 'key': if (ui.gate.length < 2) ui.gate = String(Number(ui.gate + t.dataset.k)); if (ui.gate === '0') ui.gate = ''; return renderModal();
      case 'del': ui.gate = ui.gate.slice(0, -1); return renderModal();
      case 'go': {
        const g = Number(ui.gate);
        const res = await ctx.send({ type: 'gate', gate: g });
        ui.gate = ''; closeModal();
        return res;
      }
    }
  }
  let busy = false;
  async function onStageClick(e) {
    const h = e.target.closest('[data-hot]');
    if (!h || !introDone) return;
    const k = h.dataset.hot;
    if (k === 'case') { ui.seen.case = true; ui.modal = 'case'; }
    else if (k === 'board') ui.modal = 'board';
    else if (k === 'posts') { ui.seen.posts = true; ui.modal = 'posts'; }
    else if (k === 'manifest') { ui.seen.manifest = true; ui.modal = 'manifest'; }
    else if (k === 'pick') { ui.seen.pick = true; ui.gate = ''; ui.modal = 'gate'; }
    else if (k.startsWith('air-')) { ui.seen.air = true; ui.pendingAir = k.slice(4); ui.modal = 'confirm'; }
    else if (k.startsWith('opt-')) {
      if (busy) return;
      const H = hk(); if (H.phase !== 'puzzle') return;
      busy = true; if (window.Music && Music.click) Music.click();
      try { await ctx.send({ type: 'hack', choice: H.opts[Number(k.slice(4))] }); } finally { busy = false; }
      return;
    } else if (k === 'retry') { ctx.send({ type: 'hack_retry' }); return; }
    else if (k === 'nav-right' || k === 'nav-left') {
      ui.seen['nav' + data.role + ui.view] = true; ui.view = k === 'nav-right' ? 1 : 0;
      if (data.role === 'B' && ui.view === 1 && !ui.saidHack && ctx.say) { ui.saidHack = true; ctx.say(tr('Slothy：我們應該要駭入哪個航空公司的資料庫，去找行李箱主人的名字呢？', 'Slothy: Which airline’s database should we hack to find the suitcase owner’s name?'), { now: true, ms: 6000 }); }
    } else return;
    draw();
  }

  function draw() {
    if (!box) return;
    if (booming) box.innerHTML = roomBoom();
    else if (!introDone) box.innerHTML = roomIntro();
    else box.innerHTML = data.role === 'A' ? roomA() : roomB();
    renderModal();
  }
  // 倒數：每 0.25 秒更新畫面上的秒數；時間到就通知伺服器
  // 左上角的炸彈倒數（所有視角都看得到）
  function bombClock() {
    let el = document.getElementById('s3-bomb');
    if (!bombOn || !box) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 's3-bomb'; el.setAttribute('aria-live', 'off'); document.body.appendChild(el); }
    const left = Math.max(0, Math.ceil((bombAt - Date.now()) / 1000));
    el.textContent = `💣 ${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    el.classList.toggle('hurry', left <= 60);
  }
  function tick() {
    bombClock();
    if (bombOn && !booming && Date.now() >= bombAt && !boomSent) { boomSent = true; ctx.send({ type: 'bomb' }); }
    if (!box || !introDone || !data || !data.hack) return;
    const ph = data.hack.phase;
    const el = document.getElementById('s3-cd');
    if (el) el.textContent = cdText();
    if (ph === 'puzzle' && Date.now() >= tAt && !timeoutSent) { timeoutSent = true; ctx.send({ type: 'hack_timeout' }); }
    if (ph === 'locked' && Date.now() >= tAt && !unlockDrawn) { unlockDrawn = true; draw(); }
  }
  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    if (window.Music && Music.pa) Music.pa();
    const pa = tr(PA_TEXT, PA_EN);
    const at = (ms, f) => introTimers.push(setTimeout(f, ms));
    at(1800, () => { if (window.Music && Music.speak) Music.speak(pa, { lang: tr('zh-TW', 'en-US'), rate: tr(1.05, 1) }); });
    if (ctx && ctx.say) ctx.say(pa, { now: true, ms: 8000 });
    at(T_R, () => ctx.say && ctx.say('Raccoony：' + LINE_R(), { now: true, ms: T_S - T_R }));
    at(T_S, () => ctx.say && ctx.say('Slothy：' + LINE_S(), { now: true, ms: INTRO_MS - T_S }));
    at(T_BOMB, () => { bombOn = true; bombClock(); if (window.Music && Music.buzz) Music.buzz(); ctx.say && ctx.say(BOMB_LINE(), { now: true, ms: INTRO_MS - T_BOMB + 600 }); });
    at(INTRO_MS, () => {
      introDone = true; draw();
      if (ctx.say) ctx.say(data.role === 'B' ? tr('警察圍著地上一個打開的行李箱……', 'The police are gathered around an open suitcase on the floor…') : tr('大廳又恢復了人來人往。看看航班看板吧。', 'The hall is busy again. Check the departures board.'), { now: true, ms: 5000 });
    });
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.airport = {
    render(container, newData, c) {
      box = container; ctx = c; data = newData;
      if (data.hack && data.hack.remain != null) tAt = Date.now() + data.hack.remain;
      if (data.bomb != null) bombAt = Date.now() + data.bomb;
      boomSent = false;
      const boomed = lastBoom !== null && data.boom > lastBoom;
      lastBoom = data.boom ?? 0;
      if (boomed) { box.onclick = onStageClick; const mm = $modal(); mm.onclick = onModalClick; if (!ticker) ticker = setInterval(tick, 250); startBoom(); return; }
      if (introDone) bombOn = true;
      timeoutSent = false; unlockDrawn = false;
      if (data.hack && data.hack.phase !== 'puzzle') busy = false;
      box.onclick = onStageClick;
      const m = $modal();
      m.onclick = onModalClick;
      m.onkeydown = null;
      if (!ticker) ticker = setInterval(tick, 250);
      draw();
      if (!introDone && !booming) startIntro();
    },
    unmount() {
      introTimers.forEach(clearTimeout); introTimers = []; clearInterval(ticker); ticker = 0;
      bombOn = false; booming = false; lastBoom = null; clearTimeout(boomTimer); const bc = document.getElementById('s3-bomb'); if (bc) bc.remove();
      if (window.Music && Music.hush) Music.hush(); introDone = false; introStarted = false;
      ui = fresh(); box = null;
      const m = $modal(); m.hidden = true; m.innerHTML = '';
    },
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modal) closeModal(); });
})();
