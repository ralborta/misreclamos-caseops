// @ts-nocheck
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, Calendar,
  Trash2, X, ExternalLink, Sparkles,
} from 'lucide-react';

// Tipos de hito jurídico predefinidos por categoría
const TASK_TYPES = [
  { group: 'Documentación', items: [
    'Presentación de escrito',
    'Entrega de documentación al cliente',
    'Recepción de documentos',
    'Certificación / apostillado',
    'Traducción de documento',
  ]},
  { group: 'Procesal', items: [
    'Audiencia preliminar',
    'Audiencia de vista de causa',
    'Audiencia de conciliación (SECLO)',
    'Presentación de demanda',
    'Contestación de demanda',
    'Ofrecimiento de prueba',
    'Alegato',
    'Liquidación',
    'Ejecución de sentencia',
  ]},
  { group: 'Notificaciones', items: [
    'Envío de telegrama laboral',
    'Notificación a contraparte',
    'Intimación fehaciente',
    'Respuesta a intimación',
  ]},
  { group: 'Cautelar / Urgente', items: [
    'Solicitud de medida cautelar',
    'Seguimiento de medida cautelar',
    'Urgencia médica — cobertura',
    'Presentación judicial urgente',
  ]},
  { group: 'Interno', items: [
    'Revisión de estrategia',
    'Consulta con cliente',
    'Informe de avance',
    'Análisis de documentos con Legal Intel',
    'Otro',
  ]},
];

const PRIORITY_CONFIG = {
  urgente: { label: 'Urgente', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  alta:    { label: 'Alta',    color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  media:   { label: 'Media',   color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  baja:    { label: 'Baja',    color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' },
};

const STATUS_CONFIG = {
  pendiente:  { label: 'Pendiente',   color: 'text-gray-600' },
  en_curso:   { label: 'En curso',    color: 'text-blue-600' },
  completada: { label: 'Completada',  color: 'text-green-600' },
  vencida:    { label: 'Vencida',     color: 'text-red-600' },
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function googleCalendarUrl(task: any, caseTitle: string) {
  const start = new Date(task.dueDate);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[CaseOps] ${task.title} — ${caseTitle}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: task.description || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

interface Props {
  caseId: string;
  caseTitle: string;
  users?: any[];
}

export default function TasksTab({ caseId, caseTitle, users = [] }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'timeline'>('timeline');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    customTitle: '',
    description: '',
    dueDate: '',
    dueTime: '09:00',
    priority: 'media',
    assignedToId: '',
  });

  useEffect(() => {
    api.tasks.list(caseId)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generated = await api.tasks.generate(caseId);
      setPreview(generated);
    } catch (err: any) {
      alert(err.message || 'Error al generar el cronograma');
    } finally {
      setGenerating(false);
    }
  };

  const confirmPreview = () => {
    if (!preview) return;
    setTasks(prev => [...prev, ...preview].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    setPreview(null);
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const title = form.title === 'Otro' ? form.customTitle : form.title;
      const dueDate = new Date(`${form.dueDate}T${form.dueTime}:00`).toISOString();
      const task = await api.tasks.create(caseId, {
        title,
        description: form.description || undefined,
        dueDate,
        priority: form.priority,
        assignedToId: form.assignedToId || undefined,
      });
      setTasks(prev => [...prev, task].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setShowForm(false);
      setForm({ title: '', customTitle: '', description: '', dueDate: '', dueTime: '09:00', priority: 'media', assignedToId: '' });
    } catch (err: any) {
      alert(err.message || 'Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    try {
      const updated = await api.tasks.update(caseId, task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch {}
  };

  const removeTask = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await api.tasks.remove(caseId, taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {}
  };

  const pending = tasks.filter(t => t.status !== 'completada').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const done = tasks.filter(t => t.status === 'completada');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['timeline', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${view === v ? 'bg-white text-navy-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v === 'timeline' ? 'Cronograma' : 'Lista'}
            </button>
          ))}
        </div>
      <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Sparkles size={14} />
            {generating ? 'Analizando con IA...' : 'Generar con Gemini'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} /> Nueva tarea
          </button>
        </div>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nueva tarea / hito procesal</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Tipo de acción</label>
                <select
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy-600/20 bg-gray-50"
                >
                  <option value="">Seleccionar tipo...</option>
                  {TASK_TYPES.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {form.title === 'Otro' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Descripción personalizada</label>
                  <input
                    value={form.customTitle}
                    onChange={e => setForm(f => ({ ...f, customTitle: e.target.value }))}
                    required
                    placeholder="Describí la tarea..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20"
                  />
                </div>
              )}

              {/* Descripción opcional */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Notas adicionales <span className="font-normal text-gray-400">(opcional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Detalles, referencias, expediente..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-600/20"
                />
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Hora</label>
                  <input
                    type="time"
                    value={form.dueTime}
                    onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20"
                  />
                </div>
              </div>

              {/* Prioridad y responsable */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Prioridad</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 bg-gray-50"
                  >
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                {users.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Responsable</label>
                    <select
                      value={form.assignedToId}
                      onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 bg-gray-50"
                    >
                      <option value="">Sin asignar</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-navy-700 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal preview Gemini */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Cronograma generado por Gemini</h3>
                <p className="text-xs text-gray-500">{preview.length} tareas procesales sugeridas — revisá y confirmá</p>
              </div>
              <button onClick={() => setPreview(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {preview.map((t, i) => {
                const pc = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.media;
                return (
                  <div key={i} className="px-6 py-4 flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-600 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${pc.bg} ${pc.color} ${pc.border}`}>{pc.label}</span>
                        <span className="text-[10px] text-gray-400">
                          {formatDateTime(new Date(Date.now() + t.daysFromNow * 86400000).toISOString())}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setPreview(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Descartar
              </button>
              <button onClick={confirmPreview} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">
                Confirmar y crear {preview.length} tareas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista cronograma */}
      {view === 'timeline' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cronograma procesal</h3>
            <span className="text-xs text-gray-400">{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
          ) : pending.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No hay tareas registradas para este caso.</p>
              <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-navy-600 font-medium hover:underline">+ Crear primera tarea</button>
            </div>
          ) : (
            <div className="relative px-6 py-4">
              {/* Línea vertical */}
              <div className="absolute left-[2.35rem] top-4 bottom-4 w-0.5 bg-gray-100" />

              <div className="space-y-4">
                {pending.map((task, idx) => {
                  const days = daysUntil(task.dueDate);
                  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media;
                  const isOverdue = days < 0;
                  const isUrgent = days >= 0 && days <= 3;
                  const isSoon = days > 3 && days <= 7;

                  return (
                    <div key={task.id} className="relative flex gap-4 group">
                      {/* Dot en la línea */}
                      <div className={`relative z-10 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 mt-0.5 ${
                        isOverdue ? 'bg-red-500' : isUrgent ? 'bg-orange-500' : isSoon ? 'bg-amber-400' : 'bg-navy-600'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Contenido */}
                      <div className={`flex-1 rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                        isOverdue ? 'border-red-200 bg-red-50/50' :
                        isUrgent ? 'border-orange-200 bg-orange-50/30' :
                        'border-gray-100 bg-white'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${pc.bg} ${pc.color} ${pc.border}`}>
                                {pc.label}
                              </span>
                              {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">VENCIDA</span>}
                              {isUrgent && !isOverdue && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 border border-orange-200 rounded-full px-2 py-0.5">HOY / URGENTE</span>}
                            </div>
                            <p className="font-semibold text-gray-800 text-sm">{task.title}</p>
                            {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Agregar a Google Calendar */}
                            <a
                              href={googleCalendarUrl(task, caseTitle)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Agregar a Google Calendar"
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              onClick={() => removeTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              onClick={() => toggleStatus(task)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                              title="Marcar como completada"
                            >
                              <Circle size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={11} />
                            {formatDateTime(task.dueDate)}
                          </div>
                          {task.assignedTo && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <div className="w-4 h-4 rounded-full bg-navy-100 flex items-center justify-center text-[9px] font-bold text-navy-700">
                                {task.assignedTo.name.charAt(0)}
                              </div>
                              {task.assignedTo.name}
                            </div>
                          )}
                          <div className={`ml-auto text-xs font-semibold ${
                            isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : isSoon ? 'text-amber-600' : 'text-gray-400'
                          }`}>
                            {isOverdue ? `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}` :
                             days === 0 ? 'Hoy' :
                             days === 1 ? 'Mañana' :
                             `En ${days} días`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completadas colapsables */}
          {done.length > 0 && (
            <details className="border-t border-gray-100">
              <summary className="px-5 py-3 text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                {done.length} tarea{done.length !== 1 ? 's' : ''} completada{done.length !== 1 ? 's' : ''}
              </summary>
              <div className="divide-y divide-gray-50 pb-2">
                {done.map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-2.5 group">
                    <button onClick={() => toggleStatus(task)} className="text-green-500 hover:text-gray-400 transition-colors shrink-0">
                      <CheckCircle2 size={16} />
                    </button>
                    <span className="flex-1 text-sm text-gray-400 line-through">{task.title}</span>
                    <span className="text-xs text-gray-300">{formatDateTime(task.dueDate)}</span>
                    <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Vista lista */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['', 'Tarea', 'Prioridad', 'Vencimiento', 'Responsable', 'Estado', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No hay tareas. <button onClick={() => setShowForm(true)} className="text-navy-600 hover:underline">Crear una</button></td></tr>
              ) : tasks.map(task => {
                const days = daysUntil(task.dueDate);
                const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.media;
                const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pendiente;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 group">
                    <td className="pl-4 pr-2 py-3">
                      <button onClick={() => toggleStatus(task)} className="text-gray-300 hover:text-green-500 transition-colors">
                        {task.status === 'completada' ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <p className={`font-medium ${task.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-gray-400 truncate max-w-xs">{task.description}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${pc.bg} ${pc.color} ${pc.border}`}>{pc.label}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-gray-700">{formatDateTime(task.dueDate)}</p>
                      <p className={`text-[10px] font-medium ${days < 0 ? 'text-red-500' : days <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {days < 0 ? `Venció hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{task.assignedTo?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="pr-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={googleCalendarUrl(task, caseTitle)} target="_blank" rel="noopener noreferrer" title="Google Calendar" className="p-1 rounded text-gray-400 hover:text-green-600">
                          <ExternalLink size={13} />
                        </a>
                        <button onClick={() => removeTask(task.id)} className="p-1 rounded text-gray-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
