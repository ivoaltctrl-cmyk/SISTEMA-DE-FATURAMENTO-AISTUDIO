import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Lock,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LoginModal } from './LoginModal';
import { WFSLogo } from './WFSLogo';

interface PortalSelectionProps {
  onSelectFieldMode: () => void;
  onSelectExecutiveMode: () => void;
  onSelectMasterMode: () => void;
}

export const PortalSelection: React.FC<PortalSelectionProps> = ({
  onSelectFieldMode,
  onSelectExecutiveMode,
  onSelectMasterMode,
}) => {
  const {
    company,
    unbilledCompletedOrders,
    pendingValidationOrders,
    isSessionUnlocked,
    isExecutiveUnlocked,
  } = useApp();

  const [loginModalState, setLoginModalState] = useState<{
    isOpen: boolean;
    requiredArea: 'executive' | 'settings';
    onSuccess: () => void;
  }>({
    isOpen: false,
    requiredArea: 'executive',
    onSuccess: () => {},
  });

  const handleOpenExecutive = () => {
    if (isExecutiveUnlocked) {
      onSelectExecutiveMode();
    } else {
      setLoginModalState({
        isOpen: true,
        requiredArea: 'executive',
        onSuccess: () => {
          setLoginModalState((prev) => ({ ...prev, isOpen: false }));
          onSelectExecutiveMode();
        },
      });
    }
  };

  const handleOpenMaster = () => {
    if (isSessionUnlocked) {
      onSelectMasterMode();
    } else {
      setLoginModalState({
        isOpen: true,
        requiredArea: 'settings',
        onSuccess: () => {
          setLoginModalState((prev) => ({ ...prev, isOpen: false }));
          onSelectMasterMode();
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between antialiased selection:bg-red-500 selection:text-white font-sans">
      {/* Clean Top Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <WFSLogo size="md" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              {company.tradeName || company.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex-1 flex flex-col justify-center space-y-6 sm:space-y-8">
        {/* Hero Title */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs font-semibold">
            <Sparkles className="w-4 h-4 text-red-600" />
            <span>Digitalização de Canhotos & Gestão Operacional Integrada</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Sistema Operacional <span className="text-[#E31B23]">WFS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Selecione o portal correspondente ao seu perfil de atuação abaixo.
          </p>
        </div>

        {/* 3 Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {/* PORTAL 1: MODO CAMPO & PISTA (OPERACIONAL) */}
          <div
            onClick={onSelectFieldMode}
            className="bg-white border-2 border-slate-200 hover:border-amber-500 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/60 rounded-full blur-2xl group-hover:bg-amber-200/60 transition-all pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-md group-hover:rotate-3 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full">
                  ⚡ Operacional
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                  Modo Campo & Pista
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Para atendentes, operadores e encarregados em campo. Digitalize canhotos físicos com foto, colete assinatura do cliente e lance OSs com retorno ágil à tela inicial.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Digitalizar OS de papel com IA (OCR)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Assinatura digital na tela do celular</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Lançamento direto para validação fiscal</span>
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                className="w-full py-3.5 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Acessar Modo Campo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* PORTAL 2: PAINEL EXECUTIVO & FATURAMENTO (COM LOGIN CORPORATIVO) */}
          <div
            onClick={handleOpenExecutive}
            className="bg-white border-2 border-slate-200 hover:border-red-600 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/60 rounded-full blur-2xl group-hover:bg-red-200/60 transition-all pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md group-hover:rotate-3 transition-transform">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Requer Usuário & Senha
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-red-700 transition-colors">
                  Painel Executivo
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Para faturamento, gerência e supervisão. Validação de OSs, emissão de faturas PIX, acompanhamento fiscal, gestão de clientes e equipamentos.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Aba de Validação Pré-Faturamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Faturas PIX, Boletos & Baixas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Gestão de Clientes e Equipamentos</span>
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                className="w-full py-3.5 bg-red-600 group-hover:bg-red-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 text-white/90" />
                <span>Acessar Painel Executivo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* PORTAL 3: CONFIGURAÇÕES (COM LOGIN CORPORATIVO) */}
          <div
            onClick={handleOpenMaster}
            className="bg-white border-2 border-slate-200 hover:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full blur-2xl group-hover:bg-slate-200 transition-all pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center font-black shadow-md group-hover:rotate-3 transition-transform">
                  <Lock className="w-6 h-6 text-slate-300" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 rounded-full">
                  ⚙️ Configurações
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-slate-800 transition-colors">
                  Configurações
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Área restrita de gestão. Cadastro de colaboradores e privilégios, sincronização Google Sheets, dados da empresa e segurança.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Cadastro de Usuários, Cargos & Privilégios</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Google Sheets & Integrações de Nuvem</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Configurações Fiscais, Chave PIX & Dados</span>
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                className="w-full py-3.5 bg-slate-800 group-hover:bg-slate-900 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 text-slate-300" />
                <span>Acessar Configurações (Login)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Corporate Login Modal */}
        <LoginModal
          isOpen={loginModalState.isOpen}
          onClose={() => setLoginModalState((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={loginModalState.onSuccess}
          requiredArea={loginModalState.requiredArea}
        />

        {/* Operational live alert banner */}
        {(unbilledCompletedOrders.length > 0 || pendingValidationOrders.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs text-amber-950 font-medium">
                <strong>Status Operacional:</strong>{' '}
                {pendingValidationOrders.length > 0 && (
                  <span className="text-amber-800 font-black mr-2">
                    {pendingValidationOrders.length} OSs aguardando validação do faturamento.
                  </span>
                )}
                {unbilledCompletedOrders.length > 0 && (
                  <span className="text-orange-700 font-black">
                    {unbilledCompletedOrders.length} OSs concluídas prontas para emissão de fatura PIX.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-slate-700">{company.tradeName || company.name} • Solução Digital WFS</span>
          <div className="flex items-center gap-3 font-medium">
            <span className="text-slate-600">Governança & Rastreabilidade Segura</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

