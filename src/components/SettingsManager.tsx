import React, { useState } from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  Key,
  Lock,
  Power,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CompanyProfile } from '../types';
import { ResetSystemModal } from './ResetSystemModal';

export const SettingsManager: React.FC = () => {
  const {
    company,
    setCompany,
    orders,
    invoices,
    clients,
    equipments,
    laborServices,
    isMaintenanceMode,
    setMaintenanceMode,
    changeMasterPassword,
    lockSession,
  } = useApp();

  const [formData, setFormData] = useState<CompanyProfile>({ ...company });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: keyof CompanyProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCompany(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (!currentPassword) {
      setPassMsg({ type: 'error', text: 'Informe a senha atual.' });
      return;
    }

    if (newPassword.length < 4) {
      setPassMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 4 dígitos.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPassMsg({ type: 'error', text: 'A confirmação de nova senha não confere.' });
      return;
    }

    const res = changeMasterPassword(currentPassword, newPassword);
    if (res.success) {
      setPassMsg({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setPassMsg({ type: 'error', text: res.message });
    }
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      company: formData,
      clients,
      equipments,
      laborServices,
      orders,
      invoices,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_OS_Digital_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <h2 className="text-xl font-black text-slate-900">Configurações, Segurança & Dados</h2>
        <p className="text-xs text-slate-500">
          Personalize dados fiscais, bloqueio de acesso (tirar do ar), senha de administrador e gerenciamento de banco
        </p>
      </div>

      {/* 1. SEÇÃO DE BLOQUEIO / MODO MANUTENÇÃO (TIRAR APP DO AR) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isMaintenanceMode ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
              {isMaintenanceMode ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Tirar App do Ar / Modo Manutenção</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isMaintenanceMode ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
                  {isMaintenanceMode ? '● OFFLINE / BLOQUEADO' : '● ONLINE / ATIVO'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ao ativar, qualquer pessoa que acessar o link verá uma tela de bloqueio e precisará da senha mestra para entrar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const newStatus = !isMaintenanceMode;
              if (newStatus) {
                if (confirm('Deseja TIRAR O APP DO AR agora? Usuários precisarão de senha para desbloquear.')) {
                  setMaintenanceMode(true);
                }
              } else {
                setMaintenanceMode(false);
              }
            }}
            className={`px-5 py-2.5 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              isMaintenanceMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
            }`}
          >
            <Power className="w-4 h-4" />
            {isMaintenanceMode ? 'Reativar e Colocar Online' : 'Tirar App do Ar Agora'}
          </button>
        </div>

        {/* Alteração de Senha Master Segura (sem exibir texto) */}
        <form onSubmit={handleChangePasswordSubmit} className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-slate-200">Alterar Senha Mestra do Administrador</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Senha Atual *</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nova Senha *</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="Nova senha secreta"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirmar Nova Senha *</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl whitespace-nowrap border border-slate-700"
                >
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {passMsg && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold ${passMsg.type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900' : 'bg-red-950/80 text-red-400 border border-red-900'}`}>
              {passMsg.text}
            </div>
          )}
        </form>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Dados da Prestadora / Locadora</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Razão Social *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">CNPJ *</label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Inscrição Estadual</label>
              <input
                type="text"
                value={formData.stateRegistration || ''}
                onChange={(e) => handleChange('stateRegistration', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp Comercial</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">E-mail de Faturamento</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Endereço Completo</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>
          </div>
        </div>

        {/* Financial & PIX Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Key className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Chave PIX e Dados Bancários (Para Cobrança Imediata)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chave PIX Principal *</label>
              <input
                type="text"
                required
                value={formData.pixKey}
                onChange={(e) => handleChange('pixKey', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Dados Bancários / Instruções</label>
              <input
                type="text"
                value={formData.bankInfo}
                onChange={(e) => handleChange('bankInfo', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Alerta de Atraso de Faturamento (Horas)
              </label>
              <select
                value={formData.billingAlertHours}
                onChange={(e) => handleChange('billingAlertHours', Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-semibold"
              >
                <option value="6">Alertar após 6 horas de conclusão</option>
                <option value="12">Alertar após 12 horas de conclusão</option>
                <option value="24">Alertar após 24 horas de conclusão (Recomendado)</option>
                <option value="48">Alertar após 48 horas de conclusão</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legal Terms of Acceptance */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Termo de Aceite e Responsabilidade de Campo
            </h3>
          </div>

          <p className="text-slate-500">
            Este texto é exibido para o cliente no momento da assinatura digital na obra ou entrega técnica do equipamento.
          </p>

          <textarea
            rows={4}
            value={formData.defaultTerms}
            onChange={(e) => handleChange('defaultTerms', e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-3 leading-relaxed"
          />
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
              </span>
            )}
          </div>
          <button
            type="submit"
            className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </button>
        </div>
      </form>

      {/* Database Backup & Reset */}
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-800">Gerenciamento de Dados & Limpeza de Exemplos</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {orders.length} OSs • {invoices.length} Faturas
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Exporte o backup completo do sistema em JSON ou utilize a opção de zerar os dados de exemplo para iniciar o uso real com banco de dados limpo.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" /> Exportar Backup do Sistema (JSON)
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Zerar Sistema / Limpar Exemplos
          </button>
        </div>
      </div>

      {/* Modal de Limpeza e Zerar Sistema */}
      <ResetSystemModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};

