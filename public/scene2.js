// 場景 2 的畫面與互動：168 Street 地鐵月台。
//   A（Raccoony）：站名牌 + 壞掉的電子看板（每列左邊有符號、右側有頻道旋鈕；一開始只有一列亮著）。
//   B（Slothy）：視角 1 月台（柱子上的舊地圖、路人、選路線）；視角 2 電箱（接電線、開閘門）。
// 只負責「畫」和「把點擊變成 action」；正確路線由伺服器判定。看板內容、路人台詞都來自伺服器 data。
(function () {
  const A = window.Art;
  const INK = A.INK;
  const ST = A.st(4);
  const ST2 = A.st(2.5);
  const FONT = A.FONT;
  const HELV = `font-family="'Helvetica Neue',Helvetica,Arial,'GenSeki','PingFang TC','Noto Sans TC',sans-serif" font-weight="700"`;
  const COLORS = { A: '#0039A6', B: '#FF6319', C: '#0039A6', D: '#FF6319', E: '#0039A6', F: '#FF6319', 1: '#EE352E', 2: '#EE352E', 3: '#EE352E', 7: '#B933AD' }; // MTA 官方路線色
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const fresh = () => ({ modal: null, sel: null, seenBtn: false, view: 0, seen: {}, selWire: null, dial: {}, flashN: undefined, flashLine: null, snap: null });
  let ui = fresh();
  let ctx = null;
  let data = null;
  let box = null;
  const anim = { raf: 0, t0: 0, els: [] };

  const $modal = () => document.getElementById('modal');
  const SVG_OPEN = (label) => `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="${label}">`;
  const bullet = (cx, cy, r, l) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS[l]}"/><text x="${cx}" y="${cy + r * 0.44}" text-anchor="middle" font-size="${r * 1.25}" fill="#fff" ${HELV}>${l}</text>`;

  const DEFS = `<defs>
    <pattern id="brickA" width="64" height="32" patternUnits="userSpaceOnUse"><rect width="64" height="32" fill="#e6dcc8"/>
      <rect x="2" y="2" width="28" height="12" fill="#c9b595"/><rect x="34" y="2" width="28" height="12" fill="#c9b595"/>
      <rect x="18" y="18" width="28" height="12" fill="#c9b595"/><rect x="-14" y="18" width="28" height="12" fill="#c9b595"/><rect x="50" y="18" width="28" height="12" fill="#c9b595"/></pattern>
    <pattern id="brickR" width="32" height="16" patternUnits="userSpaceOnUse"><rect width="32" height="16" fill="#4d1019"/>
      <rect x="1" y="1" width="14" height="6" fill="#8a2433"/><rect x="17" y="1" width="14" height="6" fill="#8a2433"/>
      <rect x="9" y="9" width="14" height="6" fill="#8a2433"/><rect x="-7" y="9" width="14" height="6" fill="#8a2433"/><rect x="25" y="9" width="14" height="6" fill="#8a2433"/></pattern>
  </defs>`;

  // 看板列通電但頻道不對：整列都是雜訊
  function staticCell(cy, seed0) {
    let seed = seed0; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let o = '';
    for (let i = 0; i < 54; i++) o += `<rect x="${(248 + i * 10.6).toFixed(1)}" y="${(cy - 14 + rnd() * 8).toFixed(1)}" width="7.5" height="${(5 + rnd() * 16).toFixed(1)}" fill="${['#ffb000', '#ffffff', '#7a7f88'][i % 3]}" opacity="${(0.15 + rnd() * 0.5).toFixed(2)}"/>`;
    return `<g class="fault">${o}<rect x="244" y="${cy - 4}" width="580" height="3" fill="#000" opacity=".7"/></g>`;
  }
  // 小符號：三角形、圓形、方形、星形、菱形
  function sym(kind, cx, cy, r, fill, extra = '') {
    const P = (pts) => `<polygon points="${pts.map(([x, y]) => `${(cx + x * r).toFixed(1)},${(cy + y * r).toFixed(1)}`).join(' ')}" fill="${fill}" ${extra}/>`;
    if (kind === 'circ') return `<circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="${fill}" ${extra}/>`;
    if (kind === 'sq') return P([[-0.78, -0.78], [0.78, -0.78], [0.78, 0.78], [-0.78, 0.78]]);
    if (kind === 'tri') return P([[0, -0.95], [0.95, 0.75], [-0.95, 0.75]]);
    if (kind === 'dia') return P([[0, -1], [0.8, 0], [0, 1], [-0.8, 0]]);
    const st = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.42 : 1; st.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    return P(st);
  }
  // 左右切換視角的箭頭
  function navBtn(dir) {
    const x = dir === 'right' ? 920 : 80, y = 360;
    const tri = dir === 'right' ? 'M-8,-15 L13,0 L-8,15Z' : 'M8,-15 L-13,0 L8,15Z';
    return `<g class="hot" data-hot="nav-${dir}"><circle cx="${x}" cy="${y}" r="38" fill="#ffd23f" ${ST}/><path d="${tri}" transform="translate(${x},${y})" fill="${INK}"/>
      ${ui.seen.nav ? '' : `<circle class="pulse" cx="${x}" cy="${y}" r="50" fill="none" stroke="#ff5a5f" stroke-width="6"/>`}</g>`;
  }

  // ---------- A：月台磚牆 + 站名牌 + 電子看板 ----------
  function roomA() {
    const b = data.board;
    const rows = b.rows.map((r, i) => {
      const top = 312 + i * 34, cy = top + 17;
      const dim = r.state === 'dark' ? ' opacity=".45"' : '';
      const body = r.state === 'clear'
        ? `<text x="252" y="${cy + 9}" font-size="26" fill="#fff" ${HELV}>${esc(r.to)}</text>
          <text x="690" y="${cy + 9}" text-anchor="end" font-size="26" fill="#ffb000" ${HELV}>${r.next} min</text>
          <text x="812" y="${cy + 8}" text-anchor="end" font-size="22" fill="#8d939c" ${HELV}>${r.then} min</text>`
        : r.state === 'static' ? staticCell(cy, 7 + i * 13) : '';
      const flash = ui.flashLine === r.line ? `<rect class="row-flash" x="160" y="${top + 1}" width="680" height="32" fill="#ff2a1f"/>` : '';
      const dv = ui.dial[r.line] !== undefined ? ui.dial[r.line] : r.dial;
      const knob = `<g class="hot" data-hot="dial-${r.line}"><rect x="864" y="${cy - 16}" width="76" height="32" fill="transparent" style="pointer-events:all"/><circle cx="884" cy="${cy}" r="14" fill="${r.state === 'dark' ? '#3a3d46' : '#c9ccd2'}" ${ST2}/>
        <line x1="884" y1="${cy}" x2="${(884 + Math.sin((dv / 9) * Math.PI * 1.6 - 0.8 * Math.PI) * 11).toFixed(1)}" y2="${(cy - Math.cos((dv / 9) * Math.PI * 1.6 - 0.8 * Math.PI) * 11).toFixed(1)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <rect x="904" y="${cy - 13}" width="30" height="26" rx="4" fill="#0d0d10" ${A.st(2)}/><text x="919" y="${cy + 8}" text-anchor="middle" font-size="19" fill="#5ad17a" ${HELV}>${dv}</text></g>`;
      return `<g${dim}>${sym(r.sym, 176, cy, 10, '#f4efe4')}${bullet(212, cy, 14, r.line)}</g>${body}${flash}${knob}
        ${i < b.rows.length - 1 ? `<line x1="160" y1="${top + 34}" x2="840" y2="${top + 34}" stroke="#2a2a30" stroke-width="2"/>` : ''}`;
    }).join('');
    return `${SVG_OPEN('168 Street 月台')}${DEFS}
      <rect x="-900" width="2800" height="700" fill="url(#brickA)"/>
      <rect x="-900" y="0" width="2800" height="36" fill="#2f323a"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${90 + i * 250}" y="9" width="120" height="13" rx="3" fill="#fff6cf" ${A.st(2)}/>`).join('')}
      <rect x="240" y="62" width="520" height="140" fill="url(#brickR)" ${ST}/>
      <rect x="254" y="76" width="492" height="112" fill="none" stroke="#f4efe4" stroke-width="5"/>
      <text x="500" y="156" text-anchor="middle" font-size="76" fill="#f7f2e6" ${HELV}>${esc(b.station)}</text>
      <rect x="856" y="300" width="96" height="190" rx="10" fill="#2f323a" ${ST}/>
      <rect x="150" y="232" width="700" height="276" rx="16" fill="#0d0d10" ${ST}/>
      ${[[166, 248], [834, 248], [166, 492], [834, 492]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#555"/>`).join('')}
      <text x="182" y="272" font-size="20" fill="#9aa0a8" ${HELV}>NEXT TRAINS</text>
      <text x="818" y="274" text-anchor="end" font-size="32" fill="#ffb000" ${HELV}>${esc(b.time)}</text>
      ${data.allClear ? '' : `<text x="500" y="272" text-anchor="middle" font-size="16" fill="#ff5a5f" ${HELV}>⚠ SIGNAL ERROR</text>`}
      <text x="252" y="302" font-size="15" fill="#6d737c" ${HELV}>TO</text>
      <text x="690" y="302" text-anchor="end" font-size="15" fill="#6d737c" ${HELV}>NEXT</text>
      <text x="812" y="302" text-anchor="end" font-size="15" fill="#6d737c" ${HELV}>THEN</text>
      ${rows}
      <rect x="-900" y="552" width="2800" height="16" fill="#3a3d46" ${ST}/>
      <rect x="-900" y="568" width="2800" height="140" fill="#8d9199" ${ST}/>
      ${[100, 280, 460, 640, 820].map((x) => `<line x1="${x}" y1="568" x2="${x - 40}" y2="700" stroke="${INK}" stroke-width="2.5" opacity=".3"/>`).join('')}
      <line x1="-10" y1="636" x2="1010" y2="636" stroke="${INK}" stroke-width="2.5" opacity=".3"/>
      <g><rect x="880" y="560" width="64" height="96" rx="10" fill="#3c4a40" ${ST}/><rect x="876" y="552" width="72" height="14" rx="5" fill="#2c372f" ${ST}/></g>
      ${data.passer ? person(data.passer.id, data.passer.lines, { cen: 900, y: 692, s: 0.62, from: 'right', side: true }) : ''}
      ${A.raccoony(110, 698, 0.66)}
    </svg>`;
  }

  // ---------- B：月台 + 列車 + 路人 ----------
  const LOOKS = {
    banker: {
      skin: '#f1c9a5', top: '#c8a070', bottom: '#34343d', shoe: '#1b1b1f', torsoW: 78, torsoBottom: -52,
      torso: `<path d="M-11,-172 L0,-126 L11,-172Z" fill="#fff" ${ST2}/><path d="M0,-168 l7,12 l-7,40 l-7,-40Z" fill="#c8302e" ${ST2}/>`,
      hair: `<path d="M-38,-212 Q-40,-252 0,-252 Q40,-252 38,-212 Q22,-234 0,-232 Q-22,-234 -38,-212Z" fill="#2b2b2b" ${ST2}/>`,
      face: `<circle cx="-40" cy="-206" r="4.5" fill="#fff" ${A.st(2)}/><circle cx="40" cy="-206" r="4.5" fill="#fff" ${A.st(2)}/>`,
      handR: `<g transform="translate(4,58)"><rect x="-10" y="-20" width="20" height="26" rx="3" fill="#fff" ${ST2}/><rect x="-10" y="-12" width="20" height="10" fill="#a0642d"/></g>`,
      handL: `<g transform="translate(0,78)"><rect x="-24" y="-8" width="48" height="34" rx="5" fill="#5a3b26" ${ST2}/><path d="M-9,-8 v-8 h18 v8" fill="none" ${ST2}/></g>`,
    },
    skater: {
      skin: '#8d5a3b', top: '#9aa0a6', bottom: '#3b5a8a', shoe: '#f4f4f4', torsoW: 90, legW: 30, shoeW: 24, torsoBottom: -84,
      torso: `<rect x="-26" y="-130" width="52" height="28" rx="8" fill="#868c92" ${ST2}/><path d="M-8,-172 v30 M8,-172 v30" stroke="#fff" stroke-width="3"/>`,
      hair: `<path d="M-40,-212 Q-42,-262 0,-262 Q42,-262 40,-212 Z" fill="#ff7a1a" ${ST2}/><rect x="-42" y="-224" width="84" height="12" rx="6" fill="#e86300" ${ST2}/><circle cx="0" cy="-264" r="8" fill="#ff7a1a" ${ST2}/>`,
      handL: `<g transform="translate(-4,34) rotate(72)"><rect x="-46" y="-7" width="92" height="14" rx="7" fill="#d9a05b" ${ST2}/><circle cx="-28" cy="10" r="6" fill="#e5382f" ${ST2}/><circle cx="28" cy="10" r="6" fill="#e5382f" ${ST2}/></g>`,
    },
    artist: {
      skin: '#e8b88f', top: '#2a2a35', bottom: '#d9a321', shoe: '#f4f4f4', torsoW: 72, torsoBottom: -70,
      torso: `<path d="M-24,-176 Q0,-158 24,-176 L24,-156 Q0,-138 -24,-156Z" fill="#e5382f" ${ST2}/>`,
      hair: `<path d="M-42,-204 Q-46,-258 0,-258 Q46,-258 42,-204 L42,-170 Q32,-180 31,-206 Q0,-194 -31,-206 Q-32,-180 -42,-170Z" fill="#1b1b1f" ${ST2}/><ellipse cx="8" cy="-254" rx="40" ry="13" fill="#a52a2a" ${ST2}/><circle cx="8" cy="-266" r="4" fill="#a52a2a" ${ST2}/>`,
      face: `<circle cx="-14" cy="-208" r="11" fill="none" ${ST2}/><circle cx="14" cy="-208" r="11" fill="none" ${ST2}/><path d="M-3,-208 h6" fill="none" ${ST2}/>`,
      handR: `<g transform="translate(0,72)"><path d="M-18,-8 q18,-34 36,0" fill="none" stroke="${INK}" stroke-width="4"/><rect x="-28" y="-8" width="56" height="52" rx="6" fill="#f2e8cf" ${ST2}/></g>`,
    },
    rider: {
      skin: '#d9a07a', top: '#ff8c1a', sleeve: '#2b2f38', bottom: '#23262e', shoe: '#cfd3d8', torsoW: 72, torsoBottom: -86,
      back: `<rect x="-54" y="-206" width="108" height="100" rx="12" fill="#1fb6a6" ${ST}/><rect x="-54" y="-166" width="108" height="10" fill="#fff" opacity=".85"/>`,
      torso: `<rect x="-36" y="-140" width="72" height="9" fill="#fff5a0"/><rect x="-36" y="-118" width="72" height="9" fill="#fff5a0"/>`,
      hair: `<path d="M-40,-206 Q-42,-262 0,-262 Q42,-262 40,-206 Z" fill="#2f9e5b" ${ST2}/><rect x="-42" y="-214" width="84" height="8" rx="3" fill="#1d6e3d" ${ST2}/>`,
    },
  };

  const textW = (t) => [...String(t)].reduce((a, c) => a + (/[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(c) ? 23 : 12), 0);
  function bubbleSvg(lines, left = false) {
    const w = Math.max(300, Math.ceil(Math.max(...lines.map(textW)) + 34)), lh = 30, h = lines.length * lh + 20, x = left ? 48 - w : -48, y = -(262 + h);
    const tx = left ? x + w - 84 : x + 54;
    return `<g class="bub" opacity="0" style="pointer-events:none">
      <path d="M${tx},${y + h - 2} L${tx + (left ? 38 : -8)},${y + h + 26} L${tx + 30},${y + h - 2}Z" fill="#fff" ${ST2}/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#fff" ${ST}/>
      <rect x="${tx - 2}" y="${y + h - 4}" width="34" height="7" fill="#fff"/>
      <text x="${x + 16}" y="${y + 33}" font-size="23" fill="${INK}" ${FONT}>${lines.map((l, i) => `<tspan x="${x + 16}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text>
    </g>`;
  }

  // 頭左邊的泡泡（Raccoony 那邊用：不要擋到看板）；k 讓字不跟著人一起縮小
  function bubbleSide(lines, k) {
    const w = Math.ceil(Math.max(...lines.map(textW)) + 34), lh = 30, h = lines.length * lh + 20;
    return `<g class="bub" opacity="0" style="pointer-events:none"><g transform="translate(-58,-214) scale(${k})">
      <path d="M-4,-14 L26,4 L-4,10Z" fill="#fff" ${ST2}/>
      <rect x="${-w}" y="${-h / 2}" width="${w}" height="${h}" rx="16" fill="#fff" ${ST}/><rect x="-8" y="-12" width="9" height="20" fill="#fff"/>
      <text x="${16 - w}" y="${-h / 2 + 33}" font-size="23" fill="${INK}" ${FONT}>${lines.map((l, i) => `<tspan x="${16 - w}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text></g></g>`;
  }
  // o：{ cen 停下來的位置, y 腳的位置, s 大小, from 'left'|'right' 從哪邊走進來, side 泡泡放頭的左邊 }
  function person(k, lines, o = {}) {
    const P = LOOKS[k];
    const cen = o.cen ?? 420, y = o.y ?? 632, sc = o.s ?? 1, from = o.from || 'left';
    return `<g class="person" data-k="${k}" data-cen="${cen}" data-y="${y}" data-s="${sc}" data-from="${from}" transform="translate(-400,${y}) scale(${sc})">
      ${A.human(P, { noShadow: true })}
      ${o.side ? bubbleSide(lines, 0.82 / sc) : bubbleSvg(lines, from === 'right')}
    </g>`;
  }

  function roomB() {
    const car = Array.from({ length: 6 }, (_, i) => {
      const wx = 30 + i * 165, dx = 135 + i * 165;
      return `<rect x="${wx}" y="214" width="100" height="84" rx="10" fill="#1f2832" ${ST2}/><path d="M${wx + 12},${222} l26,0 l-30,68 l-0,-10Z" fill="#fff" opacity=".12"/>
        <rect x="${dx}" y="204" width="56" height="190" rx="4" fill="#a6adb6" ${ST2}/><line x1="${dx + 28}" y1="204" x2="${dx + 28}" y2="394" stroke="${INK}" stroke-width="2.5"/>
        <rect x="${dx + 8}" y="218" width="14" height="70" rx="4" fill="#1f2832"/><rect x="${dx + 34}" y="218" width="14" height="70" rx="4" fill="#1f2832"/>`;
    }).join('');
    const pulse = ui.seenBtn ? '' : `<rect class="pulse" x="370" y="10" width="260" height="72" rx="36" fill="none" stroke="#ff5a5f" stroke-width="5"/>`;
    return `${SVG_OPEN('168 Street 月台與列車')}${DEFS}
      <rect x="-900" width="2800" height="700" fill="#4a5360"/>
      <rect x="-900" y="0" width="2800" height="136" fill="#2e323a"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${110 + i * 250}" y="92" width="120" height="14" rx="3" fill="#fff6cf" ${A.st(2)}/>`).join('')}
      <rect x="-900" y="130" width="2800" height="16" fill="#232830" ${ST2}/>
      <rect x="-900" y="166" width="2800" height="262" rx="10" fill="#8b939d" ${ST}/>
      <rect x="-900" y="166" width="2800" height="26" fill="#6f7782" ${ST2}/>
      ${[330, 346, 362].map((y) => `<line x1="-20" y1="${y}" x2="1020" y2="${y}" stroke="#7a828c" stroke-width="2.5"/>`).join('')}
      ${car}
      <rect x="-900" y="394" width="2800" height="34" fill="#4a4f58" ${ST2}/>
      <rect x="-900" y="428" width="2800" height="84" fill="#25252a"/>
      <line x1="-10" y1="456" x2="1010" y2="456" stroke="#9aa0a8" stroke-width="5"/><line x1="-10" y1="488" x2="1010" y2="488" stroke="#9aa0a8" stroke-width="5"/>
      ${Array.from({ length: 26 }, (_, i) => `<rect x="${i * 42 - 6}" y="446" width="14" height="52" fill="#3a2f26"/>`).join('')}
      <rect x="-900" y="508" width="2800" height="22" fill="#f2c230" ${ST}/>
      ${Array.from({ length: 34 }, (_, i) => `<circle cx="${i * 30 + 6}" cy="519" r="3.5" fill="#c99a14"/>`).join('')}
      <rect x="-900" y="530" width="2800" height="180" fill="#9a9ea6" ${ST}/>
      ${[100, 280, 460, 640, 820].map((x) => `<line x1="${x}" y1="530" x2="${x - 50}" y2="700" stroke="${INK}" stroke-width="2.5" opacity=".28"/>`).join('')}
      <line x1="-10" y1="620" x2="1010" y2="620" stroke="${INK}" stroke-width="2.5" opacity=".28"/>
      ${[230, 770].map((x) => `<rect x="${x - 17}" y="0" width="34" height="548" fill="#566b66" ${ST}/><path d="M${x - 17},120 h34 M${x - 17},300 h34 M${x - 17},480 h34" stroke="${INK}" stroke-width="3" opacity=".5"/><rect x="${x - 26}" y="540" width="52" height="14" fill="#3b4a46" ${ST2}/>`).join('')}
      <g class="hot" data-hot="map"><g transform="rotate(-4 770 300)">
        <rect x="712" y="236" width="116" height="128" fill="#f4f1e8" ${ST2}/><rect x="720" y="246" width="100" height="86" fill="#fff"/>
        ${data.map.routes.map((r, i) => { const si = data.map.stops.findIndex((x) => x.id === r.stop), y0 = 289, y1 = 252 + si * 14, bx = 734 + i * 9; return `<path d="M726,${y0} H${bx} V${y1} H808" fill="none" stroke="${COLORS[r.line] || '#888'}" stroke-width="2.6" stroke-linejoin="round"/>`; }).join('')}
        <circle cx="726" cy="289" r="4" fill="#fff" ${A.st(1.5)}/>${data.map.stops.map((x, i) => `<circle cx="810" cy="${252 + i * 14}" r="3" fill="${x.ap ? '#3a8cff' : '#fff'}" ${A.st(1)}/>`).join('')}
        <text x="770" y="352" text-anchor="middle" font-size="12" fill="#5a4a2a" ${HELV}>SUBWAY MAP</text>
        <path d="M812,364 L828,348 L828,364Z" fill="#b39d68" ${A.st(1.5)}/><rect x="700" y="230" width="30" height="12" fill="#f0e6c0" opacity=".85" transform="rotate(-20 715 236)"/><rect x="810" y="230" width="30" height="12" fill="#f0e6c0" opacity=".85" transform="rotate(18 825 236)"/>
        <path d="M724,262 l18,10 M790,340 l12,-6" stroke="#8a7a55" stroke-width="1.5" opacity=".7"/></g>
        ${ui.seen.map ? '' : `<rect class="pulse" x="700" y="226" width="140" height="150" rx="8" fill="none" stroke="#ff5a5f" stroke-width="5"/>`}</g>
      ${data.passer ? person(data.passer.id, data.passer.lines, { cen: 430 }) : ''}
      ${A.slothy(112, 690, 1.12)}
      ${navBtn('right')}
      <g class="hot" data-hot="pick"><rect x="380" y="18" width="240" height="56" rx="28" fill="${data.allClear ? '#ffd23f' : '#c9ccd2'}" ${ST}/><text x="500" y="56" text-anchor="middle" font-size="26" fill="${INK}" ${FONT}>${tr('選擇路線', 'Pick a line')}</text>${pulse}</g>
    </svg>`;
  }

  // ---------- 路人動畫（走過來 → 停下說話 → 走開 → 等一下再來）----------
  const SLOT = 17, IN = 3.4, TALK = 6.4, OUT = 3.6;
  const setRot = (el, a) => el.setAttribute('transform', `translate(${el.dataset.bx},${el.dataset.by}) rotate(${a.toFixed(1)})`);

  function resolveRefs() {
    anim.els = [...box.querySelectorAll('.person')].map((root) => ({
      root, legL: root.querySelector('.legL'), legR: root.querySelector('.legR'),
      armL: root.querySelector('.armL'), armR: root.querySelector('.armR'),
      mouth: root.querySelector('.mouth'), bub: root.querySelector('.bub'),
      cen: Number(root.dataset.cen), y: Number(root.dataset.y), s: Number(root.dataset.s), right: root.dataset.from === 'right',
    }));
  }
  function frame(now) {
    anim.raf = requestAnimationFrame(frame);
    if (!anim.els.length) return;
    const t = (now - anim.t0) / 1000;
    anim.els.forEach((p, i) => {
      const local = (t + i * 5) % SLOT;
      const off = p.right ? 1180 : -170, gone = p.right ? 1180 : 1180;
      let x = p.right ? 1300 : -400, walking = false, talking = false;
      if (local < IN) { x = off + (p.cen - off) * (local / IN); walking = true; }
      else if (local < IN + TALK) { x = p.cen; talking = true; }
      else if (local < IN + TALK + OUT) { x = p.cen + (gone - p.cen) * ((local - IN - TALK) / OUT); walking = true; }
      const ph = t * 9 + i, sw = walking ? Math.sin(ph) : 0;
      p.root.setAttribute('transform', `translate(${x.toFixed(1)},${(p.y - (walking ? Math.abs(Math.sin(ph)) * 6 : 0)).toFixed(1)}) scale(${p.s})`);
      setRot(p.legL, sw * 24); setRot(p.legR, -sw * 24); setRot(p.armL, -sw * 20); setRot(p.armR, sw * 20);
      p.mouth.setAttribute('ry', talking ? (2.5 + Math.abs(Math.sin(t * 12 + i)) * 5).toFixed(1) : '2.5');
      const fade = talking ? Math.min(1, (local - IN) / 0.3, (IN + TALK - local) / 0.3) : 0;
      p.bub.setAttribute('opacity', Math.max(0, fade).toFixed(2));
    });
  }
  function startLoop() {
    if (anim.raf) return;
    anim.t0 = performance.now();
    anim.raf = requestAnimationFrame(frame);
  }
  function stopLoop() { cancelAnimationFrame(anim.raf); anim.raf = 0; anim.els = []; }

  // ---------- B 視角 2：磚牆中間的電箱（蓋子掉在地上）----------
  const WX = (i) => 300 + i * 100;
  function roomBox() {
    const terms = data.terms.map((t, i) => {
      const x = WX(i), l = data.wires.find((w) => w.term === t);
      const on = l && l.powered, snap = ui.snap === t;
      return `<g class="hot" data-hot="term-${t}"><rect x="${x - 34}" y="250" width="68" height="58" rx="8" fill="#1b1d24" ${ST2}/>${sym(t, x, 279, 17, on ? '#5ad17a' : '#f4efe4')}
          ${ui.selWire && !on ? `<rect class="pulse" x="${x - 40}" y="244" width="80" height="70" rx="10" fill="none" stroke="#ffd23f" stroke-width="4"/>` : ''}</g>
        <g class="hot${snap ? ' gate-snap' : ''}" data-hot="gate-${t}"><rect x="${x - 22}" y="140" width="44" height="88" rx="6" fill="#4a4f5c" ${ST2}/>
          <rect x="${x - 7}" y="${on ? 150 : 186}" width="14" height="34" rx="4" fill="${on ? '#5ad17a' : '#e5382f'}" ${A.st(2)}/>
          <text x="${x}" y="134" text-anchor="middle" font-size="12" fill="#c9ccd2" ${HELV}>${on ? 'ON' : 'OFF'}</text></g>`;
    }).join('');
    const wires = data.wires.map((w, i) => {
      const ax = WX(i), ay = 560, col = COLORS[w.line];
      const ti = w.term ? data.terms.indexOf(w.term) : -1;
      const path = ti >= 0 ? `M${ax},${ay} C${ax},${ay - 120} ${WX(ti)},${420} ${WX(ti)},308` : `M${ax},${ay} C${ax},${ay - 60} ${ax + 26},${ay - 70} ${ax + 18},${ay - 104}`;
      const tip = ti >= 0 ? '' : `<circle cx="${ax + 18}" cy="${ay - 106}" r="5" fill="#d9822b" ${A.st(1.5)}/>`;
      const flip = ui.selWire === w.line;
      const frame = w.powered ? '' : `<rect x="-5" y="-5" width="54" height="40" rx="8" fill="none" stroke="#ffd23f" stroke-width="4" transform="rotate(-6 22 15)"/>`; // 黃框：提示牌子可以點
      const tag = `<g class="hot" data-hot="wire-${w.line}" transform="translate(${ax - 30},${ay - 78})">${frame}<rect width="44" height="30" rx="5" fill="${flip ? '#fff6cf' : '#fff'}" ${A.st(2)} transform="rotate(-6 22 15)"/>
          ${flip ? `<text x="22" y="21" text-anchor="middle" font-size="15" fill="${INK}" ${HELV}>CH ${w.ch}</text>` : bullet(22, 15, 11, w.line)}
          ${flip ? `<rect class="pulse" x="-4" y="-4" width="52" height="38" rx="7" fill="none" stroke="#ffd23f" stroke-width="4"/>` : ''}</g>`;
      return `<path d="${path}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>${tip}${tag}`;
    }).join('');
    return `${SVG_OPEN('月台磚牆上的電箱')}${DEFS}
      <rect x="-900" width="2800" height="700" fill="url(#brickA)"/>
      <rect x="-900" y="0" width="2800" height="36" fill="#2f323a"/>
      <rect x="-900" y="600" width="2800" height="110" fill="#8d9199" ${ST}/>
      <rect x="230" y="96" width="540" height="490" rx="10" fill="#7c848f" ${ST}/>
      <rect x="250" y="116" width="500" height="450" rx="6" fill="#2b3038" ${ST2}/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${WX(i) - 3}" y="560" width="6" height="26" fill="#1b1d24"/>`).join('')}
      <rect x="262" y="540" width="476" height="20" rx="4" fill="#1b1d24"/>
      <text x="500" y="350" text-anchor="middle" font-size="15" fill="#7a808b" ${HELV}>BOARD SIGNAL · 168 ST</text>
      ${terms}${wires}
      <g transform="rotate(8 870 640)"><rect x="790" y="610" width="170" height="56" rx="6" fill="#7c848f" ${ST}/><polygon points="875,618 893,650 857,650" fill="#ffd23f" ${A.st(2)}/><text x="875" y="646" text-anchor="middle" font-size="18" fill="${INK}" ${HELV}>!</text></g>
      ${A.slothy(120, 692, 0.95)}
      ${navBtn('left')}
    </svg>`;
  }

  // ---------- 路線圖：168 街 → 每條線開到哪一站；哪一站是機場 ----------
  function routeMap(m) {
    const SX = 78, SY = 230, EX = 452, sy = (i) => 52 + i * 70;
    // 不交叉的畫法：依終點由上到下排起點；往上走的線，終點越上面越早轉彎；往下走的線，終點越下面越早轉彎
    const R = m.routes.map((r) => ({ ...r, si: m.stops.findIndex((x) => x.id === r.stop) })).sort((p, q) => p.si - q.si || String(p.line).localeCompare(String(q.line)));
    R.forEach((r, k) => { r.same = R.filter((x, j) => x.stop === r.stop && j < k).length; r.y0 = SY - 24 + k * 9; r.y1 = sy(r.si) - 9 + r.same * 9; });
    const up = R.filter((r) => r.y1 < r.y0).sort((p, q) => p.y1 - q.y1), down = R.filter((r) => r.y1 >= r.y0).sort((p, q) => q.y1 - p.y1);
    up.forEach((r, k) => { r.bx = 120 + k * 46; }); down.forEach((r, k) => { r.bx = 120 + k * 46; });
    const dOf = (r) => `M${SX},${r.y0} H${r.bx} V${r.y1} H${EX}`;
    const lines = R.map((r) => `<path d="${dOf(r)}" fill="none" stroke="${INK}" stroke-width="9.5" stroke-linejoin="round"/>`).join('')
      + R.map((r) => `<path d="${dOf(r)}" fill="none" stroke="${COLORS[r.line] || '#888'}" stroke-width="6" stroke-linejoin="round"/>`).join('') + R.map((r) => bullet(EX - 40 - r.same * 32, r.y1, 13, r.line)).join('');
    const stops = m.stops.map((x, i) => `<rect x="${EX - 4}" y="${sy(i) - 22}" width="14" height="44" rx="7" fill="#fff" ${A.st(2.5)}/>
      <text x="${EX + 22}" y="${sy(i) + (x.ap ? -2 : 7)}" font-size="20" fill="${INK}" ${HELV}>${esc(x.name)}</text>
      ${x.ap ? `<text x="${EX + 22}" y="${sy(i) + 20}" font-size="16" fill="#1f5fbf" ${HELV}>✈ ${x.ap}</text>` : ''}`).join('');
    // 舊舊的、缺角的紙：不規則的邊、摺痕、黃斑
    const edge = 'M14,10 L120,6 L190,12 L300,5 L420,10 L560,4 L628,9 L640,40 L634,58 L652,72 L648,150 L654,260 L646,330 L652,400 L630,412 L612,444 L480,438 L360,446 L220,440 L96,446 L40,440 L24,420 L8,428 L12,330 L6,220 L12,120 L4,60Z';
    return `<svg viewBox="0 0 660 450" class="doc-map" role="img" aria-label="地鐵路線圖">
      <defs><clipPath id="mapEdge"><path d="${edge}"/></clipPath>
        <radialGradient id="mapAge" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#c9a85a" stop-opacity="0"/><stop offset="1" stop-color="#9a7a3a" stop-opacity=".42"/></radialGradient></defs>
      <path d="${edge}" fill="#000" opacity=".25" transform="translate(4,5)"/>
      <g clip-path="url(#mapEdge)">
      <rect width="660" height="450" fill="#f3ecd6"/>
      <text x="30" y="36" font-size="18" fill="#7a808b" ${HELV}>SUBWAY MAP</text>
      ${lines}${stops}
      <rect x="${SX - 58}" y="${SY - 32}" width="64" height="${m.routes.length * 9 + 26}" rx="10" fill="#fff" ${A.st(3)}/>
      <text x="${SX - 26}" y="${SY + m.routes.length * 9 + 22}" text-anchor="middle" font-size="16" fill="${INK}" ${HELV}>168 St</text>
      <path d="M330,0 V450 M0,225 H660" stroke="#8a6a30" stroke-width="2" opacity=".22"/><path d="M332,0 V450 M0,227 H660" stroke="#fff" stroke-width="1.5" opacity=".35"/>
      <ellipse cx="560" cy="380" rx="46" ry="30" fill="#b08a3a" opacity=".16"/><ellipse cx="120" cy="90" rx="30" ry="22" fill="#b08a3a" opacity=".12"/><circle cx="420" cy="60" r="14" fill="none" stroke="#a07a3a" stroke-width="3" opacity=".18"/>
      <rect width="660" height="450" fill="url(#mapAge)"/>
      </g>
      <path d="${edge}" fill="none" stroke="#7a6232" stroke-width="2" opacity=".55"/>
      <path d="M612,444 L630,412 L652,400 L640,432Z" fill="#d9c79a" stroke="#7a6232" stroke-width="1.5" opacity=".9"/>
    </svg>`;
  }

  // ---------- 彈出層：選路線 / 地圖 ----------
  function modalHtml() {
    if (ui.modal && ui.modal.type === 'map') return `<div class="modal-card s2-oldmap"><button class="x" data-act="close">✕</button><h2>${tr('柱子上的路線圖', 'Route map on the pillar')}</h2><div class="oldmap">${routeMap(data.map)}</div></div>`;
    const inner = !ui.sel
      ? `<h2>${tr('要搭哪一線？', 'Which line?')}</h2><div class="bullets">${data.lines.map((l) => `<button class="bullet" style="background:${COLORS[l]}" data-act="sel" data-l="${l}">${l}</button>`).join('')}</div>`
      : `<h2>${tr('搭', 'Take the')} <span class="bullet sm" style="background:${COLORS[ui.sel]}">${ui.sel}</span> ${tr('線嗎？', 'line?')}</h2><div class="row center"><button class="primary big" data-act="board">${tr('搭乘', 'Board')}</button><button class="big" data-act="back">${tr('重選', 'Back')}</button></div>`;
    return `<div class="modal-card"><button class="x" data-act="close">✕</button>${inner}</div>`;
  }
  function renderModal() {
    const el = $modal();
    if (!ui.modal) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = modalHtml();
    el.hidden = false;
  }
  function closeModal() { ui.modal = null; ui.sel = null; renderModal(); }
  async function onModalClick(e) {
    if (e.target === $modal()) return closeModal();
    const t = e.target.closest('[data-act]');
    if (!t) return;
    switch (t.dataset.act) {
      case 'close': return closeModal();
      case 'sel': ui.sel = t.dataset.l; return renderModal();
      case 'back': ui.sel = null; return renderModal();
      case 'board': {
        const line = ui.sel;
        await ctx.send({ type: 'board', line });
        closeModal(); // 答對時場景會被伺服器換掉；答錯則回到月台
      }
    }
  }
  function onStageClick(e) {
    const h = e.target.closest('[data-hot]');
    if (!h) return;
    const k = h.dataset.hot;
    if (k === 'pick') {
      if (!data.allClear) return ctx.say(tr('看板還沒修好，先讓它全部亮起來吧。', 'The board isn’t fixed yet. Light it all up first.'), { now: true });
      ui.seenBtn = true; ui.modal = { type: 'pick' }; ui.sel = null; draw(); return;
    }
    if (k === 'map') { ui.seen.map = true; ui.modal = { type: 'map' }; draw(); return; }
    if (k === 'nav-right' || k === 'nav-left') { ui.seen.nav = true; ui.view = k === 'nav-right' ? 1 : 0; ui.selWire = null; draw(); return; }
    if (k.startsWith('wire-')) {
      const l = k.slice(5), w = data.wires.find((x) => x.line === l);
      if (w && w.powered) { ui.selWire = null; draw(); return ctx.say(tr(`${l} 線已經接好了，牌子背面寫著 CH ${w.ch}。`, `The ${l} line is connected. The back of its tag says CH ${w.ch}.`), { now: true }); }
      ui.selWire = ui.selWire === l ? null : l; // 點牌子：翻到背面看頻道，同時選起這條線，再點一個接頭就接上
      draw(); return;
    }
    if (k.startsWith('term-') && ui.selWire) {
      const l = ui.selWire; ui.selWire = null;
      ctx.send({ type: 'plug', line: l, term: k.slice(5) });
      return;
    }
    if (k.startsWith('gate-')) { ui.lastGate = k.slice(5); ctx.send({ type: 'gate', term: k.slice(5) }); return; }
    if (k.startsWith('dial-')) {
      const l = k.slice(5), r = data.board.rows.find((x) => x.line === l);
      if (!r) return;
      // 連點時以畫面上的數字為準（不等伺服器回來），避免送出重複的頻道
      const cur = ui.dial[l] !== undefined ? ui.dial[l] : r.dial;
      ui.dial[l] = (cur % 9) + 1; draw();
      ctx.send({ type: 'tune', line: l, ch: ui.dial[l] });
    }
  }

  function draw() {
    if (!box) return;
    box.innerHTML = data.role === 'A' ? roomA() : ui.view === 1 ? roomBox() : roomB();
    resolveRefs();
    renderModal();
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.subway = {
    render(container, newData, c) {
      box = container; ctx = c; data = newData;
      box.onclick = onStageClick;
      if (data.board) for (const r of data.board.rows) if (ui.dial[r.line] === r.dial) delete ui.dial[r.line];
      // 接錯閘門：A 那列閃紅光；B 的閘門啪一聲跳回去
      if (data.flash && data.flash.n !== ui.flashN) {
        const first = ui.flashN === undefined; ui.flashN = data.flash.n;
        if (!first) {
          if (data.role === 'A') { ui.flashLine = data.flash.line; setTimeout(() => { ui.flashLine = null; draw(); }, 900); }
          else { ui.snap = ui.lastGate; if (window.Music && Music.buzz) Music.buzz(); setTimeout(() => { ui.snap = null; draw(); }, 600); }
        }
      } else if (ui.flashN === undefined) ui.flashN = data.flash ? data.flash.n : 0;
      const m = $modal();
      m.onclick = onModalClick;
      m.onkeydown = null;
      draw();
      startLoop();
    },
    unmount() { stopLoop(); ui = fresh(); box = null; const m = $modal(); m.hidden = true; m.innerHTML = ''; },
  };

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modal) closeModal(); });
})();
