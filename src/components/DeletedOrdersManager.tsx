import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceOrder } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { OFFICIAL_SHEET_URL } from '../services/sheetsService';

interface DeletedOrdersManagerProps {
  onOpenDetail: (order: ServiceOrder) => void;
}

export const DeletedOrdersManager: React.FC<DeletedOrdersManagerProps> = ({ onOpenDetail }) => {
  const { deletedOrders, restoreDeletedOrder, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  const filtered = deletedOrders.filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.osNumber.toLowerCase().includes(term) ||
      o.clientName.toLowerCase().includes(term) ||
      (o.deletedBy && o.deletedBy.toLowerCase().includes(term)) ||
      (o.deletionReason && o.deletionReason.toLowerCase().includes(term))
    );
  });

  const handleRestore = (order: ServiceOrder) => {
    restoreDeletedOrder(order.id, currentUser?.name || 'Supervisor WFS');
    setRestoreFeedback(`Ordem de Serviço ${order.osNumber} reativada com sucesso para a fila de validação!`);
    setTimeout(() => setRestoreFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Informative Header */}
      <div className="bg-white border-2 border-red-200 rounded-3xl p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-black">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">Registro de OSs Excluídas & Canceladas</h2>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black border border-red-300">
                  Trava de Auditoria Ativa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nenhum dado é apagado sem rastro. Toda exclusão exige autorização de supervisor, motivo obrigatório e fica registrada para a controladoria e Google Sheets.
              </p>
            </div>
          </div>

          <a
            href={OFFICIAL_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auditoria na Planilha</span>
          </a>
        </div>
      </div>

      {/* Feedback Alert */}
      {restoreFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{restoreFeedback}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por OS, supervisor, motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-all"
          />
        </div>

        <div className="text-xs text-slate-600 font-medium">
          Total de registros excluídos: <strong className="text-red-700 font-black">{deletedOrders.length}</strong>
        </div>
      </div>

      {/* List of Deleted Orders */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-3xl mx-auto flex items-center justify-center">
            <Trash2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {deletedOrders.length === 0 ? 'Nenhuma OS excluída ou cancelada.' : 'Nenhum registro encontrado.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Quando um supervisor realizar o cancelamento com justificativa, o histórico completo aparecerá arquivado aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-200 hover:border-red-300 rounded-3xl p-5 shadow-sm space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm text-slate-500 bg-slate-100 line-through px-3 py-1 rounded-xl">
                    {order.osNumber}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Excluída / Cancelada
                  </span>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500">Valor da OS:</span>
                  <span className="font-bold text-slate-700 ml-2 font-mono">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Client and Title */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900">{order.clientName}</span>
                  </div>
                  <p className="text-slate-600">{order.title}</p>
                </div>

                {/* Audit Deletion Info */}
                <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-red-950">
                    <span className="font-bold">Excluído por:</span>
                    <span className="font-black text-red-800">{order.deletedBy || 'Supervisor Autorizado'}</span>
                  </div>
                  <div className="flex items-center justify-between text-red-950">
                    <span className="font-bold">Data do Cancelamento:</span>
                    <span>{formatDate(order.deletedAt || order.createdAt)}</span>
                  </div>
                  <div className="text-red-900 pt-1 border-t border-red-200/60">
                    <span className="font-bold">Motivo Informado:</span>
                    <p className="italic text-slate-800 mt-0.5 font-medium">"{order.deletionReason || 'Cancelamento operacional'}"</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => onOpenDetail(order)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ver Histórico & Detalhes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRestore(order)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reativar Ordem de Serviço</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
