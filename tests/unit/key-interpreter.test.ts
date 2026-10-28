import { describe, expect, it } from 'vitest';

import { createKeyInterpreter, type KeyPress, type KeyResult } from '../../utils/key-interpreter';

const DEFAULT_PRESS: KeyPress = {
  code: 'Unidentified',
  repeat: false,
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
  isComposing: false,
  typing: false,
  trusted: true,
  timeStamp: 0,
};

const NO_RESULT: KeyResult = { effects: [], consumed: false };

const ALL_HINT_CODES =
  'aa ab ac ad ae ah ai al am an ao ap aq ar as at au av aw ax ay az a1 a2 a3 a4 a5 a6 a7 a8 ba bb bc bd be bh bi bl bm bn bo bp bq br bs bt bu bv bw bx by bz b1 b2 b3 b4 b5 b6 b7 b8 ca cb cc cd ce ch ci cl cm cn co cp cq cr cs ct cu cv cw cx cy cz c1 c2 c3 c4 c5 c6 c7 c8 da db dc dd de dh di dl dm dn do dp dq dr ds dt du dv dw dx dy dz d1 d2 d3 d4 d5 d6 d7 d8 ea eb ec ed ee eh ei el em en eo ep eq er es et eu ev ew ex ey ez e1 e2 e3 e4 e5 e6 e7 e8 ha hb hc hd he hh hi hl hm hn ho hp hq hr hs ht hu hv hw hx hy hz h1 h2 h3 h4 h5 h6 h7 h8 ia ib ic id ie ih ii il im in io ip iq ir is it iu iv iw ix iy iz i1 i2 i3 i4 i5 i6 i7 i8 la lb lc ld le lh li ll lm ln lo lp lq lr ls lt lu lv lw lx ly lz l1 l2 l3 l4 l5 l6 l7 l8 ma mb mc md me mh mi ml mm mn mo mp mq mr ms mt mu mv mw mx my mz m1 m2 m3 m4 m5 m6 m7 m8 na nb nc nd ne nh ni nl nm nn no np nq nr ns nt nu nv nw nx ny nz n1 n2 n3 n4 n5 n6 n7 n8 oa ob oc od oe oh oi ol om on oo op oq or os ot ou ov ow ox oy oz o1 o2 o3 o4 o5 o6 o7 o8 pa pb pc pd pe ph pi pl pm pn po pp pq pr ps pt pu pv pw px py pz p1 p2 p3 p4 p5 p6 p7 p8 qa qb qc qd qe qh qi ql qm qn qo qp qq qr qs qt qu qv qw qx qy qz q1 q2 q3 q4 q5 q6 q7 q8 ra rb rc rd re rh ri rl rm rn ro rp rq rr rs rt ru rv rw rx ry rz r1 r2 r3 r4 r5 r6 r7 r8 sa sb sc sd se sh si sl sm sn so sp sq sr ss st su sv sw sx sy sz s1 s2 s3 s4 s5 s6 s7 s8 ta tb tc td te th ti tl tm tn to tp tq tr ts tt tu tv tw tx ty tz t1 t2 t3 t4 t5 t6 t7 t8 ua ub uc ud ue uh ui ul um un uo up uq ur us ut uu uv uw ux uy uz u1 u2 u3 u4 u5 u6 u7 u8 va vb vc vd ve vh vi vl vm vn vo vp vq vr vs vt vu vv vw vx vy vz v1 v2 v3 v4 v5 v6 v7 v8 wa wb wc wd we wh wi wl wm wn wo wp wq wr ws wt wu wv ww wx wy wz w1 w2 w3 w4 w5 w6 w7 w8 xa xb xc xd xe xh xi xl xm xn xo xp xq xr xs xt xu xv xw xx xy xz x1 x2 x3 x4 x5 x6 x7 x8 ya yb yc yd ye yh yi yl ym yn yo yp yq yr ys yt yu yv yw yx yy yz y1 y2 y3 y4 y5 y6 y7 y8 za zb zc zd ze zh zi zl zm zn zo zp zq zr zs zt zu zv zw zx zy zz z1 z2 z3 z4 z5 z6 z7 z8 1a 1b 1c 1d 1e 1h 1i 1l 1m 1n 1o 1p 1q 1r 1s 1t 1u 1v 1w 1x 1y 1z 11 12 13 14 15 16 17 18 2a 2b 2c 2d 2e 2h 2i 2l 2m 2n 2o 2p 2q 2r 2s 2t 2u 2v 2w 2x 2y 2z 21 22 23 24 25 26 27 28 3a 3b 3c 3d 3e 3h 3i 3l 3m 3n 3o 3p 3q 3r 3s 3t 3u 3v 3w 3x 3y 3z 31 32 33 34 35 36 37 38 4a 4b 4c 4d 4e 4h 4i 4l 4m 4n 4o 4p 4q 4r 4s 4t 4u 4v 4w 4x 4y 4z 41 42 43 44 45 46 47 48 5a 5b 5c 5d 5e 5h 5i 5l 5m 5n 5o 5p 5q 5r 5s 5t 5u 5v 5w 5x 5y 5z 51 52 53 54 55 56 57 58 6a 6b 6c 6d 6e 6h 6i 6l 6m 6n 6o 6p 6q 6r 6s 6t 6u 6v 6w 6x 6y 6z 61 62 63 64 65 66 67 68 7a 7b 7c 7d 7e 7h 7i 7l 7m 7n 7o 7p 7q 7r 7s 7t 7u 7v 7w 7x 7y 7z 71 72 73 74 75 76 77 78 8a 8b 8c 8d 8e 8h 8i 8l 8m 8n 8o 8p 8q 8r 8s 8t 8u 8v 8w 8x 8y 8z 81 82 83 84 85 86 87 88'.split(' ');

function key(overrides: Partial<KeyPress>): KeyPress {
  return { ...DEFAULT_PRESS, ...overrides };
}

describe('createKeyInterpreter', () => {
  it.each([
    { name: 'KeyJ scrolls down', input: { code: 'KeyJ' }, expected: { effects: [{ kind: 'scrollStep', direction: 1 }], consumed: false } },
    { name: 'Shift+KeyJ switches to the Left tab', input: { code: 'KeyJ', shift: true }, expected: { effects: [{ kind: 'tabSwitch', direction: 'left' }], consumed: false } },
    { name: 'KeyK scrolls up', input: { code: 'KeyK' }, expected: { effects: [{ kind: 'scrollStep', direction: -1 }], consumed: false } },
    { name: 'Shift+KeyK switches to the Right tab', input: { code: 'KeyK', shift: true }, expected: { effects: [{ kind: 'tabSwitch', direction: 'right' }], consumed: false } },
    { name: 'Shift+KeyG goes to the bottom', input: { code: 'KeyG', shift: true }, expected: { effects: [{ kind: 'scrollToBottom' }], consumed: false } },
    { name: 'KeyH has no action', input: { code: 'KeyH' }, expected: NO_RESULT },
    { name: 'Shift+KeyH goes back', input: { code: 'KeyH', shift: true }, expected: { effects: [{ kind: 'historyBack' }], consumed: false } },
    { name: 'KeyL has no action', input: { code: 'KeyL' }, expected: NO_RESULT },
    { name: 'Shift+KeyL goes forward', input: { code: 'KeyL', shift: true }, expected: { effects: [{ kind: 'historyForward' }], consumed: false } },
    { name: 'KeyF collects Link-hint targets', input: { code: 'KeyF' }, expected: { effects: [{ kind: 'collectLinkHintTargets' }], consumed: true } },
    { name: 'Shift+KeyF has no action', input: { code: 'KeyF', shift: true }, expected: NO_RESULT },
  ])('maps $name by physical key code', ({ input, expected }) => {
    // #given
    const interpreter = createKeyInterpreter();

    // #when
    const result = interpreter.press(key(input));

    // #then
    expect(result).toEqual(expected);
  });

  it('starts the g sequence that a second g completes within 1000 ms', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyG', timeStamp: 10 }));

    // #when
    const result = interpreter.press(key({ code: 'KeyG', timeStamp: 1009 }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'scrollToTop' }], consumed: false });
  });

  it('does not complete gg exactly 1000 ms after the first g', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyG', timeStamp: 10 }));

    // #when
    const result = interpreter.press(key({ code: 'KeyG', timeStamp: 1010 }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('starts a new g sequence after the timeout', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyG', timeStamp: 10 }));
    interpreter.press(key({ code: 'KeyG', timeStamp: 1010 }));

    // #when
    const result = interpreter.press(key({ code: 'KeyG', timeStamp: 1011 }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'scrollToTop' }], consumed: false });
  });

  it('ends pending g after another unguarded key', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyG', timeStamp: 1 }));
    interpreter.press(key({ code: 'KeyJ', timeStamp: 2 }));
    interpreter.press(key({ code: 'KeyG', timeStamp: 3 }));

    // #when
    const result = interpreter.press(key({ code: 'KeyG', timeStamp: 4 }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'scrollToTop' }], consumed: false });
  });

  it('keeps pending g after a guarded key', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyG', timeStamp: 1 }));
    interpreter.press(key({ code: 'KeyF', ctrl: true, timeStamp: 2 }));

    // #when
    const result = interpreter.press(key({ code: 'KeyG', timeStamp: 3 }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'scrollToTop' }], consumed: false });
  });

  it('ends pending g when Shift+G goes to the bottom', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyG', timeStamp: 1 }));
    interpreter.press(key({ code: 'KeyG', shift: true, timeStamp: 2 }));
    interpreter.press(key({ code: 'KeyG', timeStamp: 3 }));

    // #when
    const result = interpreter.press(key({ code: 'KeyG', timeStamp: 4 }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'scrollToTop' }], consumed: false });
  });

  it.each([
    { name: 'Ctrl', input: { ctrl: true } },
    { name: 'Alt', input: { alt: true } },
    { name: 'Meta', input: { meta: true } },
    { name: 'IME composition', input: { isComposing: true } },
    { name: 'Typing', input: { typing: true } },
  ])('$name leaves a normal-mode key to the page', ({ input }) => {
    // #given
    const interpreter = createKeyInterpreter();

    // #when
    const result = interpreter.press(key({ code: 'KeyF', ...input }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('does not switch tabs for an untrusted Shift+J press', () => {
    // #given
    const interpreter = createKeyInterpreter();

    // #when
    const result = interpreter.press(key({ code: 'KeyJ', shift: true, trusted: false }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('scrolls one step before starting Continuous scroll on the first repeat', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyJ' }));

    // #when
    const result = interpreter.press(key({ code: 'KeyJ', repeat: true }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'startContinuousScroll', direction: 1 }], consumed: false });
  });

  it('does not restart Continuous scroll on another repeat in the same direction', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyJ', repeat: true }));

    // #when
    const result = interpreter.press(key({ code: 'KeyJ', repeat: true }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('starts Continuous scroll in the other direction on its repeat', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyJ', repeat: true }));

    // #when
    const result = interpreter.press(key({ code: 'KeyK', repeat: true }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'startContinuousScroll', direction: -1 }], consumed: false });
  });

  it.each(['KeyJ', 'KeyK'])('stops Continuous scroll when %s is released', (code) => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyJ', repeat: true }));

    // #when
    const result = interpreter.release(code);

    // #then
    expect(result).toEqual({ effects: [{ kind: 'stopContinuousScroll' }], consumed: false });
  });

  it('does nothing when a key is released without Continuous scroll', () => {
    // #given
    const interpreter = createKeyInterpreter();

    // #when
    const result = interpreter.release('KeyJ');

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('stops Continuous scroll when the window blurs', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyK', repeat: true }));

    // #when
    const result = interpreter.blur();

    // #then
    expect(result).toEqual({ effects: [{ kind: 'stopContinuousScroll' }], consumed: false });
  });

  it('stops Continuous scroll when KeyJ is released in Link-hint mode', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyJ', repeat: true }));
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);

    // #when
    const result = interpreter.release('KeyJ');

    // #then
    expect(result).toEqual({ effects: [{ kind: 'stopContinuousScroll' }], consumed: false });
  });

  it('does nothing when the window blurs without Continuous scroll', () => {
    // #given
    const interpreter = createKeyInterpreter();

    // #when
    const result = interpreter.blur();

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('shows literal Hint codes after f collects three targets', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));

    // #when
    const result = interpreter.linkHintTargets(3);

    // #then
    expect(result).toEqual({ effects: [{ kind: 'showLinkHints', codes: ['aa', 'ab', 'ac'] }], consumed: false });
  });

  it('shows no codes but enters Link-hint mode for zero targets', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));

    // #when
    const result = interpreter.linkHintTargets(0);

    // #then
    expect(result).toEqual({ effects: [{ kind: 'showLinkHints', codes: [] }], consumed: false });
  });

  it('narrows Link hints to target indices with the first character', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(3);

    // #when
    const result = interpreter.press(key({ code: 'KeyA' }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'narrowLinkHints', visible: [0, 1, 2] }], consumed: true });
  });

  it('uses the physical Digit1 key as a Hint character', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(721);

    // #when
    const result = interpreter.press(key({ code: 'Digit1' }));

    // #then
    expect(result).toEqual({
      effects: [{ kind: 'narrowLinkHints', visible: [720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749] }],
      consumed: true,
    });
  });

  it('activates the matching target and exits Link-hint mode after a full Hint code', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(2);
    interpreter.press(key({ code: 'KeyA' }));

    // #when
    const result = interpreter.press(key({ code: 'KeyB' }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'activateLinkHint', index: 1 }, { kind: 'exitLinkHints' }], consumed: true });
  });

  it.each([
    { name: 'Escape', input: { code: 'Escape' } },
    { name: 'Shift+Escape', input: { code: 'Escape', shift: true } },
  ])('exits Link-hint mode on $name', ({ input }) => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);

    // #when
    const result = interpreter.press(key(input));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'exitLinkHints' }], consumed: true });
  });

  it('exits and consumes a second Hint character that matches no code', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);
    interpreter.press(key({ code: 'KeyA' }));

    // #when
    const result = interpreter.press(key({ code: 'KeyB' }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'exitLinkHints' }], consumed: true });
  });

  it('exits without consuming a first Hint character that matches no code', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);

    // #when
    const result = interpreter.press(key({ code: 'KeyB' }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'exitLinkHints' }], consumed: false });
  });

  it('leaves an unrelated Link-hint key to the page', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);

    // #when
    const result = interpreter.press(key({ code: 'Enter' }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('keeps Link-hint mode after an unrelated key', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);
    interpreter.press(key({ code: 'Enter' }));
    interpreter.press(key({ code: 'KeyA' }));

    // #when
    const result = interpreter.press(key({ code: 'KeyA' }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'activateLinkHint', index: 0 }, { kind: 'exitLinkHints' }], consumed: true });
  });

  it.each([
    { name: 'Ctrl', input: { ctrl: true } },
    { name: 'Alt', input: { alt: true } },
    { name: 'Meta', input: { meta: true } },
    { name: 'IME composition', input: { isComposing: true } },
    { name: 'Typing', input: { typing: true } },
  ])('$name leaves a Link-hint key to the page', ({ input }) => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);

    // #when
    const result = interpreter.press(key({ code: 'KeyA', ...input }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('accepts a repeated Hint character', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);
    interpreter.press(key({ code: 'KeyA', repeat: true }));

    // #when
    const result = interpreter.press(key({ code: 'KeyA', repeat: true }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'activateLinkHint', index: 0 }, { kind: 'exitLinkHints' }], consumed: true });
  });

  it('keeps Link-hint mode after a shifted Hint key', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);
    interpreter.press(key({ code: 'KeyA', shift: true }));
    interpreter.press(key({ code: 'KeyA' }));

    // #when
    const result = interpreter.press(key({ code: 'KeyA' }));

    // #then
    expect(result).toEqual({ effects: [{ kind: 'activateLinkHint', index: 0 }, { kind: 'exitLinkHints' }], consumed: true });
  });

  it('leaves a shifted Hint key to the page', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));
    interpreter.linkHintTargets(1);

    // #when
    const result = interpreter.press(key({ code: 'KeyA', shift: true }));

    // #then
    expect(result).toEqual(NO_RESULT);
  });

  it('caps Link-hint codes at 900 with 88 as the last code', () => {
    // #given
    const interpreter = createKeyInterpreter();
    interpreter.press(key({ code: 'KeyF' }));

    // #when
    const result = interpreter.linkHintTargets(1000);

    // #then
    expect(result).toEqual({ effects: [{ kind: 'showLinkHints', codes: ALL_HINT_CODES }], consumed: false });
  });
});
