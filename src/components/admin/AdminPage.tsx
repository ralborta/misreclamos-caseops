import { mockUsers } from '../../data/mockData';
import { Users, Tag, Activity, Shield } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  coordinador: 'Coordinador jurídico',
  abogado_interno: 'Abogado interno',
  abogado_asociado: 'Abogado asociado',
  readonly: 'Solo lectura',
};

const roleBadge: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  coordinador: 'bg-purple-50 text-purple-700 border-purple-200',
  abogado_interno: 'bg-navy-50 text-navy-700 border-navy-200',
  abogado_asociado: 'bg-blue-50 text-blue-700 border-blue-200',
  readonly: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Administración</h2>
        <p className="text-sm text-gray-500">Usuarios, roles y configuración del sistema</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Usuarios', value: mockUsers.length, color: 'text-navy-600', bg: 'bg-navy-50' },
          { icon: Tag, label: 'Materias activas', value: 8, color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: Activity, label: 'Eventos auditados', value: '1.243', color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Shield, label: 'Roles definidos', value: 5, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={15} className={s.color} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Users size={14} /> Usuarios del sistema</h3>
          <button className="px-3 py-1.5 text-xs font-semibold bg-navy-600 text-white rounded-lg hover:bg-navy-700">+ Nuevo usuario</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Usuario', 'Email', 'Rol', 'Casos activos', 'Acciones'].map(h => (
                <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 text-xs font-bold">
                      {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-[10px] font-semibold border px-2.5 py-0.5 rounded-full ${roleBadge[u.role]}`}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{u.activeCases || '—'}</td>
                <td className="px-5 py-3.5">
                  <button className="text-xs text-navy-600 hover:underline mr-3">Editar</button>
                  <button className="text-xs text-red-500 hover:underline">Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
