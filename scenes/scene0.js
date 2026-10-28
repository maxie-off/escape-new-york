// 場景 0：黑暗的房間（5 種變化，每場遊戲隨機抽一種）
//   Raccoony(A)：沙發上的一張紙：三種形狀各對應一個顏色；最下面是一個「範例」：某種燈罩形狀的立燈 → 同樣形狀的插孔
//   （範例的燈罩形狀故意和 Slothy 那盞不同，玩家要推出規則：燈罩是什麼形狀，就插什麼形狀的插孔）。
//   Slothy 看得到自己那盞立燈的燈罩形狀。
//   Slothy(B)：延長線上三個插孔（排列順序和紙上不同），每個插孔旁有開關（按一下依序 紅→藍→綠，一開始都是藍色）。
//   三個開關都要按成紙上對應的顏色，再把立燈插進紙上畫的那個形狀，才會通電。
// 答案只存在伺服器；B 只會看到插座和開關，A 只會看到那張紙。

const VARIANTS = [
  { paper: { trapezoid: 'red', inverted: 'green', square: 'blue' }, lamp: 'trapezoid', example: 'square', order: ['square', 'trapezoid', 'inverted'] },
  { paper: { trapezoid: 'blue', inverted: 'red', square: 'green' }, lamp: 'inverted', example: 'trapezoid', order: ['trapezoid', 'square', 'inverted'] },
  { paper: { trapezoid: 'green', inverted: 'blue', square: 'red' }, lamp: 'square', example: 'trapezoid', order: ['square', 'inverted', 'trapezoid'] },
  { paper: { trapezoid: 'green', inverted: 'red', square: 'blue' }, lamp: 'trapezoid', example: 'inverted', order: ['inverted', 'square', 'trapezoid'] },
  { paper: { trapezoid: 'blue', inverted: 'green', square: 'red' }, lamp: 'inverted', example: 'square', order: ['square', 'inverted', 'trapezoid'] },
];
const CYCLE = ['red', 'blue', 'green'];
const NAME = { trapezoid: '梯形', inverted: '倒梯形', square: '正方形' };
const ZH = { red: '紅色', blue: '藍色', green: '綠色' };

function init(v = 0) { return { v, solved: false, sw: ['blue', 'blue', 'blue'] }; }
const V = (state) => VARIANTS[state.v];

function view(state, role) {
  const vv = V(state);
  if (role === 'A') return { role, paper: Object.entries(vv.paper).map(([shape, color]) => ({ shape, color })), example: vv.example };
  return { role, lamp: vv.lamp, sockets: vv.order.map((shape, i) => ({ shape, sw: state.sw[i] })) };
}

function act(state, role, a = {}) {
  if (role !== 'B') return { ok: false, message: '插座在 Slothy 那邊。' };
  const vv = V(state);
  const i = Number(a.socket);
  if (!Number.isInteger(i) || i < 0 || i >= vv.order.length) return { ok: false };
  if (a.type === 'switch') {
    state.sw[i] = CYCLE[(CYCLE.indexOf(state.sw[i]) + 1) % CYCLE.length];
    return { ok: true };
  }
  if (a.type !== 'plug') return { ok: false };
  const allRight = vv.order.every((s, k) => state.sw[k] === vv.paper[s]);
  if (vv.order[i] !== vv.lamp || !allRight) {
    return { ok: true, correct: false, message: '⚡ 吱吱吱——沒通電，延長線掉下來了！', events: [{ text: '⚡ 吱吱吱！沒通電，延長線掉在地上。' }] };
  }
  state.solved = true;
  return { ok: true, correct: true, solved: true, events: [{ text: '💡 叮叮叮！立燈亮了！' }] };
}

// 給提示用的答案文字，以及測試用的解法
function answers(state) {
  const vv = V(state);
  const sw = Object.entries(vv.paper).map(([s, c]) => `${NAME[s]}${ZH[c]}`).join('、');
  return { plug: `開關按成：${sw}，再把立燈插進${NAME[vv.lamp]}插孔。` };
}
function solution(v) {
  const vv = VARIANTS[v];
  const steps = [];
  vv.order.forEach((s, i) => { let c = 'blue'; while (c !== vv.paper[s]) { steps.push({ type: 'switch', socket: i }); c = CYCLE[(CYCLE.indexOf(c) + 1) % 3]; } });
  steps.push({ type: 'plug', socket: vv.order.indexOf(vv.lamp) });
  return steps;
}

module.exports = { init, view, act, answers, solution, VARIANTS: VARIANTS.length };
