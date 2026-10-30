// 場景 3：機場（炸彈客預警）——5 種變化，每場遊戲隨機抽一種
// 開場（兩人同畫面，前端演出）：大廳 → 兩人走進來 → 廣播 → 警察衝進來 → 兩人對話（去拆炸彈／一起抓犯人）→ 各自的畫面。
//   Slothy(B) 視角 0：和警察圍著地上打開的行李箱：一堆真實的雜物裡，信用卡（卡號、名字）、
//             關鍵衣物（看季節／活動）、小物（墨鏡、雪鏡、腳架……）比較明顯，可以點開放大。上方「選擇登機口」由 Slothy 按。
//   Slothy(B) 視角 1：電腦上的 terminal（黑底綠字）。駭客關卡時，這裡顯示線條圖形題目。
//   Raccoony(A) 視角 0：大廳＋航班看板（今天日期、8 個航班：4 個目的地 × 同一家航空公司 2 班）。
//   Raccoony(A) 視角 1：電腦分割畫面：左邊 4 則旅遊貼文（地點＋兩張照片），右邊 terminal（選航空公司、選答案、看旅客名單）。
// 解法：衣物＋小物 → 去玩水還是冷的地方、做什麼活動；看板日期 → 紐約現在什麼季節（南半球相反）→ 目的地。
//       看板上飛往那裡的航空公司 → Slothy 在電腦上駭進那家航空公司（選錯鎖 30 秒）→ 3 道 15 秒的圖形題 →
//       Raccoony 的螢幕出現旅客名單：卡上的名字只在一班 → 看板上那班的登機口。
// 祕密（答案、登機口、旅客名單）只存在伺服器；B 看不到看板、貼文、名單，A 看不到行李內容。

const { T } = require('../i18n');

const MAX_GATE = 60;
const STEP_MS = 15000;
const LOCK_MS = 30000;
// 炸彈倒數：開場對話結束時開始，10 分鐘（開場動畫約 15 秒）
const BOMB_LEAD_MS = 15000, BOMB_MS = 10 * 60 * 1000;
const BOOM_MS = 4000; // 爆炸畫面的長度，之後重播機場開場

// 航空公司（虛構）：看板上的 8 班都是這兩家，terminal 也只列這兩家
const AIRLINES = [
  { code: 'BB', name: 'BLUEBIRD AIRLINES', zh: '藍鳥航空' },
  { code: 'PS', name: 'POLAR STAR AIR', zh: '北極星航空' },
];
// 四個目的地：同一家航空公司飛兩個地方，兩兩的衣物一樣
//   雪梨／里斯本：都去海邊衝浪（衣物、小物都一樣）→ 只能靠「今天紐約是夏天還是冬天」分
//   北海道／雷克雅維克：都很冷（衣物一樣）→ 靠小物分（雪鏡＝滑雪、腳架＝拍極光）
const DESTS = [
  { id: 'syd', board: 'DEL', city: 'Sydney', cityZh: '雪梨', air: 'BB', kind: 'beach', place: T('雪梨，澳洲', 'Sydney, Australia') },
  { id: 'lis', board: 'HKA', city: 'Lisbon', cityZh: '里斯本', air: 'BB', kind: 'beach', place: T('里斯本，葡萄牙', 'Lisbon, Portugal') },
  { id: 'hok', board: 'VRN', city: 'Sapporo', cityZh: '札幌（北海道）', air: 'PS', kind: 'ski', place: T('北海道，日本', 'Hokkaido, Japan') },
  { id: 'rek', board: 'QOM', city: 'Reykjavík', cityZh: '雷克雅維克', air: 'PS', kind: 'aurora', place: T('雷克雅維克，冰島', 'Reykjavík, Iceland') },
];
const PACK = {
  beach: { clothing: ['bikini', 'tshirt'], gadget: ['sunglasses'] },
  ski: { clothing: ['sweater', 'downjacket'], gadget: ['goggles'] },
  aurora: { clothing: ['sweater', 'downjacket'], gadget: ['tripod'] },
};

// 每個變化：今天的日期（紐約，月/日）、答案、卡上的名字
const VARIANTS = [
  { date: [1, 15], answer: 'syd', name: 'TIFFANY' },
  { date: [7, 8], answer: 'lis', name: 'SADIE' },
  { date: [1, 22], answer: 'hok', name: 'HANNI' },
  { date: [12, 12], answer: 'rek', name: 'TIFFANY' },
  { date: [8, 3], answer: 'lis', name: 'HANNI' },
];
const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const OTHERS = ['OLIVER', 'EMMA', 'LIAM', 'NOAH', 'AVA', 'MIA', 'LUCAS', 'ZOE', 'ETHAN', 'CHLOE', 'MASON', 'LILY', 'JACK', 'GRACE', 'LEO', 'RUBY', 'MAX', 'ELLA', 'SAM', 'NORA', 'OWEN', 'IVY'];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 看板（8 班）＋ 旅客名單：用固定的種子，每個變化的時間、航班號碼、登機口、名單都不同
function build(v) {
  const r = rng(1000 + v * 97);
  const vv = VARIANTS[v];
  const gates = [], nums = [];
  while (gates.length < 8) { const g = 1 + Math.floor(r() * 48); if (!gates.includes(g)) gates.push(g); }
  while (nums.length < 8) { const n = 100 + Math.floor(r() * 899); if (!nums.includes(n)) nums.push(n); }
  let k = 0;
  const flights = DESTS.flatMap((d) => [0, 1].map(() => {
    const i = k++;
    return { dest: d.id, flight: `${d.air} ${nums[i]}`, board: d.board, gate: gates[i], t: 20 * 60 + Math.floor(r() * 36) * 5 }; // 晚上的班機（跟地鐵站的時間一致）
  }));
  flights.sort((a, b) => a.t - b.t);
  flights.forEach((f) => { f.time = `${String(Math.floor(f.t / 60)).padStart(2, '0')}:${String(f.t % 60).padStart(2, '0')}`; });
  // 答案那家航空公司的 4 班：名字出現在兩個目的地各一班（其中一班是答案）
  const air = DESTS.find((d) => d.id === vv.answer).air;
  const pool = shuffle(OTHERS, r);
  const mine = flights.filter((f) => f.flight.startsWith(air + ' '));
  const two = mine.filter((f) => f.dest === vv.answer);
  const target = two[Math.floor(r() * 2)].flight; // 名字只出現在這一班
  const manifest = mine.map((f) => {
    const names = pool.splice(0, f.flight === target ? 4 : 5);
    if (f.flight === target) names.splice(Math.floor(r() * 5), 0, vv.name);
    return { flight: f.flight, names };
  }).sort((a, b) => a.flight.localeCompare(b.flight));
  const cardNo = `4${Math.floor(r() * 900 + 100)} ${Math.floor(r() * 9000 + 1000)} ${Math.floor(r() * 9000 + 1000)} ${Math.floor(r() * 9000 + 1000)}`;
  return { flights, manifest, air, cardNo, target };
}
const BUILT = VARIANTS.map((_, v) => build(v));

// ---------- 駭客關卡：3 道圖形題（第一次照原設計；重試時隨機變化）----------
// 2. 拼半邊：每一列「左半邊 + 右半邊 = 第三格」；圖形是 n 邊形、中間一個圓（實心／空心／上半實心／下半實心）
//    問號固定在第三列第二格（缺的是右半邊）。準備三種變化，重試時輪流換。
//    選項字串：「邊-幾邊形-圓」，例如 R-8-top ＝ 八邊形的右半邊、圓上半實心下半空心
const HALVES = [
  { rows: [[5, 'solid'], [6, 'hollow'], [8, 'top']], wrong: ['R-8-bottom', 'L-8-top'], order: [1, 0, 2] },
  { rows: [[3, 'hollow'], [4, 'solid'], [6, 'bottom']], wrong: ['R-6-top', 'R-5-bottom'], order: [2, 1, 0] },
  { rows: [[6, 'top'], [5, 'solid'], [7, 'hollow']], wrong: ['R-7-solid', 'L-7-hollow'], order: [0, 2, 1] },
];
function puzzles(v, attempt) {
  const r = rng(5000 + v * 131 + attempt * 17);
  const canon = attempt === 0;
  // 1. 大樓：最下面 1F、最上面 nF，「?」那層就是答案
  const n = canon ? 6 : 5 + Math.floor(r() * 3);
  const tgt = canon ? 4 : 2 + Math.floor(r() * (n - 2));
  let other = tgt; while (other === tgt || other === n) other = 2 + Math.floor(r() * (n - 2)) || 2;
  if (other === tgt) other = tgt === 2 ? 3 : 2;
  const p1 = { kind: 'floors', fig: { n, mark: tgt }, opts: canon ? ['2F', '6F', '4F'] : shuffle([`${tgt}F`, `${n}F`, `${other}F`], r), answer: `${tgt}F` };
  // 2. 拼半邊
  const H = HALVES[attempt % HALVES.length];
  const [ln, lf] = H.rows[2], ans2 = `R-${ln}-${lf}`;
  const pool = [ans2, ...H.wrong];
  const p2 = { kind: 'halves', fig: H.rows.flatMap(([k, f], i) => [`L-${k}-${f}`, i === 2 ? null : `R-${k}-${f}`, `F-${k}-${f}`]), opts: H.order.map((i) => pool[i]), answer: ans2 };
  // 3. 箭頭轉一轉（0 上 1 右 2 下 3 左）：中間的數字說第一個箭頭要轉幾個 90°（＋順時針、－逆時針），第三格是轉完的樣子
  //    問號在第三列第一格：要從結果倒推回去
  const turn = (d, k) => (((d + k) % 4) + 4) % 4;
  let rows;
  if (canon) rows = [[0, 1], [2, -1], [null, -3, 3]];
  else {
    const ks = [1, 2, 3].flatMap((k) => [k, -k]);
    rows = [[Math.floor(r() * 4), ks[Math.floor(r() * 6)]], [Math.floor(r() * 4), ks[Math.floor(r() * 6)]], [null, ks[Math.floor(r() * 6)], Math.floor(r() * 4)]];
    if (Math.sign(rows[0][1]) === Math.sign(rows[1][1])) rows[1][1] = -rows[1][1]; // 前兩列一個順時針、一個逆時針，規則才看得出來
  }
  const fmt = (k) => (k > 0 ? `+${k}` : `${k}`);
  const g3 = [rows[0][0], fmt(rows[0][1]), turn(rows[0][0], rows[0][1]), rows[1][0], fmt(rows[1][1]), turn(rows[1][0], rows[1][1]), null, fmt(rows[2][1]), rows[2][2]];
  const ans3 = turn(rows[2][2], -rows[2][1]);
  const wrong3 = shuffle([0, 1, 2, 3].filter((d) => d !== ans3), r).slice(0, 2);
  const p3 = { kind: 'arrows', fig: g3, opts: canon ? [3, 1, 2] : shuffle([ans3, ...wrong3], r), answer: ans3 };
  return [p1, p2, p3];
}

function init(v = 0, boom = 0) { return { v, solved: false, boom, bombAt: Date.now() + (boom ? BOOM_MS : 0) + BOMB_LEAD_MS + BOMB_MS, hack: { phase: 'idle', step: 0, deadline: 0, lockUntil: 0, attempt: 0 } }; }

function hackView(state, role) {
  const h = state.hack, now = Date.now();
  if (h.phase === 'idle' && h.lockUntil > now) return { phase: 'locked', remain: h.lockUntil - now };
  const out = { phase: h.phase };
  if (h.phase === 'puzzle') {
    const p = puzzles(state.v, h.attempt)[h.step];
    Object.assign(out, { step: h.step, total: 3, remain: Math.max(0, h.deadline - now), kind: p.kind });
    if (role === 'A') out.opts = p.opts; else out.fig = p.fig;
  }
  if (h.phase === 'done' && role === 'A') out.manifest = BUILT[state.v].manifest;
  return out;
}

function view(state, role) {
  const vv = VARIANTS[state.v];
  const [m, d] = vv.date;
  const B = BUILT[state.v];
  if (role === 'A') {
    return {
      role,
      date: { m, d, label: `${MONTH_EN[m - 1]} ${String(d).padStart(2, '0')}`, long: T(`${m} 月 ${d} 日`, `${MONTH_EN[m - 1]} ${d}`) },
      flights: B.flights.map(({ flight, board, gate, time }) => ({ flight, dest: board, gate, time })), // 目的地只寫機場代碼（自創的，猜不出是哪裡；Slothy 牆上的面板有對照）
      posts: DESTS.map((x) => ({ id: x.id, place: x.place })),
      hack: hackView(state, 'A'),
      bomb: Math.max(0, state.bombAt - Date.now()), boom: state.boom,
    };
  }
  const dest = DESTS.find((x) => x.id === vv.answer);
  const pk = PACK[dest.kind];
  return {
    role, maxGate: MAX_GATE,
    card: { number: B.cardNo, name: vv.name },
    airlines: AIRLINES.map((x) => ({ code: x.code, name: x.name, zh: T(x.zh, '') })),
    codes: ['hok', 'syd', 'rek', 'lis'].map((id) => { const d = DESTS.find((x) => x.id === id); return { code: d.board, place: d.place }; }), // 牆上的機場代碼對照
    clothing: pk.clothing, gadgets: pk.gadget, // 只送圖示 id（畫面上不寫文字）
    hack: hackView(state, 'B'),
    bomb: Math.max(0, state.bombAt - Date.now()), boom: state.boom,
  };
}

function fail(state, why) {
  const h = state.hack;
  h.phase = 'retry'; h.step = 0; h.attempt += 1;
  return { ok: true, correct: false, message: why, events: [{ text: T('⛔ ACCESS DENIED——駭客失敗，重新來過！', '⛔ ACCESS DENIED. Hack failed, try again!') }] };
}

// 炸彈時間到：整個機場場景重來（同一個變化），兩邊畫面會先演爆炸再重播開場
function explode(state) {
  Object.assign(state, init(state.v, state.boom + 1));
  return { ok: true, boom: true, events: [{ text: T('💥 BOOM！炸彈爆炸了……時間倒回去，再試一次！', '💥 BOOM! The bomb went off… time rewinds, try again!') }] };
}

function act(state, role, a = {}) {
  const now = Date.now();
  if (a.type === 'bomb') return now >= state.bombAt - 1500 ? explode(state) : { ok: false };
  if (now > state.bombAt + 3000) return explode(state); // 沒人回報也一樣：時間到了就爆
  const h = state.hack;
  if (a.type === 'airline') {
    if (role !== 'B') return { ok: false, message: T('航空公司要在 Slothy 的電腦上選。', 'The airline is chosen on Slothy’s computer.') };
    if (h.phase !== 'idle' || h.lockUntil > now) return { ok: false };
    if (a.code === BUILT[state.v].air) {
      Object.assign(h, { phase: 'puzzle', step: 0, deadline: now + STEP_MS });
      return { ok: true, correct: true, events: [{ text: T('💻 連上資料庫了！破解防火牆：每題 15 秒！', '💻 Connected! Crack the firewall: 15 seconds per question!') }] };
    }
    h.lockUntil = now + LOCK_MS;
    return { ok: true, correct: false, message: T('⛔ 不是這家航空公司！安全系統鎖住 30 秒。', '⛔ Wrong airline! The security system locked you out for 30 seconds.'), events: [{ text: T('🚨 駭錯資料庫了！被鎖住 30 秒……', '🚨 Wrong database! Locked out for 30 seconds…') }] };
  }
  if (a.type === 'hack') {
    if (role !== 'A' || h.phase !== 'puzzle') return { ok: false };
    if (now > h.deadline + 1500) return fail(state, T('⏰ 時間到了！', '⏰ Time’s up!'));
    const p = puzzles(state.v, h.attempt)[h.step];
    if (String(a.choice) !== String(p.answer)) return fail(state, T('❌ 答錯了！', '❌ Wrong answer!'));
    h.step += 1;
    if (h.step >= 3) { h.phase = 'done'; return { ok: true, correct: true, events: [{ text: T('✅ ACCESS GRANTED！旅客名單出現在 Raccoony 的螢幕上。', '✅ ACCESS GRANTED! The passenger list is on Raccoony’s screen.') }] }; }
    h.deadline = now + STEP_MS;
    return { ok: true, correct: true };
  }
  if (a.type === 'hack_timeout') {
    if (h.phase !== 'puzzle' || now < h.deadline - 800) return { ok: false };
    return fail(state, T('⏰ 時間到了！', '⏰ Time’s up!'));
  }
  if (a.type === 'hack_retry') {
    if (role !== 'A' || h.phase !== 'retry') return { ok: false };
    Object.assign(h, { phase: 'puzzle', step: 0, deadline: now + STEP_MS });
    return { ok: true };
  }
  if (a.type !== 'gate') return { ok: false };
  if (role !== 'B') return { ok: false, message: T('選登機口的按鈕在 Slothy 那邊。', 'The gate picker is on Slothy’s side.') };
  const n = Number(a.gate);
  if (!Number.isInteger(n) || n < 1 || n > MAX_GATE) return { ok: false };
  const right = solution(state.v).gate;
  if (n === right) {
    state.solved = true;
    return { ok: true, solved: true, events: [{ text: T(`✈️ ${n} 號登機口！嫌犯就在這裡！`, `✈️ Gate ${n}! The suspect is here!`) }] };
  }
  return { ok: true, correct: false, message: T(`🚪 ${n} 號登機口空蕩蕩的，不是這裡。`, `🚪 Gate ${n} is empty. Not here.`), events: [{ text: T(`🚪 Slothy 跑去 ${n} 號登機口——撲了個空。`, `🚪 Slothy ran to gate ${n}… nobody there.`) }] };
}

function answers(state) {
  const vv = VARIANTS[state.v];
  const B = BUILT[state.v];
  const d = DESTS.find((x) => x.id === vv.answer);
  const f = B.flights.find((x) => x.flight === B.target);
  const air = AIRLINES.find((x) => x.code === d.air);
  const [m, day] = vv.date;
  const nySummer = m >= 5 && m <= 9;
  const why = {
    beach: T(`海邊的行李，紐約現在是${nySummer ? '夏天' : '冬天'}：目的地是${d.cityZh}。`, `Beach luggage, and it’s ${nySummer ? 'summer' : 'winter'} in New York: it’s ${d.city}.`),
    ski: T(`冷天的衣服＋雪鏡：去${d.cityZh}滑雪。`, `Cold-weather clothes + ski goggles: skiing in ${d.city}.`),
    aurora: T(`冷天的衣服＋腳架：去${d.cityZh}拍極光。`, `Cold-weather clothes + tripod: northern lights in ${d.city}.`),
  }[d.kind];
  return {
    clue: T(`${why.zh}Slothy 駭入飛那裡的 ${air.name}。`, `${why.en} Slothy hacks ${air.name}, which flies there.`),
    gate: T(`${vv.name} 在 ${f.flight}：${f.gate} 號登機口。`, `${vv.name} is on ${f.flight}: gate ${f.gate}.`),
  };
}
function solution(v) {
  const B = BUILT[v];
  const f = B.flights.find((x) => x.flight === B.target);
  return { answer: VARIANTS[v].answer, gate: f.gate, flight: f.flight, air: B.air, name: VARIANTS[v].name, month: VARIANTS[v].date[0], puzzles: puzzles(v, 0).map((p) => p.answer), puzzlesAt: (k) => puzzles(v, k).map((p) => p.answer) };
}

module.exports = { init, view, act, answers, solution, VARIANTS: VARIANTS.length, AIRLINES };
