// @ts-nocheck
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatDate } from '../../utils';
import { Upload, FileText, Zap, X } from 'lucide-react';

function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extLabel(file: File) {
  const n = file.name;
  const i = n.lastIndexOf('.');
  if (i > 0) return n.slice(i + 1).toUpperCase();
  return file.type?.split('/')[1]?.toUpperCase() || 'Archivo';
}

function uploaderName(d: any) {
  if (typeof d.uploadedBy === 'string') return d.uploadedBy;
  return d.uploadedBy?.name ?? '—';
}

function uploadedWhen(d: any) {
  return d.createdAt ?? d.uploadedAt;
}

const DOC_KINDS = [
  { value: '', label: 'Inferir del archivo' },
  { value: 'Demanda', label: 'Demanda / escrito inicial' },
  { value: 'Prueba', label: 'Prueba documental' },
  { value: 'Notificación', label: 'Notificación / cédula' },
  { value: 'Contrato', label: 'Contrato / acuerdo' },
  { value: 'Informe', label: 'Informe / dictamen' },
  { value: 'Otro', label: 'Otro' },
];

type Props = {
  caseId: string;
  documents: any[];
  onRefresh: () => Promise<void> | void;
  autoOpenUpload?: boolean;
  onAutoOpenConsumed?: () => void;
};

export default function DocumentsTab({
  caseId,
  documents,
  onRefresh,
  autoOpenUpload,
  onAutoOpenConsumed,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState('');
  const [customName, setCustomName] = useState('');
  useEffect(() => {
    if (autoOpenUpload) {
      setShowModal(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenUpload, onAutoOpenConsumed]);

  const openModal = () => {
    setFile(null);
    setKind('');
    setCustomName('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Seleccioná un archivo.');
      return;
    }
    const name = customName.trim() || file.name;
    const typeLabel = kind || extLabel(file);
    setSaving(true);
    try {
      await api.documents.create(caseId, {
        name,
        type: typeLabel,
        size: formatFileSize(file.size),
      });
      setShowModal(false);
      setFile(null);
      await onRefresh();
    } catch (err: any) {
      alert(err?.message || 'No se pudo registrar el documento');
    } finally {
      setSaving(false);
    }
  };

  const list = Array.isArray(documents) ? documents : [];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Documentos del expediente</h3>
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy-600 text-white rounded-lg hover:bg-navy-700"
          >
            <Upload size={12} /> Subir documento
          </button>
        </div>
        {list.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            <p>No hay documentos cargados aún.</p>
            <button
              type="button"
              onClick={openModal}
              className="mt-3 text-sm font-semibold text-navy-600 hover:underline"
            >
              + Registrar primer documento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {list.map((d: any) => (
              <div
                key={d.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-navy-600">{d.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-gray-400">{d.type}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[10px] text-gray-400">{d.size ?? '—'}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[10px] text-gray-400">{formatDate(uploadedWhen(d))}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[10px] text-gray-400">{uploaderName(d)}</span>
                  </div>
                </div>
                {d.linkedLegalIntel && (
                  <span className="flex items-center gap-1 text-[10px] text-brand-orange font-semibold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    <Zap size={9} /> Legal Intel
                  </span>
                )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Registrar documento</h3>
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
              <p className="text-xs text-gray-500">
                Se guarda el registro en el expediente (nombre, tipo y tamaño). El almacenamiento del archivo
                puede integrarse después con Legal Intel o tu gestor de archivos.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Archivo
                </label>
                <input
                  type="file"
                  className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {file.name} · {formatFileSize(file.size)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Tipo (opcional)
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                >
                  {DOC_KINDS.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nombre en expediente (opcional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={file?.name ?? 'Mismo nombre que el archivo'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
                  disabled={saving || !file}
                  className="flex-1 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
