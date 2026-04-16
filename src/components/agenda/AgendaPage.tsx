import { Calendar, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { priorityConfig, formatDate } from '../../utils';
import { mockCases } from '../../data/mockData';

const allTasks = mockCases.flatMap(c =>
  c.tasks.map(t => ({ ...t, caseTitle: c.title, caseId: c.caseId }))
);

const days = ['Lun 16', 'Mar 17', 'Mié 18', 'Jue 19', 'Vie 20', 'Sáb 21', 'Dom 22'];

const eventos = [
  { day: 'Mié 18', time: '10:00', title: 'Audiencia — García vs. Logística Norte', case: 'MR-2024-00341', type: 'audiencia' },
  { day: 'Jue 19', time: '09:00', title: 'Seguimiento cautelar OSDE', case: 'MR-2024-00287', type: 'seguimiento' },
  { day: 'Vie 20', time: '15:00', title: 'Reunión con cliente — Romero', case: 'MR-2024-00412', type: 'reunion' },
];

const typeColors: Record<string, string> = {
  audiencia: 'bg-red-100 border-red-300 text-red-700',
  seguimiento: 'bg-blue-100 border-blue-300 text-blue-700',
  reunion: 'bg-green-100 border-green-300 text-green-700',
};

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Agenda y tareas</h2>
          <p className="text-sm text-gray-500">Semana del 16 al 22 de diciembre 2024</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors">
          <Plus size={14} /> Nueva tarea
        </button>
      </div>

      {/* Week calendar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((d, i) => (
            <div key={d} className={`px-3 py-3 text-center border-r border-gray-100 last:border-0 ${i === 2 ? 'bg-navy-50' : ''}`}>
              <p className={`text-xs font-semibold ${i === 2 ? 'text-navy-600' : 'text-gray-500'}`}>{d}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[120px]">
          {days.map((d, i) => {
            const dayEvents = eventos.filter(e => e.day === d);
            return (
              <div key={d} className={`p-2 border-r border-gray-50 last:border-0 ${i === 2 ? 'bg-navy-50/30' : ''}`}>
                {dayEvents.map((ev, j) => (
                  <div key={j} className={`text-[10px] font-medium px-2 py-1.5 rounded-lg border mb-1.5 cursor-pointer ${typeColors[ev.type]}`}>
                    <p className="font-bold">{ev.time}</p>
                    <p className="leading-tight mt-0.5">{ev.title}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Today's tasks */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-navy-600" />
            <h3 className="text-sm font-semibold text-gray-900">Tareas del día</h3>
            <span className="ml-auto text-xs text-gray-400">{allTasks.length} total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {allTasks.map(t => {
              const pc = priorityConfig[t.priority];
              return (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${pc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium">{t.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{(t as any).caseId} · {t.assignedTo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[10px] font-semibold ${pc.color}`}>{pc.label}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(t.dueDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar size={15} className="text-navy-600" />
            <h3 className="text-sm font-semibold text-gray-900">Próximas fechas críticas</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { date: '20 dic', title: 'Envío TCL de respuesta', case: 'MR-2024-00341', type: 'urgente' },
              { date: '20 dic', title: 'Seguimiento resolución cautelar', case: 'MR-2024-00287', type: 'urgente' },
              { date: '25 dic', title: 'Recibir recibos de sueldo', case: 'MR-2024-00341', type: 'normal' },
              { date: '10 ene', title: 'Presentar declaratoria', case: 'MR-2024-00198', type: 'normal' },
              { date: '30 dic', title: 'Respuesta de Telecom a propuesta', case: 'MR-2024-00355', type: 'normal' },
            ].map((ev, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className={`text-center shrink-0 w-10`}>
                  <p className={`text-xs font-bold ${ev.type === 'urgente' ? 'text-red-600' : 'text-navy-600'}`}>{ev.date}</p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{ev.title}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{ev.case}</p>
                </div>
                {ev.type === 'urgente' && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
