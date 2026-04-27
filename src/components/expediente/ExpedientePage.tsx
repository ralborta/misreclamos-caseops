// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import TasksTab from './TasksTab';
import DocumentsTab from './DocumentsTab';
import NotesTab from './NotesTab';
import LegalIntelTab from './LegalIntelTab';
import { statusConfig, priorityConfig, materiaConfig, formatDate, formatDateTime, timeAgo } from '../../utils';
import type { CasePriority } from '../../types';
import {
  ArrowLeft, AlertTriangle, Clock, User, Calendar, FileText,
  MessageSquare, CheckSquare, Activity, Zap, MoreHorizontal,
  Upload, Plus, ChevronRight, CheckCircle2, Circle, Shield,
  Phone, Mail, MapPin, Tag, Edit2, Copy, Filter, Archive, RefreshCcw, Save, X,
} from 'lucide-react';

const tabs = ['Resumen', 'Tareas', 'Documentos', 'Timeline', 'Notas', 'Legal Intel'];

export default function ExpedientePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [caso, setCaso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openDocUpload, setOpenDocUpload] = useState(false);
  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientDraft, setClientDraft] = useState({
    name: '',
    dni: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    consent: false,
    notes: '',
  });
  const caseMenuRef = useRef<HTMLDivElement>(null);

  const refreshCaso = () => (id ? api.cases.get(id).then(setCaso) : Promise.resolve());

  const canArchive = user && ['admin', 'coordinador'].includes(user.role);

  useEffect(() => {
    if (!caseMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (caseMenuRef.current && !caseMenuRef.current.contains(e.target as Node)) setCaseMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [caseMenuOpen]);

  const copyCaseSummary = async () => {
    const lines = [
      caso.caseId,
      caso.title,
      caso.client?.name ? `Cliente: ${caso.client.name}` : null,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      alert('Datos del expediente copiados al portapapeles.');
    } catch {
      window.prompt('Copiá este texto:', lines);
    }
    setCaseMenuOpen(false);
  };

  const toggleUrgent = async () => {
    try {
      const updated = await api.cases.update(caso.id, { isUrgent: !caso.isUrgent });
      setCaso(updated);
    } catch (e: any) {
      alert(e?.message || 'No se pudo actualizar');
    }
    setCaseMenuOpen(false);
  };

  const goFilteredInbox = () => {
    const q = new URLSearchParams({ materia: caso.materia, status: caso.status });
    navigate(`/casos?${q.toString()}`);
    setCaseMenuOpen(false);
  };

  const archiveCase = async () => {
    if (!confirm('¿Archivar este expediente? Quedará en estado archivado.')) return;
    try {
      await api.cases.archive(caso.id);
      navigate('/casos');
    } catch (e: any) {
      alert(e?.message || 'No se pudo archivar (¿permisos?)');
    }
    setCaseMenuOpen(false);
  };

  const regenerateSummary = async () => {
    if (!caso?.id || regeneratingSummary) return;
    setRegeneratingSummary(true);
    try {
      await api.cases.regenerateSummary(caso.id);
      await refreshCaso();
    } catch (e: any) {
      alert(e?.message || 'No se pudo regenerar el resumen');
    } finally {
      setRegeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    api.cases.get(id)
      .then(data => setCaso(data))
      .catch(() => setCaso(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!caso?.client) return;
    setClientDraft({
      name: caso.client.name || '',
      dni: caso.client.dni || '',
      phone: caso.client.phone || '',
      email: caso.client.email || '',
      address: caso.client.address || '',
      city: caso.client.city || '',
      province: caso.client.province || '',
      consent: !!caso.client.consent,
      notes: caso.client.notes || '',
    });
  }, [caso]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando expediente...</div>
  );

  if (!caso) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-lg font-medium">Caso no encontrado</p>
      <button onClick={() => navigate('/casos')} className="mt-3 text-navy-600 text-sm hover:underline">Volver a la bandeja</button>
    </div>
  );

  const sc = statusConfig[caso.status];
  const pc = priorityConfig[caso.priority];
  const mc = materiaConfig[caso.materia];

  const saveClientChanges = async () => {
    if (!caso?.id || savingClient) return;
    setSavingClient(true);
    try {
      await api.cases.updateClient(caso.id, clientDraft);
      await refreshCaso();
      setEditingClient(false);
    } catch (e: any) {
      alert(e?.message || 'No se pudieron guardar los datos del cliente');
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/casos')} className="flex items-center gap-1 hover:text-navy-600 transition-colors">
          <ArrowLeft size={14} /> Bandeja
        </button>
        <ChevronRight size={12} />
        <span className="font-mono text-gray-400">{caso.caseId}</span>
        <ChevronRight size={12} />
        <span className="text-gray-700 font-medium truncate max-w-xs">{caso.title}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Top accent line */}
        <div className="h-1 bg-gradient-to-r from-navy-600 via-brand-orange to-navy-400" />

        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                <span className="font-mono text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{caso.caseId}</span>
                <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-0.5 ${sc.bg} ${sc.color}`}>{sc.label}</span>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {mc.icon} {mc.label}
                </span>
                {caso.isUrgent && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                    <AlertTriangle size={9} /> URGENTE
                  </span>
                )}
                {caso.isDormant && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                    <Clock size={9} /> DORMIDO
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900 leading-snug">{caso.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{caso.subtype} · {caso.stage}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <Edit2 size={13} /> Editar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(5)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-brand-orange rounded-lg hover:bg-brand-orange-dark transition-colors"
              >
                <Zap size={13} /> Legal Intel
              </button>
              <div className="relative" ref={caseMenuRef}>
                <button
                  type="button"
                  onClick={() => setCaseMenuOpen((o) => !o)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  aria-expanded={caseMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Más acciones del expediente"
                >
                  <MoreHorizontal size={15} className="text-gray-500" />
                </button>
                {caseMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-gray-200 bg-white shadow-lg z-50 py-1 text-sm"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={copyCaseSummary}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Copy size={14} className="text-gray-400 shrink-0" />
                      <span>Copiar datos del expediente</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={toggleUrgent}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      <span>{caso.isUrgent ? 'Quitar urgente' : 'Marcar como urgente'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={goFilteredInbox}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <Filter size={14} className="text-gray-400 shrink-0" />
                      <span>Ver en bandeja (misma materia y estado)</span>
                    </button>
                    {canArchive && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={archiveCase}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-red-700 hover:bg-red-50 border-t border-gray-100"
                      >
                        <Archive size={14} className="shrink-0" />
                        <span>Archivar expediente</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <User size={12} className="text-gray-400" />
              <span className="font-medium">{caso.assignedLawyer ?? <span className="text-orange-500">Sin asignar</span>}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Shield size={12} className="text-gray-400" />
              <span>{caso.coordinator ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Calendar size={12} className="text-gray-400" />
              <span>Alta: {formatDate(caso.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Activity size={12} className="text-gray-400" />
              <span>Última actividad: {timeAgo(caso.lastActivity)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Tag size={12} className="text-gray-400" />
              <span className={`font-medium ${pc.color}`}>{pc.label}</span>
            </div>
            {caso.nextAction && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 ml-auto">
                <ChevronRight size={12} className="text-brand-orange" />
                <span className="text-gray-700">Próx: <span className="font-medium">{caso.nextAction}</span></span>
                {caso.nextActionDate && <span className="text-gray-400">({formatDate(caso.nextActionDate)})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100 px-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-1 py-3 text-sm font-medium border-b-2 mr-6 whitespace-nowrap transition-colors ${
                activeTab === i
                  ? 'border-brand-orange text-navy-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {[Activity, CheckSquare, FileText, Clock, MessageSquare, Zap][i] &&
                (() => { const Icon = [Activity, CheckSquare, FileText, Clock, MessageSquare, Zap][i]; return <Icon size={13} />; })()
              }
              {tab}
              {tab === 'Tareas' && caso.tasks.length > 0 && (
                <span className="text-[10px] bg-navy-600 text-white px-1.5 rounded-full">{caso.tasks.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-3 gap-5">
        {/* Main content */}
        <div className="col-span-2">
          {activeTab === 0 && (
            <TabResumen
              caso={caso}
              onRegenerateSummary={regenerateSummary}
              regeneratingSummary={regeneratingSummary}
            />
          )}
          {activeTab === 1 && <TabTareas caso={caso} />}
          {activeTab === 2 && (
            <DocumentsTab
              caseId={caso.id}
              documents={caso.documents ?? []}
              onRefresh={refreshCaso}
              autoOpenUpload={openDocUpload}
              onAutoOpenConsumed={() => setOpenDocUpload(false)}
            />
          )}
          {activeTab === 3 && <TabTimeline caso={caso} />}
          {activeTab === 4 && (
            <NotesTab
              caseId={caso.id}
              notes={caso.notes ?? []}
              onRefresh={refreshCaso}
              autoOpen={openNoteModal}
              onAutoOpenConsumed={() => setOpenNoteModal(false)}
            />
          )}
          {activeTab === 5 && <LegalIntelTab caso={caso} caseId={caso.id} onRefresh={refreshCaso} />}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Client card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</h3>
              {!editingClient ? (
                <button
                  type="button"
                  onClick={() => setEditingClient(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-navy-600 hover:text-navy-700 font-medium"
                >
                  <Edit2 size={12} />
                  Editar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClient(false);
                      if (caso?.client) {
                        setClientDraft({
                          name: caso.client.name || '',
                          dni: caso.client.dni || '',
                          phone: caso.client.phone || '',
                          email: caso.client.email || '',
                          address: caso.client.address || '',
                          city: caso.client.city || '',
                          province: caso.client.province || '',
                          consent: !!caso.client.consent,
                          notes: caso.client.notes || '',
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                  >
                    <X size={12} />
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveClientChanges}
                    disabled={savingClient}
                    className="inline-flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 font-medium disabled:opacity-60"
                  >
                    <Save size={12} />
                    {savingClient ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>

            {!editingClient ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 text-sm font-bold">
                    {caso.client.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{caso.client.name}</p>
                    <p className="text-[11px] text-gray-400">DNI {caso.client.dni}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone size={11} className="text-gray-400 shrink-0" /> {caso.client.phone || 'No informado'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail size={11} className="text-gray-400 shrink-0" /> {caso.client.email || 'No informado'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin size={11} className="text-gray-400 shrink-0" /> {[caso.client.city, caso.client.province].filter(Boolean).join(', ') || 'No informado'}
                  </div>
                  {caso.client.address && (
                    <p className="text-[11px] text-gray-500">Dirección: {caso.client.address}</p>
                  )}
                  {caso.client.notes && (
                    <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5">
                      {caso.client.notes}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <input value={clientDraft.name} onChange={(e) => setClientDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input value={clientDraft.dni} onChange={(e) => setClientDraft((p) => ({ ...p, dni: e.target.value }))} placeholder="DNI" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input value={clientDraft.phone} onChange={(e) => setClientDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="Teléfono" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input value={clientDraft.email} onChange={(e) => setClientDraft((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input value={clientDraft.address} onChange={(e) => setClientDraft((p) => ({ ...p, address: e.target.value }))} placeholder="Dirección" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={clientDraft.city} onChange={(e) => setClientDraft((p) => ({ ...p, city: e.target.value }))} placeholder="Ciudad" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                  <input value={clientDraft.province} onChange={(e) => setClientDraft((p) => ({ ...p, province: e.target.value }))} placeholder="Provincia" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                </div>
                <textarea value={clientDraft.notes} onChange={(e) => setClientDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Notas del cliente (contacto, preferencias, observaciones)" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs min-h-[74px]" />
                <label className="flex items-center gap-2 text-xs text-gray-600 pt-1">
                  <input type="checkbox" checked={clientDraft.consent} onChange={(e) => setClientDraft((p) => ({ ...p, consent: e.target.checked }))} />
                  Consentimiento registrado
                </label>
              </div>
            )}
            {caso.client.consent && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-green-600">
                <CheckCircle2 size={11} /> Consentimiento registrado
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Acciones rápidas</h3>
            <div className="space-y-2">
              {[
                { icon: Plus, label: 'Nueva tarea', color: 'text-navy-600', action: () => setActiveTab(1) },
                { icon: Upload, label: 'Subir documento', color: 'text-navy-600', action: () => { setActiveTab(2); setOpenDocUpload(true); } },
                { icon: MessageSquare, label: 'Agregar nota', color: 'text-navy-600', action: () => { setActiveTab(4); setOpenNoteModal(true); } },
                { icon: Zap, label: 'Consultar Legal Intel', color: 'text-brand-orange', action: () => setActiveTab(5) },
              ].map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <a.icon size={14} className={a.color} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Responsables</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Abogado responsable</p>
                {caso.assignedLawyer ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-navy-100 flex items-center justify-center text-[9px] font-bold text-navy-600">
                      {caso.assignedLawyer.split(' ').slice(-1)[0]?.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-700 font-medium">{caso.assignedLawyer}</span>
                  </div>
                ) : (
                  <button className="text-xs text-brand-orange font-medium hover:underline">+ Asignar abogado</button>
                )}
              </div>
              {caso.coordinator && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Coordinador</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600">
                      {caso.coordinator.split(' ').slice(-1)[0]?.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-700 font-medium">{caso.coordinator}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabResumen({
  caso,
  onRegenerateSummary,
  regeneratingSummary,
}: {
  caso: ReturnType<typeof mockCases.find> & object;
  onRegenerateSummary: () => void;
  regeneratingSummary: boolean;
}) {
  if (!caso) return null;
  const stages = {
    laboral: ['Análisis inicial', 'Intercambio telegráfico', 'Conciliación / SECLO', 'Demanda', 'Prueba', 'Alegato', 'Liquidación', 'Cierre'],
    salud: ['Revisión documental', 'Urgencia médica', 'Requerimiento previo', 'Presentación judicial', 'Medida cautelar', 'Seguimiento', 'Cierre'],
    sucesion: ['Validación vínculo', 'Apertura', 'Declaratoria', 'Inventario', 'Tracto / escrituración', 'Cierre'],
    consumidor: ['Análisis inicial', 'Requerimiento previo', 'Negociación', 'Presentación judicial', 'Seguimiento', 'Cierre'],
    accidente: ['Análisis inicial', 'Prueba pericial', 'Negociación aseguradora', 'Demanda', 'Sentencia', 'Ejecución'],
    familia: ['Revisión urgente', 'Medida cautelar', 'Presentación', 'Audiencia', 'Resolución'],
    previsional: ['Análisis', 'Requerimiento ANSES', 'Recurso', 'Judicial', 'Cierre'],
    civil: ['Análisis inicial', 'Intimación', 'Mediación', 'Demanda', 'Prueba', 'Sentencia'],
  };
  const stageList = stages[caso.materia] ?? stages.laboral;
  const currentIdx = stageList.findIndex(s => s.toLowerCase().includes(caso.stage.toLowerCase().split(' ')[0]));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen ejecutivo</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{caso.summary}</p>
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onRegenerateSummary}
            disabled={regeneratingSummary}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 rounded-lg hover:bg-navy-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCcw size={13} className={regeneratingSummary ? 'animate-spin' : ''} />
            {regeneratingSummary ? 'Regenerando resumen...' : 'Regenerar resumen'}
          </button>
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Etapa procesal — {materiaConfig[caso.materia].label}</h3>
        <div className="relative">
          <div className="flex items-center gap-0">
            {stageList.map((s: string, i: number) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {i > 0 && (
                    <div className={`absolute left-0 top-2.5 w-full h-0.5 -translate-y-1/2 z-0 ${done || active ? 'bg-navy-600' : 'bg-gray-200'}`} style={{ left: '-50%', width: '100%' }} />
                  )}
                  <div className={`w-5 h-5 rounded-full z-10 flex items-center justify-center border-2 transition-all ${
                    done ? 'bg-navy-600 border-navy-600' :
                    active ? 'bg-brand-orange border-brand-orange' :
                    'bg-white border-gray-300'
                  }`}>
                    {done && <CheckCircle2 size={10} className="text-white" />}
                    {active && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <p className={`text-[9px] mt-1.5 text-center font-medium leading-tight px-0.5 ${
                    done ? 'text-navy-600' : active ? 'text-brand-orange' : 'text-gray-400'
                  }`}>{s}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending tasks preview */}
      {(caso.tasks ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tareas pendientes</h3>
          <div className="space-y-2">
            {(caso.tasks ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 py-1.5">
                <Circle size={14} className={t.status === 'completada' ? 'text-green-500' : 'text-gray-300'} />
                <span className={`text-sm flex-1 ${t.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                <span className="text-[10px] text-gray-400">{formatDate(t.dueDate)}</span>
                <span className={`text-[10px] font-medium ${priorityConfig[t.priority as CasePriority]?.color}`}>{priorityConfig[t.priority as CasePriority]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabTareas({ caso }: { caso: any }) {
  return <TasksTab caseId={caso.id} caseTitle={caso.title} />;
}

function timelineUserLabel(e: { user?: { name?: string } | null; userId?: string | null }) {
  if (e.user && typeof e.user === 'object' && 'name' in e.user && e.user.name) return e.user.name;
  return 'Sistema';
}

function TabTimeline({ caso }: { caso: any }) {
  const typeConfig: Record<string, { color: string; bg: string }> = {
    creacion: { color: 'text-blue-600', bg: 'bg-blue-100' },
    asignacion: { color: 'text-indigo-600', bg: 'bg-indigo-100' },
    reasignacion: { color: 'text-indigo-600', bg: 'bg-indigo-100' },
    estado: { color: 'text-purple-600', bg: 'bg-purple-100' },
    documento: { color: 'text-navy-600', bg: 'bg-navy-100' },
    nota: { color: 'text-gray-600', bg: 'bg-gray-100' },
    hito: { color: 'text-brand-orange', bg: 'bg-orange-100' },
    tarea: { color: 'text-green-600', bg: 'bg-green-100' },
    legal_intel: { color: 'text-amber-600', bg: 'bg-amber-100' },
  };

  const raw = Array.isArray(caso.timeline) ? caso.timeline : [];
  const events = [...raw].reverse();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Historial del expediente</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No hay eventos en el historial todavía.</p>
        ) : (
        <div className="space-y-5">
          {events.map((e: any) => {
            const tc = typeConfig[e.type] ?? typeConfig.nota;
            const when = e.createdAt ?? e.date;
            const who = typeof e.user === 'string' ? e.user : timelineUserLabel(e);
            return (
              <div key={e.id} className="flex items-start gap-4 pl-1">
                <div className={`relative z-10 w-6 h-6 rounded-full ${tc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <div className={`w-2 h-2 rounded-full ${tc.color.replace('text-', 'bg-')}`} />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-800">{e.action}</p>
                    <span className="text-[10px] text-gray-400 shrink-0">{when ? formatDateTime(when) : '—'}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{who}</p>
                  {e.detail && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-3 py-2">{e.detail}</p>}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

