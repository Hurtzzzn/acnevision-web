import { COPY } from '@acnevision/shared';

/**
 * Pure checks behind the camera face guide. They take landmarks and pixels only (no MediaPipe, no DOM), so they are testable.
 * Everything runs in the browser; nothing here sends a frame anywhere.
 */

export interface Point { x: number; y: number }
export type CheckState = 'ok' | 'bad' | 'idle';

/**
 * What is wrong with the position. Each one blocks the photo (a face that is far or off to the side has proven not to get its
 * lesions detected), and they are ranked in this order when several apply:
 * - `outOfFrame`: no face, or more than `MAX_OUTSIDE_SHARE` of its landmarks outside the frame.
 * - `tooFar`: the face is shorter than `MIN_FACE_HEIGHT_SHARE` of the oval's height.
 * - `offCenter`: the middle of the face is further than `MAX_CENTER_OFFSET_SHARE` from the middle of the oval.
 */
export type PositionProblem = 'outOfFrame' | 'tooFar' | 'offCenter';

/** `hint` is the specific advice for light and head angle; a position check sets `problem` instead (its words come from the problem). */
export interface Check { state: CheckState; hint?: string; problem?: PositionProblem }
export interface GuideChecks { lighting: Check; position: Check; gaze: Check }

const G = COPY.scan.guide;

/** The words for each position problem: the status pill on the camera and the screen-reader note under it both use exactly these. */
const PROBLEM_TEXT: Record<PositionProblem, string> = { outOfFrame: G.outOfFrame, tooFar: G.tooFar, offCenter: G.offCenter };

export const IDLE_CHECKS: GuideChecks = { lighting: { state: 'idle' }, position: { state: 'idle' }, gaze: { state: 'idle' } };
export const NO_FACE_CHECKS: GuideChecks = {
  lighting: { state: 'idle' }, position: { state: 'bad', problem: 'outOfFrame', hint: PROBLEM_TEXT.outOfFrame }, gaze: { state: 'idle' },
};

export const allOk = (c: GuideChecks) => c.lighting.state === 'ok' && c.position.state === 'ok' && c.gaze.state === 'ok';

// Lighting: mean brightness (0 to 255) of the face area, and the share of near-white pixels (glare).
export const MIN_BRIGHTNESS = 70;
export const MAX_BRIGHTNESS = 200;
export const MAX_GLARE_SHARE = 0.12;
// Gaze: head turn limits in degrees. Loose on yaw, since people turn a little to show the cheek.
export const MAX_YAW_DEG = 35;
export const MAX_PITCH_DEG = 25;

/**
 * Position. Close-ups are what the detector was trained on: a face that is far or off to the side is not detected well, so the photo
 * is only allowed when the face is close enough and near the middle. A big face is never a problem. "Frame" is the stage, which is
 * also exactly what the photo keeps (see `visibleCropRect`), so what the check calls inside is what ends up in the picture.
 */

/** A face is "mostly out of the frame" (or missing) when more than this share of its landmarks lie outside it. */
export const MAX_OUTSIDE_SHARE = 0.5;
/**
 * How tall the face must be, as a share of the oval's height (hairline to chin, as the landmarks span it), to count as close enough.
 * The oval is 88% of the frame, so 0.70 is roughly 60% of the frame's height. Lower lets people stand further back; higher asks for
 * a tighter close-up.
 */
export const MIN_FACE_HEIGHT_SHARE = 0.7;
/**
 * How far the middle of the face may be from the middle of the oval and still count as centered: this share of the oval's width
 * (sideways) or of its height (up and down). 0.20 to 0.25 is the sensible range: tighter nags people who are close enough, looser
 * lets a face at the edge through.
 */
export const MAX_CENTER_OFFSET_SHARE = 0.22;
/**
 * Hysteresis for the two soft thresholds above (same unit as `MIN_FACE_HEIGHT_SHARE` and `MAX_CENTER_OFFSET_SHARE`): once a face has
 * been called too far or off-center it must get this much better than the threshold before it is called fine again. A face sitting
 * right on a threshold then does not switch the capture button on and off every frame.
 */
export const STATUS_HYSTERESIS_SHARE = 0.04;

/** Mean brightness and glare share from RGBA pixel data. */
export function measureLight(rgba: ArrayLike<number>): { mean: number; glare: number } {
  const n = Math.floor(rgba.length / 4);
  if (n === 0) return { mean: 0, glare: 0 };
  let sum = 0;
  let glare = 0;
  for (let i = 0; i < n; i++) {
    const y = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    sum += y;
    if (y > 245) glare++;
  }
  return { mean: sum / n, glare: glare / n };
}

export function checkLighting(rgba: ArrayLike<number>): Check {
  const { mean, glare } = measureLight(rgba);
  if (mean < MIN_BRIGHTNESS) return { state: 'bad', hint: G.lightingDark };
  if (mean > MAX_BRIGHTNESS || glare > MAX_GLARE_SHARE) return { state: 'bad', hint: G.lightingBright };
  return { state: 'ok' };
}

/** Yaw and pitch in degrees from MediaPipe's 4x4 facial transformation matrix (column-major, rotation in the top-left 3x3). */
export function headAngles(m: ArrayLike<number>): { yaw: number; pitch: number } {
  const deg = 180 / Math.PI;
  return { yaw: Math.asin(Math.max(-1, Math.min(1, -m[2]))) * deg, pitch: Math.atan2(m[6], m[10]) * deg };
}

export function checkGaze(m: ArrayLike<number> | undefined): Check {
  if (!m || m.length < 16) return { state: 'idle' };
  const { yaw, pitch } = headAngles(m);
  return Math.abs(yaw) <= MAX_YAW_DEG && Math.abs(pitch) <= MAX_PITCH_DEG ? { state: 'ok' } : { state: 'bad', hint: G.gazeBad };
}

/**
 * Height of the guide oval as a percentage of the stage height. It nearly fills the frame because the goal is a close-up, with
 * cheeks and forehead filling the picture. The stage is 3:4 on phones and 4:3 from md, so at 3:4 the oval is also about 88% of the
 * width. The ovals drawn in PhotoInput and FaceGuide use this number too.
 */
export const OVAL_HEIGHT_PERCENT = 88;

/** The guide oval in stage pixels: centered, `OVAL_HEIGHT_PERCENT` of the stage height, 3:4 (matches the dashed oval that is drawn). */
export function guideOval(width: number, height: number) {
  const ry = (height * OVAL_HEIGHT_PERCENT) / 200;
  return { cx: width / 2, cy: height / 2, rx: ry * 0.75, ry };
}

/** Whether a stage point is inside the frame the camera shows (and the photo keeps). */
export const isInsideFrame = (p: Point, stageW: number, stageH: number) => p.x >= 0 && p.x <= stageW && p.y >= 0 && p.y <= stageH;

export function boundsOf(points: readonly Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Where the middle of the face (the center of the box around its landmarks) is, relative to the middle of the oval: sideways as a
 * share of the oval's width, up and down as a share of its height. Positive is right and down. `points` are in display (stage)
 * pixels, so this already follows the mirrored preview; the oval is centered, so a face the same distance to the left or to the
 * right gives the same result.
 */
export function centerOffset(points: readonly Point[], stageW: number, stageH: number): { dx: number; dy: number } {
  const oval = guideOval(stageW, stageH);
  const b = boundsOf(points);
  return { dx: ((b.minX + b.maxX) / 2 - oval.cx) / (oval.rx * 2), dy: ((b.minY + b.maxY) / 2 - oval.cy) / (oval.ry * 2) };
}

/** What the position check remembers from the last frame, only to apply the hysteresis. */
interface PositionMemory { tooFar: boolean; offCenter: boolean }
const FRESH_MEMORY: PositionMemory = { tooFar: false, offCenter: false };

function evaluatePosition(points: readonly Point[], stageW: number, stageH: number, was: PositionMemory): { check: Check; memory: PositionMemory } {
  const bad = (problem: PositionProblem): Check => ({ state: 'bad', problem, hint: PROBLEM_TEXT[problem] });
  if (points.length === 0) return { check: bad('outOfFrame'), memory: FRESH_MEMORY };
  const outside = points.filter((p) => !isInsideFrame(p, stageW, stageH)).length;
  if (outside / points.length > MAX_OUTSIDE_SHARE) return { check: bad('outOfFrame'), memory: FRESH_MEMORY };

  const oval = guideOval(stageW, stageH);
  const share = boundsOf(points).height / (oval.ry * 2);
  const { dx, dy } = centerOffset(points, stageW, stageH);
  // Both are worked out every frame, whichever problem wins, so the hysteresis stays right when "too far" hides "off-center".
  const tooFar = share < MIN_FACE_HEIGHT_SHARE + (was.tooFar ? STATUS_HYSTERESIS_SHARE : 0);
  const offCenter = Math.max(Math.abs(dx), Math.abs(dy)) > MAX_CENTER_OFFSET_SHARE - (was.offCenter ? STATUS_HYSTERESIS_SHARE : 0);
  const memory = { tooFar, offCenter };
  if (tooFar) return { check: bad('tooFar'), memory };
  if (offCenter) return { check: bad('offCenter'), memory };
  return { check: { state: 'ok' }, memory };
}

/**
 * `points` are face landmarks in stage pixels (they can lie outside the stage when the face runs off the edge). The first of these
 * that applies wins:
 * - No face, or most landmarks outside the frame: `outOfFrame`.
 * - A face shorter than `MIN_FACE_HEIGHT_SHARE` of the oval: `tooFar`.
 * - A face away from the middle of the oval: `offCenter`.
 * - Anything else is fine, however big: a close-up is what the detector wants.
 * This one has no memory (no hysteresis); use `createPositionChecker` on a live camera.
 */
export function checkPosition(points: readonly Point[], stageW: number, stageH: number): Check {
  return evaluatePosition(points, stageW, stageH, FRESH_MEMORY).check;
}

/** `checkPosition` for a live camera: it remembers the last verdict, so a face sitting on a threshold does not flicker between two. */
export function createPositionChecker() {
  let memory = FRESH_MEMORY;
  return {
    check(points: readonly Point[], stageW: number, stageH: number): Check {
      const r = evaluatePosition(points, stageW, stageH, memory);
      memory = r.memory;
      return r.check;
    },
    /** Forget the last verdict, for example when the face is lost. */
    reset() { memory = FRESH_MEMORY; },
  };
}

/**
 * Landmarks (0 to 1 over the video frame, as MediaPipe gives them) to stage pixels, the way the preview shows them: the video is
 * scaled to cover the stage (object-cover, centered), then mirrored left to right like the preview. A landmark on the left of the
 * video therefore lands on the right of the stage. Everything else in the guide works in these display coordinates.
 */
export function toStagePoints(
  landmarks: readonly Point[],
  video: { width: number; height: number },
  stage: { width: number; height: number },
  mirrored = true,
): Point[] {
  const scale = Math.max(stage.width / video.width, stage.height / video.height);
  const offX = (stage.width - video.width * scale) / 2, offY = (stage.height - video.height * scale) / 2;
  return landmarks.map((p) => {
    const x = offX + p.x * video.width * scale;
    return { x: mirrored ? stage.width - x : x, y: offY + p.y * video.height * scale };
  });
}

/**
 * What the capture button should do, from the guide. The three position problems block it; the rest leave it working:
 * - `outOfFrame`, `tooFar`, `offCenter`: blocked, in this order of priority (see `PositionProblem`).
 * - `caution`: light, glare or head angle is off. The button works; the result may be less accurate.
 * - `ready`: all good, or nothing is known (guide still loading or not working). The button works.
 */
export type CaptureAdvice = PositionProblem | 'caution' | 'ready';

/** Whether the advice is one of the three that block the capture button. */
export const isBlockingAdvice = (a: CaptureAdvice): a is PositionProblem => a === 'outOfFrame' || a === 'tooFar' || a === 'offCenter';

export type StatusTone = 'ok' | 'bad' | 'neutral';

export interface GuideVerdict {
  advice: CaptureAdvice;
  /** Green only for "Posisi sudah pas"; amber for anything blocked or cautioned; neutral when nothing is known yet. */
  tone: StatusTone;
  /**
   * The one message for the whole guide. It is the text on the status pill on the camera and also the text of the note that screen
   * readers get as the button's description, so the two are the same words by construction.
   */
  text: string;
}

/**
 * The single place that turns the checks into advice, tone and words. In order: a position problem (blocked); light, glare or head
 * angle (the warning "Hasil bisa kurang akurat", then the specific cause); green "Posisi sudah pas" when nothing at all is flagged
 * (so the face is close, centered, well lit and facing the camera); otherwise the general hint.
 */
export function guideVerdict(c: GuideChecks): GuideVerdict {
  const problem = c.position.problem;
  if (problem) return { advice: problem, tone: 'bad', text: PROBLEM_TEXT[problem] };
  const cause = [c.lighting, c.gaze].find((x) => x.state === 'bad');
  if (cause) return { advice: 'caution', tone: 'bad', text: cause.hint ? `${G.cautionNote}. ${cause.hint}` : G.cautionNote };
  if (allOk(c)) return { advice: 'ready', tone: 'ok', text: G.allGood };
  return { advice: 'ready', tone: 'neutral', text: G.hint };
}

export const captureAdvice = (c: GuideChecks): CaptureAdvice => guideVerdict(c).advice;
export const guideStatus = (c: GuideChecks): { tone: StatusTone; text: string } => {
  const { tone, text } = guideVerdict(c);
  return { tone, text };
};

export type GuideStatus = 'loading' | 'ready' | 'unavailable';

/**
 * What the guide reports upward to the camera: how it is doing, what the capture button should do (`advice`), and `message`, the
 * words on its status pill. The camera shows `message` again, visually hidden, as the button's description for screen readers.
 */
export interface GuideState { status: GuideStatus; advice: CaptureAdvice; message: string }

/** Before the guide runs (and again once it is gone): nothing known, so the button is not held back and there is nothing to say. */
export const INITIAL_GUIDE_STATE: GuideState = { status: 'loading', advice: 'ready', message: '' };

/** The guide only gets a say once its model runs. While it loads, or when it failed or is unsupported, the camera works as before. */
export function guideAdvice(status: GuideStatus, c: GuideChecks): CaptureAdvice {
  return status === 'ready' ? captureAdvice(c) : 'ready';
}

/** The status pill's tone and words for every state of the guide: nothing when it cannot run, "loading" while it starts. */
export function guideMessage(status: GuideStatus, c: GuideChecks): { tone: StatusTone; text: string } {
  if (status === 'unavailable') return { tone: 'neutral', text: '' };
  if (status === 'loading') return { tone: 'neutral', text: G.loading };
  return guideStatus(c);
}

export interface CaptureControl {
  /** The real `disabled` attribute: the camera is not ready yet, or the page is busy. */
  disabled: boolean;
  /** `aria-disabled`: the face is missing, far or off to the side. The button stays focusable and its description says why. */
  blocked: boolean;
  /** Whether a press should take the photo. */
  canCapture: boolean;
}

/**
 * `blockHeld` is whether the blocking advice has lasted long enough (a short delay, so a single missed detection does not flicker
 * the button). Coming back to fine is never delayed.
 */
export function captureControl(
  advice: CaptureAdvice,
  { camReady, disabled, blockHeld }: { camReady: boolean; disabled: boolean; blockHeld: boolean },
): CaptureControl {
  const off = !camReady || disabled;
  const blocked = !off && blockHeld && isBlockingAdvice(advice);
  return { disabled: off, blocked, canCapture: !off && !blocked };
}
