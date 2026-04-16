import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Bell, Calendar, Users,
  FileText, Settings, ChevronRight, Scale, Zap, LogOut,
} from 'lucide-react';
import { cn } from '../../utils';

const nav = [
  { label: 'Dashboard',       icon: LayoutDashboard, to: '/' },
  { label: 'Bandeja de casos', icon: FolderOpen,      to: '/casos',    badge: 3 },
  { label: 'Alertas',          icon: Bell,             to: '/alertas',  badge: 7 },
  { label: 'Agenda',           icon: Calendar,         to: '/agenda' },
  { label: 'Asignaciones',     icon: Users,            to: '/asignaciones' },
  { label: 'Documentos',       icon: FileText,         to: '/documentos' },
];

const bottom = [
  { label: 'Administración', icon: Settings, to: '/admin' },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-navy-600 text-white shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          {/* Icon mark */}
          <div className="w-9 h-9 rounded-lg bg-brand-orange flex items-center justify-center shrink-0">
            <Scale size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="text-white font-bold text-[15px] tracking-tight">MIS</span>
              <span className="text-brand-orange font-bold text-[15px] tracking-tight">RECLAMOS</span>
            </div>
            <div className="text-[10px] text-navy-200 font-semibold tracking-[0.12em] uppercase mt-0.5">
              CaseOps
            </div>
          </div>
        </div>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center text-white text-xs font-bold shrink-0">CM</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Carolina Méndez</p>
            <p className="text-navy-200 text-[10px] truncate">Coordinadora jurídica</p>
          </div>
          <ChevronRight size={12} className="text-navy-300 shrink-0" />
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-navy-300 uppercase tracking-[0.12em] px-2 mb-2">Operaciones</p>
        {nav.map(({ label, icon: Icon, to, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-navy-100 hover:bg-white/8 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span className="text-[10px] font-bold bg-brand-orange text-white px-1.5 py-0.5 rounded-full leading-none">
                    {badge}
                  </span>
                ) : null}
                {isActive && <div className="w-1 h-1 rounded-full bg-brand-orange" />}
              </>
            )}
          </NavLink>
        ))}

        <p className="text-[10px] font-semibold text-navy-300 uppercase tracking-[0.12em] px-2 mb-2 mt-5">Legal Intelligence</p>
        <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-navy-100 hover:bg-white/8 hover:text-white transition-all group">
          <Zap size={16} strokeWidth={2} className="shrink-0 group-hover:text-brand-orange transition-colors" />
          <span>Asistente IA</span>
          <span className="text-[9px] font-bold bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded-full leading-none border border-brand-orange/30">BETA</span>
        </button>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/10 pt-3">
        {bottom.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-white/15 text-white' : 'text-navy-200 hover:bg-white/8 hover:text-white'
              )
            }
          >
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-navy-200 hover:bg-white/8 hover:text-white transition-all">
          <LogOut size={16} strokeWidth={2} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
