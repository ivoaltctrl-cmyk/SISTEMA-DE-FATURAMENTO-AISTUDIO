import React, { useState, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  CloudUpload,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Upload,
  X,
  AlertTriangle,
  FileCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  uploadPhotoToGoogleDrive,
  OFFICIAL_DRIVE_FOLDER_URL,
  OFFICIAL_DRIVE_FOLDER_ID,
  OFFICIAL_DRIVE_FOLDER_NAME,
  OFFICIAL_PHOTOS_SHEET_NAME,
  getSheetsConfig
} from '../services/sheetsService';
import { optimizeImageForUpload } from '../utils/imageOptimizer';

export interface UploadedFileInfo {
  fileName: string;
  fileUrl: string;
  folderUrl: string;
  folderId: string;
  sheetName: string;
  timestamp: string;
  imagePreview?: string;
  osNumber?: string;
  optionalTag?: string;
  orderId?: string;
}

interface DigitalizarOSModalProps {
  onClose: () => void;
  onSuccess?: (uploadData: UploadedFileInfo) => any;
  onViewCreatedOS?: (orderId: string) => void;
}

export const DigitalizarOSModal: React.FC<DigitalizarOSModalProps> = ({
  onClose,
  onSuccess,
  onViewCreatedOS,
}) => {
  const [step, setStep] = useState<'select' | 'uploading' | 'success' | 'error'>('select');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('Preparando envio...');
  const [optionalTag, setOptionalTag] = useState<string>('');
  const [uploadedInfo, setUploadedInfo] = useState<UploadedFileInfo | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    setErrorMessage(null);
    setStep('uploading');
    setUploadStatusText('Otimizando resolução da imagem...');

    try {
      // 1. Optimize image in background (fast client resize to max 1600px, reducing 12MB phone photo to ~350KB)
      let base64ToSend = '';
      try {
        const optimized = await optimizeImageForUpload(file, 1600, 0.85);
        if (optimized.base64) {
          base64ToSend = optimized.base64;
          setImagePreview(optimized.base64);
        }
      } catch (optErr) {
        console.warn('Optimization fallback to raw reader:', optErr);
      }

      if (!base64ToSend) {
        base64ToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setImagePreview(base64ToSend);
      }

      // 2. Direct upload to Google Drive folder - NO FRONT-END OCR
      setUploadStatusText('Encaminhando diretamente para a pasta do Google Drive (Fotos_SO)...');

      const tagClean = optionalTag.trim().replace(/[^a-zA-Z0-9_-]/g, '') || `CANHOTO-${Date.now().toString().slice(-6)}`;
      const cleanFileName = `Canhoto_${tagClean}_${Date.now()}.jpg`;

      const driveResult = await uploadPhotoToGoogleDrive(
        base64ToSend,
        cleanFileName,
        tagClean,
        'WFS Operacional',
        'Canhoto Enviado para IA'
      );

      const cfg = getSheetsConfig();
      const info: UploadedFileInfo = {
        fileName: driveResult.fileName,
        fileUrl: driveResult.fileUrl || (driveResult as any).driveFileUrl || '',
        folderUrl: driveResult.folderUrl || cfg.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL,
        folderId: driveResult.folderId || cfg.driveFolderId || OFFICIAL_DRIVE_FOLDER_ID,
        sheetName: driveResult.sheetName || OFFICIAL_PHOTOS_SHEET_NAME,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('pt-BR'),
        imagePreview: base64ToSend,
        osNumber: tagClean,
        optionalTag: optionalTag.trim(),
      };

      setUploadedInfo(info);
      setStep('success');

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

      // Haptic feedback on mobile
      try {
        navigator.vibrate?.([80, 40, 80]);
      } catch {
        // ignore
      }

      if (onSuccess) {
        const result = onSuccess(info);
        if (result?.id) {
          setCreatedOrderId(result.id);
        }
      }
    } catch (err: any) {
      console.error('Error uploading directly to Google Drive:', err);
      setErrorMessage(err.message || 'Falha ao enviar imagem para a pasta do Google Drive. Verifique sua conexão e tente novamente.');
      setStep('error');
    }
  };

  const handleResetForNextPhoto = () => {
    setImagePreview(null);
    setErrorMessage(null);
    setUploadedInfo(null);
    setOptionalTag('');
    setCreatedOrderId(null);
    setStep('select');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 text-slate-900 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full">
                  Google Drive • Fotos_SO
                </span>
                <span className="text-xs font-bold text-slate-500">WFS Digital</span>
              </div>
              <h2 className="text-base sm:text-lg font-black leading-tight mt-0.5 text-slate-900">
                Enviar Canhoto para o Google Drive
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">

          {/* STEP 1: SELECT / CAPTURE IMAGE */}
          {step === 'select' && (
            <div className="space-y-5">
              
              {/* Destination Folder Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs">
                <div className="flex items-start gap-2.5 text-emerald-950">
                  <HardDrive className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Pasta Destino: {OFFICIAL_DRIVE_FOLDER_NAME}</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      ID: <span className="font-mono">{OFFICIAL_DRIVE_FOLDER_ID}</span> • Aba: <span className="font-mono">{OFFICIAL_PHOTOS_SHEET_NAME}</span>
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      ⚡ A imagem vai direto para a pasta. A IA configurada na nuvem fará a leitura e o processamento automático.
                    </p>
                  </div>
                </div>
              </div>

              {!getSheetsConfig().webhookUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">URL do Webhook do Google Apps Script não detectada</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Para salvar o arquivo diretamente no Google Drive na versão web/compartilhada, verifique se a URL da implantação do Apps Script está preenchida na aba <strong>Governança &gt; Sincronização Google Sheets</strong>.
                    </p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Erro no envio</p>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Optional Identifier (Optional tag only, no required fields!) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Identificador / Número da OS (Opcional)</span>
                  <span className="text-[10px] font-normal text-slate-500">Opcional para nome do arquivo</span>
                </label>
                <input
                  type="text"
                  value={optionalTag}
                  onChange={(e) => setOptionalTag(e.target.value)}
                  placeholder="Ex: OS-1234 ou Prefixo do Veículo (opcional)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                
                {/* 1. Camera Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all shadow-md active:scale-[0.98] cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="font-black text-sm block">Tirar Foto na Câmera</span>
                    <span className="text-[11px] text-red-100 block mt-0.5">
                      Abre a câmera do celular no pátio / pista
                    </span>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleFileSelect(file);
                    }}
                  />
                </button>

                {/* 2. Gallery / File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all shadow-md active:scale-[0.98] cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="font-black text-sm block">Escolher da Galeria</span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      Selecione uma foto ou imagem salva
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleFileSelect(file);
                    }}
                  />
                </button>
              </div>

              {/* Informative footer */}
              <p className="text-center text-[11px] text-slate-500 pt-1">
                Sem digitação no aplicativo: tire a foto e o arquivo segue instantaneamente para a nuvem.
              </p>
            </div>
          )}

          {/* STEP 2: UPLOADING STATE */}
          {step === 'uploading' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-red-100 border-t-red-600 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CloudUpload className="w-7 h-7 text-red-600 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-black text-slate-900">
                  Enviando para o Google Drive
                </h3>
                <p className="text-xs text-slate-600">
                  {uploadStatusText}
                </p>
              </div>

              {imagePreview && (
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative mt-2">
                  <img src={imagePreview} alt="Canhoto" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-red-600/10 animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && uploadedInfo && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Success Badge */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-5 text-center space-y-2 shadow-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black rounded-full uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Confirmação de Envio • Google Drive
                </div>
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-emerald-950">
                  Canhoto Gravado com Sucesso!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  A foto foi salva na pasta <strong>{OFFICIAL_DRIVE_FOLDER_NAME}</strong> do Google Drive e o atendimento foi registrado nas ordens do sistema. A IA iniciará a leitura automática na nuvem.
                </p>
              </div>

              {/* Upload Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                {imagePreview && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-xs shrink-0 bg-slate-900">
                    <img
                      src={imagePreview}
                      alt="Canhoto Enviado"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1.5 text-xs text-slate-700 flex-1 w-full">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-medium">Protocolo / OS:</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {uploadedInfo.osNumber || 'OS Registrada'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500 font-medium">Arquivo:</span>
                    <span className="font-mono font-bold text-slate-900 truncate max-w-[200px]" title={uploadedInfo.fileName}>
                      {uploadedInfo.fileName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500 font-medium">Pasta Destino:</span>
                    <span className="font-bold text-emerald-700">{OFFICIAL_DRIVE_FOLDER_NAME}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500 font-medium">Status Operacional:</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Gravado na Nuvem • IA Notificada
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-medium">Horário:</span>
                    <span className="text-slate-800 font-semibold">{uploadedInfo.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Take Another Photo */}
                  <button
                    type="button"
                    onClick={handleResetForNextPhoto}
                    className="flex items-center justify-center gap-2.5 p-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Nova Foto / Enviar Outro
                  </button>

                  {/* Close Modal & View / Return */}
                  {createdOrderId && onViewCreatedOS ? (
                    <button
                      type="button"
                      onClick={() => {
                        onViewCreatedOS(createdOrderId);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-2.5 p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Visualizar OS Registrada
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2.5 p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Concluir e Voltar ao Início
                    </button>
                  )}
                </div>

                {createdOrderId && onViewCreatedOS && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full text-center py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Fechar e Voltar ao Início
                  </button>
                )}
              </div>

            </div>
          )}

          {/* STEP 4: ERROR STATE */}
          {step === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Não foi possível enviar ao Google Drive
                </h3>
                <p className="text-xs text-rose-700 mt-2 max-w-md mx-auto leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
                  {errorMessage || 'Ocorreu uma falha na conexão. Tente novamente.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetForNextPhoto}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
