import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  CheckCircle2,
  Clock,
  HardHat,
  MapPin,
  PenTool,
  Phone,
  Send,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceOrder, SignatureData } from '../types';
import { formatCurrency, formatDate, formatPhone, generateWhatsAppBillingMessage } from '../utils/formatters';
import { PhotoUploader } from './PhotoUploader';
import { SignaturePad } from './SignaturePad';

interface QuickFieldModeModalProps {
  order: ServiceOrder;
  onClose: () => void;
}

export const QuickFieldModeModal: React.FC<QuickFieldModeModalProps> = ({ order, onClose }) => {
  const {
    company,
    signOrder,
    addPhotoToOrder,
    deletePhotoFromOrder,
    toggleChecklistItem,
    createInvoiceForOrder,
    setSelectedOrderForPrint,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'checklist' | 'photos' | 'signature' | 'summary'>(
    order.clientSignature ? 'summary' : 'checklist'
  );

  const [showBillingSuccess, setShowBillingSuccess] = useState(false);

  const handleSaveClientSignature = (sigData: SignatureData) => {
    // Generate an automatic technician signature if not already present
    const techSig: SignatureData = {
      signatureImage: sigData.signatureImage, // or standard confirmation
      signerName: order.technicianName,
      signerDocument: 'Responsável Técnico',
      signerRole: 'Técnico de Campo',
      signedAt: new Date().toISOString(),
    };

    signOrder(order.id, sigData, techSig);

    // Trigger celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setActiveTab('summary');
  };

  const handleInstantBilling = () => {
    createInvoiceForOrder(order.id, 'pix');
    setShowBillingSuccess(true);
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 },
    });
  };

  const completedChecklistCount = order.checklist.filter((c) => c.completed).length;
  const allChecklistCompleted = order.checklist.length > 0 && completedChecklistCount === order.checklist.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-150">
        {/* Field Mode Banner Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-full">
                  Modo Campo & Assinatura
                </span>
                <span className="text-xs font-bold text-amber-100">{order.osNumber}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black leading-tight mt-0.5">{order.title}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client & Location Quick Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{order.clientName}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" /> {order.workLocation}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`tel:${order.clientPhone}`}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              <Phone className="w-3 h-3" /> Ligar
            </a>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900 text-sm">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'checklist'
                ? 'border-orange-600 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Checklist ({completedChecklistCount}/{order.checklist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'photos'
                ? 'border-orange-600 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Fotos ({order.photos?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'signature'
                ? 'border-orange-600 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Assinatura {order.clientSignature ? '✓' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-orange-600 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Faturar</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-600" />
                  Conferência de Execução no Canteiro
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Marque cada etapa realizada antes de coletar o aceite do cliente.
                </p>
              </div>

              <div className="space-y-2">
                {order.checklist.map((chk) => (
                  <div
                    key={chk.id}
                    onClick={() => toggleChecklistItem(order.id, chk.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      chk.completed
                        ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                        chk.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {chk.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 text-xs">
                      <p className={`font-semibold ${chk.completed ? 'text-emerald-950' : 'text-slate-800'}`}>
                        {chk.task}
                      </p>
                      {chk.completed && chk.completedAt && (
                        <span className="text-[10px] text-emerald-700 mt-0.5 block">
                          Concluído às {new Date(chk.completedAt).toLocaleTimeString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Items summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-800">Itens discriminados nesta OS:</h4>
                <div className="divide-y divide-slate-200">
                  {order.equipmentItems.map((e, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <span className="font-medium text-slate-700">
                        [Equip.] {e.name} ({e.quantity} {e.unit})
                      </span>
                      <span className="font-bold text-slate-900">{formatCurrency(e.quantity * e.unitPrice)}</span>
                    </div>
                  ))}
                  {order.laborItems.map((l, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <span className="font-medium text-slate-700">
                        [Mão de Obra] {l.name} ({l.quantity} {l.unit})
                      </span>
                      <span className="font-bold text-slate-900">{formatCurrency(l.quantity * l.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Avançar para Fotos de Evidência
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PHOTOS */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <PhotoUploader
                photos={order.photos || []}
                onAddPhoto={(photo) => addPhotoToOrder(order.id, photo)}
                onDeletePhoto={(photoId) => deletePhotoFromOrder(order.id, photoId)}
              />

              <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('checklist')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  ← Voltar ao Checklist
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signature')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2"
                >
                  <PenTool className="w-4 h-4" /> Coletar Assinatura do Cliente
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNATURE */}
          {activeTab === 'signature' && (
            <div className="space-y-4">
              {order.clientSignature ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-900">
                      Ordem de Serviço Assinada no Campo!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Assinado por <strong>{order.clientSignature.signerName}</strong> (
                      {order.clientSignature.signerRole}) em{' '}
                      {new Date(order.clientSignature.signedAt).toLocaleString('pt-BR')}.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 max-w-sm mx-auto">
                    <img
                      src={order.clientSignature.signatureImage}
                      alt="Assinatura"
                      className="max-h-20 mx-auto"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('summary')}
                    className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Ver Resumo e Faturar Imediatamente
                  </button>
                </div>
              ) : (
                <SignaturePad
                  title="Assinatura do Cliente no Local"
                  defaultSignerRole="Encarregado / Responsável do Cliente"
                  onSave={handleSaveClientSignature}
                  termsText={order.termsAcceptedText || company.defaultTerms}
                />
              )}
            </div>
          )}

          {/* TAB 4: SUMMARY & INSTANT BILLING */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              {/* Anti-delay alert banner */}
              <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-3xl p-5 shadow-2xs relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-1.5">
                      Faturamento Ágil Sem Atraso
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{order.clientName}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Valor Total: <strong className="text-slate-900 text-sm">{formatCurrency(order.totalAmount)}</strong>
                    </p>
                  </div>

                  {order.status === 'faturada' || order.status === 'paga' ? (
                    <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Já Faturada ({order.invoiceNumber || 'Emitida'})
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInstantBilling}
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-transform transform active:scale-95 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Emitir Fatura Agora
                    </button>
                  )}
                </div>
              </div>

              {/* WhatsApp Quick Dispatch */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        Enviar Cobrança Instantânea via WhatsApp
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Notifique o financeiro do cliente em 1 clique com chave PIX e resumo.
                      </p>
                    </div>
                  </div>
                </div>

                <a
                  href={`https://wa.me/55${order.clientPhone.replace(/\D/g, '')}?text=${generateWhatsAppBillingMessage(
                    order.clientName,
                    order.osNumber,
                    order.title,
                    order.totalAmount,
                    company.tradeName || company.name,
                    company.pixKey,
                    order.paymentDueDate
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" /> Enviar Mensagem Formatada no WhatsApp
                </a>
              </div>

              {/* View / Print OS */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">
                  Documento digital com canhoto e fotos:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForPrint(order);
                    onClose();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Ver PDF / Imprimir OS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
