import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ResetSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetSystemModal: React.FC<ResetSystemModalProps> = ({ isOpen, onClose }) => {
  const { clearAllData, clearOrders, clearInvoices, syncWithGoogleSheet } = useApp();
  const [selectedOption, setSelectedOption] = useState<'empty_all' | 'orders_invoices' | 'resync_sheets'>('empty_all');
  const [confirmText, setConfirmText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (selectedOption === 'empty_all') {
      if (confirmText.trim().toUpperCase() !== 'ZERAR') {
        alert('Por favor, digite a palavra ZERAR para confirmar a exclusão de todos os dados.');
        return;
      }
      clearAllData('empty_database');
      setSuccessMessage('Sistema completamente zerado com sucesso! Banco limpo pronto para produção.');
    } else if (selectedOption === 'orders_invoices') {
      clearAllData('orders_and_invoices');
      setSuccessMessage('Todas as Ordens de Serviço e Faturas foram excluídas com sucesso!');
    } else if (selectedOption === 'resync_sheets') {
      try {
        const res = await syncWithGoogleSheet();
        setSuccessMessage(`Sincronização concluída! ${res.count} ordens atualizadas da planilha oficial.`);
      } catch (err) {
        setSuccessMessage('Sincronização acionada com o Google Sheets.');
      }
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setConfirmText('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-red-100 text-red-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Zerar Dados / Limpar Sistema</h3>
              <p className="text-xs text-slate-500">Exclua os exemplos para iniciar suas operações reais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-emerald-800">{successMessage}</h4>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed font-medium">
              Escolha qual ação deseja executar na base de dados local:
            </p>

            {/* Options */}
            <div className="space-y-2.5">
              {/* Option 1: Clean All for Production */}
              <label
                onClick={() => setSelectedOption('empty_all')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedOption === 'empty_all'
                    ? 'border-red-500 bg-red-50/70 text-red-950'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_opt"
                  checked={selectedOption === 'empty_all'}
                  onChange={() => setSelectedOption('empty_all')}
                  className="mt-0.5 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    🗑️ Zerar Todo o Sistema (Banco 100% Limpo para Produção)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Apaga todas as Ordens de Serviço, Faturas, Clientes e Catálogo de teste. O sistema fica totalmente novo.
                  </span>
                </div>
              </label>

              {/* Option 2: Clear Orders & Invoices Only */}
              <label
                onClick={() => setSelectedOption('orders_invoices')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedOption === 'orders_invoices'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_opt"
                  checked={selectedOption === 'orders_invoices'}
                  onChange={() => setSelectedOption('orders_invoices')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    📄 Excluir Somente Ordens de Serviço & Faturas de Exemplo
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Mantém os dados cadastrais (clientes e catálogo), mas zera todo o histórico de OSs e cobranças.
                  </span>
                </div>
              </label>

              {/* Option 3: Re-sync from Google Sheets */}
              <label
                onClick={() => setSelectedOption('resync_sheets')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedOption === 'resync_sheets'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_opt"
                  checked={selectedOption === 'resync_sheets'}
                  onChange={() => setSelectedOption('resync_sheets')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    🔄 Forçar Re-sincronização do Google Sheets
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Recarrega em tempo real todos os dados corporativos autênticos diretamente da planilha oficial.
                  </span>
                </div>
              </label>
            </div>

            {/* Safety Confirmation for Complete Wipe */}
            {selectedOption === 'empty_all' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Confirmação de Segurança Requerida:</span>
                </div>
                <p className="text-[11px] text-red-700">
                  Para confirmar que deseja apagar todos os dados locais em cache, digite <strong>ZERAR</strong> no campo abaixo:
                </p>
                <input
                  type="text"
                  placeholder="Digite ZERAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-white border border-red-300 rounded-xl p-2 font-mono font-bold text-red-900 uppercase focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className={`px-5 py-2.5 font-black text-xs rounded-xl text-white shadow-md transition-all flex items-center gap-1.5 ${
                  selectedOption === 'empty_all'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                    : selectedOption === 'orders_invoices'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                {selectedOption === 'empty_all' && <Trash2 className="w-4 h-4" />}
                {selectedOption === 'orders_invoices' && <Trash2 className="w-4 h-4" />}
                {selectedOption === 'resync_sheets' && <RefreshCw className="w-4 h-4" />}
                {selectedOption === 'resync_sheets' ? 'Sincronizar Agora' : 'Confirmar Limpeza'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
