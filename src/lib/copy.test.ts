import { describe, expect, it } from 'vitest';
import { COPY } from '@acnevision/shared';

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe('UI copy', () => {
  it('uses a comma as the decimal separator', () => {
    expect(COPY.result.timeValue(600)).toBe('0,6 detik');
    expect(COPY.result.timeValue(1250)).toBe('1,3 detik');
    expect(COPY.result.timeValue(2000)).toBe('2,0 detik');
  });

  it('has no long dashes (em or en dash) in any text', () => {
    const offenders = strings(COPY).filter((s) => /[\u2013\u2014]/.test(s));
    expect(offenders).toEqual([]);
  });

  it('names no lesion types, fixed model names, or "clean skin" claims', () => {
    const all = strings(COPY).join(' | ');
    // "non-komedogenik" is a product term, not a lesion type, so only the lesion words are listed
    expect(all).not.toMatch(/blackhead|whitehead|papule|pustule|cyst|komedo (hitam|putih)|papula|pustula|kista|yolo|mobilenet|resnet|efficientnet/i);
    expect(all).not.toMatch(/5 jenis|lima jenis|5 kelas|kulit bersih|kulit sehat|diagnosis(?! medis)/i);
  });

  it('mentions no course project and no demo mode in visible text', () => {
    // auth.demoNote is only rendered in dev builds with the mock backend (see DemoHint in Auth.tsx)
    const visible = strings({ ...COPY, auth: { ...COPY.auth, demoNote: '' } }).join(' | ');
    expect(visible).not.toMatch(/mata kuliah|proyek kuliah|project teknologi informasi|mode demo|demo/i);
    expect(COPY.footer).not.toHaveProperty('project');
    expect(COPY.footer).not.toHaveProperty('demoNote');
  });

  it('describes how it works in five Indonesian steps that match the home summary', () => {
    expect(COPY.howItWorks.title).toBe('Cara Kerja');
    expect(COPY.howItWorks.steps).toHaveLength(5);
    // the three home steps are the first three detail steps, in the same order
    COPY.home.steps.forEach((step, i) => {
      const detail = COPY.howItWorks.steps[i];
      expect(detail.title.split(' ')[0]).toBe(step.title.split(' ')[0]);
    });
    expect(Object.keys(COPY.howItWorks.severityText)).toEqual(['mild', 'moderate', 'severe', 'very_severe']);
  });

  it('keeps the chat placeholder short enough for a phone input', () => {
    expect(COPY.chat.placeholder.length).toBeLessThanOrEqual(28);
  });
});
