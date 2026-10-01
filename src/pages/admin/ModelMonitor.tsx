import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CLASS_META, type ModelStats } from '@acnevision/shared';
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
  const dist = data.class_distribution.map((d) => ({ ...d, label: CLASS_META[d.class].label, fill: CLASS_META[d.class].color }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Monitoring Model</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card"><p className="text-xs">Model deteksi</p><p className="font-semibold text-ink-900">{m.detection.name}</p><p className="text-sm">versi {m.detection.version}</p></div>
        <div className="card"><p className="text-xs">Model klasifikasi</p><p className="font-semibold text-ink-900">{m.classification.name}</p>
          <p className="text-sm">versi {m.classification.version}{m.classification.metrics?.test_accuracy != null && ` · akurasi test ${pct(m.classification.metrics.test_accuracy, 2)}`}</p></div>
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
        <section className="card"><h3 className="mb-3">Distribusi prediksi per kelas</h3>
          <div className="h-60"><ResponsiveContainer><BarChart data={dist}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
            <Bar dataKey="lesion_count" name="Jumlah lesi" radius={[4, 4, 0, 0]} fill="#2563EB" />
          </BarChart></ResponsiveContainer></div>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-600"><tr><th className="py-2">Kelas</th><th>Avg confidence</th><th>Low-conf</th></tr></thead>
            <tbody className="divide-y divide-border">{dist.map((d) => (
              <tr key={d.class}><td className="py-2"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: d.fill }} />{d.label}</td><td>{pct(d.avg_confidence, 1)}</td><td>{pct(d.low_conf_rate, 1)}</td></tr>
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
