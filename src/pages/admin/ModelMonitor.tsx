import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SEVERITY_META, SEVERITY_ORDER, type ModelStats } from '@acnevision/shared';
import { api } from '../../lib/runtime';
import { errMessage, pct } from '../../lib/errors';
import { ErrorBox, Spinner } from '../../components/ui';
import { useAdminRange } from './AdminLayout';
import { Kpi } from './Dashboard';

export default function ModelMonitor() {
  const range = useAdminRange();
  const [data, setData] = useState<ModelStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(null);
    api.adminModel(range).then(setData).catch((e) => setError(errMessage(e)));
  }, [range]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Memuat..." />;
  const s = data.summary, m = data.active_models;
  // Fixed severity order; a level the API left out counts as zero.
  const dist = SEVERITY_ORDER.map((severity) => {
    const row = data.severity_distribution.find((d) => d.severity === severity);
    return { severity, label: SEVERITY_META[severity].label, fill: SEVERITY_META[severity].solid, scan_count: row?.scan_count ?? 0, avg_confidence: row?.avg_confidence ?? null, low_conf_rate: row?.low_conf_rate ?? null };
  });
  const f1 = m.classification.metrics?.macro_f1, acc = m.classification.metrics?.accuracy;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Monitoring Model</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card"><p className="text-xs">Model deteksi</p><p className="font-semibold text-ink-900">{m.detection.name}</p><p className="text-sm">versi {m.detection.version}</p></div>
        <div className="card"><p className="text-xs">Model klasifikasi</p><p className="font-semibold text-ink-900">{m.classification.name}</p>
          <p className="text-sm">versi {m.classification.version}</p>
          {(f1 != null || acc != null) && (
            <p className="text-sm">
              {f1 != null && `macro-F1 ${pct(f1, 1)}`}{f1 != null && acc != null && ' · '}{acc != null && `akurasi 4 kelas ${pct(acc, 1)}`}
            </p>
          )}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Rata-rata latency" value={`${Math.round(s.avg_total_ms)} ms`} /><Kpi label="p95 latency" value={`${Math.round(s.p95_total_ms)} ms`} />
        <Kpi label="Error rate" value={pct(s.error_rate, 1)} /><Kpi label="No-lesion rate" value={pct(s.no_lesion_rate, 1)} /><Kpi label="Low-confidence rate" value={pct(s.low_confidence_rate, 1)} />
      </div>

      <section className="card"><h3 className="mb-3">Latency per periode (ms)</h3>
        <div className="h-72"><ResponsiveContainer><LineChart data={data.series}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
          <Line dataKey="avg_detection_ms" name="Deteksi" stroke="#F97316" dot={false} strokeWidth={2} />
          <Line dataKey="avg_classification_ms" name="Klasifikasi" stroke="#0EA5E9" dot={false} strokeWidth={2} />
          <Line dataKey="avg_total_ms" name="Total" stroke="#2563EB" dot={false} strokeWidth={2} />
        </LineChart></ResponsiveContainer></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card"><h3 className="mb-3">Distribusi prediksi per tingkat keparahan</h3>
          <div className="h-60"><ResponsiveContainer><BarChart data={dist}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
            <Bar dataKey="scan_count" name="Jumlah scan" radius={[4, 4, 0, 0]} fill="#2563EB">
              {dist.map((d) => <Cell key={d.severity} fill={d.fill} />)}
            </Bar>
          </BarChart></ResponsiveContainer></div>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-600"><tr><th className="py-2">Tingkat</th><th>Avg confidence</th><th>Low-conf</th></tr></thead>
            <tbody className="divide-y divide-border">{dist.map((d) => (
              <tr key={d.severity}><td className="py-2"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: d.fill }} aria-hidden />{d.label}</td><td>{pct(d.avg_confidence, 1)}</td><td>{pct(d.low_conf_rate, 1)}</td></tr>
            ))}</tbody>
          </table>
        </section>

        <section className="card"><h3 className="mb-3">Low-confidence rate &amp; avg confidence (indikator drift)</h3>
          <div className="h-72"><ResponsiveContainer><LineChart data={data.series}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => pct(v, 1)} /><Legend />
            <ReferenceLine y={0.2} stroke="#DC2626" strokeDasharray="5 4" label={{ value: 'Ambang 20%', fontSize: 11, fill: '#DC2626', position: 'insideTopRight' }} />
            <Line dataKey="low_confidence_rate" name="Low-confidence rate" stroke="#F59E0B" dot={false} strokeWidth={2} />
            <Line dataKey="avg_confidence" name="Avg confidence" stroke="#16A34A" dot={false} strokeWidth={2} />
          </LineChart></ResponsiveContainer></div>
        </section>
      </div>
    </div>
  );
}
