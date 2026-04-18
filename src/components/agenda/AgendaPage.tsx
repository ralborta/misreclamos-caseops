import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { priorityConfig, formatDate } from '../../utils';
import { api } from '../../utils/api';

function sameCalendarDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

function eachDayOfWeek(weekStartIso: string) {
  const start = new Date(weekStartIso);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatWeekTitle(weekStart: string, weekEnd: string) {
  const a = new Date(weekStart);
  const b = new Date(weekEnd);
  const startStr = a.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = b.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `Semana: ${startStr} — ${endStr}`;
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    weekStart: string;
    weekEnd: string;
    tasksInWeek: any[];
    upcomingSoon: any[];
    overdueOpen: any[];
  } | null>(null);

  useEffect(() => {
    api.agenda()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const weekDays = data ? eachDayOfWeek(data.weekStart) : [];

  const critical = [
    ...(data?.overdueOpen ?? []).map((t: any) => ({ ...t, kind: 'vencida' as const })),
    ...(data?.upcomingSoon ?? []).map((t: any) => ({ ...t, kind: 'proxima' as const })),
  ].slice(0, 25);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Agenda y tareas</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Cargando…' : data ? formatWeekTitle(data.weekStart, data.weekEnd) : 'No se pudo cargar la agenda'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/casos')}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors"
        >
          <Plus size={14} /> Ir a expedientes
        </button>
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-400">
          {loading ? 'Cargando agenda…' : 'No hay datos. Verificá la conexión con el servidor.'}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {weekDays.map((day, i) => {
                const isToday =
                  new Date().toDateString() === day.toDateString();
                const label = day.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <div
                    key={i}
                    className={`px-2 py-3 text-center border-r border-gray-100 last:border-0 ${isToday ? 'bg-navy-50' : ''}`}
                  >
                    <p className={`text-xs font-semibold capitalize ${isToday ? 'text-navy-600' : 'text-gray-500'}`}>
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 min-h-[120px]">
              {weekDays.map((day, i) => {
                const dayTasks = data.tasksInWeek.filter((t) => sameCalendarDay(t.dueDate, day));
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <div
                    key={i}
                    className={`p-2 border-r border-gray-50 last:border-0 align-top ${isToday ? 'bg-navy-50/30' : ''}`}
                  >
                    {dayTasks.map((t) => {
                      const pc = priorityConfig[t.priority as keyof typeof priorityConfig] ?? priorityConfig.media;
                      const time = new Date(t.dueDate).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => t.case?.id && navigate(`/casos/${t.case.id}`)}
                          className="w-full text-left text-[10px] font-medium px-2 py-1.5 rounded-lg border mb-1.5 bg-navy-50/80 border-navy-200 text-navy-800 hover:bg-navy-100 transition-colors"
                        >
                          <p className="font-bold text-[9px] text-gray-500">{time}</p>
                          <p className="leading-tight mt-0.5 line-clamp-3">{t.title}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5 font-mono">{t.case?.caseId}</p>
                          <span className={`inline-block mt-1 text-[9px] px-1.5 py-0 rounded ${pc.color}`}>{pc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-navy-600" />
                <h3 className="text-sm font-semibold text-gray-900">Tareas de la semana</h3>
                <span className="ml-auto text-xs text-gray-400">{data.tasksInWeek.length} en calendario</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {data.tasksInWeek.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">No hay tareas con vencimiento esta semana.</div>
                ) : (
                  data.tasksInWeek.map((t) => {
                    const pc = priorityConfig[t.priority as keyof typeof priorityConfig] ?? priorityConfig.media;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => t.case?.id && navigate(`/casos/${t.case.id}`)}
                        className="flex items-start gap-3 w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${pc.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{t.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            {t.case?.caseId} · {t.assignedTo?.name ?? 'Sin asignar'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[10px] font-semibold ${pc.color}`}>{pc.label}</p>
                          <p className="text-[10px] text-gray-400">{formatDate(t.dueDate)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Calendar size={15} className="text-navy-600" />
                <h3 className="text-sm font-semibold text-gray-900">Vencidas y próximas fechas</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {critical.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">No hay tareas vencidas ni próximas en 14 días.</div>
                ) : (
                  critical.map((ev) => (
                    <button
                      type="button"
                      key={`${ev.kind}-${ev.id}`}
                      onClick={() => ev.case?.id && navigate(`/casos/${ev.case.id}`)}
                      className="flex items-center gap-4 w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-center shrink-0 w-12">
                        <p className={`text-xs font-bold ${ev.kind === 'vencida' ? 'text-red-600' : 'text-navy-600'}`}>
                          {formatDate(ev.dueDate)}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{ev.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{ev.case?.caseId}</p>
                      </div>
                      {ev.kind === 'vencida' && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
