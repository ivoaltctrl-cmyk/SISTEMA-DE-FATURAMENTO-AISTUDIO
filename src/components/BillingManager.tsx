import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  generateWhatsAppBillingMessage,
  getHoursSinceCompletion
} from '../utils/formatters';

export const BillingManager: React.FC = () => {
  const {
    company,
    invoices,
    unbilledCompletedOrders,
    createInvoiceForOrder,
    updateInvoiceStatus,
    deleteInvoice,
    clearInvoices,
    setSelectedOrderForDetail,
    setSelectedOrderForPrint,
    orders,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pendentes_faturar' | 'faturas_emitidas'>('pendentes_faturar');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  const handleQuickBill = (orderId: string) => {
    createInvoiceForOrder(orderId, 'pix');
    confetti({
      particleCount: 80,
      spread: 70,
    });
  };

  const handleMarkPaid = (invId: string) => {
    updateInvoiceStatus(invId, 'paga');
    confetti({
      particleCount: 70,
      spread: 60,
    });
  };

  const handleCopyPix = (pix: string, id: string) => {
    navigator.clipboard.writeText(pix);
    setCopiedInvoiceId(id);
    setTimeout(() => setCopiedInvoiceId(null), 2000);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = 'Numero_Fatura,Cliente,Documento,OS_Vinculadas,Valor_Total,Data_Emissao,Vencimento,Status,Forma_Pagamento\n';
    const rows = invoices.map((inv) => {
      return `"${inv.invoiceNumber}","${inv.clientName}","${inv.clientDocument}","${inv.osNumbers.join(';')}",${inv.totalAmount},"${inv.issueDate}","${inv.dueDate}","${inv.status}","${inv.paymentMethod}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Faturas_OS_Digital_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.osNumbers.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnbilled = unbilledCompletedOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paga').reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Central de Faturamento & Cobranças</h2>
          <p className="text-xs text-slate-500">
            Elimine o delay de recebimento com emissão imediata e disparo de cobranças via PIX e WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Exportar CSV/Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-5 rounded-3xl shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-orange-100">
            A Faturar Imediatamente
          </span>
          <h3 className="text-2xl font-black mt-1">{formatCurrency(totalUnbilled)}</h3>
          <p className="text-xs text-orange-100 mt-1">
            {unbilledCompletedOrders.length} OS(s) concluídas no campo aguardando fatura
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Emitido
          </span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalBilled)}</h3>
          <p className="text-xs text-slate-500 mt-1">{invoices.length} faturas geradas</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Recebido / Pago
          </span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalPaid)}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {invoices.filter((i) => i.status === 'paga').length} faturas liquidadas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('pendentes_faturar')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pendentes_faturar'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Ordens Concluídas Aguardando Faturamento ({unbilledCompletedOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faturas_emitidas')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'faturas_emitidas'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Faturas Emitidas ({invoices.length})</span>
        </button>
      </div>

      {/* TAB 1: UNBILLED COMPLETED ORDERS (ANTI-DELAY LIST) */}
      {activeTab === 'pendentes_faturar' && (
        <div className="space-y-4">
          {unbilledCompletedOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-black text-slate-900">Nenhum faturamento em atraso!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todas as ordens de serviço assinadas no campo já foram convertidas em faturas e enviadas aos clientes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unbilledCompletedOrders.map((ord) => {
                const hours = getHoursSinceCompletion(ord.completedAt);
                const isOverdue = hours >= (company.billingAlertHours || 24);

                return (
                  <div
                    key={ord.id}
                    className={`bg-white rounded-3xl p-5 border transition-all space-y-4 shadow-2xs ${
                      isOverdue ? 'border-rose-400 bg-rose-50/20' : 'border-orange-300 bg-orange-50/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{ord.osNumber}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isOverdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-orange-100 text-orange-900'
                            }`}
                          >
                            {isOverdue ? `Atraso: ${hours}h` : `Concluída há ${hours}h`}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 mt-1">{ord.clientName}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{ord.title}</p>
                      </div>

                      <span className="text-lg font-black text-emerald-600">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Assinado por:</span>
                        <span className="font-bold text-slate-800">
                          {ord.clientSignature?.signerName || 'Encarregado no local'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Data do aceite:</span>
                        <span>{formatDateTime(ord.completedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetail(ord)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
                      >
                        Ver Detalhes
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickBill(ord.id)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-transform transform active:scale-95"
                      >
                        <Receipt className="w-4 h-4" /> Emitir Fatura Agora
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVOICES LIST */}
      {activeTab === 'faturas_emitidas' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por fatura, cliente ou OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold"
              >
                <option value="all">Todos os Status de Fatura</option>
                <option value="enviada">Enviadas (Aguardando Pagamento)</option>
                <option value="paga">Pagas / Liquidadas</option>
                <option value="pendente">Pendentes</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Fatura Nº</th>
                    <th className="py-3 px-4">Cliente / OSs</th>
                    <th className="py-3 px-3">Vencimento</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-center">Ações / Cobrança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma fatura encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.status === 'paga';
                      const clientPhone = orders.find((o) => o.clientId === inv.clientId)?.clientPhone || '11999999999';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-black text-slate-900">{inv.invoiceNumber}</span>
                            <span className="block text-[10px] text-slate-500">
                              Emitido em {formatDate(inv.issueDate)}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="font-bold text-slate-900 truncate">{inv.clientName}</div>
                            <div className="text-[10px] text-blue-700 font-semibold truncate">
                              OS: {inv.osNumbers.join(', ')}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{formatDate(inv.dueDate)}</span>
                            <span className="block text-[10px] text-slate-500 uppercase">{inv.paymentMethod}</span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isPaid ? 'PAGA' : 'ENVIADA'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="font-black text-slate-900 text-sm">
                              {formatCurrency(inv.totalAmount)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* WhatsApp Direct Billing Link */}
                              <a
                                href={`https://wa.me/55${clientPhone.replace(/\D/g, '')}?text=${generateWhatsAppBillingMessage(
                                  inv.clientName,
                                  inv.osNumbers.join(', '),
                                  inv.notes || 'Serviços Prestados',
                                  inv.totalAmount,
                                  company.tradeName || company.name,
                                  inv.pixKey || company.pixKey,
                                  inv.dueDate
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl"
                                title="Cobrar via WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </a>

                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(inv.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                                  title="Confirmar Pagamento Recebido"
                                >
                                  Dar Baixa
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja excluir a fatura ${inv.invoiceNumber}?`)) {
                                    deleteInvoice(inv.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title="Excluir Fatura"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
