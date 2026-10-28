# Sherlock Raccoon & Dr. Slothy: Escape New York

A two-player co-op escape room game that runs in the browser. One person plays Raccoony, the other plays Slothy, and each of you sees a different half of every room. You have to talk to each other (phone, FaceTime, whatever) to get out. It's built for iPad in landscape, but any browser works.

The game opens in a dark room, then there are three scenes:

0. Opening. Both players are in the dark. Raccoony sees a paper on the sofa that maps shapes to colors, Slothy sees a power strip with switches, in a different order. Set every switch to the right color and plug the lamp into the right socket, and the lights come on.

1. Raccoony's bedroom. Find the computer password, read the diary, find the key. The door sign says to take your passport, which is in one of the suitcases under the bed. Raccoony has the guitar tabs, Slothy has the chord chart on the bed; together they give the suitcase codes.
2. The 168 Street subway platform. Work out which train gets you to JFK by noon. When you pick right, a train rushes past.
3. The airport. A bomb threat has everyone on edge. Raccoony reads the police and a phone search, Slothy gets into an abandoned suitcase. Each of you ends up with one of the two books, and only both halves of the code name the gate. Then the two of them run down the corridor, and the screen goes black on "To be continued".

The 💡 button gives hints in three steps for whichever puzzle you're stuck on: a direction, then the key clue, then the answer (it asks you to tap twice before showing the answer). The ending shows how many hints you used.

Every puzzle has five versions (different colors and shapes, passwords, drawer, suitcase codes, train times, library year, page codes and gate). Each game picks one version per scene at random and avoids the ones either player had last time, so answers from a previous run don't carry over. Press "再玩一次" on the ending screen to play again with new puzzles.

Fonts are served from `public/fonts/` (all SIL Open Font License): Press Start 2P for the pixel-style title screen, Bebas Neue for headings, Nunito for body text, and GenSeki Gothic (源石黑體) for Chinese. The font files in `public/fonts/` only contain the characters the game uses. If you change any text, rerun `python3 tools/subset-fonts.py <path to a clone of github.com/ButTaiwan/genseki-font>`.

The game is in Traditional Chinese or English. Pick a language with the buttons at the top right of the title screen. Each player chooses their own, so one player can play in Chinese and the other in English. All text the server sends (subtitles, hints, papers, the news, the boards) is written as `T('中文', 'English')` and translated per player; client-only text uses `tr('中文', 'English')` from `public/i18n.js`.

## Run it on your computer

You need Node 18 or newer.

```
npm install
npm start
```

Then open http://localhost:3000 in two browser windows to try both players yourself.

## How a game starts

1. Press Start on the title screen.
2. Each player picks a character on the left.
3. One player presses Generate to get a 6-letter room code. The other types it in.
4. Once both are connected and have picked different characters, Start lights up. Either player can press it.

## Put it online

It needs a host that supports WebSockets, since the game uses Socket.IO. GitHub Pages won't work. Render's free plan does, and `render.yaml` is already set up for it:

1. Push this folder to a GitHub repo.
2. On render.com, choose New, then Blueprint, and pick the repo.
3. Wait a few minutes. You'll get a link like `https://something.onrender.com`. Both players open that link.

On the free plan the server falls asleep when nobody's using it, so the first visit can take 30 to 50 seconds. Rooms live in memory, so a restart wipes them.

## Where things are

- `server.js` is the server. It keeps all the game state, so both players always see the same thing, and each player only receives what their character can see.
- `scenes.js` lists the scenes, hints and ending text.
- `scenes/scene0.js` to `scenes/scene3.js` hold the puzzle logic and answers. Change a password, a time or a line of dialogue here.
- `public/` is everything the browser loads: `scene0.js` to `scene3.js` draw the rooms, `title.js` draws the skyline, `ending.js` holds the full-screen transitions (train, running, To be continued), `music.js` makes all the music and sound effects live (no audio files), and `art.js` draws the two characters.
- `test/smoke.js` plays through the whole game with two fake players. Run it with `npm test`.

## Scene 2 notes

The answer is the E train. JFK is in Queens, the ride takes 110 minutes, and it's 10:00, so you have to board within 10 minutes. Only C and E go to Queens on the board, and C is 14 minutes away.

The "C trains run via Queens" service change is made up. In real life the C doesn't go there. The B, C and E don't all stop at 168 St either.
