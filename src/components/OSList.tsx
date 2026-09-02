import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Kanban,
  List,
  MoreVertical,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OSStatus, ServiceOrder, ServiceTypeCategory } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  getHoursSinceCompletion,
} from '../utils/formatters';
import { exportOrdersToCSV } from '../services/sheetsService';
import { SupervisorDeleteModal } from './SupervisorDeleteModal';

interface OSListProps {
  onNewOS?: () => void;
  initialFilterStatus?: OSStatus;
}

export const OSList: React.FC<OSListProps> = ({ onNewOS, initialFilterStatus }) => {
  const {
    orders,
    company,
    addOrder,
    setSelectedOrderForDetail,
    setSelectedOrderForFieldMode,
    setSelectedOrderForPrint,
    createBatchInvoice,
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilterStatus || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyOverdueBilling, setOnlyOverdueBilling] = useState(false);

  // Supervisor delete modal state
  const [orderToDelete, setOrderToDelete] = useState<ServiceOrder | null>(null);

  // Batch selection for multi-invoicing
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Filter logic
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search across all 18 columns
      const searchMatch =
        searchTerm === '' ||
        o.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.agentName && o.agentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.agentBadge && o.agentBadge.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.filledBy && o.filledBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.workLocation && o.workLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.technicianName && o.technicianName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.createdBy && o.createdBy.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status
      const statusMatch = selectedStatus === 'all' || o.status === selectedStatus;

      // Category
      const catMatch = selectedCategory === 'all' || o.category === selectedCategory;

      // Overdue billing
      const hoursLag = getHoursSinceCompletion(o.completedAt);
      const overdueMatch =
        !onlyOverdueBilling ||
        (o.status === 'concluida' && hoursLag >= (company.billingAlertHours || 24));

      return searchMatch && statusMatch && catMatch && overdueMatch;
    });
  }, [
    orders,
    searchTerm,
    selectedStatus,
    selectedCategory,
    onlyOverdueBilling,
    company.billingAlertHours,
  ]);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleConfirmBatchInvoice = () => {
    if (selectedOrderIds.length === 0) return;
    createBatchInvoice(selectedOrderIds);
    setSelectedOrderIds([]);
    setShowBatchModal(false);
    confetti({
      particleCount: 120,
      spread: 80,
    });
  };

  const handleExportCSV = () => {
    exportOrdersToCSV(filteredOrders);
  };

  const statusBadges: Record<OSStatus, { label: string; bg: string; text: string; border: string }> = {
    aguardando_validacao: {
      label: 'Aguardando Validação',
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
    },
    orcamento: { label: 'Orçamento', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    agendada: { label: 'Agendada', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    concluida: { label: 'Concluída (Validada)', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
    faturada: { label: 'Faturada', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    paga: { label: 'Paga / Baixada', bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' },
    cancelada: { label: 'Cancelada', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  };

  const kanbanColumns = [
    { id: 'aguardando_validacao', title: 'Validação', color: 'border-amber-500' },
    { id: 'agendada', title: 'Agendadas', color: 'border-blue-500' },
    { id: 'em_andamento', title: 'Em Execução', color: 'border-amber-500' },
    { id: 'concluida', title: 'A Faturar', color: 'border-orange-500' },
    { id: 'faturada', title: 'Faturadas / PIX', color: 'border-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Ordens de Serviço</h2>
            <p className="text-xs text-slate-500">
              Gestão operacional, acompanhamento de campo e histórico de atendimento
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedOrderIds.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Faturar ({selectedOrderIds.length}) em Lote</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {onNewOS && (
              <button
                type="button"
                onClick={onNewOS}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Ordem de Serviço</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar OS, cliente, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-slate-700 font-semibold focus:outline-none focus:border-red-600 focus:bg-white"
            >
              <option value="all">Todos os Status ({orders.length})</option>
              <option value="aguardando_validacao">Aguardando Validação</option>
              <option value="agendada">Agendadas</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluídas (Prontas para Faturar)</option>
              <option value="faturada">Faturadas</option>
              <option value="paga">Pagas</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-slate-700 font-semibold focus:outline-none focus:border-red-600 focus:bg-white"
            >
              <option value="all">Todas as Categorias</option>
              <option value="locacao_equipamento">Locação de Equipamentos GSE</option>
              <option value="mao_de_obra">Mão de Obra Especializada</option>
              <option value="manutencao">Manutenção Preventiva / Corretiva</option>
              <option value="misto">Misto (Equipamento + Operador)</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
              <input
                type="checkbox"
                checked={onlyOverdueBilling}
                onChange={(e) => setOnlyOverdueBilling(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-[11px] text-orange-700 font-bold">Apenas Atrasadas ({company.billingAlertHours}h)</span>
            </label>

            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-xl transition-all ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-red-600' : 'text-slate-500'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-xl transition-all ${
                  viewMode === 'kanban' ? 'bg-white shadow-xs text-red-600' : 'text-slate-500'
                }`}
                title="Visualização em Kanban"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        selectedOrderIds.length === filteredOrders.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="py-3.5 px-4">Nº OS</th>
                  <th className="py-3.5 px-4">Cliente / Local</th>
                  <th className="py-3.5 px-4">Título do Serviço</th>
                  <th className="py-3.5 px-4">Agente & Horários</th>
                  <th className="py-3.5 px-4">Lançado por</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Valor Total</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Nenhuma ordem de serviço encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const badge = statusBadges[order.status] || statusBadges.agendada;
                    const isSelected = selectedOrderIds.includes(order.id);
                    const hoursLag = getHoursSinceCompletion(order.completedAt);
                    const isOverdue =
                      order.status === 'concluida' &&
                      hoursLag >= (company.billingAlertHours || 24);

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                          {order.osNumber}
                          {isOverdue && (
                            <span
                              className="ml-2 inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping"
                              title="Alerta: Atraso no faturamento"
                            />
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{order.clientName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <span>{order.workLocation}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                          {order.title}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[180px]">
                            {order.agentName || order.technicianName || '-'}
                          </div>
                          {(order.startTime || order.endTime) ? (
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-red-600 shrink-0" />
                              <span>{order.startTime || '--:--'} às {order.endTime || '--:--'}</span>
                              {order.durationFormatted && (
                                <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded">
                                  ({order.durationFormatted})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">Horário livre</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="font-semibold text-slate-900">{order.filledBy || order.createdBy || 'Técnico'}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(order.scheduledDate)}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForFieldMode(order)}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl"
                              title="Modo Campo / Assinatura do Cliente"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedOrderForPrint(order)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                              title="Imprimir / PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedOrderForDetail(order)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Excluir com Trava de Supervisor"
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
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.id);
            const colTotal = colOrders.reduce((sum, o) => sum + o.totalAmount, 0);

            return (
              <div
                key={col.id}
                className={`bg-slate-100/70 rounded-3xl p-3.5 border-t-4 ${col.color} flex flex-col space-y-3 min-h-[500px]`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase">{col.title}</h3>
                    <span className="text-[10px] text-slate-500 font-semibold font-mono">
                      {formatCurrency(colTotal)}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-white text-slate-800 font-bold text-xs rounded-full border border-slate-200">
                    {colOrders.length}
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto flex-1">
                  {colOrders.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">Vazio</div>
                  ) : (
                    colOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-slate-900 font-mono">{ord.osNumber}</span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatDate(ord.scheduledDate)}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{ord.title}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{ord.clientName}</p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="font-black text-emerald-700 font-mono">
                            {formatCurrency(ord.totalAmount)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForFieldMode(ord)}
                              className="p-1 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200"
                              title="Modo Campo"
                            >
                              <Smartphone className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForDetail(ord)}
                              className="px-2 py-0.5 bg-slate-900 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(ord)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Excluir OS"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supervisor Delete Modal */}
      {orderToDelete && (
        <SupervisorDeleteModal
          order={orderToDelete}
          isOpen={true}
          onClose={() => setOrderToDelete(null)}
          onSuccess={() => setOrderToDelete(null)}
        />
      )}

      {/* Batch Invoicing Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600" />
              Faturamento em Lote
            </h3>
            <p className="text-xs text-slate-600">
              Você está prestes a gerar uma fatura consolidada unificando as{' '}
              <strong>{selectedOrderIds.length} Ordens de Serviço</strong> selecionadas.
            </p>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto space-y-1.5 text-xs">
              {orders
                .filter((o) => selectedOrderIds.includes(o.id))
                .map((o) => (
                  <div key={o.id} className="flex justify-between font-medium">
                    <span>
                      {o.osNumber} - {o.clientName}
                    </span>
                    <span className="font-bold font-mono">{formatCurrency(o.totalAmount)}</span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-between font-black text-sm pt-2">
              <span>Total da Fatura:</span>
              <span className="text-emerald-600 text-lg font-mono">
                {formatCurrency(
                  orders
                    .filter((o) => selectedOrderIds.includes(o.id))
                    .reduce((s, o) => s + o.totalAmount, 0)
                )}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchInvoice}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Confirmar e Emitir Fatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
