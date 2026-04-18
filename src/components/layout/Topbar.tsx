import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/casos': 'Bandeja de casos',
  '/alertas': 'Panel de alertas',
  '/agenda': 'Agenda y tareas',
  '/asignaciones': 'Panel de asignaciones',
  '/documentos': 'Documentos',
  '/admin': 'Administración',
};

const TYPE_SHORT: Record<string, string> = {
  dormido: 'Dormido',
  tarea_vencida: 'Tarea venc.',
  tarea_proxima: 'Tarea próx.',
  sin_asignar: 'Sin asignar',
  vencimiento_proximo: '48h',
  urgente: 'Urgente',
  documento_pendiente: 'Documentación',
};

function truncate(s: string, max = 64) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = titles[location.pathname] ?? 'CaseOps';

  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadAlerts = () => {
    setLoadingAlerts(true);
    api.alerts
      .list()
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false));
  };

  useEffect(() => {
    loadAlerts();
  }, [location.pathname]);

  useEffect(() => {
    if (!bellOpen) return;
    const close = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [bellOpen]);

  useEffect(() => {
    if (bellOpen) loadAlerts();
  }, [bellOpen]);

  const count = alerts.length;

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar caso, cliente, ID..."
          className="w-64 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-400 transition-all"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-200 px-1 rounded">⌘K</kbd>
      </div>

      <button
        type="button"
        onClick={() => navigate('/casos')}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors shadow-sm shrink-0"
      >
        <Plus size={14} strokeWidth={2.5} />
        Nuevo caso
      </button>

      <div className="relative shrink-0" ref={bellRef}>
        <button
          type="button"
          onClick={() => setBellOpen((o) => !o)}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-expanded={bellOpen}
          aria-label={`Alertas${count > 0 ? ` (${count})` : ''}`}
        >
          <Bell size={16} className="text-gray-600" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full border border-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        {bellOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-[min(100vw-2rem,18rem)] rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden"
            role="dialog"
            aria-label="Alertas recientes"
          >
            <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Alertas</span>
              {count > 0 && (
                <span className="text-[10px] font-bold text-navy-600 tabular-nums">{count}</span>
              )}
            </div>

            <div className="max-h-[min(60vh,16rem)] overflow-y-auto">
              {loadingAlerts && alerts.length === 0 ? (
                <p className="px-2.5 py-4 text-center text-[11px] text-gray-400">Cargando…</p>
              ) : count === 0 ? (
                <p className="px-2.5 py-4 text-center text-[11px] text-gray-400">Sin alertas activas</p>
              ) : (
                <ul className="py-0.5">
                  {alerts.slice(0, 12).map((a) => {
                    const label = TYPE_SHORT[a.type] ?? a.type;
                    const hasCase = Boolean(a.case?.id);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          disabled={!hasCase}
                          onClick={() => {
                            if (hasCase) {
                              navigate(`/casos/${a.case.id}`);
                              setBellOpen(false);
                            }
                          }}
                          className={`w-full text-left px-2.5 py-1.5 border-b border-gray-50 last:border-0 transition-colors ${
                            hasCase ? 'hover:bg-navy-50 cursor-pointer' : 'opacity-90 cursor-default'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <span
                              className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${
                                a.type === 'tarea_vencida'
                                  ? 'bg-purple-500'
                                  : a.type === 'tarea_proxima'
                                    ? 'bg-teal-500'
                                    : a.type === 'dormido'
                                      ? 'bg-amber-400'
                                      : a.type === 'sin_asignar'
                                        ? 'bg-orange-400'
                                        : 'bg-gray-400'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[9px] font-semibold uppercase text-gray-400">{label}</span>
                                {a.case?.caseId && (
                                  <span className="text-[9px] font-mono text-gray-400 truncate">{a.case.caseId}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-700 leading-snug line-clamp-2">{truncate(a.message, 72)}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-2 py-1.5 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => {
                  navigate('/alertas');
                  setBellOpen(false);
                }}
                className="w-full text-center text-[10px] font-semibold text-navy-600 hover:underline py-0.5"
              >
                Ver panel completo
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
