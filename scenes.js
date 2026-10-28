// ============================================================
// 角色與關卡清單（共 3 個場景）。
// 場景 1 是互動式場景（邏輯在 scenes/scene1.js、畫面在 public/scene1.js）。
// 場景 2：地鐵站；場景 3：機場大廳。
// transition：過關後、進下一場景（或結尾）前的過場動畫（kind 對應前端 public/ending.js），ms 是長度。
// 伺服器只會把「該玩家角色看得到的內容」發給前端，答案不會外洩。
// ============================================================

const roles = {
  A: { name: 'Raccoony', tagline: '棕灰色小浣熊 · 電腦前的偵探' },
  B: { name: 'Slothy', tagline: '灰藍色小樹懶 · 愛睡覺的慢活家' },
};

const S0 = require('./scenes/scene0'), S1 = require('./scenes/scene1'), S2 = require('./scenes/scene2'), S3 = require('./scenes/scene3');
// 提示的「答案」層會依這場抽到的變化產生（tiers 裡可以放函式，參數是場景狀態）
const scenes = [
  {
    // 開場：黑暗的房間，插對插座讓立燈亮起來
    id: 'dark',
    module: S0,
    intro: '好暗……什麼都看不見。我們得先讓房間亮起來。',
    hints: [
      {
        done: (s) => s.solved,
        tiers: ['你們看到的東西不一樣：Raccoony 看紙，Slothy 看插座。把自己看到的形狀和顏色說給對方聽。', '紙上每個形狀對應一個顏色，最下面還畫著立燈要插哪一種形狀。插孔的排列和紙上不同，要看形狀，不是看位置。', (s) => S0.answers(s).plug],
      },
    ],
    outro: '燈亮了！',
    transition: { kind: 'lamp', ms: 3000 },
  },
  {
    id: 'bedroom',
    module: S1,
    // intro 會當作字幕顯示約 5 秒後消失
    intro: '房門被鎖住了，而鑰匙不知道被誰藏到哪裡去了。',
    hints: [
      {
        done: (s) => s.pcUnlocked,
        tiers: ['電腦需要密碼。這是 1A2B 猜字遊戲的紀錄：Slothy 衣櫃上的紙和 Raccoony 書桌上的紙都有「10 月 3 日」，要合起來讀。', (s) => S1.answers(s).tag, (s) => S1.answers(s).password],
      },
      {
        done: (s) => s.hasKey,
        tiers: ['電腦裡的日記說了鑰匙藏在哪；Slothy 的衣櫃地圖說了每一格放什麼。', (s) => `日記說鑰匙藏在${S1.answers(s).keyItem}裡。衣櫃地圖由上往下數，找出它在第幾格，再去「密碼本」查那一格的密碼。`, (s) => S1.answers(s).drawer],
      },
      {
        done: (s) => s.hasPassport,
        tiers: ['門牌寫著「護照記得拿」。Raccoony 的便條說護照在床底下的箱子。綠色箱子已經開了，看看裡面的情書和它的鎖。兩人都可以按畫面右邊的箭頭換視角。', 'Raccoony 的吉他可以彈：吉他譜左邊的 1~6 是弦，對照 Slothy 牆上和弦表上方的 6~1，每一小節是一個和弦字母。彈哪首歌，哪個箱子的鎖就會亮；開鎖時 Slothy 按準備，Raccoony 要在 10 秒內彈出同樣的和弦。', (s) => S1.answers(s).plane],
      },
      {
        done: (s) => s.doorOpen,
        tiers: ['鑰匙和護照都拿到了，Slothy 去開門吧！', '點門把就能開門。', '點門把就能開門。'],
      },
    ],
    outro: '房門開了！兩個小夥伴衝了出去……',
    transition: { kind: 'black', ms: 4200 },
  },
  {
    // 互動式場景：邏輯在 scenes/scene2.js、畫面在 public/scene2.js
    id: 'subway',
    module: S2,
    intro: '到地鐵站了！我們該搭哪一條線？',
    hints: [
      {
        done: (s) => s.allClear,
        tiers: ['看板壞了，只有一列亮著。Slothy 按右邊的箭頭去看電箱：電線牌上的線路，要接到對的符號接頭。', 'Raccoony 的看板每列左邊有一個符號：Slothy 問「某線是什麼符號」，把那條電線接過去、打開閘門。那列亮起來但有雜訊時，Raccoony 要把旋鈕轉到電線牌背面的頻道。', (s) => S2.answers(s).fix],
      },
      {
        done: (s) => s.solved,
        tiers: ['看板全亮了！先看機票：要去哪個機場、幾點登機？Slothy 月台柱子上的地圖說機場在哪一區，路人說要搭多久。', (s) => S2.answers(s).clue, (s) => S2.answers(s).line],
      },
    ],
    outro: '列車進站，兩人擠上車，往機場出發……',
    transition: { kind: 'train', ms: 8300 },
  },
  {
    // 互動式場景：邏輯在 scenes/scene3.js、畫面在 public/scene3.js
    id: 'airport',
    module: S3,
    intro: '緊急狀況，機場收到炸彈客預警通知，機場收到炸彈客預警通知，請乘客不要慌張，警察還在調查中。',
    hints: [
      {
        done: (s) => s.solved,
        tiers: [
          'Slothy 把行李箱裡的東西一樣一樣說給 Raccoony 聽：衣服是熱天還是冷天穿的？東西是做什麼活動用的？Raccoony 看看看板上的日期，再按右邊箭頭看新聞。',
          (s) => S3.answers(s).clue,
          (s) => S3.answers(s).gate,
        ],
      },
    ],
    outro: '找到登機口了！全速前進！',
    transition: { kind: 'run', ms: 8000 },
  },
];

const ending = { title: 'To be continued', text: '' };

module.exports = { roles, scenes, ending };
