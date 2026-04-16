import { Search, Bell, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/':             'Dashboard',
  '/casos':        'Bandeja de casos',
  '/alertas':      'Panel de alertas',
  '/agenda':       'Agenda y tareas',
  '/asignaciones': 'Panel de asignaciones',
  '/documentos':   'Documentos',
  '/admin':        'Administración',
};

export default function Topbar() {
  const location = useLocation();
  const title = titles[location.pathname] ?? 'CaseOps';

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar caso, cliente, ID..."
          className="w-64 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-400 transition-all"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-200 px-1 rounded">⌘K</kbd>
      </div>

      {/* Actions */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-brand-orange-dark transition-colors shadow-sm">
        <Plus size={14} strokeWidth={2.5} />
        Nuevo caso
      </button>

      <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
        <Bell size={16} className="text-gray-600" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button>
    </header>
  );
}
