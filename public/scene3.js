// 場景 3 的畫面與互動：機場。
//   開場（兩人同畫面）：大廳 → 兩人從左下角走進來 → 廣播 → 廣播快結束時警察從左右兩邊衝進來 → 各自的畫面。
//   A（Raccoony）：大廳裡走來走去的旅客 + 航班看板（今天日期、10 個航班）；右箭頭 → 電腦上的「十大旅遊勝地」新聞。
//   B（Slothy）：和警察圍著地上打開的行李箱（點開看衣物和物品）；上方「選擇登機口」。
// 只負責「畫」和「把操作變成 action」；正確登機口由伺服器判定。
(function () {
  const A = window.Art;
  const INK = A.INK;
  const ST = A.st(4);
  const ST2 = A.st(2.5);
  const FONT = A.FONT;
  const HELV = `font-family="'Helvetica Neue',Helvetica,Arial,'GenSeki','PingFang TC','Noto Sans TC',sans-serif" font-weight="700"`;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PA_TEXT = '緊急狀況，機場收到炸彈客預警通知，機場收到炸彈客預警通知，請乘客不要慌張，警察還在調查中。';
  const INTRO_MS = 10500;

  const fresh = () => ({ modal: null, gate: '', view: 0, seen: {}, item: null });
  let ui = fresh();
  let introDone = false, introStarted = false, introTimer = 0;
  let ctx = null, data = null, box = null;
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
      <rect x="560" y="180" width="400" height="38" fill="#1b1b1f"/><text x="580" y="208" font-size="22" fill="#c99a24" ${HELV}>Baggage Claim  ↘</text><text x="800" y="208" font-size="22" fill="#fff" ${HELV}>出境 Departures</text></g>`;
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
  function bubble(x, y, w, lines, tailX, tailY) {
    const lh = 30, h = lines.length * lh + 22;
    return `<g>
      <path d="M${tailX - 14},${y + h - 3} L${tailX},${tailY} L${tailX + 16},${y + h - 3}Z" fill="#fff" ${ST2}/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#fff" ${ST}/>
      <rect x="${tailX - 12}" y="${y + h - 6}" width="26" height="8" fill="#fff"/>
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
      default: return '';
    }
  }

  // ---------- 開場：兩人同畫面（走進大廳 → 廣播 → 警察衝進來）----------
  function roomIntro() {
    // 警察衝進來後停在畫面中間偏右，不會擋到左下角的兩隻
    const copsL = [0, 1, 2].map((i) => `<g class="s3-rush-l" style="animation-delay:${8.0 + i * 0.12}s">${cop(470 + i * 80, 600 - (i % 2) * 24, 0.62)}</g>`).join('');
    const copsR = [0, 1, 2].map((i) => `<g class="s3-rush-r" style="animation-delay:${8.05 + i * 0.12}s">${cop(940 - i * 80, 612 - (i % 2) * 22, 0.66, '#232d63')}</g>`).join('');
    return `${SVG_OPEN('機場大廳')}${lightsAndCeiling()}${floor()}${counters()}
      ${crowd(12, 77, 540, 640)}
      ${dim()}
      <g class="s3-walkin">${A.raccoony(250, 690, 0.52)}${A.slothy(330, 696, 0.58)}</g>
      ${copsL}${copsR}
      <g class="s3-alert">${[200, 800].map((x) => `<circle cx="${x}" cy="58" r="26" fill="#ff3b30" opacity=".35"/><circle cx="${x}" cy="58" r="13" fill="#ff3b30" ${ST2}/>`).join('')}</g>
    </svg>`;
  }

  // ---------- A：大廳 + 航班看板（視角 0）／電腦上的新聞（視角 1）----------
  function navBtn(dir) {
    const x = dir === 'right' ? 930 : 70, y = 360;
    const tri = dir === 'right' ? 'M-8,-15 L13,0 L-8,15Z' : 'M8,-15 L-13,0 L8,15Z';
    return `<g class="hot" data-hot="nav-${dir}"><circle cx="${x}" cy="${y}" r="36" fill="#ffd23f" ${ST}/><path d="${tri}" transform="translate(${x},${y})" fill="${INK}"/>
      ${ui.seen.nav ? '' : `<circle class="pulse" cx="${x}" cy="${y}" r="48" fill="none" stroke="#ff5a5f" stroke-width="6"/>`}</g>`;
  }
  function walkers() {
    // 走來走去的旅客（左右來回，各自速度不同）
    const r = rng(31);
    return Array.from({ length: 9 }, (_, i) => {
      const y = 560 + r() * 120, dur = 9 + r() * 8, dl = -r() * dur, k = Math.floor(r() * LOOKS.length), dir = i % 2 ? 'rtl' : 'ltr';
      return `<g class="s3-walk ${dir}" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${dl.toFixed(1)}s">${traveler(0, y, 0.3 + ((y - 560) / 120) * 0.25, LOOKS[k], r() < 0.5, dir === 'rtl')}</g>`;
    }).join('');
  }
  function boardSvg() {
    const rows = data.flights.map((f, i) => {
      const y = 196 + i * 30;
      return `<rect x="190" y="${y - 21}" width="620" height="28" fill="${i % 2 ? '#141820' : '#1b2029'}"/>
        <text x="206" y="${y}" font-size="18" fill="#ffd23f" ${HELV}>${esc(f.time)}</text>
        <text x="290" y="${y}" font-size="18" fill="#cfd3da" ${HELV}>${esc(f.flight)}</text>
        <text x="400" y="${y}" font-size="18" fill="#fff" ${HELV}>${esc(f.dest)}</text>
        <text x="600" y="${y}" font-size="16" fill="#9aa0a8" ${HELV}>${esc(f.destZh)}</text>
        <text x="760" y="${y}" text-anchor="middle" font-size="19" fill="#5ad17a" ${HELV}>${f.gate}</text>`;
    }).join('');
    return `<rect x="176" y="96" width="648" height="414" rx="12" fill="#0d0f14" ${ST}/>
      <text x="196" y="130" font-size="24" fill="#fff" ${HELV}>DEPARTURES 出境</text>
      <text x="804" y="130" text-anchor="end" font-size="22" fill="#ffd23f" ${HELV}>TODAY · ${esc(data.date.label)}</text>
      <text x="206" y="160" font-size="13" fill="#6d737c" ${HELV}>TIME</text><text x="290" y="160" font-size="13" fill="#6d737c" ${HELV}>FLIGHT</text>
      <text x="400" y="160" font-size="13" fill="#6d737c" ${HELV}>DESTINATION</text><text x="760" y="160" text-anchor="middle" font-size="13" fill="#6d737c" ${HELV}>GATE</text>
      ${rows}`;
  }
  function roomA() {
    if (ui.view === 1) {
      return `${SVG_OPEN('電腦上的旅遊新聞')}${lightsAndCeiling()}${floor()}
        ${dim()}
        <rect x="120" y="470" width="760" height="30" rx="4" fill="#8a5a2b" ${ST}/><rect x="150" y="500" width="24" height="170" fill="#6e4520" ${ST2}/><rect x="826" y="500" width="24" height="170" fill="#6e4520" ${ST2}/>
        <g class="hot" data-hot="news"><rect x="250" y="110" width="500" height="320" rx="14" fill="#1b1d24" ${ST}/><rect x="266" y="126" width="468" height="284" rx="6" fill="#f7f7f5"/>
          <rect x="266" y="126" width="468" height="34" fill="#e5382f"/><text x="282" y="150" font-size="18" fill="#fff" ${HELV}>NYC Travel Daily</text>
          <text x="282" y="190" font-size="24" fill="${INK}" ${FONT}>${esc(data.news.title)}</text>
          ${data.news.list.slice(0, 6).map((n, i) => `<text x="282" y="${226 + i * 28}" font-size="16" fill="#3a3d46" ${FONT}>${n.rank}. ${esc(n.zh)}（${esc(n.country)}）</text>`).join('')}
          <text x="282" y="398" font-size="14" fill="#7a808b" ${FONT}>……點一下看完整新聞</text>
          ${ui.seen.news ? '' : `<rect class="pulse" x="240" y="100" width="520" height="340" rx="18" fill="none" stroke="#ffd23f" stroke-width="6"/>`}</g>
        <rect x="470" y="430" width="60" height="40" fill="#2b2b33" ${ST2}/>
        ${A.raccoony(160, 700, 0.5)}
        ${navBtn('left')}
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

  // ---------- B：和警察圍著地上打開的行李箱 ----------
  function openSuitcase(x, y, s) {
    const icons = data.items.slice(0, 6).map((it, i) => itemIcon(it.id, -96 + (i % 3) * 96, -18 + Math.floor(i / 3) * 40, 0.62)).join('');
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="44" rx="190" ry="24" fill="#000" opacity=".35"/>
      <polygon points="-150,-80 150,-80 140,-150 -140,-150" fill="#4a3e31" ${ST}/><polygon points="-130,-86 130,-86 122,-142 -122,-142" fill="#6b5a7a" opacity=".55"/>
      <rect x="-150" y="-80" width="300" height="122" rx="10" fill="#5a4a3a" ${ST}/>
      <rect x="-138" y="-70" width="276" height="100" rx="6" fill="#8a7a9a"/>
      ${icons}
      <path d="M-24,-150 v-14 h48 v14" fill="none" stroke="#1f1913" stroke-width="7" stroke-linecap="round"/>
    </g>`;
  }
  function roomB() {
    const [p1, p2, p3] = data.police;
    const pulse = ui.seen.case ? '' : `<ellipse class="pulse" cx="500" cy="560" rx="200" ry="110" fill="none" stroke="#ff5a5f" stroke-width="6"/>`;
    const pulseBtn = ui.seen.case && !ui.seen.pick ? `<rect class="pulse" x="350" y="10" width="300" height="72" rx="36" fill="none" stroke="#ff5a5f" stroke-width="5"/>` : '';
    return `${SVG_OPEN('警察圍著打開的行李箱')}${lightsAndCeiling()}${floor()}
      ${crowd(8, 51, 470, 520)}
      ${dim()}
      ${cop(250, 560, 0.86)}${cop(760, 556, 0.86, '#232d63')}${cop(880, 640, 0.92)}
      ${bubble(60, 120, 330, p1, 250, 300)}${bubble(600, 110, 330, p2, 760, 296)}${bubble(560, 252, 400, p3, 860, 380)}
      <g class="hot" data-hot="case">${openSuitcase(500, 590, 1)}${pulse}</g>
      ${A.slothy(110, 692, 0.95)}
      <g class="hot" data-hot="pick"><rect x="360" y="18" width="280" height="56" rx="28" fill="#ffd23f" ${ST}/><text x="500" y="56" text-anchor="middle" font-size="26" fill="${INK}" ${FONT}>選擇登機口</text>${pulseBtn}</g>
    </svg>`;
  }

  // ---------- 彈出層 ----------
  // 點行李箱：把行李箱內部放大，東西稍微疊在一起（只有圖，沒有文字）
  const SPOTS = [[-150, -20, -14, 2.9], [-40, -70, 10, 3.0], [80, -30, -8, 2.9], [190, -60, 16, 2.7], [-190, 90, 12, 2.8], [-20, 70, -12, 3.0], [150, 90, 8, 2.8]]; // 互相疊一點，像塞在行李箱裡
  function caseHtml() {
    const items = data.items.map((it, i) => { const [x, y, r, s] = SPOTS[i % SPOTS.length]; return `<g transform="translate(${x},${y}) rotate(${r})">${itemIcon(it.id, 0, 0, s)}</g>`; }).join('');
    return `<div class="s3-zoom"><button class="x" data-act="close">✕</button>
      <svg viewBox="-330 -230 660 460" class="s3-zoom-svg" role="img" aria-label="打開的行李箱內部">
        <rect x="-320" y="-220" width="640" height="440" rx="30" fill="#5a4a3a" ${ST}/>
        <rect x="-296" y="-196" width="592" height="392" rx="18" fill="#8a7a9a"/>
        <path d="M-296,-120 q296,-30 592,0 M-296,40 q296,30 592,0" stroke="#7a6a8a" stroke-width="6" fill="none" opacity=".6"/>
        <rect x="-296" y="-196" width="592" height="392" rx="18" fill="none" stroke="#3a2f24" stroke-width="6"/>
        ${items}
      </svg></div>`;
  }
  function newsHtml() {
    return `<div class="modal-card s3-news"><button class="x" data-act="close">✕</button>
      <div class="s3-news-head">${esc(data.news.source)}</div><h2>${esc(data.news.title)}</h2>
      <ol>${data.news.list.map((n) => `<li><b>${esc(n.zh)}</b><small>${esc(n.country)}</small><p>${esc(n.text)}</p></li>`).join('')}</ol></div>`;
  }
  function boardHtml() {
    return `<div class="modal-card s3-board"><button class="x" data-act="close">✕</button>
      <div class="s3-board-head"><b>DEPARTURES 出境</b><span>TODAY · ${esc(data.date.label)}（${esc(data.date.zh)}）</span></div>
      <table><thead><tr><th>時間</th><th>航班</th><th>目的地</th><th>登機口</th></tr></thead><tbody>
      ${data.flights.map((f) => `<tr><td>${esc(f.time)}</td><td>${esc(f.flight)}</td><td>${esc(f.dest)}<small>${esc(f.destZh)}</small></td><td>${f.gate}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function gateHtml() {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-act="key" data-k="${n}">${n}</button>`).join('');
    const n = Number(ui.gate);
    const ok = ui.gate !== '' && n >= 1 && n <= data.maxGate;
    return `<div class="modal-card s3-gate">
      <button class="x" data-act="close">✕</button>
      <h2>要去幾號登機口？</h2>
      <div class="s3-display">${ui.gate === '' ? '<em>1 ~ ' + data.maxGate + '</em>' : 'GATE ' + esc(ui.gate)}</div>
      <div class="s3-keys">${keys}<button data-act="del">⌫</button><button data-act="key" data-k="0">0</button><button class="go" data-act="go" ${ok ? '' : 'disabled'}>前往</button></div></div>`;
  }
  function renderModal() {
    const el = $modal();
    if (!ui.modal) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = { case: caseHtml, news: newsHtml, board: boardHtml, gate: gateHtml }[ui.modal]();
    el.hidden = false;
  }
  function closeModal() { ui.modal = null; renderModal(); }

  async function onModalClick(e) {
    if (e.target === $modal()) return closeModal();
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    switch (t.dataset.act) {
      case 'close': return closeModal();
      case 'item': ui.item = t.dataset.id; return renderModal();
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
  function onStageClick(e) {
    const h = e.target.closest('[data-hot]');
    if (!h || !introDone) return;
    const k = h.dataset.hot;
    if (k === 'case') { ui.seen.case = true; ui.modal = 'case'; }
    else if (k === 'news') { ui.seen.news = true; ui.modal = 'news'; }
    else if (k === 'board') { ui.modal = 'board'; }
    else if (k === 'pick') { ui.seen.pick = true; ui.gate = ''; ui.modal = 'gate'; }
    else if (k === 'nav-right' || k === 'nav-left') { ui.seen.nav = true; ui.view = k === 'nav-right' ? 1 : 0; }
    else return;
    draw();
  }

  function draw() {
    if (!box) return;
    if (!introDone) box.innerHTML = roomIntro();
    else box.innerHTML = data.role === 'A' ? roomA() : roomB();
    renderModal();
  }
  let speakTimer = 0;
  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    if (window.Music && Music.pa) Music.pa();
    speakTimer = setTimeout(() => { if (window.Music && Music.speak) Music.speak(PA_TEXT); }, 1800);
    if (ctx && ctx.say) ctx.say(PA_TEXT, { now: true, ms: INTRO_MS - 2500 });
    introTimer = setTimeout(() => {
      introDone = true; draw();
      if (ctx.say) ctx.say(data.role === 'B' ? '警察圍著地上一個打開的行李箱……' : '大廳又恢復了人來人往。看看航班看板吧。', { now: true, ms: 5000 });
    }, INTRO_MS);
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.airport = {
    render(container, newData, c) {
      box = container; ctx = c; data = newData;
      box.onclick = onStageClick;
      const m = $modal();
      m.onclick = onModalClick;
      m.onkeydown = null;
      draw();
      if (!introDone) startIntro();
    },
    unmount() {
      clearTimeout(introTimer); introTimer = 0; clearTimeout(speakTimer); if (window.Music && Music.hush) Music.hush(); introDone = false; introStarted = false;
      ui = fresh(); box = null;
      const m = $modal(); m.hidden = true; m.innerHTML = '';
    },
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modal) closeModal(); });
})();
