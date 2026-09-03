import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2, X, ZoomIn } from 'lucide-react';
import { PhotoEvidence } from '../types';
import { formatDateTime } from '../utils/formatters';

interface PhotoUploaderProps {
  photos: PhotoEvidence[];
  onAddPhoto: (photo: Omit<PhotoEvidence, 'id' | 'timestamp'>) => void;
  onDeletePhoto: (photoId: string) => void;
  readOnly?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onAddPhoto,
  onDeletePhoto,
  readOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewZoomPhoto, setPreviewZoomPhoto] = useState<PhotoEvidence | null>(null);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PhotoEvidence['category']>('depois');
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = () => {
    if (!selectedImage) {
      alert('Por favor, selecione ou tire uma foto.');
      return;
    }

    onAddPhoto({
      url: selectedImage,
      title: title.trim() || 'Foto de Evidência',
      category,
      notes: notes.trim() || undefined,
    });

    // Reset
    setSelectedImage(null);
    setTitle('');
    setNotes('');
    setShowModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const categoryLabels: Record<PhotoEvidence['category'], { label: string; color: string }> = {
    antes: { label: 'Antes / Chegada', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    durante: { label: 'Durante a Execução', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    depois: { label: 'Finalizado / Depois', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    equipamento: { label: 'Estado do Equipamento', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    canhoto: { label: 'Canhoto / Documento', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    outro: { label: 'Outro', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            Evidências Fotográficas ({photos.length})
          </h4>
          <p className="text-xs text-slate-500">
            Fotos no local comprovam a execução e evitam contestações de faturamento.
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-xl border border-blue-200 transition-colors"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Adicionar Foto
          </button>
        )}
      </div>

      {/* Grid of photos */}
      {photos.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50">
          <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Nenhuma foto anexada nesta OS ainda.</p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Tirar foto ou anexar agora
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => {
            const catBadge = categoryLabels[photo.category] || categoryLabels.outro;
            return (
              <div
                key={photo.id}
                className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${catBadge.color}`}
                  >
                    {catBadge.label}
                  </span>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewZoomPhoto(photo)}
                      className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow-md"
                      title="Ampliar"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onDeletePhoto(photo.id)}
                        className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={photo.title}>
                    {photo.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatDateTime(photo.timestamp)}
                  </p>
                  {photo.notes && (
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic">
                      "{photo.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for adding photo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Anexar Evidência / Foto
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setSelectedImage(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              {/* Photo Input Area */}
              {!selectedImage ? (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-blue-50/40 hover:bg-blue-50/80 transition-all flex flex-col items-center justify-center"
                  >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      Tirar foto com a câmera ou escolher arquivo
                    </span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG, HEIC suportados</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black/10">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Trocar
                  </button>
                </div>
              )}

              {/* Tag & Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Classificação da Foto *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PhotoEvidence['category'])}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="antes">Antes do Início / Chegada</option>
                  <option value="durante">Durante a Execução</option>
                  <option value="depois">Finalizado / Entrega Aprovada</option>
                  <option value="equipamento">Condição do Equipamento / Horímetro</option>
                  <option value="canhoto">Canhoto / Comprovante Físico</option>
                  <option value="outro">Outro Registro</option>
                </select>
              </div>

              {/* Title & Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Legenda / Título
                </label>
                <input
                  type="text"
                  placeholder="Ex: Foto do gerador conectado ao quadro geral"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Técnicas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Horímetro 1482h, sem vazamentos"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setSelectedImage(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!selectedImage}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                Salvar Evidência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {previewZoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewZoomPhoto(null)}
        >
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-3 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 text-slate-900 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{previewZoomPhoto.title}</h4>
                <p className="text-xs text-slate-500">{formatDateTime(previewZoomPhoto.timestamp)}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewZoomPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center p-2 bg-slate-50 rounded-xl mt-2">
              <img
                src={previewZoomPhoto.url}
                alt={previewZoomPhoto.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            {previewZoomPhoto.notes && (
              <div className="p-3 text-xs text-slate-700 bg-slate-50 rounded-xl mt-2 border border-slate-200">
                <strong className="text-slate-900">Observações:</strong> {previewZoomPhoto.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
