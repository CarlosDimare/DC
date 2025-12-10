import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, Activity } from 'lucide-react';

interface LoginOverlayProps {
  onLoginSuccess: () => void;
}

const LoginOverlay: React.FC<LoginOverlayProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Obtener credenciales seguras
    // Access via any cast to avoid TS errors with import.meta.env
    const meta = import.meta as any;
    const env = meta.env || {};

    // Fallback to hardcoded values if env vars are missing
    const VALID_USER = env.VITE_LOGIN_USER || "Dimare";
    const VALID_PASS = env.VITE_LOGIN_PASS || "Murga";

    // Simular un pequeño delay para efecto dramático de "procesando"
    setTimeout(() => {
      // Verificar coincidencia exacta
      if (username === VALID_USER && password === VALID_PASS) {
        onLoginSuccess();
      } else {
        setError(true);
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-neutral-900 border-2 border-neutral-800 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Bar */}
        <div className="h-2 w-full bg-red-700"></div>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-800 rounded-full mb-4 border border-neutral-700 shadow-inner">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
              Sistema de Inteligencia
            </h1>
            <p className="text-red-500 font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Acceso Restringido
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                Operador (Usuario)
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full bg-neutral-950 border ${error ? 'border-red-500 animate-pulse' : 'border-neutral-700 focus:border-red-600'} text-white px-4 py-3 outline-none transition-colors font-mono text-sm`}
                placeholder="Identificación..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                Clave de Acceso
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-neutral-950 border ${error ? 'border-red-500 animate-pulse' : 'border-neutral-700 focus:border-red-600'} text-white px-4 py-3 outline-none transition-colors font-mono text-sm`}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/50 p-3 text-red-500 text-xs font-bold uppercase flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <ShieldAlert className="w-4 h-4" /> Credenciales Inválidas
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 uppercase tracking-wider transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  Ingresar al Sistema <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="bg-neutral-950 py-3 text-center border-t border-neutral-800">
           <p className="text-[10px] text-neutral-600 font-mono uppercase">
             SN Intelligence Division v2.5
           </p>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;