import { mockCases, mockUsers } from '../../data/mockData';
import { statusConfig, priorityConfig, materiaConfig, timeAgo } from '../../utils';
import { AlertTriangle, Clock, TrendingUp, Users, FolderOpen, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const materiaStats = [
  { name: 'Laboral',    value: 34, color: '#1B3A6B' },
  { name: 'Salud',      value: 22, color: '#F5900A' },
  { name: 'Consumidor', value: 18, color: '#6366F1' },
  { name: 'Accidentes', value: 14, color: '#10B981' },
  { name: 'Sucesión',   value: 8,  color: '#F59E0B' },
  { name: 'Familia',    value: 6,  color: '#EF4444' },
];

const weekActivity = [
  { day: 'Lun', casos: 4 }, { day: 'Mar', casos: 7 }, { day: 'Mié', casos: 5 },
  { day: 'Jue', casos: 9 }, { day: 'Vie', casos: 6 }, { day: 'Sáb', casos: 2 }, { day: 'Hoy', casos: 3 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const urgentes = mockCases.filter(c => c.isUrgent);
  const dormidos = mockCases.filter(c => c.isDormant);
  const sinAsignar = mockCases.filter(c => !c.assignedLawyer);

  const stats = [
    { label: 'Casos activos',       value: 47,  sub: '+3 hoy',          icon: FolderOpen,    color: 'text-navy-600',  bg: 'bg-navy-50' },
    { label: 'Urgentes',            value: urgentes.length, sub: 'requieren acción',icon: AlertTriangle, color: 'text-red-600',  bg: 'bg-red-50' },
    { label: 'Expedientes dormidos',value: dormidos.length, sub: 'sin actividad >7d',icon: Clock,         color: 'text-amber-600',bg: 'bg-amber-50' },
    { label: 'Sin asignar',         value: sinAsignar.length,sub: 'pendientes de abogado',icon: Users,   color: 'text-orange-600',bg: 'bg-orange-50' },
    { label: 'Tareas vencidas',     value: 5,   sub: 'de 23 pendientes', icon: CheckCircle2,  color: 'text-purple-600',bg: 'bg-purple-50' },
    { label: 'Cerrados este mes',   value: 12,  sub: '↑ 20% vs anterior',icon: TrendingUp,    color: 'text-green-600', bg: 'bg-green-50' },
  ];

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
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
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
            {mockCases.slice(0, 5).map(c => {
              const sc = statusConfig[c.status];
              const pc = priorityConfig[c.priority];
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/casos/${c.id}`)}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  {/* Priority dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400">{c.caseId}</span>
                      {c.isUrgent && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">URGENTE</span>
                      )}
                      {c.isDormant && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">DORMIDO</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 font-medium truncate mt-0.5 group-hover:text-navy-600 transition-colors">{c.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-gray-400">{materiaConfig[c.materia].label}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[11px] text-gray-400">{c.assignedLawyer ?? 'Sin asignar'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(c.lastActivity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Distribución por materia */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Por materia</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={materiaStats} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, padding: '4px 10px' }}
                  formatter={(v: any) => [`${v} casos`, '']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {materiaStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Actividad semanal */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Actividad semanal</h2>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={weekActivity}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, padding: '4px 10px' }} />
                <Bar dataKey="casos" fill="#1B3A6B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Abogados - carga */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Carga por abogado</h2>
          <div className="space-y-3">
            {mockUsers.filter(u => u.role.startsWith('abogado')).map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 text-[10px] font-bold shrink-0">
                  {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate">{u.name}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">{u.activeCases} casos</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((u.activeCases / 20) * 100, 100)}%`,
                        backgroundColor: u.activeCases > 12 ? '#EF4444' : u.activeCases > 8 ? '#F5900A' : '#1B3A6B',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas rápidas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Alertas activas</h2>
            <button onClick={() => navigate('/alertas')} className="text-xs text-navy-600 font-medium hover:underline flex items-center gap-1">Ver todas <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { type: 'urgente', text: 'MR-2024-00418 — Caso familiar urgente sin asignar', time: 'Hace 2h', color: 'bg-red-500' },
              { type: 'dormido', text: 'MR-2024-00198 — Sin actividad hace 13 días', time: 'Hace 13d', color: 'bg-amber-400' },
              { type: 'dormido', text: 'MR-2024-00355 — Sin actividad hace 20 días', time: 'Hace 20d', color: 'bg-amber-400' },
              { type: 'vencida', text: 'MR-2024-00412 — Tarea: Asignar abogado vencida', time: 'Hoy', color: 'bg-orange-500' },
              { type: 'cautelar', text: 'MR-2024-00287 — Vence seguimiento cautelar mañana', time: 'Mañana', color: 'bg-purple-500' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer">
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.color}`} />
                <p className="flex-1 text-xs text-gray-700">{a.text}</p>
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{a.time}</span>
              </div>
            ))}
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
        <button className="shrink-0 px-4 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors">
          Abrir asistente
        </button>
      </div>
    </div>
  );
}
