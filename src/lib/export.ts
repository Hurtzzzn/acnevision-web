import { jsPDF } from 'jspdf';
import { CLASS_META, COPY, SEVERITY_META, type AcneClass, type AnalyzeResponse } from '@acnevision/shared';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draw the photo with bounding boxes onto a canvas (max side 1280px). */
export async function renderAnnotatedCanvas(src: string, analysis: AnalyzeResponse): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, c.width, c.height);
  g.font = `${Math.max(11, c.width / 60)}px Inter, sans-serif`;
  for (const l of analysis.lesions) {
    const color = CLASS_META[l.predicted_class].color;
    const x = l.bbox.x1 * c.width, y = l.bbox.y1 * c.height;
    const w = (l.bbox.x2 - l.bbox.x1) * c.width, h = (l.bbox.y2 - l.bbox.y1) * c.height;
    g.strokeStyle = color; g.lineWidth = 2;
    g.setLineDash(l.is_low_confidence ? [5, 4] : []);
    g.strokeRect(x, y, w, h);
    const label = `${l.predicted_class} ${Math.round(l.class_confidence * 100)}%`;
    const tw = g.measureText(label).width + 6;
    g.setLineDash([]);
    g.fillStyle = color; g.fillRect(x, y - 16, tw, 16);
    g.fillStyle = '#fff'; g.fillText(label, x + 3, y - 4);
  }
  return c;
}

function download(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

export async function downloadPng(src: string, analysis: AnalyzeResponse) {
  const c = await renderAnnotatedCanvas(src, analysis);
  download(c.toDataURL('image/png'), 'acnevision-hasil.png');
}

export async function downloadPdf(src: string, analysis: AnalyzeResponse) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const c = await renderAnnotatedCanvas(src, analysis);
  let y = 18;
  doc.setFontSize(18); doc.text('AcneVision AI - Ringkasan Analisis', 15, y); y += 8;
  doc.setFontSize(10); doc.setTextColor(100); doc.text(new Date().toLocaleString('id-ID'), 15, y); y += 8;

  const maxW = 90, ratio = c.height / c.width, imgH = Math.min(120, maxW * ratio), imgW = imgH / ratio;
  doc.addImage(c.toDataURL('image/jpeg', 0.85), 'JPEG', 15, y, imgW, imgH);

  const s = analysis.summary;
  let ty = y + 4;
  doc.setTextColor(0); doc.setFontSize(11);
  const rows: string[] = [
    `Total lesi: ${s.total_lesions}`,
    `Estimasi keparahan: ${SEVERITY_META[s.severity].label}`,
    `Rata-rata confidence: ${s.avg_confidence == null ? '-' : Math.round(s.avg_confidence * 100) + '%'}`,
    `Waktu analisis: ${analysis.timing_ms.total} ms`,
    '',
    ...(Object.keys(CLASS_META) as AcneClass[]).map((k) => `${CLASS_META[k].label} (${k}): ${s.class_counts[k]}`),
  ];
  for (const r of rows) { doc.text(r, 15 + imgW + 8, ty); ty += 6; }

  y += imgH + 10;
  doc.setFontSize(9); doc.setTextColor(185, 28, 28);
  doc.text(doc.splitTextToSize(COPY.disclaimer, 180), 15, y);
  doc.save('acnevision-ringkasan.pdf');
}
