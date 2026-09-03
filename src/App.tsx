/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  HardHat,
  Kanban,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { BillingManager } from './components/BillingManager';
import { CatalogManager } from './components/CatalogManager';
import { ClientsManager } from './components/ClientsManager';
import { Dashboard } from './components/Dashboard';
import { DeletedOrdersManager } from './components/DeletedOrdersManager';
import { DigitalizarOSModal } from './components/DigitalizarOSModal';
import { FieldPortal } from './components/FieldPortal';
import { LoginModal } from './components/LoginModal';
import { MaintenanceLockScreen } from './components/MaintenanceLockScreen';
import { MasterGovernancePortal } from './components/MasterGovernancePortal';
import { OSDetailModal } from './components/OSDetailModal';
import { OSFormModal } from './components/OSFormModal';
import { OSList } from './components/OSList';
import { PortalSelection } from './components/PortalSelection';
import { PrintableOS } from './components/PrintableOS';
import { QuickFieldModeModal } from './components/QuickFieldModeModal';
import { TeamsIntegrationModal } from './components/TeamsIntegrationModal';
import { UserManagerModal } from './components/UserManagerModal';
import { ValidationManager } from './components/ValidationManager';
import { WFSLogo } from './components/WFSLogo';
import { AppProvider, useApp } from './context/AppContext';
import { OSStatus, ServiceOrder } from './types';
import { OFFICIAL_SHEET_URL } from './services/sheetsService';
import { formatCurrency } from './utils/formatters';

// Available tabs for Executive / Administrative Portal
type ExecutiveTabType =
  | 'dashboard'
  | 'validacao'
  | 'ordens'
  | 'faturamento'
  | 'excluidos'
  | 'clientes'
  | 'catalogo';

type AppPortalMode = 'portal' | 'field' | 'admin' | 'master';

const MainApp: React.FC = () => {
  const {
    company,
    orders,
    deletedOrders,
    unbilledCompletedOrders,
    pendingValidationOrders,
    selectedOrderForDetail,
    setSelectedOrderForDetail,
    selectedOrderForFieldMode,
    setSelectedOrderForFieldMode,
    selectedOrderForPrint,
    setSelectedOrderForPrint,
    addOrder,
    updateOrder,
    currentUser,
    isCheckingGlobalStatus,
    isMaintenanceMode,
    isSessionUnlocked,
    unlockSession,
    lockSession,
    reopenSystemGlobally,
  } = useApp();

  // URL parameters handler (e.g. ?mode=campo, #campo)
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const modeParam = params.get('mode')?.toLowerCase();
      const tabParam = params.get('tab')?.toLowerCase();
      const isFieldDirect =
        modeParam === 'campo' ||
        modeParam === 'field' ||
        tabParam === 'campo' ||
        params.has('gid') ||
        hash.includes('campo') ||
        hash.includes('field');

      if (isFieldDirect) {
        return 'field';
      }
    }
    return 'portal';
  });

  const [activeTab, setActiveTab] = useState<ExecutiveTabType>('dashboard');
  const [filterOSStatus, setFilterOSStatus] = useState<OSStatus | undefined>(undefined);
  const [showOSFormModal, setShowOSFormModal] = useState(false);
  const [showDigitalizarModal, setShowDigitalizarModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showUserManagerModal, setShowUserManagerModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showSettingsLoginModal, setShowSettingsLoginModal] = useState(false);

  // Listen to popstate / hashchange
  useEffect(() => {
    const handleHashOrPop = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const modeParam = params.get('mode')?.toLowerCase();
      if (
        modeParam === 'campo' ||
        modeParam === 'field' ||
        params.has('gid') ||
        hash.includes('campo') ||
        hash.includes('field')
      ) {
        setPortalMode('field');
      }
    };
    window.addEventListener('popstate', handleHashOrPop);
    window.addEventListener('hashchange', handleHashOrPop);
    return () => {
      window.removeEventListener('popstate', handleHashOrPop);
      window.removeEventListener('hashchange', handleHashOrPop);
    };
  }, []);

  // Initial cloud pre-check: verify if status is ABERTO or FECHADO before opening
  if (isCheckingGlobalStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-wide">WFS OS DIGITAL</h2>
            <p className="text-xs text-slate-400">Verificando status operacional na nuvem...</p>
          </div>
        </div>
      </div>
    );
  }

  // If maintenance mode is active and the admin has not unlocked the session, lock the screen completely
  if (isMaintenanceMode && !isSessionUnlocked) {
    return <MaintenanceLockScreen />;
  }

  const handleOpenNewOS = () => {
    setEditingOrder(null);
    setShowOSFormModal(true);
  };

  const handleSaveOS = (orderData: Partial<ServiceOrder>) => {
    if (editingOrder) {
      updateOrder({
        ...editingOrder,
        ...orderData,
      } as ServiceOrder);
    } else {
      addOrder(orderData as any);
    }
    setShowOSFormModal(false);
    setEditingOrder(null);
  };

  const handleDigitalizeSuccess = () => {
    // Foto/canhoto enviado diretamente para o Google Drive (Pasta Fotos_SO).
    // O processamento e leitura são feitos diretamente pela IA configurada na nuvem.
  };

  const handleNavigateToOSWithFilter = (status?: OSStatus) => {
    setFilterOSStatus(status);
    setActiveTab('ordens');
  };

  const handleRequestMasterAccess = () => {
    if (isSessionUnlocked) {
      setPortalMode('master');
    } else {
      setShowSettingsLoginModal(true);
    }
  };

  // If in print mode, render printable invoice/OS
  if (selectedOrderForPrint) {
    return (
      <PrintableOS
        order={selectedOrderForPrint}
        onBack={() => setSelectedOrderForPrint(null)}
      />
    );
  }

  // 1. PORTAL SELECTION (LANDING SCREEN)
  if (portalMode === 'portal') {
    return (
      <>
        {isMaintenanceMode && (
          <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>⚠️ ATENÇÃO: O SISTEMA ESTÁ FECHADO / FORA DO AR PARA OUTROS NAVEGADORES NA NUVEM</span>
            </div>
            <button
              onClick={() => reopenSystemGlobally()}
              className="px-3 py-1 bg-white text-red-700 font-black rounded-lg hover:bg-slate-100 text-[11px] shadow-sm cursor-pointer"
            >
              🟢 Reabrir Sistema para Todos
            </button>
          </div>
        )}
        <PortalSelection
          onSelectFieldMode={() => setPortalMode('field')}
          onSelectExecutiveMode={() => setPortalMode('admin')}
          onSelectMasterMode={() => setPortalMode('master')}
        />
      </>
    );
  }

  // 2. FIELD / OPERATIONAL PORTAL (TÉCNICOS & PISTA)
  if (portalMode === 'field') {
    return (
      <>
        <FieldPortal
          onBackToHome={() => setPortalMode('portal')}
          onSwitchToAdmin={() => setPortalMode('portal')}
          onOpenNewOS={handleOpenNewOS}
          onOpenDigitalizar={() => setShowDigitalizarModal(true)}
          onOpenUserManager={() => setShowUserManagerModal(true)}
        />

        {showOSFormModal && (
          <OSFormModal
            initialOrder={editingOrder}
            onClose={() => {
              setShowOSFormModal(false);
              setEditingOrder(null);
            }}
            onSave={handleSaveOS}
          />
        )}

        {showDigitalizarModal && (
          <DigitalizarOSModal
            onClose={() => setShowDigitalizarModal(false)}
            onSuccess={handleDigitalizeSuccess}
          />
        )}

        {selectedOrderForDetail && (
          <OSDetailModal
            order={selectedOrderForDetail}
            onClose={() => setSelectedOrderForDetail(null)}
            onEdit={(ord) => {
              setSelectedOrderForDetail(null);
              setEditingOrder(ord);
              setShowOSFormModal(true);
            }}
          />
        )}

        {selectedOrderForFieldMode && (
          <QuickFieldModeModal
            order={selectedOrderForFieldMode}
            onClose={() => setSelectedOrderForFieldMode(null)}
          />
        )}

        {showUserManagerModal && (
          <UserManagerModal
            isOpen={showUserManagerModal}
            onClose={() => setShowUserManagerModal(false)}
          />
        )}
      </>
    );
  }

  // 3. MASTER GOVERNANCE & IT PORTAL (3ª ABA / AMBIENTE RESTRITO)
  if (portalMode === 'master') {
    return (
      <MasterGovernancePortal
        onBackToExecutive={() => setPortalMode('admin')}
        onBackToField={() => setPortalMode('field')}
      />
    );
  }

  // 4. EXECUTIVE & FINANCIAL MANAGEMENT PORTAL
  const unbilledCount = unbilledCompletedOrders.length;
  const pendingCount = pendingValidationOrders.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 font-sans">
      {/* Admin Emergency Mode Warning Banner */}
      {isMaintenanceMode && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg sticky top-0 z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>⚠️ ATENÇÃO: SISTEMA ATUALMENTE FECHADO / FORA DO AR PARA OUTROS NAVEGADORES E CAMPO NA NUVEM</span>
          </div>
          <button
            onClick={() => reopenSystemGlobally()}
            className="px-3.5 py-1 bg-white hover:bg-slate-100 text-red-700 font-black rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
          >
            🟢 Reabrir Sistema Online para Todos
          </button>
        </div>
      )}

      {/* Top Navbar for Executive Suite */}
      <header className="bg-white text-slate-900 sticky top-0 z-40 border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <WFSLogo size="sm" />
              <div className="hidden sm:block border-l border-slate-200 pl-2.5">
                <span className="font-black text-xs tracking-tight text-slate-900 flex items-center gap-1.5">
                  Painel Executivo & Faturamento
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    Executivo
                  </span>
                </span>
                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                  {company.tradeName || company.name}
                </p>
              </div>
            </div>
          </div>

          {/* Center / Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active User Indicator */}
            <button
              type="button"
              onClick={() => setShowUserManagerModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              title="Gerenciar Usuários & Rastreabilidade"
            >
              <User className="w-3.5 h-3.5 text-red-600" />
              <span className="truncate max-w-[130px]">{currentUser?.name}</span>
            </button>

            {/* Pending Validation Badge */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('validacao')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`${pendingCount} OSs aguardando validação do time de faturamento`}
              >
                <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Validar:</span>
                <span className="bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-black text-[10px]">
                  {pendingCount}
                </span>
              </button>
            )}

            {/* Anti-Delay Alert Badge */}
            {unbilledCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('faturamento')}
                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-900 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors animate-pulse cursor-pointer"
                title={`${unbilledCount} OSs finalizadas prontas para faturamento`}
              >
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span className="hidden sm:inline">A Faturar:</span>
                <span className="bg-orange-500 text-white px-1.5 py-0.2 rounded-full font-black text-[10px]">
                  {unbilledCount}
                </span>
              </button>
            )}

            {/* Master Settings Portal Access Button */}
            <button
              type="button"
              onClick={handleRequestMasterAccess}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Acessar Painel de Configurações"
            >
              <Settings className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden md:inline">Configurações</span>
            </button>

            {/* Exit to Main Selection */}
            <button
              type="button"
              onClick={() => setPortalMode('portal')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sair para a Seleção de Portais"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Trocar Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-5 lg:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <nav className="bg-white rounded-3xl p-3 border border-slate-200 shadow-2xs space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel Executivo</span>
              </div>
            </button>

            {/* Validation Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('validacao')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'validacao'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-4 h-4" />
                <span>Validação Faturamento</span>
              </div>
              {pendingCount > 0 && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    activeTab === 'validacao'
                      ? 'bg-white text-red-600'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterOSStatus(undefined);
                setActiveTab('ordens');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ordens'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Ordens de Serviço</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'ordens' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faturamento')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'faturamento'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4" />
                <span>Faturamento & PIX</span>
              </div>
              {unbilledCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unbilledCount}
                </span>
              )}
            </button>
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex animate-fade-in">
            <div className="bg-white w-72 h-full p-5 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <WFSLogo size="sm" />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {[
                    { id: 'dashboard', label: 'Painel Executivo', icon: LayoutDashboard },
                    { id: 'validacao', label: 'Validação Faturamento', icon: FileCheck2 },
                    { id: 'ordens', label: 'Ordens de Serviço', icon: FileText },
                    { id: 'faturamento', label: 'Faturamento & Cobranças', icon: Receipt },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id as ExecutiveTabType);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          activeTab === item.id
                            ? 'bg-red-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowUserManagerModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Usuários & Rastreabilidade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleRequestMasterAccess();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 text-white cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-300" />
                    <span>Configurações</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                {company.name}
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigateToOS={handleNavigateToOSWithFilter}
              onNavigateToBilling={() => setActiveTab('faturamento')}
            />
          )}

          {activeTab === 'validacao' && (
            <ValidationManager
              onOpenDetail={(ord) => setSelectedOrderForDetail(ord)}
              onOpenTeamsModal={() => setShowTeamsModal(true)}
            />
          )}

          {activeTab === 'ordens' && (
            <OSList
              onNewOS={handleOpenNewOS}
              initialFilterStatus={filterOSStatus}
            />
          )}

          {activeTab === 'faturamento' && <BillingManager />}

          {activeTab === 'excluidos' && (
            <DeletedOrdersManager
              onOpenDetail={(ord) => setSelectedOrderForDetail(ord)}
            />
          )}

          {activeTab === 'clientes' && <ClientsManager />}

          {activeTab === 'catalogo' && <CatalogManager />}
        </main>
      </div>

      {/* Settings / Master Login Modal */}
      <LoginModal
        isOpen={showSettingsLoginModal}
        onClose={() => setShowSettingsLoginModal(false)}
        requiredArea="settings"
        onSuccess={() => {
          setPortalMode('master');
        }}
      />

      {/* Teams Integration Modal */}
      {showTeamsModal && (
        <TeamsIntegrationModal
          isOpen={showTeamsModal}
          onClose={() => setShowTeamsModal(false)}
          onSuccess={() => {
            setActiveTab('validacao');
          }}
        />
      )}

      {/* User Manager Modal */}
      {showUserManagerModal && (
        <UserManagerModal
          isOpen={showUserManagerModal}
          onClose={() => setShowUserManagerModal(false)}
        />
      )}

      {/* Detail Modal if requested */}
      {selectedOrderForDetail && (
        <OSDetailModal
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onEdit={(ord) => {
            setSelectedOrderForDetail(null);
            setEditingOrder(ord);
            setShowOSFormModal(true);
          }}
        />
      )}

      {showOSFormModal && (
        <OSFormModal
          initialOrder={editingOrder}
          onClose={() => {
            setShowOSFormModal(false);
            setEditingOrder(null);
          }}
          onSave={handleSaveOS}
        />
      )}

      {showDigitalizarModal && (
        <DigitalizarOSModal
          onClose={() => setShowDigitalizarModal(false)}
          onSuccess={handleDigitalizeSuccess}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
