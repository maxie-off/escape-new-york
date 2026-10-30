// 過場與結尾（全部是全螢幕動畫，由伺服器同步觸發）：
//   train：列車轟隆隆從眼前呼嘯而過 → 黑幕（場景 2 → 場景 3）
//   run  ：機場走道，浣熊和樹懶的背影全速奔跑 → 黑幕（場景 3 → 結尾）
//   lamp ：開場的黑暗房間，立燈亮起，整個房間變亮（場景 0 → 場景 1）
//   lamp ：開場的黑暗房間，立燈亮起，整個房間變亮（場景 0 → 場景 1）
//   tbc  ：黑幕上浮出 To be continued
(function () {
  const INK = '#0a0b1a';
  const st = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  let raf = 0;

  // ---------------- 列車 ----------------
  function trainSvg() {
    const CAR = 620, N = 6, L = CAR * N;
    let cars = '';
    for (let i = 0; i < N; i++) {
      const x = i * CAR;
      cars += `<g transform="translate(${x},0)">
        <rect x="6" y="0" width="${CAR - 12}" height="250" rx="22" fill="#8b939d" stroke="${INK}" stroke-width="6"/>
        <rect x="6" y="0" width="${CAR - 12}" height="34" rx="18" fill="#6f7782" stroke="${INK}" stroke-width="6"/>
        <rect x="6" y="196" width="${CAR - 12}" height="22" fill="#5d646e"/>
        ${[0, 1, 2, 3, 4, 5].map((k) => k % 3 === 1
          ? `<rect x="${60 + k * 88}" y="48" width="84" height="132" rx="6" fill="#a6adb6" stroke="${INK}" stroke-width="4"/><line x1="${102 + k * 88}" y1="48" x2="${102 + k * 88}" y2="180" stroke="${INK}" stroke-width="4"/>`
          : `<rect x="${70 + k * 88}" y="58" width="70" height="86" rx="8" fill="#ffe9a8" stroke="${INK}" stroke-width="4"/><rect x="${82 + k * 88}" y="76" width="18" height="68" fill="#2a2a35" opacity=".55"/>`).join('')}
        <rect x="0" y="236" width="${CAR}" height="26" fill="#2b2e36" stroke="${INK}" stroke-width="5"/>
        ${[90, 190, 430, 530].map((wx) => `<circle cx="${wx}" cy="270" r="26" fill="#1b1c22" stroke="${INK}" stroke-width="5"/>`).join('')}
        <rect x="${CAR - 8}" y="60" width="16" height="130" fill="#222"/>
      </g>`;
    }
    return { L, svg: cars };
  }

  // 車窗裡的 Raccoony 和 Slothy：露出頭（最後一節車廂的第 3、4 扇窗）
  const WIN = [[246, 'A'], [334, 'B']];
  function riders() {
    const A = window.Art;
    return WIN.map(([wx, who], i) => `<clipPath id="win${i}"><rect x="${wx}" y="58" width="70" height="86" rx="8"/></clipPath>
      <rect x="${wx}" y="58" width="70" height="86" rx="8" fill="#ffe9a8"/>
      <g clip-path="url(#win${i})">${who === 'A' ? A.raccoony(wx + 35, 152, 0.5) : A.slothy(wx + 35, 160, 0.5)}</g>
      <rect x="${wx}" y="58" width="70" height="86" rx="8" fill="none" stroke="${INK}" stroke-width="4"/>`).join('');
  }
  function mountTrain(root) {
    const { L, svg } = trainSvg();
    const lights = [100, 340, 580, 820].map((x) => `<rect x="${x}" y="70" width="120" height="14" rx="3" fill="#fff6cf" stroke="${INK}" stroke-width="2.5"/>`).join('');
    root.innerHTML = `
      <div class="end-shake">
        <svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="列車轟隆隆駛過月台">
          <defs>
            <filter id="mblur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="9 0"/></filter>
            <linearGradient id="glowR" x1="0" x2="1"><stop offset="0" stop-color="#fff6cf" stop-opacity="0"/><stop offset="1" stop-color="#fff6cf" stop-opacity=".95"/></linearGradient>
          </defs>
          <rect x="-900" width="2800" height="700" fill="#2d323b"/>
          <rect x="-900" y="0" width="2800" height="130" fill="#23262d"/>${lights}
          <rect x="-900" y="130" width="2800" height="500" fill="#3a4049"/>
          <rect x="-900" y="440" width="2800" height="90" fill="#15161b"/>
          <line x1="-900" y1="468" x2="1900" y2="468" stroke="#9aa0a8" stroke-width="5"/><line x1="-900" y1="500" x2="1900" y2="500" stroke="#9aa0a8" stroke-width="5"/>
          <g class="end-train"><g transform="translate(0,176)">${svg}${riders()}</g>
            <rect x="${L - 220}" y="176" width="240" height="250" fill="url(#glowR)" opacity=".5"/></g>
          <rect x="-900" y="520" width="2800" height="22" fill="#f2c230" stroke="${INK}" stroke-width="5"/>
          <rect x="-900" y="542" width="2800" height="170" fill="#9a9ea6" stroke="${INK}" stroke-width="5"/>
          ${[230, 770].map((x) => `<rect x="${x - 17}" y="0" width="34" height="548" fill="#566b66" stroke="${INK}" stroke-width="4"/>`).join('')}
        </svg>
      </div>
      <div class="end-black"></div>`;
    const t = root.querySelector('.end-train');
    t.style.setProperty('--tx0', (500 - 330) + 'px'); // 一開始停在月台：兩人的車窗在畫面中間
    t.style.setProperty('--tx1', '1900px');
    if (window.Music && Music.trainPass) Music.trainPass(8);
  }

  // ---------------- 奔跑（背影） ----------------
  function raccoonyBack() {
    const fur = '#6e5d5a', dark = '#4a3d3b', vest = '#27345a';
    const leg = (cls, x) => `<g class="${cls}" data-hx="${x}" data-hy="-48"><rect x="${x - 11}" y="-48" width="22" height="42" rx="11" fill="${fur}" ${st(3)}/><ellipse cx="${x}" cy="-4" rx="16" ry="9" fill="${dark}" ${st(3)}/></g>`;
    const arm = (cls, x, sgn) => `<g class="${cls}" data-hx="${x}" data-hy="-96"><ellipse cx="${x + sgn * 4}" cy="-70" rx="11" ry="28" fill="${fur}" ${st(3)}/></g>`;
    const TAIL = 'M14,-40 C52,-44 64,-84 46,-128 C38,-142 22,-134 26,-118 C34,-92 28,-70 8,-62Z';
    const tail = `<clipPath id="rtailb"><path d="${TAIL}"/></clipPath><path d="${TAIL}" fill="${fur}"/>
      <g clip-path="url(#rtailb)"><path d="M10,-50 C46,-58 56,-92 36,-136" fill="none" stroke="${dark}" stroke-width="40" stroke-dasharray="12 14" stroke-dashoffset="-4"/></g>
      <path d="${TAIL}" fill="none" ${st(3)}/>`;
    return `${tail}${leg('legL', -16)}${leg('legR', 16)}
      <ellipse cx="0" cy="-70" rx="38" ry="44" fill="${vest}" ${st(3.5)}/>
      ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<line x1="${-22 + c * 10 + (r % 2) * 4}" y1="${-96 + r * 12}" x2="${-18 + c * 10 + (r % 2) * 4}" y2="${-96 + r * 12}" stroke="#41527f" stroke-width="2.5" stroke-linecap="round"/>`).join('')).join('')}
      <circle cx="-32" cy="-170" r="14" fill="${fur}" ${st(3)}/><circle cx="32" cy="-170" r="14" fill="${fur}" ${st(3)}/>
      <circle cx="0" cy="-134" r="44" fill="${fur}" ${st(3.5)}/>
      <path d="M-14,-170 q14,-8 28,0 M-18,-156 q18,-8 36,0" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity=".7"/>
      ${window.Art && Art.miniHatBack ? Art.miniHatBack(-178) : ''}`;
  }
  function slothyBack() {
    const body = '#b4bfd0', dark = '#9aa6ba', claw = '#5a6070';
    const leg = (cls, x) => `<g class="${cls}" data-hx="${x}" data-hy="-46"><rect x="${x - 12}" y="-46" width="24" height="40" rx="12" fill="${dark}" ${st(3)}/><ellipse cx="${x}" cy="-4" rx="16" ry="9" fill="${body}" ${st(3)}/><path d="M${x - 8},-1 v5 M${x},-1 v6 M${x + 8},-1 v5" stroke="${claw}" stroke-width="2.5" stroke-linecap="round"/></g>`;
    const arm = (cls, x, sgn) => `<g class="${cls}" data-hx="${x}" data-hy="-100"><ellipse cx="${x + sgn * 6}" cy="-62" rx="11" ry="40" fill="${body}" ${st(3)}/><path d="M${x + sgn * 6 - 6},-22 v8 M${x + sgn * 6},-21 v9 M${x + sgn * 6 + 6},-22 v8" stroke="${claw}" stroke-width="2.5" stroke-linecap="round"/></g>`;
    return `${leg('legL', -17)}${leg('legR', 17)}
      <ellipse cx="0" cy="-70" rx="40" ry="46" fill="${body}" ${st(3.5)}/>
      <ellipse cx="0" cy="-60" rx="22" ry="30" fill="#c8d1e0" opacity=".7"/>
      <circle cx="0" cy="-136" r="42" fill="${body}" ${st(3.5)}/>
      <path d="M-8,-176 q-12,-18 4,-26 M8,-176 q12,-18 -4,-26" fill="none" stroke="#7d8aa2" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="-30" cy="-146" rx="9" ry="14" fill="#9a8fc0" opacity=".55"/><ellipse cx="30" cy="-146" rx="9" ry="14" fill="#9a8fc0" opacity=".55"/>`;
  }

  function mountRun(root, info) {
    const S = 500, P = (x, y, z) => [500 + (x * S) / z, 250 + (y * S) / z];
    const pts = (a) => a.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
    const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
    // 平面上的長方形（牆、地、天花板）：u 方向 × 深度 z0~z1
    const wallQ = (x, y0, y1, z0, z1) => [P(x, y0, z0), P(x, y0, z1), P(x, y1, z1), P(x, y1, z0)];
    const flatQ = (y, x0, x1, z0, z1) => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
    // 面向鏡頭的小物件（在 z=1 時 1 單位 = 500px）
    const spr = (x, y, z, inner) => { const [px, py] = P(x, y, z); return `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)}) scale(${(1 / z).toFixed(4)})">${inner}</g>`; };
    const FL = 0.9, CE = -0.7, Z0 = 1, Z1 = 9;
    const m = String((info && info.text) || '').match(/(\d{1,2})/);
    const goal = m ? Number(m[1]) : 6;
    const HV = `font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" font-weight="800"`;
    const sign = (txt, big = false) => { const w = big ? 300 : 250, h = big ? 112 : 92;
      return `<path d="M${-w * 0.3},${-h / 2 - 70} V${-h / 2} M${w * 0.3},${-h / 2 - 70} V${-h / 2}" stroke="#2a2e36" stroke-width="7"/>
        <rect x="${-w / 2 + 6}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="8" fill="#000" opacity=".25"/>
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8" fill="#ffcf1f" stroke="${INK}" stroke-width="9"/>
        <text x="0" y="${h * 0.24}" text-anchor="middle" font-size="${big ? 66 : 54}" fill="${INK}" ${HV} letter-spacing="1">${txt}</text>`; };
    let svg = `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="機場走道上奔跑的背影">
      <defs>
        <linearGradient id="rkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc4ec"/><stop offset=".62" stop-color="#d9ecf8"/><stop offset=".63" stop-color="#8e949c"/><stop offset="1" stop-color="#6c727b"/></linearGradient>
        <linearGradient id="rkFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f8792"/><stop offset="1" stop-color="#a7adb6"/></linearGradient>
        <linearGradient id="rkCeil" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3d4350"/><stop offset="1" stop-color="#262a33"/></linearGradient>
        <radialGradient id="rkGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="-900" width="2800" height="700" fill="#22252d"/>`;
    // 天花板、地板、牆
    svg += poly(flatQ(CE, -1, 1, Z0, Z1), 'url(#rkCeil)');
    svg += poly(flatQ(FL, -1, 1, Z0, Z1), 'url(#rkFloor)');
    svg += poly(wallQ(-1, CE, FL, Z0, Z1), '#4d5562') + poly(wallQ(1, CE, FL, Z0, Z1), '#59616e');
    // 左牆：整排落地窗（外面是天空和停機坪）
    const panes = [];
    for (let z = 1.2; z < Z1 - 0.3; z += 0.9) panes.push(wallQ(-1, -0.56, 0.62, z, z + 0.84));
    svg += `<clipPath id="rkWin">${panes.map((q) => `<polygon points="${pts(q)}"/>`).join('')}</clipPath>`;
    svg += panes.map((q) => poly(q, 'url(#rkSky)')).join('');
    // 停在外面的飛機：只在窗玻璃裡看得到（被窗框擋住）
    svg += `<g clip-path="url(#rkWin)">${spr(-1.9, 0.38, 3.2, `<g opacity=".9"><path d="M-260,0 C-200,-36 120,-36 230,-12 C252,-6 252,6 230,10 C120,26 -200,26 -260,8Z" fill="#f4f6f9" stroke="#5a6170" stroke-width="5"/><path d="M-200,-14 L-250,-110 L-210,-110 L-130,-16Z" fill="#1e5fb3" stroke="#5a6170" stroke-width="5"/><path d="M-60,4 L40,90 L80,90 L30,4Z" fill="#dfe3ea" stroke="#5a6170" stroke-width="5"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${-130 + i * 26}" cy="-8" r="5" fill="#33405a"/>`).join('')}</g>`)}</g>`;
    panes.forEach((q, i) => { const z = 1.2 + i * 0.9; svg += poly(q, 'none', `stroke="${INK}" stroke-width="1.5"`) + `<polyline points="${pts([P(-1, -0.56, z + 0.42), P(-1, 0.62, z + 0.42)])}" stroke="#2c313b" stroke-width="${(10 / z).toFixed(1)}" fill="none"/>`; });
    svg += poly(wallQ(-1, 0.62, FL, Z0, Z1), '#3a404b');
    svg += `<polyline points="${pts([P(-1, 0.62, Z0), P(-1, 0.62, Z1)])}" stroke="#8a919b" stroke-width="3" fill="none"/>`;
    // 天花板：橫樑 + 兩條長燈帶；地板上的倒影
    for (let z = 1.5; z < Z1; z += 1) svg += `<polyline points="${pts([P(-1, CE, z), P(1, CE, z)])}" stroke="#1d2027" stroke-width="${(14 / z).toFixed(1)}" fill="none"/>`;
    for (const lx of [-0.5, 0.5]) {
      svg += poly(flatQ(CE, lx - 0.07, lx + 0.07, 1.05, Z1 - 0.2), '#fff4cf');
      svg += poly(flatQ(FL, lx - 0.1, lx + 0.1, 1.05, Z1 - 0.2), '#fff8e2', 'opacity=".16"');
    }
    svg += `<g class="floor-lines">${Array.from({ length: 16 }, (_, i) => { const z = 1.1 + i * 0.5; return `<polyline points="${pts([P(-1, FL, z), P(1, FL, z)])}" stroke="#6f7782" stroke-width="1.6" fill="none" opacity=".7"/>`; }).join('')}
      <polyline points="${pts([P(0, FL, Z0), P(0, FL, Z1)])}" stroke="#6f7782" stroke-width="1.6" fill="none" opacity=".5"/></g>`;
    // 右牆：登機門（每個門上方掛著黃色登機口牌）＋櫃台
    const nums = []; for (let n = goal - 1; n >= 1 && nums.length < 3; n--) nums.unshift(n);
    const doorZ = [1.8, 3.0, 4.3].slice(3 - nums.length);
    const back = [];
    nums.forEach((n, i) => {
      const z = doorZ[i];
      svg += poly(wallQ(1, -0.18, FL, z, z + 0.62), '#2c323c', `stroke="${INK}" stroke-width="2"`);
      svg += poly(wallQ(1, -0.12, 0.5, z + 0.06, z + 0.56), '#6d8fb0', 'opacity=".55"');
      back.push([z + 0.3, spr(0.62, -0.42, z + 0.3, sign(`Gate ${n}`))]);
      back.push([z + 0.05, spr(0.7, FL, z + 0.05, `<rect x="-70" y="-120" width="140" height="120" rx="8" fill="#c9ced6" stroke="${INK}" stroke-width="7"/><rect x="-70" y="-120" width="140" height="22" rx="8" fill="#e8ebef" stroke="${INK}" stroke-width="7"/><rect x="-40" y="-176" width="80" height="54" rx="6" fill="#1b1f27" stroke="${INK}" stroke-width="6"/><rect x="-32" y="-168" width="64" height="38" rx="3" fill="#2f6fd0"/>`)]);
    });
    // 走道盡頭：目標登機口，落地窗外停著飛機機頭，上方大大的黃色牌子
    const e = [P(-1, CE, Z1), P(1, CE, Z1), P(1, FL, Z1), P(-1, FL, Z1)];
    svg += poly(e, 'url(#rkSky)');
    svg += spr(0, 0.62, Z1, `<path d="M-160,40 C-150,-60 -40,-120 60,-120 C140,-120 170,-60 170,40Z" fill="#f4f6f9" stroke="${INK}" stroke-width="8"/><path d="M20,-104 C60,-104 96,-84 108,-56 L40,-56Z" fill="#1b2433" stroke="${INK}" stroke-width="6"/><rect x="-200" y="40" width="400" height="30" fill="#5d646e"/>`);
    svg += `<polyline points="${pts([P(-0.5, CE, Z1), P(-0.5, FL, Z1)])} " stroke="#2c313b" stroke-width="3" fill="none"/><polyline points="${pts([P(0.5, CE, Z1), P(0.5, FL, Z1)])}" stroke="#2c313b" stroke-width="3" fill="none"/>`;
    svg += poly(e, 'none', `stroke="${INK}" stroke-width="3"`);
    svg += `<ellipse cx="500" cy="262" rx="140" ry="90" fill="url(#rkGlow)"/>`;
    back.push([Z1 - 0.6, spr(-0.36, -0.2, Z1 - 0.6, `<g transform="scale(3)">${sign(`Gate ${goal}`, true)}</g>`)]);
    back.sort((a, b) => b[0] - a[0]).forEach(([, g]) => { svg += g; });
    // 角色（以腳底為原點；由 JS 每幀擺位）
    svg += `<g class="runner" id="run-a">${raccoonyBack()}</g><g class="runner" id="run-b">${slothyBack()}</g>`;
    svg += '</svg>';
    root.innerHTML = `<div class="end-shake">${svg}</div><div class="end-vignette"></div><div class="end-black"></div>`;

    const chars = ['run-a', 'run-b'].map((id, i) => {
      const el = root.querySelector('#' + id);
      return { el, i, parts: ['legL', 'legR'].map((c) => el.querySelector('.' + c)) };
    });
    const t0 = performance.now(), DUR = 6.6;
    const rot = (g, a) => g.setAttribute('transform', `rotate(${a.toFixed(1)} ${g.dataset.hx} ${g.dataset.hy})`);
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000, p = Math.min(1, t / DUR);
      for (const c of chars) {
        const z = 1.25 + c.i * 0.12 + Math.pow(p, 1.25) * 6.2;                 // 越跑越遠
        const x3 = c.i ? 0.17 : -0.17;
        const [fx, fy] = P(x3, 0.9, z);
        const k = 1.25 / z, ph = t * 2 * Math.PI / 0.54 + c.i * 0.8;
        const bob = Math.abs(Math.sin(ph)) * 7 * k;
        c.el.setAttribute('transform', `translate(${fx.toFixed(1)},${(fy - bob).toFixed(1)}) scale(${k.toFixed(3)})`);
        const [lL, lR] = c.parts, s = Math.sin(ph);
        rot(lL, s * 38); rot(lR, -s * 38);
      }
    };
    raf = requestAnimationFrame(frame);
    if (window.Music && Music.footsteps) Music.footsteps(7);
  }

  // ---------------- 立燈亮起 ----------------
  // ---------------- 黑幕：字幕打在正中間，跑完就進下一幕 ----------------
  function mountBlack(root, info) {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const text = String((info && info.text) || '').replace(/(?:[\u2300-\u23FF\u2460-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3297\u3299]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])\uFE0F?/g, '').trim(); // 不用 \p{…}，舊版 Safari 不支援
    root.innerHTML = `<div class="end-blackcard"><p>${esc(text)}</p></div>`;
  }

  function mountLamp(root) {
    root.innerHTML = `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="立燈亮了">
      <rect x="-900" width="2800" height="700" fill="#0a0b14"/><rect x="-900" y="520" width="2800" height="190" fill="#13141f"/>
      <ellipse cx="500" cy="600" rx="90" ry="18" fill="#1b1d2a" ${st(4)}/><rect x="488" y="250" width="24" height="350" fill="#8a8f9c" ${st(3)}/>
      <polygon points="420,250 580,250 548,130 452,130" fill="#fff0a8" ${st(4)}/><circle cx="500" cy="240" r="30" fill="#fff9d0" ${st(3)}/>
    </svg><div class="end-light"></div>`;
    if (window.Music && Music.ding) Music.ding();
  }

  // ---------------- To be continued ----------------
  function mountTbc(root, info) {
    const n = info && Number.isInteger(info.hintTotal) ? info.hintTotal : null;
    const stat = n === null ? '' : `<em class="end-stat">${n === 0 ? tr('沒用任何提示就過關了！', 'Finished without a single hint!') : tr(`這一路用了 ${n} 次提示`, `You used ${n} hint${n === 1 ? '' : 's'}`)}</em>`;
    root.innerHTML = `<div class="end-tbc"><span>To be continued</span><i>▶</i>${stat}<button class="end-again" data-again>${tr('再玩一次！', 'Play again!')}<small>${tr('謎題會換新', 'New puzzles every time')}</small></button></div>`;
  }

  function mount(root, kind = 'train', info) {
    stop();
    root.classList.remove('run');
    root.dataset.kind = kind;
    if (kind === 'run') mountRun(root, info);
    else if (kind === 'tbc') mountTbc(root, info);
    else if (kind === 'lamp') mountLamp(root);
    else if (kind === 'black') mountBlack(root, info);
    else mountTrain(root);
    void root.offsetWidth; // 重新觸發 CSS 動畫
    root.classList.add('run');
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  window.Ending = { mount, stop };
})();
