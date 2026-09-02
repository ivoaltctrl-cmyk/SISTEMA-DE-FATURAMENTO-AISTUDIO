import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bot,
  Building2,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Key,
  Lock,
  LogOut,
  Power,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  Truck,
  Unlock,
  UserCheck,
  Users,
  Wifi,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CompanyProfile } from '../types';
import { ResetSystemModal } from './ResetSystemModal';
import { SheetsSyncManager } from './SheetsSyncManager';
import { TeamsIntegrationModal } from './TeamsIntegrationModal';
import { ClientsManager } from './ClientsManager';
import { CatalogManager } from './CatalogManager';
import { DeletedOrdersManager } from './DeletedOrdersManager';
import { UsersManager } from './UsersManager';
import { WFSLogo } from './WFSLogo';
import { testFrontBackConnection } from '../services/cloudSyncService';
import {
  OFFICIAL_SHEET_URL,
  OFFICIAL_SHEET_ID,
  fetchSheetSystemStatus,
  updateSheetSystemStatus,
} from '../services/sheetsService';

interface MasterGovernancePortalProps {
  onBackToExecutive: () => void;
  onBackToField: () => void;
}

export const MasterGovernancePortal: React.FC<MasterGovernancePortalProps> = ({
  onBackToExecutive,
  onBackToField,
}) => {
  const {
    company,
    setCompany,
    orders,
    invoices,
    clients,
    equipments,
    users,
    deletedOrders,
    isMaintenanceMode,
    setMaintenanceMode,
    changeMasterPassword,
    lockSession,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<
    'usuarios' | 'sheets' | 'company' | 'clientes' | 'catalogo' | 'excluidos' | 'teams' | 'security' | 'data'
  >('usuarios');
  const [showTeamsModal, setShowTeamsModal] = useState(false);

  // Company Form state
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

  // Connection test state
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{
    connected: boolean;
    latencyMs: number;
    message: string;
    timestamp: string;
    data?: any;
  } | null>(null);

  // Google Sheets Status Tab state
  const [isCheckingSheetStatus, setIsCheckingSheetStatus] = useState(false);
  const [sheetStatusResult, setSheetStatusResult] = useState<{
    status: 'ABERTO' | 'FECHADO';
    source: string;
    rawText?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    try {
      const res = await testFrontBackConnection();
      setConnTestResult(res);
    } catch (err: any) {
      setConnTestResult({
        connected: false,
        latencyMs: 0,
        message: err.message || 'Erro ao testar conexão com o servidor.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleCheckSheetStatus = async () => {
    setIsCheckingSheetStatus(true);
    try {
      const res = await fetchSheetSystemStatus();
      setSheetStatusResult(res);
    } finally {
      setIsCheckingSheetStatus(false);
    }
  };

  const handleCompanyChange = (field: keyof CompanyProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCompany = (e: React.FormEvent) => {
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
      exportDate: new Date().toISOString(),
      company,
      clients,
      equipments,
      orders,
      invoices,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_wfs_sistema_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <WFSLogo size="sm" variant="color" />
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-slate-900 uppercase flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-red-600" />
                  PAINEL DE CONFIGURAÇÕES
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                  🔒 ÁREA RESTRITA
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Sincronizações, integrações, dados da empresa, segurança e governança
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToExecutive}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Voltar ao Painel Executivo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                lockSession();
                onBackToExecutive();
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
              title="Bloquear sessão de configurações"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Bloquear Painel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('usuarios')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'usuarios'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Usuários & Privilégios ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sheets')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'sheets'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets & Scripts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('company')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'company'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Empresa & PIX</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('clientes')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'clientes'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes ({clients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('catalogo')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'catalogo'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Equipamentos ({equipments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('excluidos')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'excluidos'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>OSs Excluídas / Auditoria ({deletedOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('teams')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'teams'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Microsoft Teams</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('security')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'security'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Segurança</span>
            {isMaintenanceMode && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('data')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'data'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Backup & Zeramento</span>
          </button>
        </div>

        {/* SUB-TAB 0: USUÁRIOS & PRIVILÉGIOS */}
        {activeSubTab === 'usuarios' && (
          <UsersManager />
        )}

        {/* SUB-TAB 1: GOOGLE SHEETS & APPS SCRIPT */}
        {activeSubTab === 'sheets' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Integração Google Sheets & Apps Script</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure a sincronização bidirecional em tempo real com a planilha do Google Sheets, copie o código do Apps Script e gerencie os gatilhos automáticos.
              </p>
            </div>

            {/* Sheets Sync Manager */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-2xs">
              <SheetsSyncManager />
            </div>
          </div>
        )}

        {/* SUB-TAB 2: CONFIGURAÇÕES DA EMPRESA & TERMOS */}
        {activeSubTab === 'company' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Building2 className="w-5 h-5 text-red-600" />
                <span>Dados Fiscais, Chave PIX & Termos de Aceite</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estes dados são impressos nas faturas oficiais, ordens de serviço e exibidos na tela de assinatura do cliente no campo.
              </p>
            </div>

            {savedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Configurações da empresa salvas com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-6 text-xs text-slate-700">
              {/* Card 1: Fiscal */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Dados Cadastrais & Fiscais</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleCompanyChange('name', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome Fantasia *</label>
                    <input
                      type="text"
                      required
                      value={formData.tradeName || ''}
                      onChange={(e) => handleCompanyChange('tradeName', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CNPJ *</label>
                    <input
                      type="text"
                      required
                      value={formData.cnpj}
                      onChange={(e) => handleCompanyChange('cnpj', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inscrição Estadual / Municipal</label>
                    <input
                      type="text"
                      value={formData.stateRegistration || ''}
                      onChange={(e) => handleCompanyChange('stateRegistration', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-mail Operacional *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleCompanyChange('email', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cidade / UF *</label>
                    <input
                      type="text"
                      required
                      value={formData.cityState}
                      onChange={(e) => handleCompanyChange('cityState', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: PIX */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Chave PIX & Dados Bancários</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chave PIX Principal *</label>
                    <input
                      type="text"
                      required
                      value={formData.pixKey || ''}
                      onChange={(e) => handleCompanyChange('pixKey', e.target.value)}
                      placeholder="CNPJ, Celular, E-mail ou Chave Aleatória"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dados Bancários / Beneficiário *</label>
                    <input
                      type="text"
                      required
                      value={formData.bankInfo || ''}
                      onChange={(e) => handleCompanyChange('bankInfo', e.target.value)}
                      placeholder="Ex: Banco Itaú - Ag 0001 CC 12345-6 (WFS BRASIL)"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Termos */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Termo de Aceite & Assinatura de Campo</h3>
                <p className="text-[11px] text-slate-500">
                  Texto legal que o cliente lê antes de assinar no celular ou tablet no momento da entrega do serviço.
                </p>

                <textarea
                  rows={4}
                  value={formData.defaultTerms || ''}
                  onChange={(e) => handleCompanyChange('defaultTerms', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-7 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-2xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Salvar Configurações Fiscais
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SUB-TAB: CLIENTES */}
        {activeSubTab === 'clientes' && (
          <div className="space-y-4">
            <ClientsManager />
          </div>
        )}

        {/* SUB-TAB: CATALOGO & EQUIPAMENTOS */}
        {activeSubTab === 'catalogo' && (
          <div className="space-y-4">
            <CatalogManager />
          </div>
        )}

        {/* SUB-TAB: OSS EXCLUÍDAS / AUDITORIA */}
        {activeSubTab === 'excluidos' && (
          <div className="space-y-4">
            <DeletedOrdersManager />
          </div>
        )}

        {/* SUB-TAB: INTEGRAÇÃO MICROSOFT TEAMS */}
        {activeSubTab === 'teams' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-700 font-black text-sm">
                <Bot className="w-5 h-5 text-indigo-600" />
                <span>Integração Microsoft Teams & Leitura Inteligente de Fotos</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Configure a automação para que fotos e canhotos de OS postados nos canais ou grupos do Microsoft Teams da sua equipe de campo sejam automaticamente convertidos em ordens de serviço digitais e enviadas para a esteira de validação executiva.
              </p>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950">Simulador de Postagem & Setup de Webhook</h4>
                  <p className="text-[11px] text-indigo-700">
                    Teste o envio de canhotos via chat do Teams ou copie o payload de automação para o Power Automate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTeamsModal(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Bot className="w-4 h-4" />
                  <span>Abrir Simulador & Webhook</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: SEGURANÇA & TIRAR DO AR */}
        {activeSubTab === 'security' && (
          <div className="space-y-6">
            {/* GOOGLE SHEETS STATUS TAB AS SOURCE OF TRUTH */}
            <div className="bg-white border-2 border-emerald-200 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">Aba "Status" da Planilha Google (Fonte da Verdade)</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        OFFICIAL STATUS TAB
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      O front-end consulta a aba <strong>Status</strong> na Planilha Google antes de abrir. Se estiver <strong>FECHADO</strong>, bloqueia todas as telas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={OFFICIAL_SHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver na Planilha Google</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCheckSheetStatus}
                    disabled={isCheckingSheetStatus}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSheetStatus ? 'animate-spin' : ''}`} />
                    <span>{isCheckingSheetStatus ? 'Consultando...' : 'Checar Status da Aba'}</span>
                  </button>
                </div>
              </div>

              {/* Status Display and Quick Action */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Status Atual do Sistema</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black ${
                        isMaintenanceMode ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isMaintenanceMode ? (
                        <>
                          <Lock className="w-3.5 h-3.5" /> FECHADO (BLOQUEADO)
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" /> ABERTO (OPERACIONAL)
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isMaintenanceMode
                      ? 'O sistema bloqueia qualquer usuário antes de abrir.'
                      : 'O sistema abre normalmente para todos os atendentes.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Aba Google Sheets</span>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <code>Aba: Status (Célula A2)</code>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Valores aceitos: <strong>ABERTO</strong> ou <strong>FECHADO</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ação Rápida</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newStatus = !isMaintenanceMode;
                      if (newStatus) {
                        if (
                          confirm(
                            'Deseja FECHAR O SISTEMA agora? Todos os computadores, celulares e operadores de campo serão bloqueados imediatamente.'
                          )
                        ) {
                          setMaintenanceMode(true);
                        }
                      } else {
                        setMaintenanceMode(false);
                      }
                    }}
                    className={`w-full py-2.5 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                      isMaintenanceMode
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    {isMaintenanceMode ? '🟢 ABRIR SISTEMA (Gravar ABERTO)' : '🔴 FECHAR SISTEMA (Gravar FECHADO)'}
                  </button>
                </div>
              </div>

              {sheetStatusResult && (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-mono border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-[11px] text-slate-600 mb-1">
                    <span>Resultado da Consulta da Aba "Status":</span>
                    <span className="text-emerald-700">Origem: {sheetStatusResult.source}</span>
                  </div>
                  <div>Status Lido: <strong>{sheetStatusResult.status}</strong></div>
                  {sheetStatusResult.rawText && (
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      Snippet Bruto: {sheetStatusResult.rawText}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DIAGNÓSTICO DE CONEXÃO FRONT-END ↔ BACK-END */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">Teste de Conexão: Front-End ↔ Back-End</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                        DIAGNÓSTICO EM TEMPO REAL
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verifica a comunicação entre o React (Front-End) e o Servidor Express/Proxy (Back-End) via <code>/api/system/health</code>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConn}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                  <Wifi className={`w-4 h-4 ${isTestingConn ? 'animate-pulse' : ''}`} />
                  <span>{isTestingConn ? 'Testando Conexão...' : 'Testar Conexão Front ↔ Back'}</span>
                </button>
              </div>

              {connTestResult ? (
                <div
                  className={`p-4 rounded-2xl border ${
                    connTestResult.connected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm">
                    {connTestResult.connected ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Conexão Front-End ↔ Back-End Operacional com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span>Falha na Conexão com o Back-End</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs mt-1">{connTestResult.message}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-emerald-200/60 text-xs font-mono">
                    <div>
                      Latência: <strong>{connTestResult.latencyMs} ms</strong>
                    </div>
                    <div>
                      Timestamp: <strong>{new Date(connTestResult.timestamp).toLocaleTimeString()}</strong>
                    </div>
                    {connTestResult.data?.uptime && (
                      <div>
                        Uptime Servidor: <strong>{Math.round(connTestResult.data.uptime)}s</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  Clique no botão acima para realizar um teste de ping instantâneo entre o Front-End e o Back-End.
                </div>
              )}
            </div>

            {/* PASSWORD CHANGE FORM */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl ${
                      isMaintenanceMode
                        ? 'bg-red-100 text-red-600 border border-red-200'
                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                    }`}
                  >
                    {isMaintenanceMode ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">Status Operacional do Sistema (Aberto / Fechado)</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isMaintenanceMode ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isMaintenanceMode ? '● FECHADO / BLOQUEADO NA NUVEM' : '● ABERTO / ONLINE GERAL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Registra no servidor e na nuvem se o sistema está <strong>ABERTO</strong> ou <strong>FECHADO</strong>. Qualquer usuário ou computador que tentar abrir o sistema faz o check prévio e é bloqueado caso esteja fechado.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newStatus = !isMaintenanceMode;
                    if (newStatus) {
                      if (confirm('Deseja FECHAR O SISTEMA agora? Todos os computadores, celulares e operadores de campo serão bloqueados imediatamente.')) {
                        setMaintenanceMode(true);
                      }
                    } else {
                      setMaintenanceMode(false);
                    }
                  }}
                  className={`px-6 py-3 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    isMaintenanceMode
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {isMaintenanceMode ? '🟢 ABRIR SISTEMA (Reativar Online)' : '🔴 FECHAR SISTEMA (Bloquear Geral)'}
                </button>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Alterar Senha Mestra do Administrador</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  A senha é confidencial e nunca é exibida em texto plano para outros usuários.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Senha Atual *</label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nova Senha *</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        placeholder="Nova senha secreta"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      >
                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Confirmar Nova Senha *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        required
                        placeholder="Repita a senha"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl whitespace-nowrap cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>

                {passMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold ${
                      passMsg.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                        : 'bg-red-50 border border-red-300 text-red-800'
                    }`}
                  >
                    {passMsg.text}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: GERENCIAMENTO DE DADOS & BACKUP */}
        {activeSubTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <Database className="w-5 h-5 text-rose-600" />
                  <span>Gerenciamento de Base de Dados & Zeramento</span>
                </div>
                <span className="font-bold text-slate-500">
                  {orders.length} OSs • {invoices.length} Faturas • {clients.length} Clientes • {equipments.length} Equipamentos
                </span>
              </div>

              <p className="text-slate-500 leading-relaxed">
                Utilize as ferramentas abaixo para fazer download do backup completo ou limpar todos os dados de teste para iniciar a produção em branco.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-300 shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Exportar Backup do Sistema (JSON)
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Zerar Sistema / Limpar Exemplos de Teste
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Limpeza e Zerar Sistema */}
      <ResetSystemModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />

      {/* Teams Integration Modal */}
      {showTeamsModal && (
        <TeamsIntegrationModal
          isOpen={showTeamsModal}
          onClose={() => setShowTeamsModal(false)}
          onSuccess={() => {
            setShowTeamsModal(false);
          }}
        />
      )}
    </div>
  );
};
