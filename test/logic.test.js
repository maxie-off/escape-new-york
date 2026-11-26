// Core puzzle rules, with no server running.
//
// Each scene module (scenes/scene0.js … scene3.js) is a pure piece of game
// logic: init() makes the state, view(state, role) is what that player is
// allowed to see, and act(state, role, action) applies one move. The server
// in server.js stores that state and, when act() returns solved: true, moves
// the room to the next scene. These tests call the modules directly.
//
// Variant 0 is written out in full so a failing assertion points at a rule
// (the wrong socket, the door without a passport) rather than at a loop.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const scene0 = require('../scenes/scene0');
const scene1 = require('../scenes/scene1');
const scene2 = require('../scenes/scene2');
const scene3 = require('../scenes/scene3');
const { scenes } = require('../scenes');

describe('scene 0: lighting the lamp', () => {
  // Paper (Raccoony): trapezoid is red, upside-down trapezoid is green, square is blue.
  // Sockets (Slothy), left to right: square, trapezoid, upside-down trapezoid.
  // The lamp shade is a trapezoid, so it belongs in socket 1.
  // Switches start on blue and cycle blue → green → red → blue.

  it('shows the paper only to Raccoony and the sockets only to Slothy', () => {
    const state = scene0.init(0);
    const a = scene0.view(state, 'A');
    const b = scene0.view(state, 'B');

    assert.deepEqual(
      a.paper.map((p) => [p.shape, p.color]),
      [['trapezoid', 'red'], ['inverted', 'green'], ['square', 'blue']],
    );
    assert.equal(a.example, 'square');
    assert.equal(a.lamp, undefined);
    assert.equal(a.sockets, undefined);

    assert.equal(b.paper, undefined);
    assert.equal(b.lamp, 'trapezoid');
    assert.deepEqual(b.sockets.map((s) => s.shape), ['square', 'trapezoid', 'inverted']);
    assert.deepEqual(b.sockets.map((s) => s.sw), ['blue', 'blue', 'blue']);
  });

  it('stays dark until the switches match the paper and the lamp is in its own shape', () => {
    const state = scene0.init(0);

    // The power strip is on Slothy's side.
    assert.equal(scene0.act(state, 'A', { type: 'plug', socket: 1 }).ok, false);

    // Right socket, but the trapezoid switch is still blue and the paper says red.
    assert.equal(scene0.act(state, 'B', { type: 'plug', socket: 1 }).correct, false);
    assert.equal(state.solved, false);

    scene0.act(state, 'B', { type: 'switch', socket: 1 }); // trapezoid: blue → green
    scene0.act(state, 'B', { type: 'switch', socket: 1 }); // trapezoid: green → red
    scene0.act(state, 'B', { type: 'switch', socket: 2 }); // inverted: blue → green
    assert.deepEqual(state.sw, ['blue', 'red', 'green']);

    // Colors are right, but this is the square socket.
    assert.equal(scene0.act(state, 'B', { type: 'plug', socket: 0 }).correct, false);
    assert.equal(state.solved, false);

    const lit = scene0.act(state, 'B', { type: 'plug', socket: 1 });
    assert.equal(lit.correct, true);
    assert.equal(lit.solved, true);
    assert.equal(state.solved, true);
  });
});

describe('scene 1: the bedroom door', () => {
  // Variant 0: computer password "acid", key in drawer 4 (code 4827),
  // passport suitcase chord CDAF. The door opens only with both items,
  // and the suitcase opens only when Slothy arms it and Raccoony plays.

  it('hides the password, the drawer code, and the suitcase code from both screens', () => {
    const state = scene1.init(0);
    const a = scene1.view(state, 'A');
    const b = JSON.stringify(scene1.view(state, 'B'));

    assert.equal(a.notion, null);
    assert.equal(a.chart, undefined);
    assert.ok(!JSON.stringify(a).includes('acid'));
    assert.ok(!b.includes('acid'));
    assert.ok(!b.includes('4827'));
    assert.ok(!JSON.stringify(a).includes('CDAF'));
    assert.ok(!b.includes('CDAF'));
  });

  it('opens the door only after the key and a suitcase both players unlock', () => {
    const state = scene1.init(0);

    assert.equal(scene1.act(state, 'B', { type: 'door_unlock' }).solved, undefined);
    assert.equal(state.doorOpen, false);

    // The computer is Raccoony's. A wrong password does not unlock it.
    assert.equal(scene1.act(state, 'B', { type: 'pc_password', value: 'acid' }).ok, false);
    assert.equal(scene1.act(state, 'A', { type: 'pc_password', value: 'zzzz' }).correct, false);
    assert.equal(state.pcUnlocked, false);
    assert.equal(scene1.act(state, 'A', { type: 'pc_password', value: 'ACID' }).correct, true);

    // The diary (and the drawer code in it) appears for Raccoony only.
    assert.ok(JSON.stringify(scene1.view(state, 'A').notion).includes('4827'));
    assert.ok(!JSON.stringify(scene1.view(state, 'B')).includes('4827'));

    // The wardrobe is Slothy's. The right drawer with the wrong code stays shut.
    assert.equal(scene1.act(state, 'A', { type: 'drawer_code', drawer: 4, code: '4827' }).ok, false);
    assert.equal(scene1.act(state, 'B', { type: 'drawer_code', drawer: 4, code: '0000' }).correct, false);
    assert.equal(state.hasKey, false);
    assert.equal(scene1.act(state, 'B', { type: 'drawer_code', drawer: 4, code: '4827' }).correct, true);
    assert.equal(state.hasKey, true);

    // Key, but no passport: the door sign stops them.
    const noPassport = scene1.act(state, 'B', { type: 'door_unlock' });
    assert.equal(noPassport.solved, undefined);
    assert.equal(state.doorOpen, false);

    // Playing the chord alone makes that suitcase glow. It does not open.
    scene1.act(state, 'A', { type: 'strum', chords: 'CDAF' });
    assert.equal(state.cases.plane, false);
    assert.equal(state.hasPassport, false);
    assert.equal(scene1.view(state, 'B').glow.id, 'plane');

    // Slothy arms the lock with the wrong letters. The song does not open it.
    scene1.act(state, 'B', { type: 'case_ready', case: 'plane', code: 'AAAA' });
    assert.equal(scene1.act(state, 'A', { type: 'strum', chords: 'CDAF' }).correct, false);
    assert.equal(state.hasPassport, false);

    // Right letters, but the strum comes after the window (10s plus a small grace).
    scene1.act(state, 'B', { type: 'case_ready', case: 'plane', code: 'CDAF' });
    state.armed.t -= 20000;
    assert.equal(scene1.act(state, 'A', { type: 'strum', chords: 'CDAF' }).correct, false);
    assert.equal(state.hasPassport, false);

    // Slothy arms it, Raccoony plays the same chord in time.
    assert.equal(scene1.act(state, 'A', { type: 'case_ready', case: 'plane', code: 'CDAF' }).ok, false);
    scene1.act(state, 'B', { type: 'case_ready', case: 'plane', code: 'CDAF' });
    const opened = scene1.act(state, 'A', { type: 'strum', chords: 'CDAF' });
    assert.equal(opened.correct, true);
    assert.equal(state.hasPassport, true);
    assert.equal(state.cases.plane, true);

    // Only Slothy can turn the knob, and now both items are in hand.
    assert.equal(scene1.act(state, 'A', { type: 'door_unlock' }).ok, false);
    const open = scene1.act(state, 'B', { type: 'door_unlock' });
    assert.equal(open.solved, true);
    assert.equal(state.doorOpen, true);
  });

  it('syncs crossed-out letters on the word-game paper to both players', () => {
    const state = scene1.init(0);

    scene1.act(state, 'A', { type: 'strike', letter: 'Q' });
    assert.deepEqual(scene1.view(state, 'A').struck, ['q']);
    assert.deepEqual(scene1.view(state, 'B').struck, ['q']);

    // The other player crossing the same letter restores it.
    scene1.act(state, 'B', { type: 'strike', letter: 'q' });
    assert.deepEqual(scene1.view(state, 'A').struck, []);
    assert.deepEqual(scene1.view(state, 'B').struck, []);

    assert.equal(scene1.act(state, 'A', { type: 'strike', letter: '1' }).ok, false);
  });
});

describe('scene 2: the subway board', () => {
  // Variant 0: the B line is already lit. The C line's symbol is a circle and
  // its channel is 7. The train that still reaches the airport is the C.

  function row(state, line) {
    return scene2.view(state, 'A').board.rows.find((r) => r.line === line);
  }

  it('splits the symbols and the channel numbers, and lights a row only when both are right', () => {
    const fresh = scene2.init(0);
    assert.equal(scene2.view(fresh, 'A').wires, undefined);
    assert.equal(scene2.view(fresh, 'B').board, undefined);
    assert.equal(scene2.view(fresh, 'B').wires.find((w) => w.line === 'C').ch, 7);
    assert.equal(row(fresh, 'C').state, 'dark');
    assert.equal(row(fresh, 'B').state, 'clear');

    const state = scene2.init(0);

    // The electric box is Slothy's. The dial is Raccoony's.
    assert.equal(scene2.act(state, 'A', { type: 'plug', line: 'C', term: 'circ' }).ok, false);
    assert.equal(scene2.act(state, 'B', { type: 'tune', line: 'C', ch: 7 }).ok, false);

    // Wrong symbol: the gate snaps back and the row stays dark.
    scene2.act(state, 'B', { type: 'plug', line: 'C', term: 'star' });
    assert.equal(scene2.act(state, 'B', { type: 'gate', term: 'star' }).correct, false);
    assert.equal(state.powered.C, false);
    assert.equal(row(state, 'C').state, 'dark');

    // Right symbol: Slothy's gate powers the row, and Raccoony's board shows static
    // until the dial matches the channel on Slothy's wire tag.
    scene2.act(state, 'B', { type: 'plug', line: 'C', term: 'circ' });
    scene2.act(state, 'B', { type: 'gate', term: 'circ' });
    assert.equal(state.powered.C, true);
    assert.equal(row(state, 'C').state, 'static');
    assert.equal(state.allClear, false);

    scene2.act(state, 'A', { type: 'tune', line: 'C', ch: 7 });
    assert.equal(row(state, 'C').state, 'clear');

    // One lit row is not enough to pick a train. The answer line is still rejected.
    const tooEarly = scene2.act(state, 'B', { type: 'board', line: 'C' });
    assert.equal(tooEarly.solved, undefined);
    assert.equal(state.solved, false);

    for (const [line, sym, ch] of [['E', 'sq', 2], ['1', 'star', 9], ['2', 'dia', 5]]) {
      scene2.act(state, 'B', { type: 'plug', line, term: sym });
      scene2.act(state, 'B', { type: 'gate', term: sym });
      scene2.act(state, 'A', { type: 'tune', line, ch });
    }
    assert.equal(state.allClear, true);

    // The two passers-by show up together, and they do not say the same line.
    assert.ok(scene2.view(state, 'A').passer);
    assert.ok(scene2.view(state, 'B').passer);
    assert.notDeepEqual(scene2.view(state, 'A').passer.lines, scene2.view(state, 'B').passer.lines);

    assert.equal(scene2.act(state, 'A', { type: 'board', line: 'C' }).ok, false);
    assert.equal(scene2.act(state, 'B', { type: 'board', line: 'E' }).correct, false);
    assert.equal(state.solved, false);

    const boarded = scene2.act(state, 'B', { type: 'board', line: 'C' });
    assert.equal(boarded.solved, true);
    assert.equal(state.solved, true);
  });
});

describe('scene 3: the airport', () => {
  // Variant 0: beach luggage, a January date, Bluebird (BB), passenger TIFFANY
  // on flight BB 729 at gate 40. The three firewall answers are fixed for the
  // first attempt: 4F, R-8-top, and arrow direction 2.

  it('shows the luggage only to Slothy and the departures board only to Raccoony', () => {
    const state = scene3.init(0);
    const a = scene3.view(state, 'A');
    const b = scene3.view(state, 'B');

    assert.equal(a.clothing, undefined);
    assert.equal(a.card, undefined);
    assert.equal(b.flights, undefined);
    assert.equal(b.posts, undefined);
    assert.deepEqual(b.clothing, ['bikini', 'tshirt']);
    assert.equal(b.card.name, 'TIFFANY');
    assert.ok(a.flights.some((f) => f.flight === 'BB 729' && f.gate === 40 && f.dest === 'DEL'));
    assert.ok(!JSON.stringify(a).includes('bikini'));
    assert.ok(!JSON.stringify(b).includes('BB 729'));
    assert.ok(!JSON.stringify(b).includes('manifest'));
  });

  it('rejects a wrong picture and does not reveal the passenger list', () => {
    const state = scene3.init(0);
    scene3.act(state, 'B', { type: 'airline', code: 'BB' });

    assert.equal(scene3.act(state, 'B', { type: 'hack', choice: '4F' }).ok, false);
    const missed = scene3.act(state, 'A', { type: 'hack', choice: '2F' });
    assert.equal(missed.correct, false);
    assert.equal(state.hack.phase, 'retry');
    assert.equal(scene3.view(state, 'A').hack.manifest, undefined);
  });

  it('opens the right gate only after the airline hack, and rewinds when the bomb hits zero', () => {
    const state = scene3.init(0);

    assert.equal(scene3.act(state, 'A', { type: 'airline', code: 'BB' }).ok, false);
    const wrongAirline = scene3.act(state, 'B', { type: 'airline', code: 'PS' });
    assert.equal(wrongAirline.correct, false);
    assert.equal(scene3.view(state, 'A').hack.phase, 'locked');

    // The lock is 30 seconds of real time. Clear it so the test does not wait.
    state.hack.lockUntil = 0;
    assert.equal(scene3.act(state, 'B', { type: 'airline', code: 'BB' }).correct, true);
    assert.equal(state.hack.phase, 'puzzle');

    // Slothy sees the picture. Raccoony sees the choices.
    assert.ok(scene3.view(state, 'B').hack.fig);
    assert.equal(scene3.view(state, 'B').hack.opts, undefined);
    assert.ok(scene3.view(state, 'A').hack.opts);
    assert.equal(scene3.view(state, 'A').hack.fig, undefined);

    assert.equal(scene3.act(state, 'A', { type: 'hack', choice: '4F' }).correct, true);
    assert.equal(scene3.act(state, 'A', { type: 'hack', choice: 'R-8-top' }).correct, true);
    const granted = scene3.act(state, 'A', { type: 'hack', choice: 2 });
    assert.equal(granted.correct, true);
    assert.equal(state.hack.phase, 'done');

    const manifest = scene3.view(state, 'A').hack.manifest;
    assert.ok(manifest.find((m) => m.flight === 'BB 729').names.includes('TIFFANY'));
    assert.equal(scene3.view(state, 'B').hack.manifest, undefined);

    assert.equal(scene3.act(state, 'A', { type: 'gate', gate: 40 }).ok, false);
    assert.equal(scene3.act(state, 'B', { type: 'gate', gate: 39 }).correct, false);
    assert.equal(state.solved, false);
    const caught = scene3.act(state, 'B', { type: 'gate', gate: 40 });
    assert.equal(caught.solved, true);
    assert.equal(state.solved, true);

    // A fresh room: the bomb button does nothing while time is left.
    const timed = scene3.init(0);
    timed.hack.phase = 'done';
    assert.equal(scene3.act(timed, 'B', { type: 'bomb' }).ok, false);
    assert.equal(timed.hack.phase, 'done');

    // Once the clock has run out, the scene starts over and the gate is unsolved.
    timed.bombAt = Date.now() - 1;
    const boom = scene3.act(timed, 'A', { type: 'bomb' });
    assert.equal(boom.boom, true);
    assert.equal(timed.solved, false);
    assert.equal(timed.hack.phase, 'idle');
    assert.ok(timed.bombAt > Date.now());
  });
});

describe('room order', () => {
  it('plays the evening in order: dark, bedroom, subway, airport', () => {
    // server.js walks this list. When act() returns solved: true it advances
    // sceneIndex. The tests above are the rules that produce that flag.
    // The bedroom tracks the open door on doorOpen; the other scenes use solved.
    assert.deepEqual(scenes.map((s) => s.id), ['dark', 'bedroom', 'subway', 'airport']);
    assert.equal(scene0.init(0).solved, false);
    assert.equal(scene1.init(0).doorOpen, false);
    assert.equal(scene2.init(0).solved, false);
    assert.equal(scene3.init(0).solved, false);
  });
});
