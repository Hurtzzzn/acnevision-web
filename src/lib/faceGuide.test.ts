import { describe, expect, it } from 'vitest';
import { COPY } from '@acnevision/shared';
import {
  allOk, captureAdvice, captureControl, centerOffset, checkGaze, checkLighting, checkPosition, createPositionChecker, guideAdvice, guideMessage,
  guideOval, guideStatus, guideVerdict, headAngles, IDLE_CHECKS, INITIAL_GUIDE_STATE, isBlockingAdvice, isInsideFrame, MAX_CENTER_OFFSET_SHARE,
  MAX_OUTSIDE_SHARE, MIN_FACE_HEIGHT_SHARE, NO_FACE_CHECKS, OVAL_HEIGHT_PERCENT, STATUS_HYSTERESIS_SHARE, toStagePoints,
  type CaptureAdvice, type GuideChecks, type GuideState,
} from './faceGuide';

/** A grid of landmarks like a face mesh, over a box: centered at (cx, cy), w by h, in stage pixels. */
function cloud(cx: number, cy: number, w: number, h: number, n = 10): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts.push({ x: cx - w / 2 + (w * i) / (n - 1), y: cy - h / 2 + (h * j) / (n - 1) });
  return pts;
}

const flat = (value: number, n = 100) => new Uint8ClampedArray(Array.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : value)));

// Column-major rotation about Y (yaw) and X (pitch), as MediaPipe lays out its 4x4 matrix.
function matrix(yawDeg: number, pitchDeg: number): number[] {
  const y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180;
  const m = new Array(16).fill(0);
  m[0] = Math.cos(y); m[2] = -Math.sin(y);
  m[5] = Math.cos(p); m[6] = Math.sin(p);
  m[8] = Math.sin(y); m[10] = Math.cos(y) * Math.cos(p);
  m[15] = 1;
  return m;
}

describe('face guide lighting', () => {
  it('passes a mid-bright face', () => expect(checkLighting(flat(130)).state).toBe('ok'));
  it('flags a dark face with a hint', () => {
    const c = checkLighting(flat(30));
    expect(c.state).toBe('bad');
    expect(c.hint).toMatch(/terang/);
  });
  it('flags glare', () => expect(checkLighting(flat(252)).state).toBe('bad'));
});

describe('face guide gaze', () => {
  it('reads yaw and pitch back from the matrix', () => {
    const a = headAngles(matrix(20, 0));
    expect(a.yaw).toBeCloseTo(20, 3);
    expect(headAngles(matrix(0, -10)).pitch).toBeCloseTo(-10, 3);
  });
  it('passes a frontal face and flags a turned one', () => {
    expect(checkGaze(matrix(5, 4)).state).toBe('ok');
    expect(checkGaze(matrix(45, 0)).state).toBe('bad');
    expect(checkGaze(matrix(30, 0)).state).toBe('ok');
    expect(checkGaze(matrix(-30, 0)).state).toBe('ok');
    expect(checkGaze(matrix(0, 22)).state).toBe('ok');
    expect(checkGaze(matrix(0, 30)).state).toBe('bad');
    expect(checkGaze(matrix(0, 40)).state).toBe('bad');
  });
  it('stays idle without a matrix', () => expect(checkGaze(undefined).state).toBe('idle'));
});

describe('face guide oval', () => {
  it('nearly fills the frame: 88% of the stage height, 3:4 in shape', () => {
    expect(OVAL_HEIGHT_PERCENT).toBeGreaterThanOrEqual(85);
    expect(OVAL_HEIGHT_PERCENT).toBeLessThanOrEqual(90);
    const o = guideOval(800, 600);
    expect((o.ry * 2) / 600).toBeCloseTo(OVAL_HEIGHT_PERCENT / 100, 5);
    expect(o.rx / o.ry).toBeCloseTo(0.75, 5);
    expect(o.cx).toBe(400);
    expect(o.cy).toBe(300);
  });

  it('stays proportional on a landscape and on a portrait phone stage, and fits the width of both', () => {
    for (const [w, h] of [[800, 600], [360, 480], [640, 480], [340, 453]] as const) {
      const o = guideOval(w, h);
      expect(o.rx / o.ry).toBeCloseTo(0.75, 5);
      expect(o.rx * 2).toBeLessThanOrEqual(w * 0.9 + 1e-6);
      expect(o.ry * 2).toBeLessThanOrEqual(h * 0.9 + 1e-6);
    }
  });
});

const W = 800, H = 600;
const oval = guideOval(W, H);
const ovalW = oval.rx * 2, ovalH = oval.ry * 2;
/**
 * A face like the real thing: a grid of landmarks as tall as `heightShare` of the oval (and as wide, in the oval's proportions),
 * centered on the oval and then moved by shares of the oval's own width (sideways) and height (up and down). So "0.22" in a test
 * means the same as MAX_CENTER_OFFSET_SHARE, and 0.7 the same as MIN_FACE_HEIGHT_SHARE.
 */
const face = (dxShare = 0, dyShare = 0, heightShare = 0.9) =>
  cloud(oval.cx + dxShare * ovalW, oval.cy + dyShare * ovalH, ovalW * heightShare, ovalH * heightShare);

const G = COPY.scan.guide;
const OUT_OF_FRAME = 'Geser wajahmu ke dalam bingkai';
const TOO_FAR = 'Dekatkan wajah sampai pipi dan dahi memenuhi layar';
const OFF_CENTER = 'Geser wajahmu ke tengah bingkai';

describe('the words (exactly as the product asked for them)', () => {
  it('has one message for each blocking problem, and the warning', () => {
    expect(G.outOfFrame).toBe(OUT_OF_FRAME);
    expect(G.tooFar).toBe(TOO_FAR);
    expect(G.offCenter).toBe(OFF_CENTER);
    expect(G.cautionNote).toBe('Hasil bisa kurang akurat');
    expect(G.allGood).toBe('Posisi sudah pas, diam sebentar lalu ambil foto');
  });
});

describe('face guide position: the photo needs a face that is close and near the middle', () => {
  it('passes a close, centered face', () => {
    const c = checkPosition(face(), W, H);
    expect(c.state).toBe('ok');
    expect(c.problem).toBeUndefined();
  });

  it('treats a close-up as fine, even a face taller than the frame: no "move back", nothing blocked', () => {
    const closeUp = cloud(W / 2, H / 2, 760, 680); // 680 px tall in a 600 px frame: its top and bottom rows run off, 20% of the landmarks
    expect(closeUp.filter((p) => !isInsideFrame(p, W, H)).length / closeUp.length).toBeCloseTo(0.2, 5);
    const c = checkPosition(closeUp, W, H);
    expect(c.state).toBe('ok');
    expect(c.problem).toBeUndefined();
    expect(JSON.stringify(COPY.scan)).not.toMatch(/Mundur/i);
  });

  describe('(a) no face, or most of it outside the frame', () => {
    it('blocks when there is no face', () => {
      const c = checkPosition([], W, H);
      expect(c.state).toBe('bad');
      expect(c.problem).toBe('outOfFrame');
      expect(c.hint).toBe(OUT_OF_FRAME);
    });

    it('blocks when most landmarks are outside the frame', () => {
      const c = checkPosition(cloud(900, 300, 400, 450), W, H); // about 70% of it is off the right edge
      expect(c.problem).toBe('outOfFrame');
      expect(c.hint).toBe(OUT_OF_FRAME);
    });

    it('draws the line at "more than half" of the landmarks outside', () => {
      const inside = { x: 100, y: 100 }, outside = { x: -10, y: 100 };
      expect(MAX_OUTSIDE_SHARE).toBe(0.5);
      expect(checkPosition([inside, inside, outside, outside], W, H).problem).not.toBe('outOfFrame'); // exactly half: allowed
      expect(checkPosition([inside, outside, outside, outside], W, H).problem).toBe('outOfFrame');
    });
  });

  describe('(b) a face that is too small or far', () => {
    it('blocks a face much smaller than the oval, asking to come closer', () => {
      const c = checkPosition(face(0, 0, 0.5), W, H);
      expect(c.state).toBe('bad');
      expect(c.problem).toBe('tooFar');
      expect(c.hint).toBe(TOO_FAR);
    });

    it('has the limit in one named constant: about 70% of the oval height', () => {
      expect(MIN_FACE_HEIGHT_SHARE).toBe(0.7);
      expect(checkPosition(face(0, 0, MIN_FACE_HEIGHT_SHARE - 0.05), W, H).problem).toBe('tooFar');
      expect(checkPosition(face(0, 0, MIN_FACE_HEIGHT_SHARE + 0.05), W, H).state).toBe('ok');
    });

    it('measures the face by its height against the oval height', () => {
      // wide but short: only the height counts
      expect(checkPosition(cloud(oval.cx, oval.cy, ovalW, ovalH * 0.5), W, H).problem).toBe('tooFar');
    });
  });

  describe('(c) a face away from the middle of the oval', () => {
    it('has the limit in one named constant, in the 20 to 25 percent range', () => {
      expect(MAX_CENTER_OFFSET_SHARE).toBe(0.22);
      expect(MAX_CENTER_OFFSET_SHARE).toBeGreaterThanOrEqual(0.2);
      expect(MAX_CENTER_OFFSET_SHARE).toBeLessThanOrEqual(0.25);
    });

    it('measures the middle of the face: sideways in oval widths, up and down in oval heights', () => {
      const o = centerOffset(face(0.1, -0.15), W, H);
      expect(o.dx).toBeCloseTo(0.1, 6);
      expect(o.dy).toBeCloseTo(-0.15, 6);
      expect(centerOffset(face(), W, H)).toEqual({ dx: 0, dy: 0 });
    });

    it('is fine near the middle, even a little off', () => {
      expect(checkPosition(face(0.12, -0.1), W, H).state).toBe('ok');
      expect(checkPosition(face(-MAX_CENTER_OFFSET_SHARE + 0.02), W, H).state).toBe('ok');
    });

    it('blocks a face moved sideways past the limit, asking to move to the middle', () => {
      const c = checkPosition(face(MAX_CENTER_OFFSET_SHARE + 0.02), W, H);
      expect(c.state).toBe('bad');
      expect(c.problem).toBe('offCenter');
      expect(c.hint).toBe(OFF_CENTER);
    });

    it('blocks a face moved up or down past the limit (measured against the oval height)', () => {
      expect(checkPosition(face(0, MAX_CENTER_OFFSET_SHARE - 0.02, 0.8), W, H).state).toBe('ok');
      expect(checkPosition(face(0, MAX_CENTER_OFFSET_SHARE + 0.02, 0.8), W, H).problem).toBe('offCenter');
      expect(checkPosition(face(0, -(MAX_CENTER_OFFSET_SHARE + 0.02), 0.8), W, H).problem).toBe('offCenter');
    });

    it('is not fine for a face at the left of the frame with the oval empty on the right', () => {
      expect(checkPosition(face(-0.45), W, H).problem).toBe('offCenter'); // inside the frame, only far from the middle
    });

    it('treats left and right the same (the oval is centered, the preview is mirrored)', () => {
      expect(checkPosition(face(-0.4), W, H)).toEqual(checkPosition(face(0.4), W, H));
    });

    it('flags a big close-up pushed to one side', () => {
      expect(checkPosition(cloud(500, 300, 700, 560), W, H).problem).toBe('offCenter'); // a little past the right edge, mostly inside
    });
  });

  describe('the order when several apply: (a), then (b), then (c)', () => {
    it('a missing face wins over everything', () => expect(checkPosition([], W, H).problem).toBe('outOfFrame'));

    it('mostly out of the frame wins over small and off-center', () => {
      const c = checkPosition(cloud(900, 300, 100, 100), W, H); // small, far to the side, and outside the frame
      expect(c.problem).toBe('outOfFrame');
    });

    it('too small wins over off-center', () => {
      const c = checkPosition(cloud(oval.cx - 0.4 * ovalW, oval.cy, ovalW * 0.3, ovalH * 0.3), W, H); // small AND far to the left
      expect(c.problem).toBe('tooFar');
      expect(c.hint).toBe(TOO_FAR);
    });
  });
});

describe('the one verdict: advice, tone and words', () => {
  const fits: GuideChecks = { lighting: { state: 'ok' }, position: { state: 'ok' }, gaze: { state: 'ok' } };
  const dark = { state: 'bad' as const, hint: G.lightingDark };
  const glare = { state: 'bad' as const, hint: G.lightingBright };
  const turned = { state: 'bad' as const, hint: G.gazeBad };

  it('is green "Posisi sudah pas" only when the face is close, centered, well lit and facing the camera', () => {
    expect(guideVerdict(fits)).toEqual({ advice: 'ready', tone: 'ok', text: G.allGood });
    expect(allOk(fits)).toBe(true);
  });

  it('warns "Hasil bisa kurang akurat" for light, glare and head angle, with the cause after it', () => {
    expect(guideVerdict({ ...fits, lighting: dark })).toEqual({ advice: 'caution', tone: 'bad', text: `Hasil bisa kurang akurat. ${G.lightingDark}` });
    expect(guideVerdict({ ...fits, lighting: glare }).text).toBe(`Hasil bisa kurang akurat. ${G.lightingBright}`);
    expect(guideVerdict({ ...fits, gaze: turned }).text).toBe(`Hasil bisa kurang akurat. ${G.gazeBad}`);
  });

  it('names light before head angle when both are off, and says just the warning without a cause', () => {
    expect(guideVerdict({ ...fits, lighting: dark, gaze: turned }).text).toContain(G.lightingDark);
    expect(guideVerdict({ ...fits, lighting: { state: 'bad' } }).text).toBe(G.cautionNote);
  });

  it('puts a position problem ahead of the warning', () => {
    const tooFar = checkPosition(face(0, 0, 0.4), W, H);
    expect(guideVerdict({ lighting: dark, position: tooFar, gaze: turned })).toEqual({ advice: 'tooFar', tone: 'bad', text: TOO_FAR });
  });

  it('shows the general hint, neutral and never green, before anything is known', () => {
    expect(guideVerdict(IDLE_CHECKS)).toEqual({ advice: 'ready', tone: 'neutral', text: G.hint });
  });

  it('is never green for a face that is far or off-center, even with good light', () => {
    for (const position of [checkPosition(face(0, 0, 0.4), W, H), checkPosition(face(0.4), W, H), NO_FACE_CHECKS.position]) {
      const v = guideVerdict({ ...fits, position });
      expect(v.tone).toBe('bad');
      expect(isBlockingAdvice(v.advice)).toBe(true);
    }
  });

  it('keeps captureAdvice and guideStatus in step with it', () => {
    for (const c of [fits, { ...fits, lighting: dark }, NO_FACE_CHECKS, IDLE_CHECKS]) {
      expect(captureAdvice(c)).toBe(guideVerdict(c).advice);
      expect(guideStatus(c)).toEqual({ tone: guideVerdict(c).tone, text: guideVerdict(c).text });
    }
  });

  it('tells which advice blocks the button: the three position problems, and nothing else', () => {
    expect(['outOfFrame', 'tooFar', 'offCenter'].every((a) => isBlockingAdvice(a as CaptureAdvice))).toBe(true);
    expect(isBlockingAdvice('caution')).toBe(false);
    expect(isBlockingAdvice('ready')).toBe(false);
  });
});

describe('the guide not running leaves the camera working as before', () => {
  it('gives no blocking advice while the model loads, or when it failed or is unsupported', () => {
    expect(guideAdvice('loading', NO_FACE_CHECKS)).toBe('ready');
    expect(guideAdvice('unavailable', NO_FACE_CHECKS)).toBe('ready');
    expect(guideAdvice('ready', NO_FACE_CHECKS)).toBe('outOfFrame');
    expect(INITIAL_GUIDE_STATE).toEqual({ status: 'loading', advice: 'ready', message: '' });
  });

  it('reports the words for every state, and nothing when the guide cannot run', () => {
    expect(guideMessage('unavailable', NO_FACE_CHECKS)).toEqual({ tone: 'neutral', text: '' });
    expect(guideMessage('loading', NO_FACE_CHECKS)).toEqual({ tone: 'neutral', text: G.loading });
    expect(guideMessage('ready', NO_FACE_CHECKS).text).toBe(OUT_OF_FRAME);
  });
});

describe('capture button control', () => {
  const on = { camReady: true, disabled: false };

  it.each(['outOfFrame', 'tooFar', 'offCenter'] as const)('blocks for %s once it has lasted: unavailable to press, but still focusable (aria-disabled)', (advice) => {
    expect(captureControl(advice, { ...on, blockHeld: true })).toEqual({ disabled: false, blocked: true, canCapture: false });
  });

  it.each(['outOfFrame', 'tooFar', 'offCenter'] as const)('does not block for %s until it has lasted (the short delay against flicker)', (advice) => {
    expect(captureControl(advice, { ...on, blockHeld: false })).toEqual({ disabled: false, blocked: false, canCapture: true });
  });

  it('stays active with a warning for light, glare and head angle', () => {
    expect(captureControl('caution', { ...on, blockHeld: false })).toEqual({ disabled: false, blocked: false, canCapture: true });
    expect(captureControl('caution', { ...on, blockHeld: true })).toEqual({ disabled: false, blocked: false, canCapture: true }); // never blocks
  });

  it('stays active when all is well', () => {
    expect(captureControl('ready', { ...on, blockHeld: false })).toEqual({ disabled: false, blocked: false, canCapture: true });
  });

  it('stays active when the guide is loading, failed or unsupported, whatever the face looks like', () => {
    for (const status of ['loading', 'unavailable'] as const) {
      const advice = guideAdvice(status, NO_FACE_CHECKS);
      expect(captureControl(advice, { ...on, blockHeld: isBlockingAdvice(advice) })).toEqual({ disabled: false, blocked: false, canCapture: true });
    }
  });

  it('keeps the plain disabled state while the camera starts or the page is busy, whatever the guide says', () => {
    expect(captureControl('ready', { camReady: false, disabled: false, blockHeld: false })).toEqual({ disabled: true, blocked: false, canCapture: false });
    expect(captureControl('tooFar', { camReady: true, disabled: true, blockHeld: true })).toEqual({ disabled: true, blocked: false, canCapture: false });
  });
});

describe('message priority: (a), then (b), then (c), then "kurang akurat", then green', () => {
  const positions = {
    noFace: NO_FACE_CHECKS.position,
    outOfFrame: checkPosition(cloud(900, 300, 400, 450), W, H),
    tooFar: checkPosition(face(0, 0, 0.4), W, H),
    offCenter: checkPosition(face(0.4), W, H),
    fine: checkPosition(face(), W, H),
  };
  const lights = { ok: { state: 'ok' as const }, dark: { state: 'bad' as const, hint: G.lightingDark }, glare: { state: 'bad' as const, hint: G.lightingBright } };
  const gazes = { ok: { state: 'ok' as const }, turned: { state: 'bad' as const, hint: G.gazeBad } };
  const combos = Object.entries(positions).flatMap(([p, position]) =>
    Object.entries(lights).flatMap(([l, lighting]) => Object.entries(gazes).map(([g, gaze]) => ({
      name: `${p} + ${l} light + ${g} gaze`, p, checks: { lighting, position, gaze } as GuideChecks,
    }))));

  it.each(combos)('ranks the advice in the stated order ($name)', ({ p, checks }) => {
    const expected = ({ noFace: 'outOfFrame', outOfFrame: 'outOfFrame', tooFar: 'tooFar', offCenter: 'offCenter' } as Record<string, string>)[p]
      ?? (checks.lighting.state === 'bad' || checks.gaze.state === 'bad' ? 'caution' : 'ready');
    expect(captureAdvice(checks)).toBe(expected);
  });

  it.each(combos)('has a pill whose words match the advice ($name)', ({ checks }) => {
    const v = guideVerdict(checks);
    if (isBlockingAdvice(v.advice)) expect(v.text).toBe({ outOfFrame: OUT_OF_FRAME, tooFar: TOO_FAR, offCenter: OFF_CENTER }[v.advice]);
    else if (v.advice === 'caution') expect(v.text.startsWith(`${G.cautionNote}. `)).toBe(true);
    else expect([G.allGood, G.hint]).toContain(v.text);
  });

  it.each(combos)('gives the pill and the hidden description for screen readers the very same words ($name)', ({ checks }) => {
    // FaceGuide draws `guideMessage(status, checks).text` on the pill and reports the same string upward as `message`, which
    // PhotoInput shows (sr-only) as the button's description.
    const pill = guideMessage('ready', checks);
    const reported: GuideState = { status: 'ready', advice: guideAdvice('ready', checks), message: pill.text };
    expect(reported.message).toBe(pill.text);
    expect(reported.message).toBe(guideVerdict(checks).text);
  });

  it.each(combos)('is green only when the advice is ready and every check is ok ($name)', ({ checks }) => {
    expect(guideVerdict(checks).tone === 'ok').toBe(captureAdvice(checks) === 'ready' && allOk(checks));
  });

  it('blocks the button for the three position problems and leaves it working for the rest', () => {
    const on = { camReady: true, disabled: false };
    for (const [p, position] of Object.entries(positions)) {
      const advice = captureAdvice({ lighting: lights.ok, position, gaze: gazes.ok });
      const control = captureControl(advice, { ...on, blockHeld: true });
      expect(control.blocked, p).toBe(p !== 'fine');
      expect(control.canCapture, p).toBe(p === 'fine');
    }
  });
});

describe('position hysteresis (the button does not switch on and off on a threshold)', () => {
  const flips = (flags: boolean[]) => flags.filter((f, i) => i > 0 && f !== flags[i - 1]).length;
  const blockedBy = (checker: ReturnType<typeof createPositionChecker>, points: { x: number; y: number }[]) =>
    isBlockingAdvice(captureAdvice({ lighting: { state: 'ok' }, position: checker.check(points, W, H), gaze: { state: 'ok' } }));

  it('has a small hysteresis, applied to both thresholds', () => {
    expect(STATUS_HYSTERESIS_SHARE).toBeGreaterThan(0);
    expect(STATUS_HYSTERESIS_SHARE).toBeLessThanOrEqual(0.06);
  });

  it('keeps calling a face off-center until it is clearly back, then does not flip on the way out', () => {
    const checker = createPositionChecker();
    const offs = [0.25, 0.2, 0.19, 0.17, 0.2, 0.21, 0.23].map((d) => checker.check(face(d), W, H).problem === 'offCenter');
    // over the limit, still blocked while above (limit - hysteresis), back at 0.17, then fine until the limit is passed again
    expect(offs).toEqual([true, true, true, false, false, false, true]);
  });

  it('does the same for a face that is too small', () => {
    const checker = createPositionChecker();
    const fars = [0.68, 0.72, 0.73, 0.75, 0.72, 0.71, 0.68].map((s) => checker.check(face(0, 0, s), W, H).problem === 'tooFar');
    expect(fars).toEqual([true, true, true, false, false, false, true]);
  });

  it('does not flip the button for a face that jitters right across the off-center limit', () => {
    const jitter = Array.from({ length: 12 }, (_, i) => (i % 2 ? 0.225 : 0.215));
    const checker = createPositionChecker();
    const withMemory = jitter.map((d) => blockedBy(checker, face(d)));
    const withoutMemory = jitter.map((d) => isBlockingAdvice(captureAdvice({ lighting: { state: 'ok' }, position: checkPosition(face(d), W, H), gaze: { state: 'ok' } })));
    expect(flips(withoutMemory)).toBe(11); // the plain check flips on every frame
    expect(flips(withMemory)).toBe(1); // the live one settles on blocked once
  });

  it('does not flip the button for a face that jitters right across the too-far limit', () => {
    const jitter = Array.from({ length: 12 }, (_, i) => (i % 2 ? 0.71 : 0.69)); // starts just under the 0.70 limit
    const checker = createPositionChecker();
    const withMemory = jitter.map((s) => blockedBy(checker, face(0, 0, s)));
    const withoutMemory = jitter.map((s) => isBlockingAdvice(captureAdvice({ lighting: { state: 'ok' }, position: checkPosition(face(0, 0, s), W, H), gaze: { state: 'ok' } })));
    expect(flips(withoutMemory)).toBe(11); // the plain check flips on every frame
    expect(flips(withMemory)).toBe(0); // the live one is blocked at the first frame and simply stays blocked
  });

  it('keeps the memory when the other problem takes over the message, so the button stays steady', () => {
    const checker = createPositionChecker();
    expect(checker.check(face(0.25), W, H).problem).toBe('offCenter');
    // small and still far to the side: "too far" wins the message, but "off-center" is remembered underneath
    expect(checker.check(cloud(oval.cx + 0.2 * ovalW, oval.cy, ovalW * 0.3, ovalH * 0.3), W, H).problem).toBe('tooFar');
    // now close enough: the side position (0.20) is still over the eased limit (0.18), so it stays blocked, not flipping to fine
    expect(checker.check(face(0.2), W, H).problem).toBe('offCenter');
  });

  it('forgets the verdict when the face is lost, or on reset', () => {
    const checker = createPositionChecker();
    expect(checker.check(face(0.25), W, H).problem).toBe('offCenter');
    expect(checker.check([], W, H).problem).toBe('outOfFrame');
    expect(checker.check(face(0.2), W, H).state).toBe('ok'); // fresh: 0.20 is under the limit
    checker.check(face(0.25), W, H);
    checker.reset();
    expect(checker.check(face(0.2), W, H).state).toBe('ok');
  });

  it('gives the same answers as the plain check for a face far from every threshold', () => {
    const checker = createPositionChecker();
    for (const pts of [face(), face(0.05), face(0.4), face(-0.4), face(0, 0, 0.4)]) expect(checker.check(pts, W, H)).toEqual(checkPosition(pts, W, H));
  });
});

describe('landmarks to stage pixels (mirrored like the preview)', () => {
  const video = { width: 1920, height: 1080 };
  const stage = { width: 800, height: 600 }; // 16:9 video shown in a 4:3 stage: the sides of the video are cropped
  const at = (x: number, y = 0.5) => toStagePoints([{ x, y }], video, stage)[0];

  it('puts the middle of the video in the middle of the stage, for any shape of video and stage', () => {
    for (const [v, s] of [
      [video, stage], [{ width: 1080, height: 1920 }, { width: 360, height: 480 }], [{ width: 640, height: 480 }, { width: 800, height: 600 }],
    ] as const) {
      for (const mirrored of [true, false]) {
        const p = toStagePoints([{ x: 0.5, y: 0.5 }], v, s, mirrored)[0];
        expect(p.x).toBeCloseTo(s.width / 2, 6);
        expect(p.y).toBeCloseTo(s.height / 2, 6);
      }
    }
  });

  it('mirrors: something on the left of the video shows on the right of the preview, and the other way round', () => {
    expect(at(0.4).x).toBeGreaterThan(stage.width / 2);
    expect(at(0.6).x).toBeLessThan(stage.width / 2);
    expect(toStagePoints([{ x: 0.4, y: 0.5 }], video, stage, false)[0].x).toBeLessThan(stage.width / 2);
  });

  it('is symmetric about the middle, so the centered oval sees left and right alike', () => {
    expect(at(0.5 - 0.1).x - stage.width / 2).toBeCloseTo(stage.width / 2 - at(0.5 + 0.1).x, 6);
  });

  it('scales to cover the stage and trims the sides of a wider video: its far edges fall outside the frame', () => {
    expect(isInsideFrame(at(0), stage.width, stage.height)).toBe(false);
    expect(isInsideFrame(at(1), stage.width, stage.height)).toBe(false);
    expect(isInsideFrame(at(0.15), stage.width, stage.height)).toBe(true);
    expect(isInsideFrame(at(0.5, 0), stage.width, stage.height)).toBe(true); // top edge of the video is the top of the stage
    expect(isInsideFrame(at(0.5, 1), stage.width, stage.height)).toBe(true);
  });

  it('gives the verdict for a face that is where the user sees it, whichever side of the video it is on', () => {
    // A face big enough not to be "too far" (80% of the video height, 24% of its width), centered on cx, in video coordinates (0 to 1).
    const faceAtVideoX = (cx: number) => Array.from({ length: 100 }, (_, i) => ({ x: cx - 0.12 + ((i % 10) / 9) * 0.24, y: 0.1 + Math.floor(i / 10) * (0.8 / 9) }));
    const verdict = (cx: number) => checkPosition(toStagePoints(faceAtVideoX(cx), video, { width: stage.width, height: stage.height }), stage.width, stage.height);
    expect(verdict(0.5).state).toBe('ok'); // in the middle of the video: in the middle of the oval
    expect(verdict(0.3).problem).toBe('offCenter'); // left in the video, so right in the preview
    expect(verdict(0.7).problem).toBe('offCenter'); // right in the video, so left in the preview
    expect(verdict(0.3).hint).toBe(verdict(0.7).hint);
  });
});

describe('allOk', () => {
  it('needs all three checks green', () => {
    expect(allOk(IDLE_CHECKS)).toBe(false);
    expect(allOk({ lighting: { state: 'ok' }, position: { state: 'ok' }, gaze: { state: 'ok' } })).toBe(true);
  });
});
