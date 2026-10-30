// 美漫風 SVG 小零件：Raccoony（棕灰色浣熊絨毛玩偶）、Slothy（灰藍色樹懶絨毛玩偶）。
// 造型參考實體玩偶照片：坐姿、圓滾滾、粗黑描邊 + 平塗色塊。所有函式回傳 SVG 字串。
window.Art = (function () {
  const INK = '#1b1b1f';
  const st = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // 字體只有三種角色：FONT＝故事文字與對話框；SIGN＝場景裡的招牌、標示、標籤；MONO＝螢幕、儀表、數字（大標題在 CSS 用 Bebas Neue）
  const FONTF = "'Nunito','GenSeki','PingFang TC','Noto Sans TC',sans-serif";
  const SIGNF = "'Helvetica Neue',Helvetica,Arial,'GenSeki','PingFang TC','Noto Sans TC',sans-serif";
  const MONOF = "'Courier New',Courier,monospace,'GenSeki'";
  const FONT = `font-family="${FONTF}" font-weight="700"`;
  const SIGN = `font-family="${SIGNF}" font-weight="700"`;
  const MONO = `font-family="${MONOF}" font-weight="700"`;

  // 坐姿：屁股底部中心為 (0,0)，高約 170
  // 福爾摩斯獵鹿帽（正面）：深灰人字紋毛呢、前後帽簷、兩側耳罩往上綁、頂上一個黑色蝴蝶結
  // 人字紋圖樣只定義一次，放在頁面最外層一個看不見（但沒有 display:none）的 SVG 裡。
  // 如果每個角色各自帶一份，最先出現的那份可能在隱藏的畫面裡，瀏覽器就畫不出來，帽子會變透明。
  // 每個 fill 也都附上純色備用（url(#tweed) #3b3e45）。
  // ---------- 全遊戲共用的畫風規則 ----------
  // 線寬：背景細、中景中、前景粗（遠的東西線條細，畫面才有深度）
  const LW = { bg: 2, mid: 3, fg: 4 };
  // 光從左上方來：亮面在左上，影子往右下落
  const PAL = {
    bedroom: { wall: '#eee3cc', stripe: '#e6d8bb', trim: '#fbf6ea', floor: '#c9975e', floorDark: '#a87a45', floorLine: '#8a5f30', wood: '#c98a4c', woodDark: '#9a6330' },
  };
  // 材質（放在最外層一個看不見的 SVG 裡，所有場景共用；疊在色塊上面用）
  const TEX = `
    <pattern id="texGrain" width="160" height="24" patternUnits="userSpaceOnUse">
      <path d="M0,4 C40,2 80,7 160,4 M0,11 C30,13 90,9 160,12 M0,18 C50,16 110,21 160,18" fill="none" stroke="#5a3412" stroke-width="1.1" opacity=".22"/>
      <path d="M60,8 c6,-3 14,-3 18,1 c-5,4 -13,4 -18,-1Z" fill="none" stroke="#5a3412" stroke-width="1" opacity=".22"/></pattern>
    <pattern id="texGrainV" width="24" height="160" patternUnits="userSpaceOnUse">
      <path d="M4,0 C2,40 7,80 4,160 M11,0 C13,30 9,90 12,160 M18,0 C16,50 21,110 18,160" fill="none" stroke="#5a3412" stroke-width="1.1" opacity=".22"/></pattern>
    <pattern id="texWallpaper" width="44" height="44" patternUnits="userSpaceOnUse">
      <rect width="44" height="44" fill="#eee3cc"/><rect x="0" width="14" height="44" fill="#e6d8bb"/>
      <path d="M29,10 l3,4 -3,4 -3,-4Z M29,32 l3,4 -3,4 -3,-4Z" fill="#dccbaa"/></pattern>
    <pattern id="texPaper" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".6" fill="#000" opacity=".05"/><circle cx="4.5" cy="4" r=".5" fill="#fff" opacity=".2"/></pattern>
    <linearGradient id="gWallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a14" stop-opacity=".18"/><stop offset=".35" stop-color="#3a2a14" stop-opacity="0"/><stop offset=".85" stop-color="#3a2a14" stop-opacity="0"/><stop offset="1" stop-color="#3a2a14" stop-opacity=".2"/></linearGradient>
    <linearGradient id="gBeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></linearGradient>
    <linearGradient id="gTopLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>
    <linearGradient id="gFloorFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a08" stop-opacity=".28"/><stop offset=".4" stop-color="#2a1a08" stop-opacity="0"/></linearGradient>
    <radialGradient id="gVig" cx=".45" cy=".4" r=".8"><stop offset=".6" stop-color="#1a1008" stop-opacity="0"/><stop offset="1" stop-color="#1a1008" stop-opacity=".28"/></radialGradient>`;
  // 室內背景：壁紙牆 + 左上的窗光 + 踢腳板 + 木地板（一排排木板，越近越高）+ 牆角陰影 + 暗角
  function room(floorY, pal = PAL.bedroom, opt = {}) {
    let planks = '';
    let y = floorY + 4, h = 12, row = 0;
    while (y < 710) {
      const off = (row * 137) % 220;
      planks += `<rect x="-900" y="${y.toFixed(1)}" width="2800" height="${h.toFixed(1)}" fill="${row % 2 ? pal.floor : pal.floorDark}" opacity="${row % 3 === 2 ? 0.85 : 1}"/>`;
      planks += `<path d="M-900,${y.toFixed(1)} H1900" stroke="${pal.floorLine}" stroke-width="${(1 + h / 30).toFixed(1)}" opacity=".7"/>`;
      for (let x = -200 + off; x < 1200; x += 220 + (row % 2) * 40) planks += `<path d="M${x},${y.toFixed(1)} v${h.toFixed(1)}" stroke="${pal.floorLine}" stroke-width="1.6" opacity=".55"/>`;
      y += h; h *= 1.28; row++;
    }
    return `<rect x="-900" width="2800" height="${floorY}" fill="url(#texWallpaper)"/>
      ${opt.noBeam ? '' : `<polygon points="-200,0 380,0 140,${floorY} -460,${floorY}" fill="url(#gBeam)"/>`}
      <rect x="-900" width="2800" height="${floorY}" fill="url(#gWallShade)"/>
      <rect x="-900" y="${floorY}" width="2800" height="${710 - floorY}" fill="${pal.floor}"/>${planks}
      <rect x="-900" y="${floorY}" width="2800" height="${710 - floorY}" fill="url(#texGrain)"/>
      <rect x="-900" y="${floorY}" width="2800" height="${710 - floorY}" fill="url(#gFloorFade)"/>
      <rect x="-900" y="${floorY - 20}" width="2800" height="20" fill="${pal.trim}" stroke="${INK}" stroke-width="${LW.mid}"/>
      <rect x="-900" y="${floorY - 20}" width="2800" height="5" fill="#fff" opacity=".7"/>
      <rect x="-900" y="${floorY - 5}" width="2800" height="5" fill="#000" opacity=".12"/>`;
  }
  // 疊在木頭色塊上：木紋 + 左上亮右下暗
  const wood = (x, y, w, h, rx = 0, vertical = false) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${vertical ? 'texGrainV' : 'texGrain'})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#gTopLight)"/>`;
  // 落在地上的影子（光從左上 → 影子偏右）
  const shadow = (cx, y, w, h = 14, o = 0.26) => `<ellipse cx="${cx + w * 0.08}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="#2a1a08" opacity="${o}"/>`;
  const vignette = (k = 1) => `<rect x="-900" width="2800" height="700" fill="url(#gVig)" opacity="${k}" style="pointer-events:none"/>`;
  // 車站／機場共用的地板：拋光地磚，越近越大，接縫往消失點收，天花板燈的倒影
  function tileFloor(H, o = {}) {
    const a = o.a || '#7b838f', b = o.b || '#848c97', line = o.line || '#5d646e', V = o.vx ?? 500, lights = o.lights || [];
    let rows = '', y = H + 8, h = 14, k = 0;
    while (y < 710) { rows += `<rect x="-900" y="${y.toFixed(1)}" width="2800" height="${h.toFixed(1)}" fill="${k % 2 ? b : a}"/><path d="M-900,${y.toFixed(1)} H1900" stroke="${line}" stroke-width="${(0.8 + h / 40).toFixed(1)}" opacity=".7"/>`; y += h; h *= 1.32; k++; }
    const seams = Array.from({ length: 23 }, (_, i) => { const x = -1700 + i * 170; return `<path d="M${V + (x - V) * 0.02},${H} L${x},710" stroke="${line}" stroke-width="1.6" opacity=".55"/>`; }).join('');
    const refl = lights.map((x) => `<path d="M${x - 10},${H + 6} L${x + 10},${H + 6} L${x * 1.18 - 56},706 L${x * 1.18 - 124},706Z" fill="#fff8e0" opacity=".08"/>`).join('');
    return `<rect x="-900" y="${H}" width="2800" height="${710 - H}" fill="${a}" stroke="${INK}" stroke-width="${LW.mid}"/>${rows}${seams}${refl}
      <rect x="-900" y="${H}" width="2800" height="60" fill="url(#gFloorFade)"/>`;
  }
  // 天花板燈下面那一圈暖光（車站、機場共用）
  const lightGlow = (x, y, w = 160, h = 120) => `<ellipse cx="${x}" cy="${y + h * 0.45}" rx="${w / 2}" ry="${h / 2}" fill="#fff6d0" opacity=".1"/><ellipse cx="${x}" cy="${y + h * 0.25}" rx="${w / 3}" ry="${h / 3.2}" fill="#fff6d0" opacity=".1"/>`;
  // ---------- 配角共用的人物模板（以地鐵站路人為準）----------
  // 以腳底中心為原點，高約 250。頭在 (0,-208) 半徑 38；手腳分開，地鐵站的動畫會轉 legL/legR/armL/armR。
  // P：skin, top, sleeve, bottom, shoe, torsoW, legW, shoeW, torsoBottom, short（短袖：前臂露膚色）,
  //    sleeveMark（袖子上的臂章，手臂座標）, back（身後的東西）, torso（衣服上的細節）, hair（頭髮或帽子）, face（臉上的東西）, handL, handR, mouth（預設有）, blush（預設有）
  function human(P, o = {}) {
    const S = st(2.5), tw = P.torsoW || 72, lw = P.legW || 24, tb = P.torsoBottom ?? -66;
    const leg = (side) => { const bx = side === 'L' ? -15 : 15; return `<g class="leg${side}" data-bx="${bx}" data-by="-92" transform="translate(${bx},-92)"><rect x="${-lw / 2}" y="0" width="${lw}" height="84" rx="10" fill="${P.bottom}" ${S}/><rect x="${lw / 2 - 7}" y="4" width="5" height="74" rx="2.5" fill="#000" opacity=".12"/><ellipse cx="3" cy="86" rx="${P.shoeW || 19}" ry="9" fill="${P.shoe}" ${S}/></g>`; };
    const arm = (side) => { const bx = (side === 'L' ? -1 : 1) * (tw / 2 + 2);
      const sleeve = P.short ? `<rect x="-10" y="-6" width="20" height="30" rx="10" fill="${P.sleeve || P.top}" ${S}/><rect x="-8" y="20" width="16" height="46" rx="8" fill="${P.skin}" ${S}/>` : `<rect x="-10" y="-6" width="20" height="70" rx="10" fill="${P.sleeve || P.top}" ${S}/>`;
      return `<g class="arm${side}" data-bx="${bx}" data-by="-160" transform="translate(${bx},-160)">${sleeve}${P.sleeveMark || ''}<circle cx="0" cy="68" r="10" fill="${P.skin}" ${S}/>${side === 'R' ? P.handR || '' : P.handL || ''}</g>`; };
    return `${o.noShadow ? '' : '<ellipse cx="6" cy="4" rx="46" ry="9" fill="#000" opacity=".16"/>'}
      ${P.back || ''}${leg('L')}${leg('R')}
      <rect x="${-tw / 2}" y="-172" width="${tw}" height="${172 + tb}" rx="20" fill="${P.top}" ${S}/>
      <path d="M${tw / 2 - 16},-168 Q${tw / 2 - 4},-166 ${tw / 2 - 2},-150 V${tb - 14} Q${tw / 2 - 4},${tb - 2} ${tw / 2 - 16},${tb - 2}Z" fill="#000" opacity=".1"/>
      ${P.torso || ''}${arm('L')}${arm('R')}
      <circle cx="0" cy="-208" r="38" fill="${P.skin}" ${S}/>
      <path d="M18,-238 A38,38 0 0 1 22,-178 A34,34 0 0 0 18,-238Z" fill="#000" opacity=".08"/>
      ${P.hair || ''}
      ${P.eyes === false ? '' : `<circle cx="-13" cy="-208" r="4.2" fill="${INK}"/><circle cx="13" cy="-208" r="4.2" fill="${INK}"/>`}
      ${P.blush === false ? '' : `<ellipse cx="-24" cy="-196" rx="7" ry="4.5" fill="#ff9bb0" opacity=".45"/><ellipse cx="24" cy="-196" rx="7" ry="4.5" fill="#ff9bb0" opacity=".45"/>`}
      ${P.mouth === false ? '' : `<ellipse class="mouth" cx="0" cy="-192" rx="6" ry="2.5" fill="#7a2b2b"/>`}${P.face || ''}`;
  }
  const TWEED = `<pattern id="tweed" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#3b3e45"/><path d="M0,6 L2.5,2 L5,6 L7.5,2 L10,6" fill="none" stroke="#585d66" stroke-width="1.3"/></pattern>`;
  (function installDefs() {
    const add = () => {
      if (document.getElementById('art-defs')) return;
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      d.id = 'art-defs'; d.setAttribute('aria-hidden', 'true');
      d.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      d.innerHTML = `<defs>${TWEED}${TEX}</defs>`;
      document.body.prepend(d);
    };
    if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  })();
  function deerstalker(cx = 0, cy = -108) {
    const y = cy; // 頭的圓心
    return `<g class="deerstalker">
      <path d="M-58,${y - 30} C-62,${y - 72} -32,${y - 92} 0,${y - 92} C32,${y - 92} 62,${y - 72} 58,${y - 30} Z" fill="url(#tweed) #3b3e45" ${st()}/>
      <path d="M-58,${y - 30} q-6,10 -22,12 q8,-16 22,-26Z" fill="url(#tweed) #3b3e45" ${st(3)}/>
      <path d="M58,${y - 30} q6,10 22,12 q-8,-16 -22,-26Z" fill="url(#tweed) #3b3e45" ${st(3)}/>
      <path d="M-46,${y - 32} Q0,${y - 8} 46,${y - 32} Q0,${y - 20} -46,${y - 32}Z" fill="url(#tweed) #3b3e45" ${st(3)}/>
      <path d="M-24,${y - 88} C-30,${y - 64} -30,${y - 46} -26,${y - 26} M24,${y - 88} C30,${y - 64} 30,${y - 46} 26,${y - 26}" fill="none" stroke="#24262b" stroke-width="2.5" stroke-dasharray="3 3"/>
      <path d="M-50,${y - 44} q-6,-18 4,-30 q10,8 10,28Z" fill="url(#tweed) #3b3e45" ${st(2.5)}/><path d="M50,${y - 44} q6,-18 -4,-30 q-10,8 -10,28Z" fill="url(#tweed) #3b3e45" ${st(2.5)}/>
      <path d="M-14,${y - 98} q14,8 0,14 q-6,-6 0,-14Z M14,${y - 98} q-14,8 0,14 q6,-6 0,-14Z" fill="#141518" ${st(2)}/>
      <path d="M-3,${y - 88} l-8,16 M3,${y - 88} l9,14" stroke="#141518" stroke-width="5" stroke-linecap="round"/>
      <circle cx="0" cy="${y - 90}" r="4.5" fill="#141518" ${st(2)}/>
    </g>`;
  }
  // 背面的獵鹿帽（奔跑背影用）
  function deerstalkerBack(cy = -134) {
    const y = cy;
    return `<g class="deerstalker">
      <path d="M-50,${y - 22} C-54,${y - 62} -28,${y - 80} 0,${y - 80} C28,${y - 80} 54,${y - 62} 50,${y - 22} Z" fill="url(#tweed) #3b3e45" ${st(3.5)}/>
      <path d="M-42,${y - 24} Q0,${y + 4} 42,${y - 24} Q0,${y - 12} -42,${y - 24}Z" fill="url(#tweed) #3b3e45" ${st(3)}/>
      <path d="M0,${y - 80} V${y - 18}" stroke="#24262b" stroke-width="2.5" stroke-dasharray="3 3"/>
      <path d="M-12,${y - 86} q12,7 0,12 q-5,-5 0,-12Z M12,${y - 86} q-12,7 0,12 q5,-5 0,-12Z" fill="#141518" ${st(2)}/>
    </g>`;
  }
  // 迷你獵鹿帽：小小一頂，戴在兩隻耳朵中間的頭頂上
  function miniHat(top = -150) { return `<g transform="translate(0,${top + 4}) rotate(-5) scale(.42)">${deerstalker(0, 30)}</g>`; }
  function miniHatBack(top = -178) { return `<g transform="translate(0,${top + 4}) scale(.42)">${deerstalkerBack(22)}</g>`; }
  function raccoony(x = 0, y = 0, s = 1, flip = false) {
    const fur = '#6e5d5a', furDark = '#4a3d3b', cream = '#ead7c9', tan = '#d9b99f', vest = '#27345a';
    // 尾巴：一條，有深色環紋
    const TAIL = 'M34,-12 C78,-12 92,-58 70,-102 C62,-116 44,-108 50,-92 C60,-68 52,-42 30,-36Z';
    const tail = `<clipPath id="rtail"><path d="${TAIL}"/></clipPath><path d="${TAIL}" fill="${fur}"/>
      <g clip-path="url(#rtail)"><path d="M30,-22 C72,-30 84,-64 58,-106" fill="none" stroke="${furDark}" stroke-width="46" stroke-dasharray="13 15" stroke-dashoffset="-4"/></g>
      <path d="${TAIL}" fill="none" ${st(3)}/>`;
    const stitch = Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => `<line x1="${-28 + c * 9 + (r % 2) * 4}" y1="${-62 + r * 10}" x2="${-24 + c * 9 + (r % 2) * 4}" y2="${-62 + r * 10}" stroke="#41527f" stroke-width="2.5" stroke-linecap="round"/>`).join('')
    ).join('');
    return `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">
      ${tail}
      <ellipse cx="0" cy="-48" rx="46" ry="42" fill="${fur}" ${st()}/>
      <ellipse cx="0" cy="-42" rx="36" ry="32" fill="${vest}" ${st(3)}/>${stitch}
      <ellipse cx="-30" cy="-9" rx="21" ry="11" fill="${furDark}" ${st(3)}/>
      <ellipse cx="30" cy="-9" rx="21" ry="11" fill="${furDark}" ${st(3)}/>
      <ellipse cx="-49" cy="-50" rx="12" ry="26" fill="${fur}" transform="rotate(14 -49 -50)" ${st(3)}/>
      <ellipse cx="49" cy="-50" rx="12" ry="26" fill="${fur}" transform="rotate(-14 49 -50)" ${st(3)}/>
      <circle cx="-38" cy="-150" r="15" fill="${fur}" ${st(3)}/><circle cx="-38" cy="-148" r="8" fill="#e8c9bd"/>
      <circle cx="38" cy="-150" r="15" fill="${fur}" ${st(3)}/><circle cx="38" cy="-148" r="8" fill="#e8c9bd"/>
      <circle cx="0" cy="-108" r="52" fill="${fur}" ${st()}/>
      <ellipse cx="-27" cy="-130" rx="21" ry="14" fill="${cream}" transform="rotate(-22 -27 -130)"/>
      <ellipse cx="27" cy="-130" rx="21" ry="14" fill="${cream}" transform="rotate(22 27 -130)"/>
      <ellipse cx="-22" cy="-110" rx="19" ry="14" fill="${furDark}"/>
      <ellipse cx="22" cy="-110" rx="19" ry="14" fill="${furDark}"/>
      <ellipse cx="0" cy="-90" rx="25" ry="20" fill="${tan}"/>
      <circle cx="-21" cy="-110" r="5.5" fill="${INK}"/><circle cx="21" cy="-110" r="5.5" fill="${INK}"/>
      <circle cx="-19.2" cy="-112" r="1.9" fill="#fff"/><circle cx="22.8" cy="-112" r="1.9" fill="#fff"/>
      <ellipse cx="0" cy="-101" rx="9" ry="6.5" fill="#3a2d2b"/>
      <ellipse cx="0" cy="-83" rx="5" ry="6" fill="#6b2f2b" ${st(2.5)}/>
      ${miniHat()}
    </g>`;
  }

  function slothy(x = 0, y = 0, s = 1, flip = false) {
    const fur = '#b4bfd0', furDark = '#a3aec1', face = '#f6f1db', patch = '#b9b7c8', belly = '#e9e6dc';
    const lash = (cx, cy, dir) =>
      `<path d="M${cx - 10},${cy} Q${cx},${cy + 9} ${cx + 10},${cy}" fill="none" ${st(3)}/>
       <path d="M${cx + dir * 8},${cy + 3} l${dir * 5},3 M${cx + dir * 4},${cy + 5} l${dir * 3},5" fill="none" ${st(2)}/>`;
    return `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">
      <ellipse cx="0" cy="-48" rx="46" ry="42" fill="${fur}" ${st()}/>
      <ellipse cx="0" cy="-40" rx="28" ry="28" fill="${belly}"/>
      <ellipse cx="-30" cy="-9" rx="21" ry="11" fill="${furDark}" ${st(3)}/>
      <ellipse cx="30" cy="-9" rx="21" ry="11" fill="${furDark}" ${st(3)}/>
      <ellipse cx="-49" cy="-50" rx="12" ry="27" fill="${furDark}" transform="rotate(14 -49 -50)" ${st(3)}/>
      <ellipse cx="49" cy="-50" rx="12" ry="27" fill="${furDark}" transform="rotate(-14 49 -50)" ${st(3)}/>
      <circle cx="0" cy="-110" r="53" fill="${fur}" ${st()}/>
      <path d="M-4,-160 Q-12,-176 -2,-174 M2,-160 Q8,-178 14,-168" fill="none" stroke="${furDark}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="0" cy="-104" rx="35" ry="38" fill="${face}" ${st(3)}/>
      <ellipse cx="-17" cy="-110" rx="15" ry="12" fill="${patch}" transform="rotate(-12 -17 -110)"/>
      <ellipse cx="17" cy="-110" rx="15" ry="12" fill="${patch}" transform="rotate(12 17 -110)"/>
      ${lash(-17, -110, -1)}${lash(17, -110, 1)}
      <ellipse cx="0" cy="-96" rx="6.5" ry="4.5" fill="${INK}"/>
      <path d="M-10,-88 Q0,-80 10,-88" fill="none" ${st(3)}/>
    </g>`;
  }

  // 小頭像（大廳選角用）
  function portrait(role, size = 120) {
    const who = role === 'A' ? raccoony(0, 0, 1) : slothy(0, 0, 1);
    return `<svg viewBox="-85 -205 170 215" width="${size}" height="${size * 1.26}">${who}</svg>`;
  }

  return { INK, st, FONT, SIGN, MONO, FONTF, SIGNF, MONOF, LW, PAL, human, room, wood, shadow, vignette, tileFloor, lightGlow, raccoony, slothy, portrait, deerstalker, deerstalkerBack, miniHat, miniHatBack };
})();
