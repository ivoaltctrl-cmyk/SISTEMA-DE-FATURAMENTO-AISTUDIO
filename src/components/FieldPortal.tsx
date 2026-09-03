import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HardHat,
  Home,
  Lock,
  LogOut,
  MapPin,
  PenTool,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceOrder } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { WFSLogo } from './WFSLogo';
import { OFFICIAL_SHEET_URL, syncOrdersWithGoogleSheets } from '../services/sheetsService';

interface FieldPortalProps {
  onOpenNewOS: () => void;
  onOpenDigitalizar: () => void;
  onSwitchToAdmin: () => void;
  onBackToHome: () => void;
  onOpenUserManager?: () => void;
}

export const FieldPortal: React.FC<FieldPortalProps> = ({
  onOpenNewOS,
  onOpenDigitalizar,
  onSwitchToAdmin,
  onBackToHome,
  onOpenUserManager,
}) => {
  const {
    company,
    orders,
    currentUser,
    setSelectedOrderForFieldMode,
    setSelectedOrderForDetail,
    setSelectedOrderForPrint,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'ativos' | 'concluidos' | 'todos'>('ativos');
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedFieldLink, setCopiedFieldLink] = useState(false);

  const fieldDirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?mode=campo`
      : '';

  const activeOrders = orders.filter(
    (o) => o.status === 'em_andamento' || o.status === 'agendada' || o.status === 'aguardando_validacao'
  );
  const completedOrders = orders.filter(
    (o) => o.status === 'concluida' || o.status === 'faturada' || o.status === 'paga'
  );

  const filteredOrders = orders.filter((o) => {
    if (filterTab === 'ativos') {
      if (o.status !== 'em_andamento' && o.status !== 'agendada' && o.status !== 'aguardando_validacao') {
        return false;
      }
    } else if (filterTab === 'concluidos') {
      if (o.status !== 'concluida' && o.status !== 'faturada' && o.status !== 'paga') {
        return false;
      }
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.osNumber.toLowerCase().includes(term) ||
      o.clientName.toLowerCase().includes(term) ||
      o.title.toLowerCase().includes(term) ||
      o.workLocation.toLowerCase().includes(term) ||
      (o.technicianName && o.technicianName.toLowerCase().includes(term)) ||
      (o.createdBy && o.createdBy.toLowerCase().includes(term))
    );
  });

  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    setSyncFeedback(null);
    try {
      const res = await syncOrdersWithGoogleSheets(orders);
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback('Sincronização salva no buffer local.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleCopyFieldLink = () => {
    navigator.clipboard.writeText(fieldDirectUrl);
    setCopiedFieldLink(true);
    setTimeout(() => setCopiedFieldLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased font-sans pb-12">
      {/* Field Mode Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <WFSLogo size="sm" />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                ⚡ Modo Campo & Pista
              </span>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">
                {company.tradeName || company.name}
              </p>
            </div>
          </div>

          {/* Action Buttons: Voltar à Tela Inicial & Operador */}
          <div className="flex items-center gap-2">
            {/* User Switch Badge */}
            {onOpenUserManager && (
              <button
                type="button"
                onClick={onOpenUserManager}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                title="Clique para trocar o usuário/operador ativo"
              >
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span className="truncate max-w-[120px]">{currentUser?.name || 'Operador'}</span>
              </button>
            )}

            {/* Prominent Back to Home Button */}
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Voltar para a seleção de portais"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Tela Inicial</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex-1">
        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Quick Operator Status Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              Operador conectado: <strong className="text-slate-900">{currentUser?.name}</strong> ({currentUser?.roleLabel})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenUserManager && (
              <button
                type="button"
                onClick={onOpenUserManager}
                className="text-xs font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
              >
                Trocar Operador
              </button>
            )}
          </div>
        </div>

        {/* Hero Quick Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: 📸 Direct Photo Upload to Google Drive */}
          <div
            onClick={onOpenDigitalizar}
            className="bg-white hover:bg-red-50/40 p-5 rounded-3xl shadow-sm hover:shadow-md border-2 border-red-200 hover:border-red-500 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group relative overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full inline-block mb-1 font-sans">
                  Google Drive • Fotos_SO
                </span>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-red-700 transition-colors">
                  Enviar Canhoto / Foto
                </h3>
                <p className="text-xs text-slate-600 max-w-[240px]">
                  Tire uma foto na câmera: a imagem vai direto para a pasta do Google Drive para a IA processar. Sem digitação.
                </p>
              </div>

              <div className="w-14 h-14 bg-red-600 group-hover:bg-red-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shrink-0">
                <Camera className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Card 2: ✍️ New Direct Field OS */}
          <div
            onClick={onOpenNewOS}
            className="bg-white hover:bg-amber-50/40 p-5 rounded-3xl shadow-sm hover:shadow-md border-2 border-slate-200 hover:border-amber-500 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full inline-block mb-1 font-sans">
                  Lançamento Direto
                </span>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                  Nova OS de Campo
                </h3>
                <p className="text-xs text-slate-600 max-w-[240px]">
                  Cadastre equipamento, operador e colha assinatura na hora.
                </p>
              </div>

              <div className="w-14 h-14 bg-amber-500 group-hover:bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center transition-all shadow-md shrink-0">
                <Plus className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Count Mini Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-around text-xs shadow-2xs">
          <div className="text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Em Campo / Validação</span>
            <span className="text-lg font-black text-amber-600">{activeOrders.length}</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Concluídas & Faturadas</span>
            <span className="text-lg font-black text-emerald-600">{completedOrders.length}</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Total Registrado</span>
            <span className="text-lg font-black text-slate-900">{orders.length}</span>
          </div>
        </div>

        {/* Search & Tabs Filter */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nº OS, cliente, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl py-3 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterTab('ativos')}
              className={`py-2.5 rounded-xl transition-all text-center cursor-pointer ${
                filterTab === 'ativos'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Em Campo ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('concluidos')}
              className={`py-2.5 rounded-xl transition-all text-center cursor-pointer ${
                filterTab === 'concluidos'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Concluídas ({completedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('todos')}
              className={`py-2.5 rounded-xl transition-all text-center cursor-pointer ${
                filterTab === 'todos'
                  ? 'bg-red-600 text-white shadow-sm font-black'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todas ({orders.length})
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-2xs">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhuma ordem de serviço encontrada.</p>
              <p className="text-xs text-slate-500">
                Toque nos botões acima para digitalizar um canhoto físico ou criar nova OS.
              </p>
            </div>
          ) : (
            filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3 transition-all"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 font-mono">{ord.osNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'aguardando_validacao'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : ord.status === 'concluida'
                            ? 'bg-orange-100 text-orange-900 border border-orange-200'
                            : ord.status === 'faturada'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : ord.status === 'paga'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-slate-100 text-slate-900 border border-slate-200'
                        }`}
                      >
                        {ord.status === 'aguardando_validacao'
                          ? 'Aguardando Validação'
                          : ord.status === 'concluida'
                          ? 'Assinada no Campo'
                          : ord.status === 'em_andamento'
                          ? 'Em Execução'
                          : ord.status.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{ord.title}</h4>
                    <p className="text-xs text-red-700 font-semibold">{ord.clientName}</p>
                  </div>

                  <span className="text-base font-black text-emerald-700 font-mono">
                    {formatCurrency(ord.totalAmount)}
                  </span>
                </div>

                {/* Location & Technician */}
                <div className="bg-slate-50 rounded-2xl p-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 border border-slate-100">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    {ord.workLocation}
                  </span>
                  <span className="text-slate-500 font-medium">Data: {formatDate(ord.scheduledDate)}</span>
                </div>

                {/* Attribution and Checklist */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Lançado por: <strong className="text-slate-800">{ord.createdBy || 'Técnico de Campo'}</strong>
                  </span>
                  {ord.clientSignature && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Assinado pelo Cliente
                    </span>
                  )}
                </div>

                {/* Field Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForFieldMode(ord)}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Checklist & Assinar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderForDetail(ord)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Ver Detalhes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderForPrint(ord)}
                    className="hidden sm:flex py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Imprimir OS</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
