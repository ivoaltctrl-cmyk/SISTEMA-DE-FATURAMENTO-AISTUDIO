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

// Auto Push single order to Google Sheets (DESATIVADO: O ROBO_IA.gs é o único responsável pela escrita na planilha)
export const pushSingleOrderToGoogleSheet = async (
  _order: ServiceOrder
): Promise<boolean> => {
  // O front NÃO grava linhas na planilha. O ROBO_IA.gs é o único responsável por varrer a pasta Fotos_OS e gravar linhas.
  return false;
};

// Update Google Sheets "Status" tab via Backend Proxy (which securely communicates with Google Apps Script using server-side WFS_API_SECRET)
export const updateSheetSystemStatus = async (
  status: 'ABERTO' | 'FECHADO',
  updatedBy = 'ivoaltctrl@gmail.com'
): Promise<{ success: boolean; message: string }> => {
  const cfg = getSheetsConfig();

  try {
    const res = await fetch('/api/system/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status,
        active: status === 'FECHADO',
        adminEmail: updatedBy,
        webhookUrl: cfg.webhookUrl || '',
      }),
    });
    const data = await res.json().catch(() => null);
    return {
      success: res.ok,
      message: data?.message || `Status [${status}] sincronizado pelo servidor com a Planilha Google.`,
    };
  } catch (err: any) {
    console.warn('Erro ao atualizar status via backend:', err);
    return {
      success: false,
      message: `Erro ao atualizar status do sistema: ${err?.message || 'Falha de conexão'}`,
    };
  }
};

// Dispatch real-time update to Google Sheets Apps Script webhook via backend server (protecting API_SECRET)
export const notifySheetOrderUpdate = async (order: ServiceOrder): Promise<void> => {
  const cfg = getSheetsConfig();

  try {
    await fetch('/api/sheets/notify-order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        webhookUrl: cfg.webhookUrl || '',
      }),
    });
  } catch (err) {
    console.warn('Falha ao notificar atualização de status via backend:', err);
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

let cachedSheetsConfig: SheetsSyncConfig | null = null;

export const saveSheetsConfigLocally = (cfg: SheetsSyncConfig) => {
  cachedSheetsConfig = cfg;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wfs_sheets_config_changed', { detail: cfg }));
  }
};

export const getSheetsConfig = (): SheetsSyncConfig => {
  let parsed: any = null;
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch {}
    }
  }

  const base = parsed || cachedSheetsConfig || {};
  const merged: SheetsSyncConfig = {
    webhookUrl: base.webhookUrl || (cachedSheetsConfig ? cachedSheetsConfig.webhookUrl : '') || '',
    autoSync: base.autoSync ?? true,
    sheetId: base.sheetId || OFFICIAL_SHEET_ID,
    sheetUrl: base.sheetUrl || OFFICIAL_SHEET_URL,
    driveFolderUrl: base.driveFolderUrl || OFFICIAL_DRIVE_FOLDER_URL,
    driveFolderId: base.driveFolderId || OFFICIAL_DRIVE_FOLDER_ID,
    photosSheetName: base.photosSheetName || OFFICIAL_PHOTOS_SHEET_NAME,
    ownerEmail: base.ownerEmail || 'ivoaltctrl@gmail.com',
    lastSyncTime: base.lastSyncTime,
    lastSyncStatus: base.lastSyncStatus || 'idle',
    lastSyncCount: base.lastSyncCount || 0,
    syncHistory: base.syncHistory || [],
  };

  cachedSheetsConfig = merged;
  return merged;
};

export const saveSheetsConfig = (cfg: SheetsSyncConfig) => {
  saveSheetsConfigLocally(cfg);

  // Broadcast to other tabs in the same browser
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('wfs_system_sync');
      bc.postMessage({ type: 'SHEETS_CONFIG_UPDATE', config: cfg });
      bc.close();
    }
  } catch {}

  // Push to server so ALL other PCs and devices receive it instantly via SSE / GET /api/config/sheets
  fetch('/api/config/sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  }).catch((err) => {
    console.warn('[SHEETS-SYNC] Falha ao propagar configuração de sheets ao backend:', err);
  });
};

/**
 * Synchronizes the Google Sheets and Webhook configuration from the central server.
 * This guarantees that when one PC configures the Webhook URL or Drive Folder,
 * all other computers fetch and activate it automatically without manual re-entry.
 */
export const syncSheetsConfigFromServer = async (): Promise<SheetsSyncConfig> => {
  const localCfg = getSheetsConfig();

  try {
    const res = await fetch('/api/config/sheets', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.config) {
        const srv = data.config;

        // If server has a valid webhook URL, apply it locally
        if (srv.webhookUrl && typeof srv.webhookUrl === 'string' && srv.webhookUrl.startsWith('http')) {
          const merged: SheetsSyncConfig = {
            ...localCfg,
            webhookUrl: srv.webhookUrl,
            sheetUrl: srv.sheetUrl || localCfg.sheetUrl,
            sheetId: srv.sheetId || localCfg.sheetId,
            driveFolderUrl: srv.driveFolderUrl || localCfg.driveFolderUrl,
            driveFolderId: srv.driveFolderId || localCfg.driveFolderId,
            photosSheetName: srv.photosSheetName || localCfg.photosSheetName,
            ownerEmail: srv.ownerEmail || localCfg.ownerEmail,
            autoSync: srv.autoSync !== undefined ? srv.autoSync : localCfg.autoSync,
          };
          saveSheetsConfigLocally(merged);
          return merged;
        } else if (localCfg.webhookUrl && localCfg.webhookUrl.startsWith('http')) {
          // This local PC has the webhook configured, but the central server doesn't!
          // Push it up immediately to seed the server and broadcast to all other PCs!
          fetch('/api/config/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localCfg),
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[SHEETS-SYNC] Falha ao consultar /api/config/sheets:', err);
  }

  return localCfg;
};

// Initial background sync attempt on client load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncSheetsConfigFromServer().catch(() => {});
  }, 100);
}

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

  if (!base64Image) {
    throw new Error('Nenhuma imagem capturada para envio.');
  }

  const payload = {
    imageBase64: base64Image,
    fileName: targetFileName,
    osNumber: cleanOS,
    clientName: clientName || 'WFS Operacional',
    serviceTitle: serviceTitle || 'Canhoto Enviado ao Drive',
    driveFolderId: folderId,
    webhookUrl: cfg.webhookUrl,
  };

  // 1. Tentar envio seguro pelo Back-End Proxy (/api/drive/upload-canhoto)
  let lastBackendError = '';
  try {
    const localCtrl = new AbortController();
    const localTimeout = setTimeout(() => localCtrl.abort(), 40000);

    const backendRes = await fetch('/api/drive/upload-canhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: localCtrl.signal,
      body: JSON.stringify(payload),
    });
    clearTimeout(localTimeout);

    if (backendRes.ok) {
      const backendResult = await backendRes.json().catch(() => null);
      if (backendResult && backendResult.success) {
        return {
          success: true,
          fileUrl: backendResult.fileUrl || `https://drive.google.com/drive/folders/${folderId}`,
          folderUrl: folderUrl,
          folderId: folderId,
          sheetName: photosSheet,
          fileName: targetFileName,
          message: backendResult.message || `Imagem salva com sucesso na pasta Fotos_SO do Google Drive (ID: ${folderId}).`,
        };
      }
    }

    const errData = await backendRes.json().catch(() => null);
    lastBackendError = errData?.error || `Erro HTTP ${backendRes.status} no envio para o Drive`;
  } catch (backendErr: any) {
    console.warn('Falha na tentativa via proxy /api/drive/upload-canhoto:', backendErr);
    lastBackendError = backendErr.message || 'Falha de conexão com o servidor local';
  }

  // 2. FALLBACK DIRETO AO GOOGLE APPS SCRIPT WEBHOOK:
  // Se o frontend estiver rodando em ambiente estático (ex: Cloudflare Pages / pages.dev,
  // onde rotas /api retornam HTTP 405 Method Not Allowed) ou o backend estiver indisponível,
  // tenta enviar diretamente para o Webhook do Google Apps Script configurado.
  if (cfg.webhookUrl && typeof cfg.webhookUrl === 'string' && cfg.webhookUrl.startsWith('http')) {
    try {
      const directCtrl = new AbortController();
      const directTimeout = setTimeout(() => directCtrl.abort(), 35000);

      // Usar text/plain;charset=utf-8 para evitar preflight OPTIONS que causa HTTP 405 no Apps Script
      const directRes = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: directCtrl.signal,
        body: JSON.stringify({
          action: 'upload_drive_canhoto',
          driveFolderId: folderId,
          fileName: targetFileName,
          imageBase64: base64Image,
          osNumber: cleanOS,
          clientName: clientName || 'WFS Operacional',
          serviceTitle: serviceTitle || 'Canhoto Enviado ao Drive',
        }),
      });
      clearTimeout(directTimeout);

      const directData = await directRes.json().catch(() => null);
      if (directRes.ok && directData && directData.success) {
        return {
          success: true,
          fileUrl: directData.fileUrl || directData.driveUrl || `https://drive.google.com/drive/folders/${folderId}`,
          folderUrl: folderUrl,
          folderId: folderId,
          sheetName: photosSheet,
          fileName: targetFileName,
          message: directData.mensagem || directData.message || `Imagem salva com sucesso na pasta Fotos_SO do Google Drive (ID: ${folderId}).`,
        };
      } else if (directData && (directData.erro || directData.error)) {
        throw new Error(directData.erro || directData.error);
      }
    } catch (directErr: any) {
      console.warn('Fallback direto ao Webhook falhou:', directErr);
      if (directErr.message && !directErr.message.includes('fetch') && !directErr.message.includes('network')) {
        throw directErr;
      }
    }
  }

  throw new Error(lastBackendError || 'Falha ao salvar a imagem no Google Drive. Verifique a URL do Webhook e tente novamente.');
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

  // 3. Try Webhook doGet if configured (tries get_lancamentos first, falls back to get_orders)
  if (cfg.webhookUrl && cfg.webhookUrl.startsWith('http')) {
    try {
      const webhookUrlWithAction = cfg.webhookUrl.includes('?')
        ? `${cfg.webhookUrl}&action=get_lancamentos`
        : `${cfg.webhookUrl}?action=get_lancamentos`;

      const res = await fetch(webhookUrlWithAction);
      if (res.ok) {
        const data = await res.json();
        
        // Handle new get_lancamentos response structure (dados: [...])
        if (data && Array.isArray(data.dados) && data.dados.length > 0) {
          const mappedOrders: ServiceOrder[] = data.dados.map((d: any, idx: number) => {
            const rawOS = String(d.osNumber || `318${idx + 1}`);
            const cleanNum = rawOS.replace(/[^0-9]/g, '');
            const id = `sheet-os-${cleanNum || idx + 1}-${idx}`;
            
            const isFaturada = String(d.status || '').toUpperCase().includes('FATURAD');
            const isPaga = String(d.status || '').toUpperCase().includes('PAG');
            const isCancelada = String(d.status || '').toUpperCase().includes('CANCEL');
            const isConcluida = String(d.status || '').toUpperCase().includes('CONCLU');

            let orderStatus: ServiceOrder['status'] = 'concluida';
            if (isPaga) orderStatus = 'paga';
            else if (isFaturada) orderStatus = 'faturada';
            else if (isCancelada) orderStatus = 'cancelada';
            else if (isConcluida) orderStatus = 'concluida';
            else orderStatus = 'em_andamento';

            return {
              id,
              osNumber: rawOS,
              clientName: d.cliente || 'Cliente WFS',
              clientDocument: d.cnpj || '',
              workLocation: d.local || 'Aeroporto / Pista',
              category: d.categoria || 'Serviços Auxiliares de Transporte Aéreo',
              title: d.tituloServico || 'Atendimento de Pista',
              description: d.equipamentos || d.tituloServico || '',
              totalAmount: Number(d.valorTotal) || 0,
              status: orderStatus,
              technicianName: d.agente || d.responsavel || 'Operador WFS',
              agentName: d.agente || '',
              startTime: d.horaInicio || '',
              endTime: d.horaFim || '',
              quantityHours: d.quantidade || '',
              filledBy: d.responsavel || '',
              clientSignature: d.assinatura ? { signerName: d.assinatura, signedAt: new Date().toISOString() } : undefined,
              photos: d.fotoCanhotoUrl ? [{ id: `photo-${idx}`, url: d.fotoCanhotoUrl, title: 'Canhoto Drive', category: 'canhoto', timestamp: new Date().toISOString() }] : [],
              invoiceNumber: d.numeroFatura && d.numeroFatura !== '-' ? d.numeroFatura : undefined,
              scheduledDate: d.dataHora || new Date().toISOString(),
              createdAt: new Date().toISOString(),
              items: [
                {
                  id: `item-${idx}-1`,
                  name: d.equipamentos || d.tituloServico || 'Serviço de Pista',
                  quantity: 1,
                  unitPrice: Number(d.valorTotal) || 0,
                  totalPrice: Number(d.valorTotal) || 0,
                }
              ],
            };
          });

          return {
            success: true,
            message: `${mappedOrders.length} lançamentos sincronizados via Webhook (Aba Lançamentos Campo)!`,
            orders: mappedOrders,
          };
        }

        // Fallback for legacy get_orders format
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
      const res = await fetch('/api/sheets/sync-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          ordersCount: orders.length,
          webhookUrl: targetUrl.trim(),
        }),
      });

      const resData = await res.json().catch(() => null);

      const updatedCfg: SheetsSyncConfig = {
        ...cfg,
        lastSyncTime: new Date().toISOString(),
        lastSyncStatus: res.ok ? 'success' : 'error',
        lastSyncCount: orders.length,
        syncHistory: [
          {
            id: 'sync-' + Date.now(),
            timestamp: new Date().toISOString(),
            action: 'Envio para Planilha Google Sheets',
            osCount: orders.length,
            status: res.ok ? 'success' : 'error',
            message: res.ok
              ? `${orders.length} ordens gravadas com sucesso no Google Sheets.`
              : `Erro: ${resData?.error || 'Falha na sincronização via servidor'}`,
          },
          ...(cfg.syncHistory || []).slice(0, 9),
        ],
      };
      saveSheetsConfig(updatedCfg);

      if (res.ok) {
        return {
          success: true,
          message: `Planilha Google Sheets atualizada com sucesso (${orders.length} ordens sincronizadas com as 18 colunas).`,
          rowCount: orders.length,
        };
      }
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

// 1. TRIGGER ROBÔ IA VIA WEBHOOK
export const triggerRobotExecution = async (webhookUrl?: string): Promise<{ success: boolean; message: string; details?: any }> => {
  const cfg = getSheetsConfig();
  const targetUrl = webhookUrl || cfg.webhookUrl;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return {
      success: false,
      message: 'URL do Webhook do Google Apps Script não configurada nas preferências.',
    };
  }

  try {
    const urlWithAction = targetUrl.includes('?')
      ? `${targetUrl}&action=exec_robot`
      : `${targetUrl}?action=exec_robot`;

    const res = await fetch(urlWithAction);
    if (!res.ok) {
      return {
        success: false,
        message: `Servidor retornou status HTTP ${res.status}. Verifique se a implantação está ativa como App da Web.`,
      };
    }

    const data = await res.json();
    return {
      success: data.sucesso !== false,
      message: data.mensagem || (data.sucesso ? 'Robô IA executado com sucesso!' : data.erro || 'Falha na execução do robô.'),
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro de comunicação ao disparar robô IA: ' + (err.message || String(err)),
    };
  }
};

// 2. CÓDIGO 1: ROBÔ IA VISION WFS / ORBITAL (ROBO_IA.gs)
export const generateRoboIaScriptCode = (
  companyName: string = 'Orbital Serviços Auxiliares de Transporte Aéreo LTDA',
  ownerEmail: string = 'ivoaltctrl@gmail.com'
) => {
  return `/**
 * ============================================================================
 * CÓDIGO 1: ROBÔ IA VISION WFS / ORBITAL (ROBO_IA.gs)
 * ============================================================================
 * ORDEM DE EXECUÇÃO:
 * 1. Varre a pasta de entrada no Drive e detecta imagem/PDF
 * 2. Extrai dados linha por linha via IA Gemini Vision
 * 3. Grava as 18 colunas na aba "Lançamentos Campo"
 * 4. Move o arquivo para a subpasta "Processados" após gravação confirmada
 * ============================================================================
 * EMPRESA: ${companyName}
 * PROPRIETÁRIO: ${ownerEmail}
 * ============================================================================
 */

var WFS_CONFIG = {
  COMPANY_NAME: "${companyName}",
  PRIMARY_COLOR: "#991B1B", // Vermelho WFS Corporativo
  
  // ID Oficial da Pasta Fotos_OS no Google Drive
  DRIVE_FOLDER_ID: "1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD",
  PROCESSED_SUBFOLDER_NAME: "Processados",
  
  // Cole sua chave Gemini aqui OU configure via Script Properties (GEMINI_API_KEY)
  GEMINI_API_KEY: "",
  
  SHEET_NAME: "Lançamentos Campo",
  MAX_FILES_PER_RUN: 10 // Limite seguro por lote para evitar timeout
};

/**
 * FUNÇÃO PRINCIPAL DO ROBÔ (Pode ser acionada por Gatilho de Tempo - Ex: a cada 5 ou 10 minutos)
 */
function executarRoboLeituraPasta() {
  var logs = [];
  var processadosCount = 0;
  
  try {
    var pastaOrigem = DriveApp.getFolderById(WFS_CONFIG.DRIVE_FOLDER_ID);
    var pastaDestino = obterOuCriarSubpastaProcessados(pastaOrigem);
    
    // Obter arquivos suportados (Imagens e PDFs)
    var arquivos = pastaOrigem.getFiles();
    
    while (arquivos.hasNext() && processadosCount < WFS_CONFIG.MAX_FILES_PER_RUN) {
      var arquivo = arquivos.next();
      var mimeType = arquivo.getMimeType();
      var nomeArquivo = arquivo.getName();
      
      // Filtra apenas imagens e PDFs
      if (mimeType.indexOf("image/") === 0 || mimeType === "application/pdf") {
        Logger.log(">>> [ROBÔ IA] Processando arquivo: " + nomeArquivo);
        
        // 1. Extrai os dados linha a linha com IA Multimodal Vision
        var dadosExtraidos = extrairDadosOSLinhaPorLinhaComGemini(arquivo);
        
        if (dadosExtraidos && dadosExtraidos.linhas && dadosExtraidos.linhas.length > 0) {
          // 2. Grava as 18 colunas oficiais na aba "Lançamentos Campo"
          var gravadas = gravarMultiplasLinhasOS(dadosExtraidos, arquivo.getUrl());
          Logger.log(">>> [ROBÔ IA] Gravadas " + gravadas + " linhas para o arquivo: " + nomeArquivo);
          
          // 3. Move o arquivo para a subpasta \\"Processados\\" após gravação
          arquivo.moveTo(pastaDestino);
          Logger.log(">>> [ROBÔ IA] Arquivo movido com sucesso para a pasta 'Processados'.");
          
          processadosCount++;
          logs.push({ arquivo: nomeArquivo, linhasGravadas: gravadas, status: "OK" });
        } else {
          Logger.log(">>> [ROBÔ IA] Aviso: Não foi possível extrair dados válidos de: " + nomeArquivo);
          logs.push({ arquivo: nomeArquivo, linhasGravadas: 0, status: "FALHA_LEITURA" });
        }
      }
    }
    
    return {
      sucesso: true,
      arquivosProcessados: processadosCount,
      detalhes: logs,
      mensagem: "Robô IA executou com sucesso. Total de arquivos processados: " + processadosCount
    };
    
  } catch (err) {
    Logger.log(">>> [ROBÔ IA] ERRO CRÍTICO: " + err.toString());
    return { sucesso: false, erro: err.toString() };
  }
}

/**
 * Extração de dados estruturados com Gemini Multimodal Vision
 */
function extrairDadosOSLinhaPorLinhaComGemini(arquivo) {
  var apiKey = WFS_CONFIG.GEMINI_API_KEY || PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Chave GEMINI_API_KEY não configurada no WFS_CONFIG ou Script Properties.");
  }

  var base64Data = Utilities.base64Encode(arquivo.getBlob().getBytes());
  var mimeType = arquivo.getMimeType();

  var prompt = [
    "Você é um auditor e especialista em OCR do setor de Ground Handling e Faturamento da WFS / Orbital.",
    "Analise cuidadosamente este canhoto/ordem de serviço e extraia todas as informações linha por linha.",
    "O documento pode conter múltiplos atendimentos/linhas de faturamento.",
    "Retorne ESTRITAMENTE um objeto JSON válido, sem texto introdutório, sem tags markdown, no seguinte formato:",
    "{",
    '  "numeroOS": "string",',
    '  "data": "DD/MM/AAAA",',
    '  "cliente": "string (ex: ITA AIRWAYS, LATAM, AZUL, AMERICAN)",',
    '  "cnpj": "string",',
    '  "local": "string (ex: GRU, GIG, Pista 09L)",',
    '  "categoria": "string",',
    '  "servicoTitulo": "string",',
    '  "responsavel": "string",',
    '  "assinatura": "string",',
    '  "linhas": [',
    "    {",
    '      "equipamentoServico": "string",',
    '      "quantidade": "string ou número",',
    '      "horaInicio": "HH:MM",',
    '      "horaFim": "HH:MM",',
    '      "valor": número,',
    '      "agente": "string",',
    '      "status": "CONCLUÍDA"',
    "    }",
    "  ]",
    "}"
  ].join("\\n");

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

  var payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    // Tenta fallback com modelo gemini-1.5-flash
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error("Erro na API Gemini (" + response.getResponseCode() + "): " + response.getContentText());
    }
  }

  var resJson = JSON.parse(response.getContentText());
  var rawText = resJson.candidates[0].content.parts[0].text;
  
  rawText = rawText.replace(new RegExp("^" + String.fromCharCode(96, 96, 96) + "json\\\\s*", "i"), "")
                   .replace(new RegExp("^" + String.fromCharCode(96, 96, 96) + "\\\\s*", "i"), "")
                   .replace(new RegExp("\\\\s*" + String.fromCharCode(96, 96, 96) + "$"), "").trim();
  
  return JSON.parse(rawText);
}

/**
 * Grava as linhas extraídas nas 18 colunas oficiais da aba "Lançamentos Campo"
 */
function gravarMultiplasLinhasOS(dadosOS, fotoUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME) || configurarAbaLancamentos();
  
  var numOS = dadosOS.numeroOS || ("318" + Math.floor(10 + Math.random() * 90));
  var dataHora = dadosOS.data || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
  var cliente = dadosOS.cliente || "WFS AIRLINES";
  var doc = dadosOS.cnpj || "";
  var local = dadosOS.local || "GRU";
  var categoria = dadosOS.categoria || "Serviços Auxiliares de Transporte Aéreo";
  var tituloServico = dadosOS.servicoTitulo || "Atendimento de Pista / Carga";
  var responsavel = dadosOS.responsavel || "Equipe de Campo WFS";
  var assinatura = dadosOS.assinatura || "Assinado no Campo";
  var linkFoto = fotoUrl || "";
  
  var linhas = dadosOS.linhas || [{}];
  var totalGravado = 0;
  
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i];
    var linhaNova = [
      numOS,                                                 // 1: Número OS
      dataHora,                                              // 2: Data / Hora
      cliente,                                               // 3: Cliente / Empresa
      doc,                                                   // 4: CNPJ / CPF
      local,                                                 // 5: Local / Pista / Terminal
      categoria,                                             // 6: Categoria
      tituloServico,                                         // 7: Título do Serviço
      l.equipamentoServico || tituloServico,                 // 8: Equipamentos / Operadores
      parseFloat(l.valor || dadosOS.valorTotal || 0),        // 9: Valor Total (R$)
      l.status || "CONCLUÍDA",                              // 10: Status Operacional
      l.agente || responsavel,                               // 11: Nome Do Agente ou Serviço Executado
      l.horaInicio || "00:00",                               // 12: Hora Início
      l.horaFim || "00:00",                                  // 13: Hora Fim
      l.quantidade || "1",                                   // 14: Quantidade
      responsavel,                                           // 15: Responsável pelo Preenchimento
      assinatura,                                            // 16: Assinatura do Cliente
      linkFoto,                                              // 17: Foto do Canhoto
      "-"                                                    // 18: Nº da Fatura
    ];
    
    sheet.appendRow(linhaNova);
    var lastRow = sheet.getLastRow();
    
    // Formatações
    sheet.getRange(lastRow, 9).setNumberFormat("R$ #,##0.00");
    sheet.getRange(lastRow, 1, 1, linhaNova.length).setVerticalAlignment("middle");
    
    var statusCell = sheet.getRange(lastRow, 10);
    statusCell.setFontWeight("bold").setHorizontalAlignment("center");
    statusCell.setBackground("#FEF3C7").setFontColor("#92400E");
    
    totalGravado++;
  }
  
  return totalGravado;
}

/**
 * Cria ou obtém a subpasta "Processados" dentro da pasta oficial de Fotos
 */
function obterOuCriarSubpastaProcessados(pastaPai) {
  var subpastas = pastaPai.getFoldersByName(WFS_CONFIG.PROCESSED_SUBFOLDER_NAME);
  if (subpastas.hasNext()) {
    return subpastas.next();
  } else {
    return pastaPai.createFolder(WFS_CONFIG.PROCESSED_SUBFOLDER_NAME);
  }
}

/**
 * Configuração automática da estrutura das 18 Colunas Oficiais
 */
function configurarAbaLancamentos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WFS_CONFIG.SHEET_NAME, 0);
  }
  
  var totalCols = 18;
  
  // Linha 1: Banner Corporativo
  sheet.getRange(1, 1, 1, totalCols).merge();
  sheet.getRange(1, 1).setValue("⚡ SISTEMA WFS | PAINEL DE CONTROLE DE PISTA & OPERAÇÕES DE CAMPO")
       .setBackground("#0F172A")
       .setFontColor("#FFFFFF")
       .setFontWeight("bold")
       .setFontSize(11)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

  // Linha 2: Botões
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
  sheet.getRange(2, 12).setValue("🤖 ROBÔ IA VISION ATIVO")
       .setBackground("#059669").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");

  sheet.setRowHeight(2, 44);

  // Linha 3: Instrução
  sheet.getRange(3, 1, 1, totalCols).merge();
  sheet.getRange(3, 1).setValue("💡 Robô IA Vision monitorando a pasta '1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD' e movendo para 'Processados'.")
       .setBackground("#F8FAFC").setFontColor("#475569").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(3, 24);

  // Linha 4: 18 Cabeçalhos
  var headers = [
    "Número OS", "Data / Hora", "Cliente / Empresa", "CNPJ / CPF", "Local / Pista / Terminal",
    "Categoria", "Título do Serviço", "Equipamentos / Operadores", "Valor Total (R$)", "Status Operacional",
    "Nome Do Agente ou Serviço Executado", "Hora Início", "Hora Fim", "Quantidade", "Responsável pelo Preenchimento",
    "Assinatura do Cliente", "Foto do Canhoto", "Nº da Fatura"
  ];
  
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
       .setBackground(WFS_CONFIG.PRIMARY_COLOR)
       .setFontColor("#FFFFFF")
       .setFontWeight("bold")
       .setFontSize(9)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
       
  sheet.setRowHeight(4, 38);
  sheet.setFrozenRows(4);

  var widths = [110, 135, 180, 140, 160, 170, 200, 200, 120, 150, 240, 95, 95, 90, 180, 160, 150, 110];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
  
  return sheet;
}
`;
};

// 3. CÓDIGO 2: WEBHOOK.GS: WFS / ORBITAL - REQUISIÇÕES WEB DO SISTEMA (doPost e doGet)
export const generateWebhookScriptCode = (
  companyName: string = 'Orbital Serviços Auxiliares de Transporte Aéreo LTDA',
  ownerEmail: string = 'ivoaltctrl@gmail.com'
) => {
  return `/**
 * ============================================================================
 * CÓDIGO 2: WEBHOOK.GS: WFS / ORBITAL - REQUISIÇÕES WEB DO SISTEMA (doPost e doGet)
 * ============================================================================
 * - Ligação completa entre Front-end e Back-end
 * - Leitura direta da planilha (get_lancamentos) para espelhar dados reais
 * - Manipulação de requisições POST e GET
 * - Upload de fotos diretas e gravação de linhas
 * - Atualização de Status da OS / Fatura (update_order_status)
 * - Gestão de Status (ABERTO / FECHADO) e Usuários com SHA-256
 * ============================================================================
 * EMPRESA: ${companyName}
 * PROPRIETÁRIO: ${ownerEmail}
 * ============================================================================
 * 🔒 SEGURANÇA (SCRIPT PROPERTIES):
 * O segredo de autenticação deve ser configurado nas Propriedades do Script:
 * No editor do Google Apps Script:
 * 1. Clique em 'Configurações do Projeto' (ícone de engrenagem no menu lateral)
 * 2. Role até 'Propriedades do script' e clique em 'Adicionar propriedade'
 * 3. Propriedade: API_SECRET
 * 4. Valor: o mesmo token configurado no servidor (WFS_API_SECRET)
 * ============================================================================
 */

var WFS_CONFIG = {
  COMPANY_NAME: "${companyName}",
  PRIMARY_COLOR: "#991B1B",
  DARK_COLOR: "#0F172A",
  OWNER_EMAIL: "${ownerEmail}",
  // Obtido com segurança do cofre do Google Apps Script (Script Properties)
  API_SECRET: PropertiesService.getScriptProperties().getProperty("API_SECRET") || "COLE_AQUI_A_API_SECRET_DAS_SCRIPT_PROPERTIES",
  DRIVE_FOLDER_ID: "1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD",
  PROCESSED_SUBFOLDER_NAME: "Processados",
  SHEET_NAME: "Lançamentos Campo",
  STATUS_SHEET_NAME: "Status",
  USERS_SHEET_NAME: "Usuários"
};

/**
 * 1. REQUISIÇÕES GET (doGet)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

  // 1.1 Espelhamento dos Lançamentos da Planilha para o Front-end
  if (action === "get_lancamentos" || action === "get_orders" || action === "get_data") {
    return jsonResponse(obterLancamentosPlanilha());
  }

  // 1.2 Obter Status do Sistema (ABERTO / FECHADO)
  if (action === "get_status" || action === "get_system_status") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(WFS_CONFIG.STATUS_SHEET_NAME) || configurarAbaStatus();
    var statusVal = String(sheet.getRange("A2").getValue() || "ABERTO").toUpperCase();
    var dataHora = sheet.getRange("B2").getValue();
    var responsavel = sheet.getRange("C2").getValue();

    return jsonResponse({
      success: true,
      status: statusVal,
      isClosed: statusVal === "FECHADO",
      isMaintenanceMode: statusVal === "FECHADO",
      updatedAt: dataHora,
      updatedBy: responsavel
    });
  }

  // 1.3 Obter Usuários com Acesso (Apenas perfis e nomes, sem expor hash de senha)
  if (action === "get_users") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(WFS_CONFIG.USERS_SHEET_NAME) || configurarAbaUsuarios();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, users: [] });

    var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    var users = [];

    for (var i = 0; i < values.length; i++) {
      if (values[i][0]) {
        users.push({
          nome: String(values[i][0]),
          email: String(values[i][1]),
          perfil: String(values[i][2]),
          ativo: true
        });
      }
    }
    return jsonResponse({ success: true, users: users });
  }

  // 1.4 Disparo manual do robô via Front-end (se função estiver disponível no projeto)
  if (action === "exec_robot") {
    if (typeof executarRoboLeituraPasta === "function") {
      return jsonResponse(executarRoboLeituraPasta());
    } else {
      return jsonResponse({
        sucesso: false,
        mensagem: "Função executarRoboLeituraPasta não encontrada. Certifique-se de que o arquivo ROBO_IA.gs está no mesmo projeto Apps Script."
      });
    }
  }

  return HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:30px;text-align:center;">' +
      '<h2 style="color:#991B1B;">⚡ WFS / Orbital - Webhook Online</h2>' +
      '<p>Endpoint ativo para sincronização de Lançamentos Campo, Status e Usuários.</p>' +
      '<p>Ações suportadas: <code>?action=get_lancamentos</code>, <code>?action=get_status</code>, <code>?action=get_users</code>, <code>?action=exec_robot</code></p>' +
    '</div>'
  ).setTitle("WFS Webhook API");
}

/**
 * 2. LEITURA DOS DADOS DAS 18 COLUNAS DA ABA \\"Lançamentos Campo\\"
 */
function obterLancamentosPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    return { success: false, total: 0, dados: [], mensagem: "Aba não encontrada." };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 5) {
    return { success: true, total: 0, dados: [], mensagem: "Nenhum lançamento gravado ainda." };
  }

  var range = sheet.getRange(5, 1, lastRow - 4, 18);
  var values = range.getValues();
  var dados = [];

  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (r[0] || r[2]) { // Tem Número OS ou Cliente
      var dataHoraVal = r[1];
      var dataHoraFormatada = "";
      if (dataHoraVal instanceof Date) {
        dataHoraFormatada = Utilities.formatDate(dataHoraVal, "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
      } else {
        dataHoraFormatada = String(dataHoraVal || "");
      }

      dados.push({
        linhaPlanilha: i + 5,
        osNumber: String(r[0] || ""),
        dataHora: dataHoraFormatada,
        cliente: String(r[2] || ""),
        cnpj: String(r[3] || ""),
        local: String(r[4] || ""),
        categoria: String(r[5] || ""),
        tituloServico: String(r[6] || ""),
        equipamentos: String(r[7] || ""),
        valorTotal: Number(r[8]) || 0,
        status: String(r[9] || ""),
        agente: String(r[10] || ""),
        horaInicio: String(r[11] || ""),
        horaFim: String(r[12] || ""),
        quantidade: String(r[13] || ""),
        responsavel: String(r[14] || ""),
        assinatura: String(r[15] || ""),
        fotoCanhotoUrl: String(r[16] || ""),
        numeroFatura: String(r[17] || "")
      });
    }
  }

  return {
    success: true,
    total: dados.length,
    dados: dados
  };
}

/**
 * 3. REQUISIÇÕES POST (doPost)
 */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    var action = payload.action || "";

    // 0. VERIFICAÇÃO DE SEGURANÇA: Token de autorização compartilhado (WFS_CONFIG.API_SECRET)
    // Impede que chamadas diretas não autorizadas contra a URL do Webhook alterem dados na planilha
    var tokenRecebido = String(payload.apiToken || payload.apiSecret || payload.token || "").trim();
    if (WFS_CONFIG.API_SECRET && tokenRecebido !== WFS_CONFIG.API_SECRET) {
      return jsonResponse({
        success: false,
        erro: "Acesso negado: Token de autorização inválido ou ausente. Requisição direta não permitida.",
        error: "Acesso negado: Token de autorização inválido ou ausente.",
        message: "Acesso negado: Token de autorização inválido ou ausente."
      });
    }

    // 3.1 Atualizar Status do Sistema (ABERTO / FECHADO)
    if (action === "update_system_status" || action === "set_status" || payload.status) {
      var statusNovo = (payload.status || "ABERTO").toUpperCase();
      var resp = payload.updatedBy || WFS_CONFIG.OWNER_EMAIL;
      return jsonResponse(atualizarStatusPlanilha(statusNovo, resp));
    }

    // 3.2 Salvar Foto no Drive (Apenas upload físico do arquivo na pasta de entrada do Robô)
    if (action === "upload_drive_canhoto" || action === "upload_photo" || action === "save_scan") {
      var resFoto = salvarFotoNoDriveEProcessarLinhas(payload);
      return jsonResponse(resFoto);
    }

    // 3.3 Gravação de Ordem Direta (DESATIVADO: O ROBO_IA.gs é o único responsável pela escrita das 18 colunas)
    if (action === "append_order" || action === "create_order" || action === "sync_order") {
      var msgAviso = "Gravação direta via front desativada. O ROBO_IA.gs é o único responsável por varrer a pasta Fotos_OS e gravar linhas.";
      return jsonResponse({
        success: false,
        aviso: msgAviso,
        message: msgAviso,
        erro: msgAviso,
        error: msgAviso
      });
    }

    // 3.4 Atualização de Status de OS e Nº da Fatura (Faturamento)
    if (action === "update_order_status") {
      var resUpdate = atualizarStatusDaOrdemNaPlanilha(payload);
      return jsonResponse(resUpdate);
    }

    // 3.5 Alteração de Senha do Próprio Usuário
    if (action === "user_change_password") {
      var pwd = payload.passwordHash || payload.newPassword || "";
      return jsonResponse(alterarSenhaUsuarioPlanilha(payload.email, payload.currentPassword, pwd, payload));
    }

    // 3.6 Reset de Senha pelo Administrador
    if (action === "admin_reset_user_password") {
      var pwd2 = payload.passwordHash || payload.newPassword || "";
      return jsonResponse(resetarSenhaUsuarioPlanilha(payload.adminEmail, payload.targetEmail, pwd2));
    }

    // 3.7 Criação ou Sincronização de Usuário na Planilha
    if (action === "create_user" || action === "sync_user") {
      return jsonResponse(cadastrarUsuarioPlanilha(payload));
    }

    return jsonResponse({ success: false, erro: "Ação não reconhecida: " + action });

  } catch (err) {
    return jsonResponse({ success: false, erro: err.toString() });
  }
}

/**
 * 4. ATUALIZADOR DIRETO DE STATUS OPERACIONAL E FATURA NA PLANILHA
 */
function atualizarStatusDaOrdemNaPlanilha(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME) || ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 5) {
    var emptyMsg = "Nenhum lançamento encontrado na planilha.";
    return { success: false, erro: emptyMsg, error: emptyMsg, message: emptyMsg };
  }

  var rawStatus = String(data.status || "").toLowerCase().trim();
  var statusMap = {
    "faturada": "FATURADA",
    "paga": "PAGA",
    "cancelada": "CANCELADA",
    "concluida": "CONCLUÍDA",
    "concluída": "CONCLUÍDA",
    "em_andamento": "EM ANDAMENTO",
    "aguardando_validacao": "AGUARDANDO VALIDAÇÃO",
    "aguardando_validação": "AGUARDANDO VALIDAÇÃO",
    "orcamento": "ORÇAMENTO",
    "orçamento": "ORÇAMENTO",
    "agendada": "AGENDADA"
  };

  var statusFormatado = statusMap[rawStatus];
  if (!statusFormatado) {
    var erroInvalido = "Status inválido recebido: '" + (data.status || "") + "'.";
    return {
      success: false,
      erro: erroInvalido,
      error: erroInvalido,
      message: erroInvalido
    };
  }

  var targetNum = String(data.osNumber || "").replace(/[^0-9]/g, "");
  var values = sheet.getRange(5, 1, lastRow - 4, 18).getValues();

  var found = false;
  var rowFound = -1;

  for (var i = 0; i < values.length; i++) {
    var rowNum = String(values[i][0] || "").replace(/[^0-9]/g, "");
    if (rowNum === targetNum && targetNum !== "") {
      var r = i + 5;
      rowFound = r;

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

  if (!found) {
    var notFoundMsg = "OS " + (data.osNumber || "") + " não encontrada na planilha.";
    return {
      success: false,
      erro: notFoundMsg,
      error: notFoundMsg,
      message: notFoundMsg
    };
  }

  var successMsg = "OS " + data.osNumber + " atualizada para " + statusFormatado + " com sucesso na linha " + rowFound + " da Planilha Google!";
  return {
    success: true,
    row: rowFound,
    osNumber: data.osNumber,
    status: statusFormatado,
    mensagem: successMsg,
    message: successMsg
  };
}

/**
 * 5. SALVAR FOTO NO DRIVE E GRAVAR LINHAS
 */
/**
 * 5. SALVAR FOTO CRUA NO GOOGLE DRIVE (PASTA DE ENTRADA DO ROBÔ)
 * IMPORTANTE: O front NÃO grava linhas na planilha.
 * Quem lê o arquivo e grava as 18 colunas é única e exclusivamente o ROBO_IA.gs.
 */
function salvarFotoNoDriveEProcessarLinhas(payload) {
  try {
    if (!payload.imageBase64) {
      return { success: false, erro: "Imagem não recebida no payload (imageBase64 ausente)." };
    }

    var base64Data = payload.imageBase64;
    var commaIndex = base64Data.indexOf(",");
    if (commaIndex !== -1 && base64Data.substring(0, commaIndex).indexOf("base64") !== -1) {
      base64Data = base64Data.substring(commaIndex + 1);
    }
    base64Data = base64Data.replace(/\\s/g, "");

    var decoded = Utilities.base64Decode(base64Data);
    var nome = payload.fileName || ("Canhoto_" + (payload.osNumber || Date.now()) + ".jpg");
    var blob = Utilities.newBlob(decoded, "image/jpeg", nome);

    var targetFolderId = payload.driveFolderId || WFS_CONFIG.DRIVE_FOLDER_ID;
    var pasta = DriveApp.getFolderById(targetFolderId);
    var arquivo = pasta.createFile(blob);
    var driveUrl = arquivo.getUrl();
    var fileId = arquivo.getId();

    return {
      success: true,
      fileUrl: driveUrl,
      driveFileUrl: driveUrl,
      driveUrl: driveUrl,
      fileId: fileId,
      fileName: nome,
      folderId: targetFolderId,
      mensagem: "Foto salva com sucesso na pasta de entrada do Drive! O Robô IA Vision iniciará a leitura.",
      message: "Foto salva com sucesso na pasta de entrada do Drive! O Robô IA Vision iniciará a leitura."
    };
  } catch (err) {
    return {
      success: false,
      erro: "Erro ao salvar foto no Drive: " + err.toString(),
      error: "Erro ao salvar foto no Drive: " + err.toString(),
      message: "Erro ao salvar foto no Drive: " + err.toString()
    };
  }
}

/**
 * 6. GRAVAR LINHAS NA PLANILHA
 */
function gravarMultiplasLinhasOS(dadosOS, fotoUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME) || configurarAbaLancamentos();
  
  var numOS = dadosOS.numeroOS || dadosOS.osNumber || ("318" + Math.floor(10 + Math.random() * 90));
  var dataHora = dadosOS.data || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
  var cliente = dadosOS.cliente || dadosOS.clientName || "WFS AIRLINES";
  var doc = dadosOS.cnpj || dadosOS.clientDocument || "";
  var local = dadosOS.local || dadosOS.workLocation || "GRU";
  var categoria = dadosOS.categoria || dadosOS.category || "Serviços Auxiliares de Transporte Aéreo";
  var tituloServico = dadosOS.servicoTitulo || dadosOS.title || "Atendimento de Pista / Carga";
  var responsavel = dadosOS.responsavel || dadosOS.filledBy || "Equipe de Campo WFS";
  var assinatura = dadosOS.assinatura || "Assinado no Campo";
  var linkFoto = fotoUrl || dadosOS.fotoUrl || "";
  
  var linhas = dadosOS.linhas || dadosOS.items || [{}];
  var totalGravado = 0;
  
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i];
    var linhaNova = [
      numOS,
      dataHora,
      cliente,
      doc,
      local,
      categoria,
      tituloServico,
      l.equipamentoServico || l.name || tituloServico,
      parseFloat(l.valor || l.totalPrice || dadosOS.valorTotal || dadosOS.totalAmount || 0),
      l.status || "CONCLUÍDA",
      l.agente || dadosOS.agentName || responsavel,
      l.horaInicio || dadosOS.startTime || "00:00",
      l.horaFim || dadosOS.endTime || "00:00",
      l.quantidade || l.quantity || "1",
      responsavel,
      assinatura,
      linkFoto,
      dadosOS.invoiceNumber || "-"
    ];
    
    sheet.appendRow(linhaNova);
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9).setNumberFormat("R$ #,##0.00");
    sheet.getRange(lastRow, 1, 1, linhaNova.length).setVerticalAlignment("middle");
    
    var statusCell = sheet.getRange(lastRow, 10);
    statusCell.setFontWeight("bold").setHorizontalAlignment("center");
    statusCell.setBackground("#FEF3C7").setFontColor("#92400E");
    
    totalGravado++;
  }
  
  return totalGravado;
}

/**
 * 7. GERENCIAMENTO DE STATUS (ABERTO / FECHADO)
 */
function atualizarStatusPlanilha(novoStatus, responsavel) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.STATUS_SHEET_NAME) || configurarAbaStatus();
  var statusUpper = (novoStatus || "ABERTO").toUpperCase();
  var timestamp = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
  var user = responsavel || WFS_CONFIG.OWNER_EMAIL;

  sheet.getRange("A2").setValue(statusUpper);
  sheet.getRange("B2").setValue(timestamp);
  sheet.getRange("C2").setValue(user);
  sheet.getRange("D2").setValue(statusUpper === "FECHADO" ? "Sistema temporariamente fechado pela Gestão." : "Sistema operacional e aberto.");

  var cell = sheet.getRange("A2");
  if (statusUpper === "FECHADO") {
    cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  } else {
    cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
  }

  return { success: true, status: statusUpper, timestamp: timestamp, user: user };
}

function configurarAbaStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.STATUS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WFS_CONFIG.STATUS_SHEET_NAME);
  }
  sheet.getRange("A1:D1").setValues([["STATUS_SISTEMA", "DATA_HORA_ATUALIZACAO", "ATUALIZADO_POR", "MENSAGEM_AVISO"]])
       .setBackground(WFS_CONFIG.DARK_COLOR).setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
  if (!sheet.getRange("A2").getValue()) {
    sheet.getRange("A2").setValue("ABERTO");
    sheet.getRange("B2").setValue(Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss"));
    sheet.getRange("C2").setValue(WFS_CONFIG.OWNER_EMAIL);
    sheet.getRange("D2").setValue("Sistema operacional e aberto.");
  }
  return sheet;
}

/**
 * 8. GESTÃO DE USUÁRIOS COM SENHAS CRIPTOGRAFADAS (SHA-256)
 */
function configurarAbaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Usuários") || ss.getSheetByName("Usuarios") || ss.getSheetByName(WFS_CONFIG.USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet("Usuários");
  }
  if (sheet.getLastRow() < 1) {
    sheet.getRange("A1:G1").setValues([["NOME", "EMAIL", "CARGO / SETOR", "SENHA_HASH", "PERFIL", "PRIMEIRO_ACESSO", "ATIVO"]])
         .setBackground(WFS_CONFIG.DARK_COLOR).setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
  }
  return sheet;
}

function gerarHashSenha(senhaTexto) {
  if (!senhaTexto) return "";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senhaTexto, Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

function alterarSenhaUsuarioPlanilha(email, senhaAtual, novaSenha, opt) {
  if (!email || !novaSenha) {
    var errReq = "Preencha o e-mail e a nova senha.";
    return { success: false, erro: errReq, error: errReq, message: errReq };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Usuários") || ss.getSheetByName("Usuarios") || ss.getSheetByName(WFS_CONFIG.USERS_SHEET_NAME) || configurarAbaUsuarios();
  var lastRow = sheet.getLastRow();

  // Identificação dinâmica de colunas a partir do cabeçalho na linha 1
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 7)).getValues()[0];
  var colEmail = -1;
  var colSenha = -1;
  var colPrimeiro = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toUpperCase().trim();
    if (h === "EMAIL" || h === "E-MAIL") colEmail = c + 1;
    if (h.indexOf("SENHA") !== -1 || h.indexOf("HASH") !== -1) colSenha = c + 1;
    if (h.indexOf("PRIMEIRO") !== -1) colPrimeiro = c + 1;
  }

  if (colEmail === -1) colEmail = 2; // Coluna B
  if (colSenha === -1) colSenha = 4; // Coluna D
  if (colPrimeiro === -1 && headers.length >= 6) colPrimeiro = 6; // Coluna F

  var novoHash = (novaSenha.length === 64 && /^[0-9a-fA-F]+$/.test(novaSenha)) ? novaSenha : gerarHashSenha(novaSenha);

  if (lastRow >= 2) {
    var numCols = Math.max(sheet.getLastColumn(), 7);
    var values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    for (var i = 0; i < values.length; i++) {
      var userEmail = String(values[i][colEmail - 1] || "").toLowerCase().trim();
      if (userEmail === email.toLowerCase().trim()) {
        var rowNum = i + 2;
        var savedHash = String(values[i][colSenha - 1] || "").trim().toLowerCase();
        var primeiroAcessoVal = colPrimeiro !== -1 ? String(values[i][colPrimeiro - 1] || "").toUpperCase().trim() : "";
        var isPrimeiroAcesso = (primeiroAcessoVal === "SIM" || primeiroAcessoVal === "TRUE");

        // VALIDAÇÃO DA SENHA ATUAL:
        // Se a senha já estiver salva na planilha, é estritamente obrigatório que a senha atual informada coincida
        if (savedHash) {
          var cleanAtual = String(senhaAtual || "").trim();
          var hashAtual = gerarHashSenha(cleanAtual).toLowerCase();
          var confere = (hashAtual === savedHash) || (cleanAtual.toLowerCase() === savedHash);

          // No caso de primeiro acesso, aceita também se a senha digitada for a temporária padrão
          if (!confere && isPrimeiroAcesso) {
            confere = (cleanAtual === "123456" || cleanAtual === "admin" || cleanAtual === "123" || hashAtual === gerarHashSenha("123456") || hashAtual === gerarHashSenha("admin"));
          }

          if (!confere) {
            var errPass = "A senha atual fornecida está incorreta.";
            return { success: false, erro: errPass, error: errPass, message: errPass };
          }
        }

        sheet.getRange(rowNum, colSenha).setValue(novoHash);
        if (colPrimeiro !== -1) {
          sheet.getRange(rowNum, colPrimeiro).setValue("NÃO");
        }
        var msgOk = "Senha do usuário " + email + " atualizada com sucesso na planilha (linha " + rowNum + ")!";
        return { success: true, mensagem: msgOk, message: msgOk, row: rowNum };
      }
    }
  }

  // Se o usuário não existia na planilha, cadastra diretamente
  var isMaster = email.toLowerCase().trim() === String(WFS_CONFIG.OWNER_EMAIL || "").toLowerCase().trim();
  var novaLinha = [
    isMaster ? "Ivo (Master Admin)" : email.split("@")[0],
    email.toLowerCase().trim(),
    isMaster ? "Diretoria / TI" : "Operações GSE",
    novoHash,
    isMaster ? "ADMINISTRADOR" : "OPERADOR",
    "NÃO",
    "SIM"
  ];
  sheet.appendRow(novaLinha);
  var appendRow = sheet.getLastRow();
  var msgAppend = "Usuário " + email + " cadastrado e senha gravada com sucesso na planilha!";
  return { success: true, mensagem: msgAppend, message: msgAppend, row: appendRow };
}

function resetarSenhaUsuarioPlanilha(adminEmail, targetEmail, novaSenha) {
  if (!targetEmail || !novaSenha) {
    var errReq2 = "Preencha o e-mail do usuário e a nova senha temporária.";
    return { success: false, erro: errReq2, error: errReq2, message: errReq2 };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Usuários") || ss.getSheetByName("Usuarios") || ss.getSheetByName(WFS_CONFIG.USERS_SHEET_NAME) || configurarAbaUsuarios();
  var lastRow = sheet.getLastRow();

  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 7)).getValues()[0];
  var colEmail = -1;
  var colPerfil = -1;
  var colSenha = -1;
  var colPrimeiro = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toUpperCase().trim();
    if (h === "EMAIL" || h === "E-MAIL") colEmail = c + 1;
    if (h.indexOf("PERFIL") !== -1 || h.indexOf("PRIVIL") !== -1) colPerfil = c + 1;
    if (h.indexOf("SENHA") !== -1 || h.indexOf("HASH") !== -1) colSenha = c + 1;
    if (h.indexOf("PRIMEIRO") !== -1) colPrimeiro = c + 1;
  }

  if (colEmail === -1) colEmail = 2; // Coluna B
  if (colPerfil === -1) colPerfil = 5; // Coluna E
  if (colSenha === -1) colSenha = 4; // Coluna D
  if (colPrimeiro === -1 && headers.length >= 6) colPrimeiro = 6; // Coluna F

  // VERIFICAÇÃO DE AUTORIZAÇÃO DO ADMINISTRADOR SOLICITANTE
  var cleanAdminEmail = String(adminEmail || "").toLowerCase().trim();
  var isOwner = cleanAdminEmail === String(WFS_CONFIG.OWNER_EMAIL || "").toLowerCase().trim();
  var isAdminAuthorized = isOwner;

  if (lastRow >= 2 && !isAdminAuthorized) {
    var numCols = Math.max(sheet.getLastColumn(), 7);
    var checkValues = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    for (var k = 0; k < checkValues.length; k++) {
      var uEmail = String(checkValues[k][colEmail - 1] || "").toLowerCase().trim();
      if (uEmail === cleanAdminEmail) {
        var uPerfil = String(checkValues[k][colPerfil - 1] || "").toUpperCase();
        if (uPerfil.indexOf("ADMIN") !== -1 || uPerfil.indexOf("MASTER") !== -1 || uPerfil.indexOf("SUPERVISOR") !== -1) {
          isAdminAuthorized = true;
        }
        break;
      }
    }
  }

  if (!isAdminAuthorized) {
    var errUnauth = "Não autorizado: Apenas administradores ou supervisores podem redefinir senhas de usuários.";
    return { success: false, erro: errUnauth, error: errUnauth, message: errUnauth };
  }

  var novoHash = (novaSenha.length === 64 && /^[0-9a-fA-F]+$/.test(novaSenha)) ? novaSenha : gerarHashSenha(novaSenha);

  if (lastRow >= 2) {
    var numCols = Math.max(sheet.getLastColumn(), 7);
    var values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    for (var i = 0; i < values.length; i++) {
      var userEmail = String(values[i][colEmail - 1] || "").toLowerCase().trim();
      if (userEmail === targetEmail.toLowerCase().trim()) {
        var rowNum = i + 2;
        sheet.getRange(rowNum, colSenha).setValue(novoHash);
        if (colPrimeiro !== -1) {
          sheet.getRange(rowNum, colPrimeiro).setValue("SIM");
        }
        var msgOk2 = "Senha de " + targetEmail + " resetada para acesso temporário (linha " + rowNum + ")!";
        return { success: true, mensagem: msgOk2, message: msgOk2, row: rowNum };
      }
    }
  }

  // Se não existia, cria com PRIMEIRO_ACESSO = SIM
  var novaLinha = [
    targetEmail.split("@")[0],
    targetEmail.toLowerCase().trim(),
    "Operações GSE",
    novoHash,
    "OPERADOR",
    "SIM",
    "SIM"
  ];
  sheet.appendRow(novaLinha);
  var appendRow = sheet.getLastRow();
  var msgAppend2 = "Usuário " + targetEmail + " cadastrado com reset de senha temporária!";
  return { success: true, mensagem: msgAppend2, message: msgAppend2, row: appendRow };
}

function cadastrarUsuarioPlanilha(payload) {
  try {
    if (!payload.email) {
      return { success: false, erro: "E-mail é obrigatório." };
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Usuários") || ss.getSheetByName("Usuarios") || ss.getSheetByName(WFS_CONFIG.USERS_SHEET_NAME) || configurarAbaUsuarios();
    
    var emailLimpo = String(payload.email || "").toLowerCase().trim();
    var lastRow = sheet.getLastRow();
    
    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][1] || "").toLowerCase().trim() === emailLimpo) {
          return { success: true, mensagem: "Usuário já existe na planilha.", row: i + 2 };
        }
      }
    }

    var hash = payload.passwordHash || (payload.password ? gerarHashSenha(payload.password) : gerarHashSenha("123456"));
    var novaLinha = [
      payload.name || emailLimpo.split("@")[0],
      emailLimpo,
      payload.cargo || payload.section || "Operações GSE",
      hash,
      (payload.perfil || "OPERADOR").toUpperCase(),
      payload.primeiroAcesso || "SIM",
      payload.ativo || "SIM"
    ];
    sheet.appendRow(novaLinha);
    var rowInserida = sheet.getLastRow();
    return {
      success: true,
      mensagem: "Usuário " + emailLimpo + " salvo com sucesso na aba Usuários!",
      row: rowInserida
    };
  } catch (err) {
    return { success: false, erro: err.toString() };
  }
}

/**
 * 9. CONFIGURAÇÃO DA ESTRUTURA VISUAL E 18 COLUNAS (Lançamentos Campo)
 */
function configurarAbaLancamentos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WFS_CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WFS_CONFIG.SHEET_NAME, 0);
  }
  
  var totalCols = 18;
  sheet.getRange(1, 1, 1, totalCols).merge();
  sheet.getRange(1, 1).setValue("⚡ SISTEMA WFS | PAINEL DE CONTROLE DE PISTA & OPERAÇÕES DE CAMPO")
       .setBackground(WFS_CONFIG.DARK_COLOR)
       .setFontColor("#FFFFFF")
       .setFontWeight("bold")
       .setFontSize(11)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

  var headers = [
    "Número OS", "Data / Hora", "Cliente / Empresa", "CNPJ / CPF", "Local / Pista / Terminal",
    "Categoria", "Título do Serviço", "Equipamentos / Operadores", "Valor Total (R$)", "Status Operacional",
    "Nome Do Agente ou Serviço Executado", "Hora Início", "Hora Fim", "Quantidade", "Responsável pelo Preenchimento",
    "Assinatura do Cliente", "Foto do Canhoto", "Nº da Fatura"
  ];
  
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
       .setBackground(WFS_CONFIG.PRIMARY_COLOR)
       .setFontColor("#FFFFFF")
       .setFontWeight("bold")
       .setFontSize(9)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
       
  sheet.setRowHeight(4, 38);
  sheet.setFrozenRows(4);

  var widths = [110, 135, 180, 140, 160, 170, 200, 200, 120, 150, 240, 95, 95, 90, 180, 160, 150, 110];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
  
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;
};

// 4. Default / Combined Script Generator
export const generateGoogleAppsScriptCode = (
  appUrl: string = typeof window !== 'undefined' ? window.location.origin : '',
  companyName: string = 'Orbital Serviços Auxiliares de Transporte Aéreo LTDA',
  ownerEmail: string = 'ivoaltctrl@gmail.com'
) => {
  return generateWebhookScriptCode(companyName, ownerEmail);
};

