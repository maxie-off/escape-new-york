// ============================================================
// 角色與關卡清單（開場 + 3 個場景）。文字都用 T('中文', 'English') 寫，伺服器依玩家選的語言送出。
// 場景 1：房間（scenes/scene1.js、public/scene1.js）；場景 2：地鐵站；場景 3：機場大廳。
// transition：過關後、進下一場景（或結尾）前的過場動畫（kind 對應前端 public/ending.js），ms 是長度。
// 伺服器只會把「該玩家角色看得到的內容」發給前端，答案不會外洩。
// ============================================================

const { T } = require('./i18n');

const roles = {
  A: { name: 'Raccoony', tagline: T('棕灰色小浣熊 · 電腦前的偵探', 'Gray-brown raccoon · the detective at the computer') },
  B: { name: 'Slothy', tagline: T('灰藍色小樹懶 · 愛睡覺的慢活家', 'Blue-gray sloth · loves naps and taking it slow') },
};

const S0 = require('./scenes/scene0'), S1 = require('./scenes/scene1'), S2 = require('./scenes/scene2'), S3 = require('./scenes/scene3');
// 提示的「答案」層會依這場抽到的變化產生（tiers 裡可以放函式，參數是場景狀態）
const scenes = [
  {
    // 開場：黑暗的房間，插對插座讓立燈亮起來
    id: 'dark',
    module: S0,
    intro: T('好暗……什麼都看不見。我們得先讓房間亮起來。', 'It’s so dark… we can’t see a thing. We need to light up the room first.'),
    hints: [
      {
        done: (s) => s.solved,
        tiers: [
          T('Raccoony 看紙、Slothy 看插座，互相說說看到的形狀和顏色。', 'Raccoony has the paper, Slothy the sockets. Tell each other the shapes and colors.'),
          T('紙上：形狀對應顏色，最下面是立燈的形狀。看形狀，不看位置。', 'The paper pairs shapes with colors; the bottom shows the lamp’s shape. Match shapes, not positions.'),
          (s) => S0.answers(s).plug,
        ],
      },
    ],
    outro: T('燈亮了！', 'The lights are on!'),
    transition: { kind: 'lamp', ms: 3000 },
  },
  {
    id: 'bedroom',
    module: S1,
    // intro 會當作字幕顯示約 5 秒後消失
    intro: T('房門被鎖住了，而鑰匙不知道被誰藏到哪裡去了。', 'The door is locked, and someone has hidden the key.'),
    hints: [
      {
        done: (s) => s.pcUnlocked,
        tiers: [
          T('密碼藏在猜字紀錄裡：兩張紙上的「10 月 3 日」要合起來看。', 'The password is in the word-game logs. Read both “Oct 3” papers together.'),
          (s) => S1.answers(s).tag,
          (s) => S1.answers(s).password,
        ],
      },
      {
        done: (s) => s.hasKey,
        tiers: [
          T('日記說鑰匙藏在哪，衣櫃地圖說每一格放什麼。', 'The diary says where the key is; the wardrobe map shows each drawer.'),
          (s) => T(`鑰匙在${S1.answers(s).keyItem.zh}裡。找出是第幾格，再到「密碼本」查密碼。`, `The key is with the ${S1.answers(s).keyItem.en.toLowerCase()}. Find that drawer, then its code in Passwords.`),
          (s) => S1.answers(s).drawer,
        ],
      },
      {
        done: (s) => s.hasPassport,
        tiers: [
          T('護照在床底下的箱子。右邊的箱子開著：看看情書和它的鎖。', 'The passport is in a suitcase under the bed. The right one is open: read the letters, check its lock.'),
          T('譜上每一小節是一個和弦，對照 Slothy 的和弦表。開鎖：Slothy 按準備，Raccoony 10 秒內彈出來。', 'Each tab bar is one chord; match it on Slothy’s chord chart. To unlock: Slothy taps Ready, Raccoony plays within 10 s.'),
          (s) => S1.answers(s).plane,
        ],
      },
      {
        done: (s) => s.doorOpen,
        tiers: [T('鑰匙和護照都拿到了，Slothy 去開門吧！', 'You have the key and the passport. Slothy, open the door!'), T('點門把就能開門。', 'Tap the door knob to open it.'), T('點門把就能開門。', 'Tap the door knob to open it.')],
      },
    ],
    outro: T('房門開了！兩個小夥伴衝了出去……', 'The door is open! The two friends dash out…'),
    transition: { kind: 'black', ms: 4200 },
  },
  {
    // 互動式場景：邏輯在 scenes/scene2.js、畫面在 public/scene2.js
    id: 'subway',
    module: S2,
    intro: T('到地鐵站了！我們該搭哪一條線？', 'We made it to the subway! Which line should we take?'),
    hints: [
      {
        done: (s) => s.allClear,
        tiers: [
          T('看板壞了。Slothy 按右箭頭去電箱，把每條電線接到對的符號。', 'The board is broken. Slothy, open the electric box (right arrow) and wire each line to its symbol.'),
          T('符號在 Raccoony 的看板上。接好後，Raccoony 把旋鈕轉到牌子背面的頻道。', 'The symbols are on Raccoony’s board. Once wired, Raccoony turns the knob to the channel on the tag’s back.'),
          (s) => S2.answers(s).fix,
        ],
      },
      {
        done: (s) => s.solved,
        tiers: [
          T('機票說去哪個機場，路線圖說機場在哪一站。路人會說哪條線在施工。', 'The ticket names the airport; the route map shows its stop. Passers-by say which lines are detoured.'),
          (s) => S2.answers(s).clue,
          (s) => S2.answers(s).line,
        ],
      },
    ],
    outro: T('列車進站，兩人擠上車，往機場出發……', 'The train pulls in, they squeeze aboard and head for the airport…'),
    transition: { kind: 'train', ms: 8300 },
  },
  {
    // 互動式場景：邏輯在 scenes/scene3.js、畫面在 public/scene3.js
    id: 'airport',
    module: S3,
    intro: T('緊急狀況，機場收到炸彈客預警通知，機場收到炸彈客預警通知，請乘客不要慌張，警察還在調查中。', 'Attention please. The airport has received a bomb threat. The airport has received a bomb threat. Please stay calm. The police are investigating.'),
    hints: [
      {
        done: (s) => s.solved,
        tiers: [
          T('Slothy 描述行李的衣服和小物；Raccoony 看看板日期和旅遊貼文，推出目的地。', 'Slothy, describe the clothes and gadgets. Raccoony, use the date and travel posts to find the destination.'),
          (s) => S3.answers(s).clue,
          (s) => S3.answers(s).gate,
        ],
      },
    ],
    outro: T('找到登機口了！全速前進！', 'Found the gate! Full speed ahead!'),
    transition: { kind: 'run', ms: 8000 },
  },
];

const ending = { title: 'To be continued', text: '' };

module.exports = { roles, scenes, ending };
