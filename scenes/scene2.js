// 場景 2：168 Street 地鐵月台（5 種變化，每場遊戲隨機抽一種）
//   Raccoony(A)：月台磚牆 + 電子看板。看板壞了：一開始只有一列（沒用的那條線）完整亮著，
//                其他列只看得到線路圓標和左邊的小符號。看板右側每列有一個頻道旋鈕（1~9）。手上有機票（機場、登機時間）。
//   Slothy(B)：視角 1 月台：柱子上貼著一張舊地圖（三個機場各在哪一區）、路人輪流說話（到各機場要多久）、選路線按鈕。
//             視角 2 電箱：5 條斷掉的電線（牌子正面是線路、背面是頻道數字）、5 個印著符號的接頭，每個接頭上方有閘門。
// 修看板（兩人互相交換資訊）：
//   1. Slothy 把某條線的電線接到「那條線在看板上的符號」的接頭（符號只有 Raccoony 看得到），再打開閘門。
//      接錯：閘門跳回去、那列閃紅光。接對：那列亮起來，但滿是雜訊。
//   2. Raccoony 把那列的旋鈕轉到電線牌背面的頻道（只有 Slothy 看得到），雜訊才消失、資訊完整顯示。
//   3. 五列全亮，Slothy 才能選路線。
// 解法：登機時間 − 2 小時（便條）＝最晚到機場；地圖看機場在哪一區；路人說的車程 → 最晚上車時間 → 往那一區、來得及的那一線。
//       同一區另有一條會遲到；往別區的某一線時間剛好對上「別的機場」的車程（誤導）。
// 祕密（正確路線、符號、頻道）只存在伺服器；前端只會收到「該角色此刻看得到」的內容。

const LINES = ['B', 'C', 'E', '1', '2'];
const SYMS = ['tri', 'circ', 'sq', 'star', 'dia'];

// now：看板時間（分鐘，從午夜算）；boarding：機票登機時間；airport：機票上的機場；map：三個機場各在哪一區；travel：路人說的車程
// rows：看板 [線, 目的地, 下一班, 再下一班]；answer：正確的線；lit：一開始就完整亮著的「沒用的線」
// sym / ch：每條線在看板上的符號、電線牌背面的頻道；terms：電箱裡接頭由左到右的符號
const VARIANTS = [
  { now: 600, boarding: 840, airport: 'JFK', map: { JFK: 'Queens', LGA: 'Brooklyn', EWR: 'Manhattan' }, travel: { JFK: 110, LGA: 95, EWR: 90 },
    rows: [['B', 'Manhattan', 3, 13], ['C', 'Queens', 8, 18], ['E', 'Queens', 14, 24], ['1', 'Manhattan', 30, 40], ['2', 'Brooklyn', 6, 15]], answer: 'C', lit: 'B',
    sym: { B: 'tri', C: 'circ', E: 'sq', 1: 'star', 2: 'dia' }, ch: { B: 4, C: 7, E: 2, 1: 9, 2: 5 }, terms: ['star', 'circ', 'dia', 'tri', 'sq'] },
  { now: 580, boarding: 810, airport: 'LGA', map: { JFK: 'Brooklyn', LGA: 'Manhattan', EWR: 'Queens' }, travel: { JFK: 115, LGA: 100, EWR: 85 },
    rows: [['B', 'Queens', 4, 12], ['C', 'Manhattan', 13, 23], ['E', 'Manhattan', 6, 16], ['1', 'Brooklyn', 9, 19], ['2', 'Queens', 25, 35]], answer: 'E', lit: '1',
    sym: { B: 'dia', C: 'tri', E: 'star', 1: 'circ', 2: 'sq' }, ch: { B: 3, C: 8, E: 1, 1: 6, 2: 4 }, terms: ['sq', 'tri', 'circ', 'star', 'dia'] },
  { now: 615, boarding: 870, airport: 'EWR', map: { JFK: 'Manhattan', LGA: 'Queens', EWR: 'Brooklyn' }, travel: { JFK: 105, LGA: 90, EWR: 120 },
    rows: [['B', 'Brooklyn', 12, 22], ['C', 'Queens', 5, 14], ['E', 'Brooklyn', 18, 28], ['1', 'Manhattan', 30, 40], ['2', 'Queens', 2, 11]], answer: 'B', lit: 'C',
    sym: { B: 'sq', C: 'star', E: 'dia', 1: 'tri', 2: 'circ' }, ch: { B: 6, C: 2, E: 9, 1: 3, 2: 7 }, terms: ['circ', 'dia', 'tri', 'sq', 'star'] },
  { now: 590, boarding: 825, airport: 'JFK', map: { JFK: 'Manhattan', LGA: 'Brooklyn', EWR: 'Queens' }, travel: { JFK: 105, LGA: 80, EWR: 95 },
    rows: [['B', 'Brooklyn', 35, 45], ['C', 'Manhattan', 15, 25], ['E', 'Queens', 4, 13], ['1', 'Queens', 7, 17], ['2', 'Manhattan', 9, 19]], answer: '2', lit: 'E',
    sym: { B: 'circ', C: 'dia', E: 'tri', 1: 'sq', 2: 'star' }, ch: { B: 5, C: 1, E: 8, 1: 2, 2: 6 }, terms: ['dia', 'star', 'sq', 'circ', 'tri'] },
  { now: 605, boarding: 855, airport: 'LGA', map: { JFK: 'Queens', LGA: 'Brooklyn', EWR: 'Manhattan' }, travel: { JFK: 100, LGA: 115, EWR: 110 },
    rows: [['B', 'Manhattan', 20, 30], ['C', 'Queens', 8, 18], ['E', 'Brooklyn', 21, 31], ['1', 'Brooklyn', 14, 24], ['2', 'Queens', 3, 12]], answer: '1', lit: '2',
    sym: { B: 'star', C: 'sq', E: 'circ', 1: 'dia', 2: 'tri' }, ch: { B: 9, C: 4, E: 3, 1: 7, 2: 1 }, terms: ['tri', 'sq', 'star', 'dia', 'circ'] },
];
const SYM_ZH = { tri: '三角形', circ: '圓形', sq: '方形', star: '星形', dia: '菱形' };

const clock = (m) => { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`; };

function peopleOf(vv) {
  return [
    { id: 'banker', lines: ['要去 JFK 啊？', '從這裡搭過去', `大概要 ${vv.travel.JFK} 分鐘喔。`] },
    { id: 'skater', lines: ['欸，你幾點要到機場？', '你知道嗎？'] },
    { id: 'artist', lines: ['去 EWR 的話，', '從這裡過去', `大概 ${vv.travel.EWR} 分鐘喔。`] },
    { id: 'rider', lines: ['LGA 喔？', '從這裡搭過去', `差不多 ${vv.travel.LGA} 分鐘。`] },
  ];
}

function init(v = 0) {
  const vv = VARIANTS[v];
  const conn = {}, powered = {}, dial = {};
  for (const l of LINES) { conn[l] = null; powered[l] = false; dial[l] = 1; }
  // 沒用的那條線一開始就接好、調好
  conn[vv.lit] = vv.sym[vv.lit]; powered[vv.lit] = true; dial[vv.lit] = vv.ch[vv.lit];
  return { v, solved: false, conn, powered, dial, flash: null, flashN: 0, allClear: false };
}
const clear = (state, l) => state.powered[l] && state.dial[l] === VARIANTS[state.v].ch[l];
const allClear = (state) => LINES.every((l) => clear(state, l));

function view(state, role) {
  const vv = VARIANTS[state.v];
  if (role === 'A') {
    return {
      role,
      board: {
        station: '168 Street',
        time: clock(vv.now),
        rows: vv.rows.map(([line, to, next, then]) => {
          const st = clear(state, line) ? 'clear' : state.powered[line] ? 'static' : 'dark';
          return st === 'clear' ? { line, sym: vv.sym[line], state: st, dial: state.dial[line], fixed: line === vv.lit, to, next, then }
            : { line, sym: vv.sym[line], state: st, dial: state.dial[line] };
        }),
      },
      flash: state.flash,
      allClear: state.allClear,
    };
  }
  return {
    role,
    people: peopleOf(vv),
    lines: LINES,
    map: vv.map, // 柱子上的舊地圖：三個機場各在哪一區
    terms: vv.terms,
    wires: LINES.map((l) => ({ line: l, ch: vv.ch[l], term: state.conn[l], powered: state.powered[l], fixed: l === vv.lit })),
    flash: state.flash,
    allClear: state.allClear,
  };
}

function act(state, role, a = {}) {
  const vv = VARIANTS[state.v];
  const line = String(a.line || '');
  switch (a.type) {
    case 'plug': {
      // Slothy 把某條電線接到某個接頭（可以改接；已經通電的線不能拔）
      if (role !== 'B') return { ok: false, message: '電箱在 Slothy 那邊。' };
      if (!LINES.includes(line) || state.powered[line]) return { ok: false };
      const term = a.term === null ? null : String(a.term || '');
      if (term !== null && !SYMS.includes(term)) return { ok: false };
      if (term !== null) for (const l of LINES) if (state.conn[l] === term && !state.powered[l]) state.conn[l] = null;
      if (term !== null && LINES.some((l) => state.conn[l] === term && state.powered[l])) return { ok: false, message: '這個接頭已經接好了。' };
      state.conn[line] = term;
      return { ok: true };
    }
    case 'gate': {
      // 打開某個接頭上方的閘門：接對了那列通電；接錯閘門跳回去、那列閃紅光
      if (role !== 'B') return { ok: false, message: '電箱在 Slothy 那邊。' };
      const term = String(a.term || '');
      if (!SYMS.includes(term)) return { ok: false };
      const l = LINES.find((x) => state.conn[x] === term);
      if (!l) return { ok: true, message: '這個閘門下面沒有接電線。' };
      if (state.powered[l]) return { ok: true };
      if (vv.sym[l] !== term) {
        state.flashN += 1; state.flash = { line: l, n: state.flashN };
        return { ok: true, correct: false, message: '啪！閘門跳回去了。', events: [{ text: `⚡ 啪！閘門跳了回去，看板上 ${l} 線那一列閃了一下紅光。` }] };
      }
      state.powered[l] = true;
      return finish(state, clear(state, l) ? `⚡ 喀噠！${l} 線那一列亮了起來，資訊很清楚！` : `⚡ 喀噠！${l} 線那一列亮了起來……可是畫面全是雜訊。`);
    }
    case 'tune': {
      // Raccoony 轉看板右側的頻道旋鈕
      if (role !== 'A') return { ok: false, message: '看板在 Raccoony 那邊。' };
      const ch = Number(a.ch);
      if (!LINES.includes(line) || !Number.isInteger(ch) || ch < 1 || ch > 9) return { ok: false };
      if (line === vv.lit) return { ok: true };
      const was = clear(state, line);
      state.dial[line] = ch;
      if (!was && clear(state, line)) return finish(state, `📺 ${line} 線的資訊清楚了！`);
      return { ok: true };
    }
    case 'board': {
      if (role !== 'B') return { ok: false, message: '選路線的按鈕在 Slothy 那邊。' };
      if (!LINES.includes(line)) return { ok: false };
      if (!state.allClear) return { ok: true, message: '看板還沒修好，先讓它全部亮起來吧。' };
      if (line === vv.answer) {
        state.solved = true;
        return { ok: true, solved: true, events: [{ text: `🚇 ${line} 線進站了！兩人擠上了車！` }] };
      }
      return { ok: true, correct: false, message: '🚇 這班車不對勁……回到月台了。', events: [{ text: `🚇 Slothy 搭上了 ${line} 線——不對勁，趕快回到月台！` }] };
    }
    default:
      return { ok: false };
  }
}

// 某一列變清楚（或通電）之後，檢查是不是全部都亮了
function finish(state, text) {
  const events = [{ text }];
  if (!state.allClear && allClear(state)) { state.allClear = true; events.push({ text: '📺 叮！看板全部亮起來了！' }); }
  return { ok: true, correct: true, events };
}

// 機票上的機場與登機時間跟著這一場的變化走（場景 1 拿到機票時就已經是這個）
function docPatch(v) { return { ticket: { airport: VARIANTS[v].airport, boarding: clock(VARIANTS[v].boarding) } }; }

function answers(state) {
  const vv = VARIANTS[state.v];
  const arrive = vv.boarding - 120, latest = arrive - vv.travel[vv.airport];
  const fix = LINES.filter((l) => l !== vv.lit).map((l) => `${l} 線＝${SYM_ZH[vv.sym[l]]}、頻道 ${vv.ch[l]}`).join('；');
  return {
    fix: `${fix}。`,
    clue: `機票 ${clock(vv.boarding)} 從 ${vv.airport} 登機、便條說提前 2 小時，所以 ${clock(arrive)} 前要到 ${vv.airport}；地圖上 ${vv.airport} 在 ${vv.map[vv.airport]}；路人說要 ${vv.travel[vv.airport]} 分鐘，所以 ${clock(latest)} 前要上車（${latest - vv.now} 分鐘內）。`,
    line: `${vv.answer} 線：往 ${vv.map[vv.airport]}，${vv.rows.find((r) => r[0] === vv.answer)[2]} 分鐘後就進站。`,
  };
}
function solution(v) { const vv = VARIANTS[v]; return { line: vv.answer, lit: vv.lit, sym: vv.sym, ch: vv.ch }; }

module.exports = { init, view, act, answers, solution, docPatch, clock, LINES, VARIANTS: VARIANTS.length, _VARIANTS: VARIANTS };
