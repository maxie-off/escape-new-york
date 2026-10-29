// 冒烟测试：模拟两个玩家配对、选角色、准备、走完 5 关
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const assert = require('assert');

const PORT = 3999;
const url = `http://localhost:${PORT}`;
const emit = (s, ev, data) => new Promise((r) => (data === undefined ? s.emit(ev, r) : s.emit(ev, data, r)));
const waitState = (s, pred) =>
  new Promise((res) => {
    const h = (st) => { if (pred(st)) { s.off('state', h); res(st); } };
    s.on('state', h);
  });

(async () => {
  setTimeout(() => { console.error('❌ smoke test timed out (60s)'); process.exit(1); }, 60000).unref();
  const server = spawn('node', ['server.js'], { env: { ...process.env, PORT, TRANSITION_SCALE: '0.05', FORCE_VARIANT: '0' }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 800));
  try {
    const a = io(url), b = io(url);
    await Promise.all([new Promise((r) => a.on('connect', r)), new Promise((r) => b.on('connect', r))]);

    const { code } = await emit(a, 'create_room');
    assert.equal(code.length, 6);
    assert.ok((await emit(a, 'join_room', { code, clientId: 'A1' })).ok);
    assert.ok((await emit(b, 'join_room', { code: code.toLowerCase(), clientId: 'B1' })).ok);

    // 第三个人进不来
    const c = io(url); await new Promise((r) => c.on('connect', r));
    assert.equal((await emit(c, 'join_room', { code, clientId: 'C1' })).ok, false);
    c.close();

    assert.ok((await emit(a, 'choose_role', { role: 'A' })).ok);
    assert.equal((await emit(b, 'choose_role', { role: 'A' })).ok, false); // 已被选走
    assert.ok((await emit(b, 'choose_role', { role: 'B' })).ok);

    const playingA = waitState(a, (s) => s.phase === 'playing');
    const playingB = waitState(b, (s) => s.phase === 'playing');
    assert.equal((await emit(a, 'start_game', {})).ok, true);
    const [sa, sb] = await Promise.all([playingA, playingB]);
    // ---- 场景 0（黑暗開場）----
    // 語言：每位玩家自己選；切成英文後，那位玩家收到的文字都是英文，對方不受影響
    const enA = waitState(a, (s) => s.scene && /dark/.test(s.scene.intro));
    await emit(a, 'set_lang', { lang: 'en' });
    const ea = await enA;
    assert.ok(!/[\u4e00-\u9fff]/.test(JSON.stringify(ea.scene)), 'A 的英文畫面不該有中文');
    const zhA = waitState(a, (s) => s.scene && /好暗/.test(s.scene.intro));
    await emit(a, 'set_lang', { lang: 'zh' });
    await zhA;
    assert.equal(sa.scene.id, 'dark');
    // 分層提示：方向 → 線索 → 答案，用完就不能再要
    assert.equal(sa.scene.hintsLeft, 3);
    const h1 = waitState(a, (s) => s.scene && s.scene.hints.length === 1);
    assert.ok((await emit(a, 'request_hint', {})).ok);
    assert.ok((await h1).scene.hints[0].startsWith('方向：'));
    await emit(b, 'request_hint', {}); await emit(a, 'request_hint', {});
    assert.equal((await emit(a, 'request_hint', {})).ok, false);
    assert.ok(sa.scene.data.paper.length === 3 && !sa.scene.data.sockets);
    assert.ok(sb.scene.data.sockets.length === 3 && !sb.scene.data.paper);
    assert.equal(sb.scene.data.lamp, 'trapezoid'); assert.equal(sa.scene.data.example, 'square'); assert.equal(sa.scene.data.lamp, undefined); // 燈罩形狀只有 B 看得到，A 的紙上是範例
    assert.equal(sb.scene.data.sockets[1].shape, 'trapezoid'); // B 的插孔順序和紙上不同
    assert.equal((await emit(a, 'scene_action', { type: 'plug', socket: 1 })).ok, false); // 只有 B
    assert.equal((await emit(b, 'scene_action', { type: 'plug', socket: 1 })).correct, false); // 開關還是藍色
    await emit(b, 'scene_action', { type: 'switch', socket: 1 }); // 藍→綠
    await emit(b, 'scene_action', { type: 'switch', socket: 1 }); // 綠→紅
    assert.equal((await emit(b, 'scene_action', { type: 'plug', socket: 1 })).correct, false); // 倒梯形還不是綠色
    assert.equal((await emit(a, 'scene_action', { type: 'switch', socket: 2 })).ok, false);
    await emit(b, 'scene_action', { type: 'switch', socket: 2 }); // 藍→綠
    assert.equal((await emit(b, 'scene_action', { type: 'plug', socket: 0 })).correct, false); // 插錯孔
    assert.equal((await emit(b, 'scene_action', { type: 'plug', socket: 9 })).ok, false);
    const lamp = waitState(b, (s) => s.interlude && s.interlude.kind === 'lamp');
    const toRoomA = waitState(a, (s) => s.scene && s.scene.id === 'bedroom');
    const toRoomB = waitState(b, (s) => s.scene && s.scene.id === 'bedroom');
    assert.equal((await emit(b, 'scene_action', { type: 'plug', socket: 1 })).correct, true);
    await lamp;
    const [ra, rb] = [await toRoomA, await toRoomB];

    // ---- 场景 1（互动式）----
    assert.ok(ra.scene.interactive && rb.scene.interactive);
    Object.assign(sa, ra); Object.assign(sb, rb);
    assert.equal(sa.scene.data.role, 'A');
    assert.equal(sb.scene.data.role, 'B');
    // 1A2B 筆記：任一方劃掉字母，兩邊同步；再點一次恢復
    const struckB = waitState(b, (s) => s.scene && (s.scene.data.struck || []).includes('q'));
    await emit(a, 'scene_action', { type: 'strike', letter: 'Q' });
    await struckB;
    const unstruckA = waitState(a, (s) => s.scene && !(s.scene.data.struck || []).includes('q'));
    await emit(b, 'scene_action', { type: 'strike', letter: 'q' });
    await unstruckA;
    assert.equal((await emit(b, 'scene_action', { type: 'strike', letter: '1' })).ok, false);
    // 防剧透：开电脑前 A 看不到日记/密码；B 的画面里没有电脑密码和抽屉密码
    assert.equal(sa.scene.data.notion, null);
    for (const secret of ['acid', '4827']) assert.ok(!JSON.stringify(sb).includes(secret), 'B 不该看到 ' + secret);
    for (const secret of ['acid', '4827']) assert.ok(!JSON.stringify(sa).includes(secret), 'A 解锁前不该看到 ' + secret);
    for (const code of ['CDAF', 'AGFC']) { assert.ok(!JSON.stringify(sa).includes(code) && !JSON.stringify(sb).includes(code), '行李箱密碼不該外洩 ' + code); }
    assert.ok(sa.scene.data.sheets.length === 3 && sa.scene.data.chart === undefined && sb.scene.data.chart.length === 7 && sa.scene.data.note2.length === 1 && sa.scene.data.deskPaper.rows.length === 3);
    assert.ok(!JSON.stringify(sa.scene.data.sheets).match(/"[A-G]"/), '樂譜上不該有和弦字母');
    assert.equal(sb.scene.data.cases.plane.contents, null);
    assert.ok(!JSON.stringify(sa.scene.data.notion || {}).includes('襪'));

    // 角色限制
    assert.equal((await emit(b, 'scene_action', { type: 'pc_password', value: 'acid' })).ok, false);
    assert.equal((await emit(a, 'scene_action', { type: 'drawer_code', drawer: 4, code: '4827' })).ok, false);

    // 错误密码
    assert.equal((await emit(a, 'scene_action', { type: 'pc_password', value: 'wrong' })).correct, false);
    // 门没钥匙打不开
    const noKey = await emit(b, 'scene_action', { type: 'door_unlock' });
    assert.ok(noKey.message.includes('鑰匙'));

    // 正确密码 → A 才看到日记，且日记里有抽屉密码
    const unlocked = waitState(a, (s) => s.scene?.data?.pcUnlocked);
    assert.equal((await emit(a, 'scene_action', { type: 'pc_password', value: 'ACID ' })).correct, true); // 不分大小寫
    const ua = await unlocked;
    assert.ok(JSON.stringify(ua.scene.data.notion).includes('4827'));

    // 错的抽屉密码 / 错的抽屉（没钥匙的格）
    assert.equal((await emit(b, 'scene_action', { type: 'drawer_code', drawer: 4, code: '1111' })).correct, false);
    assert.equal((await emit(b, 'scene_action', { type: 'drawer_code', drawer: 1, code: '2290' })).correct, true);
    // 正确：第 4 格 + 4827 → 拿到钥匙
    const gotKey = waitState(b, (s) => s.scene?.data?.hasKey);
    assert.equal((await emit(b, 'scene_action', { type: 'drawer_code', drawer: 4, code: '4827' })).correct, true);
    await gotKey;
    // 書桌上的機票 → 只有 A 能拿，拿了進收藏文件
    assert.equal((await emit(b, 'scene_action', { type: 'take_ticket' })).ok, false);
    const gotTicket = waitState(a, (s) => (s.docs || []).some((d) => d.id === 'ticket'));
    assert.equal((await emit(a, 'scene_action', { type: 'take_ticket' })).ok, true);
    const tState = await gotTicket;
    assert.equal(tState.docs[0].boarding, '2:00 PM');
    assert.equal(tState.scene.data.ticketTaken, true);
    assert.equal((await emit(a, 'scene_action', { type: 'take_ticket' })).ok, true);
    assert.equal(tState.docs.length, 1); // 重複拿不會重複收藏
    // 有鑰匙但沒護照 → 門打不開
    const noPass = await emit(b, 'scene_action', { type: 'door_unlock' });
    assert.ok(noPass.message.includes('護照') && !noPass.solved);
    // 行李箱（共鳴鎖）：情書箱子一開始就開著，鎖上看得到它的密碼
    assert.ok(sb.scene.data.cases.love.open && sb.scene.data.cases.love.lock === 'DGBE');
    assert.ok(sb.scene.data.cases.love.contents.letters[0].includes('共鳴鎖'));
    // 只有 A 能彈；彈對《飛機場的十點半》，B 看到咖啡色（plane）箱子的鎖亮
    assert.equal((await emit(b, 'scene_action', { type: 'strum', chords: 'CDAF' })).ok, false);
    assert.equal((await emit(a, 'scene_action', { type: 'case_ready', case: 'plane', code: 'CDAF' })).ok, false);
    const glow = waitState(b, (s) => s.scene && s.scene.data.glow && s.scene.data.glow.id === 'plane');
    await emit(a, 'scene_action', { type: 'strum', chords: 'CDAF' });
    await glow;
    // 轉錯也能按準備，要等彈完才知道失敗
    const armedA = waitState(a, (s) => s.scene && s.scene.data.resonate);
    assert.ok((await emit(b, 'scene_action', { type: 'case_ready', case: 'plane', code: 'AAAA' })).ok);
    await armedA; // A 的吉他會自己震動
    assert.equal((await emit(a, 'scene_action', { type: 'strum', chords: 'AAAA' })).correct, false); // 密碼本身不對
    // 密碼對、但彈錯歌也失敗
    await emit(b, 'scene_action', { type: 'case_ready', case: 'plane', code: 'CDAF' });
    assert.equal((await emit(a, 'scene_action', { type: 'strum', chords: 'AGFC' })).correct, false);
    // 秘密箱子：不是要找的
    await emit(b, 'scene_action', { type: 'case_ready', case: 'secret', code: 'AGFC' });
    assert.equal((await emit(a, 'scene_action', { type: 'strum', chords: 'AGFC' })).correct, true);
    assert.equal((await emit(b, 'scene_action', { type: 'door_unlock' })).solved, undefined);
    const gotPass = waitState(b, (s) => (s.docs || []).some((d) => d.id === 'passport'));
    await emit(b, 'scene_action', { type: 'case_ready', case: 'plane', code: 'CDAF' });
    assert.equal((await emit(a, 'scene_action', { type: 'strum', chords: 'CDAF' })).correct, true);
    await gotPass;
    // 开门 → 进入场景 2（過場：沒有場景）
    const toScene2 = waitState(b, (s) => s.scene && s.scene.index === 2);
    const toScene2A = waitState(a, (s) => s.scene && s.scene.index === 2);
    assert.equal((await emit(b, 'scene_action', { type: 'door_unlock' })).ok, true);
    await toScene2;
    // 互动场景结束后不该再接受 scene_action
    assert.equal((await emit(b, 'scene_action', { type: 'door_unlock' })).ok, false);

    // ---- 場景 2（互動式：地鐵）----
    const s2a = await toScene2A, s2b = await toScene2;
    assert.ok(s2a.scene.interactive && s2a.scene.data.board && s2a.scene.data.role === 'A');
    // 防劇透：A 看不到路人的 110 分鐘；B 看不到看板分鐘數與答案
    assert.ok(!JSON.stringify(s2a.scene.data).includes('110'), 'A 不該看到 110'); // 只看場景資料（feed 的時間戳可能剛好含 110）
    {
      assert.ok(s2b.scene.data.people.length === 4 && !s2b.scene.data.board);
      assert.ok(!JSON.stringify(s2b).includes('"next"'), 'B 不該看到看板分鐘');
    }
    assert.ok(s2a.docs.some((d) => d.id === 'ticket'), '機票收藏要跟到場景 2'); // 收藏跨場景保留
    // 看板壞了：只有「沒用的線」B 亮著；其他列沒有目的地與時間
    const rows0 = s2a.scene.data.board.rows;
    assert.equal(rows0.find((r) => r.line === 'B').state, 'clear');
    assert.ok(rows0.filter((r) => r.line !== 'B').every((r) => r.state === 'dark' && r.to === undefined && r.next === undefined));
    assert.ok(!JSON.stringify(s2b).includes('"sym"'), 'B 不該看到看板上的符號');
    assert.ok(!JSON.stringify(s2a).includes('"ch"'), 'A 不該看到頻道');
    assert.ok(s2b.scene.data.map && s2b.scene.data.map.JFK === 'Queens'); // 柱子上的舊地圖
    assert.deepEqual(s2b.docs.map((d) => d.id), ['passport']);
    assert.equal((await emit(b, 'scene_action', { type: 'board', line: 'C' })).message.includes('看板還沒修好'), true);
    // 接錯：閘門跳回去、那列閃紅光
    assert.equal((await emit(a, 'scene_action', { type: 'plug', line: 'C', term: 'circ' })).ok, false); // 只有 B
    await emit(b, 'scene_action', { type: 'plug', line: 'C', term: 'sq' });
    const flashA = waitState(a, (s) => s.scene && s.scene.data.flash && s.scene.data.flash.line === 'C');
    assert.equal((await emit(b, 'scene_action', { type: 'gate', term: 'sq' })).correct, false);
    await flashA;
    // 接對 → 雜訊 → A 轉對頻道 → 清楚
    const wiring = [['C', 'circ', 7], ['E', 'sq', 2], ['1', 'star', 9], ['2', 'dia', 5]]; // 最後一條是 2 線
    for (const [l, term, ch] of wiring) {
      await emit(b, 'scene_action', { type: 'plug', line: l, term });
      assert.equal((await emit(b, 'scene_action', { type: 'gate', term })).correct, true);
      assert.equal((await emit(b, 'scene_action', { type: 'tune', line: l, ch })).ok, false); // 只有 A
      await emit(a, 'scene_action', { type: 'tune', line: l, ch: ch === 9 ? 1 : ch + 1 }); // 轉錯還是雜訊
      const lit = waitState(a, (s) => s.scene && s.scene.data.board.rows.find((r) => r.line === l).state === 'clear' && (l !== '2' || s.scene.data.allClear));
      assert.equal((await emit(a, 'scene_action', { type: 'tune', line: l, ch })).correct, true);
      await lit;
    }
    assert.equal((await emit(a, 'scene_action', { type: 'board', line: 'E' })).ok, false); // 只有 B 能選
    assert.equal((await emit(b, 'scene_action', { type: 'board', line: 'E' })).correct, false); // 來不及
    assert.equal((await emit(b, 'scene_action', { type: 'board', line: '1' })).correct, false); // 往別區（EWR 的誤導）
    assert.equal((await emit(b, 'scene_action', { type: 'board', line: 'X' })).ok, false);
    // 選對路線 → 列車過場（期間不能操作）→ 場景 3
    const inter = waitState(b, (s) => s.interlude && s.interlude.kind === 'train');
    assert.equal((await emit(b, 'scene_action', { type: 'board', line: 'C' })).ok, true);
    const is = await inter;
    assert.ok(!is.scene, '過場期間不送場景');
    assert.equal((await emit(b, 'scene_action', { type: 'board', line: 'C' })).ok, false);
    const to3a = waitState(a, (s) => s.scene && s.scene.index === 3);
    const to3b = waitState(b, (s) => s.scene && s.scene.index === 3);
    const s3a = await to3a, s3b = await to3b;

    // ---- 場景 3（機場）----
    assert.equal(s3a.scene.id, 'airport');
    // A：看板（日期 + 8 個航班）+ 旅遊貼文 + terminal；B：打開的行李箱（信用卡、Travel Document、衣物、小物）
    assert.ok(s3a.scene.data.role === 'A' && s3a.scene.data.flights.length === 8 && s3a.scene.data.posts.length === 4 && s3a.scene.data.date.m === 1);
    assert.ok(!s3a.scene.data.clothing && !s3a.scene.data.card, 'A 看不到行李內容');
    assert.ok(s3b.scene.data.role === 'B' && s3b.scene.data.clothing.includes('bikini') && s3b.scene.data.card.name === 'TIFFANY' && s3b.scene.data.doc.airline === 'BLUEBIRD AIRLINES');
    assert.ok(!s3b.scene.data.flights && !s3b.scene.data.posts, 'B 看不到看板與貼文');
    // 駭入：選航空公司 → 三題 → 旅客名單
    assert.equal((await emit(b, 'scene_action', { type: 'airline', code: 'BB' })).ok, false);
    assert.ok((await emit(a, 'scene_action', { type: 'airline', code: 'BB' })).correct);
    const doneP = waitState(a, (s) => s.scene && s.scene.data.hack && s.scene.data.hack.phase === 'done');
    for (const c of ['4F', 'heart', 1]) assert.ok((await emit(a, 'scene_action', { type: 'hack', choice: c })).correct);
    const doneA = await doneP;
    const hers = doneA.scene.data.hack.manifest.filter((m) => m.names.includes('TIFFANY')).map((m) => s3a.scene.data.flights.find((f) => f.flight === m.flight));
    assert.equal(hers.length, 2);
    const sydGate = hers.find((f) => f.dest === 'SYDNEY').gate;
    const otherGate = hers.find((f) => f.dest === 'LISBON').gate; // 夏天衝浪的誘答（紐約 1 月是冬天）
    assert.equal((await emit(a, 'scene_action', { type: 'gate', gate: sydGate })).ok, false); // 只有 B
    assert.equal((await emit(b, 'scene_action', { type: 'gate', gate: otherGate })).correct, false);
    assert.equal((await emit(b, 'scene_action', { type: 'gate', gate: 101 })).ok, false);
    const run = waitState(b, (s) => s.interlude && s.interlude.kind === 'run');
    const ended = waitState(b, (s) => s.phase === 'ended');
    assert.equal((await emit(b, 'scene_action', { type: 'gate', gate: sydGate })).ok, true);
    await run;
    const es = await ended;
    assert.equal(es.ending.title, 'To be continued');
    assert.equal(es.ending.hintTotal, 3);
    // 再玩一次：直接回到開場，提示次數歸零
    const again = waitState(a, (s) => s.phase === 'playing' && s.scene && s.scene.id === 'dark');
    assert.ok((await emit(b, 'play_again', {})).ok);
    const ag = await again;
    assert.equal(ag.scene.hintsLeft, 3); assert.equal(ag.scene.hintTotal, 0);
    assert.ok(Array.isArray(ag.variants) && ag.variants.length === 4);

    console.log('✅ smoke test passed');
    a.close(); b.close();
  } catch (e) {
    console.error('❌', e);
    process.exitCode = 1;
  } finally {
    server.kill(); setTimeout(() => process.exit(), 100);
  }
})();
