import React, { useState, useEffect } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FolderCheck,
  HardDrive,
  HardHat,
  HelpCircle,
  KeyRound,
  Link,
  Lock,
  Play,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  Unlock,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  exportOrdersToCSV,
  generateGoogleAppsScriptCode,
  getSheetsConfig,
  OFFICIAL_SHEET_URL,
  OFFICIAL_DRIVE_FOLDER_URL,
  OFFICIAL_DRIVE_FOLDER_NAME,
  saveSheetsConfig,
  SheetsSyncConfig,
  syncOrdersWithGoogleSheets
} from '../services/sheetsService';

export const SheetsSyncManager: React.FC = () => {
  const { orders, company, syncWithGoogleSheet } = useApp();

  const [config, setConfig] = useState<SheetsSyncConfig>(getSheetsConfig());
  const [webhookInput, setWebhookInput] = useState(config.webhookUrl || '');
  const [sheetUrlInput, setSheetUrlInput] = useState(config.sheetUrl || OFFICIAL_SHEET_URL);
  const [driveFolderInput, setDriveFolderInput] = useState(config.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL);
  const [ownerEmailInput, setOwnerEmailInput] = useState(config.ownerEmail || 'ivoaltctrl@gmail.com');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedFieldUrl, setCopiedFieldUrl] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fieldDirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?mode=campo`
    : '';

  useEffect(() => {
    const current = getSheetsConfig();
    setConfig(current);
    setWebhookInput(current.webhookUrl || '');
    setSheetUrlInput(current.sheetUrl || OFFICIAL_SHEET_URL);
    setDriveFolderInput(current.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL);
    setOwnerEmailInput(current.ownerEmail || 'ivoaltctrl@gmail.com');
    setAutoSync(current.autoSync ?? true);
  }, []);

  const handleSaveSettings = () => {
    const updated: SheetsSyncConfig = {
      ...config,
      webhookUrl: webhookInput.trim(),
      sheetUrl: sheetUrlInput.trim() || OFFICIAL_SHEET_URL,
      driveFolderUrl: driveFolderInput.trim() || OFFICIAL_DRIVE_FOLDER_URL,
      ownerEmail: ownerEmailInput.trim() || 'ivoaltctrl@gmail.com',
      autoSync,
    };
    saveSheetsConfig(updated);
    setConfig(updated);
    setSyncFeedback({
      type: 'success',
      message: 'Configurações de integração salvas com sucesso!',
    });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      // Pull fresh data directly from the official Google Sheet (18 columns)
      const result = await syncWithGoogleSheet(sheetUrlInput.trim() || undefined);
      const updated = getSheetsConfig();
      setConfig(updated);
      setSyncFeedback({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Erro ao sincronizar com Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4500);
    }
  };

  const scriptCode = generateGoogleAppsScriptCode(
    typeof window !== 'undefined' ? window.location.origin : '',
    company.tradeName || company.name,
    ownerEmailInput || 'ivoaltctrl@gmail.com'
  );

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleCopyFieldUrl = () => {
    navigator.clipboard.writeText(fieldDirectUrl);
    setCopiedFieldUrl(true);
    setTimeout(() => setCopiedFieldUrl(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner with Direct Sheets Link */}
      <div className="bg-white border-2 border-emerald-400 text-slate-900 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700 shrink-0 mt-0.5">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300">
                Planilha Oficial Conectada & Portal de Campo
              </span>
              <span className="text-[10px] font-bold text-slate-500">Google Workspace</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Planilha Google Sheets: Espelho do Modo Campo & Pista
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Sua planilha Google foi transformada em um portal com digitalização de fotos de canhotos,
              lançamentos de campo e bloqueio estrutural exclusivo para o proprietário.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <a
            href={OFFICIAL_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all transform active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Abrir Planilha Oficial</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* 3 Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Portal Integrado no Sheets */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">Espelho do Modo Campo</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Dentro do Google Sheets, o menu <strong>⚡ WFS - Portal Campo</strong> abre uma janela modal ou lateral idêntica ao app para lançar OSs na hora.
            </p>
          </div>
        </div>

        {/* Card 2: Foto do Canhoto de Papel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">Foto da OS & Preenchimento</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Opção de anexar foto do canhoto de papel diretamente no formulário, registrando histórico visual e preenchimento dos campos operacionais.
            </p>
          </div>
        </div>

        {/* Card 3: Bloqueio & Privilégios do Proprietário */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">Privilégios do Proprietário</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Trava de segurança na planilha para impedir alteração de cabeçalhos e fórmulas por terceiros, deixando edição estrutural apenas para o proprietário.
            </p>
          </div>
        </div>
      </div>

      {/* Script Installation & Code Block */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-black text-[10px] uppercase">
                Google Apps Script
              </span>
              <h3 className="text-lg font-black text-slate-900">Código do Portal WFS para o Google Sheets</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instale em <strong>Extensões &gt; Apps Script</strong> da sua planilha Google para habilitar o Portal Campo integrado.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Ver Prévia do Portal</span>
            </button>

            <button
              type="button"
              onClick={handleCopyScript}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              {copiedScript ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-3">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Como Funciona os Botões Diretamente Dentro da Planilha:
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-slate-600 font-medium leading-relaxed">
            <li>
              Abra a{' '}
              <a
                href={OFFICIAL_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold underline"
              >
                Planilha Oficial Google Sheets
              </a>.
            </li>
            <li>No menu superior do Google Sheets, clique em <strong>Extensões &gt; Apps Script</strong>.</li>
            <li>Apague o código existente e cole o script atualizado pelo botão acima.</li>
            <li>Clique no ícone de <strong>Salvar (Disquete)</strong> e selecione a função <code>onOpen</code> para executar 1 vez.</li>
            <li>
              <strong>Pronto!</strong> Ao abrir a planilha:
              <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                <li>
                  <strong>Clique no Botão Vermelho (Linha 2):</strong> Clicar na célula vermelha abre instantaneamente a janela modal de lançamento com foto e assinatura <strong>dentro da própria planilha</strong> (sem abrir link externo).
                </li>
                <li>
                  <strong>Menu Superior:</strong> Você também pode clicar em <code>⚡ WFS - Portal Campo &gt; ⚡ Abrir WFS - Portal Campo & Pista</code>.
                </li>
                <li>
                  <strong>Painel Lateral Automático:</strong> A barra lateral já abre pronta na direita da planilha para preenchimento ágil.
                </li>
              </ul>
            </li>
          </ol>
        </div>

        {/* Script Preview Box */}
        <div className="relative">
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
            {scriptCode}
          </pre>
          <button
            type="button"
            onClick={handleCopyScript}
            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedScript ? 'Copiado' : 'Copiar Tudo'}</span>
          </button>
        </div>
      </div>

      {/* Owner Protection & Security Settings */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-black text-slate-900">Governança & E-mail do Proprietário</h3>
        </div>
        <p className="text-xs text-slate-600">
          O e-mail cadastrado abaixo terá <strong>privilégios totais irrestritos</strong> de modificação na planilha, enquanto operadores de campo usam o formulário do portal.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              E-mail do Proprietário com Acesso Total:
            </label>
            <input
              type="email"
              value={ownerEmailInput}
              onChange={(e) => setOwnerEmailInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-red-500 focus:bg-white focus:outline-hidden"
              placeholder="ivoaltctrl@gmail.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL do Webhook do Google Apps Script (Opcional):
            </label>
            <input
              type="text"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-red-500 focus:bg-white focus:outline-hidden"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Pasta do Google Drive para Canhotos & Imagens Digitalizadas:
              </label>
              <a
                href={driveFolderInput || OFFICIAL_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline"
              >
                <span>Abrir Pasta do Google Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={driveFolderInput}
              onChange={(e) => setDriveFolderInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-red-500 focus:bg-white focus:outline-hidden font-mono"
              placeholder={OFFICIAL_DRIVE_FOLDER_URL}
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Ao digitalizar canhotos na câmera ou galeria, a imagem é salva nesta pasta e o link direto vai para a coluna 17 da planilha.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>

      {/* Modal Preview of Google Sheets Field Portal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">WFS</span>
                <h3 className="font-black text-sm text-slate-900">
                  Prévia do Portal Integrado ao Google Sheets
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Esta é a interface que seus técnicos e operadores verão quando abrirem o menu{' '}
              <strong>⚡ WFS - Portal Campo</strong> diretamente de dentro da sua planilha Google:
            </p>

            {/* Mocked Portal Window */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 space-y-3 text-xs">
              {/* Header */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Modo Campo & Pista (Planilha Conectada)</span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                  Gravação Direta
                </span>
              </div>

              {/* Photo Box */}
              <div className="border-2 border-dashed border-red-300 bg-red-50/50 rounded-xl p-4 text-center cursor-pointer">
                <Camera className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <span className="font-bold text-red-700 block">📷 Anexar Foto do Canhoto de Papel</span>
                <span className="text-[10px] text-slate-500">Vincular comprovante físico à linha da planilha</span>
              </div>

              {/* Form inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[10px] text-slate-600 uppercase">Nº OS</label>
                  <input
                    type="text"
                    disabled
                    value="OS-0104"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[10px] text-slate-600 uppercase">Cliente / Cia Aérea</label>
                  <input
                    type="text"
                    disabled
                    value="LATAM Airlines Cargo"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[10px] text-slate-600 uppercase">Local / Pista</label>
                  <input
                    type="text"
                    disabled
                    value="Aeroporto Int. - Pista 09L"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[10px] text-slate-600 uppercase">Valor Total (R$)</label>
                  <input
                    type="text"
                    disabled
                    value="R$ 1.850,00"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="bg-red-600 text-white font-black text-center py-2.5 rounded-xl text-xs">
                GRAVAR NA PLANILHA GOOGLE SHEETS ➔
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
