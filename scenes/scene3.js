// 場景 3：機場（炸彈客預警）——5 種變化，每場遊戲隨機抽一種
// 開場（兩人同畫面，前端演出）：大廳 → 兩人從左下角走進來 → 廣播 → 廣播快結束時，警察從左右兩邊衝進來 → 各自的畫面。
//   Slothy(B)：和一群警察圍著地上一個打開的行李箱。警察說：嫌犯搶走了行李主人的登機證和護照、假扮成他；
//             行李裡是主人的衣物和物品——從衣物看天氣、從物品看活動，推理他要飛去哪裡。點開行李箱看每樣東西。
//             上方「選擇登機口」由 Slothy 按。
//   Raccoony(A)：大廳裡走來走去的旅客（沒有警察了）＋航班看板（今天的日期、10 個航班：時間、航班、目的地、登機口）。
//             按右邊箭頭 → 電腦螢幕上的網路新聞「今年十大旅遊勝地」（每個地方什麼季節、適合做什麼）。
// 解法：行李（B）→ 天氣＋活動；今天日期（A 的看板）→ 紐約是什麼季節；新聞（A）→ 哪個地方此刻是那種天氣、適合那種活動
//       （南半球季節相反）→ 看板上飛往那裡的航班 → 登機口。
// 祕密（答案、登機口對應）只存在伺服器；B 看不到看板與新聞，A 看不到行李內容。

const MAX_GATE = 60;

// 十大旅遊勝地（新聞內容；A 看得到）
const DESTS = [
  { id: 'syd', zh: '雪梨', en: 'SYDNEY', country: '澳洲', news: '南半球，季節和紐約相反。12～2 月是盛夏，邦代海灘是衝浪天堂；6～8 月是冬天。' },
  { id: 'hok', zh: '北海道', en: 'SAPPORO', country: '日本', news: '12～3 月大雪紛飛，二世谷是世界知名的滑雪場；7 月薰衣草花田盛開。' },
  { id: 'zqn', zh: '皇后鎮', en: 'QUEENSTOWN', country: '紐西蘭', news: '南半球。6～9 月是滑雪季；12～2 月夏天最適合玩高空彈跳。' },
  { id: 'rek', zh: '雷克雅維克', en: 'REYKJAVIK', country: '冰島', news: '9～3 月夜晚很長，帶上腳架和相機追極光；夏天幾乎沒有黑夜。' },
  { id: 'kyo', zh: '京都', en: 'OSAKA / KYOTO', country: '日本', news: '4 月初櫻花滿開，在樹下鋪野餐墊賞櫻；11 月滿山楓紅。（從大阪機場進出）' },
  { id: 'lis', zh: '里斯本', en: 'LISBON', country: '葡萄牙', news: '6～9 月陽光充足，是海邊衝浪的好季節；冬天又濕又冷。' },
  { id: 'bkk', zh: '曼谷', en: 'BANGKOK', country: '泰國', news: '一年四季都很熱；參觀寺廟要穿長褲、遮住肩膀。' },
  { id: 'cai', zh: '開羅', en: 'CAIRO', country: '埃及', news: '10～4 月比較涼爽，最適合騎駱駝看金字塔；夏天熱到 40 度。' },
  { id: 'hba', zh: '荷巴特', en: 'HOBART', country: '澳洲・塔斯馬尼亞', news: '南半球。5～8 月的冬夜，最有機會看到南極光。' },
  { id: 'hnl', zh: '檀香山', en: 'HONOLULU', country: '美國・夏威夷', news: '一年四季都溫暖，可以浮潛看海龜、學草裙舞。' },
];

// 行李裡可能出現的東西（前端依 id 畫圖；name 是點開時的說明）
const ITEMS = {
  sunglasses: '一副墨鏡', wetsuit: '一件衝浪防寒衣', surfwax: '一塊衝浪板蠟', tshirt: '幾件短袖 T 恤', shorts: '一條短褲', sunscreen: '一瓶防曬乳',
  skigloves: '一雙滑雪手套', goggles: '一副滑雪鏡', scarf: '一條厚圍巾', downjacket: '一件羽絨外套', jpbook: '一本旅遊會話手冊',
  beanie: '一頂毛帽', tripod: '一支三腳架', camera: '一台相機', thermos: '一個保溫瓶', picnic: '一張野餐墊', lightjacket: '一件薄外套',
  toothbrush: '一支牙刷', charger: '一個充電器', socks: '幾雙襪子',
};

// 每個變化：今天的日期（紐約，月/日）、答案、行李內容
const VARIANTS = [
  { date: [1, 15], answer: 'syd', items: ['sunglasses', 'wetsuit', 'surfwax', 'tshirt', 'shorts', 'sunscreen', 'toothbrush'] },
  { date: [1, 22], answer: 'hok', items: ['skigloves', 'goggles', 'scarf', 'downjacket', 'jpbook', 'socks'] },
  { date: [7, 8], answer: 'zqn', items: ['skigloves', 'goggles', 'beanie', 'downjacket', 'charger', 'socks'] },
  { date: [10, 18], answer: 'rek', items: ['tripod', 'camera', 'beanie', 'downjacket', 'thermos', 'toothbrush'] },
  { date: [4, 5], answer: 'kyo', items: ['picnic', 'lightjacket', 'jpbook', 'camera', 'charger'] },
];
const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const AIRLINE = { syd: 'QF', hok: 'NH', zqn: 'NZ', rek: 'FI', kyo: 'JL', lis: 'TP', bkk: 'TG', cai: 'MS', hba: 'VA', hnl: 'HA' };

// 看板：用固定的種子打亂，每個變化的時間、航班號碼、登機口都不同
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buildBoard(v) {
  const r = rng(1000 + v * 97);
  const gates = [];
  while (gates.length < DESTS.length) { const g = 1 + Math.floor(r() * 48); if (!gates.includes(g)) gates.push(g); }
  const flights = DESTS.map((d, i) => ({ id: d.id, flight: `${AIRLINE[d.id]} ${100 + Math.floor(r() * 899)}`, dest: d.en, destZh: d.zh, gate: gates[i], t: 12 * 60 + 10 + Math.floor(r() * 46) * 5 }));
  flights.sort((a, b) => a.t - b.t);
  return flights.map((f) => ({ ...f, time: `${String(Math.floor(f.t / 60)).padStart(2, '0')}:${String(f.t % 60).padStart(2, '0')}` }));
}
const BOARDS = VARIANTS.map((_, v) => buildBoard(v));

const POLICE = [
  ['嫌犯應該是搶走了行李主人的', '登機證和護照，假扮成他。'],
  ['行李裡裝的是主人的', '衣服和隨身物品。'],
  ['從衣服看天氣、從東西看活動，', '就能推理他要飛去哪裡！'],
];

function init(v = 0) { return { v, solved: false }; }

function view(state, role) {
  const vv = VARIANTS[state.v];
  const [m, d] = vv.date;
  if (role === 'A') {
    return {
      role,
      date: { m, d, label: `${MONTH_EN[m - 1]} ${String(d).padStart(2, '0')}`, zh: `${m} 月 ${d} 日` },
      flights: BOARDS[state.v].map(({ flight, dest, destZh, gate, time }) => ({ flight, dest, destZh, gate, time })),
      news: { title: '今年十大旅遊勝地', source: 'NYC Travel Daily', list: DESTS.map((x, i) => ({ rank: i + 1, zh: x.zh, country: x.country, text: x.news })) },
    };
  }
  return { role, maxGate: MAX_GATE, police: POLICE, items: vv.items.map((id) => ({ id, name: ITEMS[id] })) };
}

function act(state, role, a = {}) {
  if (a.type !== 'gate') return { ok: false };
  if (role !== 'B') return { ok: false, message: '選登機口的按鈕在 Slothy 那邊。' };
  const vv = VARIANTS[state.v];
  const n = Number(a.gate);
  if (!Number.isInteger(n) || n < 1 || n > MAX_GATE) return { ok: false };
  const right = BOARDS[state.v].find((f) => f.id === vv.answer).gate;
  if (n === right) {
    state.solved = true;
    return { ok: true, solved: true, events: [{ text: `✈️ ${n} 號登機口！嫌犯就在這裡！` }] };
  }
  return { ok: true, correct: false, message: `🚪 ${n} 號登機口空蕩蕩的，不是這裡。`, events: [{ text: `🚪 Slothy 跑去 ${n} 號登機口——撲了個空。` }] };
}

function answers(state) {
  const vv = VARIANTS[state.v];
  const d = DESTS.find((x) => x.id === vv.answer);
  const f = BOARDS[state.v].find((x) => x.id === vv.answer);
  const [m, day] = vv.date;
  return {
    clue: `今天是 ${m} 月 ${day} 日。南半球的季節和紐約相反；把行李裡的衣服（天氣）和東西（活動）對照新聞裡每個地方的季節介紹。`,
    gate: `行李主人要去${d.zh}（${d.country}）：看板上 ${f.flight} 飛 ${d.en}，在 ${f.gate} 號登機口。`,
  };
}
function solution(v) { const vv = VARIANTS[v]; const f = BOARDS[v].find((x) => x.id === vv.answer); return { answer: vv.answer, gate: f.gate, items: vv.items, month: vv.date[0] }; }

module.exports = { init, view, act, answers, solution, VARIANTS: VARIANTS.length };
