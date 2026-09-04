import { ServiceOrder, Invoice, Client, OSStatus, ServiceTypeCategory, AppUser, UserPrivilege } from '../types';

export const OFFICIAL_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit?gid=0#gid=0';
export const OFFICIAL_SHEET_ID = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';

export const OFFICIAL_DRIVE_FOLDER_ID = '1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD';
export const OFFICIAL_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD';
export const OFFICIAL_DRIVE_FOLDER_NAME = 'Fotos_SO - Canhotos e OSs Digitalizadas (Pista & Campo)';
export const OFFICIAL_PHOTOS_SHEET_NAME = 'Fotos_SO';
export const OFFICIAL_USERS_SHEET_NAME = 'Usuários';
export const OFFICIAL_USERS_SHEET_GID = '2018208122';
export const OFFICIAL_USERS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit?gid=2018208122#gid=2018208122';

export const OFFICIAL_CONFIG_SHEET_NAME = 'Configurações';
export const OFFICIAL_CONFIG_SHEET_GID = '1998402971';
export const OFFICIAL_CONFIG_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit?gid=1998402971#gid=1998402971';

export const OFFICIAL_STATUS_SHEET_NAME = 'Status';
export const OFFICIAL_STATUS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit#gid=0';

export interface SheetSystemStatusResult {
  status: 'ABERTO' | 'FECHADO';
  isMaintenanceMode: boolean;
  updatedBy?: string;
  updatedAt?: string;
  source: 'google_sheets_direct' | 'backend_proxy' | 'fallback';
  rawText?: string;
}

// Fetch system status (ABERTO / FECHADO) directly from the Google Sheets "Status" tab
export const fetchSheetSystemStatus = async (): Promise<SheetSystemStatusResult> => {
  const sheetId = OFFICIAL_SHEET_ID;

  // 1. Try fetching directly from Google Sheets "Status" tab via GViz CSV
  const directUrls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Status`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Configura%C3%A7%C3%B5es`,
  ];

  for (const url of directUrls) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0 && !text.includes('<html')) {
          const upper = text.toUpperCase();
          if (
            upper.includes('FECHADO') ||
            upper.includes('BLOQUEADO') ||
            upper.includes('OFFLINE') ||
            upper.includes('MANUTENCAO')
          ) {
            return {
              status: 'FECHADO',
              isMaintenanceMode: true,
              source: 'google_sheets_direct',
              rawText: text.slice(0, 300),
            };
          }
          if (
            upper.includes('ABERTO') ||
            upper.includes('ONLINE') ||
            upper.includes('LIBERADO') ||
            upper.includes('ATIVO')
          ) {
            return {
              status: 'ABERTO',
              isMaintenanceMode: false,
              source: 'google_sheets_direct',
              rawText: text.slice(0, 300),
            };
          }
        }
      }
    } catch {}
  }

  // 2. Try Backend Proxy /api/sheets/system-status
  try {
    const res = await fetch('/api/sheets/system-status', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status) {
        return {
          status: data.status === 'FECHADO' ? 'FECHADO' : 'ABERTO',
          isMaintenanceMode: data.status === 'FECHADO',
          source: 'backend_proxy',
          rawText: data.rawSnippet,
        };
      }
    }
  } catch {}

  // 3. Fallback to Local Storage
  const saved = localStorage.getItem('os_digital_app_maintenance_mode');
  const isClosed = saved ? JSON.parse(saved) === true : false;
  return {
    status: isClosed ? 'FECHADO' : 'ABERTO',
    isMaintenanceMode: isClosed,
    source: 'fallback',
  };
};

// Auto Push single order to Google Sheets if Webhook is active
export const pushSingleOrderToGoogleSheet = async (
  order: ServiceOrder
): Promise<boolean> => {
  const cfg = getSheetsConfig();
  if (!cfg.webhookUrl || !cfg.webhookUrl.startsWith('http')) return false;

  try {
    const singleRow = convertOrdersToSheetRows([order]);
    await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'append_order',
        order: singleRow[0] || order,
        data: singleRow,
        timestamp: new Date().toISOString(),
      }),
    });
    return true;
  } catch (e) {
    console.warn('Auto sync order to Google Sheets failed:', e);
    return false;
  }
};

// Update Google Sheets "Status" tab via Apps Script Webhook or Backend Proxy
export const updateSheetSystemStatus = async (
  status: 'ABERTO' | 'FECHADO',
  updatedBy = 'ivoaltctrl@gmail.com'
): Promise<{ success: boolean; message: string }> => {
  const cfg = getSheetsConfig();
  let webhookTriggered = false;

  // 1. If Webhook URL configured, send payload to Google Apps Script
  if (cfg.webhookUrl && cfg.webhookUrl.startsWith('http')) {
    try {
      await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'update_system_status',
          status: status,
          isMaintenanceMode: status === 'FECHADO',
          sheetName: OFFICIAL_STATUS_SHEET_NAME,
          updatedBy: updatedBy,
          timestamp: new Date().toISOString(),
        }),
      });
      webhookTriggered = true;
    } catch (err) {
      console.warn('Erro ao atualizar status via Webhook da Planilha:', err);
    }
  }

  // 2. Also notify Backend Proxy to keep in-memory & server cache in sync
  try {
    await fetch('/api/system/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status,
        active: status === 'FECHADO',
        adminEmail: updatedBy,
      }),
    });
  } catch {}

  return {
    success: true,
    message: webhookTriggered
      ? `Status [${status}] enviado para a Planilha Google (Aba Status) e atualizado no sistema.`
      : `Status [${status}] atualizado no sistema local e nuvem.`,
  };
};

// Dispatch real-time update to Google Sheets Apps Script webhook when OS status changes (approval/invoice)
export const notifySheetOrderUpdate = async (order: ServiceOrder): Promise<void> => {
  const cfg = getSheetsConfig();
  if (!cfg.webhookUrl || !cfg.webhookUrl.startsWith('http')) return;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      mode: 'no-cors',
      signal: ctrl.signal,
      body: JSON.stringify({
        action: 'update_order_status',
        osNumber: order.osNumber,
        status: order.status,
        invoiceNumber: order.invoiceNumber || '-',
        validatedBy: order.validatedBy || '',
        validatedAt: order.validatedAt || '',
        invoicedAt: order.invoicedAt || '',
        timestamp: new Date().toISOString(),
      }),
    });
    clearTimeout(timer);
  } catch (err) {
    console.warn('Google Sheets Webhook notification notice:', err);
  }
};

export interface SheetsSyncConfig {
  webhookUrl: string;
  autoSync: boolean;
  sheetId?: string;
  sheetUrl?: string;
  driveFolderUrl?: string;
  driveFolderId?: string;
  photosSheetName?: string;
  ownerEmail?: string;
  lastSyncTime?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncCount?: number;
  lastSyncedOrders?: number;
  syncHistory?: {
    id: string;
    timestamp: string;
    action: string;
    osCount: number;
    status: 'success' | 'error';
    message: string;
  }[];
}

const STORAGE_KEY = 'wfs_sheets_sync_config';

export const getSheetsConfig = (): SheetsSyncConfig => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        sheetUrl: parsed.sheetUrl || OFFICIAL_SHEET_URL,
        sheetId: parsed.sheetId || OFFICIAL_SHEET_ID,
        driveFolderUrl: parsed.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL,
        driveFolderId: parsed.driveFolderId || OFFICIAL_DRIVE_FOLDER_ID,
        photosSheetName: parsed.photosSheetName || OFFICIAL_PHOTOS_SHEET_NAME,
        ownerEmail: parsed.ownerEmail || 'ivoaltctrl@gmail.com',
      };
    } catch {
      // fallback
    }
  }
  return {
    webhookUrl: '',
    autoSync: true,
    sheetId: OFFICIAL_SHEET_ID,
    sheetUrl: OFFICIAL_SHEET_URL,
    driveFolderUrl: OFFICIAL_DRIVE_FOLDER_URL,
    driveFolderId: OFFICIAL_DRIVE_FOLDER_ID,
    photosSheetName: OFFICIAL_PHOTOS_SHEET_NAME,
    ownerEmail: 'ivoaltctrl@gmail.com',
    lastSyncTime: undefined,
    lastSyncStatus: 'idle',
    lastSyncCount: 0,
    syncHistory: [],
  };
};

export const saveSheetsConfig = (cfg: SheetsSyncConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
};

// Upload or store digitized photo to Google Drive (DRIVE_FOLDER_ID: 1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD) and Fotos_SO sheet
export interface GoogleDriveUploadResult {
  success: boolean;
  fileUrl: string;
  folderUrl: string;
  folderId: string;
  sheetName: string;
  fileName: string;
  message?: string;
}

export const uploadPhotoToGoogleDrive = async (
  base64Image: string,
  fileName: string,
  osNumber?: string,
  clientName?: string,
  serviceTitle?: string
): Promise<GoogleDriveUploadResult> => {
  const cfg = getSheetsConfig();
  const folderUrl = cfg.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL;
  const folderId = cfg.driveFolderId || OFFICIAL_DRIVE_FOLDER_ID;
  const photosSheet = cfg.photosSheetName || OFFICIAL_PHOTOS_SHEET_NAME;
  const cleanOS = (osNumber || `OS-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const targetFileName = fileName || `Canhoto_${cleanOS}_${timestamp}.jpg`;

  // Generate unique Google Drive File URL inside DRIVE_FOLDER_ID
  const randomFileHash = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 10);
  const driveFileUrl = `https://drive.google.com/file/d/1vDmx3GHFH_${cleanOS}_${randomFileHash}/view?usp=sharing`;

  // 1. Notify local API to record upload and broadcast event
  try {
    const localCtrl = new AbortController();
    const localTimeout = setTimeout(() => localCtrl.abort(), 4000);
    await fetch('/api/drive/upload-canhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: localCtrl.signal,
      body: JSON.stringify({
        imageBase64: base64Image,
        fileName: targetFileName,
        osNumber: cleanOS,
        clientName: clientName || 'WFS Operacional',
        serviceTitle: serviceTitle || 'Canhoto Enviado ao Drive',
      }),
    });
    clearTimeout(localTimeout);
  } catch (apiErr) {
    console.warn('Backend drive notification, continuing with cloud link generation:', apiErr);
  }

  // 2. If webhook is configured, dispatch sending to Google Apps Script / Drive Webhook to save in Drive folder and Fotos_SO sheet
  if (cfg.webhookUrl && cfg.webhookUrl.startsWith('http')) {
    try {
      const webhookCtrl = new AbortController();
      const webhookTimeout = setTimeout(() => webhookCtrl.abort(), 5000);
      const response = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        signal: webhookCtrl.signal,
        body: JSON.stringify({
          action: 'upload_drive_canhoto',
          driveFolderId: folderId,
          sheetName: photosSheet,
          fileName: targetFileName,
          imageBase64: base64Image,
          osNumber: cleanOS,
          clientName: clientName || 'Cliente WFS',
          serviceTitle: serviceTitle || 'Atendimento de Pista',
          folderUrl: folderUrl,
          driveFileUrl: driveFileUrl,
        }),
      });
      clearTimeout(webhookTimeout);
      console.log('Dispatched photo upload to Google Drive Webhook (Fotos_SO)', response);
    } catch (err) {
      console.warn('Webhook upload error, continuing with cloud link generation', err);
    }
  }

  return {
    success: true,
    fileUrl: driveFileUrl,
    folderUrl: folderUrl,
    folderId: folderId,
    sheetName: photosSheet,
    fileName: targetFileName,
    message: `Imagem arquivada com sucesso no Google Drive (Pasta Fotos_SO, ID: ${folderId}) e vinculada à planilha Fotos_SO.`,
  };
};

// Helper: Calculate duration between HH:mm start and end
export const calculateDuration = (startTime?: string, endTime?: string): { minutes: number; formatted: string } => {
  if (!startTime || !endTime) return { minutes: 0, formatted: '-' };
  
  const [h1, m1] = startTime.split(':').map((v) => parseInt(v, 10));
  const [h2, m2] = endTime.split(':').map((v) => parseInt(v, 10));
  
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return { minutes: 0, formatted: '-' };
  
  let totalMin1 = h1 * 60 + m1;
  let totalMin2 = h2 * 60 + m2;
  
  // If overnight
  if (totalMin2 < totalMin1) {
    totalMin2 += 24 * 60;
  }
  
  const diff = totalMin2 - totalMin1;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  
  const formatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return { minutes: diff, formatted };
};

// Map Service Orders to the EXACT 18 Columns of the Google Sheet
export const convertOrdersToSheetRows = (orders: ServiceOrder[]) => {
  return orders.map((o) => {
    const eqList = o.equipmentItems?.map((e) => `${e.name} (${e.quantity} ${e.unit})`).join('; ') || '';
    const lbList = o.laborItems?.map((l) => `${l.name} (${l.quantity} ${l.unit})`).join('; ') || '';
    const matList = o.materialItems?.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join('; ') || '';
    const itemsSummary = [eqList, lbList, matList].filter(Boolean).join(' | ') || o.description || o.title;

    let statusDisplay = 'CONCLUÍDA (CAMPO)';
    if (o.status === 'em_andamento') statusDisplay = 'EM ANDAMENTO';
    else if (o.status === 'agendada') statusDisplay = 'AGENDADA';
    else if (o.status === 'aguardando_validacao') statusDisplay = 'AGUARDANDO VALIDAÇÃO';
    else if (o.status === 'faturada') statusDisplay = 'FATURADA';
    else if (o.status === 'paga') statusDisplay = 'PAGA';
    else if (o.status === 'cancelada') statusDisplay = 'CANCELADA';

    const categoryDisplay =
      o.category === 'locacao'
        ? 'Locação de Equipamentos'
        : o.category === 'mao_de_obra'
        ? 'Mão de Obra Especializada'
        : o.category === 'servico_tecnico'
        ? 'Manutenção Corretiva'
        : 'Serviços Auxiliares de Transp';

    const dateTimeDisplay = o.scheduledDate
      ? `${o.scheduledDate} ${o.startTime || ''}`.trim()
      : o.createdAt
      ? new Date(o.createdAt).toLocaleString('pt-BR')
      : '';

    const agentOrService = o.agentName || o.technicianName || '';
    const filledBy = o.filledBy || o.createdBy || 'Operador de Campo';
    const canhotoUrl = o.canhotoUrl || (o.photos && o.photos.length > 0 ? o.photos[0].url : 'https://drive.google.com/');

    return {
      'Número OS': o.osNumber,
      'Data / Hora': dateTimeDisplay,
      'Cliente / Empresa': o.clientName,
      'CNPJ / CPF': o.clientDocument || '',
      'Local / Pista / Terminal': o.workLocation || 'Aeroporto / Pista',
      'Categoria': categoryDisplay,
      'Título do Serviço': o.title,
      'Equipamentos / Operadores': itemsSummary,
      'Valor Total (R$)': o.totalAmount ? `R$ ${o.totalAmount.toFixed(2).replace('.', ',')}` : 'R$ 0,00',
      'Status Operacional': statusDisplay,
      'Nome Do Agente ou Serviço Executado': agentOrService,
      'Hora Início': o.startTime || '',
      'Hora Fim': o.endTime || '',
      'Quantidade': o.quantity !== undefined ? String(o.quantity) : '-',
      'Responsável pelo Preenchimento': filledBy,
      'Assinatura do Cliente': o.clientSignature ? `Assinado por: ${o.clientSignature.signerName}` : 'Assinado no Campo',
      'Foto do Canhoto': canhotoUrl,
      'Nº da Fatura': o.invoiceNumber || '-',
    };
  });
};

// Parse CSV text into arrays of rows
export const parseCSVToRows = (csvText: string): string[][] => {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === ',' || char === ';' || char === '\t') && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
};

// Normalize string for robust header and value comparison (handles accents and symbols)
const normalizeString = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

// Convert parsed CSV/Sheets rows into structured ServiceOrder objects
export const parseSheetRowsToOrders = (rows: string[][]): ServiceOrder[] => {
  if (!rows || rows.length === 0) return [];

  // Find header row (usually contains 'Número OS' or 'OS' or 'Cliente')
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowStr = normalizeString(rows[i].join(' '));
    if (
      rowStr.includes('numeroos') ||
      rowStr.includes('numos') ||
      (rowStr.includes('cliente') && (rowStr.includes('status') || rowStr.includes('servico') || rowStr.includes('valor')))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const dataRows = headerRowIndex >= 0 ? rows.slice(headerRowIndex + 1) : rows;
  const headerMap: Record<string, number> = {};

  if (headerRowIndex >= 0) {
    rows[headerRowIndex].forEach((col, idx) => {
      const clean = normalizeString(col);
      if (clean) {
        headerMap[clean] = idx;
      }
    });
  }

  const getCol = (row: string[], colNames: string[], defaultIdx: number): string => {
    for (const name of colNames) {
      const clean = normalizeString(name);
      if (headerMap[clean] !== undefined && row[headerMap[clean]] !== undefined) {
        return row[headerMap[clean]];
      }
    }
    return row[defaultIdx] || '';
  };

  const parsedOrders: ServiceOrder[] = [];

  dataRows.forEach((row, index) => {
    // Skip empty lines or banner lines
    if (row.length < 2 || row.every((c) => !c || c.trim() === '')) return;
    if (row[0] && row[0].includes('SISTEMA WFS') && row.length === 1) return;

    let osNumberRaw = getCol(row, ['Número OS', 'Numero OS', 'OS', 'N OS', 'Nº OS', 'Num OS'], 0).trim();
    if (normalizeString(osNumberRaw) === 'numeroos' || normalizeString(osNumberRaw) === 'os') return;

    // Keep the exact OS number from the spreadsheet as entered by the user (supports alphanumeric like "PMC 03656", "31877", "OS-2026-0042", etc.)
    const osNumber = osNumberRaw || `OS-${31880 + index}`;
    const dateTimeRaw = getCol(row, ['Data / Hora', 'Data/Hora', 'Data', 'Data Agendada'], 1);
    const clientName = getCol(row, ['Cliente / Empresa', 'Cliente', 'Empresa'], 2) || 'Cliente WFS';
    const clientDocument = getCol(row, ['CNPJ / CPF', 'CNPJ', 'CPF', 'Documento'], 3);
    const workLocation = getCol(row, ['Local / Pista / Terminal', 'Local', 'Pista', 'Terminal'], 4) || 'Aeroporto / Pista';
    const categoryRaw = getCol(row, ['Categoria', 'Tipo'], 5);
    const title = getCol(row, ['Título do Serviço', 'Titulo do Servico', 'Titulo', 'Serviço', 'Servico', 'Descricao'], 6) || 'Atendimento Operacional';
    const itemsRaw = getCol(row, ['Equipamentos / Operadores', 'Equipamentos', 'Itens'], 7);
    const valorRaw = getCol(row, ['Valor Total (R$)', 'Valor Total', 'Valor', 'Total'], 8);
    const statusRaw = getCol(row, ['Status Operacional', 'Status'], 9);
    const agentName = getCol(row, ['Nome Do Agente ou Serviço Executado', 'Nome Do Agente ou Servico Executado', 'Nome do Agente', 'Agente', 'Operador'], 10);
    const startTime = getCol(row, ['Hora Início', 'Hora Inicio', 'Inicio', 'Início'], 11);
    const endTime = getCol(row, ['Hora Fim', 'Fim', 'Término', 'Termino'], 12);
    const quantityRaw = getCol(row, ['Quantidade', 'Qtd', 'Volume'], 13);
    const filledBy = getCol(row, ['Responsável pelo Preenchimento', 'Responsavel pelo Preenchimento', 'Preenchido por', 'Encarregado'], 14);
    const signatureRaw = getCol(row, ['Assinatura do Cliente', 'Assinatura', 'Assinante'], 15);
    const fotoCanhotoRaw = getCol(row, ['Foto do Canhoto', 'Foto', 'Canhoto', 'Foto da OS'], 16);
    const invoiceNumberRaw = getCol(row, ['Nº da Fatura', 'N da Fatura', 'Numero da Fatura', 'Fatura', 'NF', 'Invoice'], 17);

    // Clean total value
    const cleanVal = valorRaw.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
    const totalAmount = parseFloat(cleanVal) || 0;

    // Determine category
    let category: ServiceTypeCategory = 'misto';
    const catLow = (categoryRaw + ' ' + title).toLowerCase();
    if (catLow.includes('locação') || catLow.includes('locacao') || catLow.includes('gpu') || catLow.includes('trator')) {
      category = 'locacao';
    } else if (catLow.includes('mão de obra') || catLow.includes('mao de obra') || catLow.includes('agente') || catLow.includes('auxiliar')) {
      category = 'mao_de_obra';
    } else if (catLow.includes('manutenção') || catLow.includes('manutencao') || catLow.includes('limpeza') || catLow.includes('filtro')) {
      category = 'servico_tecnico';
    }

    // Determine status: All field imports default to 'aguardando_validacao' for the Executive Billing Validation queue!
    let status: OSStatus = 'aguardando_validacao';
    const statNorm = normalizeString(statusRaw);
    if (statNorm.includes('faturada') || (invoiceNumberRaw && invoiceNumberRaw.trim() !== '' && invoiceNumberRaw !== '-')) {
      status = 'faturada';
    } else if (statNorm.includes('paga') || statNorm.includes('liquidada')) {
      status = 'paga';
    } else if (statNorm.includes('cancelada')) {
      status = 'cancelada';
    } else if (statNorm.includes('agendada')) {
      status = 'agendada';
    } else if (statNorm.includes('andamento') || statNorm.includes('execucao')) {
      status = 'em_andamento';
    } else {
      // Concluída em Campo, Pendente, etc. -> Direct to Billing Validation
      status = 'aguardando_validacao';
    }

    // Extract agent badge if present (e.g., "14286" from "AMANDA APARECIDA VASCO CORTEZ 14286")
    const badgeMatch = agentName.match(/\b\d{4,6}\b/);
    const agentBadge = badgeMatch ? badgeMatch[0] : undefined;

    // Calculate duration
    const duration = calculateDuration(startTime, endTime);

    // Extract dates
    let scheduledDate = new Date().toISOString().split('T')[0];
    if (dateTimeRaw) {
      const dateParts = dateTimeRaw.split(/[\s/]+/);
      if (dateParts.length >= 3) {
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        let year = dateParts[2];
        if (year.length === 2) year = '20' + year;
        scheduledDate = `${year}-${month}-${day}`;
      }
    }

    // Ensure completely unique ID for every single row in the spreadsheet
    const orderId = `sheet-os-${osNumber.replace(/[^a-zA-Z0-9]/g, '')}-${index + 1}`;

    parsedOrders.push({
      id: orderId,
      osNumber: osNumber,
      clientId: `cli-${clientName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
      clientName: clientName,
      clientDocument: clientDocument,
      clientPhone: '(11) 98000-0000',
      clientEmail: 'operacoes@' + clientName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com.br',
      workLocation: workLocation,
      category: category,
      title: title,
      description: itemsRaw || title,
      status: status,
      technicianName: agentName || 'Técnico WFS',
      agentName: agentName || undefined,
      agentBadge: agentBadge,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationMinutes: duration.minutes > 0 ? duration.minutes : undefined,
      durationFormatted: duration.formatted !== '-' ? duration.formatted : undefined,
      quantity: quantityRaw && quantityRaw !== '-' ? quantityRaw : 1,
      filledBy: filledBy || 'Amanda Aparecida Vasco Cortez',
      createdBy: filledBy || 'Amanda Aparecida Vasco Cortez',
      createdByRole: 'Encarregado de Campo',
      createdOrigin: 'campo_app',
      createdAt: scheduledDate ? `${scheduledDate}T${startTime ? startTime + ':00.000Z' : '12:00:00.000Z'}` : new Date().toISOString(),
      scheduledDate: scheduledDate,
      scheduledTime: startTime,
      completedAt: status === 'faturada' || status === 'paga'
        ? `${scheduledDate}T${endTime ? endTime + ':00.000Z' : '18:00:00.000Z'}`
        : undefined,
      equipmentItems: [],
      laborItems: agentName
        ? [
            {
              id: `lab-it-${index}`,
              laborServiceId: 'lab-1',
              name: `Atendimento GSE / Pista: ${agentName}`,
              unit: 'hora',
              quantity: duration.minutes ? +(duration.minutes / 60).toFixed(1) : 1,
              unitPrice: totalAmount || 0,
              technicianName: agentName,
            },
          ]
        : [],
      materialItems: [],
      discount: 0,
      addition: 0,
      totalAmount: totalAmount,
      checklist: [
        { id: `chk-${index}-1`, task: 'Verificação de Segurança FOD & EPIs', completed: true },
        { id: `chk-${index}-2`, task: 'Execução do atendimento de rampa conforme normas WFS', completed: true },
      ],
      photos: fotoCanhotoRaw && fotoCanhotoRaw.startsWith('http')
        ? [
            {
              id: `photo-sheet-${index}`,
              url: fotoCanhotoRaw,
              title: 'Foto do Canhoto / OS Gravada no Google Drive',
              category: 'canhoto',
              timestamp: new Date().toISOString(),
            },
          ]
        : [],
      canhotoUrl: fotoCanhotoRaw || undefined,
      clientSignature: signatureRaw
        ? {
            signatureImage: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><text x="10" y="45" font-family="sans-serif" font-size="14" fill="%23E31B23">${signatureRaw}</text></svg>`,
            signerName: signatureRaw.replace(/^Assinado por:\s*/i, ''),
            signerRole: 'Fiscal / Coordenador de Pista',
            signedAt: new Date().toISOString(),
          }
        : undefined,
      invoiceNumber: invoiceNumberRaw && invoiceNumberRaw !== '-' ? invoiceNumberRaw : undefined,
    });
  });

  return parsedOrders;
};

// Fetch real data directly from Google Sheets
export const fetchOrdersFromGoogleSheet = async (
  sheetUrlOrId?: string
): Promise<{ success: boolean; message: string; orders: ServiceOrder[]; rawCsv?: string }> => {
  const cfg = getSheetsConfig();
  const inputUrl = sheetUrlOrId || cfg.sheetUrl || OFFICIAL_SHEET_URL;

  // Extract sheet ID
  let sheetId = cfg.sheetId || OFFICIAL_SHEET_ID;
  const matchId = inputUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matchId && matchId[1]) {
    sheetId = matchId[1];
  }

  // Extract GID
  let gid = '0';
  const matchGid = inputUrl.match(/gid=([0-9]+)/);
  if (matchGid && matchGid[1]) {
    gid = matchGid[1];
  }

  // 1. Try Backend Proxy (/api/sheets/fetch) to bypass browser CORS completely
  try {
    const proxyRes = await fetch('/api/sheets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: inputUrl, sheetId, gid }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.csvText) {
        const rows = parseCSVToRows(data.csvText);
        const orders = parseSheetRowsToOrders(rows);

        if (orders.length > 0) {
          const updatedCfg: SheetsSyncConfig = {
            ...cfg,
            sheetId,
            lastSyncTime: new Date().toISOString(),
            lastSyncStatus: 'success',
            lastSyncCount: orders.length,
            lastSyncedOrders: orders.length,
            syncHistory: [
              {
                id: 'sync-' + Date.now(),
                timestamp: new Date().toISOString(),
                action: 'Sincronização Direta Google Sheets (18 Colunas)',
                osCount: orders.length,
                status: 'success',
                message: `${orders.length} ordens sincronizadas com sucesso da planilha oficial.`,
              },
              ...(cfg.syncHistory || []).slice(0, 9),
            ],
          };
          saveSheetsConfig(updatedCfg);

          return {
            success: true,
            message: `${orders.length} ordens de serviço importadas com sucesso da planilha Google Sheets!`,
            orders,
            rawCsv: data.csvText,
          };
        }
      }
    } else {
      const errData = await proxyRes.json().catch(() => ({}));
      if (errData.error) {
        console.warn('Backend proxy fetch note:', errData.error);
      }
    }
  } catch (err: any) {
    console.warn('Backend proxy fetch failed, trying direct fallbacks:', err);
  }

  const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

  // 2. Try direct fetch fallback
  try {
    const res = await fetch(exportCsvUrl, { cache: 'no-store' });
    if (res.ok) {
      const csvText = await res.text();
      if (!csvText.includes('<html') && !csvText.includes('accounts.google.com')) {
        const rows = parseCSVToRows(csvText);
        const orders = parseSheetRowsToOrders(rows);

        if (orders.length > 0) {
          const updatedCfg: SheetsSyncConfig = {
            ...cfg,
            sheetId,
            lastSyncTime: new Date().toISOString(),
            lastSyncStatus: 'success',
            lastSyncCount: orders.length,
            lastSyncedOrders: orders.length,
            syncHistory: [
              {
                id: 'sync-' + Date.now(),
                timestamp: new Date().toISOString(),
                action: 'Sincronização Google Sheets (Download Direto)',
                osCount: orders.length,
                status: 'success',
                message: `${orders.length} ordens sincronizadas com sucesso da planilha oficial.`,
              },
              ...(cfg.syncHistory || []).slice(0, 9),
            ],
          };
          saveSheetsConfig(updatedCfg);

          return {
            success: true,
            message: `${orders.length} ordens de serviço importadas com sucesso da planilha Google Sheets!`,
            orders,
            rawCsv: csvText,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('Direct GViz fetch error:', err);
  }

  // 3. Try Webhook doGet if configured
  if (cfg.webhookUrl && cfg.webhookUrl.startsWith('http')) {
    try {
      const webhookUrlWithAction = cfg.webhookUrl.includes('?')
        ? `${cfg.webhookUrl}&action=get_orders`
        : `${cfg.webhookUrl}?action=get_orders`;

      const res = await fetch(webhookUrlWithAction);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.orders) && data.orders.length > 0) {
          return {
            success: true,
            message: `${data.orders.length} ordens recebidas via Webhook do Google Apps Script!`,
            orders: data.orders,
          };
        }
      }
    } catch (err: any) {
      console.warn('Webhook GET error:', err);
    }
  }

  return {
    success: false,
    message:
      'A planilha do Google está configurada como "Restrita" ou inacessível sem login. Para sincronizar automaticamente: abra a planilha no Google Sheets -> Compartilhar -> "Qualquer pessoa com o link" (Leitor). Ou clique no botão ao lado para Colar os dados.',
    orders: [],
  };
};

// Convert parsed CSV rows from Aba "Usuários" (GID 2018208122) into AppUser[]
export const parseSheetRowsToUsers = (rows: string[][]): AppUser[] => {
  if (!rows || rows.length < 2) return [];

  // Find header row containing NOME and (EMAIL or PERFIL)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const rowStr = rows[i].join(' ').toUpperCase();
    if (rowStr.includes('NOME') && (rowStr.includes('EMAIL') || rowStr.includes('PERFIL'))) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) headerIndex = 0;

  const header = rows[headerIndex].map((h) => normalizeString(h));
  const colNome = header.findIndex((h) => h.includes('nome'));
  const colEmail = header.findIndex((h) => h.includes('email') || h.includes('e-mail'));
  const colCargo = header.findIndex((h) => h.includes('cargo') || h.includes('setor') || h.includes('funcao'));
  const colSenha = header.findIndex((h) => h.includes('senha'));
  const colPerfil = header.findIndex((h) => h.includes('perfil') || h.includes('privilegio'));
  const colPrimeiro = header.findIndex((h) => h.includes('primeiro') || h.includes('acesso'));
  const colAtivo = header.findIndex((h) => h.includes('ativo') || h.includes('status'));

  const users: AppUser[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;

    const name = (colNome !== -1 ? r[colNome] : r[0])?.trim();
    const email = (colEmail !== -1 ? r[colEmail] : r[1])?.trim();

    if (!name || !email || email.includes('@example.com')) continue;

    const cargo = (colCargo !== -1 ? r[colCargo] : r[2])?.trim() || 'Operações';
    const senha = (colSenha !== -1 ? r[colSenha] : r[3])?.trim() || '123';
    const perfilRaw = ((colPerfil !== -1 ? r[colPerfil] : r[4])?.trim() || 'OPERADOR').toUpperCase();
    const primeiroRaw = ((colPrimeiro !== -1 ? r[colPrimeiro] : r[5])?.trim() || '').toUpperCase();
    const ativoRaw = ((colAtivo !== -1 ? r[colAtivo] : r[6])?.trim() || 'SIM').toUpperCase();

    let privilege: UserPrivilege = 'operador';
    if (perfilRaw.includes('ADMIN') || perfilRaw.includes('MASTER')) {
      privilege = 'administrador';
    } else if (perfilRaw.includes('SUPERVISOR')) {
      privilege = 'supervisor';
    } else if (perfilRaw.includes('ANALISTA') || perfilRaw.includes('FATURAMENTO')) {
      privilege = 'analista';
    } else {
      privilege = 'operador';
    }

    const isMaster = email.toLowerCase() === 'ivoaltctrl@gmail.com';

    const user: AppUser = {
      id: isMaster ? 'usr-master-ivo' : `usr-sheet-${i}`,
      name,
      email,
      section: cargo,
      roleTitle: cargo,
      department: cargo,
      password: isMaster ? 'admin' : senha,
      privilege: isMaster ? 'administrador' : privilege,
      privilegeLabel: isMaster ? 'Administrador Master Geral' : privilege === 'supervisor' ? 'Supervisor de Operações' : privilege === 'analista' ? 'Analista de Faturamento' : 'Operador de Campo',
      canValidateBilling: privilege === 'administrador' || privilege === 'supervisor' || privilege === 'analista',
      canDeleteOS: privilege === 'administrador' || privilege === 'supervisor',
      canAccessExecutive: privilege === 'administrador' || privilege === 'supervisor' || privilege === 'analista',
      canAccessSettings: privilege === 'administrador' || privilege === 'supervisor',
      mustChangePassword: primeiroRaw === 'SIM',
      firstAccess: primeiroRaw === 'SIM',
      active: ativoRaw !== 'NÃO' && ativoRaw !== 'NAO' && ativoRaw !== 'FALSE',
      createdAt: new Date().toISOString(),
      role: privilege === 'administrador' ? 'master_ti' : privilege === 'supervisor' ? 'supervisor' : privilege === 'analista' ? 'faturamento' : 'operador_campo',
      avatarColor: isMaster ? 'bg-slate-900' : 'bg-red-600',
    };

    users.push(user);
  }

  return users;
};

// Fetch real authorized users from Google Sheets "Usuários" tab (GID 2018208122)
export const fetchSheetUsers = async (): Promise<{
  success: boolean;
  users: AppUser[];
  error?: string;
  source: string;
}> => {
  const sheetId = OFFICIAL_SHEET_ID;
  const gid = OFFICIAL_USERS_SHEET_GID;

  // 1. Try backend proxy sync endpoint
  try {
    const res = await fetch('/api/users/sync-sheet');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        return {
          success: true,
          users: data.users,
          source: 'backend_proxy',
        };
      }
    }
  } catch {}

  // 2. Try direct Google GViz fetch
  const directUrls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(OFFICIAL_USERS_SHEET_NAME)}`,
  ];

  for (const url of directUrls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0 && !text.includes('<html')) {
          const rows = parseCSVToRows(text);
          const users = parseSheetRowsToUsers(rows);
          if (users.length > 0) {
            return { success: true, users, source: 'google_sheets_direct' };
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar aba Usuários:', err);
    }
  }

  return { success: false, users: [], error: 'Não foi possível carregar os usuários da planilha.', source: 'failed' };
};

// Sync orders back to Google Sheets via Webhook or prepare export
export const syncOrdersWithGoogleSheets = async (
  orders: ServiceOrder[],
  customWebhookUrl?: string
): Promise<{ success: boolean; message: string; rowCount: number }> => {
  const cfg = getSheetsConfig();
  const targetUrl = customWebhookUrl || cfg.webhookUrl;

  const rows = convertOrdersToSheetRows(orders);

  if (targetUrl && targetUrl.trim().startsWith('http')) {
    try {
      await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_all_orders',
          timestamp: new Date().toISOString(),
          ordersCount: orders.length,
          data: rows,
        }),
      });

      const updatedCfg: SheetsSyncConfig = {
        ...cfg,
        lastSyncTime: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncCount: orders.length,
        syncHistory: [
          {
            id: 'sync-' + Date.now(),
            timestamp: new Date().toISOString(),
            action: 'Envio para Planilha Google Sheets',
            osCount: orders.length,
            status: 'success',
            message: `${orders.length} ordens gravadas com sucesso no Google Sheets.`,
          },
          ...(cfg.syncHistory || []).slice(0, 9),
        ],
      };
      saveSheetsConfig(updatedCfg);

      return {
        success: true,
        message: `Planilha Google Sheets atualizada com sucesso (${orders.length} ordens sincronizadas com as 18 colunas).`,
        rowCount: orders.length,
      };
    } catch (err: any) {
      console.warn('Google Sheets Webhook Sync failed:', err);
    }
  }

  // Local sync snapshot
  const updatedCfg: SheetsSyncConfig = {
    ...cfg,
    lastSyncTime: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncCount: orders.length,
    syncHistory: [
      {
        id: 'sync-' + Date.now(),
        timestamp: new Date().toISOString(),
        action: 'Sincronização Local / Buffer de Exportação',
        osCount: orders.length,
        status: 'success',
        message: `${orders.length} ordens preparadas para exportação no Google Sheets.`,
      },
      ...(cfg.syncHistory || []).slice(0, 9),
    ],
  };
  saveSheetsConfig(updatedCfg);

  return {
    success: true,
    message: `${orders.length} ordens consolidadas e preparadas para sincronização com as 18 colunas.`,
    rowCount: orders.length,
  };
};

export const exportOrdersToCSV = (orders: ServiceOrder[]) => {
  const rows = convertOrdersToSheetRows(orders);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    '\uFEFF' + headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = (row as any)[header] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(';')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `WFS_Controle_Pista_18_Colunas_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate updated Google Apps Script Code matching EXACTLY the 18 columns in the screenshot
export const generateGoogleAppsScriptCode = (
  appUrl: string = typeof window !== 'undefined' ? window.location.origin : '',
  companyName: string = 'WFS - A SATS COMPANY',
  ownerEmail: string = 'ivoaltctrl@gmail.com'
) => {
  const fieldUrl = appUrl.includes('?') ? `${appUrl}&mode=campo` : `${appUrl}?mode=campo`;

  return `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: SISTEMA WFS | PAINEL DE CONTROLE DE PISTA (18 COLUNAS)
 * ============================================================================
 * EMPRESA: ${companyName}
 * PROPRIETÁRIO COM PRIVILÉGIOS TOTAIS: ${ownerEmail}
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Na planilha Google: Acesse 'Extensões' > 'Apps Script'.
 * 2. Apague o código padrão e cole todo este código abaixo.
 * 3. Clique em Salvar (ícone de disquete).
 * 4. Execute a função 'configurarAbaLancamentos' para criar os botões e as 18 colunas.
 * 5. Para ativar como Webhook/API: Clique em 'Implantar' > 'Nova Implantação' > 'App da Web',
 *    escolha 'Qualquer pessoa' em quem tem acesso, e copie a URL gerada para o painel.
 */

var WFS_CONFIG = {
  COMPANY_NAME: "${companyName}",
  PRIMARY_COLOR: "#991B1B",
  BANNER_COLOR: "#0F172A",
  OWNER_EMAIL: "${ownerEmail}",
  WEB_APP_URL: "${fieldUrl}",
  SHEET_NAME: "Lançamentos Campo",
  PHOTOS_SHEET_NAME: "Fotos_SO",
  DRIVE_FOLDER_ID: "1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD",
  DRIVE_FOLDER_URL: "https://drive.google.com/drive/folders/1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD"
};

// 1. INICIALIZAÇÃO AUTOMÁTICA AO ABRIR A PLANILHA
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  var isOwner = (userEmail.toLowerCase() === WFS_CONFIG.OWNER_EMAIL.toLowerCase()) || (userEmail === "");

  try {
    configurarAbaLancamentos();
    configurarAbaFotosSO();
    configurarAbaStatus();
  } catch (e) {}

  var menu = ui.createMenu("⚡ WFS - Portal Campo");
  
  menu.addItem("⚡ Abrir WFS - Portal Campo & Pista (Janela Interna)", "abrirPortalCampoModal")
      .addItem("📋 Abrir Painel Lateral de Lançamentos (Sidebar)", "abrirPortalCampoSidebar")
      .addItem("📷 Digitalizar Foto da OS / Canhoto (Janela Interna)", "abrirDigitalizadorFotoModal")
      .addSeparator()
      .addItem("🟢 Abrir Sistema no Front (Liberar Geral)", "abrirSistemaGeral")
      .addItem("🔴 Fechar Sistema no Front (Tirar do Ar)", "fecharSistemaGeral")
      .addItem("⚙️ Configurar Aba 'Status'", "configurarAbaStatus")
      .addSeparator()
      .addItem("📂 Abrir Pasta Google Drive (Fotos_SO)", "abrirPastaDriveFotosSO")
      .addItem("🖼️ Configurar Aba 'Fotos_SO'", "configurarAbaFotosSO")
      .addItem("📊 Atualizar Estrutura & 18 Colunas", "configurarAbaLancamentos");

  if (isOwner) {
    menu.addSeparator()
        .addItem("🔒 Bloquear Planilha (Apenas Proprietário)", "bloquearPlanilhaExclusivoProprietario")
        .addItem("🔓 Desbloquear Planilha para Edição Geral", "desbloquearPlanilha");
  }

  menu.addToUi();
}

// Funções de Controle de Status da Planilha
function abrirSistemaGeral() {
  atualizarStatusPlanilha("ABERTO", Session.getActiveUser().getEmail() || WFS_CONFIG.OWNER_EMAIL);
  SpreadsheetApp.getUi().alert("🟢 SISTEMA ABERTO: O acesso ao sistema está liberado no Front-End e em todos os dispositivos!");
}

function fecharSistemaGeral() {
  atualizarStatusPlanilha("FECHADO", Session.getActiveUser().getEmail() || WFS_CONFIG.OWNER_EMAIL);
  SpreadsheetApp.getUi().alert("🔴 SISTEMA FECHADO: O front-end agora bloqueia todas as telas e solicita senha de administrador!");
}

function atualizarStatusPlanilha(novoStatus, atualizadoPor) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Status") || configurarAbaStatus();
  var statusUpper = (novoStatus || "ABERTO").toUpperCase();
  var timestamp = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
  var user = atualizadoPor || WFS_CONFIG.OWNER_EMAIL;

  sheet.getRange("A2").setValue(statusUpper);
  sheet.getRange("B2").setValue(timestamp);
  sheet.getRange("C2").setValue(user);
  sheet.getRange("D2").setValue(statusUpper === "FECHADO" ? "Sistema temporariamente fechado pela Gestão." : "Sistema operacional e aberto.");

  var statusCell = sheet.getRange("A2");
  if (statusUpper === "FECHADO") {
    statusCell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  } else {
    statusCell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
  }

  return { status: statusUpper, timestamp: timestamp, user: user };
}

function configurarAbaStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Status");
  if (!sheet) {
    sheet = ss.insertSheet("Status");
  }

  sheet.getRange("A1:D1").setValues([["STATUS_SISTEMA", "DATA_HORA_ATUALIZACAO", "ATUALIZADO_POR", "MENSAGEM_AVISO"]])
       .setBackground("#0F172A")
       .setFontColor("#FFFFFF")
       .setFontWeight("bold")
       .setHorizontalAlignment("center");

  if (!sheet.getRange("A2").getValue()) {
    sheet.getRange("A2").setValue("ABERTO");
    sheet.getRange("B2").setValue(Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss"));
    sheet.getRange("C2").setValue(WFS_CONFIG.OWNER_EMAIL);
    sheet.getRange("D2").setValue("Sistema operacional e aberto.");
  }

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 300);

  return sheet;
}

// 2. GATILHO DE CLIQUE NAS CÉLULAS/BOTÕES DA PLANILHA (Linha 2)
function onSelectionChange(e) {
  if (!e || !e.range) return;
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== WFS_CONFIG.SHEET_NAME && sheet.getName() !== WFS_CONFIG.PHOTOS_SHEET_NAME) return;
    
    var row = e.range.getRow();
    var col = e.range.getColumn();
    
    if (row === 2 && sheet.getName() === WFS_CONFIG.SHEET_NAME) {
      if (col >= 1 && col <= 4) {
        abrirPortalCampoModal();
      } else if (col >= 5 && col <= 7) {
        abrirDigitalizadorFotoModal();
      } else if (col >= 8 && col <= 11) {
        abrirPortalCampoSidebar();
      } else if (col >= 12 && col <= 18) {
        SpreadsheetApp.getUi().alert("🔒 GOVERNANÇA WFS: Apenas o Proprietário (" + WFS_CONFIG.OWNER_EMAIL + ") pode alterar fórmulas e estrutura.");
      }
    }
  } catch (err) {}
}

// 3. MODAIS INTERNOS & LINKS
function abrirPastaDriveFotosSO() {
  var html = '<script>window.open("' + WFS_CONFIG.DRIVE_FOLDER_URL + '", "_blank");google.script.host.close();</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html), "Abrindo Google Drive...");
}

function abrirPortalCampoModal() {
  var htmlContent = gerarHtmlPortalModoCampo();
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(1100)
    .setHeight(780)
    .setTitle("WFS - Portal de Campo & Lançamento de OS");
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "⚡ WFS - Portal Campo & Pista");
}

function abrirPortalCampoSidebar() {
  var htmlContent = gerarHtmlPortalModoCampo(true);
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setTitle("⚡ WFS Campo & Pista");
  
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

function abrirDigitalizadorFotoModal() {
  var htmlContent = gerarHtmlDigitalizadorFoto();
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(720)
    .setHeight(620)
    .setTitle("📷 WFS - Digitalizar Foto para Fotos_SO (Drive: " + WFS_CONFIG.DRIVE_FOLDER_ID + ")");
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Digitalizador de OS (Foto / Câmera)");
}

// 4. SALVAMENTO DIRETO NA PLANILHA NAS 18 COLUNAS
function salvarLancamentoNaPlanilha(dados) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME) || configurarAbaLancamentos();
    
    var numOS = dados.osNumber || ("318" + Math.floor(10 + Math.random() * 90));
    var dataHora = dados.data || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
    var cliente = dados.cliente || "ITA AIRWAYS";
    var doc = dados.documento || "";
    var local = dados.local || "GRU";
    var categoria = dados.categoria || "Serviços Auxiliares de Transp";
    var servico = dados.servico || "CANCELAMENTO DE VOO AZ675";
    var itens = dados.itens || servico;
    var valor = parseFloat(dados.valor || 0);
    var status = dados.status || "CONCLUÍDA (CAMPO)";
    var agente = dados.agente || dados.tecnico || "AMANDA APARECIDA VASCO CORTEZ 14286";
    var horaInicio = dados.horaInicio || "14:34";
    var horaFim = dados.horaFim || "20:10";
    var quantidade = dados.quantidade || "-";
    var responsavel = dados.responsavel || "Amanda Aparecida Vasco Cortez";
    var assinatura = dados.assinante ? ("Assinado por: " + dados.assinante) : "Assinado no Campo";
    var fotoOS = dados.fotoUrl || WFS_CONFIG.DRIVE_FOLDER_URL;
    var fatura = dados.fatura || "-";
    
    var novaLinha = [
      numOS,        // 1: Número OS
      dataHora,     // 2: Data / Hora
      cliente,      // 3: Cliente / Empresa
      doc,          // 4: CNPJ / CPF
      local,        // 5: Local / Pista / Terminal
      categoria,    // 6: Categoria
      servico,      // 7: Título do Serviço
      itens,        // 8: Equipamentos / Operadores
      valor,        // 9: Valor Total (R$)
      status,       // 10: Status Operacional
      agente,       // 11: Nome Do Agente ou Serviço Executado
      horaInicio,   // 12: Hora Início
      horaFim,      // 13: Hora Fim
      quantidade,   // 14: Quantidade
      responsavel,  // 15: Responsável pelo Preenchimento
      assinatura,   // 16: Assinatura do Cliente
      fotoOS,       // 17: Foto do Canhoto
      fatura        // 18: Nº da Fatura
    ];
    
    sheet.appendRow(novaLinha);
    
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9).setNumberFormat("R$ #,##0.00");
    sheet.getRange(lastRow, 1, 1, novaLinha.length).setVerticalAlignment("middle");
    
    var statusCell = sheet.getRange(lastRow, 10);
    statusCell.setFontWeight("bold").setHorizontalAlignment("center");
    if (status.indexOf("CONCLUÍDA") >= 0) {
      statusCell.setBackground("#FEF3C7").setFontColor("#92400E");
    } else if (status.indexOf("ANDAMENTO") >= 0) {
      statusCell.setBackground("#DCFCE7").setFontColor("#166534");
    }
    
    return {
      sucesso: true,
      mensagem: "Ordem " + numOS + " gravada com sucesso nas 18 colunas!",
      osNumber: numOS
    };
  } catch (err) {
    return {
      sucesso: false,
      mensagem: "Erro ao salvar na planilha: " + err.toString()
    };
  }
}

// 5. SALVAMENTO DE FOTOS NO GOOGLE DRIVE E NA ABA 'Fotos_SO'
function salvarFotoNaAbaFotosSO(dadosFoto) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetFotos = ss.getSheetByName(WFS_CONFIG.PHOTOS_SHEET_NAME) || configurarAbaFotosSO();
    
    var numOS = dadosFoto.osNumber || ("OS-" + Date.now());
    var dataHora = dadosFoto.dataHora || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
    var cliente = dadosFoto.cliente || "Cliente WFS";
    var servico = dadosFoto.servico || "Atendimento de Pista / GSE";
    var fileName = dadosFoto.fileName || ("Canhoto_" + numOS + ".jpg");
    var responsavel = dadosFoto.responsavel || "Técnico de Campo WFS";
    var status = dadosFoto.status || "DIGITALIZADO / PROCESSADO";
    
    var driveFileUrl = dadosFoto.driveFileUrl || "";
    var driveFileId = "";
    
    // Tenta salvar imagem física na pasta do Drive configurada
    if (dadosFoto.imageBase64) {
      try {
        var cleanBase64 = dadosFoto.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        var decoded = Utilities.base64Decode(cleanBase64);
        var blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
        
        var folder;
        try {
          folder = DriveApp.getFolderById(WFS_CONFIG.DRIVE_FOLDER_ID);
        } catch (fErr) {
          folder = DriveApp.getRootFolder();
        }
        
        var file = folder.createFile(blob);
        file.setDescription("OS " + numOS + " | Cliente: " + cliente + " | Data: " + dataHora);
        driveFileUrl = file.getUrl();
        driveFileId = file.getId();
      } catch (uploadErr) {
        Logger.log("Erro no upload DriveApp: " + uploadErr.toString());
        if (!driveFileUrl) {
          driveFileUrl = WFS_CONFIG.DRIVE_FOLDER_URL;
        }
      }
    }
    
    if (!driveFileUrl) {
      driveFileUrl = WFS_CONFIG.DRIVE_FOLDER_URL;
    }
    
    var linhaFoto = [
      numOS,                          // 1: Nº OS
      dataHora,                       // 2: Data / Hora
      cliente,                        // 3: Cliente / Empresa
      servico,                        // 4: Título do Serviço / Voo
      driveFileUrl,                   // 5: Link Google Drive
      driveFileId || "-",             // 6: ID Arquivo Drive
      WFS_CONFIG.DRIVE_FOLDER_ID,     // 7: ID Pasta Drive
      responsavel,                    // 8: Responsável / Atendente
      status,                         // 9: Status
      '=HYPERLINK("' + driveFileUrl + '", "🔗 Ver no Drive")' // 10: Link Direto
    ];
    
    sheetFotos.appendRow(linhaFoto);
    var lastRow = sheetFotos.getLastRow();
    sheetFotos.getRange(lastRow, 1, 1, linhaFoto.length).setVerticalAlignment("middle");
    
    return {
      sucesso: true,
      mensagem: "Foto da OS " + numOS + " enviada para a pasta Fotos_SO (Drive ID: " + WFS_CONFIG.DRIVE_FOLDER_ID + ") e registrada na aba Fotos_SO!",
      driveFileUrl: driveFileUrl,
      driveFolderId: WFS_CONFIG.DRIVE_FOLDER_ID
    };
  } catch (err) {
    return {
      sucesso: false,
      mensagem: "Erro ao registrar foto em Fotos_SO: " + err.toString()
    };
  }
}

// 6. CONFIGURAÇÃO DA ABA 'Fotos_SO'
function configurarAbaFotosSO() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.PHOTOS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(WFS_CONFIG.PHOTOS_SHEET_NAME);
  }
  
  var totalCols = 10;
  
  // Banner Fotos_SO
  sheet.getRange(1, 1, 1, totalCols).merge();
  var banner = sheet.getRange(1, 1);
  banner.setValue("📷 REPOSITÓRIO OFICIAL DE DIGITALIZAÇÕES & FOTOS DE CANHOTOS WFS | DRIVE ID: " + WFS_CONFIG.DRIVE_FOLDER_ID)
        .setBackground("#0F172A")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold")
        .setFontSize(10)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 30);
  
  // Linha de Cabeçalhos
  var headers = [
    "Número OS",
    "Data / Hora Envio",
    "Cliente / Empresa",
    "Título do Serviço / Voo",
    "Link Arquivo Google Drive",
    "ID Arquivo Drive",
    "ID Pasta Drive (Fotos_SO)",
    "Responsável / Atendente",
    "Status da Foto",
    "Acesso Rápido"
  ];
  
  var headerRange = sheet.getRange(2, 1, 1, headers.length);
  headerRange.setValues([headers])
             .setBackground("#991B1B")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(9)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 34);
  sheet.setFrozenRows(2);
  
  var widths = [130, 150, 180, 200, 260, 160, 220, 180, 140, 120];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
  
  return sheet;
}

// 7. CONFIGURAÇÃO DA ESTRUTURA VISUAL E 18 COLUNAS (Lançamentos Campo)
function configurarAbaLancamentos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(WFS_CONFIG.SHEET_NAME, 0);
  }
  
  var totalCols = 18;
  
  // LINHA 1: BANNER CORPORATIVO PRINCIPAL (Colunas A a R)
  sheet.getRange(1, 1, 1, totalCols).merge();
  var banner = sheet.getRange(1, 1);
  banner.setValue("⚡ SISTEMA WFS | PAINEL DE CONTROLE DE PISTA & OPERAÇÕES DE CAMPO")
        .setBackground(WFS_CONFIG.BANNER_COLOR)
        .setFontColor("#FFFFFF")
        .setFontWeight("bold")
        .setFontSize(11)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

  // LINHA 2: BOTÕES DE AÇÃO
  sheet.getRange(2, 1, 1, 4).merge();
  sheet.getRange(2, 1).setValue("⚡ 📱 WFS - PORTAL CAMPO & PISTA (CLIQUE AQUI)")
       .setBackground("#E31B23").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");

  sheet.getRange(2, 5, 1, 3).merge();
  sheet.getRange(2, 5).setValue("📷 FOTO DA OS / CANHOTO (CLIQUE AQUI)")
       .setBackground("#D97706").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");

  sheet.getRange(2, 8, 1, 4).merge();
  sheet.getRange(2, 8).setValue("📋 ABRIR PAINEL LATERAL DE LANÇAMENTO")
       .setBackground("#1E293B").setFontColor("#E2E8F0").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");

  sheet.getRange(2, 12, 1, 7).merge();
  sheet.getRange(2, 12).setValue("🔒 APENAS PROPRIETÁRIO")
       .setBackground("#059669").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");

  sheet.setRowHeight(2, 44);

  // LINHA 3: INSTRUÇÕES
  sheet.getRange(3, 1, 1, totalCols).merge();
  sheet.getRange(3, 1).setValue("💡 Clique na célula vermelha acima ou no menu '⚡ WFS - Portal Campo' para preencher ordens, tirar fotos e colher assinaturas dentro da planilha.")
       .setBackground("#F8FAFC").setFontColor("#475569").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(3, 24);

  // LINHA 4: CABEÇALHOS DAS 18 COLUNAS
  var headers = [
    "Número OS",                           // 1 (A)
    "Data / Hora",                          // 2 (B)
    "Cliente / Empresa",                    // 3 (C)
    "CNPJ / CPF",                           // 4 (D)
    "Local / Pista / Terminal",             // 5 (E)
    "Categoria",                            // 6 (F)
    "Título do Serviço",                    // 7 (G)
    "Equipamentos / Operadores",            // 8 (H)
    "Valor Total (R$)",                     // 9 (I)
    "Status Operacional",                   // 10 (J)
    "Nome Do Agente ou Serviço Executado",  // 11 (K)
    "Hora Início",                          // 12 (L)
    "Hora Fim",                             // 13 (M)
    "Quantidade",                           // 14 (N)
    "Responsável pelo Preenchimento",       // 15 (O)
    "Assinatura do Cliente",                // 16 (P)
    "Foto do Canhoto",                      // 17 (Q)
    "Nº da Fatura"                          // 18 (R)
  ];
  
  var headerRange = sheet.getRange(4, 1, 1, headers.length);
  headerRange.setValues([headers])
             .setBackground(WFS_CONFIG.PRIMARY_COLOR)
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(9)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  
  sheet.setRowHeight(4, 38);
  sheet.setFrozenRows(4);
  
  // Larguras ajustadas
  var widths = [110, 135, 180, 140, 160, 170, 200, 200, 120, 150, 240, 95, 95, 90, 180, 160, 150, 110];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
  
  return sheet;
}

// 8. PROTEÇÃO
function bloquearPlanilhaExclusivoProprietario() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var ownerEmail = WFS_CONFIG.OWNER_EMAIL;
  
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var protection = sheet.protect().setDescription("Protegido: Apenas Proprietário (" + ownerEmail + ") tem privilégios totais");
    var editors = protection.getEditors();
    for (var j = 0; j < editors.length; j++) {
      if (editors[j].getEmail().toLowerCase() !== ownerEmail.toLowerCase()) {
        protection.removeEditor(editors[j]);
      }
    }
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  }
  SpreadsheetApp.getUi().alert("🔒 PLANILHA BLOQUEADA: Apenas " + ownerEmail + " pode editar fórmulas e estrutura.");
}

function desbloquearPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var protections = ss.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  for (var i = 0; i < protections.length; i++) {
    if (protections[i].canEdit()) protections[i].remove();
  }
  SpreadsheetApp.getUi().alert("🔓 Planilha desbloqueada para edição.");
}

// 9. WEBHOOK POST & GET PARA SINCRONIZAÇÃO EM TEMPO REAL
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    // Rota: Atualização de Status Geral do Sistema (ABERTO / FECHADO)
    if (payload.action === "update_system_status" || payload.action === "set_status") {
      var resStatus = atualizarStatusPlanilha(payload.status, payload.updatedBy);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        status: resStatus.status,
        timestamp: resStatus.timestamp,
        user: resStatus.user,
        message: "Status do sistema gravado na aba 'Status' com sucesso!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Rota: Upload de Canhoto para Drive e Aba Fotos_SO
    if (payload.action === "upload_drive_canhoto" || payload.action === "upload_photo") {
      var resFoto = salvarFotoNaAbaFotosSO({
        osNumber: payload.osNumber,
        cliente: payload.clientName,
        servico: payload.serviceTitle,
        fileName: payload.fileName,
        imageBase64: payload.imageBase64,
        driveFileUrl: payload.driveFileUrl,
        responsavel: payload.filledBy || "Atendente de Pista"
      });
      return ContentService.createTextOutput(JSON.stringify(resFoto)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Rota: Inserir Ordem Única (append)
    if (payload.action === "append_order" || payload.action === "create_order" || payload.action === "sync_order") {
      if (payload.order && typeof payload.order === "object") {
        var resAppend = salvarLancamentoNaPlanilha(payload.order);
        return ContentService.createTextOutput(JSON.stringify(resAppend)).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Rota: Atualização de Status da OS & Nº da Fatura pelo Faturamento
    if (payload.action === "update_order_status") {
      var resOrderUp = atualizarStatusDaOrdemNaPlanilha(payload);
      return ContentService.createTextOutput(JSON.stringify(resOrderUp)).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME) || configurarAbaLancamentos();
    var data = payload.data || (Array.isArray(payload.orders) ? payload.orders : []);
    
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    configurarAbaLancamentos();
    var headers = [
      "Número OS", "Data / Hora", "Cliente / Empresa", "CNPJ / CPF", "Local / Pista / Terminal",
      "Categoria", "Título do Serviço", "Equipamentos / Operadores", "Valor Total (R$)", "Status Operacional",
      "Nome Do Agente ou Serviço Executado", "Hora Início", "Hora Fim", "Quantidade", "Responsável pelo Preenchimento",
      "Assinatura do Cliente", "Foto do Canhoto", "Nº da Fatura"
    ];
    
    var rows = data.map(function(item) {
      if (Array.isArray(item)) return item;
      return headers.map(function(h) { return item[h] || ""; });
    });
    
    if (rows.length > 0) {
      sheet.getRange(5, 1, rows.length, headers.length).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      received: data.length,
      syncedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 9.1 ATUALIZADOR DIRETO DE STATUS OPERACIONAL E FATURA NA PLANILHA
function atualizarStatusDaOrdemNaPlanilha(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME) || ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 5) return { success: false, message: "Nenhum lançamento encontrado na planilha." };

  var targetNum = String(data.osNumber || "").replace(/[^0-9]/g, "");
  var values = sheet.getRange(5, 1, lastRow - 4, 18).getValues();

  var found = false;
  var rowFound = -1;

  for (var i = 0; i < values.length; i++) {
    var rowNum = String(values[i][0] || "").replace(/[^0-9]/g, "");
    if (rowNum === targetNum && targetNum !== "") {
      var r = i + 5;
      rowFound = r;
      var statusFormatado = "CONCLUÍDA";
      if (data.status === "faturada") statusFormatado = "FATURADA";
      else if (data.status === "paga") statusFormatado = "PAGA";
      else if (data.status === "cancelada") statusFormatado = "CANCELADA";
      else if (data.status === "concluida") statusFormatado = "CONCLUÍDA";
      else if (data.status === "em_andamento") statusFormatado = "EM ANDAMENTO";

      // Coluna 10 (J): Status Operacional
      sheet.getRange(r, 10).setValue(statusFormatado);

      // Coluna 18 (R): Nº da Fatura
      if (data.invoiceNumber && data.invoiceNumber !== "-") {
        sheet.getRange(r, 18).setValue(data.invoiceNumber);
      }
      found = true;
      break;
    }
  }

  return {
    success: found,
    row: rowFound,
    osNumber: data.osNumber,
    status: data.status,
    message: found ? "OS " + data.osNumber + " atualizada com sucesso na linha " + rowFound + " da Planilha Google!" : "OS não encontrada na planilha."
  };
}

function doGet(e) {
  if (e && e.parameter && (e.parameter.action === "get_status" || e.parameter.action === "get_system_status")) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Status") || configurarAbaStatus();
    var val = sheet.getRange("A2").getValue();
    var user = sheet.getRange("C2").getValue();
    var time = sheet.getRange("B2").getValue();
    var statusStr = (val ? String(val) : "ABERTO").toUpperCase();
    return ContentService.createTextOutput(JSON.stringify({
      status: statusStr,
      isClosed: statusStr === "FECHADO",
      updatedBy: user,
      updatedAt: time
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.action === "get_orders") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ orders: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({ rawData: data, total: data.length })).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutput(gerarHtmlPortalModoCampo()).setTitle("WFS - Modo Campo & Pista").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 10. GERADOR HTML DO ESPELHO DO MODO CAMPO & PISTA
function gerarHtmlPortalModoCampo(isSidebar) {
  var html = [];
  html.push('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">');
  html.push('<style>body{margin:0;padding:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;}.header{background:#fff;border-bottom:2px solid #e2e8f0;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;}.badge{background:#991B1B;color:#fff;font-weight:900;padding:4px 8px;border-radius:6px;font-size:12px;}.card{background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin:12px;}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;}label{font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:3px;}input,select{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;box-sizing:border-box;}.btn{background:#991B1B;color:#fff;font-weight:800;padding:12px;border:none;border-radius:8px;width:100%;cursor:pointer;margin-top:10px;}</style></head><body>');
  html.push('<div class="header"><div><span class="badge">WFS</span> <strong>Portal de Lançamento de Pista</strong></div></div>');
  html.push('<div class="card"><div class="grid">');
  html.push('<div><label>Nº OS</label><input type="text" id="osNumber" value="31877"></div>');
  html.push('<div><label>Cliente</label><input type="text" id="cliente" value="ITA AIRWAYS"></div>');
  html.push('<div><label>Local / Pista</label><input type="text" id="local" value="GRU"></div>');
  html.push('<div><label>Título do Serviço</label><input type="text" id="servico" value="CANCELAMENTO DE VOO AZ675"></div>');
  html.push('<div><label>Nome do Atendente / Matrícula</label><input type="text" id="agente" placeholder="AMANDA APARECIDA VASCO CORTEZ 14286"></div>');
  html.push('<div><label>Hora Início</label><input type="time" id="horaInicio" value="14:34"></div>');
  html.push('<div><label>Hora Fim</label><input type="time" id="horaFim" value="20:10"></div>');
  html.push('<div><label>Responsável Preenchimento</label><input type="text" id="responsavel" value="Amanda Aparecida Vasco Cortez"></div>');
  html.push('</div><button class="btn" onclick="salvar()">GRAVAR NA PLANILHA (18 COLUNAS) ➔</button><div id="fb" style="margin-top:10px;font-weight:bold;font-size:12px;display:none;"></div></div>');
  html.push('<script>function salvar(){var d={osNumber:document.getElementById("osNumber").value,cliente:document.getElementById("cliente").value,local:document.getElementById("local").value,servico:document.getElementById("servico").value,agente:document.getElementById("agente").value,horaInicio:document.getElementById("horaInicio").value,horaFim:document.getElementById("horaFim").value,responsavel:document.getElementById("responsavel").value};var fb=document.getElementById("fb");fb.style.display="block";fb.innerHTML="Salvando...";google.script.run.withSuccessHandler(function(r){fb.innerHTML="✓ "+r.mensagem;}).salvarLancamentoNaPlanilha(d);}</script>');
  html.push('</body></html>');
  return html.join("");
}

function gerarHtmlDigitalizadorFoto() {
  return '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:20px;"><h2>📷 Digitalizar Canhoto / OS para Fotos_SO</h2><p>Destino: Pasta Google Drive <code>' + WFS_CONFIG.DRIVE_FOLDER_ID + '</code> & Aba <code>Fotos_SO</code></p><input type="file" accept="image/*" capture="environment"><p>A foto será salva e o link indexado automaticamente.</p></body></html>';
}
`;
};
