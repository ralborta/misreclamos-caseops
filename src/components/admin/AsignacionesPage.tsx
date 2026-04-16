import { mockUsers, mockCases } from '../../data/mockData';
import { FolderOpen, Plus } from 'lucide-react';

export default function AsignacionesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Panel de asignaciones</h2>
          <p className="text-sm text-gray-500">Gestión y distribución de carga por abogado</p>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {mockUsers.filter(u => u.role.startsWith('abogado')).map(u => {
          const assigned = mockCases.filter(c => c.assignedLawyer === u.name);
          const urgentes = assigned.filter(c => c.isUrgent).length;
          return (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-sm">
                  {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{u.role.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <FolderOpen size={13} className="text-navy-500" />
                  <span className="font-bold text-navy-700">{assigned.length}</span>
                  <span className="text-gray-500 text-xs">casos</span>
                </div>
                {urgentes > 0 && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{urgentes} urgente{urgentes > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((assigned.length / 20) * 100, 100)}%`,
                    backgroundColor: assigned.length > 12 ? '#EF4444' : assigned.length > 8 ? '#F5900A' : '#1B3A6B',
                  }}
                />
              </div>
              <div className="space-y-1.5">
                {assigned.slice(0, 3).map(c => (
                  <div key={c.id} className="text-[11px] text-gray-600 truncate bg-gray-50 rounded px-2 py-1">
                    <span className="font-mono text-gray-400 mr-1">{c.caseId}</span>{c.client.name}
                  </div>
                ))}
                {assigned.length > 3 && <p className="text-[10px] text-gray-400 pl-2">+{assigned.length - 3} más</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned */}
      <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
        <div className="bg-orange-50 px-5 py-3.5 border-b border-orange-200">
          <h3 className="text-sm font-semibold text-orange-700">Sin abogado asignado ({mockCases.filter(c => !c.assignedLawyer).length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {mockCases.filter(c => !c.assignedLawyer).map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[10px] text-gray-400">{c.caseId}</span>
                <p className="text-sm font-medium text-gray-800">{c.title}</p>
                <p className="text-[11px] text-gray-400">{c.materia} · {c.createdAt.split('T')[0]}</p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors">
                <Plus size={11} /> Asignar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
