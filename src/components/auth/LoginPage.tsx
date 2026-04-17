import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1923] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B3A6B] to-[#2563eb] flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">MisReclamos</div>
              <div className="text-[#F5900A] text-xs font-semibold tracking-widest uppercase">CaseOps</div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">Plataforma de gestión jurídica operativa</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a2535] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#0f1923] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors"
                placeholder="tu@misreclamos.com"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#0f1923] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1B3A6B] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1B3A6B] text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          MisReclamos CaseOps · Acceso restringido
        </p>
      </div>
    </div>
  );
}
