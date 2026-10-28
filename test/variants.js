// 每個場景的每一種變化都要解得開，而且答案不會出現在不該看到的那一方畫面裡。
const assert = require('assert');
const { scenes } = require('../scenes');
const [S0, S1, S2, S3] = scenes.map((s) => s.module);
const json = (x) => JSON.stringify(x);
// 和弦表不能和真實吉他和弦一樣（C 大和弦 x32010）
assert.ok(!JSON.stringify(require('../scenes/scene1').view(require('../scenes/scene1').init(0), 'B').chart).includes('[null,3,2,0,1,0]'));
const allHints = (sc, st) => sc.hints.flatMap((h) => h.tiers.map((t) => (typeof t === 'function' ? t(st) : t)));

for (const sc of scenes) assert.ok(sc.module.VARIANTS >= 5, `${sc.id} 應該有至少 5 種變化`);

for (let v = 0; v < 5; v++) {
  // 場景 0
  let st = S0.init(v);
  assert.equal(S0.act(st, 'B', { type: 'plug', socket: 0 }).solved, undefined);
  for (const a of S0.solution(v)) S0.act(st, 'B', a);
  assert.ok(st.solved, `dark v${v}`);
  assert.ok(allHints(scenes[0], st).every((t) => typeof t === 'string' && t.length > 5));

  // 場景 1
  const sol = S1.solution(v);
  st = S1.init(v);
  const b0 = json(S1.view(st, 'B')), a0 = json(S1.view(st, 'A'));
  assert.ok(!b0.includes(`"${sol.password}`) && !a0.includes(sol.password), `bedroom v${v} 密碼外洩`);
  assert.ok(!b0.includes(sol.drawerCode), `bedroom v${v} 抽屜密碼外洩給 B`);
  for (const [k, c] of Object.entries(sol.codes)) assert.ok(!a0.includes(c) && (k === 'love' || !b0.includes(c)), `bedroom v${v} 行李箱密碼外洩`); // 情書箱子開著，鎖上看得到它的密碼（教學）
  // 猜字線索要和答案一致；衣櫃紙 3 條給 B、書桌紙 3 條給 A
  const B1 = S1.view(st, 'B'), A1 = S1.view(st, 'A');
  const log = B1.papers[0];
  assert.equal(log.kind, 'log'); assert.equal(log.days.length, 2);
  const [d1, d3] = log.days;
  assert.equal(d1.answer, sol.demo.ans.toUpperCase()); // 10/1 有完整答案，用來倒推代號
  assert.equal(d1.rows[d1.rows.length - 1].fb, `4${sol.tag[0]}0${sol.tag[1]}`);
  assert.ok(d1.rows.some((r) => r.fb[2] !== '0' && r.fb[0] === '0'), `bedroom v${v} 範例要有只有「位置不對」的一行`);
  assert.equal(d3.rows.length, 4); assert.equal(A1.deskPaper.rows.length, 3);
  assert.ok(A1.deskPaper.date.includes('10 月 3 日'));
  assert.ok(!json(A1).includes(sol.demo.ans.toUpperCase()), 'A 不該看到 10/1 那局');
  sol.guesses.forEach((g) => assert.ok(!g.split('').every((ch, i) => ch === sol.password[i])));
  assert.equal(S1.act(st, 'A', { type: 'pc_password', value: 'zzzz' }).correct, false);
  assert.ok(S1.act(st, 'A', { type: 'pc_password', value: sol.password }).correct);
  assert.ok(json(S1.view(st, 'A').notion).includes(sol.drawerCode));
  const wrong = sol.drawer === 1 ? 2 : 1;
  S1.act(st, 'B', { type: 'drawer_code', drawer: wrong, code: '0000' });
  assert.ok(!st.hasKey);
  assert.ok(S1.act(st, 'B', { type: 'drawer_code', drawer: sol.drawer, code: sol.drawerCode }).correct && st.hasKey, `bedroom v${v} 鑰匙`);
  assert.ok(/鑰匙/.test(S1.view(st, 'B').drawers[sol.drawer].contents));
  // 吉他譜的琴格對照和弦表，要拼得出飛機箱的密碼
  const chart = S1.view(st, 'B').chart, sheets = S1.view(st, 'A').sheets;
  const decode = (sh) => sh.bars.map((fr) => chart.find((c) => json(c.frets) === json(fr)).name).join('');
  // 譜的順序：情書 → 不能說的秘密 → 飛機場的十點半；情書箱子開著、鎖上的字母＝《情書》的和弦
  assert.deepEqual(sheets.map((x) => x.title), ['情書', '不能說的秘密', '飛機場的十點半']);
  assert.equal(S1.view(st, 'B').cases.love.lock, decode(sheets[0]));
  assert.equal(decode(sheets[2]), sol.codes.plane);
  S1.act(st, 'A', { type: 'strum', chords: decode(sheets[2]) });
  assert.equal(S1.view(st, 'B').glow.id, 'plane');
  // 沒按準備直接彈：不會開
  assert.ok(!st.cases.plane);
  // 準備後超過時間：失敗
  S1.act(st, 'B', { type: 'case_ready', case: 'plane', code: sol.codes.plane });
  st.armed.t -= 20000;
  assert.equal(S1.act(st, 'A', { type: 'strum', chords: sol.codes.plane }).correct, false);
  S1.act(st, 'B', { type: 'case_ready', case: 'plane', code: sol.codes.plane });
  assert.ok(S1.act(st, 'A', { type: 'strum', chords: decode(sheets[2]) }).correct && st.hasPassport, `bedroom v${v} 護照`);
  assert.ok(S1.act(st, 'B', { type: 'door_unlock' }).solved, `bedroom v${v} 門`);
  assert.ok(allHints(scenes[1], st).every((t) => typeof t === 'string' && !t.includes('undefined')));

  // 場景 2：修看板（接線 + 調頻）→ 全亮 → 選線
  st = S2.init(v);
  const s2 = S2.solution(v);
  assert.equal(S2.act(st, 'B', { type: 'board', line: s2.line }).solved, undefined); // 沒修好不能選
  for (const l of S2.LINES) {
    if (l === s2.lit) continue;
    const wrong = S2.LINES.filter((x) => !st.powered[x]).map((x) => s2.sym[x]).find((x) => x !== s2.sym[l]);
    if (!wrong) { S2.act(st, 'B', { type: 'plug', line: l, term: s2.sym[l] }); S2.act(st, 'B', { type: 'gate', term: s2.sym[l] }); S2.act(st, 'A', { type: 'tune', line: l, ch: s2.ch[l] }); continue; }
    S2.act(st, 'B', { type: 'plug', line: l, term: wrong });
    assert.equal(S2.act(st, 'B', { type: 'gate', term: wrong }).correct, false);
    S2.act(st, 'B', { type: 'plug', line: l, term: s2.sym[l] });
    S2.act(st, 'B', { type: 'gate', term: s2.sym[l] });
    S2.act(st, 'A', { type: 'tune', line: l, ch: s2.ch[l] });
  }
  assert.ok(st.allClear, `subway v${v} 看板全亮`);
  const a2 = S2.view(st, 'A');
  assert.ok(a2.board.rows.every((r) => r.state === 'clear' && r.to));
  for (const l of S2.LINES) if (l !== s2.line) assert.equal(S2.act(st, 'B', { type: 'board', line: l }).correct, false);
  assert.ok(S2.act(st, 'B', { type: 'board', line: s2.line }).solved);
  assert.ok(/[0-9]:[0-9]{2} [AP]M/.test(S2.docPatch(v).ticket.boarding) && ['JFK', 'LGA', 'EWR'].includes(S2.docPatch(v).ticket.airport));
  assert.ok(allHints(scenes[2], st).every((t) => !t.includes('undefined') && !t.includes('NaN')));

  // 場景 3：行李推理 → 登機口
  st = S3.init(v);
  const s3 = S3.solution(v);
  const A3 = S3.view(st, 'A'), B3 = S3.view(st, 'B');
  assert.equal(A3.flights.length, 10); assert.equal(new Set(A3.flights.map((f) => f.gate)).size, 10);
  assert.ok(!json(B3).includes('"gate"') && !json(A3).includes('"items"'));
  for (const f of A3.flights) if (f.gate !== s3.gate) assert.equal(S3.act(st, 'B', { type: 'gate', gate: f.gate }).correct, false);
  assert.ok(S3.act(st, 'B', { type: 'gate', gate: s3.gate }).solved, `airport v${v}`);
  assert.ok(allHints(scenes[3], st).every((t) => !t.includes('undefined')));
}
// 每種變化的答案都不一樣
const uniq = (f) => new Set([0, 1, 2, 3, 4].map(f)).size === 5;
assert.ok(uniq((v) => S1.solution(v).tag.join('')) && uniq((v) => S1.solution(v).password) && uniq((v) => S1.solution(v).codes.plane) && uniq((v) => S2.solution(v).line) && uniq((v) => S3.solution(v).answer) && uniq((v) => json(S0.solution(v))));
console.log('✅ variants test passed (4 scenes × 5 variants)');
