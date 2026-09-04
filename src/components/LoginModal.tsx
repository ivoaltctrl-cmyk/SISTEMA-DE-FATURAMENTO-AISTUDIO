import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WFSLogo } from './WFSLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredArea: 'executive' | 'settings';
  title?: string;
  subtitle?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requiredArea,
  title,
  subtitle,
}) => {
  const { loginCorporateUser, changeUserPassword } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // First access state
  const [isFirstAccessMode, setIsFirstAccessMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userEmailPendingChange, setUserEmailPendingChange] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await loginCorporateUser(email, password, requiredArea);
      setIsLoading(false);

      if (res.success) {
        if (res.mustChangePassword) {
          // Trigger first access flow
          setUserEmailPendingChange(res.user?.email || email.trim().toLowerCase());
          setIsFirstAccessMode(true);
        } else {
          setEmail('');
          setPassword('');
          onSuccess();
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Erro ao comunicar com o servidor.');
    }
  };

  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 3) {
      setErrorMsg('A nova senha deve conter no mínimo 3 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changeUserPassword(userEmailPendingChange, password, newPassword);
      setIsLoading(false);

      if (res.success) {
        setIsFirstAccessMode(false);
        setEmail('');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onSuccess();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Erro ao registrar nova senha.');
    }
  };

  const handleClose = () => {
    setIsFirstAccessMode(false);
    setErrorMsg(null);
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const areaTitle =
    title ||
    (requiredArea === 'settings'
      ? 'Acesso ao Painel de Configurações'
      : 'Acesso ao Painel Executivo');
  const areaDesc =
    subtitle ||
    (requiredArea === 'settings'
      ? 'Área restrita a Supervisores, Administradores e TI. Digite seu e-mail corporativo e senha cadastrados.'
      : 'Área restrita à Gestão, Faturamento e Supervisão. Digite seu e-mail corporativo e senha cadastrados.');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo & Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center py-1">
            <img
              src="/wfs-logo.png"
              alt="WFS – A SATS Company"
              referrerPolicy="no-referrer"
              className="h-12 sm:h-14 w-auto max-w-[220px] object-contain select-none transition-transform"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('Imagem1.png')) {
                  target.src = '/Imagem1.png';
                }
              }}
            />
          </div>

          {!isFirstAccessMode ? (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-800">
                <Lock className="w-3 h-3 text-red-600" />
                <span>Autenticação Corporativa</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{areaTitle}</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {areaDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-black uppercase tracking-wider text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>Primeiro Acesso / Redefinição</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Crie sua Senha Pessoal</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                Por governança e segurança operacional, você deve definir sua nova senha individual para continuar.
              </p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* 1. Standard Login Form */}
        {!isFirstAccessMode ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>E-mail Corporativo ou Usuário</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: ivoaltctrl@gmail.com ou mariana.costa@wfs.aero"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Senha de Acesso</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha cadastrada..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-11 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Validando Credenciais no Servidor...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* 2. First Access Change Password Form */
          <form onSubmit={handleFirstAccessSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-amber-900 text-[11px]">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block font-black">Conta: {userEmailPendingChange}</strong>
                Crie uma senha de acesso forte e memorável para os seus próximos logins.
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nova Senha Pessoal</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Mínimo 3 dígitos</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-11 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirmar Nova Senha</span>
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Redigite sua nova senha..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Salvando no Servidor...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Salvar Minha Nova Senha & Acessar</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Administrador Mestre: <strong>ivoaltctrl@gmail.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
