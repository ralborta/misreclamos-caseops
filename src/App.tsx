import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import CasosPage from './components/cases/CasosPage';
import ExpedientePage from './components/expediente/ExpedientePage';
import AlertasPage from './components/alertas/AlertasPage';
import AgendaPage from './components/agenda/AgendaPage';
import AsignacionesPage from './components/admin/AsignacionesPage';
import DocumentosPage from './components/admin/DocumentosPage';
import AdminPage from './components/admin/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/casos" element={<CasosPage />} />
          <Route path="/casos/:id" element={<ExpedientePage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/asignaciones" element={<AsignacionesPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
