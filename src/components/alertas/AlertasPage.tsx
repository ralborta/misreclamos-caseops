import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  UserX,
  CheckSquare,
  Bell,
  FileWarning,
  AlarmClock,
} from 'lucide-react';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils';

const TYPE_META: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  dormido: {
    label: 'Expedientes dormidos',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  tarea_vencida: {
    label: 'Tareas vencidas',
    icon: CheckSquare,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
  },
  tarea_proxima: {
    label: 'Tareas próximas a vencer',
    icon: AlarmClock,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    dot: 'bg-teal-400',
  },
  sin_asignar: {
    label: 'Sin abogado asignado',
    icon: UserX,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-400',
  },
  vencimiento_proximo: {
    label: 'Próxima acción del caso (48h)',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-400',
  },
  urgente: {
    label: 'Urgentes',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  documento_pendiente: {
    label: 'Documentación pendiente',
    icon: FileWarning,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    dot: 'bg-indigo-400',
  },
};

function metaFor(type: string) {
  return (
    TYPE_META[type] ?? {
      label: type,
      icon: Bell,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      dot: 'bg-gray-400',
    }
  );
}

export default function AlertasPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.alerts
      .list()
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const unresolved = alerts.filter((a) => !a.resolved);
  const groupsMap = unresolved.reduce(
    (acc, a) => {
      const t = a.type || 'otro';
      if (!acc[t]) acc[t] = [];
      acc[t].push(a);
      return acc;
    },
    {} as Record<string, any[]>
  );

  const groupKeys = Object.keys(groupsMap).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Panel de alertas</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando…' : `${unresolved.length} alertas activas`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-400">
          Cargando alertas…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {groupKeys.map((key) => {
              const g = metaFor(key);
              const Icon = g.icon;
              const n = groupsMap[key].length;
              return (
                <div key={key} className={`${g.bg} border ${g.border} rounded-xl p-4`}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={g.color} />
                    <span className={`text-2xl font-bold ${g.color}`}>{n}</span>
                  </div>
                  <p className={`text-xs font-medium mt-1 ${g.color}`}>{g.label}</p>
                </div>
              );
            })}
            {groupKeys.length === 0 && (
              <div className="col-span-4 text-sm text-gray-400 text-center py-6 bg-white rounded-xl border border-gray-200">
                No hay alertas activas.
              </div>
            )}
          </div>

          <div className="space-y-4">
            {groupKeys.map((key) => {
              const g = metaFor(key);
              const Icon = g.icon;
              const items = groupsMap[key];
              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${g.border} ${g.bg}`}>
                    <Icon size={15} className={g.color} />
                    <h3 className={`text-sm font-semibold ${g.color}`}>{g.label}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 ${g.color}`}>
                      {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => item.case?.id && navigate(`/casos/${item.case.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && item.case?.id) navigate(`/casos/${item.case.id}`);
                        }}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                        <div className="flex-1 min-w-0">
                          {item.case?.caseId && (
                            <span className="font-mono text-[10px] text-gray-400">{item.case.caseId}</span>
                          )}
                          <p className="text-sm font-medium text-gray-800 group-hover:text-navy-600 transition-colors">
                            {item.message}
                          </p>
                          {item.case?.title && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.case.title}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-xs text-gray-400">{timeAgo(item.createdAt)}</span>
                          {item.case?.id && (
                            <div className="mt-1">
                              <span className="text-[10px] font-semibold text-navy-600">Ver caso →</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
