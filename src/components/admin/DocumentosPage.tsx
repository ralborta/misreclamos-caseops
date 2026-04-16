import { FileText, Upload, Zap, Search } from 'lucide-react';
import { mockCases } from '../../data/mockData';
import { formatDate } from '../../utils';

const allDocs = mockCases.flatMap(c =>
  c.documents.map(d => ({ ...d, caseTitle: c.title, caseId: c.caseId }))
);

export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Documentos</h2>
          <p className="text-sm text-gray-500">{allDocs.length} documentos en el sistema</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors">
          <Upload size={14} /> Subir documento
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <Search size={14} className="text-gray-400" />
          <input placeholder="Buscar documento..." className="text-sm flex-1 outline-none placeholder:text-gray-400 text-gray-700" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Documento', 'Tipo', 'Expediente', 'Subido por', 'Fecha', 'Legal Intel'].map(h => (
                <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allDocs.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
                      <FileText size={12} className="text-navy-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">{d.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><span className="text-xs text-gray-600">{d.type}</span></td>
                <td className="px-5 py-3.5">
                  <span className="font-mono text-[10px] text-gray-400 block">{(d as any).caseId}</span>
                  <span className="text-xs text-gray-600 line-clamp-1">{(d as any).caseTitle}</span>
                </td>
                <td className="px-5 py-3.5"><span className="text-xs text-gray-600">{d.uploadedBy}</span></td>
                <td className="px-5 py-3.5"><span className="text-xs text-gray-500">{formatDate(d.uploadedAt)}</span></td>
                <td className="px-5 py-3.5">
                  {d.linkedLegalIntel ? (
                    <span className="flex items-center gap-1 text-[10px] text-brand-orange font-semibold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full w-fit">
                      <Zap size={9} /> Analizado
                    </span>
                  ) : (
                    <button className="text-[10px] text-navy-600 hover:underline">Analizar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allDocs.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">No hay documentos cargados.</div>
        )}
      </div>
    </div>
  );
}
