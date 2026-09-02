import { AppUser, CompanyProfile } from '../types';
import { initialUsers, initialCompany } from '../mockData';
import { OFFICIAL_SHEET_ID, getSheetsConfig, fetchSheetSystemStatus, updateSheetSystemStatus } from './sheetsService';

export interface CloudSystemState {
  status: 'ABERTO' | 'FECHADO';
  isMaintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceUpdatedBy?: string;
  maintenanceUpdatedAt?: string;
  masterEmail: string;
  users: AppUser[];
  company?: CompanyProfile;
  lastUpdated: number;
}

const LOCAL_STORAGE_KEY_PREFIX = 'os_digital_app_';

// Dedicated Global Cloud State Object ID (guaranteed cross-browser & cross-device sync on pages.dev)
const CLOUD_STORAGE_OBJECT_ID = 'ff8081819ff5b11001a039dc91721f03';
const CLOUD_STORAGE_API = `https://api.restful-api.dev/objects/${CLOUD_STORAGE_OBJECT_ID}`;

// Fallback Master User definition that is ALWAYS guaranteed to exist
export const MASTER_ADMIN_USER: AppUser = {
  id: 'usr-master-ivo',
  name: 'Ivo (Master Administrador)',
  email: 'ivoaltctrl@gmail.com',
  section: 'Diretoria & Governança',
  roleTitle: 'Administrador Geral & Mestre',
  department: 'Governança & TI',
  password: 'admin',
  privilege: 'administrador',
  privilegeLabel: 'Administrador Master Geral',
  canValidateBilling: true,
  canDeleteOS: true,
  canAccessExecutive: true,
  canAccessSettings: true,
  mustChangePassword: false,
  firstAccess: false,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  role: 'master_ti',
  roleLabel: 'Administrador de TI & Governança',
  phone: '(11) 99999-0000',
  avatarColor: 'bg-slate-900',
};

// Merge users ensuring Master Admin is never lost
export const mergeWithMasterUser = (usersList: AppUser[]): AppUser[] => {
  if (!Array.isArray(usersList) || usersList.length === 0) {
    return initialUsers;
  }
  const hasMaster = usersList.some(
    (u) => u.email?.toLowerCase().trim() === 'ivoaltctrl@gmail.com' || u.id === 'usr-master-ivo'
  );
  if (!hasMaster) {
    return [MASTER_ADMIN_USER, ...usersList];
  }
  return usersList;
};

// Global state cache in memory
let cachedCloudState: CloudSystemState = {
  status: 'ABERTO',
  isMaintenanceMode: false,
  masterEmail: 'ivoaltctrl@gmail.com',
  users: initialUsers,
  company: initialCompany,
  lastUpdated: Date.now(),
};

/**
 * Diagnostic tool to test connection between React Front-End and Back-End Server
 */
export const testFrontBackConnection = async (): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
  timestamp: string;
  data?: any;
}> => {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/system/health', {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });
    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json();
      return {
        connected: true,
        latencyMs,
        message: data.message || 'Conexão Front ↔ Back-End 100% estabelecida e comunicando em tempo real!',
        timestamp: data.timestamp || new Date().toISOString(),
        data,
      };
    }
    return {
      connected: false,
      latencyMs,
      message: `Servidor retornou status HTTP ${res.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      connected: false,
      latencyMs,
      message: err.message || 'Falha ao conectar com o endpoint /api/system/health.',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Fetch the latest system status (ABERTO or FECHADO) before opening the app:
 * 1. Google Sheets "Status" Tab (Highest Authority requested by management)
 * 2. Global Cloud REST API (Multi-device relay for cloudflare / pages.dev)
 * 3. Express Backend (/api/system/status)
 * 4. LocalStorage
 */
export const fetchGlobalSystemState = async (): Promise<CloudSystemState> => {
  // Tier 1: Check Google Sheets "Status" tab directly
  try {
    const sheetStatusRes = await fetchSheetSystemStatus();
    if (sheetStatusRes && sheetStatusRes.source !== 'fallback') {
      const isClosed = sheetStatusRes.status === 'FECHADO' || sheetStatusRes.isMaintenanceMode;
      cachedCloudState.status = isClosed ? 'FECHADO' : 'ABERTO';
      cachedCloudState.isMaintenanceMode = isClosed;
      cachedCloudState.lastUpdated = Date.now();

      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}maintenance_mode`,
        JSON.stringify(isClosed)
      );

      // Also try fetching users if possible
      try {
        const cloudRes = await fetch(CLOUD_STORAGE_API, { cache: 'no-store' });
        if (cloudRes.ok) {
          const result = await cloudRes.json();
          if (result && result.data && Array.isArray(result.data.users) && result.data.users.length > 0) {
            cachedCloudState.users = mergeWithMasterUser(result.data.users);
          }
        }
      } catch {}

      return cachedCloudState;
    }
  } catch (sheetErr) {
    console.warn('Erro ao consultar aba Status da Planilha Google:', sheetErr);
  }

  // Tier 2: Check Global Cloud REST API (works across all browsers and devices)
  try {
    const cloudRes = await fetch(CLOUD_STORAGE_API, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (cloudRes.ok) {
      const result = await cloudRes.json();
      if (result && result.data) {
        const d = result.data;
        const isClosed = d.status === 'FECHADO' || d.isMaintenanceMode === true;
        cachedCloudState.status = isClosed ? 'FECHADO' : 'ABERTO';
        cachedCloudState.isMaintenanceMode = isClosed;
        cachedCloudState.maintenanceUpdatedBy = d.maintenanceUpdatedBy || cachedCloudState.maintenanceUpdatedBy;
        cachedCloudState.maintenanceUpdatedAt = d.maintenanceUpdatedAt || cachedCloudState.maintenanceUpdatedAt;
        
        if (d.users && Array.isArray(d.users) && d.users.length > 0) {
          cachedCloudState.users = mergeWithMasterUser(d.users);
        }
        cachedCloudState.lastUpdated = Date.now();

        // Update local storage
        localStorage.setItem(
          `${LOCAL_STORAGE_KEY_PREFIX}maintenance_mode`,
          JSON.stringify(isClosed)
        );
        return cachedCloudState;
      }
    }
  } catch (err) {
    // Continue to next tier
  }

  // Tier 3: Check Express Backend (when running in fullstack container)
  try {
    const res = await fetch('/api/system/status', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const isClosed = data.status === 'FECHADO' || data.isMaintenanceMode === true;
      cachedCloudState.status = isClosed ? 'FECHADO' : 'ABERTO';
      cachedCloudState.isMaintenanceMode = isClosed;
      if (data.users && Array.isArray(data.users) && data.users.length > 0) {
        cachedCloudState.users = mergeWithMasterUser(data.users);
      }
      cachedCloudState.lastUpdated = Date.now();
      return cachedCloudState;
    }
  } catch {}

  // Tier 4: LocalStorage fallback
  try {
    const localMaint = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}maintenance_mode`);
    if (localMaint !== null) {
      const isClosed = JSON.parse(localMaint) === true;
      cachedCloudState.status = isClosed ? 'FECHADO' : 'ABERTO';
      cachedCloudState.isMaintenanceMode = isClosed;
    }
  } catch {}

  return cachedCloudState;
};

/**
 * Publish global status (ABERTO or FECHADO) and sync across all browsers, devices and the Google Sheet Status tab
 */
export const publishGlobalSystemState = async (
  newState: Partial<CloudSystemState>,
  adminPassword = 'admin'
): Promise<boolean> => {
  const isClosed =
    newState.status === 'FECHADO' ||
    newState.isMaintenanceMode === true;

  const resolvedStatus: 'ABERTO' | 'FECHADO' = isClosed ? 'FECHADO' : 'ABERTO';

  cachedCloudState = {
    ...cachedCloudState,
    ...newState,
    status: resolvedStatus,
    isMaintenanceMode: isClosed,
    lastUpdated: Date.now(),
    maintenanceUpdatedAt: new Date().toISOString(),
  };

  // 1. Sync to LocalStorage immediately
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}maintenance_mode`,
      JSON.stringify(isClosed)
    );
    if (newState.users) {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}users`,
        JSON.stringify(newState.users)
      );
    }
  } catch {}

  // 2. Broadcast to all local tabs in the current browser
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('wfs_system_sync');
      bc.postMessage({
        type: 'GLOBAL_STATE_UPDATE',
        status: resolvedStatus,
        isMaintenanceMode: isClosed,
        state: cachedCloudState,
      });
      bc.close();
    }
  } catch {}

  // 3. Post directly to Google Sheets "Status" Tab via Webhook
  try {
    updateSheetSystemStatus(resolvedStatus, cachedCloudState.maintenanceUpdatedBy || 'ivoaltctrl@gmail.com');
  } catch {}

  // 4. Post to Global Cloud Storage (works across Edge, Chrome, Safari, Cellphones on pages.dev)
  try {
    fetch(CLOUD_STORAGE_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'wfs_status',
        data: {
          status: resolvedStatus,
          isMaintenanceMode: isClosed,
          maintenanceUpdatedBy: cachedCloudState.maintenanceUpdatedBy || 'ivoaltctrl@gmail.com',
          maintenanceUpdatedAt: cachedCloudState.maintenanceUpdatedAt,
          users: cachedCloudState.users,
          lastUpdated: cachedCloudState.lastUpdated,
        },
      }),
    }).catch(() => {});
  } catch {}

  // 5. Post to Express Server (/api/system/maintenance)
  try {
    fetch('/api/system/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: resolvedStatus,
        active: isClosed,
        adminEmail: 'ivoaltctrl@gmail.com',
        adminPassword: adminPassword || 'admin',
      }),
    }).catch(() => {});
  } catch {}

  // 6. Post to Google Sheets Webhook with full payload if configured
  try {
    const cfg = getSheetsConfig();
    if (cfg.webhookUrl && cfg.webhookUrl.startsWith('http')) {
      fetch(cfg.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_system_state',
          status: resolvedStatus,
          isMaintenanceMode: isClosed,
          users: cachedCloudState.users,
          updatedBy: 'ivoaltctrl@gmail.com',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  } catch {}

  return true;
};
