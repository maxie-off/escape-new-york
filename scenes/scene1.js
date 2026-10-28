// 場景 1：Raccoony 的房間（5 種變化，每場遊戲隨機抽一種）
// 流程：
//   電腦密碼：猜字遊戲。Slothy 衣櫃上的紙有三個猜測，Raccoony 書桌上的紙有另外三個，兩邊合起來推出密碼 → Raccoony 解鎖電腦
//   Raccoony 在 Notion 日記裡讀到鑰匙藏在哪種衣物裡；Slothy 的衣櫃地圖說那種衣物在第幾格；密碼本（只寫編號）有該格密碼
//   Slothy 打開那一格 → 拿到鑰匙。門牌寫「護照記得拿」；Raccoony 的便條說護照在床底下的箱子
//   Raccoony 有吉他譜（只有琴格數字），Slothy 床上有和弦表 → 拼出飛機行李箱的 4 個字母 → 護照
//   有鑰匙又有護照，點門把才會過關
// 祕密（密碼、抽屜對應關係）只存在伺服器；前端只會收到「該角色此刻看得到」的內容。

// ---- 5 種變化 ----
// 電腦密碼：1A2B 猜字遊戲。每種變化用不同的兩個代號字母（A/B、X/Z、P/Q…），
// 第一個代號＝字母對、位置也對；第二個代號＝字母對、位置不對。代號的意思不直接寫出來：
// Slothy 衣櫃上的紙左半邊是「10 月 1 日」一整局完整紀錄（最後寫出 answer），玩家從這局倒推代號的意思；
// 右半邊「10 月 3 日」有今天的前四個猜測，Raccoony 書桌上的紙也寫著「10 月 3 日」、有後三個猜測。
// （已用英文字典驗證：七條合起來只剩一個答案，任何一半單獨都不只一個。）
const PW = [
  { ans: 'acid', guesses: ['bold', 'pony', 'able', 'dime', 'milk', 'east', 'cold'], tag: ['A', 'B'], demo: { ans: 'node', guesses: ['snow', 'nick', 'dove', 'done'] } },
  { ans: 'mint', guesses: ['glow', 'kind', 'horn', 'gift', 'swim', 'plum', 'beat'], tag: ['X', 'Z'], demo: { ans: 'cake', guesses: ['lime', 'peak', 'bark', 'acme'] } },
  { ans: 'frog', guesses: ['chip', 'fuel', 'fond', 'farm', 'sock', 'page', 'word'], tag: ['P', 'Q'], demo: { ans: 'fish', guesses: ['wolf', 'shin', 'dish', 'fist'] } },
  { ans: 'lamp', guesses: ['loud', 'grab', 'sail', 'soap', 'town', 'beat', 'rope'], tag: ['K', 'M'], demo: { ans: 'road', guesses: ['dart', 'cord', 'read', 'load'] } },
  { ans: 'wave', guesses: ['chip', 'slow', 'very', 'five', 'land', 'fast', 'path'], tag: ['S', 'T'], demo: { ans: 'bird', guesses: ['crab', 'grid', 'brim', 'bind'] } },
];
// 回傳 [位置對, 字母對但位置不對]
function counts(g, ans) {
  let A = 0, B = 0;
  for (let i = 0; i < 4; i++) { if (g[i] === ans[i]) A++; else if (ans.includes(g[i])) B++; }
  return [A, B];
}
function feedback(g, ans, tag = ['A', 'B']) { const [A, B] = counts(g, ans); return `${A}${tag[0]}${B}${tag[1]}`; }
const row = (g, ans, tag) => ({ word: g.toUpperCase(), fb: feedback(g, ans, tag) });

// 衣櫃：抽屜由上往下的排列、鑰匙藏在哪一種衣物、每格密碼，每個變化都不同
const ITEMS = {
  tee: { item: 'T恤', emoji: '👕', plain: '👕 一疊整齊的 T 恤。', key: '👕 一疊 T 恤中間夾著一把鑰匙！', diary: '把它夾在一疊 T 恤中間' },
  hoodie: { item: '帽T', emoji: '🧥', plain: '🧥 幾件帽 T，沒有鑰匙。', key: '🧥 帽 T 的口袋裡有一把鑰匙！', diary: '把它塞進帽 T 的口袋裡' },
  jeans: { item: '牛仔褲', emoji: '👖', plain: '👖 牛仔褲口袋裡只有一張發票。', key: '👖 牛仔褲後口袋裡有一把鑰匙！', diary: '把它藏在牛仔褲的後口袋' },
  socks: { item: '襪子&內衣', emoji: '🧦', plain: '🧦 一堆襪子，沒有鑰匙。', key: '🧦 一堆襪子……底下壓著一把鑰匙！', diary: '把它塞在一堆襪子底下' },
  scarf: { item: '圍巾&毯子', emoji: '🧣', plain: '🧣 軟綿綿的圍巾和毯子。', key: '🧣 圍巾裡捲著一把鑰匙！', diary: '把它捲在圍巾裡' },
};
const WARDROBE = [
  { order: ['tee', 'hoodie', 'jeans', 'socks', 'scarf'], key: 'socks', codes: ['2290', '6613', '0958', '4827', '3175'] },
  { order: ['socks', 'jeans', 'tee', 'scarf', 'hoodie'], key: 'jeans', codes: ['5146', '7302', '8831', '2469', '0617'] },
  { order: ['scarf', 'tee', 'socks', 'hoodie', 'jeans'], key: 'scarf', codes: ['3958', '1204', '6672', '9013', '4485'] },
  { order: ['hoodie', 'socks', 'jeans', 'scarf', 'tee'], key: 'tee', codes: ['7741', '2036', '5590', '8124', '3367'] },
  { order: ['jeans', 'tee', 'hoodie', 'scarf', 'socks'], key: 'hoodie', codes: ['6208', '9375', '1452', '0839', '5761'] },
];
// 床底下三個行李箱的 4 位字母密碼（A~G）：飛機 / 秘密 / 情書
const CASE_CODES = [
  { plane: 'CDAF', secret: 'AGFC', love: 'DGBE' },
  { plane: 'GEAD', secret: 'BFCG', love: 'ECAB' },
  { plane: 'FBGE', secret: 'DACF', love: 'CGEA' },
  { plane: 'AECB', secret: 'GDFA', love: 'BEGD' },
  { plane: 'DFEG', secret: 'CBAD', love: 'FAGC' },
];
const NV = PW.length;

// 書桌牆上的便條紙（奇異筆字）
const DESK_NOTE = '記得提前登機時間 2 小時到達機場';
const NOTE2 = ['護照放在床底下的箱子裡'];

function build(v) {
  const pw = PW[v], wd = WARDROBE[v];
  const drawers = {};
  wd.order.forEach((id, i) => { drawers[i + 1] = { ...ITEMS[id], id, code: wd.codes[i], contents: id === wd.key ? ITEMS[id].key : ITEMS[id].plain }; });
  const keyDrawer = wd.order.indexOf(wd.key) + 1;
  const papers = [
    { id: 'paper1', kind: 'log', note: '10/3 那局最後差點猜到 Slothy 的答案……就把它設成電腦密碼了。',
      days: [
        { date: '10 月 1 日', rows: [...pw.demo.guesses, pw.demo.ans].map((g) => row(g, pw.demo.ans, pw.tag)), answer: pw.demo.ans.toUpperCase() },
        { date: '10 月 3 日', rows: pw.guesses.slice(0, 4).map((g) => row(g, pw.ans, pw.tag)), answer: '????' },
      ] },
    { id: 'paper2', kind: 'map', title: '🗺️ 衣櫃地圖', note: '抽屜從上往下數！', rows: Object.entries(drawers).map(([n, d]) => ({ n: Number(n), emoji: d.emoji, item: d.item })) },
  ];
  const notion = {
    pages: [
      { icon: '📓', title: '日記', blocks: [
        { t: 'h', text: '10 月 24 日 · 星期五' },
        { t: 'p', text: '終於訂好回台北的機票了！明天一早的飛機，行李也收好了。' },
        { t: 'p', text: '出門前得先找到房門鑰匙——昨晚太累，我隨手把它藏起來了。' },
        { t: 'p', text: `我記得……${ITEMS[wd.key].diary}，那樣最安全，Slothy 一定找不到 🦥` },
        { t: 'h', text: '10 月 23 日' },
        { t: 'p', text: '整理衣櫃，終於每個抽屜都分類好了！清單我印出來，放在衣櫃上面了。' },
        { t: 'p', text: '為了不忘記，每個抽屜的鎖密碼都記在「密碼本」裡（只記抽屜編號）。' },
      ] },
      { icon: '🔐', title: '密碼本', blocks: [{ t: 'table', head: ['東西', '密碼'], rows: [['🏋️ 健身房置物櫃', '3391'], ['📮 信箱', '1057'], ...Object.entries(drawers).map(([n, d]) => [`衣櫃 ${n}`, d.code])] }] },
      { icon: '✅', title: '待辦', blocks: [
        { t: 'todo', done: true, text: '訂機票 ✈️' }, { t: 'todo', done: true, text: '收行李' },
        { t: 'todo', done: false, text: '找到房門鑰匙！！！' }, { t: 'todo', done: false, text: '出門，回台北 🇹🇼' },
      ] },
    ],
  };
  const deskPaper = { date: '10 月 3 日（續）', rows: pw.guesses.slice(4).map((g) => row(g, pw.ans, pw.tag)) };
  return { password: pw.ans, tag: pw.tag, drawers, keyDrawer, papers, notion, deskPaper, codes: CASE_CODES[v] };
}
const BUILT = Array.from({ length: NV }, (_, v) => build(v));

// ---- 床底下三個行李箱的內容 ----
const CASES = {
  plane: { contents: { kind: 'passport' } },
  secret: { contents: { kind: 'secret' } },
  love: {
    contents: {
      kind: 'love',
      letters: [
        '親愛的 Slothy：\n你今天又睡過頭了，可是我還是很喜歡看你打呼的樣子。\n——Raccoony\nP.S. 最近買了很酷的共鳴鎖，我把手提箱的密碼設成我們喜歡的歌的和弦了。',
        'Raccoony：\n謝謝你每次都等我慢慢走。下次換我牽著你。\n——Slothy',
      ],
    },
  },
};
const NOT_THIS = '哇，恭喜你看到有趣的東西，但這不是你要找的。';

// ---- 吉他譜：遊戲自創的「和弦」指法（故意不是真實和弦，懂吉他也不能直接看出來）----
// 陣列由第 6 弦（最粗）到第 1 弦（最細）；null = 不彈，0 = 空弦，數字 = 按第幾格
const CHORDS = {
  A: [2, 0, null, 3, 1, 0],
  B: [null, 4, 1, 0, 2, null],
  C: [0, 3, 3, null, 0, 2],
  D: [1, null, 2, 4, 0, 1],
  E: [null, 1, 0, 2, 4, 3],
  F: [3, 2, null, 1, null, 0],
  G: [0, 0, 4, 2, 1, null],
};
// 三個行李箱只用顏色區分（箱子上沒有圖案）。共鳴鎖：
//   - 綠色（情書）箱子一開始就是開的，鎖停在它的密碼上；信裡的 P.S. 說密碼是「我們喜歡的歌的和弦」→ 對照第一張譜《情書》
//   - Raccoony 彈對某首歌，那個箱子的鎖會亮起來共鳴（教玩家：哪首歌對哪個箱子）
//   - 要開鎖：Slothy 轉好四個字母、按「準備」，10 秒內 Raccoony 要彈出同樣的四個和弦；彈完才知道成不成功
const CASE_COLOR = { plane: '咖啡色', secret: '粉紅色', love: '綠色' };
const ARM_MS = 10000, ARM_GRACE = 3000; // 準備後 10 秒內要彈；彈奏本身約 2 秒，加上網路延遲的寬限
// 前端只拿到「每個小節的琴格數字」，樂譜上不會出現和弦字母；和弦表（掛在 Slothy 床上方的牆上）才有字母。
const SONGS = [
  { id: 's3', title: '情書', box: 'love' },
  { id: 's2', title: '不能說的秘密', box: 'secret' },
  { id: 's1', title: '飛機場的十點半', box: 'plane' },
];
const sheetsOf = (v) => SONGS.map((s) => ({ id: s.id, title: s.title, bars: [...CASE_CODES[v][s.box]].map((c) => CHORDS[c]) }));
const chart = Object.keys(CHORDS).sort().map((name) => ({ name, frets: CHORDS[name] }));

function init(v = 0) {
  return {
    v,
    pcUnlocked: false,
    drawers: { 1: false, 2: false, 3: false, 4: false, 5: false }, // 是否已打開
    hasKey: false,
    hasPassport: false,
    cases: { plane: false, secret: false, love: true }, // 情書箱子一開始就是開的（教學用）
    armed: null, // Slothy 按了準備：{ case, code, t, n }
    armN: 0, glow: null, failN: 0,
    struck: [], // 1A2B 紙上 a~z 被劃掉的字母（兩人共用、同步）
    doorOpen: false,
    ticketTaken: false, // 書桌上的機票是否已收進收藏文件
  };
}

function view(state, role) {
  const B = BUILT[state.v];
  if (role === 'A') {
    return { role, pcUnlocked: state.pcUnlocked, notion: state.pcUnlocked ? B.notion : null, ticketTaken: state.ticketTaken, deskNote: DESK_NOTE, note2: NOTE2, deskPaper: B.deskPaper, sheets: sheetsOf(state.v),
      resonate: state.armed ? state.armed.n : null, // Slothy 按了準備：Raccoony 的吉他會自己震動
      struck: state.struck };
  }
  return {
    role,
    papers: B.papers,
    struck: state.struck,
    hasKey: state.hasKey,
    hasPassport: state.hasPassport,
    chart,
    cases: Object.fromEntries(Object.entries(state.cases).map(([k, open]) => [k, { open, contents: open ? CASES[k].contents : null, lock: k === 'love' ? B.codes.love : null }])),
    glow: state.glow || null, // Raccoony 彈對某首歌：那個箱子的鎖亮起來（n 每彈一次 +1）
    armed: state.armed ? { case: state.armed.case, n: state.armed.n } : null,
    failN: state.failN,
    drawers: Object.fromEntries(
      Object.entries(state.drawers).map(([n, open]) => [n, { open, contents: open ? B.drawers[n].contents : null }])
    ),
  };
}

// 回傳 { ok, correct?, message?(只給操作者), events?[{text}](全房間可見), solved? }
function act(state, role, a = {}) {
  const B = BUILT[state.v];
  switch (a.type) {
    case 'pc_password': {
      if (role !== 'A') return { ok: false, message: '這台電腦只有 Raccoony 搆得著。' };
      if (state.pcUnlocked) return { ok: true, correct: true };
      if (String(a.value || '').trim().toLowerCase() === B.password) {
        state.pcUnlocked = true;
        return { ok: true, correct: true, events: [{ text: '💻 電腦解鎖了！' }] };
      }
      return { ok: true, correct: false, message: '密碼錯誤', events: [{ text: '💻 電腦密碼輸入錯誤。' }] };
    }
    case 'drawer_code': {
      if (role !== 'B') return { ok: false, message: '這個衣櫃是 Slothy 那邊的。' };
      const n = Number(a.drawer);
      const d = B.drawers[n];
      if (!d) return { ok: false };
      if (state.drawers[n]) return { ok: true, correct: true };
      if (String(a.code || '').trim() !== d.code) {
        return { ok: true, correct: false, message: '密碼錯誤', events: [{ text: `🗄️ 第 ${n} 格抽屜的鎖沒有打開。` }] };
      }
      state.drawers[n] = true;
      if (n === B.keyDrawer) {
        state.hasKey = true;
        return { ok: true, correct: true, message: '🔑 找到房門鑰匙了！', events: [{ text: `🔑 第 ${n} 格打開了——房門鑰匙在這裡！` }] };
      }
      return { ok: true, correct: true, message: d.contents, events: [{ text: `🗄️ 第 ${n} 格抽屜打開了，但這裡沒有鑰匙。` }] };
    }
    case 'strum': {
      // Raccoony 在吉他上彈 4 個和弦；彈對某首歌的和弦進行，那個箱子的鎖就會亮起來共鳴
      if (role !== 'A') return { ok: false, message: '吉他在 Raccoony 那邊。' };
      const seq = String(a.chords || '').toUpperCase();
      if (!/^[A-G]{4}$/.test(seq)) return { ok: false };
      const hit = Object.keys(B.codes).find((k) => B.codes[k] === seq);
      if (hit) state.glow = { id: hit, n: ((state.glow && state.glow.n) || 0) + 1 };
      const arm = state.armed;
      if (arm) {
        state.armed = null;
        const inTime = Date.now() - arm.t <= ARM_MS + ARM_GRACE;
        if (inTime && arm.code === B.codes[arm.case] && seq === arm.code) return openCase(state, arm.case);
        state.failN += 1;
        return { ok: true, correct: false, message: '共鳴斷掉了……', events: [{ text: '🔒 喀！共鳴斷掉了，鎖又卡回去了。' }] };
      }
      if (!hit) return { ok: true, message: '彈了一段……好像什麼事都沒發生。' };
      return { ok: true, events: [{ text: `🎸 Raccoony 彈完一段……床底下${CASE_COLOR[hit]}箱子的鎖亮了起來，好像聽得懂這首歌！` }] };
    }
    case 'case_ready': {
      // Slothy 轉好四個字母、按「準備」：鎖開始等聲音（轉錯也能按，要等彈完才知道）
      if (role !== 'B') return { ok: false, message: '行李箱在 Slothy 那邊。' };
      if (!CASES[a.case] || state.cases[a.case]) return { ok: false };
      const code = String(a.code || '').trim().toUpperCase();
      if (!/^[A-G]{4}$/.test(code)) return { ok: false };
      state.armN += 1;
      state.armed = { case: a.case, code, t: Date.now(), n: state.armN };
      return { ok: true, events: [{ text: '🔊 鎖在嗡嗡震動，好像在等某個聲音……' }] };
    }
    case 'case_timeout': {
      // 10 秒到了還沒聽到聲音（由 Slothy 的畫面通知）
      if (!state.armed || Number(a.n) !== state.armed.n) return { ok: true };
      if (Date.now() - state.armed.t < ARM_MS) return { ok: true };
      state.armed = null; state.failN += 1;
      return { ok: true, correct: false, events: [{ text: '🔒 喀！沒等到聲音，鎖又卡回去了。' }] };
    }
    case 'strike': {
      // 1A2B 筆記：點紙上的 a~z 劃掉／恢復一個字母；兩人的紙同步
      const l = String(a.letter || '').toLowerCase();
      if (!/^[a-z]$/.test(l)) return { ok: false };
      state.struck = state.struck.includes(l) ? state.struck.filter((x) => x !== l) : [...state.struck, l].sort();
      return { ok: true };
    }
    case 'take_ticket': {
      if (role !== 'A') return { ok: false };
      state.ticketTaken = true;
      return { ok: true, docs: ['ticket'] };
    }
    case 'door_unlock': {
      if (role !== 'B') return { ok: false, message: '門把在 Slothy 那邊。' };
      if (!state.hasKey) return { ok: true, message: '🔒 門鎖著，需要鑰匙。' };
      if (!state.hasPassport) return { ok: true, message: '🛂 門牌寫著：護照記得拿！' };
      state.doorOpen = true;
      return { ok: true, solved: true, events: [{ text: '🚪 喀噠！房門打開了！' }] };
    }
    default:
      return { ok: false };
  }
}

function openCase(state, id) {
  state.cases[id] = true;
  if (id === 'plane') {
    state.hasPassport = true;
    return { ok: true, correct: true, docsTo: { B: ['passport'] }, events: [{ text: `🛂 共鳴成功！${CASE_COLOR.plane}箱子打開了——裡面是護照！` }] };
  }
  return { ok: true, correct: true, events: [{ text: `🧳 共鳴成功！${CASE_COLOR[id]}箱子打開了。${NOT_THIS}` }] };
}

// 給提示用的答案文字
function answers(state) {
  const B = BUILT[state.v];
  const d = B.drawers[B.keyDrawer];
  return {
    password: `電腦密碼是 ${B.password}。`,
    tag: `看 10 月 1 日那局：最後的答案已經寫出來了，拿它倒推每一行。${B.tag[0]}＝字母對、位置也對；${B.tag[1]}＝字母對、位置不對。`,
    keyItem: d.item,
    drawer: `鑰匙在第 ${B.keyDrawer} 格（${d.item}），密碼 ${d.code}。`,
    plane: `《飛機場的十點半》是 ${B.codes.plane}，彈它會讓${CASE_COLOR.plane}箱子的鎖亮。Slothy 把${CASE_COLOR.plane}箱子轉成 ${B.codes.plane}、按準備，Raccoony 在 10 秒內彈 ${B.codes.plane}。`,
  };
}
// 測試用：這個變化的完整解法
function solution(v) {
  const B = BUILT[v];
  return { password: B.password, tag: B.tag, drawer: B.keyDrawer, drawerCode: B.drawers[B.keyDrawer].code, codes: B.codes, guesses: PW[v].guesses, demo: PW[v].demo };
}

module.exports = { init, view, act, answers, solution, feedback, VARIANTS: NV };
