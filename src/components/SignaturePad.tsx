import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Eraser, MapPin, PenTool, ShieldCheck, User } from 'lucide-react';
import { SignatureData } from '../types';

interface SignaturePadProps {
  title: string;
  defaultSignerRole?: string;
  defaultSignerName?: string;
  onSave: (data: SignatureData) => void;
  onCancel?: () => void;
  termsText?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  title,
  defaultSignerRole = 'Encarregado / Responsável do Cliente',
  defaultSignerName = '',
  onSave,
  onCancel,
  termsText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerDocument, setSignerDocument] = useState('');
  const [signerRole, setSignerRole] = useState(defaultSignerRole);
  const [agreedTerms, setAgreedTerms] = useState(true);
  
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [geoLocation, setGeoLocation] = useState<{ latitude?: number; longitude?: number; addressDescription?: string } | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on CSS display size for crisp lines
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // Try getting geolocation on load
  const captureGPS = () => {
    if ('geolocation' in navigator) {
      setLocationStatus('Obtendo coordenadas...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            addressDescription: `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)} (Assinatura em Campo)`,
          });
          setLocationStatus('Localização GPS gravada!');
        },
        () => {
          setLocationStatus('GPS não disponível (usando carimbo de data/hora)');
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn) {
      alert('Por favor, faça a assinatura no quadro antes de confirmar.');
      return;
    }
    if (!signerName.trim()) {
      alert('Por favor, informe o nome completo de quem está assinando.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureImage = canvas.toDataURL('image/png');

    onSave({
      signatureImage,
      signerName: signerName.trim(),
      signerDocument: signerDocument.trim(),
      signerRole: signerRole.trim(),
      signedAt: new Date().toISOString(),
      locationGeo: geoLocation,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
            <PenTool className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Coleta de assinatura digital imediata para validação e faturamento
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Signer Info inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo do Responsável *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CPF ou RG do Responsável
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={signerDocument}
              onChange={(e) => setSignerDocument(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cargo / Função no Local
            </label>
            <input
              type="text"
              placeholder="Ex: Encarregado de Obra / Gerente de Manutenção / Fiscal"
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-blue-600" />
              Assine com o dedo ou caneta abaixo:
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              Limpar Traço
            </button>
          </div>

          <div className="relative border-2 border-dashed border-blue-300 rounded-2xl bg-slate-50 overflow-hidden shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 cursor-crosshair block bg-white"
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1">
                <PenTool className="w-8 h-8 opacity-40 animate-pulse" />
                <span className="text-xs font-medium">Toque ou arraste aqui para assinar</span>
              </div>
            )}

            {/* Baseline guideline */}
            <div className="absolute bottom-6 left-8 right-8 border-b border-slate-200 pointer-events-none flex justify-between text-[10px] text-slate-400 uppercase tracking-widest px-2">
              <span>Linha de Assinatura</span>
              <span>X</span>
            </div>
          </div>
        </div>

        {/* GPS Capture Option */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{geoLocation ? geoLocation.addressDescription : (locationStatus || 'Carimbo com data, hora e geolocalização')}</span>
          </div>
          {!geoLocation && (
            <button
              type="button"
              onClick={captureGPS}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              Capturar GPS
            </button>
          )}
        </div>

        {/* Terms agreement */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-amber-950">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-amber-300"
            />
            <span className="leading-relaxed">
              <strong>Declaração de Aceite:</strong> {termsText || 'Confirmo a execução dos serviços e/ou recebimento dos equipamentos em perfeitas condições de uso, sem pendências, autorizando a emissão da respectiva cobrança/fatura.'}
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn || !agreedTerms}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar e Validar OS
          </button>
        </div>
      </div>
    </div>
  );
};
