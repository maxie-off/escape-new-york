// 配樂：全部用 Web Audio 即時合成（不需要任何音檔），每個場景一首會一直循環的曲子。
//   場景 1：D 多利安 + 木琴琶音 + 時鐘滴答 + 偶爾一聲帶 b9 的鈴音 → 輕鬆但微微懸疑
//   場景 2：E 小調，張力一層層堆疊（滴答→隆隆聲→貝斯脈動→撥奏→上升掃頻→心跳）
//   場景 3：D 小調，低音弦樂 + 計時器滴答，緊張低沉
//   結局：慢速 G 大調，鐘聲收尾
// iPad / Safari 需要使用者點擊後才能發聲：app.js 會在第一次點擊時呼叫 Music.unlock()。
window.Music = (function () {
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rng = (seed) => { // 小型確定性亂數：同一小節永遠彈一樣的東西
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  // ---------- 音色 ----------
  function noiseBuf(c) {
    if (c._nb) return c._nb;
    const n = Math.floor(c.sampleRate * 0.2), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (c._nb = b);
  }
  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function marimba(c, out, t, f, v = 0.16, dur = 0.55) {
    const g = c.createGain(); g.connect(out); env(g, t, v, 0.004, dur);
    [[1, 1, dur], [4, 0.28, dur * 0.4]].forEach(([r, gn, d]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const og = c.createGain(); og.gain.value = gn; o.connect(og); og.connect(g);
      o.start(t); o.stop(t + d + 0.05);
    });
  }
  function bell(c, out, t, f, v = 0.06, dur = 2.2) {
    const g = c.createGain(); g.connect(out); env(g, t, v, 0.003, dur);
    [[1, 1], [2.76, 0.4], [5.4, 0.16]].forEach(([r, gn]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const og = c.createGain(); og.gain.setValueAtTime(gn, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur / Math.max(1, r));
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  // 柔和的鈴聲：泛音少、再過低通濾波，不刺耳（場景 1 用）
  function softBell(c, out, t, f, v = 0.03, dur = 2.4) {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.3; lp.connect(out);
    const g = c.createGain(); g.connect(lp); env(g, t, v, 0.02, dur);
    [[1, 1], [2, 0.18]].forEach(([r, gn]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const og = c.createGain(); og.gain.setValueAtTime(gn, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur / r);
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function bass(c, out, t, f, v = 0.24, dur = 0.7) {
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = c.createGain(); o.connect(lp); lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function pad(c, out, t, freqs, dur, v = 0.03) {
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    freqs.forEach((f) => [-6, 6].forEach((cents) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.5);
    }));
  }
  function tick(c, out, t, v = 0.04, f = 1100) { // 木魚/時鐘滴答
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.05);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.1);
  }
  function shaker(c, out, t, v = 0.02) {
    const s = c.createBufferSource(); s.buffer = noiseBuf(c);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(hp); hp.connect(g); g.connect(out); s.start(t); s.stop(t + 0.1);
  }

  // 低頻隆隆聲（地鐵遠遠駛來），音量與濾波隨小節慢慢升高
  function rumble(c, out, t, dur, v, fc) {
    const n = Math.floor(c.sampleRate * 2), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; s.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(fc * 0.7, t); lp.frequency.linearRampToValueAtTime(fc, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    s.connect(lp); lp.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.1);
  }
  // 往上掃的鋸齒波（急迫感）
  function riser(c, out, t, dur, f0, f1, v) {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2400, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.9); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  // 心跳般的低音鼓
  function thump(c, out, t, v = 0.3) {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
  }

  // 低音弦樂（大提琴感）：鋸齒波 + 慢慢張開的低通 + 微微顫音
  function cello(c, out, t, f, dur, v = 0.05) {
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(260, t); lp.frequency.linearRampToValueAtTime(950, t + dur * 0.55); lp.frequency.linearRampToValueAtTime(380, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(1.1, dur * 0.3)); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
    const lfo = c.createOscillator(); lfo.frequency.value = 5.1; const lg = c.createGain(); lg.gain.value = 9; lfo.connect(lg);
    lp.connect(g); g.connect(out);
    [-7, 0, 7].forEach((cents) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents; lg.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.6);
    });
    lfo.start(t); lfo.stop(t + dur + 0.6);
  }
  // 高音弦樂顫音（不安的細碎聲）
  function trem(c, out, t, f, dur, v = 0.02) {
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 9; lg.gain.value = v * 0.5; lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.5, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    [-5, 5].forEach((cents) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    lp.connect(g); g.connect(out); lfo.start(t); lfo.stop(t + dur + 0.1);
  }

  // ---------- 曲子 ----------
  const TRACKS = {};

  // 場景 1：D 多利安，輕鬆；第 4、8 小節的 A7(b9) 帶一點懸疑
  (function () {
    const bpm = 86, beat = 60 / bpm, e = beat / 2;
    const prog = [
      { r: 38, t: [57, 60, 62, 65] }, // Dm7
      { r: 46, t: [58, 62, 65, 69] }, // Bbmaj7
      { r: 43, t: [55, 58, 62, 65] }, // Gm7
      { r: 45, t: [55, 58, 61, 64] }, // A7(b9)
      { r: 38, t: [57, 60, 62, 65] }, // Dm7
      { r: 41, t: [57, 60, 64, 65] }, // Fmaj7
      { r: 43, t: [55, 58, 62, 65] }, // Gm7
      { r: 45, t: [55, 58, 61, 64] }, // A7(b9)
    ];
    const pat = [0, 2, 1, 3, 2, 3, 1, 2];
    TRACKS['0'] = {
      barLen: beat * 4,
      bar(c, out, t, i) {
        const ch = prog[i % 8], r = rng(1000 + i);
        pad(c, out, t, ch.t.slice(0, 3).map(mtof), beat * 4, 0.03);
        bass(c, out, t, mtof(ch.r), 0.24, beat * 1.6);
        bass(c, out, t + beat * 2, mtof(ch.r + (r() < 0.5 ? 7 : 12)), 0.17, beat * 1.2);
        if (r() < 0.35) bass(c, out, t + beat * 3.5, mtof(ch.r + 2), 0.1, beat * 0.4);
        for (let k = 0; k < 8; k++) {
          if (r() < 0.1) continue;
          marimba(c, out, t + k * e, mtof(ch.t[pat[k]] + 12), k % 4 === 0 ? 0.17 : 0.11, 0.5);
        }
        tick(c, out, t + beat, 0.035); tick(c, out, t + beat * 3, 0.028, 900);
        // 鈴聲：每 4 小節只出現一次、只有一個音，低一個八度、聲音柔和（原本太密、太尖）
        if (i % 4 === 1) softBell(c, out, t + beat * (1 + (i % 8 === 1 ? 0 : 1.5)), mtof(ch.t[i % 8 === 1 ? 3 : 1] + 12), 0.028, 2.6);
      },
    };
  })();

  // 場景 2：E 小調 104 bpm，一層一層慢慢堆疊的緊張感（第 24 小節後維持高張力循環）
  (function () {
    const bpm = 104, beat = 60 / bpm, e = beat / 2, sx = beat / 4;
    const arp = [64, 67, 71, 67, 64, 67, 71, 75]; // E G B G E G B D#（導音帶不安）
    TRACKS['1'] = {
      barLen: beat * 4,
      bar(c, out, t, i) {
        const k = i < 24 ? i : 12 + ((i - 12) % 12), r = rng(3000 + i), L = beat * 4;
        pad(c, out, t, [mtof(40), mtof(47)], L, 0.026);                       // E2+B2 持續低音墊
        if (k >= 8) pad(c, out, t, [mtof(41)], L, 0.016);                     // F2：小二度摩擦
        if (k >= 2) rumble(c, out, t, L, 0.012 + Math.min(k, 20) * 0.0016, 140 + k * 22);
        if (k < 12) { for (let b = 0; b < 4; b++) tick(c, out, t + b * beat, b % 2 ? 0.025 : 0.04, b % 2 ? 900 : 1150); }
        else { for (let q = 0; q < 8; q++) tick(c, out, t + q * e, q % 2 ? 0.02 : 0.035, q % 2 ? 1000 : 1300); }
        if (k >= 4) for (let q = 0; q < 8; q++) bass(c, out, t + q * e, mtof(q % 4 === 3 ? 47 : 40), q % 2 ? 0.1 : 0.17, e * 0.8);
        if (k >= 8) for (let q = 0; q < 16; q++) {
          if (r() < 0.06) continue;
          marimba(c, out, t + q * sx, mtof(arp[Math.floor(q / 2) % 8] + (q % 2 ? 12 : 0)), q % 4 === 0 ? 0.075 : 0.045, 0.16);
        }
        if (k >= 12) riser(c, out, t, L, 110 + (k - 12) * 6, 440 + (k - 12) * 24, 0.014 + Math.min(k - 12, 8) * 0.0015);
        if (k >= 16) { thump(c, out, t, 0.3); thump(c, out, t + beat * 2, 0.26); if (k >= 20) { thump(c, out, t + beat * 1, 0.18); thump(c, out, t + beat * 3, 0.18); } }
        if (k >= 6 && k % 4 === 3) { bell(c, out, t + beat * 3.25, mtof(76), 0.04, 2.2); bell(c, out, t + beat * 3.25, mtof(77), 0.04, 2.2); } // E5+F5
        if (k >= 14) for (let q = 0; q < 8; q++) shaker(c, out, t + q * e, 0.012 + (k - 14) * 0.0009);
      },
    };
  })();

  // 場景 3：D 小調，60 bpm，低音弦樂持續低鳴 + 半音的不安旋律 + 滴答（像計時器）；越來越緊
  (function () {
    const bpm = 60, beat = 60 / bpm, L = beat * 4;
    const mel = [50, 53, 51, 49, 50, 57, 56, 55]; // D F Eb C# D A G# G：半音下行、不解決
    TRACKS['2'] = {
      barLen: L,
      bar(c, out, t, i) {
        const k = i < 16 ? i : 8 + ((i - 8) % 8), r = rng(5000 + i);
        cello(c, out, t, mtof(38), L, 0.06);                                  // D2 持續低音
        cello(c, out, t + 0.05, mtof(45), L, 0.035);                          // A2
        if (k >= 2) cello(c, out, t + beat * (k % 2 ? 0.5 : 0), mtof(mel[i % 8]), L - beat * 0.5, 0.038); // 旋律
        if (k >= 1) for (let b = 0; b < 4; b++) tick(c, out, t + b * beat, b % 2 ? 0.014 : 0.022, b % 2 ? 1500 : 1900); // 計時器
        if (k >= 4) { thump(c, out, t, 0.2); thump(c, out, t + beat * 1.5, 0.12); }
        if (k >= 6) rumble(c, out, t, L, 0.008 + Math.min(k, 14) * 0.0007, 110 + k * 12);
        if (k >= 8 && k % 2 === 0) trem(c, out, t + beat * 0.5, mtof(r() < 0.5 ? 81 : 80), beat * 3, 0.022); // A5 / G#5
        if (k >= 10) cello(c, out, t, mtof(34), L, 0.03);                      // Bb1：更低的壓迫
        if (k % 4 === 3) bell(c, out, t + beat * 3, mtof(63), 0.02, 3);        // 遠遠的 Eb4
      },
    };
  })();

  // 開場（黑暗的房間）：很輕的低鳴 + 偶爾的遠處滴答
  (function () {
    const beat = 1, L = 4;
    TRACKS.dark = {
      barLen: L,
      bar(c, out, t, i) {
        const r = rng(7000 + i);
        cello(c, out, t, mtof(33), L, 0.035);
        if (i % 2 === 1) cello(c, out, t + 0.1, mtof(40), L, 0.02);
        for (let b = 0; b < 4; b++) if (r() < 0.45) tick(c, out, t + b * beat, 0.01, 1200 + r() * 600);
        if (i % 3 === 2) bell(c, out, t + beat * 2.5, mtof(69), 0.012, 3);
      },
    };
  })();

  // 結局：慢速、收尾
  (function () {
    const bpm = 72, beat = 60 / bpm;
    const prog = [
      { r: 43, t: [59, 62, 67, 71] }, { r: 40, t: [59, 62, 64, 67] }, { r: 48, t: [59, 60, 64, 67] }, { r: 43, t: [57, 62, 67, 71] },
    ];
    TRACKS.ending = {
      barLen: beat * 4,
      bar(c, out, t, i) {
        const ch = prog[i % 4], r = rng(4000 + i);
        pad(c, out, t, ch.t.map(mtof), beat * 4, 0.04);
        bass(c, out, t, mtof(ch.r), 0.2, beat * 3);
        marimba(c, out, t, mtof(ch.t[3] + 12), 0.14, 1.0);
        for (const s of [1, 2.5]) bell(c, out, t + s * beat, mtof(ch.t[Math.floor(r() * 4)] + 24), 0.05, 2.6);
      },
    };
  })();

  // ---------- 混音 / 播放 ----------
  function impulse(c, sec, decay) {
    const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function buildGraph(c, muted) {
    const master = c.createGain(); master.gain.value = muted ? 0 : 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp); comp.connect(c.destination);
    const verb = c.createConvolver(); verb.buffer = impulse(c, 2.4, 2.2);
    const wet = c.createGain(); wet.gain.value = 0.35; verb.connect(wet); wet.connect(master);
    return { master, verb };
  }
  function makeBus(c, g) {
    const bus = c.createGain(); bus.gain.value = 1; bus.connect(g.master);
    const send = c.createGain(); send.gain.value = 0.9; bus.connect(send); send.connect(g.verb);
    return bus;
  }

  let ctx = null, g = null, cur = null, pending = null;
  let muted = false;
  try { muted = localStorage.getItem('muted') === '1'; } catch (e) { /* ignore */ }

  function stopCurrent(fade) {
    if (!cur) return;
    const bus = cur.bus, now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now); bus.gain.linearRampToValueAtTime(0.0001, now + fade);
    setTimeout(() => { try { bus.disconnect(); } catch (e) { /* ignore */ } }, (fade + 1.5) * 1000);
    cur = null;
  }
  function pump() {
    if (!ctx || !cur) return;
    const T = TRACKS[cur.name];
    while (cur.next < ctx.currentTime + 1.0) { T.bar(ctx, cur.bus, cur.next, cur.bar); cur.next += T.barLen; cur.bar++; }
  }
  setInterval(pump, 250);

  function play(name) {
    if (!name) return stop();
    if (!ctx) { pending = name; return; }
    if (cur && cur.name === name) return;
    stopCurrent(1.2);
    const bus = makeBus(ctx, g);
    bus.gain.setValueAtTime(0.0001, ctx.currentTime); bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
    cur = { name: String(name), bus, next: ctx.currentTime + 0.2, bar: 0 };
    pump();
  }
  function stop() { pending = null; stopCurrent(1); }

  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC(); g = buildGraph(ctx, muted);
      }
      if (ctx.state === 'suspended') ctx.resume();
      if (pending) { const p = pending; pending = null; play(p); }
    } catch (e) { console.warn('audio unlock failed', e); }
    // iPad Safari 要在使用者點擊時先「講一次」，之後的語音才放得出來
    try { if (!spoken && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); spoken = true; } } catch (e) { /* ignore */ }
  }
  let spoken = false;
  // 用瀏覽器內建的人聲念出一段話（機場廣播）。靜音時不念；念的時候把音樂壓低。
  function pickVoice(lang) {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    return vs.find((v) => v.lang === lang) || vs.find((v) => v.lang && v.lang.replace('_', '-').startsWith(lang.slice(0, 2))) || null;
  }
  function speak(text, opt = {}) {
    if (muted || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opt.lang || 'zh-TW'; u.rate = opt.rate || 1.05; u.pitch = opt.pitch || 0.9; u.volume = 1;
      const v = pickVoice(u.lang); if (v) u.voice = v;
      const duck = (on) => { if (g && ctx) g.master.gain.setTargetAtTime(muted ? 0 : on ? 0.35 : 0.9, ctx.currentTime, 0.2); };
      u.onstart = () => duck(true); u.onend = () => duck(false); u.onerror = () => duck(false);
      speechSynthesis.speak(u);
    } catch (e) { console.warn('speech failed', e); }
  }
  function hush() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (g) g.master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.1);
    if (muted) hush();
    return muted;
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // 測試用：離線渲染幾小節，回傳單聲道 Float32Array
  async function renderOffline(name, bars, sr = 22050) {
    const T = TRACKS[name];
    const c = new OfflineAudioContext(1, Math.ceil((bars * T.barLen + 3) * sr), sr);
    const gg = buildGraph(c, false), bus = makeBus(c, gg);
    for (let i = 0; i < bars; i++) T.bar(c, bus, 0.1 + i * T.barLen, i);
    return (await c.startRendering()).getChannelData(0);
  }


  // ---------- 音效：列車轟隆隆駛過（約 8 秒，約第 4 秒最大聲） ----------
  function buildTrain(c, out, t, dur) {
    const peak = dur * 0.51;
    const env = (g, vmax, a = 0.2) => { // 慢慢逼近 → 轟過 → 遠去
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vmax * a, t + peak * 0.6);
      g.gain.linearRampToValueAtTime(vmax, t + peak);
      g.gain.linearRampToValueAtTime(vmax * 0.18, t + peak + (dur - peak) * 0.55);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    };
    const nb = (() => { const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const noise = () => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t); s.stop(t + dur + 0.1); return s; };
    // 1) 低頻隆隆聲
    { const s = noise(), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(90, t); lp.frequency.linearRampToValueAtTime(700, t + peak); lp.frequency.linearRampToValueAtTime(140, t + dur);
      env(g, 0.55); s.connect(lp); lp.connect(g); g.connect(out); }
    // 2) 地板震動的低音
    { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o2.type = 'sine';
      o.frequency.setValueAtTime(34, t); o.frequency.linearRampToValueAtTime(46, t + peak); o.frequency.linearRampToValueAtTime(32, t + dur);
      o2.frequency.setValueAtTime(52, t); o2.frequency.linearRampToValueAtTime(64, t + peak); o2.frequency.linearRampToValueAtTime(48, t + dur);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      env(g, 0.3); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1); }
    // 3) 駛過的呼嘯聲（帶通掃頻）
    { const s = noise(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(2600, t + peak); bp.frequency.exponentialRampToValueAtTime(420, t + dur);
      env(g, 0.42, 0.05); s.connect(bp); bp.connect(g); g.connect(out); }
    // 4) 車輪壓過鐵軌接縫：喀噠—喀噠，越近越快
    let x = 0.15;
    while (x < dur - 0.2) {
      const near = Math.exp(-Math.pow((x - peak) / (dur * 0.28), 2)); // 0~1
      const amp = 0.05 + near * 0.34;
      for (const off of [0, 0.05]) {
        const s = c.createBufferSource(); s.buffer = nb; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + near * 700; bp.Q.value = 2.2;
        const g = c.createGain(); const tt = t + x + off;
        g.gain.setValueAtTime(amp * (off ? 0.7 : 1), tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07);
        s.connect(bp); bp.connect(g); g.connect(out); s.start(tt, Math.random()); s.stop(tt + 0.1);
      }
      x += 0.24 - near * 0.14;
    }
  }
  function trainPass(dur = 8) {
    if (!ctx || !g) return;
    stopCurrent(1.2);
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(g.master);
    const send = ctx.createGain(); send.gain.value = 0.35; bus.connect(send); send.connect(g.verb);
    buildTrain(ctx, bus, ctx.currentTime + 0.05, dur);
  }
  async function renderTrain(dur = 8, sr = 22050) {
    const c = new OfflineAudioContext(1, Math.ceil((dur + 1) * sr), sr);
    const gg = buildGraph(c, false); const bus = makeBus(c, gg);
    buildTrain(c, bus, 0.1, dur);
    return (await c.startRendering()).getChannelData(0);
  }


  // ---------- 音效：機場廣播鈴聲、奔跑腳步 ----------
  function sfxBus(vwet) {
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(g.master);
    const send = ctx.createGain(); send.gain.value = vwet; bus.connect(send); send.connect(g.verb);
    return bus;
  }
  function pa() { // 叮——咚——（廣播前的提示音）
    if (!ctx || !g) return;
    const bus = sfxBus(0.5), t = ctx.currentTime + 0.05;
    for (const [dt, f] of [[0, 880], [0.55, 659], [1.1, 740]]) bell(ctx, bus, t + dt, f, 0.12, 1.6);
  }
  function footsteps(dur = 7) {
    if (!ctx || !g) return;
    const bus = sfxBus(0.2), t = ctx.currentTime + 0.05;
    for (let x = 0, i = 0; x < dur; x += 0.27, i++) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(i % 2 ? 110 : 90, t + x); o.frequency.exponentialRampToValueAtTime(48, t + x + 0.12);
      const gn = ctx.createGain(); const fade = Math.min(1, x / 0.8, (dur - x) / 1.2);
      gn.gain.setValueAtTime(0.18 * Math.max(0, fade), t + x); gn.gain.exponentialRampToValueAtTime(0.0001, t + x + 0.14);
      o.connect(gn); gn.connect(bus); o.start(t + x); o.stop(t + x + 0.16);
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900;
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.05 * Math.max(0, fade), t + x); g2.gain.exponentialRampToValueAtTime(0.0001, t + x + 0.06);
      s.connect(bp); bp.connect(g2); g2.connect(bus); s.start(t + x); s.stop(t + x + 0.08);
    }
  }

  function buzz() { // 吱吱吱——插錯了，電到
    if (!ctx || !g) return;
    const bus = sfxBus(0.1), t = ctx.currentTime + 0.02;
    for (let i = 0; i < 7; i++) {
      const x = i * 0.11, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140 + (i % 2) * 60, t + x);
      const gn = ctx.createGain(); gn.gain.setValueAtTime(0.06, t + x); gn.gain.exponentialRampToValueAtTime(0.0001, t + x + 0.09);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 3;
      o.connect(f); f.connect(gn); gn.connect(bus); o.start(t + x); o.stop(t + x + 0.1);
    }
  }
  function ding() { // 叮叮叮——對了
    if (!ctx || !g) return;
    const bus = sfxBus(0.4), t = ctx.currentTime + 0.02;
    for (const [dt, f] of [[0, 784], [0.18, 988], [0.36, 1319]]) bell(ctx, bus, t + dt, f, 0.14, 1.4);
  }

  // 吉他：四個和弦各刷一下（每個和弦約 0.5 秒，由低到高快速撥弦）
  const ROOT = { A: 220, B: 246.94, C: 261.63, D: 293.66, E: 164.81, F: 174.61, G: 196 };
  function strum(chords) {
    if (!ctx || !g || muted) return;
    const bus = sfxBus(0.32), t0 = ctx.currentTime + 0.05;
    [...String(chords)].forEach((c, k) => {
      const r = ROOT[c] || 220;
      [1, 1.5, 2, 2.52, 3, 4].forEach((m, i) => {
        const t = t0 + k * 0.5 + i * 0.022;
        const o = ctx.createOscillator(), e = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = r * m;
        f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.45);
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.16, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
        o.connect(f); f.connect(e); e.connect(bus); o.start(t); o.stop(t + 0.5);
      });
    });
  }

  return { unlock, play, stop, pa, speak, hush, buzz, ding, strum, footsteps, trainPass, _renderTrain: renderTrain, toggleMute, isMuted: () => muted, tracks: Object.keys(TRACKS), _renderOffline: renderOffline };
})();
