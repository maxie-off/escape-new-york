// 場景 2：168 Street 地鐵月台（5 種變化，每場遊戲隨機抽一種）
//   Raccoony(A)：月台磚牆 + 電子看板。看板壞了：一開始只有一列（沒用的那條線）完整亮著，
//                其他列只看得到線路圓標和左邊的小符號。看板右側每列有一個頻道旋鈕（1~9）。手上有機票（機場、登機時間）。
//   Slothy(B)：視角 1 月台：柱子上的路線圖（每條線開到哪一站、哪一站是機場、從 168 街搭過去要幾分鐘）、選路線按鈕。
//             視角 2 電箱：5 條斷掉的電線（牌子正面是線路、背面是頻道數字）、5 個印著符號的接頭，每個接頭上方有閘門。
// 修看板（兩人互相交換資訊）：
//   1. Slothy 把某條線的電線接到「那條線在看板上的符號」的接頭（符號只有 Raccoony 看得到），再打開閘門。
//   2. Raccoony 把那列的旋鈕轉到電線牌背面的頻道（只有 Slothy 看得到），雜訊才消失。
//   3. 五列全亮，Slothy 才能選路線；這時兩邊各有一個路人走過來聊天：「聽說今天 X 線在施工，改走 Y 線」。
// 解法：機票 → 哪個機場、幾點前要到（登機前 2 小時）；看板 → 每條線開往哪一站、幾分鐘後進站；
//       路線圖 → 那一站是不是機場、要搭多久。開往機場那一站的有兩條線，但兩條今天都在施工：
//       一條改走的線還是會到機場（答案，比較晚進站但來得及），另一條改走的線不會到（比較早進站，誤導）。
// 祕密（正確路線、符號、頻道）只存在伺服器；前端只會收到「該角色此刻看得到」的內容。

const { T } = require('../i18n');

const LINES = ['B', 'C', 'E', '1', '2'];
const SYMS = ['tri', 'circ', 'sq', 'star', 'dia'];
// 路線圖上的終點站（位置固定）；ap = 這一站是哪個機場
const STOPS = [
  { id: 'hb', name: 'Howard Beach', ap: 'JFK' },
  { id: 'as', name: 'Astoria', ap: 'LGA' },
  { id: 'nw', name: 'Newark', ap: 'EWR' },
  { id: 'ci', name: 'Coney Island' },
  { id: 'fb', name: 'Flatbush Av' },
  { id: 'bp', name: 'Bronx Park' },
];
const STOP = Object.fromEntries(STOPS.map((x) => [x.id, x]));

// now：看板時間（分鐘，從午夜算）；boarding：機票登機時間；airport：機票上的機場；travel：路線圖上從 168 街到各機場的分鐘數
// routes：每條線（看板 5 條 + 施工改走的 2 條）開到哪一站；rows：看板 [線, 下一班, 再下一班]
// works：今天施工的兩條線 → 改走哪一條；answer：正確的線；lit：一開始就完整亮著的線
// tell：哪個路人說哪一條施工（A＝Raccoony 那邊、B＝Slothy 那邊）
// sym / ch：每條線在看板上的符號、電線牌背面的頻道；terms：電箱裡接頭由左到右的符號
const VARIANTS = [
  { now: 600, boarding: 840, airport: 'JFK', travel: { JFK: 95, LGA: 80, EWR: 100 },
    routes: { B: 'ci', C: 'hb', E: 'hb', 1: 'bp', 2: 'as', A: 'hb', F: 'fb' },
    rows: [['B', 3, 13], ['C', 14, 24], ['E', 6, 16], ['1', 30, 40], ['2', 9, 18]], works: { C: 'A', E: 'F' }, tell: { A: 'E', B: 'C' }, answer: 'C', lit: 'B',
    sym: { B: 'tri', C: 'circ', E: 'sq', 1: 'star', 2: 'dia' }, ch: { B: 4, C: 7, E: 2, 1: 9, 2: 5 }, terms: ['star', 'circ', 'dia', 'tri', 'sq'] },
  { now: 580, boarding: 810, airport: 'LGA', travel: { JFK: 105, LGA: 90, EWR: 95 },
    routes: { B: 'as', C: 'hb', E: 'as', 1: 'ci', 2: 'nw', D: 'fb', 7: 'as' },
    rows: [['B', 5, 15], ['C', 8, 18], ['E', 12, 22], ['1', 9, 19], ['2', 4, 14]], works: { B: 'D', E: '7' }, tell: { A: 'E', B: 'B' }, answer: 'E', lit: '1',
    sym: { B: 'dia', C: 'tri', E: 'star', 1: 'circ', 2: 'sq' }, ch: { B: 3, C: 8, E: 1, 1: 6, 2: 4 }, terms: ['sq', 'tri', 'circ', 'star', 'dia'] },
  { now: 615, boarding: 870, airport: 'EWR', travel: { JFK: 100, LGA: 85, EWR: 110 },
    routes: { B: 'nw', C: 'as', E: 'hb', 1: 'nw', 2: 'fb', A: 'ci', 3: 'nw' },
    rows: [['B', 7, 17], ['C', 5, 14], ['E', 11, 21], ['1', 18, 28], ['2', 3, 12]], works: { B: 'A', 1: '3' }, tell: { A: 'B', B: '1' }, answer: '1', lit: 'C',
    sym: { B: 'sq', C: 'star', E: 'dia', 1: 'tri', 2: 'circ' }, ch: { B: 6, C: 2, E: 9, 1: 3, 2: 7 }, terms: ['circ', 'dia', 'tri', 'sq', 'star'] },
  { now: 590, boarding: 825, airport: 'JFK', travel: { JFK: 100, LGA: 75, EWR: 90 },
    routes: { B: 'fb', C: 'hb', E: 'as', 1: 'bp', 2: 'hb', F: 'hb', 7: 'bp' },
    rows: [['B', 6, 16], ['C', 4, 14], ['E', 8, 18], ['1', 20, 30], ['2', 13, 23]], works: { C: '7', 2: 'F' }, tell: { A: '2', B: 'C' }, answer: '2', lit: 'E',
    sym: { B: 'circ', C: 'dia', E: 'tri', 1: 'sq', 2: 'star' }, ch: { B: 5, C: 1, E: 8, 1: 2, 2: 6 }, terms: ['dia', 'star', 'sq', 'circ', 'tri'] },
  { now: 605, boarding: 855, airport: 'LGA', travel: { JFK: 95, LGA: 115, EWR: 105 },
    routes: { B: 'as', C: 'ci', E: 'as', 1: 'fb', 2: 'nw', D: 'as', A: 'bp' },
    rows: [['B', 10, 20], ['C', 7, 17], ['E', 3, 13], ['1', 15, 25], ['2', 5, 14]], works: { E: 'A', B: 'D' }, tell: { A: 'B', B: 'E' }, answer: 'B', lit: '2',
    sym: { B: 'star', C: 'sq', E: 'circ', 1: 'dia', 2: 'tri' }, ch: { B: 9, C: 4, E: 3, 1: 7, 2: 1 }, terms: ['tri', 'sq', 'star', 'dia', 'circ'] },
];
const SYM_ZH = { tri: T('三角形', 'triangle'), circ: T('圓形', 'circle'), sq: T('方形', 'square'), star: T('星形', 'star'), dia: T('菱形', 'diamond') };

const clock = (m) => { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`; };

// 路人（看板全亮之後才出現）：一個在 Raccoony 那邊、一個在 Slothy 那邊，各說一條施工的線
const PASSER = { A: 'banker', B: 'artist' };
function passerOf(vv, role) {
  const l = vv.tell[role], to = vv.works[l];
  return { id: PASSER[role], lines: [T('聽說今天', 'I heard the'), T(`${l} 線在施工，`, `${l} line is under construction,`), T(`會改走 ${to} 線喔。`, `so it’s running on the ${to} line today.`)] };
}
// 柱子上的路線圖：終點站 + 機場 + 分鐘數 + 每條線開到哪
const mapOf = (vv) => ({ stops: STOPS.map((x) => ({ id: x.id, name: x.name, ap: x.ap || null, min: x.ap ? vv.travel[x.ap] : null })), routes: Object.entries(vv.routes).map(([line, stop]) => ({ line, stop })) });

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
        rows: vv.rows.map(([line, next, then]) => {
          const to = STOP[vv.routes[line]].name;
          const st = clear(state, line) ? 'clear' : state.powered[line] ? 'static' : 'dark';
          return st === 'clear' ? { line, sym: vv.sym[line], state: st, dial: state.dial[line], fixed: line === vv.lit, to, next, then }
            : { line, sym: vv.sym[line], state: st, dial: state.dial[line] };
        }),
      },
      flash: state.flash,
      allClear: state.allClear,
      passer: state.allClear ? passerOf(vv, 'A') : null,
    };
  }
  return {
    role,
    passer: state.allClear ? passerOf(vv, 'B') : null,
    lines: LINES,
    map: mapOf(vv), // 柱子上的路線圖
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
      if (role !== 'B') return { ok: false, message: T('電箱在 Slothy 那邊。', 'The electric box is on Slothy’s side.') };
      if (!LINES.includes(line) || state.powered[line]) return { ok: false };
      const term = a.term === null ? null : String(a.term || '');
      if (term !== null && !SYMS.includes(term)) return { ok: false };
      if (term !== null) for (const l of LINES) if (state.conn[l] === term && !state.powered[l]) state.conn[l] = null;
      if (term !== null && LINES.some((l) => state.conn[l] === term && state.powered[l])) return { ok: false, message: T('這個接頭已經接好了。', 'That socket is already connected.') };
      state.conn[line] = term;
      return { ok: true };
    }
    case 'gate': {
      // 打開某個接頭上方的閘門：接對了那列通電；接錯閘門跳回去、那列閃紅光
      if (role !== 'B') return { ok: false, message: T('電箱在 Slothy 那邊。', 'The electric box is on Slothy’s side.') };
      const term = String(a.term || '');
      if (!SYMS.includes(term)) return { ok: false };
      const l = LINES.find((x) => state.conn[x] === term);
      if (!l) return { ok: true, message: T('這個閘門下面沒有接電線。', 'There’s no wire under this switch.') };
      if (state.powered[l]) return { ok: true };
      if (vv.sym[l] !== term) {
        state.flashN += 1; state.flash = { line: l, n: state.flashN };
        return { ok: true, correct: false, message: T('啪！閘門跳回去了。', 'Snap! The switch flipped back.'), events: [{ text: T(`⚡ 啪！閘門跳了回去，看板上 ${l} 線那一列閃了一下紅光。`, `⚡ Snap! The switch flipped back, and the ${l} line row flashed red on the board.`) }] };
      }
      state.powered[l] = true;
      return finish(state, clear(state, l) ? T(`⚡ 喀噠！${l} 線那一列亮了起來，資訊很清楚！`, `⚡ Click! The ${l} line row lit up, and it’s clear!`) : T(`⚡ 喀噠！${l} 線那一列亮了起來……可是畫面全是雜訊。`, `⚡ Click! The ${l} line row lit up… but it’s all static.`));
    }
    case 'tune': {
      // Raccoony 轉看板右側的頻道旋鈕
      if (role !== 'A') return { ok: false, message: T('看板在 Raccoony 那邊。', 'The board is on Raccoony’s side.') };
      const ch = Number(a.ch);
      if (!LINES.includes(line) || !Number.isInteger(ch) || ch < 1 || ch > 9) return { ok: false };
      if (line === vv.lit) return { ok: true };
      const was = clear(state, line);
      state.dial[line] = ch;
      if (!was && clear(state, line)) return finish(state, T(`📺 ${line} 線的資訊清楚了！`, `📺 The ${line} line info is clear now!`));
      return { ok: true };
    }
    case 'board': {
      if (role !== 'B') return { ok: false, message: T('選路線的按鈕在 Slothy 那邊。', 'The line picker is on Slothy’s side.') };
      if (!LINES.includes(line)) return { ok: false };
      if (!state.allClear) return { ok: true, message: T('看板還沒修好，先讓它全部亮起來吧。', 'The board isn’t fixed yet. Light it all up first.') };
      if (line === vv.answer) {
        state.solved = true;
        return { ok: true, solved: true, events: [{ text: T(`🚇 ${line} 線進站了！兩人擠上了車！`, `🚇 The ${line} train pulls in! They squeeze aboard!`) }] };
      }
      return { ok: true, correct: false, message: T('🚇 這班車不對勁……回到月台了。', '🚇 Something’s off about this train… back to the platform.'), events: [{ text: T(`🚇 Slothy 搭上了 ${line} 線——不對勁，趕快回到月台！`, `🚇 Slothy got on the ${line} train — wrong one! Back to the platform!`) }] };
    }
    default:
      return { ok: false };
  }
}

// 某一列變清楚（或通電）之後，檢查是不是全部都亮了
function finish(state, text) {
  const events = [{ text }];
  if (!state.allClear && allClear(state)) { state.allClear = true; events.push({ text: T('📺 叮！看板全部亮起來了！', '📺 Ding! The whole board is lit up!') }); }
  return { ok: true, correct: true, events };
}

// 機票上的機場與登機時間跟著這一場的變化走（場景 1 拿到機票時就已經是這個）
function docPatch(v) { return { ticket: { airport: VARIANTS[v].airport, boarding: clock(VARIANTS[v].boarding) } }; }

function answers(state) {
  const vv = VARIANTS[state.v];
  const arrive = vv.boarding - 120, latest = arrive - vv.travel[vv.airport];
  const ls = LINES.filter((l) => l !== vv.lit);
  const fix = T(ls.map((l) => `${l} 線＝${SYM_ZH[vv.sym[l]].zh}、頻道 ${vv.ch[l]}`).join('；') + '。', ls.map((l) => `${l} line = ${SYM_ZH[vv.sym[l]].en}, channel ${vv.ch[l]}`).join('; ') + '.');
  const stop = STOPS.find((x) => x.ap === vv.airport);
  const [p, q] = Object.keys(vv.works).sort((a, b) => (a === vv.answer) - (b === vv.answer));
  const wrongTo = STOP[vv.routes[vv.works[p]]].name;
  const next = vv.rows.find((r) => r[0] === vv.answer)[1];
  return {
    fix,
    clue: T(`機票 ${clock(vv.boarding)} 從 ${vv.airport} 登機、要提前 2 小時到，所以 ${clock(arrive)} 前要到；路線圖上 ${vv.airport} 在 ${stop.name} 站，從 168 街要 ${vv.travel[vv.airport]} 分鐘，所以 ${clock(latest)} 前要上車。看板上開往 ${stop.name} 的是 ${p} 線和 ${q} 線，但路人說這兩條今天都在施工。`,
      `Boarding is ${clock(vv.boarding)} at ${vv.airport} and you must arrive 2 hours early, so be there by ${clock(arrive)}. The map puts ${vv.airport} at ${stop.name}, ${vv.travel[vv.airport]} minutes from 168 St, so board by ${clock(latest)}. The board shows the ${p} and ${q} lines going to ${stop.name}, but the passers-by say both are under construction today.`),
    line: T(`${p} 線改走 ${vv.works[p]} 線，會開到 ${wrongTo}，到不了機場；${q} 線改走 ${vv.works[q]} 線，還是到 ${stop.name}。搭 ${q} 線（${next} 分鐘後進站，來得及）。`,
      `The ${p} line runs on the ${vv.works[p]} line to ${wrongTo}, which misses the airport; the ${q} line runs on the ${vv.works[q]} line and still reaches ${stop.name}. Take the ${q} line (arriving in ${next} minutes, still in time).`),
  };
}
function solution(v) { const vv = VARIANTS[v]; return { line: vv.answer, lit: vv.lit, sym: vv.sym, ch: vv.ch }; }

module.exports = { init, view, act, answers, solution, docPatch, clock, LINES, VARIANTS: VARIANTS.length, _VARIANTS: VARIANTS };
