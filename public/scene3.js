// 場景 3 的畫面與互動：機場。
//   開場（兩人同畫面）：大廳 → 兩人走進來 → 廣播 → 警察衝進來 → Raccoony：「我們去幫忙把炸彈拆除吧！」Slothy：「嗯，一起去抓犯人吧！」→ 各自的畫面。
//   A（Raccoony）視角 0：大廳 + 航班看板（今天日期、8 個航班）；視角 1：電腦分割畫面（左：旅遊貼文；右：terminal）。
//   B（Slothy）視角 0：和警察圍著打開的行李箱（信用卡、Travel Document、衣物、小物）＋「選擇登機口」；視角 1：電腦 terminal（圖形題目）。
// 只負責「畫」和「把操作變成 action」；正確答案由伺服器判定。
(function () {
  const A = window.Art;
  const INK = A.INK;
  const ST = A.st(4);
  const ST2 = A.st(2.5);
  const FONT = A.FONT;
  const HELV = `font-family="'Helvetica Neue',Helvetica,Arial,'GenSeki','PingFang TC','Noto Sans TC',sans-serif" font-weight="700"`;
  const MONO = `font-family="'Courier New',Courier,monospace,'GenSeki'" font-weight="700"`;
  const GRN = '#39ff6a', GRN2 = '#1f9e44', TBG = '#040a06';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PA_TEXT = '緊急狀況，機場收到炸彈客預警通知，機場收到炸彈客預警通知，請乘客不要慌張，警察還在調查中。';
  const PA_EN = 'Attention please. The airport has received a bomb threat. Please stay calm. The police are investigating.';
  const LINE_R = () => tr('我們去幫忙把炸彈拆除吧！', 'Let’s go help defuse the bomb!');
  const LINE_S = () => tr('嗯，一起去抓犯人吧！', 'Yeah, let’s catch the culprit together!');
  const T_R = 10600, T_S = 13200, INTRO_MS = 16200;

  const fresh = () => ({ modal: null, gate: '', view: 0, seen: {}, pendingAir: null, saidHack: false });
  let ui = fresh();
  let introDone = false, introStarted = false, introTimers = [];
  let ctx = null, data = null, box = null;
  let tAt = 0, timeoutSent = false, unlockDrawn = false, ticker = 0;
  const $modal = () => document.getElementById('modal');
  const SVG_OPEN = (label) => `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="${label}">`;
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---------- 共用：機場大廳背景（參考 JFK 航廈：白色挑高天花板、淺色地板、報到機台、黃色指標） ----------
  function lightsAndCeiling() {
    const spots = Array.from({ length: 11 }, (_, i) => `<ellipse cx="${30 + i * 96}" cy="${38 + i * 3}" rx="30" ry="9" fill="#cfc9a0" ${A.st(2)}/>`).join('');
    return `<rect x="-900" width="2800" height="700" fill="#3b424d"/>
      <rect x="-900" y="96" width="2800" height="340" fill="#505967"/>
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
  function floor() {
    const streaks = [100, 300, 520, 720, 900].map((x) => `<path d="M${x},440 L${x - 60},700" stroke="#fff" stroke-width="22" opacity=".07" stroke-linecap="round"/>`).join('');
    return `<rect x="-900" y="436" width="2800" height="274" fill="#7b838f" ${ST2}/>${streaks}
      <rect x="-900" y="436" width="2800" height="10" fill="#5d646e"/>
      ${[0, 1, 2, 3].map((i) => `<line x1="-900" y1="${470 + i * 60}" x2="1900" y2="${470 + i * 60}" stroke="#5d646e" stroke-width="2" opacity=".6"/>`).join('')}`;
  }
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
        ${traveler(x + 100, 342, 0.62, { top: '#2447a8', skin: i % 2 ? '#e0ac82' : '#f1c9a5', hair: '#2b2420', bottom: '#24262e', shoe: '#17181d' }, false)}
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
      <rect x="560" y="180" width="400" height="38" fill="#1b1b1f"/><text x="580" y="208" font-size="22" fill="#c99a24" ${HELV}>Baggage Claim  ↘</text><text x="800" y="208" font-size="22" fill="#fff" ${HELV}>${tr('出境 Departures', 'Departures')}</text></g>`;
    return `${desks}${sign}${[120, 355, 590, 825].map((x) => kiosk(x + 30, 470, 0.7)).join('')}`;
  }

  // ---------- 旅客：跟地鐵站路人同一種畫風（粗描邊、圓頭、腮紅、四肢分開） ----------
  const LOOKS = [
    { skin: '#f1c9a5', top: '#d9534f', bottom: '#34343d', shoe: '#1b1b1f', hair: '#2b2b2b' },
    { skin: '#8d5a3b', top: '#3b7ddd', bottom: '#3b3b44', shoe: '#f4f4f4', hair: '#1b1b1f' },
    { skin: '#e0ac82', top: '#f0ad4e', bottom: '#2a3f66', shoe: '#1b1b1f', hair: '#5a3b26' },
    { skin: '#f6d7bd', top: '#5cb85c', bottom: '#33333b', shoe: '#cfd3d8', hair: '#a52a2a' },
    { skin: '#c58c64', top: '#8e6bbf', bottom: '#2a2a35', shoe: '#1b1b1f', hair: '#1b1b1f' },
    { skin: '#e8b88f', top: '#e8a0bf', bottom: '#3b5a8a', shoe: '#f4f4f4', hair: '#3b2a20' },
    { skin: '#d9a07a', top: '#4aa3a2', bottom: '#23262e', shoe: '#cfd3d8', hair: '#2f9e5b' },
    { skin: '#f1c9a5', top: '#2b2f38', bottom: '#d9a321', shoe: '#f4f4f4', hair: '#ff7a1a' },
  ];
  function traveler(x, y, s, look, bag = false, flip = false) {
    const P = look, t = A.st(2.5);
    const luggage = bag ? `<g transform="translate(${flip ? -62 : 62},-4)"><rect x="-20" y="-74" width="40" height="74" rx="8" fill="${P.top}" ${t}/><rect x="-20" y="-74" width="40" height="14" rx="6" fill="#fff" opacity=".25"/><path d="M0,-74 V-98" stroke="${INK}" stroke-width="4"/><circle cx="-12" cy="2" r="5" fill="#222"/><circle cx="12" cy="2" r="5" fill="#222"/></g>` : '';
    return `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">
      <ellipse cx="0" cy="3" rx="46" ry="8" fill="#000" opacity=".14"/>${luggage}
      <g transform="translate(-15,-92)"><rect x="-12" y="0" width="24" height="84" rx="10" fill="${P.bottom}" ${t}/><ellipse cx="3" cy="86" rx="19" ry="9" fill="${P.shoe}" ${t}/></g>
      <g transform="translate(15,-92)"><rect x="-12" y="0" width="24" height="84" rx="10" fill="${P.bottom}" ${t}/><ellipse cx="3" cy="86" rx="19" ry="9" fill="${P.shoe}" ${t}/></g>
      <rect x="-37" y="-172" width="74" height="106" rx="20" fill="${P.top}" ${t}/>
      <g transform="translate(-39,-160)"><rect x="-10" y="-6" width="20" height="70" rx="10" fill="${P.top}" ${t}/><circle cx="0" cy="68" r="10" fill="${P.skin}" ${t}/></g>
      <g transform="translate(39,-160)"><rect x="-10" y="-6" width="20" height="70" rx="10" fill="${P.top}" ${t}/><circle cx="0" cy="68" r="10" fill="${P.skin}" ${t}/></g>
      <circle cx="0" cy="-208" r="38" fill="${P.skin}" ${t}/>
      <path d="M-40,-208 Q-42,-262 0,-262 Q42,-262 40,-208 Q24,-232 0,-230 Q-24,-232 -40,-208Z" fill="${P.hair}" ${t}/>
      <circle cx="-13" cy="-206" r="4.2" fill="${INK}"/><circle cx="13" cy="-206" r="4.2" fill="${INK}"/>
      <ellipse cx="-24" cy="-194" rx="7" ry="4.5" fill="#ff9bb0" opacity=".45"/><ellipse cx="24" cy="-194" rx="7" ry="4.5" fill="#ff9bb0" opacity=".45"/>
      <ellipse cx="0" cy="-190" rx="6" ry="2.5" fill="#7a2b2b"/>
    </g>`;
  }
  function crowd(n, seed, y0 = 520, y1 = 690) {
    const r = rng(seed);
    const list = Array.from({ length: n }, () => ({ x: -20 + r() * 1040, y: y0 + r() * (y1 - y0), k: Math.floor(r() * LOOKS.length), bag: r() < 0.4, flip: r() < 0.5 }));
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
  function cop(x, y, s, shade) {
    const body = shade || '#1a2150';
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="4" rx="46" ry="9" fill="#000" opacity=".2"/>
      <rect x="-26" y="-92" width="22" height="90" rx="10" fill="#12183c" ${ST2}/><rect x="4" y="-92" width="22" height="90" rx="10" fill="#12183c" ${ST2}/>
      <ellipse cx="-16" cy="0" rx="19" ry="9" fill="#17181d" ${ST2}/><ellipse cx="16" cy="0" rx="19" ry="9" fill="#17181d" ${ST2}/>
      <rect x="-42" y="-190" width="84" height="110" rx="22" fill="${body}" ${ST}/>
      <rect x="-42" y="-112" width="84" height="12" fill="#14161c"/><rect x="-8" y="-114" width="16" height="16" rx="2" fill="#d9b04a" ${ST2}/>
      <path d="M-8,-190 L0,-166 L8,-190Z" fill="#fff" ${ST2}/>
      <path d="M-30,-160 l12,10 -2,14 -10,-4Z" fill="#d9b04a" ${A.st(2)}/>
      <rect x="-60" y="-184" width="22" height="76" rx="11" fill="${body}" ${ST2}/><rect x="38" y="-184" width="22" height="76" rx="11" fill="${body}" ${ST2}/>
      <circle cx="-49" cy="-104" r="10" fill="#f1c9a5" ${ST2}/><circle cx="49" cy="-104" r="10" fill="#f1c9a5" ${ST2}/>
      <circle cx="0" cy="-222" r="37" fill="#d9ad88" ${ST2}/>
      <path d="M-34,-206 Q0,-170 34,-206 Q28,-186 0,-182 Q-28,-186 -34,-206Z" fill="#3a2a22" opacity=".28"/>
      <path d="M-44,-236 Q0,-296 44,-236 L44,-242 Q0,-268 -44,-242Z" fill="#10142e" ${ST2}/>
      <rect x="-52" y="-242" width="104" height="16" rx="6" fill="#10142e" ${ST2}/>
      <path d="M-15,-256 l15,-12 l15,12 l-15,10Z" fill="#b8902f" ${A.st(2)}/>
      <path d="M-30,-232 L-6,-220 M30,-232 L6,-220" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <rect x="-31" y="-224" width="29" height="16" rx="5" fill="#0b0b10" ${ST2}/><rect x="2" y="-224" width="29" height="16" rx="5" fill="#0b0b10" ${ST2}/>
      <path d="M-2,-218 h4" stroke="#0b0b10" stroke-width="4"/><path d="M-26,-221 l8,0 M7,-221 l8,0" stroke="#7d8696" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M-14,-193 q14,-12 28,0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
    </g>`;
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

  // ---------- 信用卡、Travel Document ----------
  function creditCard(x, y, s = 1, rot = 0) {
    const c = data.card;
    return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">
      <rect x="0" y="0" width="220" height="138" rx="14" fill="#3b2a7a" ${ST2}/>
      <path d="M2,98 Q110,62 218,94 V124 Q218,136 206,136 H14 Q2,136 2,124Z" fill="#5b45b0"/>
      <path d="M26,15 L29,23 37,23 31,28 33,36 26,31 19,36 21,28 15,23 23,23Z" fill="#ffd23f"/>
      <text x="44" y="33" font-size="18" fill="#fff" ${HELV}>${esc(c.issuer)}</text>
      <rect x="18" y="48" width="34" height="26" rx="5" fill="#e8c55a" ${A.st(1.5)}/><path d="M18,61 h34 M35,48 v26" stroke="#a8852a" stroke-width="1.5"/>
      <path d="M190,52 q8,9 0,18 M197,48 q11,13 0,26" fill="none" stroke="#cfc6ff" stroke-width="2.5" stroke-linecap="round"/>
      <text x="18" y="101" font-size="16" fill="#fff" ${MONO}>${esc(c.number)}</text>
      <text x="18" y="126" font-size="16" fill="#fff" ${HELV}>${esc(c.name)}</text>
      <text x="204" y="126" text-anchor="end" font-size="10" fill="#cfc6ff" ${HELV}>VALID 08/29</text>
    </g>`;
  }
  function travelDoc(x, y, s = 1, rot = 0) {
    const d = data.doc;
    return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">
      <rect x="0" y="0" width="250" height="170" fill="#fffdf3" ${ST2}/>
      <rect x="0" y="0" width="250" height="30" fill="#2c4a7a" ${ST2}/>
      <text x="125" y="21" text-anchor="middle" font-size="16" fill="#fff" letter-spacing="1.5" ${HELV}>TRAVEL DOCUMENT</text>
      <text x="16" y="52" font-size="11" fill="#7a808b" ${HELV}>AIRLINE${tr(' 航空公司', '')}</text>
      <text x="16" y="74" font-size="18" fill="${INK}" ${HELV}>${esc(d.airline)}</text>
      ${d.airlineZh ? `<text x="16" y="94" font-size="14" fill="#4a4f5c" ${HELV}>${esc(d.airlineZh)}</text>` : ''}
      <text x="16" y="116" font-size="11" fill="#7a808b" ${HELV}>FLIGHT${tr(' 航班', '')}</text>
      <rect x="14" y="122" width="112" height="26" rx="3" fill="#15161b"/>
      <path d="M12,130 l14,-6 10,14 12,-12 10,14 12,-14 12,12 10,-10 12,12 12,-10" fill="none" stroke="#15161b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14,146 l16,8 18,-8 16,6 20,-6 16,6 14,-4" fill="none" stroke="#15161b" stroke-width="4" stroke-linecap="round"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<rect x="${150 + i * 7}" y="${118 + (i % 3)}" width="${i % 2 ? 2 : 4}" height="34" fill="${INK}"/>`).join('')}
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
      o += c === null ? qmark(x, y, 64) : h.kind === 'grid' ? shapeG(c, x, y, 34) : arrowG(c, x, y, 34);
    });
    return o;
  }
  function optionG(kind, v, cx, cy) {
    if (kind === 'floors') return `<text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="44" fill="${GRN}" filter="url(#tglow)" ${MONO}>${esc(v)}</text>`;
    return kind === 'grid' ? shapeG(v, cx, cy, 30) : arrowG(Number(v), cx, cy, 30);
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
      inner = gtext(L, y + 64, 17, '> connect airline_db') + gtext(L, y + 100, 22, tr('選擇一間航空公司：', 'SELECT AN AIRLINE:'))
        + data.airlines.map((a, i) => { const yy = y + 124 + i * 70; return `<g class="hot" data-hot="air-${a.code}"><rect x="${L}" y="${yy}" width="${w - 44}" height="56" rx="6" fill="#0a1a0f" stroke="${GRN2}" stroke-width="2"/>
          ${gtext(L + 14, yy + (a.zh ? 25 : 35), 18, `[${a.code}] ${a.name}`)}${a.zh ? gtext(L + 14, yy + 46, 14, a.zh, { c: '#8fdca5' }) : ''}</g>`; }).join('')
        + (ui.seen.air ? '' : `<rect class="pulse" x="${L - 6}" y="${y + 118}" width="${w - 32}" height="284" rx="10" fill="none" stroke="#ffd23f" stroke-width="5"/>`);
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
    if (H.phase === 'idle') inner = gtext(cx, cy - 10, 64, 'TERMINAL', { mid: 1 }) + `<text x="${x + 30}" y="${y + h - 30}" font-size="22" fill="${GRN}" ${MONO}>&gt; <tspan class="s3-caret">_</tspan></text>`;
    else if (H.phase === 'locked') inner = gtext(cx, cy - 40, 44, 'ACCESS DENIED', { c: RED, mid: 1 }) + gtext(cx, cy + 6, 20, tr('安全鎖定中', 'SECURITY LOCK'), { c: RED, mid: 1 }) + gtext(cx, cy + 70, 46, cdText(), { c: RED, mid: 1, id: 's3-cd' });
    else if (H.phase === 'puzzle') inner = gtext(x + 24, y + 62, 22, `CHALLENGE ${H.step + 1}/${H.total}`) + gtext(x + w - 24, y + 66, 34, cdText(), { id: 's3-cd' }).replace('<text ', '<text text-anchor="end" ') + figure(H, cx, cy + 10);
    else if (H.phase === 'retry') inner = gtext(cx, cy - 20, 48, 'ACCESS DENIED', { c: RED, mid: 1 }) + gtext(cx, cy + 30, 20, tr('等 Raccoony 按重試……', 'Waiting for Raccoony to retry…'), { c: RED, mid: 1 });
    else if (H.phase === 'done') inner = gtext(cx, cy - 30, 48, 'ACCESS GRANTED ✓', { mid: 1 }) + gtext(cx, cy + 20, 20, tr('旅客名單已傳到 Raccoony 的電腦', 'Passenger list sent to Raccoony’s computer'), { mid: 1, c: '#8fdca5' });
    return termFrame(x, y, w, h, inner);
  }

  // ---------- 開場：兩人同畫面（走進大廳 → 廣播 → 警察衝進來 → 兩人對話）----------
  function roomIntro() {
    const copsL = [0, 1, 2].map((i) => `<g class="s3-rush-l" style="animation-delay:${8.0 + i * 0.12}s">${cop(470 + i * 80, 600 - (i % 2) * 24, 0.62)}</g>`).join('');
    const copsR = [0, 1, 2].map((i) => `<g class="s3-rush-r" style="animation-delay:${8.05 + i * 0.12}s">${cop(940 - i * 80, 612 - (i % 2) * 22, 0.66, '#232d63')}</g>`).join('');
    return `${SVG_OPEN('機場大廳')}${lightsAndCeiling()}${floor()}${counters()}
      ${crowd(12, 77, 540, 640)}
      ${dim()}
      <g class="s3-walkin">${A.raccoony(250, 690, 0.52)}${A.slothy(330, 696, 0.58)}</g>
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
      const y = 560 + r() * 120, dur = 9 + r() * 8, dl = -r() * dur, k = Math.floor(r() * LOOKS.length), dir = i % 2 ? 'rtl' : 'ltr';
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
        <text x="580" y="${y}" font-size="16" fill="#9aa0a8" ${HELV}>${esc(f.destZh)}</text>
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
      ${A.raccoony(110, 700, 0.5)}
      ${navBtn('right')}
    </svg>`;
  }

  // ---------- B：和警察圍著地上打開的行李箱（視角 0）／電腦 terminal（視角 1）----------
  function openSuitcase(x, y, s) {
    const its = [...data.clothing, ...data.gadgets];
    const spots = [[62, -32], [116, 2], [16, 8], [-88, 12]];
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="44" rx="190" ry="24" fill="#000" opacity=".35"/>
      <polygon points="-150,-80 150,-80 140,-150 -140,-150" fill="#4a3e31" ${ST}/><polygon points="-130,-86 130,-86 122,-142 -122,-142" fill="#6b5a7a" opacity=".55"/>
      <rect x="-150" y="-80" width="300" height="122" rx="10" fill="#5a4a3a" ${ST}/>
      <rect x="-138" y="-70" width="276" height="100" rx="6" fill="#8a7a9a"/>
      ${travelDoc(-58, -66, 0.3, 5)}${creditCard(-132, -60, 0.32, -7)}
      ${its.map((id, i) => itemIcon(id, spots[i][0], spots[i][1], 0.62)).join('')}
      <path d="M-24,-150 v-14 h48 v14" fill="none" stroke="#1f1913" stroke-width="7" stroke-linecap="round"/>
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
    const pulse = ui.seen.case ? '' : `<ellipse class="pulse" cx="500" cy="560" rx="200" ry="110" fill="none" stroke="#ff5a5f" stroke-width="6"/>`;
    const pulseBtn = ui.seen.case && !ui.seen.pick ? `<rect class="pulse" x="350" y="10" width="300" height="72" rx="36" fill="none" stroke="#ff5a5f" stroke-width="5"/>` : '';
    return `${SVG_OPEN('警察圍著打開的行李箱')}${lightsAndCeiling()}${floor()}
      ${crowd(8, 51, 470, 520)}
      ${dim()}
      ${cop(250, 560, 0.86)}${cop(760, 556, 0.86, '#232d63')}${cop(860, 640, 0.92)}
      ${bubble(60, 120, 330, p1, 250, 300)}
      <g class="hot" data-hot="case">${openSuitcase(500, 590, 1)}${pulse}</g>
      ${A.slothy(110, 692, 0.95)}
      <g class="hot" data-hot="pick"><rect x="360" y="18" width="280" height="56" rx="28" fill="#ffd23f" ${ST}/><text x="500" y="56" text-anchor="middle" font-size="26" fill="${INK}" ${FONT}>${tr('選擇登機口', 'Pick a gate')}</text>${pulseBtn}</g>
      ${navBtn('right')}
    </svg>`;
  }

  // ---------- 彈出層 ----------
  function caseHtml() {
    const its = [[data.clothing[0], -186, 120, -10], [data.clothing[1], -55, 112, 8], [data.gadgets[0], 150, 120, -6]].filter((x) => x[0]);
    return `<div class="s3-zoom"><button class="x" data-act="close">✕</button>
      <svg viewBox="-330 -230 660 460" class="s3-zoom-svg" role="img" aria-label="打開的行李箱內部">
        <rect x="-320" y="-220" width="640" height="440" rx="30" fill="#5a4a3a" ${ST}/>
        <rect x="-296" y="-196" width="592" height="392" rx="18" fill="#8a7a9a"/>
        <path d="M-296,-120 q296,-30 592,0 M-296,40 q296,30 592,0" stroke="#7a6a8a" stroke-width="6" fill="none" opacity=".6"/>
        <rect x="-296" y="-196" width="592" height="392" rx="18" fill="none" stroke="#3a2f24" stroke-width="6"/>
        ${creditCard(-282, -178, 1.05, -5)}${travelDoc(22, -190, 1.05, 4)}
        ${its.map(([id, x, y, r]) => `<g transform="translate(${x},${y}) rotate(${r})">${itemIcon(id, 0, 0, id === data.gadgets[0] ? 2.6 : 2.4)}</g>`).join('')}
      </svg></div>`;
  }
  function boardHtml() {
    return `<div class="modal-card s3-board"><button class="x" data-act="close">✕</button>
      <div class="s3-board-head"><b>${tr('DEPARTURES 出境', 'DEPARTURES')}</b><span>TODAY · ${esc(data.date.label)}${tr(`（${esc(data.date.long)}）`, '')}</span></div>
      <table><thead><tr><th>${tr('時間', 'Time')}</th><th>${tr('航班', 'Flight')}</th><th>${tr('目的地', 'Destination')}</th><th>${tr('登機口', 'Gate')}</th></tr></thead><tbody>
      ${data.flights.map((f) => `<tr><td>${esc(f.time)}</td><td>${esc(f.flight)}</td><td>${esc(f.dest)}<small>${esc(f.destZh)}</small></td><td>${f.gate}</td></tr>`).join('')}</tbody></table></div>`;
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
    if (!introDone) box.innerHTML = roomIntro();
    else box.innerHTML = data.role === 'A' ? roomA() : roomB();
    renderModal();
  }
  // 倒數：每 0.25 秒更新畫面上的秒數；時間到就通知伺服器
  function tick() {
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
      timeoutSent = false; unlockDrawn = false;
      if (data.hack && data.hack.phase !== 'puzzle') busy = false;
      box.onclick = onStageClick;
      const m = $modal();
      m.onclick = onModalClick;
      m.onkeydown = null;
      if (!ticker) ticker = setInterval(tick, 250);
      draw();
      if (!introDone) startIntro();
    },
    unmount() {
      introTimers.forEach(clearTimeout); introTimers = []; clearInterval(ticker); ticker = 0;
      if (window.Music && Music.hush) Music.hush(); introDone = false; introStarted = false;
      ui = fresh(); box = null;
      const m = $modal(); m.hidden = true; m.innerHTML = '';
    },
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modal) closeModal(); });
})();
