// 開場（場景 0）：黑暗的房間。
//   A（Raccoony）：黃色微光照著綠色絨布沙發，沙發上有一張紙：形狀對應顏色。
//   B（Slothy）：紅光一閃一閃，地上有一條延長線（每個插孔旁有開關）+ 立燈；點插孔把立燈插上去。
// 只負責「畫」和「把點擊變成 action」；哪個插孔是對的由伺服器判定。
(function () {
  const A = window.Art;
  const INK = A.INK;
  const ST = A.st(4);
  const ST2 = A.st(2.5);
  const FONT = A.FONT;
  const COL = { red: '#e5382f', green: '#2fa84f', blue: '#2f6fe0' };
  const SVG_OPEN = (label) => `<svg viewBox="0 0 1000 700" class="scene-svg" role="img" aria-label="${label}">`;

  let ctx = null, data = null, box = null, busy = false, timers = [];
  const ui = { plugged: -1, fallen: false };
  const reset = () => { timers.forEach(clearTimeout); timers = []; busy = false; ui.plugged = -1; ui.fallen = false; };

  // 梯形（上窄下寬）、倒梯形（上寬下窄）、正方形
  function shape(kind, cx, cy, s, fill, extra = '') {
    const h = s / 2;
    const pts = kind === 'trapezoid' ? [[-h * 0.62, -h], [h * 0.62, -h], [h, h], [-h, h]]
      : kind === 'inverted' ? [[-h, -h], [h, -h], [h * 0.62, h], [-h * 0.62, h]]
      : [[-h, -h], [h, -h], [h, h], [-h, h]];
    return `<polygon points="${pts.map(([x, y]) => `${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`).join(' ')}" fill="${fill}" ${extra}/>`;
  }
  const NAME = { trapezoid: '梯形', inverted: '倒梯形', square: '正方形' };
  // 燈罩：寬 w、高 h，中心 (cx, cy)，形狀和插孔一樣有三種
  function shade(kind, cx, cy, w, h, fill, extra = '') {
    const hw = w / 2, hh = h / 2, n = hw * 0.62;
    const pts = kind === 'trapezoid' ? [[-n, -hh], [n, -hh], [hw, hh], [-hw, hh]]
      : kind === 'inverted' ? [[-hw, -hh], [hw, -hh], [n, hh], [-n, hh]]
      : [[-hw * 0.8, -hh], [hw * 0.8, -hh], [hw * 0.8, hh], [-hw * 0.8, hh]];
    return `<polygon points="${pts.map(([x, y]) => `${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`).join(' ')}" fill="${fill}" ${extra}/>`;
  }

  const DARK = `<defs>
    <pattern id="cord" width="16" height="10" patternUnits="userSpaceOnUse"><rect width="7" height="10" fill="#1d5a35" opacity=".55"/></pattern>
    <radialGradient id="glowY" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#ffd86b" stop-opacity=".95"/><stop offset=".45" stop-color="#ffc233" stop-opacity=".45"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowR" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#ff4b3e" stop-opacity=".9"/><stop offset=".45" stop-color="#ff2a1f" stop-opacity=".4"/><stop offset="1" stop-color="#ff2a1f" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="50%" cy="55%" r="62%"><stop offset=".25" stop-color="#05060d" stop-opacity="0"/><stop offset="1" stop-color="#05060d" stop-opacity=".97"/></radialGradient>
  </defs>`;

  // ---------- A：沙發上的一張紙 ----------
  function roomA() {
    const rows = data.paper.map((p, i) => {
      const y = 300 + i * 70;
      return `${shape(p.shape, 400, y, 52, '#2b2b33', ST2)}
        <path d="M452,${y} h64 m-14,-12 l14,12 l-14,12" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="552" y="${y - 28}" width="56" height="56" rx="8" fill="${COL[p.color]}" ${ST2}/>`;
    }).join('');
    return `${SVG_OPEN('黑暗中的沙發')}${DARK}
      <rect x="-900" width="2800" height="700" fill="#0a0b14"/>
      <rect x="-900" y="560" width="2800" height="150" fill="#13141f"/>
      <g class="s0-glowA">
        <g>
          <rect x="90" y="250" width="820" height="140" rx="40" fill="#2f8a52" ${ST}/>
          <rect x="90" y="250" width="820" height="140" rx="40" fill="url(#cord)"/>
          <rect x="60" y="360" width="880" height="230" rx="34" fill="#3aa062" ${ST}/>
          <rect x="60" y="360" width="880" height="230" rx="34" fill="url(#cord)"/>
          <rect x="40" y="330" width="120" height="280" rx="40" fill="#2f8a52" ${ST}/><rect x="40" y="330" width="120" height="280" rx="40" fill="url(#cord)"/>
          <rect x="840" y="330" width="120" height="280" rx="40" fill="#2f8a52" ${ST}/><rect x="840" y="330" width="120" height="280" rx="40" fill="url(#cord)"/>
          <path d="M170,372 h660" stroke="${INK}" stroke-width="4" opacity=".5"/>
        </g>
      </g>
      <rect x="-900" width="2800" height="700" fill="url(#glowY)" class="s0-flick" style="mix-blend-mode:screen;pointer-events:none" opacity=".5"/>
        <g transform="rotate(-3 500 440)">
          <rect x="300" y="236" width="400" height="356" rx="6" fill="#fffdf5" ${ST}/>
          ${rows}
          <line x1="330" y1="478" x2="670" y2="478" stroke="${INK}" stroke-width="2" stroke-dasharray="6 6" opacity=".5"/>
          <g transform="translate(400,532)"><rect x="-3" y="-14" width="6" height="40" fill="#8a8f9c" ${A.st(2)}/>${shade(data.example, 0, -27, 40, 26, '#ffe27a', A.st(2.5))}<ellipse cx="0" cy="27" rx="16" ry="5" fill="#4a4f63" ${A.st(2)}/></g>
          <path d="M452,532 h64 m-14,-12 l14,12 l-14,12" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          ${shape(data.example, 580, 532, 52, '#2b2b33', ST2)}
        </g>

      <rect x="-900" width="2800" height="700" fill="url(#vig)" style="pointer-events:none"/>
      ${A.raccoony(150, 700, 0.62)}
    </svg>`;
  }

  // ---------- B：延長線 + 立燈 ----------
  function lampSvg(on) {
    return `<g>
      <ellipse cx="860" cy="640" rx="64" ry="14" fill="#1b1d2a" ${ST2}/><rect x="850" y="260" width="20" height="380" fill="#8a8f9c" ${ST2}/>
      ${shade(data.lamp, 860, 210, 120, 100, on ? '#fff0a8' : '#6a7088', ST)}
      ${on ? `<circle cx="860" cy="250" r="26" fill="#fff9d0" ${ST2}/>` : ''}
    </g>`;
  }
  function roomB() {
    const strip = data.sockets.map((s, i) => {
      const x = 330 + i * 150;
      const sw = s.sw;
      return `<g class="hot" data-hot="sock-${i}">
        <rect x="${x - 56}" y="548" width="112" height="84" rx="12" fill="#f0f1f5" ${ST2}/>
        ${shape(s.shape, x, 590, 42, '#1b1c26')}
        <circle class="s0-pulse" cx="${x}" cy="590" r="46" fill="none" stroke="#ff5a5f" stroke-width="4" opacity="0"/>
      </g>
      <g class="hot" data-hot="sw-${i}"><rect x="${x - 26}" y="496" width="52" height="48" rx="8" fill="${COL[sw]}" ${ST2}/>
        <rect x="${x - 13}" y="506" width="26" height="18" rx="5" fill="#fff" ${A.st(2)}/></g>`;
    }).join('');
    const sock = ui.plugged;
    const px = sock >= 0 ? 330 + sock * 150 : 700, py = sock >= 0 ? 560 : 660;
    const plug = `<g><path d="M${px + 6},${py + 36} C ${px + 120},${py + 96} 800,690 842,646" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <rect x="${px - 18}" y="${py - 6}" width="36" height="44" rx="6" fill="#2b2b33" ${ST2}/><rect x="${px - 10}" y="${py - 18}" width="6" height="14" fill="#c8ccd4"/><rect x="${px + 4}" y="${py - 18}" width="6" height="14" fill="#c8ccd4"/></g>`;
    return `${SVG_OPEN('黑暗中的延長線與立燈')}${DARK}
      <rect x="-900" width="2800" height="700" fill="#0a0b14"/>
      <rect x="-900" y="470" width="2800" height="240" fill="#13141f"/>
      <rect x="-900" width="2800" height="700" fill="url(#glowR)" class="s0-blink" style="mix-blend-mode:screen;pointer-events:none"/>
      ${lampSvg(false)}
      <g transform="translate(0,-70)"><g class="s0-strip${ui.fallen ? ' fallen' : ''}">
        <rect x="236" y="496" width="500" height="148" rx="22" fill="#c9cdd6" ${ST}/>
        ${strip}${plug}
        <rect x="716" y="560" width="14" height="14" fill="${INK}"/>
        <path d="M736,578 C 760,600 790,640 842,650" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      </g>
      <rect x="-900" width="2800" height="700" fill="url(#vig)" style="pointer-events:none" opacity=".8"/>
      ${A.slothy(140, 700, 0.9)}
    </svg>`;
  }

  async function onClick(e) {
    const h = e.target.closest('[data-hot]');
    if (!h || data.role !== 'B' || busy) return;
    const k = h.dataset.hot;
    if (k.startsWith('sw-')) { if (window.Music && Music.click) Music.click(); ctx.send({ type: 'switch', socket: Number(k.slice(3)) }); return; }
    if (!k.startsWith('sock-')) return;
    const i = Number(k.slice(5));
    busy = true; ui.plugged = i; draw();
    const res = await ctx.send({ type: 'plug', socket: i });
    if (res && res.correct === false) {
      if (window.Music && Music.buzz) Music.buzz();
      ui.fallen = true; draw();
      timers.push(setTimeout(() => { ui.fallen = false; ui.plugged = -1; busy = false; draw(); }, 2200));
    } else if (res && res.solved) {
      if (window.Music && Music.ding) Music.ding();
    } else { busy = false; }
  }
  function draw() { if (box) box.innerHTML = data.role === 'A' ? roomA() : roomB(); }

  window.Scenes = window.Scenes || {};
  window.Scenes.dark = {
    render(container, newData, c) {
      box = container; ctx = c; data = newData;
      box.onclick = onClick;
      draw();
    },
    unmount() { reset(); box = null; },
  };
})();
