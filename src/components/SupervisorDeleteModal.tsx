import React, { useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceOrder } from '../types';

interface SupervisorDeleteModalProps {
  order: ServiceOrder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupervisorDeleteModal: React.FC<SupervisorDeleteModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { supervisorDeleteOrder, currentUser } = useApp();

  const [supervisorName, setSupervisorName] = useState(
    currentUser?.role === 'supervisor' || currentUser?.role === 'master_ti'
      ? currentUser.name
      : 'Roberto Santos (Supervisor)'
  );
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = supervisorDeleteOrder(order.id, supervisorName, reason, password);
    if (!result.success) {
      setError(result.message);
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-2 border-red-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-100 text-red-700">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Trava de Segurança: Exclusão de OS</h3>
              <p className="text-xs text-slate-500 font-medium">Requer autorização de supervisor e justificativa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600">Ordem de Serviço:</span>
            <span className="font-mono font-black text-slate-900">{order.osNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600">Cliente:</span>
            <span className="font-semibold text-slate-900">{order.clientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600">Lançado originalmente por:</span>
            <span className="font-semibold text-slate-800">{order.createdBy || 'Técnico de Campo'}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Nome do Supervisor Responsável pelo Cancelamento
            </label>
            <input
              type="text"
              required
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="Nome do supervisor ou coordenador"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Motivo do Cancelamento / Exclusão (Obrigatório para Auditoria)
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva claramente o motivo (ex: OS duplicada pelo operador, cliente cancelou a locação do gerador antes da mobilização...)"
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Senha de Autorização do Supervisor / Master (Padrão: <span className="font-mono text-red-600">admin</span>)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl font-bold text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Confirmar Exclusão & Arquivar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
