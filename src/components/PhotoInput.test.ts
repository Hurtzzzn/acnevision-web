import { describe, expect, it } from 'vitest';
import { COPY } from '@acnevision/shared';
import source from './PhotoInput.tsx?raw';
import faceGuideSource from './FaceGuide.tsx?raw';

// The vitest environment is node (no DOM), so the components themselves are not rendered. These guard the wiring (accessibility, the
// hidden description, the delay, the crop, the oval), whose rules are tested in lib/faceGuide.test.ts and lib/capture.test.ts.
describe('PhotoInput capture button wiring', () => {
  it('uses aria-disabled (still focusable) for the guide, and the real disabled attribute only for camera-not-ready or busy', () => {
    expect(source).toMatch(/aria-disabled=\{control\.blocked \|\| undefined\}/);
    expect(source).toMatch(/disabled=\{control\.disabled\}/);
  });

  it('ignores clicks and Enter while it is blocked (aria-disabled does not stop them by itself)', () => {
    expect(source).toMatch(/if \(!control\.canCapture\) return;/);
  });

  it('is dimmed while blocked, with no hover or press effect', () => {
    expect(source).toMatch(/control\.blocked \? 'cursor-not-allowed opacity-50 hover:bg-primary-600 motion-safe:active:scale-100'/);
  });

  it('switches off only after a short delay, so one bad frame does not flicker it, and comes back at once', () => {
    expect(source).toMatch(/useDelayedTrue\(isBlockingAdvice\(guide\.advice\), BLOCK_DELAY_MS\)/);
    expect(source).toMatch(/BLOCK_DELAY_MS = 300/);
    expect(source).toMatch(/captureControl\(guide\.advice, \{ camReady, disabled, blockHeld \}\)/);
  });

  it('lets the guide block nothing while it loads or cannot run (its advice is then "ready")', () => {
    expect(faceGuideSource).toMatch(/guideAdvice\(status, checks\)/);
  });
});

describe('the status pill and the hidden description', () => {
  it('shows no note under the button: it is visually hidden (sr-only) but keeps role="status" and the button points to it', () => {
    expect(source).toMatch(/<p id=\{noteId\} role="status" className="sr-only">\{guide\.message\}<\/p>/);
    expect(source).toMatch(/aria-describedby=\{noteId\}/);
    expect(source).not.toMatch(/NOTE_COPY/);
    expect(source).not.toMatch(/COPY\.scan\.guide\[/); // no second place that picks words for the note
  });

  it('takes the words from the guide, which reports exactly what its pill says', () => {
    expect(faceGuideSource).toMatch(/const message = guideMessage\(status, checks\);/);
    expect(faceGuideSource).toMatch(/onStateRef\.current\(\{ status, advice, message: message\.text \}\)/);
    expect(faceGuideSource).toMatch(/<span>\{message\.text\}<\/span>/);
    expect(faceGuideSource).toMatch(/>\{message\.text\}<\/p>/); // the loading pill
  });

  it('keeps one announcement, not two: the pill is aria-hidden and the guide has no live region of its own', () => {
    expect(faceGuideSource).not.toMatch(/aria-live/);
    expect(faceGuideSource).not.toMatch(/role="status"/);
    expect(faceGuideSource.match(/<p aria-hidden/g)).toHaveLength(2); // the loading pill and the status pill
  });

  it('colors the oval from the same message: green for "pas", yellow for anything blocked or cautioned (even no face), white while unknown', () => {
    expect(faceGuideSource).toMatch(/message\.tone === 'ok'/);
    expect(faceGuideSource).toMatch(/message\.tone === 'bad'/);
    expect(faceGuideSource).toMatch(/border-green-500/);
    expect(faceGuideSource).toMatch(/border-amber-400/);
  });

  it('has the words the product asked for', () => {
    expect(COPY.scan.guide.outOfFrame).toBe('Geser wajahmu ke dalam bingkai');
    expect(COPY.scan.guide.tooFar).toBe('Dekatkan wajah sampai pipi dan dahi memenuhi layar');
    expect(COPY.scan.guide.offCenter).toBe('Geser wajahmu ke tengah bingkai');
    expect(COPY.scan.guide.cautionNote).toBe('Hasil bisa kurang akurat');
    expect(COPY.scan.guide.allGood).toBe('Posisi sudah pas, diam sebentar lalu ambil foto');
  });
});

describe('PhotoInput photo and oval', () => {
  it('sends what the stage shows (not a crop to the oval)', () => {
    expect(source).toMatch(/visibleCropRect\(video,/);
    expect(source).not.toMatch(/ovalCropRect/);
  });

  it('leaves no diagnostic logging behind, and still takes the photo with the visible-area crop', () => {
    expect(source).not.toMatch(/console\./);
    expect(source).not.toMatch(/\[capture\]|TODO: remove/);
    expect(source).toMatch(/frameToBlob\(video, \{ mirrored: true, crop \}\)/);
  });

  it('draws both ovals from the one size constant, not a hard-coded 70%', () => {
    for (const src of [source, faceGuideSource]) {
      expect(src).toMatch(/OVAL_HEIGHT_PERCENT/);
      expect(src).not.toMatch(/h-\[70%\]/);
    }
  });
});

describe('FaceGuide wiring', () => {
  it('judges the face in the same mirrored stage pixels the preview shows, through the shared mapping', () => {
    expect(faceGuideSource).toMatch(/toStagePoints\(face,/);
    expect(faceGuideSource).not.toMatch(/cw - \(offX/); // no second, hand-written mirror to drift out of step
  });

  it('keeps the position verdict between frames (hysteresis) and forgets it when the face is lost', () => {
    expect(faceGuideSource).toMatch(/createPositionChecker\(\)/);
    expect(faceGuideSource).toMatch(/position\.check\(pts, cw, ch\)/);
    expect(faceGuideSource).toMatch(/position\.reset\(\)/);
  });

  it('forgets what it reported when it goes away, so a stale "blocked" cannot linger', () => {
    expect(faceGuideSource).toMatch(/onStateRef\.current\(INITIAL_GUIDE_STATE\)/);
  });
});
