export type CaseStatus =
  | 'nuevo'
  | 'en_revision'
  | 'asignado'
  | 'en_gestion'
  | 'esperando_documentacion'
  | 'en_negociacion'
  | 'judicializado'
  | 'pausado'
  | 'cerrado'
  | 'archivado';

export type CasePriority = 'urgente' | 'alta' | 'media' | 'baja';

export type CaseMateria =
  | 'laboral'
  | 'salud'
  | 'consumidor'
  | 'sucesion'
  | 'accidente'
  | 'familia'
  | 'previsional'
  | 'civil';

export type UserRole =
  | 'admin'
  | 'coordinador'
  | 'abogado_interno'
  | 'abogado_asociado'
  | 'readonly';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  activeCases: number;
}

export interface Client {
  id: string;
  name: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  consent: boolean;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate: string;
  priority: CasePriority;
  status: 'pendiente' | 'en_curso' | 'completada' | 'vencida';
  stage?: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  date: string;
  user: string;
  action: string;
  detail?: string;
  type: 'creacion' | 'asignacion' | 'estado' | 'documento' | 'nota' | 'hito' | 'tarea' | 'legal_intel';
}

export interface Document {
  id: string;
  caseId: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  stage?: string;
  linkedLegalIntel?: boolean;
}

export interface Note {
  id: string;
  caseId: string;
  author: string;
  date: string;
  content: string;
  type: 'interna' | 'estrategica' | 'cliente' | 'alerta';
  visibility: 'todos' | 'equipo' | 'coordinadores';
}

export interface Case {
  id: string;
  caseId: string;
  title: string;
  materia: CaseMateria;
  subtype: string;
  status: CaseStatus;
  stage: string;
  priority: CasePriority;
  channel: string;
  client: Client;
  assignedLawyer?: string;
  coordinator?: string;
  createdAt: string;
  lastActivity: string;
  nextAction?: string;
  nextActionDate?: string;
  isDormant: boolean;
  isUrgent: boolean;
  summary: string;
  tasks: Task[];
  timeline: TimelineEvent[];
  documents: Document[];
  notes: Note[];
}
