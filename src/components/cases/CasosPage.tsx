import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { statusConfig, priorityConfig, materiaConfig, formatDate, timeAgo } from '../../utils';
import { Search, Plus, ChevronDown, AlertTriangle, Clock, UserCheck, ArrowUpDown } from 'lucide-react';

const ALL = '__all__';

export default function CasosPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [materia, setMateria] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [priority, setPriority] = useState<string>(ALL);

  useEffect(() => {
    api.cases.list({ limit: '200' })
      .then(res => setCases((res as any).data ?? []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.caseId.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.client?.name ?? '').toLowerCase().includes(q) ||
      (c.assignedLawyer?.name ?? '').toLowerCase().includes(q);
    const matchMateria = materia === ALL || c.materia === materia;
    const matchStatus = status === ALL || c.status === status;
    const matchPriority = priority === ALL || c.priority === priority;
    return matchSearch && matchMateria && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ID, cliente, abogado..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-400"
          />
        </div>

        {[
          {
            label: 'Materia', value: materia, set: setMateria,
            options: [{ v: ALL, l: 'Todas las materias' }, ...Object.entries(materiaConfig).map(([v, c]) => ({ v, l: c.label }))],
          },
          {
            label: 'Estado', value: status, set: setStatus,
            options: [{ v: ALL, l: 'Todos los estados' }, ...Object.entries(statusConfig).map(([v, c]) => ({ v, l: c.label }))],
          },
          {
            label: 'Prioridad', value: priority, set: setPriority,
            options: [{ v: ALL, l: 'Toda prioridad' }, { v: 'urgente', l: 'Urgente' }, { v: 'alta', l: 'Alta' }, { v: 'media', l: 'Media' }, { v: 'baja', l: 'Baja' }],
          },
        ].map(f => (
          <div key={f.label} className="relative">
            <select
              value={f.value}
              onChange={e => f.set(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy-600/20 cursor-pointer"
            >
              {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">{filtered.length} caso{filtered.length !== 1 ? 's' : ''}</span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors">
            <Plus size={14} strokeWidth={2.5} /> Nuevo caso
          </button>
        </div>
      </div>

      {/* Quick filters pills */}
      <div className="flex gap-2">
        {[
          { label: 'Urgentes',   icon: AlertTriangle, count: cases.filter(c => c.isUrgent).length,            color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
          { label: 'Dormidos',   icon: Clock,         count: cases.filter(c => c.isDormant).length,           color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
          { label: 'Sin asignar',icon: UserCheck,     count: cases.filter(c => !c.assignedLawyerId).length,   color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
        ].map(p => (
          <button key={p.label} className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border rounded-full transition-colors ${p.color}`}>
            <p.icon size={11} />
            {p.label} ({p.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['ID / Título', 'Materia', 'Estado', 'Prioridad', 'Abogado', 'Última actividad', 'Próxima acción'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider first:pl-5">
                  <span className="flex items-center gap-1">{h} {h === 'ID / Título' && <ArrowUpDown size={10} />}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-5 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.map(c => {
              const sc = statusConfig[c.status as keyof typeof statusConfig] ?? { label: c.status, bg: 'bg-gray-50', color: 'text-gray-600' };
              const pc = priorityConfig[c.priority as keyof typeof priorityConfig] ?? { dot: 'bg-gray-400', color: 'text-gray-600', label: c.priority };
              const mc = materiaConfig[c.materia as keyof typeof materiaConfig] ?? { icon: '', label: c.materia };
              return (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/casos/${c.id}`)}
                  className="hover:bg-navy-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pc.dot}`} />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[10px] text-gray-400">{c.caseId}</span>
                          {c.isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 rounded-full">URGENTE</span>}
                          {c.isDormant && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 rounded-full">DORMIDO</span>}
                        </div>
                        <p className="font-medium text-gray-800 max-w-xs group-hover:text-navy-600 transition-colors line-clamp-1">{c.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{c.client?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700">{mc.icon} {mc.label}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.subtype}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.stage}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold ${pc.color}`}>{pc.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.assignedLawyer ? (
                      <span className="text-xs text-gray-700">{c.assignedLawyer.name}</span>
                    ) : (
                      <span className="text-xs text-orange-500 font-medium">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{timeAgo(c.lastActivity)}</span>
                    <p className="text-[10px] text-gray-400">{formatDate(c.lastActivity)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.nextAction ? (
                      <>
                        <p className="text-xs text-gray-700 max-w-[160px] line-clamp-1">{c.nextAction}</p>
                        {c.nextActionDate && <p className="text-[10px] text-gray-400">{formatDate(c.nextActionDate)}</p>}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            {cases.length === 0 ? 'No hay casos aún. Los casos llegarán desde MisReclamos Intake.' : 'No se encontraron casos con esos filtros.'}
          </div>
        )}
      </div>
    </div>
  );
}
