// 收藏文件的畫面：地圖、機票。
(function () {
  const INK = '#1b1b1f';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function pin(x, y, color, label, lx, ly, anchor = 'start') {
    return `<circle cx="${x}" cy="${y}" r="9" fill="${color}" stroke="${INK}" stroke-width="3.5"/>
      <rect x="${anchor === 'end' ? lx - label.length * 12.5 - 18 : lx - 6}" y="${ly - 19}" width="${label.length * 12.5 + 22}" height="28" rx="8" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <text x="${anchor === 'end' ? lx - 4 : lx + 4}" y="${ly}" text-anchor="${anchor}" font-size="19" font-weight="700" fill="${INK}" font-family="'Helvetica Neue',Arial,'GenSeki','PingFang TC',sans-serif">${esc(label)}</text>`;
  }
  // pins：三個機場各在哪一區，例如 { JFK: 'Queens', LGA: 'Brooklyn', EWR: 'Manhattan' }（每場隨機）
  const SPOT = {
    Manhattan: { x: 262, y: 262, lx: 214, ly: 272, anchor: 'end' },
    Queens: { x: 520, y: 262, lx: 536, ly: 252, anchor: 'start' },
    Brooklyn: { x: 452, y: 372, lx: 468, ly: 362, anchor: 'start' },
  };
  function mapSvg(pins = { EWR: 'Manhattan', LGA: 'Queens', JFK: 'Brooklyn' }) {
    const st = `stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
    const lab = (t, x, y, size = 24, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${INK}" opacity=".78" font-family="'Helvetica Neue',Arial,sans-serif" ${extra}>${t}</text>`;
    return `<svg viewBox="0 0 640 450" class="doc-map" role="img" aria-label="紐約地圖">
      <rect width="640" height="450" rx="10" fill="#8fd0ff"/>
      <polygon points="-4,-4 168,-4 190,200 150,454 -4,454" fill="#d6d1b6" ${st}/>
      <polygon points="60,350 180,340 196,420 80,432" fill="#c7b8ff" ${st}/>
      <polygon points="232,24 270,18 300,120 292,250 270,330 246,362 236,330 246,232 226,120" fill="#ffd23f" ${st}/>
      <polygon points="276,16 420,10 440,112 336,142 302,110" fill="#ff9bb0" ${st}/>
      <polygon points="322,150 440,118 600,155 612,320 486,350 392,306 324,236" fill="#a8e6a1" ${st}/>
      <polygon points="270,352 392,308 486,352 612,324 598,432 420,442 282,422" fill="#ffb86b" ${st}/>
      ${lab('NJ', 70, 220, 22)}${lab('Staten Island', 128, 392, 16)}${lab('Bronx', 372, 72)}
      ${lab('Queens', 480, 232, 30)}${lab('Brooklyn', 440, 400, 28)}
      ${lab('Manhattan', 0, 0, 17, 'transform="translate(268 205) rotate(90)"')}
      ${pin(252, 92, '#ee352e', '168 St', 66, 86)}
      <path d="M243,92 H200" stroke="${INK}" stroke-width="3"/>
      ${Object.entries(pins).map(([ap, b]) => { const p = SPOT[b]; return pin(p.x, p.y, '#3a8cff', `${ap} ✈`, p.lx, p.ly, p.anchor); }).join('')}
    </svg>`;
  }

  function ticketHtml(d) {
    const f = (k, zh, v) => `<div class="tf"><small>${tr(`${zh} ${k}`, k)}</small><b>${esc(v)}</b></div>`;
    return `<div class="ticket"><div class="t-head">✈ ${esc(d.airline.toUpperCase())}</div>
      <div class="t-body">${f('FLIGHT', '航班', d.flight)}${f('AIRPORT', '機場', d.airport)}${f('TO', '目的地', d.to)}${f('BOARDING', '登機時間', d.boarding)}</div>${d.note ? `<div class="t-note">${esc(d.note)}</div>` : ''}
      <div class="t-bar">${Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('')}</div></div>`;
  }

  function docHtml(d) {
    if (d.kind === 'map') return `<div class="doc-card"><h3>${esc(d.title)}</h3>${mapSvg()}</div>`;
    if (d.kind === 'passport') return `<div class="doc-card"><h3>${esc(d.title)}</h3><div class="passport"><div class="pp-top">${tr('PASSPORT · 護照', 'PASSPORT')}</div><div class="pp-body"><div class="pp-pic">${window.Art.portrait('A', 74)}</div><div class="pp-info"><small>NAME</small><b>${esc(d.name)}</b><small>COUNTRY</small><b>${esc(d.country)}</b><small>No.</small><b>3 1 4 1 5 9 2 6</b></div></div></div></div>`;
    if (d.kind === 'ticket') return `<div class="doc-card"><h3>${esc(d.title)}</h3>${ticketHtml(d)}</div>`;
    return '';
  }
  window.Docs = { docHtml, mapSvg };
})();
