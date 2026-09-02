import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HardHat,
  Plane,
  Receipt,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  TrendingUp,
  Truck,
  Upload,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OSStatus, ServiceOrder } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMinutesToHours,
  getHoursSinceCompletion,
} from '../utils/formatters';
import { OFFICIAL_SHEET_URL } from '../services/sheetsService';

interface DashboardProps {
  onNavigateToOS: (filterStatus?: OSStatus) => void;
  onNavigateToBilling: () => void;
  onNavigateToGovernance?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToOS,
  onNavigateToBilling,
  onNavigateToGovernance,
}) => {
  const {
    company,
    orders,
    invoices,
    unbilledCompletedOrders,
    overdueBillingOrders,
    setSelectedOrderForDetail,
    syncWithGoogleSheet,
    importRawSheetData,
    pushOrdersToGoogleSheet,
    isSyncingSheets,
    totalFlightMinutes,
    totalFlightHoursFormatted,
    agentMetrics,
    flightServicesBreakdown,
    filledByMetrics,
    totalOperationsCount,
    avgOperationMinutes,
  } = useApp();

  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedCsvText, setPastedCsvText] = useState('');
  const [activeTab, setActiveTab] = useState<'operacional' | 'financeiro'>('operacional');

  // Trigger Live Google Sheets Sync
  const handleSyncNow = async () => {
    setSyncFeedback(null);
    const res = await syncWithGoogleSheet();
    if (res.success) {
      setSyncFeedback({ type: 'success', text: res.message });
      setTimeout(() => setSyncFeedback(null), 6000);
    } else {
      setSyncFeedback({ type: 'error', text: res.message });
      // Keep error visible longer so user has time to read and act
      setTimeout(() => setSyncFeedback(null), 12000);
    }
  };

  const handleLoadSampleData = () => {
    const sampleCsv = `Número OS\tData / Hora\tCliente / Empresa\tCNPJ / CPF\tLocal\tCategoria\tTítulo do Serviço\tEquipamentos\tValor Total\tStatus\tNome Do Agente ou Serviço Executado\tHora Início\tHora Fim\tQuantidade\tResponsável pelo Preenchimento\tAssinatura\tFoto do Canhoto\tNº da Fatura
31877\t11/08/2026 14:34\tITA AIRWAYS\t33.683.111/0001-07\tGRU - Terminal 3\tServiços Auxiliares de Transp\tCANCELAMENTO DE VOO AZ675\tCANCELAMENTO DE VOO AZ675\tR$ 4.850,00\tCONCLUÍDA (CAMPO)\tAMANDA APARECIDA VASCO CORTEZ 14286\t14:34\t20:10\t1\tAmanda Aparecida Vasco Cortez\tAssinado por: Amanda Cortez\thttps://drive.google.com/drive/folders/wfs-os-31877\tFAT-2026-0891
31878\t11/08/2026 15:00\tLUFTHANSA\t02.012.334/0001-90\tGRU - Pista Principal\tLocação de Equipamentos\tLOCAÇÃO GPU & TRATOR GSE\tGPU 90kVA (1 un); Trator Pushback (1 un)\tR$ 3.200,00\tCONCLUÍDA (CAMPO)\tCARLOS EDUARDO SILVA 12940\t15:00\t18:30\t2\tAmanda Aparecida Vasco Cortez\tAssinado no Campo\thttps://drive.google.com/drive/folders/wfs-os-31878\t-
31879\t12/08/2026 08:15\tLATAM AIRLINES\t02.012.862/0001-60\tGRU - Hangar WFS\tManutenção Corretiva\tMANUTENÇÃO PREVENTIVA ESCADA GSE\tEscada de Embarque Motorizada\tR$ 1.950,00\tCONCLUÍDA (CAMPO)\tMARCOS VINICIUS SANTOS 10452\t08:15\t12:45\t1\tRodrigo Souza\tAssinado no Campo\thttps://drive.google.com/drive/folders/wfs-os-31879\tFAT-2026-0892
31880\t12/08/2026 13:00\tEMIRATES\t08.455.120/0001-33\tGRU - Pátio 2\tServiços Auxiliares de Transp\tAPOIO GROUND HANDLING VOO EK262\tOperação de Carregamento e Balizamento\tR$ 5.400,00\tCONCLUÍDA (CAMPO)\tAMANDA APARECIDA VASCO CORTEZ 14286\t13:00\t19:30\t1\tAmanda Aparecida Vasco Cortez\tAssinado no Campo\thttps://drive.google.com/drive/folders/wfs-os-31880\t-
31881\t13/08/2026 09:30\tAIR FRANCE\t33.013.988/0001-44\tGRU - Terminal 3\tLocação de Equipamentos\tLOCAÇÃO DE LOADER CARGA PESADA\tLoader Carga Paletizada\tR$ 6.800,00\tCONCLUÍDA (CAMPO)\tFERNANDO OLIVEIRA 11833\t09:30\t16:00\t1\tAmanda Aparecida Vasco Cortez\tAssinado no Campo\thttps://drive.google.com/drive/folders/wfs-os-31881\t-`;
    setPastedCsvText(sampleCsv);
  };

  const handleImportPasted = () => {
    if (!pastedCsvText.trim()) return;
    const res = importRawSheetData(pastedCsvText);
    if (res.success) {
      setSyncFeedback({ type: 'success', text: res.message });
      setShowImportModal(false);
      setPastedCsvText('');
    } else {
      setSyncFeedback({ type: 'error', text: res.message });
    }
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  // Financial Metrics
  const totalUnbilledAmount = unbilledCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const invoicedOrders = orders.filter((o) => o.status === 'faturada' || o.status === 'paga');
  const totalInvoicedAmount = invoices.reduce((sum, i) => sum + i.totalAmount, 0);

  const paidInvoices = invoices.filter((i) => i.status === 'paga');
  const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

  // Status counts
  const countInExecution = orders.filter((o) => o.status === 'em_andamento').length;
  const countScheduled = orders.filter((o) => o.status === 'agendada').length;
  const countUnbilled = unbilledCompletedOrders.length;
  const countBilled = invoicedOrders.length;
  const countWithDrivePhotos = orders.filter((o) => o.canhotoUrl || (o.photos && o.photos.length > 0)).length;

  return (
    <div className="space-y-6">
      {/* Toast Feedback if any */}
      {syncFeedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-fade-in ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-amber-50 text-amber-900 border border-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{syncFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="text-slate-500 hover:text-slate-800 text-xs px-2 py-0.5"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header Bar: Tabs & Discrete Sincronização Button */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('operacional')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'operacional'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plane className="w-4 h-4" /> Indicadores Operacionais de Pista
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'financeiro'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Indicadores Financeiros & Faturamento
          </button>
        </div>

        {/* Discrete Sync & Total Counter */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            <strong className="text-slate-900">{orders.length}</strong> ordens
          </span>

          <button
            type="button"
            disabled={isSyncingSheets}
            onClick={handleSyncNow}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200 disabled:opacity-50 cursor-pointer"
            title="Sincronizar dados com o Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncingSheets ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isSyncingSheets ? 'Sincronizando...' : 'Sincronizar Planilha'}</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY OPERATIONAL KPI CARDS REFLECTING NEW COLUMNS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Horas Totais em Pista (Hora Início vs Hora Fim) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Horas Operadas em Pista
            </span>
            <div className="p-2.5 bg-red-100 text-red-600 rounded-2xl">
              <Timer className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{totalFlightHoursFormatted}</h3>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-red-600" />
            Calculado via <strong>Hora Início</strong> e <strong>Hora Fim</strong>
          </p>
        </div>

        {/* Card 2: Atendentes Ativos na Pista (Nome do Atendente / Matrícula) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ATENDENTES
            </span>
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-blue-900 mt-2">{agentMetrics.length} atendentes</h3>
          <p className="text-xs text-slate-500 mt-1">
            Atendentes com matrícula e registro operacional
          </p>
        </div>

        {/* Card 3: Tempo Médio por Atendimento (TMA) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Duração Média / Atendimento
            </span>
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-emerald-800 mt-2">
            {formatMinutesToHours(avgOperationMinutes)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Tempo Médio de Atendimento (TMA) por OS
          </p>
        </div>

        {/* Card 4: Canhotos com Link Google Drive */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Canhotos / Fotos Drive
            </span>
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-amber-900 mt-2">{countWithDrivePhotos} OSs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Registros com link direto no Google Drive
          </p>
        </div>
      </div>

      {/* DETAILED OPERATIONAL SECTION */}
      {activeTab === 'operacional' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Agent Productivity Ranking & Flight Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* AGENT PRODUCTIVITY RANKING TABLE (Reflecting Column 11: Nome Do Agente ou Serviço Executado) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                      <HardHat className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-black text-slate-900">
                      Produtividade dos Atendentes em Pista
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Horas trabalhadas e atendimentos registrados por atendente/matrícula
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
                  {agentMetrics.length} atendentes listados
                </span>
              </div>

              {agentMetrics.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  Nenhum atendente registrado nas ordens atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                        <th className="py-2.5 px-3 rounded-l-xl">Atendente / Matrícula</th>
                        <th className="py-2.5 px-3">Atendimentos</th>
                        <th className="py-2.5 px-3">Horas em Pista</th>
                        <th className="py-2.5 px-3">Último Serviço / Voo</th>
                        <th className="py-2.5 px-3 rounded-r-xl">Cliente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agentMetrics.map((ag, idx) => (
                        <tr key={ag.name + idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{ag.name}</span>
                                {ag.badge && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Matrícula: {ag.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[11px]">
                              {ag.count} OS{ag.count > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-800 border border-red-200 font-mono">
                              {ag.totalHoursFormatted}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={ag.lastService}>
                            {ag.lastService || '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-800">
                              {ag.uniqueClients.join(', ') || 'WFS'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SERVICES BREAKDOWN (Reflecting Column 7: Título do Serviço / Cancelamentos de Voo) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Distribuição por Voo & Serviço Operacional (Nova Coluna 7)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Volume e horas dedicadas por tipo de atendimento (ex: Cancelamentos de Voo, Manutenções, Locações)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {flightServicesBreakdown.map((srv, idx) => {
                  const pct = totalOperationsCount > 0 ? Math.round((srv.count / totalOperationsCount) * 100) : 0;
                  return (
                    <div key={srv.title + idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="font-bold text-xs text-slate-900">{srv.title}</span>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{srv.count} atendimentos</span>
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            {srv.totalHoursFormatted}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: `${Math.max(pct, 5)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Responsáveis pelo Preenchimento & Quick Actions */}
          <div className="space-y-6">
            {/* Responsáveis pelo Preenchimento (Coluna 15) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Responsável Preenchimento (Coluna 15)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Rastreabilidade de encarregados que registraram as ordens em pista
              </p>

              <div className="space-y-2.5">
                {filledByMetrics.map((fl, idx) => (
                  <div
                    key={fl.name + idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                        {fl.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{fl.name}</span>
                        <span className="text-[10px] text-slate-500">Encarregado de Campo</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-black text-xs">
                      {fl.count} OS{fl.count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* FINANCIAL TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Anti-Delay Problem Solver Banner */}
            {unbilledCompletedOrders.length > 0 ? (
              <div className="bg-white border-2 border-orange-300 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 shrink-0">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-800 px-3 py-1 rounded-full inline-block mb-1">
                      Alerta Anti-Atraso de Faturamento
                    </span>
                    <h3 className="text-xl font-black text-slate-900">
                      {unbilledCompletedOrders.length} OSs concluídas aguardando fatura
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Total de <strong>{formatCurrency(totalUnbilledAmount)}</strong> pronto para cobrança imediata.
                    </p>
                    <button
                      type="button"
                      onClick={onNavigateToBilling}
                      className="mt-3 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Faturar Agora
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-900">Faturamento em Dia</h4>
                <p className="text-xs text-slate-500 mt-1">Todas as ordens concluídas foram faturadas.</p>
              </div>
            )}

            {/* Invoicing summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-black text-slate-900">Resumo de Cobranças</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold">Total Faturado</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalInvoicedAmount)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-bold">Total Recebido</span>
                  <p className="text-xl font-black text-emerald-900 mt-1">{formatCurrency(totalPaidAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <h4 className="text-sm font-black text-slate-900">Ciclo de Cobrança Digital</h4>
              <p className="text-xs text-slate-600">
                A assinatura no campo alimenta diretamente o faturamento, eliminando dias de espera do papel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT / PASTE CSV MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-700 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Importar / Colar Dados do Google Sheets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cole as linhas copiadas da sua planilha (18 colunas) ou um arquivo CSV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  Cole aqui as linhas copiadas da sua planilha (Ctrl+V) ou CSV:
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Inserir Dados Reais de Exemplo
                </button>
              </div>

              <textarea
                rows={7}
                value={pastedCsvText}
                onChange={(e) => setPastedCsvText(e.target.value)}
                placeholder={`Número OS\tData / Hora\tCliente / Empresa\tCNPJ / CPF\tLocal\tCategoria\tTítulo do Serviço\tEquipamentos\tValor Total\tStatus\tNome Do Agente ou Serviço Executado\tHora Início\tHora Fim\tQuantidade\tResponsável pelo Preenchimento\tAssinatura\tFoto do Canhoto\tNº da Fatura\n31877\t11/08/2026 14:34\tITA AIRWAYS\t33.683.111/0001-07\tGRU - Terminal 3\tServiços Auxiliares de Transp\tCANCELAMENTO DE VOO AZ675\tCANCELAMENTO DE VOO AZ675\tR$ 4.850,00\tCONCLUÍDA (CAMPO)\tAMANDA APARECIDA VASCO CORTEZ 14286\t14:34\t20:10\t1\tAmanda Aparecida Vasco Cortez\tAssinado\thttps://drive.google.com/drive/folders/wfs-os-31877\tFAT-2026-0891`}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-2xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50"
              />

              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                <strong>Dica para Sincronização Automática 100% Direta:</strong>
                <p className="mt-0.5">
                  No Google Sheets, clique no botão azul <strong>Compartilhar</strong> (canto superior direito) → Em <em>Acesso Geral</em>, altere de &quot;Restrito&quot; para <strong>&quot;Qualquer pessoa com o link&quot;</strong> (função Leitor). Assim o sistema baixa as atualizações automaticamente sem necessidade de copiar e colar.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href={OFFICIAL_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir Google Sheets
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportPasted}
                  disabled={!pastedCsvText.trim()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Processar & Atualizar Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
