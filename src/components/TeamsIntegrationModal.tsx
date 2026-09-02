import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { digitizePhysicalOS } from '../services/geminiOcrService';

interface TeamsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (osId: string) => void;
}

export const TeamsIntegrationModal: React.FC<TeamsIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addOrder, users } = useApp();
  const [activeTab, setActiveTab] = useState<'simulator' | 'guide' | 'webhook'>('simulator');

  // Simulator form state
  const [senderName, setSenderName] = useState(users[0]?.name || 'Carlos Silva');
  const [channelName, setChannelName] = useState('📍 #os-campo-operacoes');
  const [messageText, setMessageText] = useState('Segue canhoto da OS de atendimento no Pátio 2 GRU.');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSimulateTeamsPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64) {
      setErrorMsg('Por favor, anexe uma foto da Ordem de Serviço física para o Teams.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Call Gemini OCR backend
      const ocrResult = await digitizePhysicalOS(imageBase64);

      // Create new OS with origin teams_upload and status 'aguardando_validacao'
      const newOrder = addOrder({
        clientId: 'cli-1',
        clientName: ocrResult.clientName || 'Cliente Identificado no Teams',
        clientDocument: ocrResult.clientDocument || '',
        clientPhone: ocrResult.clientPhone || '',
        clientEmail: '',
        workLocation: ocrResult.workLocation || 'Local de Operação Informado',
        category: ocrResult.category || 'misto',
        title: ocrResult.title || `OS via Teams - ${senderName}`,
        description: `${ocrResult.description || 'OS enviada via Microsoft Teams.'}\n\n[Mensagem Teams: "${messageText}"]`,
        status: 'aguardando_validacao',
        createdBy: senderName,
        createdByRole: 'Operador / Teams',
        createdOrigin: 'teams_upload',
        teamsSenderName: senderName,
        teamsChannel: channelName,
        scheduledDate: ocrResult.scheduledDate || new Date().toISOString().slice(0, 10),
        technicianName: ocrResult.technicianName || senderName,
        equipmentItems: (ocrResult.equipmentItems || []).map((eq, i) => ({
          id: 'eq-teams-' + Date.now() + '-' + i,
          name: eq.name,
          unit: eq.unit,
          quantity: eq.quantity || 1,
          unitPrice: eq.unitPrice || 0,
          notes: eq.notes,
        })),
        laborItems: (ocrResult.laborItems || []).map((lb, i) => ({
          id: 'lb-teams-' + Date.now() + '-' + i,
          name: lb.name,
          unit: lb.unit,
          quantity: lb.quantity || 1,
          unitPrice: lb.unitPrice || 0,
          technicianName: lb.technicianName || senderName,
          notes: lb.notes,
        })),
        materialItems: (ocrResult.materialItems || []).map((mat, i) => ({
          id: 'mat-teams-' + Date.now() + '-' + i,
          name: mat.name,
          unit: mat.unit,
          quantity: mat.quantity || 1,
          unitPrice: mat.unitPrice || 0,
        })),
        discount: ocrResult.discount || 0,
        addition: ocrResult.addition || 0,
        totalAmount: ocrResult.totalAmount || 0,
        checklist: [],
        photos: [
          {
            id: 'photo-teams-' + Date.now(),
            url: imageBase64,
            title: `Foto enviada por ${senderName} no Teams`,
            category: 'canhoto',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      setIsProcessing(false);
      onSuccess(newOrder.id);
      onClose();
    } catch (err: any) {
      console.error('Error simulating Teams post:', err);
      setIsProcessing(false);
      setErrorMsg(
        err.message ||
          'Não foi possível processar a imagem com a IA. Verifique a conexão e tente novamente.'
      );
    }
  };

  const sampleWebhookUrl = `${window.location.origin}/api/webhook/teams-os`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-2 border-indigo-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Integração Microsoft Teams + IA
              </h3>
              <p className="text-xs text-slate-500">
                Envio direto de fotos de OS pelo canal do Teams para a esteira de validação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Simulador de Postagem no Teams
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Como Funciona o Fluxo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'webhook'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Configurar Webhook Power Automate
          </button>
        </div>

        {/* Tab 1: Interactive Simulator */}
        {activeTab === 'simulator' && (
          <form onSubmit={handleSimulateTeamsPost} className="space-y-4 text-xs">
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 text-indigo-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Teste o fluxo em tempo real:
              </p>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Selecione o funcionário que tirou a foto, anexe a imagem da OS e simule o envio. A IA fará a leitura, pegará o remetente e enviará a OS direto para a aba de <strong>Validação de Faturamento</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Funcionário Remetente (Teams User)
                </label>
                <select
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.roleLabel})
                    </option>
                  ))}
                  <option value="Roberto Ramos (Pátio GRU)">Roberto Ramos (Pátio GRU)</option>
                  <option value="Juliano Santos (Rampa)">Juliano Santos (Rampa)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Canal do Microsoft Teams
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Texto / Comentário da Mensagem
              </label>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ex: Segue OS de locação de gerador e operador de solo assinada..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Photo Attachment Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Foto do Canhoto / OS Física
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {imageBase64 ? (
                <div className="relative rounded-2xl border-2 border-indigo-300 overflow-hidden bg-slate-100 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={imageBase64}
                      alt="Preview OS"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Foto da OS Carregada</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Pronta para leitura por IA</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageBase64(null)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl font-bold"
                  >
                    Trocar foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 text-slate-600 hover:text-indigo-700 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-indigo-600" />
                  <span className="font-bold text-xs">Clique para selecionar ou tirar foto da OS</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG ou foto de câmera de celular</span>
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing || !imageBase64}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>IA Lendo OS e Registrando Remetente...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Simular Post no Teams & Enviar para Validação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Workflow Explanation */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="font-black text-sm text-slate-900">Como os funcionários usam no dia a dia:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed text-slate-700">
                <li>
                  <strong>O técnico finaliza o serviço em campo:</strong> Pega o canhoto em papel assinado pelo cliente.
                </li>
                <li>
                  <strong>Abre o app do Microsoft Teams:</strong> Entra no grupo <em>#os-campo-operacoes</em> e envia a foto da OS.
                </li>
                <li>
                  <strong>A IA entra em ação automaticamente:</strong> O robô recebe a mensagem, captura o nome do usuário do Teams (remetente), extrai todos os valores e dados do canhoto.
                </li>
                <li>
                  <strong>Aba de Validação do Faturamento:</strong> A OS entra instantaneamente na esteira de conferência. O faturamento revisa e aprova com 1 clique!
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 3: Webhook Details */}
        {activeTab === 'webhook' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Para conectar o Microsoft Teams real usando o <strong>Microsoft Power Automate</strong>, crie um fluxo com o gatilho <em>"When a new channel message is added"</em> e configure uma requisição HTTP POST para:
            </p>

            <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl font-mono text-[11px] flex items-center justify-between">
              <span className="truncate pr-2">{sampleWebhookUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(sampleWebhookUrl)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 font-sans cursor-pointer text-indigo-300"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
