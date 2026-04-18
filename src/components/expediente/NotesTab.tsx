// @ts-nocheck
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatDateTime } from '../../utils';
import { Plus, X } from 'lucide-react';

function authorLabel(n: any) {
  if (typeof n.author === 'string') return n.author;
  return n.author?.name ?? '—';
}

function noteWhen(n: any) {
  return n.createdAt ?? n.date;
}

type Props = {
  caseId: string;
  notes: any[];
  onRefresh: () => Promise<void> | void;
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
};

export default function NotesTab({ caseId, notes, onRefresh, autoOpen, onAutoOpenConsumed }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState('interna');
  const [visibility, setVisibility] = useState('equipo');

  useEffect(() => {
    if (autoOpen) {
      setShowModal(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpen, onAutoOpenConsumed]);

  const openModal = () => {
    setContent('');
    setType('interna');
    setVisibility('equipo');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      alert('Escribí el contenido de la nota.');
      return;
    }
    setSaving(true);
    try {
      await api.notes.create(caseId, {
        content: text,
        type,
        visibility,
      });
      setShowModal(false);
      setContent('');
      await onRefresh();
    } catch (err: any) {
      alert(err?.message || 'No se pudo guardar la nota');
    } finally {
      setSaving(false);
    }
  };

  const typeStyle: Record<string, string> = {
    interna: 'bg-gray-50 border-gray-200',
    estrategica: 'bg-navy-50 border-navy-200',
    cliente: 'bg-blue-50 border-blue-200',
    alerta: 'bg-red-50 border-red-200',
  };

  const list = Array.isArray(notes) ? notes : [];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Notas internas</h3>
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy-600 text-white rounded-lg hover:bg-navy-700"
          >
            <Plus size={12} /> Agregar nota
          </button>
        </div>
        {list.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            <p>No hay notas para este expediente.</p>
            <button
              type="button"
              onClick={openModal}
              className="mt-3 text-sm font-semibold text-navy-600 hover:underline"
            >
              + Crear primera nota
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((n: any) => (
              <div key={n.id} className={`rounded-xl border p-4 ${typeStyle[n.type] ?? typeStyle.interna}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        n.type === 'estrategica'
                          ? 'text-navy-700 bg-navy-100'
                          : n.type === 'cliente'
                            ? 'text-blue-700 bg-blue-100'
                            : n.type === 'alerta'
                              ? 'text-red-700 bg-red-100'
                              : 'text-gray-600 bg-gray-200'
                      }`}
                    >
                      {n.type}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">{authorLabel(n)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDateTime(noteWhen(n))}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !saving && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nueva nota</h3>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  >
                    <option value="interna">Interna</option>
                    <option value="estrategica">Estratégica</option>
                    <option value="cliente">Cliente</option>
                    <option value="alerta">Alerta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Visibilidad</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  >
                    <option value="equipo">Equipo</option>
                    <option value="todos">Todos</option>
                    <option value="coordinadores">Coordinadores</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Contenido</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                  placeholder="Escribí la nota…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-navy-600/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
