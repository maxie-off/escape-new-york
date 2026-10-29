// 場景 1 的畫面與互動（Raccoony 的房間）。
// 版面是橫式 1000x700（給 iPad 橫放），整個畫面只有場景本身；提示鈕、字幕由 app.js 負責。
// 這裡只負責「畫」和「把點擊變成 action 送給伺服器」；謎底判定都在伺服器。
// 內容文字（便條、日記等）全部來自伺服器給的 data，要改內容請去 scenes/scene1.js。
(function () {
  const A = window.Art;
  const INK = A.INK;
  const ST = A.st(4);
  const ST2 = A.st(2.5);
  const FONT = A.FONT;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const fresh = () => ({ view: 0, gt: null, dw: [0, 0, 0, 0], dShake: false, pw: [0, 0, 0, 0], strumming: false, glowCase: null, armed: null, resoUntil: 0, cw: { plane: [0, 0, 0, 0], secret: [0, 0, 0, 0], love: [0, 0, 0, 0] }, cErr: '', shake: false, modal: null, awake: false, pwOpen: false, notionOpen: false, page: 0, seen: {}, pwErr: '', dErr: '' });
  let ui = fresh();
  let ctx = null; // { you, send(action) -> Promise, say(text, opts) }
  let data = null;
  let box = null;

  const $modal = () => document.getElementById('modal');

  const SVG_OPEN = (label) => `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="${label}">`;
  const DEFS = `<defs><pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2" fill="rgba(0,0,0,.12)"/></pattern></defs>`;
  const hit = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(0,0,0,0)"/>`;

  // ---------- A：Raccoony 的書桌（參考實拍：木頭書架 + 螢幕 + 鍵盤 + 筆記本） ----------
  function deskView() {
    const lit = ui.awake || data.pcUnlocked;
    // 鍵盤（65% 灰白鍵 + 紅色點綴鍵）
    const keys = [];
    for (let r = 0; r < 4; r++) {
      const y0 = 543 + r * 9.2;
      const t = (y0 - 540) / 40;
      const L = 392 - 16 * t + 4, R = 640 + 16 * t - 4, n = 13, w = (R - L) / n;
      for (let c = 0; c < n; c++) {
        const red = (r === 0 && c === 0) || (r === 3 && c >= 10);
        keys.push(`<rect x="${(L + c * w + 1).toFixed(1)}" y="${y0.toFixed(1)}" width="${(w - 2).toFixed(1)}" height="6.5" rx="1.5" fill="${red ? '#e5382f' : r === 3 ? '#c8ccd4' : '#f2f3f6'}"/>`);
      }
    }
    const books = [
      [640, 30, 104, '#3a8f55'], [672, 26, 96, '#2b2b33'], [700, 24, 110, '#c8402e'], [726, 28, 100, '#1d1d22'], [756, 24, 108, '#f2eee2'],
      [782, 30, 114, '#ffffff'], [814, 34, 120, '#44a05c'], [850, 28, 104, '#ece7da'], [880, 30, 116, '#2a2a2e'], [912, 30, 96, '#c0402c'],
    ].map(([x, w, h, c]) => `<rect x="${x}" y="${150 - h}" width="${w}" height="${h}" fill="${c}" ${ST2}/><path d="M${x + 6},${150 - h + 14} h${w - 12} M${x + 6},${150 - h + 24} h${w - 18}" stroke="${c === '#1d1d22' || c === '#2b2b33' || c === '#2a2a2e' ? '#fff' : INK}" stroke-width="2" opacity=".55"/>`).join('');
    const screen = data.pcUnlocked
      ? `<rect x="332" y="252" width="356" height="216" rx="6" fill="#4aa3df"/><rect x="360" y="280" width="44" height="54" fill="#fff" ${ST2}/><path d="M368,296 h28 M368,306 h28 M368,316 h20" stroke="${INK}" stroke-width="2.5" opacity=".6"/><text x="382" y="358" text-anchor="middle" font-size="14" fill="#fff" ${FONT}>Notion</text>`
      : lit
      ? `<rect x="332" y="252" width="356" height="216" rx="6" fill="#dff1ff"/><circle cx="510" cy="340" r="32" fill="#fff" ${ST2}/><text x="510" y="352" text-anchor="middle" font-size="34">🦝</text><rect x="440" y="390" width="140" height="28" rx="14" fill="#fff" ${ST2}/>`
      : `<rect x="332" y="252" width="356" height="216" rx="6" fill="#1c2030"/><path d="M352,268 L400,268 L346,340 L346,306Z" fill="#fff" opacity=".13"/>`;
    return `${SVG_OPEN('Raccoony 的書桌')}${DEFS}
      <rect x="-900" width="2800" height="700" fill="#efdfc0"/><rect x="-900" width="2800" height="700" fill="url(#dots)"/>
      <rect x="-900" y="186" width="2800" height="334" fill="#b3702f"/><rect x="-900" y="186" width="2800" height="334" fill="url(#dots)"/>
      ${[80, 210, 330, 560, 760, 930].map((x) => `<path d="M${x},190 v320" stroke="#8a5222" stroke-width="3" opacity=".5"/>`).join('')}
      <rect x="-900" y="150" width="2800" height="38" fill="#c98a4c" ${ST}/><rect x="-900" y="150" width="2800" height="10" fill="#e3a967"/>
      <rect x="-10" y="30" width="100" height="120" rx="14" fill="#e9e7e2" ${ST}/>
      <rect x="120" y="94" width="170" height="56" rx="26" fill="#e86a2b" ${ST}/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="${160 + i * 18}" cy="122" r="3" fill="#9c3d12"/>`).join('')}
      <path d="M124,110 C90,100 96,150 128,140" fill="none" stroke="#e86a2b" stroke-width="5" stroke-linecap="round"/>
      <rect x="330" y="46" width="100" height="104" rx="16" fill="#d3dde4" ${ST}/><rect x="330" y="118" width="100" height="32" fill="#2a2a30" ${ST}/>
      <path d="M430,64 C484,70 478,128 430,134" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
      ${books}
      <g class="hot" data-hot="note2"><g transform="rotate(3 600 218)"><rect x="556" y="176" width="90" height="80" fill="#ffe9a0" ${ST2}/><path d="M568,196 h62 M568,210 h58 M568,224 h64" stroke="${INK}" stroke-width="2.6" opacity=".6"/></g>${ui.seen.note2 ? '' : `<rect class="pulse" x="546" y="168" width="110" height="96" rx="6" fill="none" stroke="#ff5a5f" stroke-width="5"/>`}</g>
      <rect x="-900" y="512" width="2800" height="198" fill="#c98a4c" ${ST}/>
      ${[120, 300, 520, 760, 900].map((x) => `<path d="M${x},530 q60,6 130,0 M${x + 30},640 q50,8 110,0" fill="none" stroke="#a96a2f" stroke-width="3" opacity=".6"/>`).join('')}
      <rect x="-900" y="686" width="2800" height="16" fill="#8a5222" ${ST}/>
      <g>
        <rect x="-20" y="582" width="272" height="30" rx="8" fill="#aeb4be" ${ST}/><rect x="-20" y="582" width="272" height="9" rx="4" fill="#c9ced6" opacity=".8"/>
        <rect x="14" y="434" width="206" height="150" rx="10" fill="#c9ced6" ${ST}/>
        <rect x="14" y="434" width="206" height="24" rx="10" fill="#dde1e8" opacity=".7"/>
        <rect x="34" y="574" width="166" height="10" rx="3" fill="#8a909b" ${ST2}/>
        <ellipse cx="86" cy="526" rx="46" ry="26" fill="#3a8cff" ${ST2}/><text x="86" y="535" text-anchor="middle" font-size="22" fill="#fff" ${FONT}>${tr('台北', 'TAIPEI')}</text>
        <path d="M80,502 l3,-14 l3,14Z" fill="#fff" opacity=".85"/><rect x="82" y="480" width="8" height="12" fill="#fff" opacity=".7"/>
        <circle cx="166" cy="490" r="14" fill="#ffd23f" ${ST2}/><path d="M158,490 h16 M166,482 v16" stroke="${INK}" stroke-width="2.5"/>
        <rect x="150" y="530" width="48" height="22" rx="5" fill="#e5382f" ${ST2} transform="rotate(-6 174 541)"/>
      </g>
      <g class="hot" data-hot="pc">
        <rect x="320" y="240" width="380" height="240" rx="12" fill="#2a2d38" ${ST}/>${screen}
        <rect x="490" y="480" width="40" height="28" fill="#2a2d38" ${ST}/><rect x="440" y="504" width="140" height="10" rx="5" fill="#2a2d38" ${ST}/>
        <polygon points="392,540 640,540 656,580 376,580" fill="#d3d7df" ${ST2}/>${keys.join('')}
        ${lit ? '' : `<rect class="pulse" x="312" y="232" width="396" height="262" rx="18" fill="none" stroke="#ffd23f" stroke-width="7"/>`}
      </g>
      <g class="hot" data-hot="paper3"><polygon points="398,606 538,598 538,688 396,694" fill="#fffdf5" ${ST2}/><polygon points="542,598 682,606 684,694 542,688" fill="#fffdf5" ${ST2}/>
        ${Array.from({ length: 6 }, (_, i) => `<path d="M410,${616 + i * 12} q10,-5 20,0 t20,0 t20,0 t20,0 M556,${612 + i * 12} q10,-5 20,0 t20,0 t20,0 t20,0" fill="none" stroke="${INK}" stroke-width="1.8" opacity=".55"/>`).join('')}${ui.seen.paper3 ? '' : `<rect class="pulse" x="390" y="590" width="304" height="112" rx="8" fill="none" stroke="#ff5a5f" stroke-width="5"/>`}</g>
      ${data.ticketTaken ? '' : `<g class="hot" data-hot="ticket"><g class="bob"><g transform="rotate(-8 736 596)"><rect x="672" y="558" width="128" height="68" fill="#fff" ${ST2}/><rect x="672" y="558" width="128" height="20" fill="#1e5fb3" ${ST2}/><text x="680" y="573" font-size="12" fill="#fff" ${FONT}>✈ CHINA AIRLINES</text><path d="M682,592 h58 M682,604 h40 M682,614 h50" stroke="${INK}" stroke-width="2.5" opacity=".6"/><text x="778" y="612" text-anchor="middle" font-size="26">✈</text></g></g><rect class="pulse" x="660" y="546" width="152" height="92" rx="8" fill="none" stroke="#ffd23f" stroke-width="6"/></g>`}
      <g><line x1="328" y1="656" x2="384" y2="636" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><line x1="328" y1="656" x2="384" y2="636" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>
      ${A.raccoony(285, 596, 1.15)}
      ${navBtn('right')}
    </svg>`;
  }

  // ---------- 左右切換視角的箭頭 ----------
  function navBtn(dir) {
    const x = dir === 'right' ? 900 : 100, y = 350;
    const tri = dir === 'right' ? 'M-8,-15 L13,0 L-8,15Z' : 'M8,-15 L-13,0 L8,15Z';
    return `<g class="hot" data-hot="nav-${dir}"><circle cx="${x}" cy="${y}" r="38" fill="#ffd23f" ${ST}/><path d="${tri}" transform="translate(${x},${y})" fill="${INK}"/>
      ${ui.seen.nav ? '' : `<circle class="pulse" cx="${x}" cy="${y}" r="50" fill="none" stroke="#ff5a5f" stroke-width="6"/>`}</g>`;
  }

  // ---------- Fender Stratocaster（照真實比例：琴身約佔全長一半、琴頸細長、琴頭小） ----------
  function tele(x, y, s) {
    const NB = -320, NT = -150, L = 242; // 琴枕、指板末端、弦長
    const fy = (n) => NB + L * (1 - Math.pow(2, -n / 12));
    const frets = Array.from({ length: 21 }, (_, i) => `<line x1="-12" y1="${fy(i + 1).toFixed(1)}" x2="12" y2="${fy(i + 1).toFixed(1)}" stroke="#d9dde4" stroke-width="1.6"/>`).join('');
    const dots = [3, 5, 7, 9, 15, 17].map((n) => `<circle cx="0" cy="${((fy(n) + fy(n - 1)) / 2).toFixed(1)}" r="2.2" fill="#f0ead8"/>`).join('') + [-4, 4].map((dx) => `<circle cx="${dx}" cy="${((fy(12) + fy(11)) / 2).toFixed(1)}" r="2.2" fill="#f0ead8"/>`).join('');
    const strings = [-9, -5.4, -1.8, 1.8, 5.4, 9].map((dx, i) => `<line x1="${dx * 0.95}" y1="${NB}" x2="${dx * 1.1}" y2="-24" stroke="${i < 3 ? '#eef0f4' : '#c9cdd4'}" stroke-width="${i < 3 ? 0.45 : 0.7}"/>`).join('');
    const pegs = Array.from({ length: 6 }, (_, i) => `<rect x="${-25 + i * 0.5}" y="${NB - 10 - i * 11}" width="9" height="5" rx="2.5" fill="#dfe3ea" ${A.st(1.2)}/>`).join('');
    const pick = (py) => `<rect x="-19" y="${py}" width="38" height="8" rx="4" fill="#efe6c8" ${A.st(1.6)}/>${[-12, -7, -2, 2, 7, 12].map((px) => `<circle cx="${px}" cy="${py + 4}" r="1" fill="#6b6455"/>`).join('')}`;
    return `<g transform="translate(${x},${y}) scale(${s})">
      <defs><radialGradient id="sunb" cx="50%" cy="55%" r="62%"><stop offset="0" stop-color="#eeb04a"/><stop offset=".5" stop-color="#d58a28"/><stop offset=".8" stop-color="#8c2c12"/><stop offset="1" stop-color="#1c0d08"/></radialGradient><clipPath id="bodyclip"><path d="M-14,-170 C-24,-168 -30,-178 -36,-190 C-44,-202 -56,-198 -56,-180 C-56,-158 -44,-140 -42,-122 C-40,-106 -44,-96 -50,-84 C-62,-66 -72,-46 -68,-24 C-62,-2 -32,14 0,14 C32,14 62,-2 68,-24 C72,-46 62,-66 50,-84 C44,-96 40,-106 42,-122 C44,-138 54,-150 52,-160 C48,-172 40,-172 34,-164 C28,-158 22,-166 14,-170Z"/></clipPath></defs>
      <ellipse cx="0" cy="8" rx="80" ry="9" fill="#000" opacity=".25"/>
      <path d="M-14,-170 C-24,-168 -30,-178 -36,-190 C-44,-202 -56,-198 -56,-180 C-56,-158 -44,-140 -42,-122 C-40,-106 -44,-96 -50,-84 C-62,-66 -72,-46 -68,-24 C-62,-2 -32,14 0,14 C32,14 62,-2 68,-24 C72,-46 62,-66 50,-84 C44,-96 40,-106 42,-122 C44,-138 54,-150 52,-160 C48,-172 40,-172 34,-164 C28,-158 22,-166 14,-170Z" fill="url(#sunb)" ${ST2}/>
      <g clip-path="url(#bodyclip)"><path d="M-14,-152 C28,-152 50,-142 56,-122 C60,-102 52,-84 40,-72 C20,-64 -6,-66 -22,-72 C-26,-92 -26,-132 -14,-152Z" fill="#f8f7f2" ${A.st(2)}/></g><path d="M-14,-170 C-24,-168 -30,-178 -36,-190 C-44,-202 -56,-198 -56,-180 C-56,-158 -44,-140 -42,-122 C-40,-106 -44,-96 -50,-84 C-62,-66 -72,-46 -68,-24 C-62,-2 -32,14 0,14 C32,14 62,-2 68,-24 C72,-46 62,-66 50,-84 C44,-96 40,-106 42,-122 C44,-138 54,-150 52,-160 C48,-172 40,-172 34,-164 C28,-158 22,-166 14,-170Z" fill="none" ${ST2}/>
      <rect x="-13" y="${NB}" width="26" height="${NT - NB + 6}" fill="#e0a95e" ${A.st(2)}/>
      <rect x="-11.5" y="${NB + 1.5}" width="23" height="${NT - NB + 3}" fill="#4a2f24"/>${frets}${dots}
      <path d="M-12,${NB} C-12,${NB - 10} -18,${NB - 30} -18,${NB - 52} C-18,${NB - 70} -12,${NB - 82} 0,${NB - 82} C12,${NB - 80} 20,${NB - 66} 17,${NB - 44} C15,${NB - 24} 12,${NB - 10} 12,${NB}Z" fill="#e0a95e" ${A.st(2)}/>${pegs}
      <rect x="-12" y="${NB - 2}" width="24" height="4" fill="#f4efe0" ${A.st(1.2)}/>
      ${pick(-130)}${pick(-104)}${pick(-78)}
      <rect x="-17" y="-48" width="34" height="26" rx="2" fill="#cfd3da" ${A.st(1.8)}/>
      ${[-10, -5, 0, 5, 10].map((px) => `<rect x="${px - 1.2}" y="-44" width="2.4" height="18" fill="#8b909a"/>`).join('')}
      <path d="M14,-30 L40,-70" stroke="#cfd3da" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="-70" r="3" fill="#f4efe0" ${A.st(1.2)}/>
      <circle cx="36" cy="-48" r="6" fill="#efe6c8" ${A.st(1.8)}/><circle cx="30" cy="-30" r="6" fill="#efe6c8" ${A.st(1.8)}/>
      <ellipse cx="46" cy="-4" rx="11" ry="5" transform="rotate(-28 46 -4)" fill="#cfd3da" ${A.st(1.8)}/>
      <circle cx="-48" cy="-182" r="2.8" fill="#cfd3da"/><circle cx="0" cy="8" r="3" fill="#cfd3da"/>
      ${strings}
    </g>`;
  }

  // ---------- A：第二個視角：吉他（在架子上）+ 木椅上的吉他譜 + 菱形紋地毯 ----------
  function guitarView() {
    const pulse = ui.seen.guitar ? '' : `<rect class="pulse" x="636" y="360" width="240" height="140" rx="10" fill="none" stroke="#ffd23f" stroke-width="7"/>`;
    const sheets = [[-8, 0, '#fffdf3'], [4, -4, '#fffef8'], [-2, -8, '#fff'], [8, -12, '#fffdf3']].map(([rot, dy, c], i) => `<g transform="rotate(${rot} 760 ${468 + dy})"><rect x="690" y="${436 + dy}" width="140" height="64" fill="${c}" ${ST2}/>${[0, 1, 2, 3, 4, 5].map((k) => `<line x1="698" y1="${446 + dy + k * 8}" x2="822" y2="${446 + dy + k * 8}" stroke="#1b1b1f" stroke-width="1" opacity=".55"/>`).join('')}</g>`).join('');
    return `${SVG_OPEN('吉他、椅子與吉他譜')}${DEFS}
      <defs><pattern id="diam" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#eadfc4"/><path d="M22,2 L42,22 L22,42 L2,22Z" fill="none" stroke="#1b1b1f" stroke-width="4"/><path d="M22,14 L30,22 L22,30 L14,22Z" fill="#1b1b1f"/></pattern></defs>
      <rect x="-900" width="2800" height="700" fill="#efe9dc"/><rect x="-900" width="2800" height="700" fill="url(#dots)"/>
      <rect x="-900" y="520" width="2800" height="190" fill="#e6dcc0" ${ST}/>
      ${[120, 300, 480, 660, 840].map((x) => `<line x1="${x}" y1="520" x2="${x - 90}" y2="700" stroke="${INK}" stroke-width="2.5" opacity=".25"/>`).join('')}
      <line x1="-10" y1="610" x2="1010" y2="610" stroke="${INK}" stroke-width="2.5" opacity=".25"/>
      <rect x="-900" y="502" width="2800" height="18" fill="#fbf8f1" ${ST}/>
      <polygon points="150,560 520,560 590,692 70,692" fill="url(#diam)" ${ST}/>
      <path d="M150,560 L70,692 M520,560 L590,692" stroke="#1b1b1f" stroke-width="3" stroke-dasharray="3 6" opacity=".4"/>
      <g stroke="${INK}" stroke-width="7" stroke-linecap="round"><path d="M335,560 L270,640 M335,560 L400,640 M335,560 L335,600"/></g>
      <g stroke="#3a3f50" stroke-width="3.5" stroke-linecap="round" opacity=".9"><path d="M335,560 L270,640 M335,560 L400,640"/></g>
      <g class="${ui.resoUntil > Date.now() ? 'gtr-reso' : ''}">${tele(335, 566, 1.22)}</g>
      <g>
        <rect x="660" y="236" width="210" height="130" fill="#d9a65e" ${ST}/>
        ${[0, 1, 2].map((i) => `<line x1="664" y1="${278 + i * 32}" x2="866" y2="${278 + i * 32}" stroke="#8a5a28" stroke-width="3" opacity=".6"/>`).join('')}
        <rect x="650" y="228" width="230" height="16" rx="5" fill="#e0b26c" ${ST2}/>
        <rect x="660" y="476" width="214" height="30" rx="6" fill="#d9a65e" ${ST}/>
        <polygon points="650,462 886,462 876,486 662,486" fill="#e8bd78" ${ST}/>
        <rect x="660" y="500" width="22" height="144" fill="#d9a65e" ${ST}/><rect x="852" y="500" width="22" height="144" fill="#d9a65e" ${ST}/>
        <rect x="660" y="364" width="22" height="104" fill="#d9a65e" ${ST}/><rect x="852" y="364" width="22" height="104" fill="#d9a65e" ${ST}/>
      </g>
      <g class="hot" data-hot="guitar"><g class="sheet-pile">${sheets}</g>${pulse}</g>
      <g class="hot" data-hot="play"><rect x="230" y="60" width="210" height="500" style="pointer-events:all;fill:transparent"/>${ui.seen.play ? '' : `<rect class="pulse" x="236" y="66" width="198" height="488" rx="40" fill="none" stroke="#ffd23f" stroke-width="6"/>`}</g>
      ${A.raccoony(570, 696, 0.62, true)}
      ${navBtn('left')}
    </svg>`;
  }

  function roomA() { return ui.view === 1 ? guitarView() : deskView(); }


  // ---------- B：Slothy 的衣櫃 + 床（底下有三個行李箱）+ 房門 ----------
  // 三個行李箱都是咖啡色（用位置區分：左 plane、中 secret、右 love）
  const BROWN = { fill: '#a8743f', ink: '#6e4520' };
  const CASE_LOOK = { plane: BROWN, secret: BROWN, love: BROWN };

  function suitcaseFace(id, x, y, w, h, glow = false, open = false) {
    const L = CASE_LOOK[id];
    const lx = x + w / 2, ly = y + h * 0.5;
    const lock = `<g class="${glow ? 'lock-glow' : ''}"><rect x="${lx - 15}" y="${ly - 11}" width="30" height="22" rx="5" fill="${glow ? '#fff3a0' : '#c9ccd2'}" ${A.st(2)}/><circle cx="${lx}" cy="${ly}" r="5" fill="${INK}"/><circle cx="${lx - 2}" cy="${ly}" r="1.3" fill="#fff"/><circle cx="${lx + 2}" cy="${ly}" r="1.3" fill="#fff"/>
      ${glow ? [16, 26, 36].map((r, i) => `<circle class="wave" cx="${lx}" cy="${ly}" r="${r}" fill="none" stroke="#ffd23f" stroke-width="3" style="animation-delay:${i * 0.25}s"/>`).join('') : ''}</g>`;
    if (open) return `<path d="M${x + 4},${y + 4} L${x + 16},${y - 30} L${x + w - 16},${y - 30} L${x + w - 4},${y + 4}Z" fill="${L.ink}" ${ST}/>
      <rect x="${x + 18}" y="${y - 14}" width="34" height="22" fill="#fffdf3" ${A.st(1.6)} transform="rotate(-10 ${x + 35} ${y - 3})"/><rect x="${x + 48}" y="${y - 18}" width="34" height="22" fill="#fff" ${A.st(1.6)} transform="rotate(8 ${x + 65} ${y - 7})"/>
      <path d="M${x + 60},${y - 6} c-4,-4 -9,1 0,6 c9,-5 4,-10 0,-6z" fill="#e5382f"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${L.fill}" ${ST}/>${lock}`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${L.fill}" ${ST}/>
      <rect x="${x + 10}" y="${y + 8}" width="${w - 20}" height="9" rx="4" fill="#fff" opacity=".22"/>
      <path d="M${x + w * 0.3},${y} v-12 h${w * 0.4} v12" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M${x + 14},${y + h * 0.42} h${w - 28} M${x + 14},${y + h * 0.62} h${w - 28}" stroke="${L.ink}" stroke-width="3" opacity=".45"/>
      ${lock}`;
  }

  function roomB() {
    const drawers = [1, 2, 3, 4, 5].map((n) => {
      const y = 240 + (n - 1) * 64;
      const d = data.drawers[n];
      const open = d.open;
      const key = open && data.hasKey && /鑰匙|key/i.test(d.contents || '');
      return `<g class="hot" data-hot="drawer-${n}">
        <rect x="262" y="${y}" width="326" height="56" rx="4" fill="${open ? '#f3d9aa' : '#e8b568'}" ${ST}/>
        ${open
          ? `<rect x="268" y="${y + 5}" width="314" height="14" fill="#4a2f18" opacity=".85"/><text x="${key ? 380 : 400}" y="${y + 46}" text-anchor="middle" font-size="26">${key ? '🔑' : '📂'}</text>`
          : `<path d="M300,${y + 30} h60 M430,${y + 42} h90" stroke="#b9824a" stroke-width="2.5" opacity=".6"/><rect x="380" y="${y + 7}" width="106" height="7" rx="3" fill="#a8693a"/>`}
        <rect x="524" y="${y + 16}" width="50" height="24" rx="5" fill="#3b3f4f" ${ST2}/>
        ${[0, 1, 2, 3].map((i) => `<circle cx="${535 + i * 10}" cy="${y + 28}" r="3.2" fill="${open ? '#5ad17a' : '#ff5a5f'}"/>`).join('')}
        <text x="278" y="${y + 36}" font-size="17" fill="#7a4b22" ${FONT}>${n}</text>
      </g>`;
    }).join('');
    const pulse = (id, x, y, w, h) => (ui.seen[id] ? '' : `<rect class="pulse" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="#ff5a5f" stroke-width="5"/>`);
    const key = data.hasKey;
    const wardrobe = `<g>
      <ellipse cx="425" cy="566" rx="210" ry="12" fill="rgba(0,0,0,.16)"/>
      <rect x="250" y="230" width="350" height="330" fill="#d79a50" ${ST}/>
      <polygon points="230,230 620,230 592,168 258,168" fill="#b98349" ${ST}/>
      <g><rect x="264" y="178" width="22" height="40" rx="6" fill="#cfe86a" ${ST2}/><rect x="270" y="166" width="10" height="14" fill="${INK}"/><rect x="262" y="160" width="26" height="10" rx="3" fill="${INK}"/>
        <rect x="376" y="148" width="44" height="68" rx="12" fill="#f4f4f1" ${ST2}/><rect x="372" y="142" width="52" height="10" rx="5" fill="#c9ccd2" ${ST2}/>
        <rect x="516" y="170" width="24" height="46" rx="6" fill="#a8abb0" ${ST2}/><rect x="514" y="162" width="28" height="10" rx="3" fill="#8b8e93" ${ST2}/>
        <rect x="556" y="158" width="44" height="58" fill="#c73a34" ${ST2}/><rect x="564" y="170" width="28" height="14" fill="#ffd23f" opacity=".9"/></g>
      <g class="hot" data-hot="paper1"><g transform="rotate(-6 330 206)"><rect x="296" y="186" width="68" height="38" fill="#fff" ${ST2}/><path d="M300,196 h60 M300,204 h60 M300,212 h60" stroke="#8fb3e8" stroke-width="1.5"/><path d="M304,193 h46 M304,201 h30 M304,209 h40" stroke="${INK}" stroke-width="2" opacity=".75"/></g>${pulse('paper1', 286, 180, 88, 52)}</g>
      <g class="hot" data-hot="paper2"><g transform="rotate(5 462 206)"><rect x="430" y="188" width="62" height="36" fill="#cfe6ff" ${ST2}/>${[0, 1, 2, 3, 4].map((i) => `<rect x="440" y="${192 + i * 6}" width="42" height="5" fill="none" stroke="${INK}" stroke-width="1.4"/>`).join('')}</g>${pulse('paper2', 420, 180, 84, 52)}</g>
      ${drawers}</g>`;

    // 床：木頭床頭板、灰色床單、藍色棉被、床底三個行李箱
    const cases = ['plane', 'secret', 'love'].map((id, i) => {
      const x = 372 + i * 118, c = data.cases[id];
      return `<g class="hot" data-hot="case-${id}">${suitcaseFace(id, x, 482, 104, 76, ui.glowCase === id || (ui.armed && ui.armed.id === id), c.open && id === 'love')}${c.open ? `<circle cx="${x + 94}" cy="490" r="9" fill="#5ad17a" ${A.st(2)}/>` : ''}${ui.seen['case-' + id] ? '' : `<rect class="pulse" x="${x - 6}" y="470" width="116" height="94" rx="14" fill="none" stroke="#ff5a5f" stroke-width="5"/>`}</g>`;
    }).join('');
    const bed = `<g>
      <ellipse cx="530" cy="560" rx="220" ry="12" fill="rgba(0,0,0,.18)"/>
      <rect x="348" y="454" width="14" height="106" fill="#2b2d35" ${ST2}/><rect x="710" y="454" width="14" height="106" fill="#2b2d35" ${ST2}/>
      ${cases}
      <rect x="326" y="352" width="22" height="208" rx="3" fill="#d8a24f" ${ST}/><rect x="326" y="352" width="22" height="26" rx="3" fill="#e6b868" ${ST2}/>
      <rect x="346" y="440" width="380" height="18" rx="4" fill="#2b2d35" ${ST2}/>
      <rect x="346" y="400" width="380" height="44" rx="10" fill="#cfd4dc" ${ST}/>
      <ellipse cx="404" cy="392" rx="52" ry="20" fill="#c4c7cd" ${ST2}/>
      <path d="M560,402 C560,368 590,350 620,360 C640,340 676,346 690,366 C714,368 726,388 722,404Z" fill="#a9c8f0" ${ST}/>
      <path d="M582,372 q14,-8 28,0 M624,364 q16,-10 30,0 M660,376 q14,-8 26,2" fill="none" stroke="#7fa6d8" stroke-width="3" stroke-linecap="round"/>
      <g class="hot" data-hot="chart">
        <path d="M630,236 L598,256 M630,236 L662,256" stroke="${INK}" stroke-width="2" fill="none"/><circle cx="630" cy="235" r="3.5" fill="#d9b44a" ${A.st(1.5)}/>
        <rect x="566" y="254" width="128" height="86" rx="3" fill="#8a5a2b" ${ST2}/><rect x="574" y="262" width="112" height="70" fill="#fffdf3" ${A.st(1.5)}/>
        ${[0, 1, 2, 3].map((i) => `<g transform="translate(${582 + i * 26},${i % 2 ? 300 : 272})"><rect width="16" height="20" fill="none" stroke="${INK}" stroke-width="1.1"/><line x1="0" y1="7" x2="16" y2="7" stroke="${INK}" stroke-width=".7"/><line x1="0" y1="14" x2="16" y2="14" stroke="${INK}" stroke-width=".7"/><circle cx="${4 + (i * 5) % 9}" cy="${4 + (i * 7) % 12}" r="2.2" fill="${INK}"/></g>`).join('')}
        ${pulse('chart', 560, 248, 140, 98)}</g>
    </g>`;

    // 房門（縮小）：門牌、門把
    const door = `<g>
      <rect x="700" y="40" width="260" height="520" fill="#d9d4c8" ${ST}/><rect x="712" y="52" width="236" height="508" fill="#f7f5f0" ${ST}/>
      <rect x="736" y="80" width="188" height="180" fill="none" stroke="#cfcac0" stroke-width="4"/><rect x="736" y="300" width="188" height="230" fill="none" stroke="#cfcac0" stroke-width="4"/>
      <rect x="940" y="110" width="14" height="40" fill="#8b8e93" ${ST2}/><rect x="940" y="440" width="14" height="40" fill="#8b8e93" ${ST2}/>
      <g><path d="M830,98 L790,128 M830,98 L870,128" stroke="${INK}" stroke-width="3" fill="none"/><circle cx="830" cy="96" r="5" fill="#d9b44a" ${ST2}/>
        <g transform="rotate(-2 830 170)"><rect x="745" y="124" width="170" height="104" rx="6" fill="#fff" stroke="#c5262c" stroke-width="5"/><rect x="745" y="124" width="170" height="26" rx="4" fill="#c5262c"/>
        <text x="830" y="144" text-anchor="middle" font-size="17" fill="#fff" ${FONT}>${tr('⚠ 注意', '⚠ NOTICE')}</text>
        <text x="830" y="176" text-anchor="middle" font-size="18" fill="${INK}" ${FONT}>${tr('出門後就不能', 'Once you leave,')}</text><text x="830" y="198" text-anchor="middle" font-size="18" fill="${INK}" ${FONT}>${tr('再回來了喔！', 'no coming back!')}</text><text x="830" y="220" text-anchor="middle" font-size="19" fill="#c5262c" ${FONT}>${tr('護照記得拿', 'Take your passport')}</text></g></g>
      <g class="hot" data-hot="knob"><circle cx="738" cy="330" r="17" fill="#d9b44a" ${ST2}/><circle cx="738" cy="330" r="11" fill="#f2cf63" ${ST2}/><circle cx="734" cy="326" r="3" fill="#fff" opacity=".8"/>
        ${key && data.hasPassport ? `<circle class="pulse" cx="738" cy="330" r="30" fill="none" stroke="#ffd23f" stroke-width="6"/>` : ''}${hit(738, 330, 40)}</g>
    </g>`;
    return `${SVG_OPEN('Slothy 的衣櫃、床與房門')}${DEFS}
      <rect x="-900" width="2800" height="700" fill="#efe9dc"/><rect x="-900" width="2800" height="700" fill="url(#dots)"/>
      <rect x="-900" y="560" width="2800" height="150" fill="#d8c7a3" ${ST}/>
      ${[150, 330, 510, 690, 870].map((x) => `<line x1="${x}" y1="560" x2="${x - 70}" y2="700" stroke="${INK}" stroke-width="2.5" opacity=".35"/>`).join('')}
      <line x1="-10" y1="626" x2="1010" y2="626" stroke="${INK}" stroke-width="2.5" opacity=".35"/>
      <rect x="-900" y="542" width="2800" height="18" fill="#fbf8f1" ${ST}/>
      ${ui.view === 1
        ? `<g transform="translate(-289,-280) scale(1.5)">${bed}</g>${A.slothy(110, 694, 0.95)}${navBtn('left')}`
        : `${wardrobe}${door}${A.slothy(150, 606, 1.15)}${navBtn('right')}`}
      ${key ? `<g><circle cx="60" cy="52" r="30" fill="#ffd23f" ${ST}/><text x="60" y="64" text-anchor="middle" font-size="34">🔑</text></g>` : ''}
      ${data.hasPassport ? `<g><circle cx="130" cy="52" r="30" fill="#7fb4ff" ${ST}/><text x="130" y="64" text-anchor="middle" font-size="34">🛂</text></g>` : ''}
    </svg>`;
  }
  const st34 = () => A.st(3);


  // ---------- 吉他譜（六線譜）與和弦表 ----------
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  function tabSvg(sh) {
    const LX = 40, TOP = 74, GAP = 24, BW = 160;
    const lines = Array.from({ length: 6 }, (_, i) => `<line x1="${LX}" y1="${TOP + i * GAP}" x2="${LX + BW * 4}" y2="${TOP + i * GAP}" stroke="#1b1b1f" stroke-width="1.6"/>`).join('');
    const bars = Array.from({ length: 5 }, (_, i) => `<line x1="${LX + i * BW}" y1="${TOP}" x2="${LX + i * BW}" y2="${TOP + 5 * GAP}" stroke="#1b1b1f" stroke-width="${i === 4 ? 3 : 1.8}"/>`).join('');
    const nums = sh.bars.map((fr, b) => [0.3, 0.72].map((pos) => fr.map((f, si) => (f === null ? '' : `<rect x="${LX + b * BW + BW * pos - 9}" y="${TOP + (5 - si) * GAP - 10}" width="18" height="20" fill="#fffdf3"/><text x="${LX + b * BW + BW * pos}" y="${TOP + (5 - si) * GAP + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#1b1b1f" font-family="'Courier New',monospace">${f}</text>`)).join('')).join('')).join('');
    return `<svg viewBox="0 0 720 240" class="tab-svg"><text x="360" y="30" text-anchor="middle" font-size="26" font-weight="700" fill="#1b1b1f" ${FONT}>${tr(`《${esc(sh.title)}》`, `“${esc(sh.title)}”`)}</text>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<text x="${LX - 12}" y="${TOP + i * GAP + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#c5262c" font-family="'Helvetica Neue',Arial,sans-serif">${i + 1}</text>`).join('')}
      ${lines}${bars}${nums}</svg>`;
  }
  function chordBox(x, y, name, fr) {
    const SX = 15, FY = 20, W = SX * 5, H = FY * 4;
    let o = `<text x="${x + W / 2}" y="${y - 50}" text-anchor="middle" font-size="26" font-weight="700" fill="#1b1b1f" font-family="'Helvetica Neue',Arial,sans-serif">${name}</text>`;
    for (let i = 0; i < 6; i++) o += `<text x="${x + i * SX}" y="${y - 25}" text-anchor="middle" font-size="12" font-weight="700" fill="#c5262c" font-family="'Helvetica Neue',Arial,sans-serif">${6 - i}</text>`;
    o += `<line x1="${x}" y1="${y}" x2="${x + W}" y2="${y}" stroke="#1b1b1f" stroke-width="5"/>`;
    for (let i = 1; i <= 4; i++) o += `<line x1="${x}" y1="${y + i * FY}" x2="${x + W}" y2="${y + i * FY}" stroke="#1b1b1f" stroke-width="1.6"/>`;
    for (let i = 0; i < 6; i++) o += `<line x1="${x + i * SX}" y1="${y}" x2="${x + i * SX}" y2="${y + H}" stroke="#1b1b1f" stroke-width="1.6"/>`;
    fr.forEach((f, i) => {
      const cx = x + i * SX;
      if (f === null) o += `<text x="${cx}" y="${y - 7}" text-anchor="middle" font-size="14" fill="#1b1b1f" font-family="sans-serif">×</text>`;
      else if (f === 0) o += `<circle cx="${cx}" cy="${y - 11}" r="4.5" fill="none" stroke="#1b1b1f" stroke-width="1.8"/>`;
      else o += `<circle cx="${cx}" cy="${y + (f - 0.5) * FY}" r="6.4" fill="#1b1b1f"/>`;
    });
    return o;
  }
  function chartSvg() {
    const per = 4, bw = 150;
    return `<svg viewBox="0 0 720 390" class="tab-svg"><text x="360" y="30" text-anchor="middle" font-size="26" font-weight="700" fill="#1b1b1f" ${FONT}>${tr('和弦對照表', 'Chord chart')}</text>
      ${data.chart.map((c, i) => chordBox(70 + (i % per) * 170 + (i >= per ? 85 : 0), 124 + Math.floor(i / per) * 170, c.name, c.frets)).join('')}</svg>`;
  }
  function guitarHtml() {
    const tabs = data.sheets.map((s) => [s.id, tr(`《${s.title}》`, `“${s.title}”`)]);
    const cur = data.sheets.find((x) => x.id === ui.gt) || data.sheets[0];
    const body = tabSvg(cur);
    return `<div class="modal-card s1-guitar"><button class="x" data-act="close">✕</button>
      <div class="s1-tabs">${tabs.map(([id, t]) => `<button class="${id === cur.id ? 'on' : ''}" data-act="gt" data-id="${id}">${esc(t)}</button>`).join('')}</div>
      <div class="s1-sheet">${body}</div></div>`;
  }

  // 彈吉他：四個小節各選一個和弦（A~G），按「彈奏」
  function playHtml() {
    const slots = ui.pw.map((d, i) => `<div class="wheel"><small>${tr(`第 ${i + 1} 小節`, `Bar ${i + 1}`)}</small><button data-act="pup" data-i="${i}">▲</button><div class="digit">${LETTERS[d]}</div><button data-act="pdown" data-i="${i}">▼</button></div>`).join('');
    return `<div class="modal-card s1-play${ui.strumming ? ' strum' : ''}"><button class="x" data-act="close">✕</button>
      <h2>${tr('彈吉他', 'Play the guitar')}</h2><p class="hint-s">${tr('選四個和弦，照順序彈一段。', 'Pick four chords and play them in order.')}</p>
      <div class="wheels">${slots}</div><div class="row center"><button class="primary big" data-act="strum" ${ui.strumming ? 'disabled' : ''}>${tr('彈奏 ▶', 'Play ▶')}</button></div></div>`;
  }

  // ---------- 行李箱（字母鎖）與裡面的東西 ----------
  const CASE_NAME = () => ({ plane: tr('左邊的行李箱', 'Left suitcase'), secret: tr('中間的行李箱', 'Middle suitcase'), love: tr('右邊的行李箱', 'Right suitcase') });
  function faceSvg(id, glow = false) {
    const x = 20, y = 24, w = 170, h = 120;
    return `<svg viewBox="0 0 210 170" class="s1-face">${suitcaseFace(id, x, y, w, h, glow)}</svg>`;
  }
  function photo(kind) {
    const inner = kind === 'hug'
      ? `<rect x="0" y="0" width="220" height="150" fill="#cfe3f5"/><rect x="0" y="100" width="220" height="50" fill="#d9dce2"/><rect x="14" y="14" width="192" height="52" fill="#a9c9e8" ${A.st(2)}/>
         <rect x="52" y="64" width="34" height="46" rx="8" fill="#e5382f" ${A.st(2)}/><rect x="134" y="64" width="34" height="46" rx="8" fill="#3a8cff" ${A.st(2)}/>
         ${A.raccoony(86, 136, 0.52)}${A.slothy(134, 136, 0.52, true)}
         <text x="110" y="40" text-anchor="middle" font-size="14" fill="#fff" ${FONT}>✈ ARRIVALS</text><text x="110" y="92" text-anchor="middle" font-size="20" fill="#e5382f">♥</text>`
      : `<rect x="0" y="0" width="220" height="150" fill="#ffe9d6"/>${A.slothy(78, 150, 0.8)}${A.raccoony(150, 150, 0.72, true)}
         <text x="116" y="42" text-anchor="middle" font-size="26" fill="#e5382f">♥</text><text x="150" y="26" text-anchor="middle" font-size="16" fill="#e5382f" ${FONT}>mwah!</text>`;
    return `<div class="s1-photo"><svg viewBox="0 0 220 150">${inner}</svg></div>`;
  }
  function passportHtml() {
    return `<div class="passport"><div class="pp-top">${tr('PASSPORT · 護照', 'PASSPORT')}</div><div class="pp-body"><div class="pp-pic">${A.portrait('A', 74)}</div>
      <div class="pp-info"><small>NAME</small><b>RACCOONY</b><small>COUNTRY</small><b>TAIWAN</b><small>No.</small><b>3 1 4 1 5 9 2 6</b></div></div></div>`;
  }
  function caseHtml(id) {
    const c = data.cases[id];
    const nm = CASE_NAME()[id];
    if (!c.open) {
      const armed = ui.armed && ui.armed.id === id;
      const left = armed ? Math.max(0, Math.ceil((ui.armed.until - Date.now()) / 1000)) : 0;
      const wheels = ui.cw[id].map((d, i) => `<div class="wheel"><button data-act="cup" data-i="${i}" ${armed ? 'disabled' : ''}>▲</button><div class="digit">${LETTERS[d]}</div><button data-act="cdown" data-i="${i}" ${armed ? 'disabled' : ''}>▼</button></div>`).join('');
      return `<div class="modal-card s1-case${ui.shake ? ' shake' : ''}${armed ? ' armed' : ''}"><button class="x" data-act="close">✕</button>
        <h2>${nm}</h2>${faceSvg(id, armed)}<p class="hint-s">${tr('4 個字母的鎖（A ~ G）', 'A 4-letter lock (A–G)')}</p>
        <div class="wheels">${wheels}</div>
        <div class="row center">${armed ? `<div class="s1-count">${left > 0 ? `${tr('鎖在嗡嗡震動……', 'The lock is humming…')}<b>${left}</b>` : '……'}</div>` : `<button class="primary big" data-act="copen">${tr('準備', 'Ready')}</button>`}</div></div>`;
    }
    const k = c.contents;
    let inner = '';
    if (k.kind === 'passport') inner = `<p>${tr('找到了！護照已放進收藏文件。', 'Found it! The passport is now in your documents.')}</p>${passportHtml()}`;
    else if (k.kind === 'secret') inner = `<div class="s1-banner">${tr('哇，恭喜你看到有趣的東西，但這不是你要找的。', 'Ooh, something fun! But it’s not what you’re looking for.')}</div><div class="s1-things">${photo('hug')}${photo('kiss')}</div>`;
    else inner = `${c.lock ? `<div class="s1-lockshow"><span>${tr('鎖停在：', 'The lock reads:')}</span>${[...c.lock].map((ch) => `<b>${ch}</b>`).join('')}</div>` : ''}<div class="s1-letters">${k.letters.map((t) => `<div class="paper lined letter">${esc(t).replace(/\n/g, '<br>')}</div>`).join('')}</div>`;
    return `<div class="modal-card s1-case open"><button class="x" data-act="close">✕</button><h2>${nm}</h2>${inner}</div>`;
  }

  // ---------- 1A2B 猜字紀錄（一天一欄）----------
  function logDay(d) {
    return `<div class="log-day"><h5>${esc(d.date)}</h5>${d.rows.map((r) => `<p><b>${esc(r.word)}</b><span>${esc(r.fb)}</span></p>`).join('')}${d.answer ? `<p class="log-ans">answer: <b>${esc(d.answer)}</b></p>` : ''}</div>`;
  }

  // a~z 筆記：點一下劃掉、再點一下恢復；兩人的紙同步
  function alphabet() {
    const st = new Set(data.struck || []);
    return `<div class="log-abc">${'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => `<button class="${st.has(c) ? 'x-out' : ''}" data-act="strike" data-l="${c}">${c}</button>`).join('')}</div>`;
  }

  // ---------- 彈出層內容 ----------
  function paperHtml(id) {
    if (id === 'paper3') return `<div class="paper lined log">${logDay(data.deskPaper)}${alphabet()}</div>`;
    if (id === 'note2') return `<div class="paper marker">${data.note2.map(esc).join('<br>')}</div>`;
    const p = data.papers.find((x) => x.id === id);
    if (!p) return '';
    if (p.kind === 'log') return `<div class="paper lined log"><p class="log-note">${esc(p.note)}</p><div class="log-days">${p.days.map(logDay).join('')}</div>${alphabet()}</div>`;
    if (p.kind === 'handwritten') {
      const line = (l) => esc(l).replace(/~(.)~/g, '<s>$1</s>');
      return `<div class="paper lined">${p.lines.map((l) => `<p>${line(l)}</p>`).join('')}</div>`;
    }
    return `<div class="paper map">${p.rows.map((r) => `<div class="map-row"><b>${r.n}</b><span>${esc(r.emoji)} ${esc(r.item)}</span></div>`).join('')}</div>`; // 衣櫃地圖：只有中間的表格
  }

  function blockHtml(b) {
    switch (b.t) {
      case 'h': return `<h4>${esc(b.text)}</h4>`;
      case 'p': return `<p>${esc(b.text)}</p>`;
      case 'todo': return `<div class="n-todo">${b.done ? '☑️' : '⬜'} ${esc(b.text)}</div>`;
      case 'callout': return `<div class="n-callout">${esc(b.icon)} ${esc(b.text)}</div>`;
      case 'table': return `<table class="n-table"><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
      default: return '';
    }
  }

  function pcHtml() {
    if (!data.pcUnlocked) {
      return `<div class="mon"><div class="login"><div class="avatar">🦝</div><div>Raccoony</div>
        ${ui.pwOpen
          ? `<div class="row"><input id="pw" type="password" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="12" placeholder="Password" autocomplete="off"/><button class="primary" data-act="pwsubmit">→</button></div>`
          : `<div class="pw-fake" data-act="pwfocus">${tr('點擊這裡輸入 Password', 'Tap here to enter the password')}</div>`}
        <p class="err">${esc(ui.pwErr)}</p></div></div>`;
    }
    if (!ui.notionOpen) {
      return `<div class="mon"><div class="desktop">
        <div class="icon app" data-act="opennotion"><div class="glyph">📄</div>Notion</div>
        <div class="icon"><div class="glyph">🖼️</div>${tr('照片', 'Photos')}</div>
        <div class="icon"><div class="glyph">🗑️</div>${tr('垃圾桶', 'Trash')}</div></div></div>`;
    }
    const pages = data.notion.pages;
    const pg = pages[ui.page] || pages[0];
    return `<div class="mon"><div class="notion">
        <div class="n-side">${pages.map((p, i) => `<div class="n-item${i === ui.page ? ' on' : ''}" data-act="page" data-i="${i}">${p.icon} ${esc(p.title)}</div>`).join('')}</div>
        <div class="n-main"><div class="n-icon">${pg.icon}</div><h2>${esc(pg.title)}</h2>${pg.blocks.map(blockHtml).join('')}</div></div></div>
        <div style="margin-top:10px"><button class="small" data-act="closenotion">${tr('← 回到桌面', '← Back to desktop')}</button></div>`;
  }

  function drawerHtml(n) {
    const wheels = ui.dw.map((d, i) => `<div class="wheel"><button data-act="dup" data-i="${i}">▲</button><div class="digit">${d}</div><button data-act="ddown" data-i="${i}">▼</button></div>`).join('');
    return `<h2>${tr(`第 ${n} 格抽屜`, `Drawer ${n}`)}</h2><p>${tr('抽屜上有一個 4 位數字的滾輪鎖。', 'The drawer has a 4-digit wheel lock.')}</p>
      <div class="wheels${ui.dShake ? ' shake' : ''}">${wheels}</div>
      <div class="row center"><button class="primary big" data-act="dsubmit">${tr('打開', 'Open')}</button></div>
      <p class="err">${esc(ui.dErr)}</p>`;
  }

  function modalHtml() {
    const m = ui.modal;
    if (m.type === 'guitar') return guitarHtml();
    if (m.type === 'play') return playHtml();
    if (m.type === 'chart') return `<div class="modal-card s1-guitar"><button class="x" data-act="close">✕</button><div class="s1-sheet">${chartSvg()}</div></div>`;
    if (m.type === 'case') return caseHtml(m.id);
    const inner = m.type === 'paper' ? paperHtml(m.id) : m.type === 'drawer' ? drawerHtml(m.n) : pcHtml();
    return `<div class="modal-card"><button class="x" data-act="close">✕</button>${inner}</div>`;
  }

  function renderModal() {
    const el = $modal();
    if (!ui.modal) { el.hidden = true; el.innerHTML = ''; return; }
    const val = (id) => document.getElementById(id)?.value || '';
    const keep = { dcode: val('dcode'), pw: val('pw') };
    const focusId = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
    el.innerHTML = modalHtml();
    el.hidden = false;
    for (const id of Object.keys(keep)) { const i = document.getElementById(id); if (i) i.value = keep[id]; }
    if (focusId) document.getElementById(focusId)?.focus();
  }

  function closeModal() { ui.modal = null; renderModal(); }

  function onModalClick(e) {
    if (e.target === $modal()) return closeModal();
    const t = e.target.closest('[data-act]');
    if (!t) return;
    switch (t.dataset.act) {
      case 'close': return closeModal();
      case 'pwfocus': ui.pwOpen = true; renderModal(); document.getElementById('pw')?.focus(); return;
      case 'pwsubmit': return submitPw();
      case 'opennotion': ui.notionOpen = true; ui.page = 0; return renderModal();
      case 'closenotion': ui.notionOpen = false; return renderModal();
      case 'page': ui.page = Number(t.dataset.i); return renderModal();
      case 'dsubmit': return submitDrawer();
      case 'dup': { const i = Number(t.dataset.i); ui.dw[i] = (ui.dw[i] + 1) % 10; return renderModal(); }
      case 'ddown': { const i = Number(t.dataset.i); ui.dw[i] = (ui.dw[i] + 9) % 10; return renderModal(); }
      case 'gt': ui.gt = t.dataset.id; return renderModal();
      case 'cup': { const a = ui.cw[ui.modal.id], i = Number(t.dataset.i); a[i] = (a[i] + 1) % 7; return renderModal(); }
      case 'cdown': { const a = ui.cw[ui.modal.id], i = Number(t.dataset.i); a[i] = (a[i] + 6) % 7; return renderModal(); }
      case 'copen': return submitCase();
      case 'pup': { const i = Number(t.dataset.i); ui.pw[i] = (ui.pw[i] + 1) % 7; return renderModal(); }
      case 'pdown': { const i = Number(t.dataset.i); ui.pw[i] = (ui.pw[i] + 6) % 7; return renderModal(); }
      case 'strum': return strum();
      case 'strike': ctx.send({ type: 'strike', letter: t.dataset.l }); return;
    }
  }
  function onModalKey(e) {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'pw') { e.preventDefault(); submitPw(); }
    if (e.target.id === 'dcode') { e.preventDefault(); submitDrawer(); }
  }
  async function submitPw() {
    const value = document.getElementById('pw')?.value || '';
    if (!value.trim()) return;
    const res = await ctx.send({ type: 'pc_password', value });
    if (res && res.correct === false) {
      ui.pwErr = tr('密碼錯誤', 'Wrong password');
      renderModal();
      const i = document.getElementById('pw'); if (i) { i.value = ''; i.focus(); }
    } else ui.pwErr = '';
  }
  async function strum() {
    if (ui.strumming) return;
    const chords = ui.pw.map((d) => LETTERS[d]).join('');
    ui.strumming = true; renderModal();
    if (window.Music && Music.strum) Music.strum(chords);
    await new Promise((r) => setTimeout(r, 2000)); // 先把四個和弦彈完，再看有沒有反應
    ui.strumming = false;
    await ctx.send({ type: 'strum', chords });
    if (ui.modal && ui.modal.type === 'play') renderModal();
  }
  async function submitCase() {
    const id = ui.modal.id;
    if (ui.armed) return;
    await ctx.send({ type: 'case_ready', case: id, code: ui.cw[id].map((d) => LETTERS[d]).join('') });
  }
  // 準備後的倒數（畫面用）；10 秒＋寬限後還沒結果，就通知伺服器「沒等到聲音」
  function startArm(id, n) {
    clearInterval(ui.armTick); clearTimeout(ui.armEnd);
    ui.armed = { id, n, until: Date.now() + 10000 };
    ui.armTick = setInterval(() => { if (ui.modal && ui.modal.type === 'case') renderModal(); }, 250);
    ui.armEnd = setTimeout(() => ctx.send({ type: 'case_timeout', n }), 13500);
    draw();
  }
  function endArm() { clearInterval(ui.armTick); clearTimeout(ui.armEnd); ui.armed = null; }
  async function submitDrawer() {
    const code = ui.dw.join('');
    const n = ui.modal.n;
    const res = await ctx.send({ type: 'drawer_code', drawer: n, code });
    if (res && res.correct === false) {
      ui.dErr = tr('密碼錯誤', 'Wrong code'); ui.dShake = true; renderModal();
      setTimeout(() => { ui.dShake = false; if (ui.modal) renderModal(); }, 450);
    } else { ui.dErr = ''; ui.modal = null; renderModal(); }
  }

  // ---------- 場景內點擊 ----------
  function onStageClick(e) {
    const hot = e.target.closest('[data-hot]');
    if (!hot) return;
    const h = hot.dataset.hot;
    if (h === 'pc') {
      ui.awake = true; ui.pwOpen = false; ui.pwErr = ''; ui.modal = { type: 'pc' };
      draw();
    } else if (h === 'nav-right' || h === 'nav-left') {
      ui.seen.nav = true; ui.view = h === 'nav-right' ? 1 : 0; ui.modal = null; draw();
    } else if (h === 'paper3') {
      ui.seen.paper3 = true; ui.modal = { type: 'paper', id: 'paper3' }; draw();
    } else if (h === 'note2') {
      ui.seen.note2 = true; ui.modal = { type: 'paper', id: 'note2' }; draw();
    } else if (h === 'chart') {
      ui.seen.chart = true; ui.modal = { type: 'chart' }; draw();
    } else if (h === 'play') {
      ui.seen.play = true; ui.modal = { type: 'play' }; draw();
    } else if (h === 'guitar') {
      ui.seen.guitar = true; ui.modal = { type: 'guitar' }; draw();
    } else if (h.startsWith('case-')) {
      const id = h.slice(5); ui.seen[h] = true; ui.modal = { type: 'case', id }; draw();
    } else if (h === 'ticket') {
      ctx.send({ type: 'take_ticket' });
    } else if (h === 'paper1' || h === 'paper2') {
      ui.seen[h] = true;
      ui.modal = { type: 'paper', id: h };
      draw();
    } else if (h.startsWith('drawer-')) {
      const n = Number(h.slice(7));
      if (data.drawers[n].open) return ctx.say(data.drawers[n].contents, { now: true });
      ui.dErr = ''; ui.dw = [0, 0, 0, 0]; ui.modal = { type: 'drawer', n }; renderModal();
    } else if (h === 'knob') {
      ctx.send({ type: 'door_unlock' });
    }
  }

  function draw() {
    if (!box) return;
    box.innerHTML = data.role === 'A' ? roomA() : roomB();
    renderModal();
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.bedroom = {
    render(container, newData, c) {
      box = container; ctx = c; data = newData;
      if (data.role === 'B' && ui.modal?.type === 'drawer' && data.drawers[ui.modal.n].open) ui.modal = null;
      if (data.role === 'B') {
        // Raccoony 彈對了某首歌：那個箱子的鎖亮 2.6 秒；Slothy 不在床那邊時用字幕提醒
        if (data.glow && data.glow.n !== ui.glowN) {
          const firstSeen = ui.glowN === undefined;
          ui.glowN = data.glow.n;
          if (!firstSeen || data.glow.n > 0) {
            ui.glowCase = data.glow.id;
            clearTimeout(ui.glowT); ui.glowT = setTimeout(() => { ui.glowCase = null; draw(); }, 2600);
            if (ui.view !== 1) ctx.say(tr('床那邊好像有什麼東西亮了一下……', 'Something just lit up over by the bed…'), { now: true });
          }
        }
        // 準備：開始倒數；共鳴失敗：鎖喀一聲卡回去
        if (data.armed && (!ui.armed || ui.armed.n !== data.armed.n)) startArm(data.armed.case, data.armed.n);
        if (!data.armed && ui.armed) endArm();
        if (ui.failN === undefined) ui.failN = data.failN;
        else if (data.failN !== ui.failN) {
          ui.failN = data.failN;
          if (window.comicBurst) comicBurst(tr('喀！', 'CLACK!'), 'bad');
          if (window.Music && Music.buzz) Music.buzz();
          if (ui.modal && ui.modal.type === 'case') { ui.shake = true; setTimeout(() => { ui.shake = false; if (ui.modal) renderModal(); }, 450); }
        }
      } else if (data.resonate && data.resonate !== ui.resoN) {
        // Slothy 按了準備：Raccoony 的吉他自己震動 10 秒
        ui.resoN = data.resonate;
        ui.resoUntil = Date.now() + 10000;
        clearTimeout(ui.resoT); ui.resoT = setTimeout(() => { ui.resoUntil = 0; draw(); }, 10000);
        ctx.say(tr('吉他弦自己震了起來，好像在呼應什麼……', 'The guitar strings are vibrating on their own, as if answering something…'), { now: true });
      }
      box.onclick = onStageClick;
      const m = $modal();
      m.onclick = onModalClick;
      m.onkeydown = onModalKey;
      draw();
    },
    unmount() { endArm(); clearTimeout(ui.resoT); clearTimeout(ui.glowT); ui = fresh(); box = null; const m = $modal(); m.hidden = true; m.innerHTML = ''; },
  };

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.modal) closeModal(); });
})();
