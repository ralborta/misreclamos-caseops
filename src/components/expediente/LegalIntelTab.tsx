// @ts-nocheck
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import {
  FileText,
  Edit2,
  MessageSquare,
  Activity,
  Zap,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

function fmtSize(bytes: number) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extFromName(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toUpperCase() : 'Archivo';
}

/** Respuesta típica de /legal/upload en legal-tec — ajustar si tu API usa otro campo */
function extractLegalIntelDocId(data: unknown): string | null {
  const keys = ['legalIntelDocumentId', 'documentId', 'document_id', 'id'];
  const visited = new Set<unknown>();
  const stack: unknown[] = [data];

  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur == null || typeof cur !== 'object') continue;
    if (visited.has(cur)) continue;
    visited.add(cur);

    const obj = cur as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return null;
}

function ResultBlock({ data }: { data: unknown }) {
  const text =
    typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2);
  return (
    <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 text-gray-100 text-xs p-3 whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

function extractReadableResult(data: any): { title: string; body: string; raw: unknown } {
  if (!data || typeof data !== 'object') {
    return {
      title: 'Resultado de análisis',
      body: typeof data === 'string' ? data : 'Sin contenido legible.',
      raw: data,
    };
  }

  const obj = data as Record<string, any>;
  const analysis = obj.analysis && typeof obj.analysis === 'object' ? obj.analysis : null;
  const report = analysis?.report;
  const original = analysis?.original;

  const reportText =
    typeof report === 'string'
      ? report
      : '';

  const originalText =
    typeof original === 'string'
      ? original
      : original && typeof original === 'object' && typeof original.text === 'string'
        ? original.text
        : '';

  const formatList = (items: any[] | undefined, mapItem: (x: any, i: number) => string) =>
    Array.isArray(items) && items.length > 0 ? items.map(mapItem).join('\n') : '';

  const formatReportObject = (r: Record<string, any>) => {
    const parts: string[] = [];
    if (r.titulo) parts.push(`# ${r.titulo}`);
    if (r.tipo_documento || r.jurisdiccion || r.area_legal) {
      parts.push(
        [
          r.tipo_documento ? `Tipo: ${r.tipo_documento}` : '',
          r.jurisdiccion ? `Jurisdicción: ${r.jurisdiccion}` : '',
          r.area_legal ? `Área legal: ${r.area_legal}` : '',
        ].filter(Boolean).join(' | '),
      );
    }
    if (r.resumen_ejecutivo) parts.push(`\n## Resumen ejecutivo\n${r.resumen_ejecutivo}`);
    if (r.analisis_juridico) parts.push(`\n## Análisis jurídico\n${r.analisis_juridico}`);

    const clausulas = formatList(r.clausulas_analizadas, (c, i) => {
      const n = c.numero ? `${c.numero}` : `${i + 1}`;
      const t = c.titulo ? ` — ${c.titulo}` : '';
      const riesgo = c.riesgo ? `\nRiesgo: ${c.riesgo}` : '';
      return `### Cláusula ${n}${t}\n${c.analisis || 'Sin análisis'}${riesgo}`;
    });
    if (clausulas) parts.push(`\n## Cláusulas analizadas\n${clausulas}`);

    const riesgos = formatList(r.riesgos, (ri, i) => `- ${i + 1}. ${ri.descripcion || 'Riesgo'}${ri.nivel ? ` (nivel: ${ri.nivel})` : ''}${ri.recomendacion ? `\n  Recomendación: ${ri.recomendacion}` : ''}`);
    if (riesgos) parts.push(`\n## Riesgos\n${riesgos}`);

    const recomendaciones = formatList(r.recomendaciones, (rec, i) => {
      const meta = [rec.prioridad ? `prioridad: ${rec.prioridad}` : '', rec.urgencia ? `urgencia: ${rec.urgencia}` : ''].filter(Boolean).join(', ');
      return `- ${i + 1}. ${rec.descripcion || 'Recomendación'}${meta ? ` (${meta})` : ''}`;
    });
    if (recomendaciones) parts.push(`\n## Recomendaciones\n${recomendaciones}`);

    const proximos = formatList(r.proximos_pasos, (p, i) => `- ${i + 1}. ${p.accion || 'Paso'}${p.fecha_limite ? ` (fecha límite: ${p.fecha_limite})` : ''}${p.responsable ? ` — Responsable: ${p.responsable}` : ''}`);
    if (proximos) parts.push(`\n## Próximos pasos\n${proximos}`);

    return parts.join('\n');
  };

  const reportPretty =
    report && typeof report === 'object'
      ? formatReportObject(report as Record<string, any>) || JSON.stringify(report, null, 2)
      : reportText;

  const header = obj.filename ? `Documento: ${obj.filename}\n` : '';
  const body = [header, reportPretty ? `=== ANÁLISIS ===\n${reportPretty}` : '', originalText ? `\n=== TEXTO EXTRAÍDO ===\n${originalText}` : '']
    .filter(Boolean)
    .join('\n');

  return {
    title: obj.filename ? `Resultado — ${obj.filename}` : 'Resultado de análisis',
    body: body || 'No hay contenido de análisis disponible.',
    raw: data,
  };
}

type Panel = null | 'analyze' | 'generate' | 'query' | 'history';

type Props = {
  caso: any;
  caseId: string;
  onRefresh: () => Promise<void> | void;
};

export default function LegalIntelTab({ caso, caseId, onRefresh }: Props) {
  const documents = Array.isArray(caso?.documents) ? caso.documents : [];
  const analyzed = documents.filter((d: any) => d.linkedLegalIntel);
  const withLiId = documents.filter((d: any) => d.legalIntelDocumentId);

  const [panel, setPanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [pollingDocId, setPollingDocId] = useState<string | null>(null);
  const [pollingLabel, setPollingLabel] = useState('');
  const [fullResultOpen, setFullResultOpen] = useState(false);
  const [fullResultData, setFullResultData] = useState<unknown>(null);

  // Analizar
  const [file, setFile] = useState<File | null>(null);
  const [analyzeInstructions, setAnalyzeInstructions] = useState('');

  // Generar
  const [genType, setGenType] = useState<'dictamen' | 'contrato' | 'memo' | 'escrito'>('escrito');
  const [genTitle, setGenTitle] = useState('');
  const [genInstructions, setGenInstructions] = useState('');

  // Consultar
  const [queryDocId, setQueryDocId] = useState('');
  const [queryText, setQueryText] = useState('');

  const close = () => {
    setPanel(null);
    setLastResult(null);
    setPollingDocId(null);
    setPollingLabel('');
    setFullResultOpen(false);
    setFullResultData(null);
  };

  const runAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Seleccioná un archivo.');
      return;
    }
    setLoading(true);
    setLastResult(null);
    try {
      const uploadRes = await api.legalIntel.upload(file);
      const liId = extractLegalIntelDocId(uploadRes);
      if (!liId) {
        setLastResult(uploadRes);
        alert(
          'Subida OK pero no se pudo leer el ID del documento en Legal Intel. Revisá la respuesta abajo o la configuración de LEGAL_INTEL_URL.'
        );
        setLoading(false);
        return;
      }
      const meta = await api.documents.create(caseId, {
        name: file.name,
        type: extFromName(file.name),
        size: fmtSize(file.size),
      });
      const analysis = await api.documents.analyze(caseId, meta.id, {
        legalIntelDocumentId: liId,
        instructions: analyzeInstructions.trim() || undefined,
      });
      setLastResult(analysis);
      await onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Error al analizar');
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = genTitle.trim();
    const instructions = genInstructions.trim();
    if (title.length < 3) {
      alert('El título debe tener al menos 3 caracteres.');
      return;
    }
    if (instructions.length < 10) {
      alert('Las instrucciones deben tener al menos 10 caracteres.');
      return;
    }
    setLoading(true);
    setLastResult(null);
    try {
      const out = await api.legalIntel.generate({ type: genType, title, instructions });
      setLastResult(out);
    } catch (err: any) {
      alert(err?.message || 'Error al generar');
    } finally {
      setLoading(false);
    }
  };

  const runQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = queryDocId.trim();
    const q = queryText.trim();
    if (!docId) {
      alert('Indicá el ID del documento en Legal Intel.');
      return;
    }
    if (q.length < 5) {
      alert('La consulta debe tener al menos 5 caracteres.');
      return;
    }
    setLoading(true);
    setLastResult(null);
    try {
      const out = await api.legalIntel.query({ documentId: docId, query: q });
      setLastResult(out);
    } catch (err: any) {
      alert(err?.message || 'Error en la consulta');
    } finally {
      setLoading(false);
    }
  };

  const fetchResult = async (liDocumentId: string) => {
    setLoading(true);
    setLastResult(null);
    try {
      const out = await api.legalIntel.result(liDocumentId);
      setLastResult(out);
      if (out && typeof out === 'object' && (out as any).status === 'processing') {
        setPollingDocId(liDocumentId);
        setPollingLabel('Análisis en curso. Actualizando automáticamente...');
      } else {
        setPollingDocId(null);
        setPollingLabel('');
        setFullResultData(out);
        setFullResultOpen(true);
      }
    } catch (err: any) {
      alert(err?.message || 'No se pudo obtener el resultado');
      setPollingDocId(null);
      setPollingLabel('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pollingDocId) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const status = await api.legalIntel.status(pollingDocId) as any;
        if (!status || typeof status !== 'object') return;

        if (status.status === 'completed') {
          const out = await api.legalIntel.result(pollingDocId);
          if (cancelled) return;
          setLastResult(out);
          setPollingDocId(null);
          setPollingLabel('');
          setFullResultData(out);
          setFullResultOpen(true);
          await onRefresh();
        } else if (status.status === 'error') {
          if (cancelled) return;
          setLastResult(status);
          setPollingDocId(null);
          setPollingLabel('');
        }
      } catch {
        // silenciar errores transitorios de polling
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollingDocId, onRefresh]);

  const cards: { key: Panel; icon: typeof FileText; label: string; desc: string }[] = [
    {
      key: 'analyze',
      icon: FileText,
      label: 'Analizar documento',
      desc: 'Subí un documento y obtené análisis jurídico inmediato',
    },
    {
      key: 'generate',
      icon: Edit2,
      label: 'Generar escrito',
      desc: 'Creá borradores de telegramas, demandas, amparos y más',
    },
    {
      key: 'query',
      icon: MessageSquare,
      label: 'Consultar sobre el caso',
      desc: 'Hacé preguntas con un documento ya indexado en Legal Intel',
    },
    {
      key: 'history',
      icon: Activity,
      label: 'Ver análisis previos',
      desc: `${analyzed.length} documento(s) ya analizados`,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
            <Zap size={16} className="text-brand-orange" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Legal Intelligence</h3>
            <p className="text-navy-200 text-[11px]">
              Conectado al backend CaseOps → servicio configurado en{' '}
              <code className="text-navy-100">LEGAL_INTEL_URL</code>
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {cards.map((a) => {
          const active = panel === a.key;
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => {
                setLastResult(null);
                setPanel(a.key);
              }}
              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left rounded-xl border transition-all group ${
                active
                  ? 'border-navy-600 ring-2 ring-navy-500/30 bg-navy-50/50'
                  : 'border-gray-200 hover:border-navy-300 hover:bg-navy-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  active ? 'bg-navy-200' : 'bg-navy-100 group-hover:bg-navy-200'
                }`}
              >
                <Icon size={15} className="text-navy-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-navy-700">{a.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{a.desc}</p>
              </div>
              <ChevronRight size={14} className="text-gray-400 ml-auto mt-1 shrink-0 group-hover:text-navy-500" />
            </button>
          );
        })}
      </div>

      {panel && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !loading && close()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">
                {panel === 'analyze' && 'Analizar documento'}
                {panel === 'generate' && 'Generar escrito'}
                {panel === 'query' && 'Consultar sobre el documento'}
                {panel === 'history' && 'Análisis previos'}
              </h3>
              <button type="button" disabled={loading} onClick={close} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4">
              {panel === 'analyze' && (
                <form onSubmit={runAnalyze} className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Se sube el archivo al servicio Legal Intel, se registra en el expediente y se dispara el análisis.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Archivo</label>
                    <input
                      type="file"
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      Instrucciones (opcional)
                    </label>
                    <textarea
                      value={analyzeInstructions}
                      onChange={(e) => setAnalyzeInstructions(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej.: Enfocate en prescripción y legitimación..."
                    />
                  </div>
                  {lastResult != null && <ResultBlock data={lastResult} />}
                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="w-full py-2.5 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? 'Procesando…' : 'Subir y analizar'}
                  </button>
                </form>
              )}

              {panel === 'generate' && (
                <form onSubmit={runGenerate} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Tipo</label>
                    <select
                      value={genType}
                      onChange={(e) => setGenType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                    >
                      <option value="escrito">Escrito</option>
                      <option value="dictamen">Dictamen</option>
                      <option value="contrato">Contrato</option>
                      <option value="memo">Memo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Título</label>
                    <input
                      value={genTitle}
                      onChange={(e) => setGenTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej.: Contestación de demanda"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Instrucciones</label>
                    <textarea
                      value={genInstructions}
                      onChange={(e) => setGenInstructions(e.target.value)}
                      rows={6}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Mínimo 10 caracteres: hechos, tono, fundamentos deseados..."
                    />
                  </div>
                  {lastResult != null && <ResultBlock data={lastResult} />}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? 'Generando…' : 'Generar'}
                  </button>
                </form>
              )}

              {panel === 'query' && (
                <form onSubmit={runQuery} className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Usá el ID que devuelve Legal Intel al subir o indexar un documento (no es el ID interno de CaseOps).
                  </p>
                  {withLiId.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                        Documentos de este expediente con ID LI
                      </label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setQueryDocId(e.target.value);
                        }}
                      >
                        <option value="">Elegir para rellenar el ID…</option>
                        {withLiId.map((d: any) => (
                          <option key={d.id} value={d.legalIntelDocumentId}>
                            {d.name} — {d.legalIntelDocumentId.slice(0, 8)}…
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      ID documento (Legal Intel)
                    </label>
                    <input
                      value={queryDocId}
                      onChange={(e) => setQueryDocId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                      placeholder="pega el UUID / id del servicio"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Pregunta</label>
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Mínimo 5 caracteres"
                    />
                  </div>
                  {lastResult != null && <ResultBlock data={lastResult} />}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? 'Consultando…' : 'Enviar consulta'}
                  </button>
                </form>
              )}

              {panel === 'history' && (
                <div className="space-y-3">
                  {analyzed.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      Todavía no hay documentos marcados como analizados con Legal Intel en este expediente.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {analyzed.map((d: any) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                            {d.legalIntelDocumentId && (
                              <p className="text-[10px] text-gray-400 font-mono truncate">
                                LI: {d.legalIntelDocumentId}
                              </p>
                            )}
                          </div>
                          {d.legalIntelDocumentId && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => fetchResult(d.legalIntelDocumentId)}
                              className="shrink-0 text-xs font-semibold text-navy-600 hover:underline"
                            >
                              Ver resultado
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {pollingDocId && (
                    <p className="text-xs text-navy-600 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
                      {pollingLabel}
                    </p>
                  )}
                  {lastResult != null && <ResultBlock data={lastResult} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fullResultOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setFullResultOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{extractReadableResult(fullResultData).title}</h3>
              <button
                type="button"
                onClick={() => setFullResultOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-0 min-h-0 flex-1">
              <div className="col-span-2 p-4 overflow-auto border-r border-gray-100">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {extractReadableResult(fullResultData).body}
                </pre>
              </div>
              <div className="col-span-1 p-4 overflow-auto bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">JSON crudo</p>
                <pre className="text-[11px] text-gray-700 whitespace-pre-wrap break-words">
                  {JSON.stringify(extractReadableResult(fullResultData).raw, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
