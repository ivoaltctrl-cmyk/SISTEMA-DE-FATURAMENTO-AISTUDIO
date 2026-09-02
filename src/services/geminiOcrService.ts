import { ServiceTypeCategory } from '../types';

export interface DigitizedOSResult {
  osNumber?: string;
  clientName: string;
  clientDocument: string;
  clientPhone: string;
  workLocation: string;
  category: ServiceTypeCategory;
  title: string;
  description: string;
  scheduledDate: string;
  technicianName: string;
  equipmentItems: Array<{
    name: string;
    unit: 'diaria' | 'hora' | 'mes' | 'semana';
    quantity: number;
    unitPrice: number;
    notes?: string;
    isUncertain?: boolean;
  }>;
  laborItems: Array<{
    name: string;
    unit: 'hora' | 'diaria' | 'homem_hora' | 'servico';
    quantity: number;
    unitPrice: number;
    technicianName?: string;
    notes?: string;
    isUncertain?: boolean;
  }>;
  materialItems: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount: number;
  addition: number;
  totalAmount: number;
  observations: string;
  
  // Uncertainty flags
  confidence: {
    clientName: boolean;
    clientDocument: boolean;
    workLocation: boolean;
    title: boolean;
    scheduledDate: boolean;
    technicianName: boolean;
    totalAmount: boolean;
    items: boolean;
  };
  uncertainReasons: { [key: string]: string };
  rawExtractedText?: string;
}

export const digitizePhysicalOS = async (
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<DigitizedOSResult> => {
  try {
    const response = await fetch('/api/digitize-os', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        mimeType,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Falha na digitalização (HTTP ${response.status})`);
    }

    const data: DigitizedOSResult = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error digitizing OS with backend:', error);
    throw error;
  }
};
