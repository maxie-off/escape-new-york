// 美漫風 SVG 小零件：Raccoony（棕灰色浣熊絨毛玩偶）、Slothy（灰藍色樹懶絨毛玩偶）。
// 造型參考實體玩偶照片：坐姿、圓滾滾、粗黑描邊 + 平塗色塊。所有函式回傳 SVG 字串。
window.Art = (function () {
  const INK = '#1b1b1f';
  const st = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const FONT = `font-family="'Nunito','GenSeki','PingFang TC','Noto Sans TC',sans-serif" font-weight="700"`;

  // 坐姿：屁股底部中心為 (0,0)，高約 170
  // 福爾摩斯獵鹿帽（正面）：深灰人字紋毛呢、前後帽簷、兩側耳罩往上綁、頂上一個黑色蝴蝶結
  // 人字紋圖樣只定義一次，放在頁面最外層一個看不見（但沒有 display:none）的 SVG 裡。
  // 如果每個角色各自帶一份，最先出現的那份可能在隱藏的畫面裡，瀏覽器就畫不出來，帽子會變透明。
  // 每個 fill 也都附上純色備用（url(#tweed) #3b3e45）。
  const TWEED = `<pattern id="tweed" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#3b3e45"/><path d="M0,6 L2.5,2 L5,6 L7.5,2 L10,6" fill="none" stroke="#585d66" stroke-width="1.3"/></pattern>`;
  (function installDefs() {
    const add = () => {
      if (document.getElementById('art-defs')) return;
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      d.id = 'art-defs'; d.setAttribute('aria-hidden', 'true');
      d.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      d.innerHTML = `<defs>${TWEED}</defs>`;
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
      ${deerstalker(0, -108)}
      <circle cx="-44" cy="-186" r="14" fill="${fur}" ${st(3)}/><circle cx="-44" cy="-185" r="7" fill="#e8c9bd"/>
      <circle cx="44" cy="-186" r="14" fill="${fur}" ${st(3)}/><circle cx="44" cy="-185" r="7" fill="#e8c9bd"/>
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

  return { INK, st, FONT, raccoony, slothy, portrait, deerstalker, deerstalkerBack };
})();
