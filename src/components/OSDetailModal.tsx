import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Bot,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileCheck2,
  HardHat,
  History,
  Lock,
  MapPin,
  PenTool,
  Phone,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OSStatus, ServiceOrder, SignatureData } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  formatPhone,
  generateOSShareWhatsApp,
  generateWhatsAppBillingMessage,
  getHoursSinceCompletion,
} from '../utils/formatters';
import { PhotoUploader } from './PhotoUploader';
import { SignaturePad } from './SignaturePad';
import { SupervisorDeleteModal } from './SupervisorDeleteModal';

interface OSDetailModalProps {
  order: ServiceOrder;
  onClose: () => void;
  onEdit: (order: ServiceOrder) => void;
}

export const OSDetailModal: React.FC<OSDetailModalProps> = ({ order, onClose, onEdit }) => {
  const {
    company,
    updateOrderStatus,
    validateOrder,
    signOrder,
    addPhotoToOrder,
    deletePhotoFromOrder,
    toggleChecklistItem,
    createInvoiceForOrder,
    setSelectedOrderForPrint,
    setSelectedOrderForFieldMode,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'geral' | 'itens' | 'checklist' | 'fotos' | 'assinatura' | 'faturamento' | 'historico'
  >('geral');
  const [showSignPad, setShowSignPad] = useState(false);
  const [showSupervisorDelete, setShowSupervisorDelete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'pix' | 'boleto' | 'transferencia' | 'cartao' | 'faturado'
  >('pix');
  const [customDueDate, setCustomDueDate] = useState('');

  const statusColors: Record<OSStatus, { label: string; bg: string; text: string; border: string }> = {
    aguardando_validacao: {
      label: 'Aguardando Validação',
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      border: 'border-amber-300',
    },
    orcamento: { label: 'Orçamento', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    agendada: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    concluida: { label: 'Concluída (Validada)', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    faturada: { label: 'Faturada', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    paga: { label: 'Paga / Recebida', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    cancelada: { label: 'Cancelada / Excluída', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  };

  const currentStatusConfig = statusColors[order.status] || statusColors.agendada;

  const hoursLag = getHoursSinceCompletion(order.completedAt);
  const isUnbilledAlert = order.status === 'concluida' && hoursLag >= (company.billingAlertHours || 24);

  const handleSaveSignature = (sig: SignatureData) => {
    signOrder(order.id, sig);
    setShowSignPad(false);
    confetti({
      particleCount: 70,
      spread: 60,
    });
  };

  const handleCreateInvoice = () => {
    createInvoiceForOrder(order.id, selectedPaymentMethod, customDueDate || undefined);
    confetti({
      particleCount: 100,
      spread: 80,
    });
  };

  const handleValidateNow = () => {
    validateOrder(order.id, currentUser?.name || 'Faturamento');
    confetti({
      particleCount: 80,
      spread: 70,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-2xl text-white">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xl text-slate-900 font-mono">{order.osNumber}</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentStatusConfig.bg} ${currentStatusConfig.text} ${currentStatusConfig.border}`}
                >
                  {currentStatusConfig.label}
                </span>

                {order.createdOrigin === 'teams_upload' && (
                  <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Bot className="w-3 h-3 text-indigo-600" /> Teams ({order.teamsSenderName || 'Operador'})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lançado por <strong className="text-slate-800">{order.createdBy || 'Técnico de Campo'}</strong> em {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {order.status === 'aguardando_validacao' && (
              <button
                type="button"
                onClick={handleValidateNow}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar Validação</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(order)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderForPrint(order)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {order.status !== 'cancelada' && (
              <button
                type="button"
                onClick={() => setShowSupervisorDelete(true)}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Exclusão protegida por supervisor com motivo"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unbilled Warning Banner */}
        {isUnbilledAlert && (
          <div className="bg-orange-500 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold shadow-inner">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>
                ALERTA FISCAL: Esta OS foi concluída há {hoursLag} horas e ainda não foi faturada!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('faturamento')}
              className="underline font-black hover:text-orange-100 cursor-pointer"
            >
              Emitir Fatura Agora &rarr;
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-1 sm:gap-4 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'geral'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Visão Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('itens')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'itens'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Equipamentos & Mão de Obra
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Checklist ({order.checklist?.filter((c) => c.completed).length || 0}/
            {order.checklist?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fotos')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'fotos'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Fotos & Canhotos ({order.photos?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assinatura')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'assinatura'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Assinatura Digital
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faturamento')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'faturamento'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Faturamento & PIX
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`py-3 px-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'historico'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Histórico & Rastreabilidade
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              {/* Main summary card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                    Dados do Cliente
                  </span>
                  <h4 className="text-base font-bold text-slate-900">{order.clientName}</h4>
                  <p className="text-xs text-slate-600 font-mono">{formatDocument(order.clientDocument)}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {formatPhone(order.clientPhone)}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    {order.workLocation}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                    Execução & Valores (Planilha 18 Colunas)
                  </span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Data Agendada:</span>
                    <span className="font-bold text-slate-800">{formatDate(order.scheduledDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Agente de Pista:</span>
                    <span className="font-bold text-slate-900">
                      {order.agentName || order.technicianName || '-'}
                      {order.agentBadge && (
                        <span className="ml-1 text-[10px] text-slate-500 font-mono">
                          (Matrícula: {order.agentBadge})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Horário em Pista:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {order.startTime || '--:--'} às {order.endTime || '--:--'}
                      {order.durationFormatted && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px]">
                          {order.durationFormatted}
                        </span>
                      )}
                    </span>
                  </div>
                  {order.quantity && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Quantidade:</span>
                      <span className="font-bold text-slate-800">{order.quantity}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Responsável pelo Preenchimento:</span>
                    <span className="font-bold text-slate-900">{order.filledBy || order.createdBy || 'Técnico de Campo'}</span>
                  </div>
                  {order.validatedBy && (
                    <div className="flex justify-between items-center text-xs text-emerald-800">
                      <span className="font-bold">Validado no Faturamento por:</span>
                      <span className="font-black">{order.validatedBy}</span>
                    </div>
                  )}
                  {order.canhotoUrl && (
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-500">Canhoto Google Drive:</span>
                      <a
                        href={order.canhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 text-[11px]"
                      >
                        Abrir Canhoto <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Valor Total:</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900">{order.title}</h4>
                <p className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {order.description || 'Sem descrição detalhada.'}
                </p>
              </div>

              {/* Validation Notes if any */}
              {order.validationNotes && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs space-y-1">
                  <span className="font-bold block">Observações da Validação / Faturamento:</span>
                  <p className="text-slate-800">{order.validationNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ITENS */}
          {activeTab === 'itens' && (
            <div className="space-y-4">
              {/* Equipment items */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Equipamentos Locados ({order.equipmentItems?.length || 0})
                </h4>
                {order.equipmentItems && order.equipmentItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Equipamento</th>
                          <th className="p-3">Unidade</th>
                          <th className="p-3">Qtd</th>
                          <th className="p-3">Valor Unit.</th>
                          <th className="p-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.equipmentItems.map((eq) => (
                          <tr key={eq.id}>
                            <td className="p-3 font-semibold text-slate-900">{eq.name}</td>
                            <td className="p-3 uppercase text-slate-500">{eq.unit}</td>
                            <td className="p-3">{eq.quantity}</td>
                            <td className="p-3 font-mono">{formatCurrency(eq.unitPrice)}</td>
                            <td className="p-3 font-bold font-mono text-right text-slate-900">
                              {formatCurrency(eq.quantity * eq.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhum equipamento registrado.</p>
                )}
              </div>

              {/* Labor items */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Mão de Obra Especializada ({order.laborItems?.length || 0})
                </h4>
                {order.laborItems && order.laborItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Serviço / Profissional</th>
                          <th className="p-3">Unidade</th>
                          <th className="p-3">Qtd</th>
                          <th className="p-3">Valor Unit.</th>
                          <th className="p-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.laborItems.map((lb) => (
                          <tr key={lb.id}>
                            <td className="p-3 font-semibold text-slate-900">{lb.name}</td>
                            <td className="p-3 uppercase text-slate-500">{lb.unit}</td>
                            <td className="p-3">{lb.quantity}</td>
                            <td className="p-3 font-mono">{formatCurrency(lb.unitPrice)}</td>
                            <td className="p-3 font-bold font-mono text-right text-slate-900">
                              {formatCurrency(lb.quantity * lb.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhuma mão de obra registrada.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              {order.checklist && order.checklist.length > 0 ? (
                order.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(order.id, item.id)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                      item.completed
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          item.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {item.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className={item.completed ? 'line-through text-slate-500' : 'font-semibold'}>
                        {item.task}
                      </span>
                    </div>
                    {item.completedAt && (
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(item.completedAt)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum checklist configurado.</p>
              )}
            </div>
          )}

          {/* TAB 4: FOTOS */}
          {activeTab === 'fotos' && (
            <PhotoUploader
              photos={order.photos || []}
              onAddPhoto={(ph) => addPhotoToOrder(order.id, ph)}
              onDeletePhoto={(phId) => deletePhotoFromOrder(order.id, phId)}
            />
          )}

          {/* TAB 5: ASSINATURA */}
          {activeTab === 'assinatura' && (
            <div className="space-y-4">
              {order.clientSignature ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">
                    Assinatura Digital Coletada com Sucesso
                  </h4>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    O cliente aceitou e validou a prestação no local. A OS está pronta e homologada para cobrança imediata.
                  </p>

                  <div className="bg-white p-4 rounded-xl border border-emerald-200 max-w-md mx-auto shadow-xs">
                    <img
                      src={order.clientSignature.signatureImage}
                      alt="Assinatura"
                      className="max-h-24 mx-auto"
                    />
                    <div className="border-t border-slate-200 pt-2 mt-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900">{order.clientSignature.signerName}</p>
                      <p className="text-[11px] text-slate-500">
                        Documento: {order.clientSignature.signerDocument || 'Não informado'} | Cargo: {order.clientSignature.signerRole}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                        Carimbo de Data/Hora: {formatDateTime(order.clientSignature.signedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {!showSignPad ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 space-y-3">
                      <PenTool className="w-8 h-8 text-slate-400 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">Nenhuma assinatura coletada ainda</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Coletar a assinatura no próprio celular ou tablet do técnico no campo elimina o atraso de papelada e impede contestações de faturamento.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowSignPad(true)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PenTool className="w-4 h-4" /> Coletar Assinatura Agora
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      title="Assinatura Digital do Cliente"
                      onSave={handleSaveSignature}
                      onCancel={() => setShowSignPad(false)}
                      termsText={order.termsAcceptedText || company.defaultTerms}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FATURAMENTO & COBRANÇA */}
          {activeTab === 'faturamento' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">Emissão de Fatura / Cobrança</h4>
                    <p className="text-xs text-slate-500">
                      Gere a fatura oficial e envie a chave PIX ou boleto para o financeiro do cliente.
                    </p>
                  </div>
                  {order.invoiceNumber && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300">
                      Fatura: {order.invoiceNumber}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                    <select
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold bg-white"
                    >
                      <option value="pix">PIX Instantâneo (Chave da Empresa)</option>
                      <option value="boleto">Boleto Bancário</option>
                      <option value="transferencia">Transferência / TED</option>
                      <option value="faturado">Faturado 15/30 Dias</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-sm font-black text-slate-900">
                    Total a Cobrar: <strong className="text-emerald-600 font-mono">{formatCurrency(order.totalAmount)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateInvoice}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    {order.invoiceNumber ? 'Atualizar Fatura' : 'Gerar Fatura Oficial'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: HISTÓRICO & RASTREABILIDADE */}
          {activeTab === 'historico' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-red-600" />
                  Trilha de Auditoria e Governança
                </h4>
                <p className="text-[11px] text-slate-500">
                  Todos os eventos, responsáveis, horários e alterações desta OS ficam permanentemente registrados.
                </p>
              </div>

              {order.auditLogs && order.auditLogs.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {order.auditLogs.map((log) => (
                    <div key={log.id} className="relative text-xs space-y-1">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-red-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(log.timestamp)}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-block">
                        {log.action.replace('_', ' ')}
                      </span>
                      {log.details && <p className="text-slate-600 text-xs">{log.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
                  Lançamento inicial registrado em {formatDate(order.createdAt)} por {order.createdBy || 'Técnico'}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Supervisor Delete Modal */}
      <SupervisorDeleteModal
        order={order}
        isOpen={showSupervisorDelete}
        onClose={() => setShowSupervisorDelete(false)}
        onSuccess={() => {
          onClose();
        }}
      />
    </div>
  );
};
