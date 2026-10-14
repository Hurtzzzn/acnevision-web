import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { COPY, SEVERITY_META } from '@acnevision/shared';
import { DEMO_LESIONS, DEMO_LESION_COUNT, DEMO_SEVERITY, lesionsInZoom, zoomPoint } from './demoLesions';
import { HeroVisual } from '../components/home/HeroVisual';
import { DetectStepVisual, ResultStepVisual } from '../components/home/StepVisuals';

const boxes = (html: string) => (html.match(/data-lesion-box/g) ?? []).length;

describe('Home sample data', () => {
  it('has numbered lesions 1..N with coordinates inside the photo and an estimate that follows from the count', () => {
    expect(DEMO_LESIONS.map((l) => l.n)).toEqual(DEMO_LESIONS.map((_, i) => i + 1));
    DEMO_LESIONS.forEach((l) => {
      expect(l.x).toBeGreaterThan(0);
      expect(l.x).toBeLessThan(1);
      expect(l.y).toBeGreaterThan(0);
      expect(l.y).toBeLessThan(1);
    });
    expect(DEMO_LESION_COUNT).toBe(7);
    expect(DEMO_SEVERITY).toBe('moderate');
  });

  it('maps a point to the same place in the frame when the crop is the whole photo', () => {
    const whole = { scale: 1, cx: 0.5, cy: 0.5, aspect: 1145 / 1158 };
    const p = zoomPoint(whole, 0.618, 0.465);
    expect(p.x).toBeCloseTo(61.8, 5);
    expect(p.y).toBeCloseTo(46.5, 5);
  });

  it('draws as many hero boxes as the lesion count in the chip', () => {
    const html = renderToStaticMarkup(<HeroVisual />);
    expect(boxes(html)).toBe(DEMO_LESION_COUNT);
    expect(html).toContain(COPY.home.preview.lesions(DEMO_LESION_COUNT));
    expect(html).toContain(SEVERITY_META[DEMO_SEVERITY].label);
  });

  it('labels the cheek close-up with the boxes it really shows, out of the total', () => {
    const html = renderToStaticMarkup(<DetectStepVisual />);
    const shown = boxes(html);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(DEMO_LESION_COUNT);
    expect(html).toContain(COPY.home.preview.lesionsPartial(shown, DEMO_LESION_COUNT));
    expect(lesionsInZoom({ scale: 2.6, cx: 0.59, cy: 0.475, aspect: 1.6 })).toHaveLength(shown);
  });

  it('shows the same total in the step 3 result card', () => {
    const html = renderToStaticMarkup(<ResultStepVisual />);
    expect(html).toContain(`>${DEMO_LESION_COUNT}</span>`);
  });
});
