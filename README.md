# Sherlock Raccoon & Dr. Slothy: Escape New York

A two-player co-op escape room game that runs in the browser. One person plays Raccoony, the other plays Slothy, and each of you sees a different half of every room. You have to talk to each other (phone, FaceTime, whatever) to get out. It's built for iPad in landscape, but any browser works.

It all happens in one evening. There are four scenes:

0. Opening. Both players are in the dark. Raccoony sees a paper on the sofa that maps shapes to colors, Slothy sees a power strip with switches, in a different order. Set every switch to the right color and plug the lamp into the right socket, and the lights come on.

1. Raccoony's bedroom. Find the computer password, read the diary, find the key. The door sign says to take your passport, which is in one of the suitcases under the bed. Raccoony has the guitar tabs, Slothy has the chord chart on the bed; together they give the suitcase codes.
2. The 168 Street subway platform, in the evening. The departures board is broken: only one line is lit. Slothy connects each line's wire to the terminal marked with that line's symbol (only Raccoony can see the symbols) and opens the gate; Raccoony turns that row's dial to the channel printed on the back of the wire tag (only Slothy can see it). Once all five rows are lit, a passer-by on each side mentions a service change, and the two of them work out which train still reaches the airport before boarding. When you pick right, a train rushes past.
3. The airport. A bomb threat has everyone on edge, and the two friends decide to help. Slothy studies an abandoned suitcase (credit card, a travel document with the flight number scribbled out, clothes and gadgets); Raccoony has the departures board and four travel posts. The board only shows airport codes, and the code-to-city panel is on the wall on Slothy's side, so they have to read it to each other. Together they work out where the owner is flying, hack the airline's database through three 15-second picture puzzles (Slothy sees the puzzle, Raccoony picks the answer), and use the passenger list to find the flight and the gate. A bomb clock in the corner gives them ten minutes; if it runs out the airport explodes and the scene starts over with new puzzles. Pick the right gate and the two of them run down the corridor to catch their own flight.

The 💡 button gives hints in three steps for whichever puzzle you're stuck on: a direction, then the key clue, then the answer (it asks you to tap twice before showing the answer). The ending shows how many hints you used.

Every puzzle has five versions (different colors and shapes, passwords, drawer, suitcase codes, subway symbols and channels, airport codes, hack puzzles and gate). Each game picks one version per scene at random and avoids the ones either player had last time, so answers from a previous run don't carry over.

All the music and sound effects are generated live with the Web Audio API (`public/music.js`) — the only recorded samples are the violin and cello used on the title screen, in `public/audio/` (tonejs-instruments, CC BY 3.0; see the CREDITS files there). The browser won't start audio until the page has been touched, so on an iPad the music begins on the first tap anywhere, not only on Start. During the bomb countdown a clock ticks at the start, at 5 minutes and at 30 seconds, the score turns heavier and faster with 2 minutes left, and picking the right gate switches it to a lighter track.

Fonts are served from `public/fonts/` (all SIL Open Font License): Press Start 2P for the pixel-style title screen, Bebas Neue for headings, Nunito for body text, and GenSeki Gothic (源石黑體) for Chinese. The font files in `public/fonts/` only contain the characters the game uses. If you change any text, rerun `python3 tools/subset-fonts.py <path to a clone of github.com/ButTaiwan/genseki-font>`.

The game is in Traditional Chinese or English. Pick a language with the buttons at the top right of the title screen. Each player chooses their own, so one player can play in Chinese and the other in English. All text the server sends (subtitles, hints, papers, the news, the boards) is written as `T('中文', 'English')` and translated per player; client-only text uses `tr('中文', 'English')` from `public/i18n.js`.

## The ending

After the run to the gate, "To be continued" appears in the pixel title font, with "恭喜通關" and the number of hints used, a **回到首頁** button, and a prompt to scroll down. Below that is the story behind the game (with photos of the two stuffed animals the characters are based on) and a short feedback form: a 1–5 star rating, a yes/no question about wanting a full version, and a free-text box. See the Google Sheet section below for where the answers go.

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

## CI/CD

CI means every change is tested on its own. CD means a change that passes, on `main`, is deployed on its own. Both live in `.github/workflows/ci.yml`. You can run the same checks on your computer with `npm run lint` and `npm test` before you push.

**What starts it.** Every push, and every pull request, starts the Test job. A push to `main` also starts the Deploy job, and only after Test has passed. A pull request is never deployed. A pull request opened from this same repo starts Test twice (once for the push, once for the pull request). The check on the pull request page is the one that gates merging.

**What Test does.**

1. **Install.** `npm ci` installs the exact dependency versions in `package-lock.json`.
2. **Syntax check.** There is no ESLint config. `npm run lint` (`tools/check-syntax.js`) runs `node --check` on every JavaScript file, so a typo fails here instead of halfway through the tests.
3. **Tests.** `npm test` runs three files:
   - `test/logic.test.js` uses Node's built-in test runner (`node:test`). It does not start the server. It checks the puzzle rules in `scenes/scene0.js` through `scenes/scene3.js`: the lamp stays off until the switches and the plug both match, the bedroom door stays shut until Slothy has the key and both players open the suitcase, the subway row lights only when Slothy wires it and Raccoony tunes it, and the airport gate opens only after Slothy picks the airline and Raccoony solves the three pictures. It also checks that one player's screen never includes the other player's secrets, and that a shared action shows up for both (crossed-out letters, a wire changing the other player's board). `solved: true` from those modules is the signal `server.js` uses to move the room to the next scene.
   - `test/variants.js` checks all five versions of every scene: each one has a single solution, and the secrets still don't leak.
   - `test/smoke.js` starts the real server and plays a whole game with two fake players, including joining a room, picking roles, and scene changes.

**What Deploy does.** It sends one HTTP request to a Render deploy hook. Render then builds and restarts the service from `render.yaml`, the same host as the manual setup above. GitHub Pages can't run this game, because the two players talk through WebSockets (Socket.IO).

The workflow is allowed to read the repository and nothing else (`permissions: contents: read`). It does not push commits.

### Turn on automatic deploys

The Test job works as soon as this file is on GitHub. The Deploy job does nothing until you add a secret. That does not change a Render service you already have.

1. Create the Render service once, if you haven't (see "Put it online" above). `render.yaml` stays the description of that service.
2. On Render, open the service, then **Settings**, then **Deploy Hook**. Create a hook and copy the URL. Treat that URL like a password: anyone who has it can trigger a deploy, which is why it is a secret and not a file in the repo.
3. On GitHub, open this repo, then **Settings**, then **Secrets and variables**, then **Actions**, then **New repository secret**. Name it `RENDER_DEPLOY_HOOK_URL` and paste the URL.
4. The next push to `main` deploys after the tests pass. The job logs "Render accepted the deploy" when the hook answers.

Recommended, so a failing test can't go live: on the same Render settings page, under **Build & Deploy**, turn **Auto-Deploy** off. Render will then deploy only when this workflow calls the hook, which happens after the tests pass. If you leave Auto-Deploy on, Render keeps deploying every push to `main` by itself (the way it does today) and the hook deploys once more after the tests. The site keeps working either way.

Until the secret exists, pushes are tested and not deployed by Actions. If Render Auto-Deploy is already on, that path is unchanged.

## Feedback form → Google Sheet

The last screen has a short form (stars + what to improve). Every answer is saved on the server in
`data/feedback.jsonl`. To also have them land in a Google Sheet:

1. Make a new Google Sheet. First row: `at`, `stars`, `full`, `text`, `lang`
   (`full` is the yes/no answer to "would you play the full version?").
2. In that sheet: Extensions → Apps Script, and paste:

   ```js
   function doPost(e) {
     const d = JSON.parse(e.postData.contents);
     SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
       .appendRow([d.at, d.stars, d.full, d.text, d.lang]);
     return ContentService.createTextOutput('ok');
   }
   ```

3. Deploy → New deployment → Web app. "Execute as: Me", "Who has access: Anyone". Copy the URL it gives you.
4. Set that URL as the `FEEDBACK_WEBHOOK` environment variable (on Render: your service → Environment → Add
   Environment Variable). Locally: `FEEDBACK_WEBHOOK="https://script.google.com/..." npm start`.

Without the variable nothing breaks — the answers just stay in `data/feedback.jsonl`.

### If Apps Script won't open (option B: a Google Form)

A Google Form writes its answers into a Google Sheet by itself, no script needed.

1. Make a Google Form with two questions: a 1–5 scale ("stars") and a long-answer text box. Optionally a third
   short-answer for the language.
2. Responses tab → the green Sheets icon → link it to a spreadsheet.
3. Open the form's preview (the eye icon), right-click → View page source, and search for `entry.` — each question
   has an id like `entry.1234567890`. Note which id belongs to which question.
4. Set these environment variables:
   - `FEEDBACK_FORM_URL` = the form URL with `/viewform` replaced by `/formResponse`
   - `FEEDBACK_ENTRY_STARS` = `entry.<id of the 1–5 question>`
   - `FEEDBACK_ENTRY_TEXT` = `entry.<id of the text question>`
   - `FEEDBACK_ENTRY_LANG` = `entry.<id of the language question>` (optional)
   - `FEEDBACK_ENTRY_FULL` = `entry.<id of a yes/no question>` (optional)

### Option C: just download them

Set `FEEDBACK_KEY` to any password, then open
`https://your-site.onrender.com/api/feedback.csv?key=yourpassword` to download every answer as a CSV you can
open in Google Sheets or Excel. (Note: on Render's free plan the disk is wiped on each deploy, so use option A or
B if you want to keep them for good.)

## Where things are

- `server.js` is the server. It keeps all the game state, so both players always see the same thing, and each player only receives what their character can see.
- `scenes.js` lists the scenes, hints and ending text.
- `scenes/scene0.js` to `scenes/scene3.js` hold the puzzle logic and answers. Change a password, a time or a line of dialogue here.
- `public/` is everything the browser loads: `scene0.js` to `scene3.js` draw the rooms, `title.js` draws the skyline, `ending.js` holds the full-screen transitions (train, running) and the final screen with the story and the feedback form, `music.js` makes the music and sound effects live, and `art.js` holds the shared drawing toolkit (the two characters, rooms, floors, lighting) that every scene is built from.
- `public/img/` holds the photos shown in the story at the end; `public/audio/` the violin and cello samples.
- `npm test` runs three checks: `test/logic.test.js` (the puzzle rules, no server), `test/variants.js` (every variant of every scene has one solution, and neither player is sent the other one's secrets), and `test/smoke.js` (two fake players play the whole game). `npm run lint` checks that the JavaScript files parse. See "CI/CD" above for how GitHub runs these.

## Scene 2 notes

The answer is a different line in each of the five variants, so don't memorise it — read `solution(v)` in `scenes/scene2.js`. The shape is always the same: the board is set in the evening (6:00 PM or so) and the ticket boards around 10:00 PM, two lines reach the airport's stop, and the one that arrives sooner is the one the service change ruins. The sentence that gives the answer away is always said by the passer-by on Slothy's side.

The service changes, and the lines that stop at 168 St, are made up. In real life the B, C and E don't all stop there, and the C doesn't go to Queens.
