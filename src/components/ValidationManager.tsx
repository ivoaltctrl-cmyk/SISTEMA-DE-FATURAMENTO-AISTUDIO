import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Search,
  Sparkles,
  User,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceOrder } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ValidationManagerProps {
  onOpenDetail: (order: ServiceOrder) => void;
  onOpenTeamsModal?: () => void;
  onNavigateToBilling?: () => void;
}

export const ValidationManager: React.FC<ValidationManagerProps> = ({
  onOpenDetail,
  onNavigateToBilling,
}) => {
  const {
    pendingValidationOrders,
    validateOrder,
    currentUser,
    setSelectedOrderForPrint,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const filteredOrders = pendingValidationOrders.filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.osNumber.toLowerCase().includes(term) ||
      o.clientName.toLowerCase().includes(term) ||
      o.title.toLowerCase().includes(term) ||
      o.workLocation.toLowerCase().includes(term) ||
      (o.createdBy && o.createdBy.toLowerCase().includes(term)) ||
      (o.technicianName && o.technicianName.toLowerCase().includes(term))
    );
  });

  const handleApprove = (order: ServiceOrder) => {
    validateOrder(order.id, currentUser?.name || 'Faturamento WFS');
    setActionFeedback(`OS ${order.osNumber} validada e liberada para faturamento com sucesso!`);
    setTimeout(() => setActionFeedback(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanatory Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-transparent border border-amber-300/60 rounded-3xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
              <FileCheck2 className="w-4 h-4 text-amber-700" />
              <span>Fila de Validação Pré-Faturamento</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Validação de Lançamentos & Leituras
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Todas as Ordens de Serviço lançadas chegam nesta esteira. O faturamento confere os dados, realiza eventuais ajustes necessários na OS e clica em <strong>Aprovar & Liberar para Faturamento</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Action Toast Feedback with Direct Link to Invoicing */}
      {actionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          {onNavigateToBilling && (
            <button
              type="button"
              onClick={onNavigateToBilling}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
            >
              <span>Ir para Faturamento & PIX</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por OS, cliente, responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold">Pendentes de Validação:</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black border border-amber-300">
            {pendingValidationOrders.length}
          </span>
        </div>
      </div>

      {/* List of Pending Orders for Validation */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {pendingValidationOrders.length === 0
              ? 'Tudo em dia! Nenhuma OS aguardando validação no momento.'
              : 'Nenhuma OS encontrada para a busca informada.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Novos lançamentos realizados pelo time no campo ou sincronizados da planilha aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const hasClientSignature = Boolean(order.clientSignature?.signatureImage);
            const photoCount = order.photos?.length || 0;
            const itemsCount = (order.equipmentItems?.length || 0) + (order.laborItems?.length || 0) + (order.materialItems?.length || 0);

            return (
              <div
                key={order.id}
                className="bg-white border-2 border-amber-200 hover:border-amber-400 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      {order.osNumber}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Aguardando Validação
                    </span>

                    {order.createdOrigin === 'teams_upload' && (
                      <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Bot className="w-3 h-3 text-indigo-600" /> Via Teams
                      </span>
                    )}

                    {order.createdOrigin === 'digitalizacao_ia' && (
                      <span className="text-[10px] font-bold uppercase bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" /> Digitalizada por IA
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500">Valor Total:</span>
                    <span className="text-lg font-black text-slate-900 ml-2 font-mono text-emerald-700">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Main Content Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Client & Title */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm">{order.clientName}</span>
                    </div>
                    <p className="text-slate-700 font-semibold">{order.title}</p>
                    <p className="text-slate-500 text-[11px] line-clamp-2">{order.description || order.workLocation}</p>
                  </div>

                  {/* Attribution & Metadata */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Lançado por:</span>
                      <span className="font-black text-slate-900 flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-600" />
                        {order.createdBy || 'Técnico de Campo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Data do Lançamento:</span>
                      <span className="text-slate-800">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Itens discriminados:</span>
                      <span className="font-bold text-slate-800">{itemsCount} itens</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Evidências / Fotos:</span>
                      <span className="font-bold text-slate-800">{photoCount} anexos</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Assinatura Cliente:</span>
                      <span className={hasClientSignature ? 'text-emerald-700 font-black' : 'text-amber-700 font-bold'}>
                        {hasClientSignature ? '✓ Assinado no Campo' : 'Pendente de assinatura'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation Actions Toolbar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(order)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Inspecionar & Ajustar Dados</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForPrint(order)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Visualizar OS em formato A4"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>Imprimir / PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleApprove(order)}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aprovar & Liberar para Faturamento</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

