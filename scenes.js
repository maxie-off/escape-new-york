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
          T('你們看到的東西不一樣：Raccoony 看紙，Slothy 看插座。把自己看到的形狀和顏色說給對方聽。', 'You see different things: Raccoony has the paper, Slothy has the power strip. Tell each other the shapes and colors you see.'),
          T('紙上每個形狀對應一個顏色，最下面還畫著立燈要插哪一種形狀。插孔的排列和紙上不同，要看形狀，不是看位置。', 'Each shape on the paper matches a color, and the bottom shows which shape the lamp goes into. The sockets are in a different order, so go by shape, not position.'),
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
          T('電腦需要密碼。這是 1A2B 猜字遊戲的紀錄：Slothy 衣櫃上的紙和 Raccoony 書桌上的紙都有「10 月 3 日」，要合起來讀。', 'The computer needs a password. These are records of a word-guessing game: both Slothy’s paper on the wardrobe and Raccoony’s paper on the desk have “Oct 3”. Read them together.'),
          (s) => S1.answers(s).tag,
          (s) => S1.answers(s).password,
        ],
      },
      {
        done: (s) => s.hasKey,
        tiers: [
          T('電腦裡的日記說了鑰匙藏在哪；Slothy 的衣櫃地圖說了每一格放什麼。', 'The diary on the computer says where the key is hidden; Slothy’s wardrobe map shows what’s in each drawer.'),
          (s) => T(`日記說鑰匙藏在${S1.answers(s).keyItem.zh}裡。衣櫃地圖由上往下數，找出它在第幾格，再去「密碼本」查那一格的密碼。`, `The diary says the key is with the ${S1.answers(s).keyItem.en.toLowerCase()}. Count down the wardrobe map to find that drawer, then look up its code on the Passwords page.`),
          (s) => S1.answers(s).drawer,
        ],
      },
      {
        done: (s) => s.hasPassport,
        tiers: [
          T('門牌寫著「護照記得拿」。Raccoony 的便條說護照在床底下的箱子。綠色箱子已經開了，看看裡面的情書和它的鎖。兩人都可以按畫面右邊的箭頭換視角。', 'The door sign says not to forget the passport. Raccoony’s sticky note says it’s in a suitcase under the bed. The green suitcase is already open: read the letters and look at its lock. You can both tap the arrow on the right to switch views.'),
          T('Raccoony 的吉他可以彈：吉他譜左邊的 1~6 是弦，對照 Slothy 牆上和弦表上方的 6~1，每一小節是一個和弦字母。彈哪首歌，哪個箱子的鎖就會亮；開鎖時 Slothy 按準備，Raccoony 要在 10 秒內彈出同樣的和弦。', 'Raccoony can play the guitar. The 1–6 on the left of the tabs are strings; match them with the 6–1 above the chord chart on Slothy’s wall. Each bar is one chord letter. Playing a song lights that suitcase’s lock. To open it, Slothy presses Ready and Raccoony plays the same chords within 10 seconds.'),
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
          T('看板壞了，只有一列亮著。Slothy 按右邊的箭頭去看電箱：電線牌上的線路，要接到對的符號接頭。', 'The board is broken; only one row is lit. Slothy, tap the right arrow to see the electric box: each wire’s line tag goes into the socket with the right symbol.'),
          T('Raccoony 的看板每列左邊有一個符號：Slothy 問「某線是什麼符號」，把那條電線接過去、打開閘門。那列亮起來但有雜訊時，Raccoony 要把旋鈕轉到電線牌背面的頻道。', 'Each row on Raccoony’s board has a symbol on the left. Slothy asks which symbol a line has, plugs that wire in and flips the switch. When the row lights up with static, Raccoony turns its knob to the channel on the back of the wire tag.'),
          (s) => S2.answers(s).fix,
        ],
      },
      {
        done: (s) => s.solved,
        tiers: [
          T('看板全亮了！先看機票：要去哪個機場、幾點登機？Slothy 月台柱子上的地圖說機場在哪一區，路人說要搭多久。', 'The board is fully lit! Check the ticket: which airport, and when is boarding? The map on Slothy’s pillar shows the borough, and the passers-by say how long the ride is.'),
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
          T('Slothy 把行李箱裡的東西一樣一樣說給 Raccoony 聽：衣服是熱天還是冷天穿的？東西是做什麼活動用的？Raccoony 看看看板上的日期，再按右邊箭頭看新聞。', 'Slothy, describe each thing in the suitcase to Raccoony: are the clothes for hot or cold weather? What activity are the items for? Raccoony, check the date on the board, then tap the right arrow to read the news.'),
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
