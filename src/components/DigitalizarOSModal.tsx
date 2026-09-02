import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Cloud,
  CloudUpload,
  ExternalLink,
  FileCheck,
  FileSearch,
  FileText,
  FolderCheck,
  HardDrive,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DigitizedOSResult, digitizePhysicalOS } from '../services/geminiOcrService';
import {
  uploadPhotoToGoogleDrive,
  OFFICIAL_DRIVE_FOLDER_URL,
  OFFICIAL_DRIVE_FOLDER_ID,
  OFFICIAL_DRIVE_FOLDER_NAME,
  OFFICIAL_PHOTOS_SHEET_NAME,
  getSheetsConfig
} from '../services/sheetsService';
import { ServiceTypeCategory } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DigitalizarOSModalProps {
  onClose: () => void;
  onSuccess: (orderData: any) => void;
}

export const DigitalizarOSModal: React.FC<DigitalizarOSModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { clients, equipments, laborServices } = useApp();

  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google Drive integration state
  const [driveStatus, setDriveStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [driveFileName, setDriveFileName] = useState<string>('');
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(OFFICIAL_DRIVE_FOLDER_URL);

  // Extracted and editable state
  const [extractedData, setExtractedData] = useState<DigitizedOSResult | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [category, setCategory] = useState<ServiceTypeCategory>('misto');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState('');
  const [equipmentItems, setEquipmentItems] = useState<any[]>([]);
  const [laborItems, setLaborItems] = useState<any[]>([]);
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [addition, setAddition] = useState(0);
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    setErrorMessage(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      processImageAndUploadDrive(base64, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleImage = () => {
    // Generate a realistic canvas image representing a physical handwritten service ticket
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper texture
    ctx.fillStyle = '#FCFBF7';
    ctx.fillRect(0, 0, 800, 1000);

    // Header border
    ctx.strokeStyle = '#E5232A';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 740, 940);

    // Header title
    ctx.fillStyle = '#E5232A';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('ORDEM DE SERVIÇO & LOCAÇÃO - WFS', 50, 75);

    ctx.fillStyle = '#555555';
    ctx.font = '14px monospace';
    ctx.fillText('Nº TALÃO FÍSICO: #00842-PAPEL', 520, 75);

    // Divider
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(760, 95);
    ctx.stroke();

    // Client Info
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CLIENTE:', 50, 130);
    ctx.font = '16px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('LATAM Cargo Brasil S.A.', 140, 130);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CNPJ:', 50, 165);
    ctx.font = '15px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('02.012.862/0001-60 (caligrafia corrida)', 110, 165);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('LOCAL:', 50, 200);
    ctx.font = '16px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('Hangar 04 - Pátio GRU Aeroporto', 120, 200);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('DATA:', 500, 130);
    ctx.font = '16px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(new Date().toLocaleDateString('pt-BR'), 560, 130);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('TÉCNICO:', 500, 165);
    ctx.font = '16px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('Rodrigo Vasconcelos', 590, 165);

    // Items table header
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(45, 235, 710, 32);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('DESCRIÇÃO DO SERVIÇO / EQUIPAMENTO', 55, 256);
    ctx.fillText('QTD', 480, 256);
    ctx.fillText('UNID', 540, 256);
    ctx.fillText('UNIT. R$', 610, 256);
    ctx.fillText('TOTAL R$', 690, 256);

    // Table rows
    ctx.font = '15px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('1. Locação Ground Power Unit (GPU 90kVA 400Hz)', 55, 300);
    ctx.fillText('1', 490, 300);
    ctx.fillText('Diária', 540, 300);
    ctx.fillText('1.200,00', 605, 300);
    ctx.fillText('1.200,00', 685, 300);

    ctx.fillText('2. Operador de Solo GSE Especializado (Pista)', 55, 340);
    ctx.fillText('8', 490, 340);
    ctx.fillText('Horas', 540, 340);
    ctx.fillText('90,00', 615, 340);
    ctx.fillText('720,00', 695, 340);

    ctx.fillText('3. Cabo de Conexão Aeronáutica e Calços', 55, 380);
    ctx.fillText('1', 490, 380);
    ctx.fillText('Kit', 540, 380);
    ctx.fillText('120,00', 615, 380);
    ctx.fillText('120,00', 695, 380);

    // Total box
    ctx.strokeStyle = '#0F172A';
    ctx.strokeRect(480, 430, 275, 45);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('TOTAL GERAL:', 490, 458);
    ctx.fillStyle = '#E5232A';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('R$ 2.040,00', 635, 458);

    // Field notes & Client Signature Simulation
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('OBSERVAÇÕES DE CAMPO:', 50, 520);
    ctx.font = '14px cursive, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('Atendimento realizado pontualmente no Pátio 2. GPU testada e aprovada.', 50, 545);

    ctx.strokeStyle = '#64748B';
    ctx.beginPath();
    ctx.moveTo(100, 640);
    ctx.lineTo(380, 640);
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('ASSINATURA / CARIMBO DO CLIENTE NO LOCAL', 110, 660);

    // Client handwriting signature
    ctx.font = '24px cursive';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Marcelo Ribeiro - LATAM', 120, 625);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setImagePreview(base64);
    processImageAndUploadDrive(base64, 'image/jpeg', 'Canhoto_Exemplo_OS_00842.jpg');
  };

  const processImageAndUploadDrive = async (base64: string, mimeType: string, customFileName?: string) => {
    setStep('scanning');
    setErrorMessage(null);
    setDriveStatus('uploading');

    const cfg = getSheetsConfig();
    const folderUrl = cfg.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL;
    setDriveFolderUrl(folderUrl);

    try {
      // 1. Run Gemini AI OCR extraction first
      const ocrResult = await digitizePhysicalOS(base64, mimeType);

      // 2. Upload to Google Drive (Pasta Fotos_SO, ID 1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD) and link to Fotos_SO sheet
      const cleanOS = (ocrResult.osNumber || `OS-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const driveResult = await uploadPhotoToGoogleDrive(
        base64,
        customFileName || `Canhoto_${cleanOS}_${Date.now()}.jpg`,
        cleanOS,
        ocrResult.clientName || 'Cliente WFS',
        ocrResult.title || 'Atendimento de Pista'
      );

      setExtractedData(ocrResult);
      setDriveStatus('success');
      setDriveFileUrl(driveResult.fileUrl);
      setDriveFileName(driveResult.fileName);

      // Pre-fill form fields
      setClientName(ocrResult.clientName || '');
      setClientDocument(ocrResult.clientDocument || '');
      setClientPhone(ocrResult.clientPhone || '');
      setWorkLocation(ocrResult.workLocation || '');
      setCategory(ocrResult.category || 'misto');
      setTitle(ocrResult.title || '');
      setDescription(ocrResult.description || '');
      setScheduledDate(ocrResult.scheduledDate || new Date().toISOString().split('T')[0]);
      setTechnicianName(ocrResult.technicianName || '');
      setEquipmentItems(ocrResult.equipmentItems || []);
      setLaborItems(ocrResult.laborItems || []);
      setMaterialItems(ocrResult.materialItems || []);
      setDiscount(ocrResult.discount || 0);
      setAddition(ocrResult.addition || 0);
      setNotes(ocrResult.observations || '');

      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Não foi possível ler os dados da imagem. Verifique a iluminação e tente novamente.'
      );
      setDriveStatus('error');
      setStep('upload');
    }
  };

  // Calculations
  const totalEquipments = equipmentItems.reduce((s, it) => s + (it.quantity * it.unitPrice || 0), 0);
  const totalLabor = laborItems.reduce((s, it) => s + (it.quantity * it.unitPrice || 0), 0);
  const totalMaterials = materialItems.reduce((s, it) => s + (it.quantity * it.unitPrice || 0), 0);
  const subtotal = totalEquipments + totalLabor + totalMaterials;
  const finalTotal = Math.max(0, subtotal - Number(discount || 0) + Number(addition || 0));

  const handleConfirmAndSave = () => {
    if (!clientName.trim()) {
      alert('Por favor informe o nome do cliente.');
      return;
    }
    if (!title.trim()) {
      alert('Por favor informe o título ou serviço da OS.');
      return;
    }

    // Match client or create temp
    let matchedClient = clients.find(
      (c) =>
        c.name.toLowerCase().includes(clientName.toLowerCase()) ||
        c.document.replace(/\D/g, '') === clientDocument.replace(/\D/g, '')
    );

    const targetDriveUrl = driveFileUrl || driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL;

    const orderData = {
      clientId: matchedClient ? matchedClient.id : 'cli-digitized-' + Date.now(),
      clientName: clientName.trim(),
      clientDocument: clientDocument.trim(),
      clientPhone: clientPhone.trim() || matchedClient?.phone || '(11) 98765-4321',
      clientEmail: matchedClient?.email || 'contato@cliente.com.br',
      workLocation: workLocation.trim(),
      category,
      title: title.trim(),
      description: description.trim(),
      status: 'aguardando_validacao', // Physical OS signed on paper goes to Billing Validation
      scheduledDate,
      technicianName: technicianName.trim() || 'Técnico de Campo WFS',
      equipmentItems,
      laborItems,
      materialItems,
      discount: Number(discount || 0),
      addition: Number(addition || 0),
      totalAmount: finalTotal || extractedData?.totalAmount || 0,
      canhotoUrl: targetDriveUrl, // Direct Google Drive storage link!
      checklist: [
        { id: 'chk-1', task: 'OS Física Digitalizada e Validada por IA', completed: true, completedAt: new Date().toISOString() },
        { id: 'chk-2', task: 'Imagem arquivada na pasta do Google Drive', completed: true, completedAt: new Date().toISOString() },
        { id: 'chk-3', task: 'Itens e Valores conferidos pelo operador', completed: true, completedAt: new Date().toISOString() },
      ],
      photos: imagePreview
        ? [
            {
              id: 'p-scan-' + Date.now(),
              url: imagePreview,
              title: `Canhoto Digitalizado (Google Drive - ${driveFileName || 'Arquivo'})`,
              category: 'canhoto' as const,
              timestamp: new Date().toISOString(),
              notes: `Arquivo salvo na pasta do Google Drive: ${targetDriveUrl}`,
            },
          ]
        : [],
      clientSignature: {
        signatureImage: imagePreview || '',
        signerName: clientName,
        signerDocument: clientDocument,
        signerRole: 'Assinado no Canhoto Físico (Google Drive)',
        signedAt: new Date().toISOString(),
      },
      internalNotes: `OS física digitalizada via IA. Imagem enviada para o Google Drive (${driveFileName || 'Canhoto'}). Observações do papel: ${notes}`,
    };

    onSuccess(orderData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 text-slate-900 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full">
                  Visão Computacional & Google Drive
                </span>
                <span className="text-xs font-bold text-slate-500">WFS Digital</span>
              </div>
              <h2 className="text-base sm:text-lg font-black leading-tight mt-0.5 text-slate-900">
                Digitalizar OS de Papel & Enviar ao Google Drive
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: UPLOAD / CAMERA SELECTION */}
        {step === 'upload' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            <div className="text-center max-w-lg mx-auto space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Tire uma foto do canhoto para leitura e envio automático ao Google Drive
              </h3>
              <p className="text-xs text-slate-600">
                Ao tirar a foto ou anexar a imagem, a Inteligência Artificial extrai os dados do canhoto e a foto original é enviada diretamente para a pasta de Canhotos do Google Drive.
              </p>
            </div>

            {/* Google Drive Destination Badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 max-w-xl mx-auto flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-blue-900">
                <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Pasta Destino no Drive: <strong>{OFFICIAL_DRIVE_FOLDER_NAME}</strong>
                </span>
              </div>
              <a
                href={OFFICIAL_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 underline font-bold flex items-center gap-1 shrink-0 text-[11px]"
              >
                Abrir Pasta <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Erro ao digitalizar documento</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Option 1: Mobile Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-6 bg-rose-50 hover:bg-rose-100/80 border-2 border-dashed border-rose-300 rounded-3xl flex flex-col items-center justify-center gap-3 text-center transition-all group cursor-pointer shadow-xs"
              >
                <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Tirar Foto na Câmera</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ideal para operadores e técnicos na pista / pátio
                  </p>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
              </button>

              {/* Option 2: Gallery / PDF / Image File */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-6 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center gap-3 text-center transition-all group cursor-pointer shadow-xs"
              >
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Galeria / Arquivo da OS</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Selecione uma foto salva ou digitalização em imagem
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
              </button>
            </div>

            {/* Quick Demo Test Option */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleUseSampleImage}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                Usar Exemplo de OS de Papel (Teste Rápido)
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNING & PROCESSING ANIMATION */}
        {step === 'scanning' && (
          <div className="p-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-rose-600 animate-pulse" />
              </div>
            </div>

            <div className="space-y-3 max-w-sm">
              <h3 className="text-base font-black text-slate-900">
                Digitalizando e Enviando ao Google Drive...
              </h3>
              
              {/* Dual Step Progress */}
              <div className="space-y-2 text-left bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1. Visão Computacional: Lendo cliente, voo, horas e valores</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700 font-semibold">
                  <CloudUpload className="w-4 h-4 text-blue-600 shrink-0 animate-bounce" />
                  <span>2. Google Drive: Enviando para pasta Fotos_SO ({OFFICIAL_DRIVE_FOLDER_ID})</span>
                </div>
              </div>
            </div>

            {imagePreview && (
              <div className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-300 shadow-md relative">
                <img src={imagePreview} alt="Digitalizando" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-rose-500/20 animate-pulse"></div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: REVIEW WITH UNCERTAINTY HIGHLIGHTS & DRIVE LINK */}
        {step === 'review' && extractedData && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Alert Banner for Review & Confidence */}
            <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950">
                    Revisão da OS Digitalizada & Foto no Google Drive
                  </h4>
                  <p className="text-xs text-amber-900 mt-0.5">
                    A imagem foi arquivada na pasta do Google Drive e os dados foram pré-preenchidos.
                    Campos destacados em amarelo tiveram caligrafia de baixa certeza no papel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 shrink-0 px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Trocar Imagem
              </button>
            </div>

            {/* Split View: Scanned Photo on Side/Top & Form Fields */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Image Snapshot (4 cols) & Google Drive Badge */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" /> Canhoto de Papel Digitalizado
                </h4>

                {imagePreview && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-900 max-h-72 overflow-y-auto">
                    <img
                      src={imagePreview}
                      alt="Canhoto Original"
                      className="w-full h-auto object-contain cursor-zoom-in"
                      onClick={() => window.open(imagePreview, '_blank')}
                      title="Clique para ampliar"
                    />
                  </div>
                )}

                {/* Google Drive & Fotos_SO Archive Confirmation Card */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-black">
                    <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Enviado ao Google Drive & Fotos_SO</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-emerald-800">
                    <p>
                      Pasta Drive ID: <strong className="font-mono text-[10px] bg-emerald-100 px-1 py-0.5 rounded">{OFFICIAL_DRIVE_FOLDER_ID}</strong>
                    </p>
                    <p>
                      Planilha Destino: <strong>Aba {OFFICIAL_PHOTOS_SHEET_NAME}</strong>
                    </p>
                  </div>
                  {driveFileName && (
                    <p className="text-[10px] text-slate-600 font-mono truncate">
                      Arquivo: {driveFileName}
                    </p>
                  )}
                  <div className="pt-1 flex items-center gap-2">
                    <a
                      href={driveFileUrl || driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all"
                    >
                      <span>Abrir no Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Column: Editable Fields with Highlight for Uncertainty (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Cliente */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      extractedData.confidence?.clientName === false
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        Cliente / Razão Social *
                      </label>
                      {extractedData.confidence?.clientName === false && (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          ⚠️ Dúvida no Papel
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                      placeholder="Nome do cliente no canhoto"
                    />
                  </div>

                  {/* CNPJ / CPF */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      extractedData.confidence?.clientDocument === false
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        CNPJ / CPF
                      </label>
                      {extractedData.confidence?.clientDocument === false && (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          ⚠️ Dúvida no Papel
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={clientDocument}
                      onChange={(e) => setClientDocument(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 font-mono"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  {/* Local de Atendimento */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      extractedData.confidence?.workLocation === false
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        Local / Pista / Terminal
                      </label>
                      {extractedData.confidence?.workLocation === false && (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          ⚠️ Dúvida no Papel
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                      placeholder="Ex: Hangar 04 - Pátio GRU"
                    />
                  </div>

                  {/* Técnico / Operador */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      extractedData.confidence?.technicianName === false
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        Técnico / Operador
                      </label>
                      {extractedData.confidence?.technicianName === false && (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          ⚠️ Dúvida no Papel
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                      placeholder="Nome do operador que executou"
                    />
                  </div>
                </div>

                {/* Título & Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-2xl">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Título do Serviço *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                      placeholder="Ex: Atendimento GSE e Locação GPU"
                    />
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ServiceTypeCategory)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="locacao">Locação de Equipamentos</option>
                      <option value="mao_de_obra">Mão de Obra Especializada</option>
                      <option value="servico_tecnico">Manutenção / Técnico</option>
                      <option value="misto">Misto (Locação + Mão de Obra)</option>
                    </select>
                  </div>
                </div>

                {/* Lista de Itens Extraídos */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Itens & Valores Extraídos do Canhoto
                    </h5>
                    <span className="text-[11px] text-slate-500">
                      {equipmentItems.length + laborItems.length} itens identificados
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Equipamentos */}
                    {equipmentItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                          item.isUncertain
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex-1">
                          <span className="font-bold text-slate-900">[Equipamento] {item.name}</span>
                          <span className="text-[11px] text-slate-500 block">
                            {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEquipmentItems(equipmentItems.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Labor */}
                    {laborItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                          item.isUncertain
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex-1">
                          <span className="font-bold text-slate-900">[Mão de Obra] {item.name}</span>
                          <span className="text-[11px] text-slate-500 block">
                            {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLaborItems(laborItems.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Bar */}
                <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Valor Total da OS
                    </span>
                    <h3 className="text-xl font-black text-emerald-600">
                      {formatCurrency(finalTotal)}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                      <FolderCheck className="w-3 h-3 text-emerald-600" /> Imagem no Drive & Fila de Validação
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirmar e Gerar OS Digital
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
