import { clsx, type ClassValue } from 'clsx';
import type { CaseStatus, CasePriority, CaseMateria } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const statusConfig: Record<CaseStatus, { label: string; color: string; bg: string }> = {
  nuevo:                   { label: 'Nuevo',              color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  en_revision:             { label: 'En revisión',        color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  asignado:                { label: 'Asignado',           color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  en_gestion:              { label: 'En gestión',         color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  esperando_documentacion: { label: 'Esp. documentación', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  en_negociacion:          { label: 'En negociación',     color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  judicializado:           { label: 'Judicializado',      color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  pausado:                 { label: 'Pausado',            color: 'text-gray-600',   bg: 'bg-gray-100 border-gray-200' },
  cerrado:                 { label: 'Cerrado',            color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200' },
  archivado:               { label: 'Archivado',          color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-100' },
};

export const priorityConfig: Record<CasePriority, { label: string; color: string; dot: string }> = {
  urgente: { label: 'Urgente', color: 'text-red-600',    dot: 'bg-red-500' },
  alta:    { label: 'Alta',    color: 'text-orange-600', dot: 'bg-orange-400' },
  media:   { label: 'Media',   color: 'text-amber-600',  dot: 'bg-amber-400' },
  baja:    { label: 'Baja',    color: 'text-gray-500',   dot: 'bg-gray-300' },
};

export const materiaConfig: Record<CaseMateria, { label: string; icon: string }> = {
  laboral:      { label: 'Laboral',       icon: '⚖️' },
  salud:        { label: 'Salud',         icon: '🏥' },
  consumidor:   { label: 'Consumidor',    icon: '🛒' },
  sucesion:     { label: 'Sucesión',      icon: '📜' },
  accidente:    { label: 'Accidente',     icon: '🚗' },
  familia:      { label: 'Familia',       icon: '👨‍👩‍👧' },
  previsional:  { label: 'Previsional',   icon: '🏛️' },
  civil:        { label: 'Civil',         icon: '📋' },
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
  return `hace ${Math.floor(days / 30)} mes.`;
}
