import { AlertTriangle, Clock, UserX, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const alertGroups = [
  {
    id: 'urgentes',
    label: 'Urgentes sin resolver',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    items: [
      { case: 'MR-2024-00418', title: 'Violencia familiar — medida de restricción', detail: 'Caso urgente sin abogado asignado desde ingreso', time: 'Hace 2h' },
      { case: 'MR-2024-00287', title: 'Amparo salud — OSDE', detail: 'Vencimiento seguimiento cautelar mañana', time: 'Mañana' },
    ],
  },
  {
    id: 'dormidos',
    label: 'Expedientes dormidos',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    items: [
      { case: 'MR-2024-00198', title: 'Sucesión ab intestato — Herrera', detail: 'Sin actividad hace 13 días', time: 'hace 13d' },
      { case: 'MR-2024-00355', title: 'Defensa del consumidor — Telecom', detail: 'Sin actividad hace 20 días. Esperando respuesta empresa.', time: 'hace 20d' },
    ],
  },
  {
    id: 'sin_asignar',
    label: 'Sin abogado asignado',
    icon: UserX,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-400',
    items: [
      { case: 'MR-2024-00418', title: 'Violencia familiar — medida de restricción', detail: 'Ingresó hoy. Requiere asignación urgente.', time: 'Hoy' },
      { case: 'MR-2024-00412', title: 'Accidente de tránsito — Romero', detail: 'Ingresó hace 3 días. En revisión inicial.', time: 'hace 3d' },
    ],
  },
  {
    id: 'tareas_vencidas',
    label: 'Tareas vencidas',
    icon: CheckSquare,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
    items: [
      { case: 'MR-2024-00412', title: 'Revisar documentación inicial del caso', detail: 'Asignada a: Lic. Carolina Méndez — venció ayer', time: 'Ayer' },
    ],
  },
];

export default function AlertasPage() {
  const navigate = useNavigate();
  const totalAlerts = alertGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Panel de alertas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{totalAlerts} alertas activas que requieren atención</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">Actualizado hace 5 min</span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-4 gap-4">
        {alertGroups.map(g => (
          <div key={g.id} className={`${g.bg} border ${g.border} rounded-xl p-4`}>
            <div className="flex items-center gap-2.5">
              <g.icon size={16} className={g.color} />
              <span className={`text-2xl font-bold ${g.color}`}>{g.items.length}</span>
            </div>
            <p className={`text-xs font-medium mt-1 ${g.color}`}>{g.label}</p>
          </div>
        ))}
      </div>

      {/* Alert groups */}
      <div className="space-y-4">
        {alertGroups.map(g => (
          <div key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${g.border} ${g.bg}`}>
              <g.icon size={15} className={g.color} />
              <h3 className={`text-sm font-semibold ${g.color}`}>{g.label}</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 ${g.color}`}>{g.items.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {g.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => navigate('/casos/1')}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-gray-400">{item.case}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-navy-600 transition-colors">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-gray-400">{item.time}</span>
                    <div className="mt-1">
                      <button className="text-[10px] font-semibold text-navy-600 hover:underline">Ver caso →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
