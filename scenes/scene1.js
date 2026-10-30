// 場景 1：Raccoony 的房間（5 種變化，每場遊戲隨機抽一種）
// 流程：
//   電腦密碼：猜字遊戲。Slothy 衣櫃上的紙有三個猜測，Raccoony 書桌上的紙有另外三個，兩邊合起來推出密碼 → Raccoony 解鎖電腦
//   Raccoony 在 Notion 日記裡讀到鑰匙藏在哪種衣物裡；Slothy 的衣櫃地圖說那種衣物在第幾格；密碼本（只寫編號）有該格密碼
//   Slothy 打開那一格 → 拿到鑰匙。門牌寫「護照記得拿」；Raccoony 的便條說護照在床底下的箱子
//   Raccoony 有吉他譜（只有琴格數字），Slothy 床上有和弦表 → 拼出飛機行李箱的 4 個字母 → 護照
//   有鑰匙又有護照，點門把才會過關
// 祕密（密碼、抽屜對應關係）只存在伺服器；前端只會收到「該角色此刻看得到」的內容。

// ---- 5 種變化 ----
// 電腦密碼：1A2B 猜字遊戲，但不用 A、B：每種變化用 S/F、X/Z、J/K 其中一組，而且組內誰代表什麼會互換。
// 第一個代號＝字母對、位置也對；第二個代號＝字母對、位置不對。代號的意思不直接寫出來：
// Slothy 衣櫃上的紙左半邊是「10 月 1 日」那局的四個猜測（沒有全對的那一行，最多 3 個位置對）＋寫在下面的 answer，玩家拿 answer 倒推代號的意思；
// 右半邊「10 月 3 日」有今天的前四個猜測，Raccoony 書桌上的紙也寫著「10 月 3 日」、有後三個猜測。
// （已用英文字典驗證：七條合起來只剩一個答案，任何一半單獨都不只一個。）
const { T } = require('../i18n');

const PW = [
  { ans: 'acid', guesses: ['bold', 'pony', 'able', 'dime', 'milk', 'east', 'cold'], tag: ['S', 'F'], demo: { ans: 'node', guesses: ['snow', 'nick', 'dove', 'note'] } },
  { ans: 'mint', guesses: ['glow', 'kind', 'horn', 'gift', 'swim', 'plum', 'beat'], tag: ['Z', 'X'], demo: { ans: 'cake', guesses: ['lime', 'peak', 'acme', 'cave'] } },
  { ans: 'frog', guesses: ['chip', 'fuel', 'fond', 'farm', 'sock', 'page', 'word'], tag: ['J', 'K'], demo: { ans: 'fish', guesses: ['wolf', 'shin', 'dish', 'fist'] } },
  { ans: 'lamp', guesses: ['loud', 'grab', 'sail', 'soap', 'town', 'beat', 'rope'], tag: ['F', 'S'], demo: { ans: 'road', guesses: ['dart', 'cord', 'read', 'load'] } },
  { ans: 'wave', guesses: ['chip', 'slow', 'very', 'five', 'land', 'fast', 'path'], tag: ['X', 'Z'], demo: { ans: 'bird', guesses: ['crab', 'grid', 'brim', 'bind'] } },
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
  tee: { item: T('T恤', 'T-shirts'), emoji: '👕', plain: T('👕 一疊整齊的 T 恤。', '👕 A neat stack of T-shirts.'), key: T('👕 一疊 T 恤中間夾著一把鑰匙！', '👕 A key tucked between the T-shirts!'), diary: T('把它夾在一疊 T 恤中間', 'I slipped it between my T-shirts') },
  hoodie: { item: T('帽T', 'Hoodies'), emoji: '🧥', plain: T('🧥 幾件帽 T，沒有鑰匙。', '🧥 A few hoodies. No key.'), key: T('🧥 帽 T 的口袋裡有一把鑰匙！', '🧥 A key in a hoodie pocket!'), diary: T('把它塞進帽 T 的口袋裡', 'I stuffed it into a hoodie pocket') },
  jeans: { item: T('牛仔褲', 'Jeans'), emoji: '👖', plain: T('👖 牛仔褲口袋裡只有一張發票。', '👖 Just an old receipt in the jeans.'), key: T('👖 牛仔褲後口袋裡有一把鑰匙！', '👖 A key in the back pocket of the jeans!'), diary: T('把它藏在牛仔褲的後口袋', 'I hid it in the back pocket of my jeans') },
  socks: { item: T('襪子&內衣', 'Socks & underwear'), emoji: '🧦', plain: T('🧦 一堆襪子，沒有鑰匙。', '🧦 A pile of socks. No key.'), key: T('🧦 一堆襪子……底下壓著一把鑰匙！', '🧦 Under a pile of socks… a key!'), diary: T('把它塞在一堆襪子底下', 'I buried it under a pile of socks') },
  scarf: { item: T('圍巾&毯子', 'Scarves & blankets'), emoji: '🧣', plain: T('🧣 軟綿綿的圍巾和毯子。', '🧣 Soft scarves and blankets.'), key: T('🧣 圍巾裡捲著一把鑰匙！', '🧣 A key rolled up in a scarf!'), diary: T('把它捲在圍巾裡', 'I rolled it up in a scarf') },
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

const NOTE2 = [T('護照放在床底下的箱子裡', 'Passport is in a suitcase under the bed')];

function build(v) {
  const pw = PW[v], wd = WARDROBE[v];
  const drawers = {};
  wd.order.forEach((id, i) => { drawers[i + 1] = { ...ITEMS[id], id, code: wd.codes[i], contents: id === wd.key ? ITEMS[id].key : ITEMS[id].plain }; });
  const keyDrawer = wd.order.indexOf(wd.key) + 1;
  const papers = [
    { id: 'paper1', kind: 'log', note: T('10/3 那局最後差點猜到 Slothy 的答案……就把它設成電腦密碼了。', 'On 10/3 I almost guessed Slothy’s word… so I made it my computer password.'),
      days: [
        { date: T('10 月 1 日', 'Oct 1'), rows: pw.demo.guesses.map((g) => row(g, pw.demo.ans, pw.tag)), answer: pw.demo.ans.toUpperCase() },
        { date: T('10 月 3 日', 'Oct 3'), rows: pw.guesses.slice(0, 4).map((g) => row(g, pw.ans, pw.tag)), answer: '????' },
      ] },
    { id: 'paper2', kind: 'map', rows: Object.entries(drawers).map(([n, d]) => ({ n: Number(n), emoji: d.emoji, item: d.item })) },
  ];
  const notion = {
    pages: [
      { icon: '📓', title: T('日記', 'Diary'), blocks: [
        { t: 'h', text: T('10 月 24 日 · 星期五', 'Friday, Oct 24') },
        { t: 'p', text: T('終於訂好回台北的機票了！明天一早的飛機，行李也收好了。', 'Finally booked my flight home to Taipei! It leaves tomorrow and my bags are packed.') },
        { t: 'p', text: T('出門前得先找到房門鑰匙——昨晚太累，忘記放在哪裡了。', 'I need to find the door key before I leave. I was so tired I forgot where I put it last night.') },
        { t: 'p', text: T(`我記得……${ITEMS[wd.key].diary.zh}。`, `I think… ${ITEMS[wd.key].diary.en}.`) },
        { t: 'h', text: T('10 月 23 日', 'Oct 23') },
        { t: 'p', text: T('整理衣櫃，終於每個抽屜都分類好了！清單我寫好了，放在衣櫃上面。', 'Sorted my wardrobe, every drawer has its own thing now! I’ve written a list and left it on top of the wardrobe.') },
        { t: 'p', text: T('為了不忘記，每個抽屜的鎖密碼都記在「密碼本」裡。', 'So I don’t forget, every drawer lock code is in my "Passwords" page.') },
      ] },
      { icon: '🔐', title: T('密碼本', 'Passwords'), blocks: [{ t: 'table', head: [T('東西', 'Item'), T('密碼', 'Code')], rows: [[T('🏋️ 健身房置物櫃', '🏋️ Gym locker'), '3391'], [T('📮 信箱', '📮 Mailbox'), '1057'], ...Object.entries(drawers).map(([n, d]) => [T(`衣櫃 ${n}`, `Wardrobe ${n}`), d.code])] }] },
      { icon: '✅', title: T('待辦', 'To-do'), blocks: [
        { t: 'todo', done: true, text: T('訂機票 ✈️', 'Book flight ✈️') }, { t: 'todo', done: true, text: T('收行李', 'Pack bags') },
        { t: 'todo', done: false, text: T('找到房門鑰匙！！！', 'FIND THE DOOR KEY!!!') }, { t: 'todo', done: false, text: T('出門，回台北 🇹🇼', 'Head out, fly home to Taipei 🇹🇼') },
      ] },
    ],
  };
  const deskPaper = { date: T('10 月 3 日（續）', 'Oct 3 (cont.)'), rows: pw.guesses.slice(4).map((g) => row(g, pw.ans, pw.tag)) };
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
        T('親愛的 Slothy：\n你今天又睡過頭了，可是我還是很喜歡看你打呼的樣子。\n——Raccoony\nP.S. 最近買了很酷的共鳴鎖，我把手提箱的密碼設成我們喜歡的歌的和弦了。',
          'Dear Slothy,\nYou overslept again today, but I still love watching you snore.\n— Raccoony\nP.S. I just got some cool resonance locks. I set our suitcase codes to the chords of our favorite songs.'),
        T('Raccoony：\n謝謝你每次都等我慢慢走。下次換我牽著你。\n——Slothy', 'Raccoony,\nThanks for always waiting for me to catch up. Next time I’ll hold your hand.\n— Slothy'),
      ],
    },
  },
};
const NOT_THIS = T('哇，恭喜你看到有趣的東西，但這不是你要找的。', 'Ooh, something fun! But it’s not what you’re looking for.');

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
//   - 三個箱子都是咖啡色，用位置（左／中／右）區分；右邊（情書）箱子一開始就是開的，鎖停在它的密碼上；信裡的 P.S. 說密碼是「我們喜歡的歌的和弦」→ 對照第一張譜《情書》
//   - Raccoony 彈對某首歌，那個箱子的鎖會亮起來共鳴（教玩家：哪首歌對哪個箱子）
//   - 要開鎖：Slothy 轉好四個字母、按「準備」，10 秒內 Raccoony 要彈出同樣的四個和弦；彈完才知道成不成功
const CASE_COLOR = { plane: T('左邊的', 'left'), secret: T('中間的', 'middle'), love: T('右邊的', 'right') }; // 箱子都是咖啡色，用位置稱呼
const ARM_MS = 10000, ARM_GRACE = 3000; // 準備後 10 秒內要彈；彈奏本身約 2 秒，加上網路延遲的寬限
// 前端只拿到「每個小節的琴格數字」，樂譜上不會出現和弦字母；和弦表（掛在 Slothy 床上方的牆上）才有字母。
const SONGS = [
  { id: 's3', title: T('情書', 'Love Letter'), box: 'love' },
  { id: 's2', title: T('不能說的秘密', 'Secret'), box: 'secret' },
  { id: 's1', title: T('飛機場的十點半', '10:30 at the Airport'), box: 'plane' },
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
    return { role, pcUnlocked: state.pcUnlocked, notion: state.pcUnlocked ? B.notion : null, ticketTaken: state.ticketTaken, note2: NOTE2, deskPaper: B.deskPaper, sheets: sheetsOf(state.v),
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
      if (role !== 'A') return { ok: false, message: T('這台電腦只有 Raccoony 搆得著。', 'Only Raccoony can reach this computer.') };
      if (state.pcUnlocked) return { ok: true, correct: true };
      if (String(a.value || '').trim().toLowerCase() === B.password) {
        state.pcUnlocked = true;
        return { ok: true, correct: true, events: [{ text: T('💻 電腦解鎖了！', '💻 The computer is unlocked!') }] };
      }
      return { ok: true, correct: false, message: T('密碼錯誤', 'Wrong password'), events: [{ text: T('💻 電腦密碼輸入錯誤。', '💻 Wrong computer password.') }] };
    }
    case 'drawer_code': {
      if (role !== 'B') return { ok: false, message: T('這個衣櫃是 Slothy 那邊的。', 'The wardrobe is on Slothy’s side.') };
      const n = Number(a.drawer);
      const d = B.drawers[n];
      if (!d) return { ok: false };
      if (state.drawers[n]) return { ok: true, correct: true };
      if (String(a.code || '').trim() !== d.code) {
        return { ok: true, correct: false, message: T('密碼錯誤', 'Wrong code'), events: [{ text: T(`🗄️ 第 ${n} 格抽屜的鎖沒有打開。`, `🗄️ Drawer ${n} won’t open.`) }] };
      }
      state.drawers[n] = true;
      if (n === B.keyDrawer) {
        state.hasKey = true;
        return { ok: true, correct: true, message: T('🔑 找到房門鑰匙了！', '🔑 Found the door key!'), events: [{ text: T(`🔑 第 ${n} 格打開了——房門鑰匙在這裡！`, `🔑 Drawer ${n} is open — the door key is here!`) }] };
      }
      return { ok: true, correct: true, message: d.contents, events: [{ text: T(`🗄️ 第 ${n} 格抽屜打開了，但這裡沒有鑰匙。`, `🗄️ Drawer ${n} is open, but there’s no key.`) }] };
    }
    case 'strum': {
      // Raccoony 在吉他上彈 4 個和弦；彈對某首歌的和弦進行，那個箱子的鎖就會亮起來共鳴
      if (role !== 'A') return { ok: false, message: T('吉他在 Raccoony 那邊。', 'The guitar is on Raccoony’s side.') };
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
        return { ok: true, correct: false, message: T('共鳴斷掉了……', 'The resonance broke…'), events: [{ text: T('🔒 喀！共鳴斷掉了，鎖又卡回去了。', '🔒 Clack! The resonance broke and the lock snapped shut.') }] };
      }
      if (!hit) return { ok: true, message: T('彈了一段……好像什麼事都沒發生。', 'You played a tune… nothing seems to happen.') };
      return { ok: true, events: [{ text: T(`🎸 Raccoony 彈完一段……床底下${CASE_COLOR[hit].zh}箱子的鎖亮了起來，好像聽得懂這首歌！`, `🎸 Raccoony finished a tune… the lock on the ${CASE_COLOR[hit].en} suitcase under the bed lit up, as if it knows this song!`) }] };
    }
    case 'case_ready': {
      // Slothy 轉好四個字母、按「準備」：鎖開始等聲音（轉錯也能按，要等彈完才知道）
      if (role !== 'B') return { ok: false, message: T('行李箱在 Slothy 那邊。', 'The suitcases are on Slothy’s side.') };
      if (!CASES[a.case] || state.cases[a.case]) return { ok: false };
      const code = String(a.code || '').trim().toUpperCase();
      if (!/^[A-G]{4}$/.test(code)) return { ok: false };
      state.armN += 1;
      state.armed = { case: a.case, code, t: Date.now(), n: state.armN };
      return { ok: true, events: [{ text: T('🔊 鎖在嗡嗡震動，好像在等某個聲音……', '🔊 The lock is humming, as if waiting for a sound…') }] };
    }
    case 'case_timeout': {
      // 10 秒到了還沒聽到聲音（由 Slothy 的畫面通知）
      if (!state.armed || Number(a.n) !== state.armed.n) return { ok: true };
      if (Date.now() - state.armed.t < ARM_MS) return { ok: true };
      state.armed = null; state.failN += 1;
      return { ok: true, correct: false, events: [{ text: T('🔒 喀！沒等到聲音，鎖又卡回去了。', '🔒 Clack! No sound came, and the lock snapped shut.') }] };
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
      if (role !== 'B') return { ok: false, message: T('門把在 Slothy 那邊。', 'The door knob is on Slothy’s side.') };
      if (!state.hasKey) return { ok: true, message: T('🔒 門鎖著，需要鑰匙。', '🔒 The door is locked. You need a key.') };
      if (!state.hasPassport) return { ok: true, message: T('🛂 門牌寫著：護照記得拿！', '🛂 The sign on the door says: Don’t forget your passport!') };
      state.doorOpen = true;
      return { ok: true, solved: true, events: [{ text: T('🚪 喀噠！房門打開了！', '🚪 Click! The door is open!') }] };
    }
    default:
      return { ok: false };
  }
}

function openCase(state, id) {
  state.cases[id] = true;
  if (id === 'plane') {
    state.hasPassport = true;
    return { ok: true, correct: true, docsTo: { B: ['passport'] }, events: [{ text: T(`🛂 共鳴成功！${CASE_COLOR.plane.zh}箱子打開了——裡面是護照！`, `🛂 It resonated! The ${CASE_COLOR.plane.en} suitcase opened — the passport is inside!`) }] };
  }
  return { ok: true, correct: true, events: [{ text: T(`🧳 共鳴成功！${CASE_COLOR[id].zh}箱子打開了。${NOT_THIS.zh}`, `🧳 It resonated! The ${CASE_COLOR[id].en} suitcase opened. ${NOT_THIS.en}`) }] };
}

// 給提示用的答案文字
function answers(state) {
  const B = BUILT[state.v];
  const d = B.drawers[B.keyDrawer];
  return {
    password: T(`電腦密碼是 ${B.password}。`, `The computer password is ${B.password}.`),
    tag: T(`拿 10 月 1 日的答案對照每一行：${B.tag[0]}＝位置對，${B.tag[1]}＝字母對但位置錯。`,
      `Check Oct 1’s guesses against its answer: ${B.tag[0]} = right spot, ${B.tag[1]} = right letter, wrong spot.`),
    keyItem: d.item,
    drawer: T(`鑰匙在第 ${B.keyDrawer} 格（${d.item.zh}），密碼 ${d.code}。`, `The key is in drawer ${B.keyDrawer} (${d.item.en}), code ${d.code}.`),
    plane: T(`${CASE_COLOR.plane.zh}箱子是 ${B.codes.plane}：Slothy 轉好按準備，Raccoony 10 秒內彈 ${B.codes.plane}。`,
      `The ${CASE_COLOR.plane.en} suitcase is ${B.codes.plane}. Slothy sets it and taps Ready; Raccoony plays ${B.codes.plane} within 10 s.`),
  };
}
// 測試用：這個變化的完整解法
function solution(v) {
  const B = BUILT[v];
  return { password: B.password, tag: B.tag, drawer: B.keyDrawer, drawerCode: B.drawers[B.keyDrawer].code, codes: B.codes, guesses: PW[v].guesses, demo: PW[v].demo };
}

module.exports = { init, view, act, answers, solution, feedback, VARIANTS: NV };
