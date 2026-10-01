import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UsageStats } from '@acnevision/shared';
import { api } from '../../lib/runtime';
import { errMessage } from '../../lib/errors';
import { ErrorBox, Spinner } from '../../components/ui';
import { useAdminRange } from './AdminLayout';

export function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 md:p-4">
      <p className="text-xs text-ink-600">{label}</p>
      <p className="text-2xl font-bold text-ink-900">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</p>
    </div>
  );
}

export default function Dashboard() {
  const range = useAdminRange();
  const [data, setData] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(null);
    api.adminUsage(range).then(setData).catch((e) => setError(errMessage(e)));
  }, [range]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Memuat..." />;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard Tren Pemakaian</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Total Scan" value={t.scans} /><Kpi label="Scan Guest" value={t.guest_scans} /><Kpi label="Scan User" value={t.user_scans} />
        <Kpi label="User Terdaftar" value={t.registered_users} /><Kpi label="User Baru" value={t.new_users} /><Kpi label="User Aktif" value={t.active_users} />
      </div>
      <section className="card">
        <h3 className="mb-3">Scan per periode</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={data.series}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="guest_scans" name="Guest" stroke="#94A3B8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="user_scans" name="User" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card">
        <h3 className="mb-3">User baru per periode</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data.series}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip />
              <Bar dataKey="new_users" name="User baru" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
