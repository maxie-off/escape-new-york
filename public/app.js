// 前端：只負責「畫面」。所有遊戲狀態都來自伺服器推送的 state。
// 遊戲畫面是全螢幕場景；旁白、提示、事件都以底部字幕顯示；沒有聊天室（玩家用電話/視訊自己溝通）。
const socket = io();
const $ = (s) => document.querySelector(s);

// 沒有登入：用瀏覽器裡的隨機 clientId 識別身份，重新整理也能回到同一個角色
let clientId = localStorage.getItem('clientId');
if (!clientId) {
  clientId = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2) + Date.now();
  localStorage.setItem('clientId', clientId);
}
let roomCode = sessionStorage.getItem('roomCode') || null;
let state = null;

// ---------- 字幕（佇列；預設依字數約 5 秒） ----------
const subEl = $('#subtitle');
let subQueue = [];
let subShowing = false;
let subTimer = null;
// 字幕不放 emoji（伺服器的事件文字有些開頭帶圖示，這裡統一拿掉）
// 注意：不用 \p{Extended_Pictographic}，舊版 iPad Safari 不支援，整支程式會無法執行（白畫面）
const EMOJI_RE = /(?:[\u2300-\u23FF\u2460-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3297\u3299]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])\uFE0F?/g;
const noEmoji = (t) => String(t).replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
// 字幕：一次最多兩行。太長就在標點或空白處切成好幾段，一段一段播（每段幾秒）。
let subMeasure = null;
function subLines(text) {
  if (!subMeasure) { subMeasure = document.createElement('div'); subMeasure.className = 'sub-measure'; document.body.appendChild(subMeasure); }
  subMeasure.textContent = '測'; const one = subMeasure.clientHeight;
  subMeasure.textContent = text; const h = subMeasure.clientHeight;
  const lh = parseFloat(getComputedStyle(subMeasure).lineHeight) || one * 0.6;
  return Math.round((h - one) / lh) + 1;
}
function splitSub(text) {
  if (subLines(text) <= 2) return [text];
  // 先用整句組合（句號、問號、驚嘆號、分號），整句還是太長才在逗號或空白處切
  const greedy = (parts) => { const out = []; let cur = '';
    for (const p of parts) { const next = cur + p; if (cur && subLines(next.trim()) > 2) { out.push(cur.trim()); cur = p; } else cur = next; }
    if (cur.trim()) out.push(cur.trim()); return out; };
  const sentences = text.match(/[^。！？；.!?;]+[。！？；.!?;]*\s*/g) || [text];
  return greedy(sentences).flatMap((pg) => (subLines(pg) <= 2 ? [pg] : greedy(pg.match(/[^，、,\s]+[，、,]*\s*|\s+/g) || [pg])));
}
function say(text, { ms, now } = {}) {
  if (!text) return;
  text = noEmoji(text);
  if (!text) return;
  if (now) { subQueue = []; clearTimeout(subTimer); subShowing = false; }
  const pages = splitSub(text);
  const sum = pages.reduce((a, p) => a + p.length, 0);
  for (const p of pages) subQueue.push({ text: p, dur: ms ? Math.max(2200, Math.round((ms * p.length) / sum)) : Math.min(6000, 2200 + p.length * 45) });
  if (!subShowing) nextSub();
}
function nextSub() {
  const item = subQueue.shift();
  if (!item) { subShowing = false; subEl.classList.remove('on'); return; }
  subShowing = true;
  subEl.textContent = item.text;
  subEl.classList.add('on');
  subTimer = setTimeout(() => { subEl.classList.remove('on'); subTimer = setTimeout(nextSub, 300); }, item.dur);
}

// ---------- 連線 ----------
function join(code, onError) {
  let played = null;
  try { played = JSON.parse(localStorage.getItem('playedVariants') || 'null'); } catch (e) { /* ignore */ }
  socket.emit('join_room', { code, clientId, played, lang: I18N.lang }, (res) => {
    if (res.ok) {
      roomCode = code.toUpperCase(); setupError = '';
      sessionStorage.setItem('roomCode', roomCode);
    } else {
      roomCode = null;
      sessionStorage.removeItem('roomCode');
      onError?.(L(res.error));
      render();
    }
  });
}
socket.on('connect', () => {
  $('#conn').textContent = '';
  if (roomCode) join(roomCode); // 斷線重連自動回房間
});
socket.on('disconnect', () => { $('#conn').textContent = tr('連線中斷，重新連線中…', 'Disconnected, reconnecting…'); });
socket.on('state', (s) => { state = s; if (s.you) setMyRole(s.you); render(); });

// iPad / Safari 需要點擊後才能發聲
for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, () => Music.unlock(), { passive: true });

// ---------- 封面 / 選角 / 房間碼 ----------
let screen = 'title';
let myRole = sessionStorage.getItem('myRole') || null; // 還沒進房間時，先在本機記住想選的角色
let setupError = '';
const setMyRole = (r) => { myRole = r; try { r ? sessionStorage.setItem('myRole', r) : sessionStorage.removeItem('myRole'); } catch (e) { /* ignore */ } };

$('#title-bg').innerHTML = Title.skyline({ extra: Art.raccoony(210, 690, 1.15) + Art.slothy(790, 690, 1.25) });
$('#setup-bg').innerHTML = Title.skyline();

$('#btn-title-start').onclick = () => { Music.unlock(); screen = 'setup'; render(); };

$('#btn-gen').onclick = () => {
  socket.emit('create_room', (res) => join(res.code, (e) => { setupError = e; render(); }));
};
function tryJoin() {
  const code = $('#code-input').value.trim();
  if (code.length === 6) join(code, (e) => { setupError = e; render(); });
}
$('#join-form').onsubmit = (e) => { e.preventDefault(); tryJoin(); };
$('#code-input').oninput = (e) => { e.target.value = e.target.value.toUpperCase(); if (e.target.value.length === 6) tryJoin(); };
$('#room-code').onclick = () => { if (state?.code) navigator.clipboard?.writeText(state.code); };
$('#btn-start').onclick = () => socket.emit('start_game', {}, (res) => { if (!res?.ok) { setupError = L(res?.error) || ''; render(); } });

function pickRole(r) {
  setupError = '';
  if (!roomCode || !state) { setMyRole(r); return render(); }
  socket.emit('choose_role', { role: r }, (res) => { if (!res.ok) { setupError = L(res.error); } render(); });
}

function renderSetup() {
  const sel = state?.you || myRole;
  const box = $('#roles');
  box.innerHTML = '';
  for (const r of ['A', 'B']) {
    const name = r === 'A' ? 'Raccoony' : 'Slothy';
    const taken = state && state.slots[r].taken && state.you !== r;
    const btn = document.createElement('button');
    btn.className = 'role' + (sel === r ? ' mine' : '') + (taken ? ' taken' : '');
    btn.disabled = !!taken;
    btn.innerHTML = `${Art.portrait(r, 150)}<b>${name}</b><small>${taken ? (state.slots[r].online ? tr('對方選了這隻', 'Your friend picked this one') : tr('對方選了這隻（離線）', 'Your friend picked this one (offline)')) : sel === r ? tr('你選了這隻 ✓', 'You picked this one ✓') : tr('點一下選我', 'Tap to pick me')}</small>`;
    btn.onclick = () => pickRole(r);
    box.appendChild(btn);
  }
  const codeEl = $('#room-code');
  codeEl.textContent = state?.code || '------';
  codeEl.classList.toggle('empty', !state?.code);
  const bothOnline = !!(state && state.slots.A.online && state.slots.B.online);
  $('#room-status').textContent = setupError ? setupError : !state ? '' : state.peers >= 2 ? tr('已連線，對方在房間裡', 'Connected — your friend is here') : tr('等對方輸入這組房間碼…', 'Waiting for your friend to enter this code…');
  $('#room-status').style.color = setupError ? '#c0262c' : state && state.peers >= 2 ? '#1c7c3f' : 'var(--muted)';
  $('#btn-start').disabled = !bothOnline;
  $('#setup-hint').textContent = bothOnline ? '' : !state ? tr('一個人按 Generate，另一個人輸入房間碼；兩邊各選一個角色', 'One player taps Generate, the other enters the code. Each of you picks a character.') : state.peers < 2 ? tr('等對方加入房間…', 'Waiting for your friend to join…') : tr('兩邊都要選好不同的角色', 'You each need to pick a different character');
}
// 加入房間後，把先前在本機選的角色送給伺服器
function syncRole() {
  if (!state || state.phase !== 'lobby') return;
  if (state.you) { if (myRole !== state.you) setMyRole(state.you); return; }
  if (myRole) socket.emit('choose_role', { role: myRole }, (res) => { if (!res.ok) { setupError = L(res.error) + tr('，請換一隻', ' — please pick the other one'); setMyRole(null); render(); } });
}

// ---------- 遊戲 ----------
$('#answer-form').onsubmit = (e) => {
  e.preventDefault();
  const answer = $('#answer-input').value;
  if (!answer.trim()) return;
  socket.emit('submit_answer', { answer }, (res) => {
    if (res?.correct) $('#answer-input').value = '';
    else if (res?.correct === false) say(tr('答案不對，再想想。', 'Not quite. Think again.'), { now: true });
  });
};
$('#btn-hint').onclick = () => {
  const s = state?.scene;
  if (!s) return;
  // 下一層是「答案」時先確認一次，避免一不小心被劇透
  if (s.hintsLeft === 1 && Date.now() - (window.__hintArm || 0) > 5000) {
    window.__hintArm = Date.now();
    say(tr('下一個提示會直接告訴你答案。5 秒內再按一次提示就會顯示。', 'The next hint gives away the answer. Tap the hint again within 5 seconds to see it.'), { ms: 5000, now: true });
    return;
  }
  window.__hintArm = 0;
  if (s.hintsLeft > 0) socket.emit('request_hint');
  else if (s.hints.length) say('💡 ' + s.hints[s.hints.length - 1], { ms: 7000, now: true }); // 沒有新提示：重看最後一個
};
$('#btn-mute').onclick = () => { $('#btn-mute').textContent = Music.toggleMute() ? '🔇' : '🔊'; };
$('#btn-mute').textContent = Music.isMuted() ? '🔇' : '🔊';

// ---------- 收藏文件（📁） ----------
const docsLayer = $('#docs-layer');
let seenDocs = null; // 已經看過的文件 id；第一次不自動打開
let toastTimer = null;
function toast(text) {
  const el = $('#toast'); el.textContent = text; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1800);
}
// 第一次自動展開的文件，關掉時提示「已收藏」；從 📁 打開的不提示
function closeDocs(silent) {
  const wasFresh = docsLayer.dataset.fresh === '1';
  docsLayer.hidden = true; docsLayer.innerHTML = ''; docsLayer.dataset.fresh = '';
  if (wasFresh && silent !== true) toast(tr('已收藏', 'Saved'));
}
function openDoc(id, fresh) {
  const d = (state?.docs || []).find((x) => x.id === id);
  if (!d) return;
  docsLayer.innerHTML = `<div class="docs-card"><button class="x" data-close>✕</button>${Docs.docHtml(d)}</div>`;
  docsLayer.dataset.fresh = fresh ? '1' : '';
  docsLayer.hidden = false;
}
function openTray() {
  const docs = state?.docs || [];
  docsLayer.innerHTML = `<div class="docs-card"><button class="x" data-close>✕</button><h3>${tr('收藏文件', 'Documents')}</h3><div class="tray">${docs.map((d) => `<button data-doc="${d.id}"><span>${d.icon}</span>${d.title}</button>`).join('')}</div></div>`;
  docsLayer.dataset.fresh = '';
  docsLayer.hidden = false;
}
docsLayer.onclick = (e) => {
  if (e.target === docsLayer || e.target.closest('[data-close]')) return closeDocs();
  const b = e.target.closest('[data-doc]'); if (b) openDoc(b.dataset.doc, false);
};
$('#btn-docs').onclick = openTray;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !docsLayer.hidden) closeDocs(); });
function syncDocs() {
  const docs = state.docs || [];
  $('#btn-docs').hidden = !docs.length;
  $('#btn-docs .badge').textContent = docs.length;
  if (seenDocs === null) { seenDocs = new Set(docs.map((d) => d.id)); return; }
  for (const d of docs) if (!seenDocs.has(d.id)) { seenDocs.add(d.id); openDoc(d.id, true); } // 拿到新文件就自動展開
}

// 互動式場景：每個場景在 window.Scenes[id] 註冊 render / unmount
const sceneCtx = () => ({
  you: state.you,
  say,
  hasDoc: (id) => (state.docs || []).some((d) => d.id === id),
  send: (action) =>
    new Promise((resolve) =>
      socket.emit('scene_action', action, (res) => {
        if (res?.message) say(res.message, { now: true });
        if (res?.correct === false) comicBurst(/吱|Bzz/.test(res.message || '') ? tr('吱吱吱！', 'BZZT!') : Math.random() < 0.5 ? 'OOPS!' : tr('噗！', 'PFFT!'), 'bad');
        resolve(res || {});
      })
    ),
});

let lastSceneIndex = -1;
let lastDataJson = '';
let activeScene = null; // 目前掛載的互動場景 id
let feedBaseT = null; // 已經處理到的系統事件時間
let hintCounts = {}; // 場景 index -> 已顯示的提示數
let howtoShown = false;

// 第一次進入遊戲：說明「兩人畫面不同、要互相講」
function showHowto() {
  howtoShown = true;
  const me = state.roles[state.you].name, other = state.roles[state.you === 'A' ? 'B' : 'A'].name;
  const el = document.createElement('div');
  el.className = 'howto';
  el.innerHTML = `<div class="howto-card">
    <h2>${tr('你們看到的畫面不一樣！', 'You each see a different screen!')}</h2>
    <ul>
      ${tr(`<li>你是 <b>${me}</b>。${other} 看得到你看不到的線索，你也一樣。</li>
      <li>把你看到的形狀、顏色、文字<b>說給對方聽</b>，兩邊的線索合起來才解得開。</li>
      <li>有些東西只有你按得到，有些只有對方按得到。</li>
      <li>卡關時按右上角的提示：會從「方向」→「線索」→「答案」慢慢給。</li>
      <li>拿到的文件會收在右上角的資料夾。</li>`, `<li>You are <b>${me}</b>. ${other} can see clues you can’t, and the other way round.</li>
      <li><b>Tell each other</b> the shapes, colors and words you see. You need both sides’ clues to solve each puzzle.</li>
      <li>Some things only you can tap; some only your friend can.</li>
      <li>Stuck? Tap the hint button at the top right. Hints go from Direction → Clue → Answer.</li>
      <li>Documents you collect go into the folder at the top right.</li>`)}
    </ul>
    <button class="primary big" data-howto="ok">${tr('開始！', 'Let’s go!')}</button></div>`;
  el.onclick = (e) => { if (e.target.closest('[data-howto]')) el.remove(); };
  $('#game').appendChild(el);
}

function unmountActive() {
  if (activeScene) window.Scenes?.[activeScene]?.unmount?.();
  activeScene = null;
  lastDataJson = '';
  $('#stage').innerHTML = '';
}

// 美漫狀聲詞：爆炸星形 + 網點 + 黃色立體字（答對：紅底 BINGO!／叮！；答錯：藍底 OOPS!／吱吱吱！）
const BURST = {
  good: { fill: '#ff4b3e', dot: '#ffd23f', ring: '#ffd23f', word: '#ffe14a' },
  bad: { fill: '#2f8fe8', dot: '#bfe6ff', ring: '#ffffff', word: '#ffe14a' },
};
function burstSvg(t) {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 66 + (i * 37 % 9) : 100 + (i * 53 % 22);
    pts.push(`${(Math.cos(a) * r * 1.35).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  const lines = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + 0.2; return `<line x1="${Math.cos(a) * 150}" y1="${Math.sin(a) * 112}" x2="${Math.cos(a) * 184}" y2="${Math.sin(a) * 138}" stroke="#1b1b1f" stroke-width="5" stroke-linecap="round"/>`; }).join('');
  return `<svg viewBox="-200 -150 400 300" aria-hidden="true"><defs><pattern id="bd-${t}" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="2.1" fill="${BURST[t].dot}"/></pattern></defs>
    ${lines}<polygon points="${pts.join(' ')}" fill="${BURST[t].fill}" stroke="#1b1b1f" stroke-width="7" stroke-linejoin="round"/>
    <polygon points="${pts.join(' ')}" fill="url(#bd-${t})" opacity=".55" transform="scale(.74)"/></svg>`;
}
function comicBurst(word, t = 'good') {
  const g = $('#game');
  if (!g) return;
  g.querySelectorAll('.cheer').forEach((n) => n.remove());
  const el = document.createElement('div');
  el.className = `cheer ${t}`;
  el.innerHTML = `${burstSvg(t)}<span class="comic-word" style="--fill:${BURST[t].word}">${word}</span>`;
  g.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
const GOOD_WORDS = () => tr(['叮！', 'BINGO!', 'YEAH!', 'OK!', '讚啦！'], ['DING!', 'BINGO!', 'YEAH!', 'OK!', 'NICE!']);
function celebrate() {
  comicBurst((() => { const w = GOOD_WORDS(); return w[Math.floor(Math.random() * w.length)]; })(), 'good');
  if (window.Music && Music.ding) Music.ding();
}

// 系統事件（電腦解鎖、抽屜打開…）以字幕讓兩邊都看到；剛進入時不重播舊事件
function processFeed() {
  const feed = state.feed || [];
  const latest = feed.length ? feed[feed.length - 1].t : 0;
  if (feedBaseT === null) { feedBaseT = latest; return; }
  let cheer = false;
  for (const it of feed) if (it.t > feedBaseT) { say(it.text); if (it.cheer) cheer = true; }
  if (cheer) celebrate();
  feedBaseT = Math.max(feedBaseT, latest);
}

function renderGame() {
  const s = state.scene;
  if (!s) return;
  processFeed();
  syncDocs();
  $('#btn-hint').style.opacity = s.hintsLeft > 0 ? 1 : 0.55;

  if (lastSceneIndex !== s.index) {
    unmountActive();
    $('#answer-input').value = '';
    lastSceneIndex = s.index;
    say(s.intro); // 場景旁白，約 5 秒後消失
    if (s.index === 0 && !howtoShown) showHowto();
  }
  // 新出現的提示用字幕顯示（兩邊都看得到）
  if (hintCounts[s.index] === undefined) hintCounts[s.index] = s.hints.length;
  else if (s.hints.length > hintCounts[s.index]) { hintCounts[s.index] = s.hints.length; say('💡 ' + s.hints[s.hints.length - 1], { ms: 7000, now: true }); }

  if (s.interactive) {
    $('#legacy').hidden = true;
    const scene = window.Scenes?.[s.id];
    if (scene) {
      activeScene = s.id;
      const json = JSON.stringify(s.data);
      if (json !== lastDataJson) { lastDataJson = json; scene.render($('#stage'), s.data, sceneCtx()); }
    }
  } else {
    unmountActive();
    $('#legacy').hidden = false;
    $('#you-role').textContent = state.roles[state.you].name;
    $('#clues').replaceChildren(...s.clues.map((c) => Object.assign(document.createElement('li'), { textContent: c })));
    $('#prompt').textContent = s.prompt;
  }
}

// ---------- 總渲染 ----------
function show(id) {
  for (const sec of ['title', 'setup', 'game', 'ending']) $('#' + sec).hidden = sec !== id;
}
function resetGameMemory() { howtoShown = false; lastSceneIndex = -1; feedBaseT = null; hintCounts = {}; endingShown = false; seenDocs = null; closeDocs(true); }
let endingShown = false;
const lastFeedText = () => ((state.feed || []).slice(-1)[0] || {}).text || '';

const TRACK_OF = { dark: 'dark', bedroom: '0', subway: '1', airport: '2' };
let interludeKind = null;
let lastPhase = null;
function render() {
  // 再玩一次：從結局回到遊戲，前端的記憶全部清掉（說明卡不再出現）
  if (state && lastPhase === 'ended' && state.phase === 'playing') { resetGameMemory(); howtoShown = true; Ending.stop(); $('#ending').classList.remove('run'); }
  if (state) lastPhase = state.phase;
  if (state && Array.isArray(state.variants)) { try { localStorage.setItem('playedVariants', JSON.stringify(state.variants)); } catch (e) { /* ignore */ } }
  if (state && roomCode && state.phase === 'playing' && state.interlude) {
    // 轉場動畫（列車駛過 / 機場走道奔跑）：全螢幕，期間不能操作
    unmountActive(); closeDocs(true); show('ending');
    const k = state.interlude.kind;
    if (interludeKind !== k) {
      interludeKind = k;
      if (k === 'train') Music.stop(); // 列車音效自己會播
      Ending.mount($('#ending'), k, { text: lastFeedText() });
      if (k !== 'black') say(lastFeedText(), { now: true, ms: 5000 }); // 黑幕的字幕直接打在畫面正中間
      else { subQueue = []; clearTimeout(subTimer); subShowing = false; subEl.classList.remove('on'); } // 黑幕時底部字幕清空
    }
    feedBaseT = Math.max(feedBaseT || 0, ((state.feed || []).slice(-1)[0] || {}).t || 0); // 過場的旁白已播，下一幕不重播
    return;
  }
  if (interludeKind && state && state.phase === 'playing') { interludeKind = null; Ending.stop(); $('#ending').classList.remove('run'); }
  if (state && roomCode && state.phase === 'playing' && state.scene) { show('game'); renderGame(); Music.play(TRACK_OF[state.scene.id] || String(state.scene.index)); return; }
  if (state && roomCode && state.phase === 'ended') {
    unmountActive(); closeDocs(true); show('ending');
    if (!endingShown) { endingShown = true; interludeKind = null; Music.stop(); Ending.mount($('#ending'), 'tbc', state.ending); }
    const again = $('#ending').querySelector('[data-again]');
    if (again) again.onclick = () => socket.emit('play_again', {}, (res) => { if (!res?.ok) say(L(res?.error) || tr('等對方也在線上', 'Wait until your friend is online too'), { now: true }); });
    return;
  }
  Ending.stop(); $('#ending').classList.remove('run'); interludeKind = null;
  unmountActive(); resetGameMemory(); Music.play('title'); // 封面與選角色：偵探弦樂
  if (screen === 'title' && !roomCode) return show('title');
  show('setup'); screen = 'setup'; renderSetup();
}
socket.on('state', syncRole);
render();

// ---------- 語言切換（封面右上角）----------
document.querySelectorAll('[data-lang]').forEach((b) => { b.onclick = () => I18N.set(b.dataset.lang); });
I18N.onChange((lang) => {
  socket.emit('set_lang', { lang }); // 伺服器會用新的語言重送畫面
  if (window.Title && Title.refresh) Title.refresh();
  lastDataJson = ''; // 讓目前的場景用新語言重畫
  render();
});
