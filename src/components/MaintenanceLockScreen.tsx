import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, ShieldAlert, CheckCircle2, Globe, Unlock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WFSLogo } from './WFSLogo';

export const MaintenanceLockScreen: React.FC = () => {
  const { unlockSession, reopenSystemGlobally, company } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlockSessionOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Digite a senha de administrador para continuar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const cleanPass = password.trim();
      const localSuccess = unlockSession(cleanPass, false); // Unlock only this session
      if (localSuccess) {
        setPassword('');
        setErrorMsg('');
        return;
      }

      // Try server auth check
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ivoaltctrl@gmail.com',
          password: cleanPass,
          requiredArea: 'settings',
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        unlockSession(cleanPass, false);
        setPassword('');
        setErrorMsg('');
      } else {
        setErrorMsg(data.message || 'Senha incorreta. Apenas a senha de administrador pode liberar o acesso.');
      }
    } catch (err) {
      setErrorMsg('Senha incorreta. Verifique os dados digitados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenGlobally = async () => {
    if (!password.trim()) {
      setErrorMsg('Digite a senha de administrador para reabrir o sistema globalmente.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const cleanPass = password.trim();
      const localSuccess = unlockSession(cleanPass, true); // Re-enables globally
      if (localSuccess) {
        await reopenSystemGlobally(cleanPass);
        setPassword('');
        setErrorMsg('');
        return;
      }

      setErrorMsg('Senha incorreta. Apenas o Administrador Mestre pode reabrir o sistema.');
    } catch (err) {
      setErrorMsg('Erro ao reabrir sistema na nuvem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Top Header */}
      <header className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <WFSLogo size="sm" />
          <div className="border-l border-slate-200 pl-3">
            <span className="text-[11px] tracking-wider text-red-600 uppercase font-black">
              STATUS: FECHADO / OFFLINE NA NUVEM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            App Fora do Ar
          </span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center">
          {/* Lock Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Sistema Temporariamente Fechado
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              O status deste sistema está registrado como <strong className="text-red-700">FECHADO (Fora do Ar)</strong>. O acesso de campo e público permanece bloqueado até autorização da Gestão.
            </p>
          </div>

          {/* Alert Note */}
          <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900">
              <span className="font-bold block text-amber-950">Acesso Restrito do Administrador</span>
              Digite a senha de administrador (ex: <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950">admin</code>) para desbloquear seu acesso ou reabrir o sistema para todos os navegadores.
            </div>
          </div>

          {/* Unlock Form */}
          <form onSubmit={handleUnlockSessionOnly} className="space-y-4 pt-2 text-left">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span>Senha do Administrador</span>
                <span className="text-[10px] text-slate-400 font-normal">Privada e Confidencial</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha de acesso..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 pr-11 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-700 font-semibold bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-4 h-4 text-amber-400" />
                {isSubmitting ? 'Verificando...' : 'Acessar Apenas Minha Sessão (Manter Fora do Ar)'}
              </button>

              <button
                type="button"
                onClick={handleReopenGlobally}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Globe className="w-4 h-4" />
                🟢 Reabrir Sistema para Todos (Colocar Online)
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-4xl w-full mx-auto text-center py-4 text-[10px] text-slate-500 border-t border-slate-200">
        <p>© {new Date().getFullYear()} {company.tradeName || 'WFS'}. Todos os direitos reservados. Governança e Proteção de Dados.</p>
      </footer>
    </div>
  );
};
