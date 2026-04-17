import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { statusConfig, priorityConfig, materiaConfig, timeAgo } from '../../utils';
import { AlertTriangle, Clock, TrendingUp, Users, FolderOpen, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const MATERIA_COLORS: Record<string, string> = {
  laboral: '#1B3A6B', salud: '#F5900A', consumidor: '#6366F1',
  accidente: '#10B981', sucesion: '#F59E0B', familia: '#EF4444',
  previsional: '#8B5CF6', civil: '#6B7280',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.cases.list({ limit: '50' }).catch(() => ({ data: [] })),
      api.alerts.list().catch(() => []),
    ]).then(([casesRes, alertsRes]) => {
      setCases((casesRes as any).data ?? []);
      setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
    }).finally(() => setLoading(false));
  }, []);

  const urgentes = cases.filter(c => c.isUrgent && c.status !== 'cerrado');
  const dormidos = cases.filter(c => c.isDormant);
  const sinAsignar = cases.filter(c => !c.assignedLawyerId && c.status !== 'cerrado');
  const activos = cases.filter(c => !['cerrado', 'archivado'].includes(c.status));

  // Estadísticas por materia
  const materiaCounts = cases.reduce((acc: Record<string, number>, c) => {
    acc[c.materia] = (acc[c.materia] || 0) + 1;
    return acc;
  }, {});
  const materiaStats = Object.entries(materiaCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: MATERIA_COLORS[name] || '#6B7280',
  }));

  const stats = [
    { label: 'Casos activos',        value: activos.length,      sub: 'en gestión',              icon: FolderOpen,    color: 'text-navy-600',  bg: 'bg-navy-50' },
    { label: 'Urgentes',             value: urgentes.length,     sub: 'requieren acción',        icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50' },
    { label: 'Expedientes dormidos', value: dormidos.length,     sub: 'sin actividad >7d',       icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Sin asignar',          value: sinAsignar.length,   sub: 'pendientes de abogado',   icon: Users,         color: 'text-orange-600',bg: 'bg-orange-50' },
    { label: 'Alertas activas',      value: alerts.filter((a: any) => !a.resolved).length, sub: 'sin resolver', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total casos',          value: cases.length,        sub: 'en el sistema',           icon: TrendingUp,    color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const alertTypeColor: Record<string, string> = {
    dormido: 'bg-amber-400', vencimiento: 'bg-purple-500',
    sin_asignar: 'bg-orange-500', tarea_vencida: 'bg-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon size={16} className={s.color} strokeWidth={2} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>
                {loading ? <span className="inline-block w-6 h-6 rounded bg-gray-100 animate-pulse" /> : s.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
            </div>
            <div className="text-xs font-medium text-gray-700">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Casos recientes */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Casos recientes</h2>
            <button onClick={() => navigate('/casos')} className="text-xs text-navy-600 font-medium hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))
            ) : cases.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No hay casos aún. Los casos llegarán desde MisReclamos Intake.
              </div>
            ) : (
              cases.slice(0, 5).map(c => {
                const sc = statusConfig[c.status as keyof typeof statusConfig] ?? { label: c.status, bg: 'bg-gray-50', color: 'text-gray-600' };
                const pc = priorityConfig[c.priority as keyof typeof priorityConfig] ?? { dot: 'bg-gray-400' };
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/casos/${c.id}`)}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-400">{c.caseId}</span>
                        {c.isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">URGENTE</span>}
                        {c.isDormant && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">DORMIDO</span>}
                      </div>
                      <p className="text-sm text-gray-800 font-medium truncate mt-0.5 group-hover:text-navy-600 transition-colors">{c.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-gray-400">{materiaConfig[c.materia as keyof typeof materiaConfig]?.label ?? c.materia}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-[11px] text-gray-400">{c.assignedLawyer?.name ?? 'Sin asignar'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(c.lastActivity)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Por materia</h2>
            {materiaStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={materiaStats} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, padding: '4px 10px' }} formatter={(v: any) => [`${v} casos`, '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {materiaStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">Sin datos aún</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Alertas activas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Alertas activas</h2>
            <button onClick={() => navigate('/alertas')} className="text-xs text-navy-600 font-medium hover:underline flex items-center gap-1">Ver todas <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.filter((a: any) => !a.resolved).slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alertTypeColor[a.type] ?? 'bg-gray-400'}`} />
                <p className="flex-1 text-xs text-gray-700">{a.message}</p>
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
            {!loading && alerts.filter((a: any) => !a.resolved).length === 0 && (
              <div className="px-5 py-6 text-center text-sm text-gray-400">Sin alertas activas</div>
            )}
          </div>
        </div>
      </div>

      {/* Legal Intelligence panel */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-700 rounded-xl p-5 flex items-center gap-5">
        <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center shrink-0">
          <Zap size={20} className="text-brand-orange" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">Legal Intelligence</h3>
          <p className="text-navy-200 text-xs mt-0.5">Analizá documentos, generá escritos y consultá sobre expedientes con IA jurídica especializada.</p>
        </div>
        <a href="https://www.nivel41.uk/" target="_blank" rel="noopener noreferrer" className="shrink-0 px-4 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors">
          Abrir asistente
        </a>
      </div>
    </div>
  );
}
