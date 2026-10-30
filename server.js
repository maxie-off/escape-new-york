// 兩人線上密室逃脫：Express + Socket.IO
// 伺服器是唯一的「真相來源」：所有遊戲狀態都在這裡，兩個玩家永遠看到同一條時間線。

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { roles, scenes, ending } = require('./scenes');
const docsCatalog = require('./docs');
const { T, loc, isT } = require('./i18n');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 首頁：每次部署都在 js/css 網址後面加版本號，避免 iPad Safari 用到舊的快取檔案（新舊混用會整頁白掉）
const fs = require('fs');
const BUILD = Date.now().toString(36);
const indexHtml = () => fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
  .replace(/(src|href)="((?!\/socket\.io|https?:)[^"]+\.(?:js|css))"/g, `$1="$2?v=${BUILD}"`);
app.get(['/', '/index.html'], (_req, res) => { res.set('Cache-Control', 'no-cache'); res.type('html').send(indexHtml()); });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/healthz', (_req, res) => res.send('ok'));

// ---------- 結尾的問卷：幾顆星 + 想改進的地方 ----------
// 一律存一份在伺服器上（data/feedback.jsonl）；另外，如果設了 FEEDBACK_WEBHOOK
// （Google Apps Script 的網址，見 README），就同時送進 Google 試算表。
app.post('/api/feedback', express.json({ limit: '16kb' }), async (req, res) => {
  const b = req.body || {};
  const row = {
    at: new Date().toISOString(),
    stars: Math.max(0, Math.min(5, Number(b.stars) || 0)),
    text: String(b.text || '').slice(0, 2000),
    lang: b.lang === 'en' ? 'en' : 'zh',
  };
  if (!row.stars && !row.text) return res.status(400).json({ ok: false });
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.appendFileSync(path.join(__dirname, 'data', 'feedback.jsonl'), JSON.stringify(row) + '\n');
  } catch (e) { console.warn('feedback save failed', e.message); }
  const hook = process.env.FEEDBACK_WEBHOOK;
  if (hook) {
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
      if (!r.ok) console.warn('feedback webhook', r.status);
    } catch (e) { console.warn('feedback webhook failed', e.message); }
  }
  res.json({ ok: true });
});

// ---------- 房間 ----------
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的 I O 0 1
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function genCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}

function createRoom() {
  const room = {
    code: genCode(),
    players: { A: null, B: null }, // { clientId }
    sockets: new Map(), // clientId -> socketId（在線才有）
    members: new Set(), // 進過房間的 clientId（含還沒選角色的）
    ready: { A: false, B: false },
    phase: 'lobby', // lobby | playing | ended
    sceneIndex: 0,
    sceneState: null, // 互動式場景的伺服器端狀態
    variants: [], // 這場遊戲每個場景抽到第幾種變化（重玩時會換成不同的）
    hintLevels: {}, // 當前場景：每個謎題已看到第幾層提示
    hintLog: [], // 當前場景已顯示的提示文字
    hintTotal: 0, // 整場遊戲用了幾次提示
    lang: {}, // clientId -> 'zh' | 'en'（每位玩家自己選語言）
    docs: { A: [], B: [] }, // 各玩家的收藏文件（文件 id）
    interlude: null, // 過場動畫 { kind }，播放中不接受任何操作
    timer: null,
    feed: [], // 系統事件（前端以字幕顯示），沒有玩家聊天
    updatedAt: Date.now(),
  };
  rooms.set(room.code, room);
  return room;
}

const roleOf = (room, clientId) =>
  room.players.A?.clientId === clientId ? 'A' : room.players.B?.clientId === clientId ? 'B' : null;

const isOnline = (room, role) => !!(room.players[role] && room.sockets.has(room.players[role].clientId));

function pushFeed(room, text, cheer = false) {
  const t = Math.max(Date.now(), (room.feed[room.feed.length - 1]?.t || 0) + 1);
  room.feed.push(cheer ? { t, text, cheer: true } : { t, text });
  if (room.feed.length > 50) room.feed.shift();
}

function initScene(room) {
  const s = scenes[room.sceneIndex];
  room.sceneState = s && s.module ? s.module.init(room.variants[room.sceneIndex] || 0) : null;
}

// 每場遊戲替每個場景抽一種變化；同一個房間重玩時，一定和上一場不同。
// 測試可用環境變數 FORCE_VARIANT 固定成某一種。
// avoid：要避開的變化（這個房間上一場 + 兩位玩家各自瀏覽器記得的上一場）
function pickVariants(room) {
  const lists = [room.variants, ...Object.values(room.played || {})].filter(Array.isArray);
  return scenes.map((s, i) => {
    const n = (s.module && s.module.VARIANTS) || 1;
    if (process.env.FORCE_VARIANT !== undefined) return Number(process.env.FORCE_VARIANT) % n;
    const avoid = new Set(lists.map((l) => l[i]).filter((x) => Number.isInteger(x)));
    const pool = [...Array(n).keys()].filter((x) => !avoid.has(x));
    const from = pool.length ? pool : [...Array(n).keys()];
    return from[Math.floor(Math.random() * from.length)];
  });
}
function startGame(room) {
  room.phase = 'playing';
  room.sceneIndex = Math.min(Number(process.env.START_SCENE) || 0, scenes.length - 1); // 測試用：START_SCENE 直接從某一關開始
  room.hintLevels = {}; room.hintLog = []; room.hintTotal = 0;
  room.feed = [];
  room.docs = { A: [], B: [] };
  room.interlude = null; clearTimeout(room.timer);
  room.variants = pickVariants(room);
  initScene(room);
}

// 文件（例如機票的登機時間）可能跟著某個場景的變化走
function docFor(room, id) {
  let d = { ...docsCatalog[id] };
  scenes.forEach((s, i) => { const p = s.module && s.module.docPatch && s.module.docPatch(room.variants[i] || 0); if (p && p[id]) d = { ...d, ...p[id] }; });
  return d;
}

// 過關：推送 outro；有過場動畫（transition）就先播過場，結束後再進下一關或結局
const TSCALE = Number(process.env.TRANSITION_SCALE || 1); // 測試時可縮短
function advance(room) {
  const sc = scenes[room.sceneIndex];
  pushFeed(room, sc.outro);
  room.hintLevels = {}; room.hintLog = [];
  const last = room.sceneIndex + 1 >= scenes.length;
  const finish = () => {
    room.interlude = null;
    if (last) room.phase = 'ended';
    else { room.sceneIndex += 1; initScene(room); }
    broadcast(room);
  };
  if (sc.transition) {
    room.interlude = { kind: sc.transition.kind };
    clearTimeout(room.timer);
    room.timer = setTimeout(finish, sc.transition.ms * TSCALE);
  } else if (last) room.phase = 'ended';
  else { room.sceneIndex += 1; initScene(room); }
}

// ---------- 分層提示：每個謎題三層（方向 → 線索 → 答案），依目前卡住的謎題給 ----------
const TIER_NAME = [T('方向', 'Direction'), T('線索', 'Clue'), T('答案', 'Answer')];
function currentStep(room) {
  const hs = scenes[room.sceneIndex].hints;
  const i = hs.findIndex((h) => !(h.done && room.sceneState && h.done(room.sceneState)));
  return i === -1 ? hs.length - 1 : i;
}
function hintsLeft(room) {
  const step = currentStep(room);
  return scenes[room.sceneIndex].hints[step].tiers.length - (room.hintLevels[step] || 0);
}

// ---------- 每個玩家看到的畫面（只含自己角色的線索） ----------
const langOf = (room, clientId) => (room && room.lang && room.lang[clientId]) || 'zh';

function viewFor(room, clientId) {
  const you = roleOf(room, clientId);
  const view = {
    code: room.code,
    phase: room.phase,
    you,
    roles,
    slots: {
      A: { taken: !!room.players.A, online: isOnline(room, 'A') },
      B: { taken: !!room.players.B, online: isOnline(room, 'B') },
    },
    ready: room.ready,
    total: scenes.length,
    peers: room.sockets.size,
    feed: room.feed,
    docs: you ? room.docs[you].map((id) => docFor(room, id)) : [],
  };
  if (room.interlude) view.interlude = room.interlude;
  if (room.phase !== 'lobby') view.variants = room.variants; // 前端記下來，下一場（就算開新房間）避開同一種
  if (room.phase === 'playing' && you && !room.interlude) {
    const s = scenes[room.sceneIndex];
    const base = {
      index: room.sceneIndex,
      intro: s.intro,
      hints: room.hintLog,
      hintsLeft: hintsLeft(room),
      hintTotal: room.hintTotal,
    };
    view.scene = s.module
      ? { ...base, interactive: true, id: s.id, data: s.module.view(room.sceneState, you) }
      : { ...base, clues: s.clues[you] || [], prompt: s.prompt };
  }
  if (room.phase === 'ended') view.ending = { ...ending, hintTotal: room.hintTotal };
  return loc(view, langOf(room, clientId)); // 所有雙語文字換成這位玩家選的語言
}

function broadcast(room) {
  room.updatedAt = Date.now();
  for (const [clientId, socketId] of room.sockets) {
    io.to(socketId).emit('state', viewFor(room, clientId));
  }
}

const norm = (s) =>
  String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_.，。]/g, '');

// ---------- Socket 事件 ----------
io.on('connection', (socket) => {
  const getRoom = () => rooms.get(socket.data.code);
  const ctx = () => {
    const room = getRoom();
    if (!room) return {};
    return { room, role: roleOf(room, socket.data.clientId) };
  };

  socket.on('create_room', (cb) => {
    const room = createRoom();
    cb?.({ ok: true, code: room.code });
  });

  socket.on('join_room', ({ code, clientId, played, lang } = {}, cb) => {
    code = String(code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: T('找不到這個識別碼', 'Room code not found') });
    if (!clientId) return cb?.({ ok: false, error: T('缺少 clientId', 'Missing clientId') });

    // 房間最多容納 2 個不同的人（重新連線的同一個 clientId 不算新人）
    if (!room.members.has(clientId) && room.members.size >= 2) {
      return cb?.({ ok: false, error: T('房間已滿（只能 2 人）', 'Room is full (2 players max)') });
    }
    room.members.add(clientId);
    room.lang = room.lang || {}; room.lang[clientId] = lang === 'en' ? 'en' : 'zh';
    room.played = room.played || {};
    if (Array.isArray(played)) room.played[clientId] = played.slice(0, 10).map(Number);
    socket.data.code = code;
    socket.data.clientId = clientId;
    room.sockets.set(clientId, socket.id);
    cb?.({ ok: true });
    broadcast(room);
  });

  // 切換語言（標題畫面或遊戲中都可以）
  socket.on('set_lang', ({ lang } = {}, cb) => {
    const room = getRoom();
    if (!room) return cb?.({ ok: true });
    room.lang = room.lang || {};
    room.lang[socket.data.clientId] = lang === 'en' ? 'en' : 'zh';
    broadcast(room);
    cb?.({ ok: true });
  });

  socket.on('choose_role', ({ role } = {}, cb) => {
    const { room } = ctx();
    if (!room) return cb?.({ ok: false, error: T('尚未加入房間', 'Not in a room yet') });
    if (room.phase !== 'lobby') return cb?.({ ok: false, error: T('遊戲已開始', 'The game has already started') });
    if (role !== 'A' && role !== 'B') return cb?.({ ok: false, error: T('角色無效', 'Invalid character') });
    const clientId = socket.data.clientId;
    const holder = room.players[role];
    if (holder && holder.clientId !== clientId) return cb?.({ ok: false, error: T('這個角色已被對方選走', 'The other player already picked this character') });
    const other = role === 'A' ? 'B' : 'A';
    if (room.players[other]?.clientId === clientId) {
      room.players[other] = null;
      room.ready[other] = false;
    }
    room.players[role] = { clientId };
    room.ready[role] = false;
    cb?.({ ok: true });
    broadcast(room);
  });

  // 兩邊都在線、角色都選好之後，任何一方按 Start 就同時進入第一個場景
  socket.on('start_game', (_p, cb) => {
    const { room, role } = ctx();
    if (!room || !role) return cb?.({ ok: false, error: T('請先選角色', 'Pick a character first') });
    if (room.phase !== 'lobby') return cb?.({ ok: false });
    if (!isOnline(room, 'A') || !isOnline(room, 'B')) return cb?.({ ok: false, error: T('對方還沒連上', 'The other player isn’t connected yet') });
    startGame(room);
    cb?.({ ok: true });
    broadcast(room);
  });

  // 結局畫面按「再玩一次」：同一組角色直接重開，每個謎題都會換成和上一場不同的變化
  socket.on('play_again', (_p, cb) => {
    const { room, role } = ctx();
    if (!room || !role || room.phase !== 'ended') return cb?.({ ok: false });
    if (!isOnline(room, 'A') || !isOnline(room, 'B')) return cb?.({ ok: false, error: T('對方還沒連上', 'The other player isn’t connected yet') });
    startGame(room);
    cb?.({ ok: true });
    broadcast(room);
  });

  socket.on('submit_answer', ({ answer } = {}, cb) => {
    const { room, role } = ctx();
    if (!room || !role || room.phase !== 'playing') return cb?.({ ok: false });
    const scene = scenes[room.sceneIndex];
    if (scene.module) return cb?.({ ok: false }); // 互動式場景不走文字答案
    const correct = scene.answers.some((a) => norm(a) === norm(answer));
    if (!correct) {
      pushFeed(room, `${roles[role].name} 嘗試了答案，但不對。`);
      broadcast(room);
      return cb?.({ ok: true, correct: false });
    }
    advance(room);
    broadcast(room);
    cb?.({ ok: true, correct: true });
  });

  // 互動式場景的所有操作都走這裡；由場景模組在伺服器端判定
  socket.on('scene_action', (action, cb) => {
    const { room, role } = ctx();
    if (!room || !role || room.phase !== 'playing' || room.interlude) return cb?.({ ok: false });
    const scene = scenes[room.sceneIndex];
    if (!scene.module) return cb?.({ ok: false });
    const res = scene.module.act(room.sceneState, role, action) || { ok: false };
    // 答對（解開鎖、找到東西、過關）的事件帶 cheer：兩邊畫面都會放一小段慶祝動畫
    for (const ev of res.events || []) pushFeed(room, ev.text, res.correct === true || !!res.solved);
    const give = (r, id) => { if (docsCatalog[id] && !room.docs[r].includes(id)) room.docs[r].push(id); };
    for (const id of res.docs || []) give(role, id);
    for (const [r, ids] of Object.entries(res.docsTo || {})) if (room.docs[r]) for (const id of ids) give(r, id); // 文件給指定的角色（例如 A 彈吉他打開了 B 的箱子，護照給 B）
    if (res.solved) advance(room);
    broadcast(room);
    // events / solved 只在伺服器內部使用，回給操作者的只有結果和私人訊息
    cb?.({ ok: res.ok, correct: res.correct, message: loc(res.message, langOf(room, socket.data.clientId)) });
  });

  socket.on('request_hint', (_p, cb) => {
    const { room, role } = ctx();
    if (!room || !role || room.phase !== 'playing' || room.interlude) return cb?.({ ok: false });
    const scene = scenes[room.sceneIndex];
    const step = currentStep(room);
    const lv = room.hintLevels[step] || 0;
    const tiers = scene.hints[step].tiers;
    if (lv >= tiers.length) return cb?.({ ok: false, error: T('沒有更多提示了', 'No more hints') });
    room.hintLevels[step] = lv + 1;
    const raw = typeof tiers[lv] === 'function' ? tiers[lv](room.sceneState) : tiers[lv];
    const tier = isT(raw) ? raw : T(String(raw));
    const tn = TIER_NAME[lv] || T('提示', 'Hint');
    room.hintLog = [...room.hintLog, T(`${tn.zh}：${tier.zh}`, `${tn.en}: ${tier.en}`)];
    room.hintTotal += 1;
    broadcast(room);
    cb?.({ ok: true });
  });

  socket.on('disconnect', () => {
    const room = getRoom();
    if (!room) return;
    const { clientId } = socket.data;
    if (room.sockets.get(clientId) === socket.id) room.sockets.delete(clientId);
    broadcast(room);
  });
});

// 定期清理長時間沒動靜的房間
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.sockets.size === 0 && now - room.updatedAt > ROOM_TTL_MS) rooms.delete(code);
  }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Escape game running on http://localhost:${PORT}`));
