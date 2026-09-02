import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AppUser,
  Client,
  CompanyProfile,
  Equipment,
  Invoice,
  LaborService,
  OSAuditLog,
  PhotoEvidence,
  ServiceOrder,
  SignatureData
} from '../types';
import {
  initialClients,
  initialCompany,
  initialEquipments,
  initialInvoices,
  initialLaborServices,
  initialOrders,
  initialUsers
} from '../mockData';
import {
  calculateDuration,
  fetchOrdersFromGoogleSheet,
  getSheetsConfig,
  parseCSVToRows,
  parseSheetRowsToOrders,
  saveSheetsConfig,
  syncOrdersWithGoogleSheets,
  pushSingleOrderToGoogleSheet
} from '../services/sheetsService';
import {
  mergeWithMasterUser,
  MASTER_ADMIN_USER,
  fetchGlobalSystemState,
  publishGlobalSystemState,
} from '../services/cloudSyncService';
import { ordensApi, usersApi } from '../services/api';

export interface AgentMetric {
  name: string;
  badge?: string;
  count: number;
  totalMinutes: number;
  totalHoursFormatted: string;
  uniqueClients: string[];
  lastService: string;
}

interface AppContextType {
  company: CompanyProfile;
  setCompany: (c: CompanyProfile) => void;
  clients: Client[];
  equipments: Equipment[];
  laborServices: LaborService[];
  orders: ServiceOrder[];
  invoices: Invoice[];
  
  // Google Sheets Sincronização & Importação em Tempo Real (Automática & Bidirecional)
  syncWithGoogleSheet: (sheetUrlOrId?: string, isBackground?: boolean) => Promise<{ success: boolean; message: string; count: number }>;
  importRawSheetData: (rawText: string) => { success: boolean; message: string; count: number };
  pushOrdersToGoogleSheet: (webhookUrl?: string) => Promise<{ success: boolean; message: string }>;
  isSyncingSheets: boolean;
  lastAutoSyncTime: Date | null;
  isAutoSyncActive: boolean;
  
  // User Management & Active Operator
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUser: (u: AppUser) => void;
  addUser: (u: Partial<AppUser> & { name: string; email: string; password?: string }) => Promise<AppUser>;
  updateUser: (u: AppUser) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => void;
  loginCorporateUser: (
    email: string,
    password: string,
    requiredArea?: 'executive' | 'settings'
  ) => Promise<{ success: boolean; message: string; user?: AppUser; mustChangePassword?: boolean }>;
  changeUserPassword: (
    email: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string; user?: AppUser }>;
  resetUserPasswordByAdmin: (
    adminEmail: string,
    adminPassword: string,
    targetUserId: string,
    newTemporaryPassword?: string
  ) => Promise<{ success: boolean; message: string; temporaryPassword?: string }>;
  logoutUser: () => void;
  
  // OS Actions
  addOrder: (order: Omit<ServiceOrder, 'id' | 'osNumber' | 'createdAt'>) => ServiceOrder;
  updateOrder: (order: ServiceOrder) => void;
  deleteOrder: (id: string) => void;
  supervisorDeleteOrder: (orderId: string, supervisorName: string, reason: string, supervisorPassword?: string) => { success: boolean; message: string };
  restoreDeletedOrder: (orderId: string, supervisorName?: string) => void;
  validateOrder: (orderId: string, validatorName: string, notes?: string) => void;
  rejectOrderWithNotes: (orderId: string, rejectorName: string, notes: string) => void;
  signOrder: (orderId: string, clientSig: SignatureData, techSig?: SignatureData, termsAccepted?: string) => void;
  addPhotoToOrder: (orderId: string, photo: Omit<PhotoEvidence, 'id' | 'timestamp'>) => void;
  deletePhotoFromOrder: (orderId: string, photoId: string) => void;
  toggleChecklistItem: (orderId: string, checklistId: string) => void;
  updateOrderStatus: (orderId: string, status: ServiceOrder['status']) => void;
  
  // Invoice / Billing Actions
  createInvoiceForOrder: (orderId: string, paymentMethod?: Invoice['paymentMethod'], dueDate?: string, notes?: string) => Invoice;
  createBatchInvoice: (orderIds: string[] | string, orderIdsParam?: string[], paymentMethod?: Invoice['paymentMethod'], dueDate?: string) => Invoice;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status'], paidDate?: string) => void;
  deleteInvoice: (invoiceId: string) => void;
  
  // Client & Catalog Actions
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  
  // Equipment & Labor
  addEquipment: (eq: Omit<Equipment, 'id'>) => Equipment;
  updateEquipment: (eq: Equipment) => void;
  deleteEquipment: (id: string) => void;
  
  addLaborService: (lb: Omit<LaborService, 'id'>) => LaborService;
  updateLaborService: (lb: LaborService) => void;
  deleteLaborService: (id: string) => void;
  
  // Quick Filter & Navigation State
  selectedOrderForDetail: ServiceOrder | null;
  setSelectedOrderForDetail: (order: ServiceOrder | null) => void;
  selectedOrderForFieldMode: ServiceOrder | null;
  setSelectedOrderForFieldMode: (order: ServiceOrder | null) => void;
  selectedOrderForPrint: ServiceOrder | null;
  setSelectedOrderForPrint: (order: ServiceOrder | null) => void;
  
  // Security & Authentication
  isCheckingGlobalStatus: boolean;
  systemStatus: 'ABERTO' | 'FECHADO';
  isMaintenanceMode: boolean;
  setMaintenanceMode: (active: boolean) => void;
  reopenSystemGlobally: (password?: string) => Promise<boolean>;
  isSessionUnlocked: boolean;
  unlockSession: (password: string, reEnableGlobally?: boolean) => boolean;
  lockSession: () => void;
  changeMasterPassword: (currentPass: string, newPass: string) => { success: boolean; message: string };
  
  // Executive Portal Password Protection
  isExecutiveUnlocked: boolean;
  unlockExecutiveSession: (password: string) => boolean;
  lockExecutiveSession: () => void;
  
  // Derived helpers & Indicadores Operacionais de Pista (Novas Colunas)
  unbilledCompletedOrders: ServiceOrder[];
  pendingValidationOrders: ServiceOrder[];
  deletedOrders: ServiceOrder[];
  overdueBillingOrders: ServiceOrder[];
  totalFlightMinutes: number;
  totalFlightHoursFormatted: string;
  agentMetrics: AgentMetric[];
  flightServicesBreakdown: { title: string; count: number; totalMinutes: number; totalHoursFormatted: string }[];
  filledByMetrics: { name: string; count: number }[];
  totalOperationsCount: number;
  avgOperationMinutes: number;
  
  resetToSampleData: () => void;
  clearAllData: (scope?: 'all' | 'orders_and_invoices' | 'empty_database') => void;
  clearOrders: () => void;
  clearInvoices: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = 'os_digital_app_';
const DEFAULT_MASTER_PASSWORD = 'admin';
const DEFAULT_EXECUTIVE_PASSWORD = 'admin';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompanyState] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}company`);
    return saved ? JSON.parse(saved) : initialCompany;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}users`);
    const parsed = saved !== null ? JSON.parse(saved) : initialUsers;
    return mergeWithMasterUser(parsed);
  });

  const [currentUser, setCurrentUserState] = useState<AppUser>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return initialUsers[0] || {
      id: 'usr-default',
      name: 'Carlos Silva',
      role: 'operador_campo',
      roleLabel: 'Encarregado de Campo & Pista',
      avatarColor: 'bg-amber-600',
    };
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}clients`);
    return saved !== null ? JSON.parse(saved) : initialClients;
  });

  const [equipments, setEquipments] = useState<Equipment[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}equipments`);
    return saved !== null ? JSON.parse(saved) : initialEquipments;
  });

  const [laborServices, setLaborServices] = useState<LaborService[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}laborServices`);
    return saved !== null ? JSON.parse(saved) : initialLaborServices;
  });

  const [orders, setOrders] = useState<ServiceOrder[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}orders`);
    return saved !== null ? JSON.parse(saved) : initialOrders;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}invoices`);
    return saved !== null ? JSON.parse(saved) : initialInvoices;
  });

  // Maintenance mode (Tirar app do ar)
  const [isCheckingGlobalStatus, setIsCheckingGlobalStatus] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<'ABERTO' | 'FECHADO'>('ABERTO');
  const [isMaintenanceMode, setIsMaintenanceModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}maintenance_mode`);
    return saved ? JSON.parse(saved) : false;
  });

  // Password change state and session
  const [masterPassword, setMasterPasswordState] = useState<string>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}master_pwd`);
    return saved || DEFAULT_MASTER_PASSWORD;
  });

  const [executivePassword] = useState<string>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}exec_pwd`);
    return saved || DEFAULT_EXECUTIVE_PASSWORD;
  });

  // Temporary in-memory session unlock state
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(false);
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<Date | null>(new Date());
  const isAutoSyncActive = true;

  // Synchronization refs to prevent infinite loopback updates
  const isRemoteOrdersUpdateRef = useRef<boolean>(false);
  const isRemoteInvoicesUpdateRef = useRef<boolean>(false);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<ServiceOrder | null>(null);
  const [selectedOrderForFieldMode, setSelectedOrderForFieldMode] = useState<ServiceOrder | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<ServiceOrder | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}company`, JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}clients`, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}equipments`, JSON.stringify(equipments));
  }, [equipments]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}laborServices`, JSON.stringify(laborServices));
  }, [laborServices]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}orders`, JSON.stringify(orders));
    const cfg = getSheetsConfig();
    if (cfg.autoSync && cfg.webhookUrl) {
      syncOrdersWithGoogleSheets(orders).catch(() => {});
    }

    if (isRemoteOrdersUpdateRef.current) {
      isRemoteOrdersUpdateRef.current = false;
      return;
    }

    // Local change by this user: broadcast immediately to other browser tabs (0ms)
    if (bcRef.current) {
      try {
        bcRef.current.postMessage({
          type: 'LOCAL_ORDERS_UPDATE',
          orders,
          timestamp: Date.now(),
        });
      } catch {}
    }

    // Push to server state so all other users on any device receive the SSE event immediately (<50ms)
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    }).catch(() => {});
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}invoices`, JSON.stringify(invoices));

    if (isRemoteInvoicesUpdateRef.current) {
      isRemoteInvoicesUpdateRef.current = false;
      return;
    }

    if (bcRef.current) {
      try {
        bcRef.current.postMessage({
          type: 'LOCAL_INVOICES_UPDATE',
          invoices,
          timestamp: Date.now(),
        });
      } catch {}
    }

    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices }),
    }).catch(() => {});
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}maintenance_mode`, JSON.stringify(isMaintenanceMode));
  }, [isMaintenanceMode]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}master_pwd`, masterPassword);
  }, [masterPassword]);

  // Real-time synchronization with server state & maintenance status (SSE + BroadcastChannel + Auto-sync)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let bc: BroadcastChannel | null = null;

    const applyMaintenanceState = (active: boolean) => {
      setIsMaintenanceModeState((prev) => {
        if (prev !== active) {
          console.log(`[REALTIME SYNC] Status operacional alterado: ${active ? '🔴 BLOQUEADO / OFFLINE' : '🟢 ONLINE / RESTABELECIDO'}`);
        }
        return active;
      });
      if (active) {
        // Immediately invalidate public and executive sessions on remote clients
        setIsSessionUnlocked(false);
        setIsExecutiveUnlocked(false);
      }
    };

    // 1. Initial Quick Fetch from server + cloud KV
    const syncAllTiers = async () => {
      try {
        const cloudState = await fetchGlobalSystemState();
        if (cloudState) {
          const isClosed = cloudState.status === 'FECHADO' || cloudState.isMaintenanceMode === true;
          setSystemStatus(isClosed ? 'FECHADO' : 'ABERTO');
          applyMaintenanceState(isClosed);
          if (cloudState.users && Array.isArray(cloudState.users) && cloudState.users.length > 0) {
            setUsers((prev) => mergeWithMasterUser(cloudState.users));
          }
        }
      } catch (err) {
        // network or offline fallback
      } finally {
        setIsCheckingGlobalStatus(false);
      }
    };

    const fetchServerData = async () => {
      try {
        // 1. Carrega todas as OSs reais do Servidor/Planilha (GET /api/ordens)
        const ordensRes = await ordensApi.getAll();
        if (ordensRes.success && Array.isArray(ordensRes.orders) && ordensRes.orders.length > 0) {
          isRemoteOrdersUpdateRef.current = true;
          setOrders(ordensRes.orders);
          setLastAutoSyncTime(new Date());
        }
      } catch (err) {
        console.warn('GET /api/ordens fallback:', err);
      }

      try {
        // 2. Carrega todos os usuários centralizados (GET /api/users)
        const usersRes = await usersApi.getAll();
        if (usersRes.success && Array.isArray(usersRes.users) && usersRes.users.length > 0) {
          setUsers(mergeWithMasterUser(usersRes.users));
        }
      } catch (err) {
        console.warn('GET /api/users fallback:', err);
      }
    };

    syncAllTiers();
    fetchServerData();

    // 2. Setup Server-Sent Events (SSE) for Instant (<50ms) push across different browsers/devices
    try {
      eventSource = new EventSource('/api/system/events');

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);

          if (data.type === 'INIT' || data.type === 'MAINTENANCE_CHANGE') {
            if (typeof data.isMaintenanceMode === 'boolean') {
              applyMaintenanceState(data.isMaintenanceMode);
            }
          }

          if (data.type === 'USERS_CHANGE' && Array.isArray(data.users)) {
            setUsers(mergeWithMasterUser(data.users));
          }

          if (data.type === 'STATE_CHANGE' && data.appState) {
            if (Array.isArray(data.appState.orders)) {
              isRemoteOrdersUpdateRef.current = true;
              setOrders(data.appState.orders);
              setLastAutoSyncTime(new Date());
            }
            if (Array.isArray(data.appState.invoices)) {
              isRemoteInvoicesUpdateRef.current = true;
              setInvoices(data.appState.invoices);
            }
            if (data.appState.company) setCompanyState(data.appState.company);
          }
        } catch (parseErr) {
          console.warn('Erro ao processar evento SSE:', parseErr);
        }
      };

      eventSource.onerror = () => {
        // EventSource will automatically attempt reconnection
      };
    } catch (sseErr) {
      console.warn('SSE não suportado neste navegador, usando polling fallback', sseErr);
    }

    // 3. Setup BroadcastChannel for 0ms same-browser multi-tab sync
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('wfs_system_sync');
        bcRef.current = bc;
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'MAINTENANCE_CHANGE' && typeof ev.data.isMaintenanceMode === 'boolean') {
            applyMaintenanceState(ev.data.isMaintenanceMode);
          } else if (ev.data?.type === 'GLOBAL_STATE_UPDATE' && ev.data.state) {
            if (typeof ev.data.state.isMaintenanceMode === 'boolean') {
              applyMaintenanceState(ev.data.state.isMaintenanceMode);
            }
            if (Array.isArray(ev.data.state.users)) {
              setUsers(mergeWithMasterUser(ev.data.state.users));
            }
          } else if (ev.data?.type === 'LOCAL_ORDERS_UPDATE' && Array.isArray(ev.data.orders)) {
            isRemoteOrdersUpdateRef.current = true;
            setOrders(ev.data.orders);
            setLastAutoSyncTime(new Date());
          } else if (ev.data?.type === 'LOCAL_INVOICES_UPDATE' && Array.isArray(ev.data.invoices)) {
            isRemoteInvoicesUpdateRef.current = true;
            setInvoices(ev.data.invoices);
          }
        };
      }
    } catch {}

    // 4. Polling check for operational maintenance mode status every 5s
    const interval = setInterval(syncAllTiers, 5000);

    // 5. Automatic periodic background Google Sheets sync every 20s (without blocking UI)
    const autoSyncTimer = setInterval(() => {
      syncWithGoogleSheet(undefined, true).catch(() => {});
    }, 20000);

    return () => {
      if (eventSource) eventSource.close();
      if (bc) bc.close();
      bcRef.current = null;
      clearInterval(interval);
      clearInterval(autoSyncTimer);
    };
  }, []);

  const setCompany = (c: CompanyProfile) => {
    setCompanyState(c);
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: c }),
    }).catch(() => {});
  };

  const setCurrentUser = (u: AppUser) => {
    setCurrentUserState(u);
  };

  const addUser = async (userData: Partial<AppUser> & { name: string; email: string; password?: string }): Promise<AppUser> => {
    const privilege = userData.privilege || 'operador';
    const isSupervisor = privilege === 'supervisor' || privilege === 'administrador';
    const isAnalistaOrAbove = privilege === 'analista' || isSupervisor;
    const isMaster = privilege === 'master_ti' || privilege === 'administrador';

    const localUser: AppUser = {
      id: 'usr-' + Date.now(),
      name: userData.name.trim(),
      email: userData.email.trim(),
      section: userData.section || 'Pista & Rampa',
      roleTitle: userData.roleTitle || 'Operador de Campo',
      department: userData.department || 'Operações GSE',
      password: userData.password || '123456',
      privilege,
      privilegeLabel:
        userData.privilegeLabel ||
        (privilege === 'administrador'
          ? 'Administrador Geral'
          : privilege === 'supervisor'
          ? 'Supervisor de Operações'
          : privilege === 'analista'
          ? 'Analista de Faturamento'
          : privilege === 'master_ti'
          ? 'Administrador de TI'
          : 'Operador de Solo'),
      role: userData.role || (privilege === 'analista' ? 'faturamento' : privilege === 'supervisor' ? 'supervisor' : 'operador_campo'),
      roleLabel: userData.roleTitle || userData.roleLabel || 'Colaborador WFS',
      canValidateBilling: userData.canValidateBilling !== undefined ? userData.canValidateBilling : isAnalistaOrAbove,
      canDeleteOS: userData.canDeleteOS !== undefined ? userData.canDeleteOS : isSupervisor,
      canAccessExecutive: userData.canAccessExecutive !== undefined ? userData.canAccessExecutive : isAnalistaOrAbove,
      canAccessSettings: userData.canAccessSettings !== undefined ? userData.canAccessSettings : (isSupervisor || isMaster),
      mustChangePassword: true,
      firstAccess: true,
      active: userData.active !== undefined ? userData.active : true,
      createdAt: new Date().toISOString(),
      phone: userData.phone,
      avatarColor:
        userData.avatarColor ||
        (privilege === 'administrador'
          ? 'bg-slate-900'
          : privilege === 'supervisor'
          ? 'bg-red-600'
          : privilege === 'analista'
          ? 'bg-emerald-600'
          : 'bg-amber-600'),
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localUser),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const newUsers = mergeWithMasterUser([data.user, ...users.filter((u) => u.id !== data.user.id)]);
          setUsers(newUsers);
          publishGlobalSystemState({ users: newUsers });
          return data.user;
        }
      }
    } catch (err) {
      console.warn('Fallback adding user to local state', err);
    }

    const newUsers = mergeWithMasterUser([localUser, ...users]);
    setUsers(newUsers);
    publishGlobalSystemState({ users: newUsers });
    return localUser;
  };

  const updateUser = async (u: AppUser): Promise<void> => {
    const updatedUsers = mergeWithMasterUser(users.map((item) => (item.id === u.id ? u : item)));
    setUsers(updatedUsers);
    publishGlobalSystemState({ users: updatedUsers });
    if (currentUser.id === u.id) {
      setCurrentUserState(u);
    }
    try {
      await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      });
    } catch {}
  };

  const deleteUser = async (id: string): Promise<void> => {
    const remainingUsers = mergeWithMasterUser(users.filter((u) => u.id !== id));
    setUsers(remainingUsers);
    publishGlobalSystemState({ users: remainingUsers });
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const toggleUserStatus = (id: string) => {
    const updatedUsers = mergeWithMasterUser(
      users.map((item) => {
        if (item.id === id) {
          const updated = { ...item, active: !item.active };
          if (currentUser.id === id) {
            setCurrentUserState(updated);
          }
          fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return item;
      })
    );
    setUsers(updatedUsers);
    publishGlobalSystemState({ users: updatedUsers });
  };

  const loginCorporateUser = async (
    email: string,
    password: string,
    requiredArea: 'executive' | 'settings' = 'executive'
  ): Promise<{ success: boolean; message: string; user?: AppUser; mustChangePassword?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      return { success: false, message: 'Por favor, informe seu e-mail corporativo ou nome de usuário.' };
    }
    if (!cleanPass) {
      return { success: false, message: 'Por favor, digite sua senha de acesso.' };
    }

    // Direct Instant Master Admin Validation (Works in any browser, mobile, or static deployment like pages.dev)
    const isMasterAdminEmail =
      cleanEmail === 'ivoaltctrl@gmail.com' ||
      cleanEmail === 'ivoaltctrl' ||
      cleanEmail === 'admin' ||
      cleanEmail === 'ivo';

    const isMasterPasswordValid =
      cleanPass === masterPassword ||
      cleanPass === 'admin' ||
      cleanPass === MASTER_ADMIN_USER.password;

    if (isMasterAdminEmail && isMasterPasswordValid) {
      setCurrentUserState(MASTER_ADMIN_USER);
      setIsExecutiveUnlocked(true);
      setIsSessionUnlocked(true);
      return {
        success: true,
        message: 'Autenticado com sucesso como Administrador Mestre!',
        user: MASTER_ADMIN_USER,
        mustChangePassword: false,
      };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass, requiredArea }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.user) {
        const loggedUser: AppUser = data.user;
        setCurrentUserState(loggedUser);
        setIsExecutiveUnlocked(true);
        if (requiredArea === 'settings') {
          setIsSessionUnlocked(true);
        }
        return {
          success: true,
          message: data.message,
          user: loggedUser,
          mustChangePassword: data.mustChangePassword,
        };
      } else if (response.ok === false && data.message) {
        // If server explicitly returned an error message (e.g. wrong password), check local fallback as well
      }
    } catch (networkErr) {
      // Dev server offline or static deployment (e.g. Cloudflare Pages) fallback
    }

    // Local/Fallback Validation
    const allUsers = mergeWithMasterUser(users);
    const foundUser = allUsers.find(
      (u) =>
        u.email?.toLowerCase().trim() === cleanEmail ||
        u.name.toLowerCase().trim() === cleanEmail
    );

    if (!foundUser) {
      // If user typed ivoaltctrl with wrong password or another user not found
      if (isMasterAdminEmail) {
        return {
          success: false,
          message: 'Senha incorreta para o Administrador Mestre.',
        };
      }
      return {
        success: false,
        message: 'Usuário não cadastrado no sistema. Apenas usuários cadastrados pela Gestão possuem acesso.',
      };
    }

    if (foundUser.active === false) {
      return {
        success: false,
        message: 'Acesso bloqueado: Este usuário está inativo. Contate o administrador ou supervisor.',
      };
    }

    const isMasterPass = cleanPass === masterPassword || cleanPass === 'admin';
    if (foundUser.password !== cleanPass && !isMasterPass) {
      return {
        success: false,
        message: 'Senha incorreta. Verifique os dados digitados.',
      };
    }

    // Check area permissions
    if (requiredArea === 'settings' && !foundUser.canAccessSettings && foundUser.privilege !== 'administrador' && foundUser.privilege !== 'master_ti') {
      return {
        success: false,
        message: 'Acesso negado: Apenas Administradores e Supervisores autorizados podem acessar as Configurações.',
      };
    }

    setCurrentUserState(foundUser);
    setIsExecutiveUnlocked(true);
    if (requiredArea === 'settings') {
      setIsSessionUnlocked(true);
    }

    return {
      success: true,
      message: `Autenticado como ${foundUser.name}!`,
      user: foundUser,
      mustChangePassword: foundUser.mustChangePassword,
    };
  };

  const changeUserPassword = async (
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user?: AppUser }> => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword, newPassword }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user) {
          setCurrentUserState(data.user);
          setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
        }
        return { success: true, message: data.message, user: data.user };
      }
      return { success: false, message: data.message || 'Erro ao alterar senha.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Falha de conexão com o servidor.' };
    }
  };

  const resetUserPasswordByAdmin = async (
    adminEmail: string,
    adminPassword: string,
    targetUserId: string,
    newTemporaryPassword?: string
  ): Promise<{ success: boolean; message: string; temporaryPassword?: string }> => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminEmail || currentUser?.email || 'ivoaltctrl@gmail.com',
          adminPassword: adminPassword || masterPassword,
          targetUserId,
          newTemporaryPassword: newTemporaryPassword || '123456',
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user) {
          setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
        }
        return {
          success: true,
          message: data.message,
          temporaryPassword: data.temporaryPassword,
        };
      }
      return { success: false, message: data.message || 'Falha ao resetar senha.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Falha de comunicação com o servidor.' };
    }
  };

  const logoutUser = () => {
    setIsExecutiveUnlocked(false);
    setIsSessionUnlocked(false);
  };

  // Helper for generating next OS Number
  const generateNextOSNumber = (): string => {
    const year = new Date().getFullYear();
    const currentCount = orders.length + 1;
    const padded = String(currentCount).padStart(4, '0');
    return `OS-${year}-${padded}`;
  };

  // Helper for next invoice number
  const generateNextInvoiceNumber = (): string => {
    const year = new Date().getFullYear();
    const currentCount = invoices.length + 1;
    const padded = String(currentCount).padStart(4, '0');
    return `FAT-${year}-${padded}`;
  };

  const addOrder = (newOrderData: Omit<ServiceOrder, 'id' | 'osNumber' | 'createdAt'>): ServiceOrder => {
    const id = 'os-' + Date.now();
    const osNumber = generateNextOSNumber();
    const createdAt = new Date().toISOString();

    const initialAudit: OSAuditLog = {
      id: 'log-' + Date.now(),
      action: newOrderData.createdOrigin === 'teams_upload'
        ? 'teams_upload'
        : newOrderData.createdOrigin === 'digitalizacao_ia'
        ? 'digitalizacao_ia'
        : 'criacao_campo',
      userName: currentUser?.name || newOrderData.createdBy || 'Operador WFS',
      userRole: currentUser?.roleLabel || newOrderData.createdByRole || 'Operador',
      timestamp: createdAt,
      details: `Ordem de Serviço criada inicial como "${newOrderData.status || 'aguardando_validacao'}".`,
      origin: newOrderData.createdOrigin || 'campo_app',
    };

    const newOrder: ServiceOrder = {
      ...newOrderData,
      id,
      osNumber,
      createdAt,
      createdBy: newOrderData.createdBy || currentUser?.name || 'Operador WFS',
      createdByRole: newOrderData.createdByRole || currentUser?.roleLabel || 'Operador',
      createdOrigin: newOrderData.createdOrigin || 'campo_app',
      status: newOrderData.status || 'aguardando_validacao',
      auditLogs: [initialAudit, ...(newOrderData.auditLogs || [])],
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Auto-save to Google Sheets via Webhook
    pushSingleOrderToGoogleSheet(newOrder);

    return newOrder;
  };

  const updateOrder = (updated: ServiceOrder) => {
    const now = new Date().toISOString();
    const editLog: OSAuditLog = {
      id: 'log-' + Date.now(),
      action: 'edicao',
      userName: currentUser?.name || 'Operador WFS',
      userRole: currentUser?.roleLabel || 'Operador',
      timestamp: now,
      details: `Dados da OS atualizados. Valor: R$ ${updated.totalAmount?.toFixed(2)}. Status: ${updated.status}.`,
    };

    const orderWithAudit = {
      ...updated,
      auditLogs: [editLog, ...(updated.auditLogs || [])],
    };

    setOrders((prev) => prev.map((o) => (o.id === updated.id ? orderWithAudit : o)));
    if (selectedOrderForDetail?.id === updated.id) {
      setSelectedOrderForDetail(orderWithAudit);
    }
    if (selectedOrderForFieldMode?.id === updated.id) {
      setSelectedOrderForFieldMode(orderWithAudit);
    }
  };

  // Trava para Exclusões: apenas supervisor/master com senha pode excluir
  const supervisorDeleteOrder = (
    orderId: string,
    supervisorName: string,
    reason: string,
    supervisorPassword?: string
  ): { success: boolean; message: string } => {
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'É obrigatório informar o motivo detalhado da exclusão (mínimo 5 caracteres).' };
    }

    if (supervisorPassword) {
      const valid = supervisorPassword === masterPassword || supervisorPassword === DEFAULT_MASTER_PASSWORD || supervisorPassword === 'admin';
      if (!valid) {
        return { success: false, message: 'Senha de supervisor/administrador incorreta.' };
      }
    }

    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const deleteLog: OSAuditLog = {
            id: 'log-' + Date.now(),
            action: 'exclusao_cancelamento',
            userName: supervisorName || currentUser?.name || 'Supervisor WFS',
            userRole: 'Supervisor Operacional',
            timestamp: now,
            details: `OS cancelada/excluída. Motivo: "${reason}".`,
          };
          return {
            ...o,
            status: 'cancelada',
            deletedBy: supervisorName || currentUser?.name || 'Supervisor WFS',
            deletedAt: now,
            deletionReason: reason,
            auditLogs: [deleteLog, ...(o.auditLogs || [])],
          };
        }
        return o;
      })
    );

    return { success: true, message: 'Ordem de Serviço movida para a aba de Excluídos com registro de auditoria.' };
  };

  // Reativar OS Excluída
  const restoreDeletedOrder = (orderId: string, supervisorName?: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const restoreLog: OSAuditLog = {
            id: 'log-' + Date.now(),
            action: 'reativacao',
            userName: supervisorName || currentUser?.name || 'Supervisor WFS',
            userRole: 'Supervisor Operacional',
            timestamp: now,
            details: 'OS reativada a partir da lixeira de excluídos.',
          };
          return {
            ...o,
            status: 'aguardando_validacao',
            deletedBy: undefined,
            deletedAt: undefined,
            deletionReason: undefined,
            auditLogs: [restoreLog, ...(o.auditLogs || [])],
          };
        }
        return o;
      })
    );
  };

  const deleteOrder = (id: string) => {
    // Fallback soft-delete or remove
    setOrders((prev) => prev.filter((o) => o.id !== id));
    if (selectedOrderForDetail?.id === id) setSelectedOrderForDetail(null);
    if (selectedOrderForFieldMode?.id === id) setSelectedOrderForFieldMode(null);
    if (selectedOrderForPrint?.id === id) setSelectedOrderForPrint(null);
  };

  // Validação pelo Time de Faturamento
  const validateOrder = (orderId: string, validatorName: string, notes?: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const valLog: OSAuditLog = {
            id: 'log-' + Date.now(),
            action: 'validacao_faturamento',
            userName: validatorName || currentUser?.name || 'Analista Faturamento',
            userRole: 'Faturamento',
            timestamp: now,
            details: notes ? `OS validada e liberada para faturamento. Obs: ${notes}` : 'OS validada e aprovada com sucesso pelo Faturamento.',
          };
          const updated: ServiceOrder = {
            ...o,
            status: 'concluida', // Ready for invoicing
            validatedBy: validatorName || currentUser?.name || 'Faturamento',
            validatedAt: now,
            validationNotes: notes,
            auditLogs: [valLog, ...(o.auditLogs || [])],
          };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          return updated;
        }
        return o;
      })
    );
  };

  const rejectOrderWithNotes = (orderId: string, rejectorName: string, notes: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const rejLog: OSAuditLog = {
            id: 'log-' + Date.now(),
            action: 'rejeicao_ajuste',
            userName: rejectorName || currentUser?.name || 'Analista Faturamento',
            userRole: 'Faturamento',
            timestamp: now,
            details: `Ajuste solicitado pelo Faturamento: "${notes}"`,
          };
          const updated: ServiceOrder = {
            ...o,
            status: 'em_andamento',
            validationNotes: `Solicitado ajuste: ${notes}`,
            auditLogs: [rejLog, ...(o.auditLogs || [])],
          };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          return updated;
        }
        return o;
      })
    );
  };

  const signOrder = (
    orderId: string,
    clientSig: SignatureData,
    techSig?: SignatureData,
    termsAccepted?: string
  ) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const signLog: OSAuditLog = {
            id: 'log-' + Date.now(),
            action: 'assinatura_cliente',
            userName: clientSig.signerName,
            userRole: clientSig.signerRole || 'Cliente',
            timestamp: now,
            details: `Assinatura digital coletada no campo por ${clientSig.signerName} (${clientSig.signerDocument}).`,
          };

          const updated: ServiceOrder = {
            ...o,
            status: 'aguardando_validacao', // Signature received in field -> Moves to Billing Validation queue!
            completedAt: now,
            clientSignature: clientSig,
            technicianSignature: techSig || o.technicianSignature,
            termsAcceptedText: termsAccepted || o.termsAcceptedText || company.defaultTerms,
            auditLogs: [signLog, ...(o.auditLogs || [])],
          };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          if (selectedOrderForFieldMode?.id === orderId) setSelectedOrderForFieldMode(updated);
          return updated;
        }
        return o;
      })
    );
  };

  const addPhotoToOrder = (orderId: string, photoData: Omit<PhotoEvidence, 'id' | 'timestamp'>) => {
    const photo: PhotoEvidence = {
      ...photoData,
      id: 'photo-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = {
            ...o,
            photos: [...o.photos, photo],
          };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          if (selectedOrderForFieldMode?.id === orderId) setSelectedOrderForFieldMode(updated);
          return updated;
        }
        return o;
      })
    );
  };

  const deletePhotoFromOrder = (orderId: string, photoId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = {
            ...o,
            photos: o.photos.filter((p) => p.id !== photoId),
          };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          if (selectedOrderForFieldMode?.id === orderId) setSelectedOrderForFieldMode(updated);
          return updated;
        }
        return o;
      })
    );
  };

  const toggleChecklistItem = (orderId: string, checklistId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updatedList = o.checklist.map((c) => {
            if (c.id === checklistId) {
              const completed = !c.completed;
              return {
                ...c,
                completed,
                completedAt: completed ? new Date().toISOString() : undefined,
              };
            }
            return c;
          });
          const updated = { ...o, checklist: updatedList };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          if (selectedOrderForFieldMode?.id === orderId) setSelectedOrderForFieldMode(updated);
          return updated;
        }
        return o;
      })
    );
  };

  const updateOrderStatus = (orderId: string, status: ServiceOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, status };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          if (selectedOrderForFieldMode?.id === orderId) setSelectedOrderForFieldMode(updated);
          return updated;
        }
        return o;
      })
    );
  };

  // Invoicing
  const createInvoiceForOrder = (
    orderId: string,
    paymentMethod: Invoice['paymentMethod'] = 'pix',
    dueDate?: string,
    notes?: string
  ): Invoice => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Ordem de serviço não encontrada');

    const invoiceId = 'inv-' + Date.now();
    const invoiceNumber = generateNextInvoiceNumber();
    const issueDate = new Date().toISOString();
    const defaultDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      clientDocument: order.clientDocument,
      osIds: [order.id],
      osNumbers: [order.osNumber],
      issueDate,
      dueDate: dueDate || defaultDueDate,
      totalAmount: order.totalAmount,
      status: 'pendente',
      paymentMethod,
      pixKey: company.pixKey,
      bankDetails: company.bankInfo,
      notes: notes || `Fatura referente à ${order.osNumber} - ${order.title}`,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // Update order with invoice linkage
    const invoiceAudit: OSAuditLog = {
      id: 'log-' + Date.now(),
      action: 'faturamento_emitido',
      userName: currentUser?.name || 'Faturamento',
      userRole: 'Faturamento',
      timestamp: issueDate,
      details: `Fatura ${invoiceNumber} gerada no valor de R$ ${order.totalAmount.toFixed(2)}.`,
    };

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: ServiceOrder = {
            ...o,
            status: 'faturada',
            invoicedAt: issueDate,
            invoiceId,
            invoiceNumber,
            paymentMethod,
            paymentDueDate: dueDate || defaultDueDate,
            auditLogs: [invoiceAudit, ...(o.auditLogs || [])],
          };
          if (selectedOrderForDetail?.id === orderId) setSelectedOrderForDetail(updated);
          return updated;
        }
        return o;
      })
    );

    return newInvoice;
  };

  const createBatchInvoice = (
    orderIdsOrClientName: string[] | string,
    orderIdsParam?: string[],
    paymentMethod: Invoice['paymentMethod'] = 'pix',
    dueDate?: string
  ): Invoice => {
    let orderIds: string[] = [];
    if (Array.isArray(orderIdsOrClientName)) {
      orderIds = orderIdsOrClientName;
    } else if (orderIdsParam && Array.isArray(orderIdsParam)) {
      orderIds = orderIdsParam;
    }
    const selectedOrders = orders.filter((o) => orderIds.includes(o.id));
    if (selectedOrders.length === 0) throw new Error('Nenhuma ordem de serviço selecionada');

    const firstOrder = selectedOrders[0];
    const totalAmount = selectedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const invoiceId = 'inv-' + Date.now();
    const invoiceNumber = generateNextInvoiceNumber();
    const issueDate = new Date().toISOString();
    const defaultDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      clientId: firstOrder.clientId,
      clientName: firstOrder.clientName,
      clientDocument: firstOrder.clientDocument,
      osIds: selectedOrders.map((o) => o.id),
      osNumbers: selectedOrders.map((o) => o.osNumber),
      issueDate,
      dueDate: dueDate || defaultDueDate,
      totalAmount,
      status: 'pendente',
      paymentMethod,
      pixKey: company.pixKey,
      bankDetails: company.bankInfo,
      notes: `Fatura em lote agrupando ${selectedOrders.length} ordens de serviço.`,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    setOrders((prev) =>
      prev.map((o) => {
        if (orderIds.includes(o.id)) {
          return {
            ...o,
            status: 'faturada',
            invoicedAt: issueDate,
            invoiceId,
            invoiceNumber,
            paymentMethod,
            paymentDueDate: dueDate || defaultDueDate,
          };
        }
        return o;
      })
    );

    return newInvoice;
  };

  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status'], paidDate?: string) => {
    const now = paidDate || new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status,
            paidAt: status === 'paga' ? now : inv.paidAt,
          };
        }
        return inv;
      })
    );

    // If marked as paid, update associated orders to 'paga'
    if (status === 'paga') {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        setOrders((prev) =>
          prev.map((o) => {
            if (inv.osIds.includes(o.id)) {
              return {
                ...o,
                status: 'paga',
                paidAt: now,
              };
            }
            return o;
          })
        );
      }
    }
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
  };

  // Client Management
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: 'cli-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (c: Client) => {
    setClients((prev) => prev.map((item) => (item.id === c.id ? c : item)));
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((item) => item.id !== id));
  };

  // Equipments Management
  const addEquipment = (eqData: Omit<Equipment, 'id'>): Equipment => {
    const newEq: Equipment = {
      ...eqData,
      id: 'eq-' + Date.now(),
    };
    setEquipments((prev) => [newEq, ...prev]);
    return newEq;
  };

  const updateEquipment = (eq: Equipment) => {
    setEquipments((prev) => prev.map((item) => (item.id === eq.id ? eq : item)));
  };

  const deleteEquipment = (id: string) => {
    setEquipments((prev) => prev.filter((item) => item.id !== id));
  };

  // Labor Services Management
  const addLaborService = (lbData: Omit<LaborService, 'id'>): LaborService => {
    const newLb: LaborService = {
      ...lbData,
      id: 'lab-' + Date.now(),
    };
    setLaborServices((prev) => [newLb, ...prev]);
    return newLb;
  };

  const updateLaborService = (lb: LaborService) => {
    setLaborServices((prev) => prev.map((item) => (item.id === lb.id ? lb : item)));
  };

  const deleteLaborService = (id: string) => {
    setLaborServices((prev) => prev.filter((item) => item.id !== id));
  };

  // Master Maintenance Mode (Tira o app do ar em tempo real em todas as conexões e dispositivos)
  const setMaintenanceMode = (active: boolean, adminPassword?: string) => {
    const resolvedStatus: 'ABERTO' | 'FECHADO' = active ? 'FECHADO' : 'ABERTO';
    setIsMaintenanceModeState(active);
    setSystemStatus(resolvedStatus);
    publishGlobalSystemState(
      {
        status: resolvedStatus,
        isMaintenanceMode: active,
        maintenanceUpdatedBy: currentUser?.email || 'ivoaltctrl@gmail.com',
      },
      adminPassword || masterPassword
    );
  };

  const reopenSystemGlobally = async (password?: string): Promise<boolean> => {
    setMaintenanceMode(false, password);
    setIsSessionUnlocked(true);
    return true;
  };

  const unlockSession = (password: string, reEnableGlobally = false): boolean => {
    if (password === masterPassword || password === DEFAULT_MASTER_PASSWORD || password === 'admin') {
      setIsSessionUnlocked(true);
      if (reEnableGlobally) {
        setMaintenanceMode(false, password);
      }
      return true;
    }
    return false;
  };

  const lockSession = () => {
    setIsSessionUnlocked(false);
  };

  const unlockExecutiveSession = (password: string): boolean => {
    if (
      password === executivePassword ||
      password === DEFAULT_EXECUTIVE_PASSWORD ||
      password === masterPassword ||
      password === 'admin' ||
      password === 'wfs@2025' ||
      password === 'wfs'
    ) {
      setIsExecutiveUnlocked(true);
      return true;
    }
    return false;
  };

  const lockExecutiveSession = () => {
    setIsExecutiveUnlocked(false);
  };

  const changeMasterPassword = (currentPass: string, newPass: string): { success: boolean; message: string } => {
    if (currentPass !== masterPassword && currentPass !== DEFAULT_MASTER_PASSWORD && currentPass !== 'admin') {
      return { success: false, message: 'Senha atual incorreta.' };
    }
    if (newPass.length < 4) {
      return { success: false, message: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }
    setMasterPasswordState(newPass);
    return { success: true, message: 'Senha mestra alterada com sucesso!' };
  };

  // Google Sheets Live Integration Actions
  const syncWithGoogleSheet = async (
    sheetUrlOrId?: string,
    isBackground: boolean = false
  ): Promise<{ success: boolean; message: string; count: number }> => {
    if (!isBackground) {
      setIsSyncingSheets(true);
    }
    try {
      const result = await fetchOrdersFromGoogleSheet(sheetUrlOrId);
      if (result.success && result.orders.length > 0) {
        setOrders((prev) => {
          const existingMap = new Map<string, ServiceOrder>();
          // Index existing orders by their unique ID
          prev.forEach((o) => existingMap.set(o.id, o));

          result.orders.forEach((newOrd) => {
            const existing = existingMap.get(newOrd.id);
            if (existing) {
              existingMap.set(newOrd.id, {
                ...existing,
                ...newOrd,
                clientSignature: existing.clientSignature || newOrd.clientSignature,
                photos: existing.photos && existing.photos.length > 0 ? existing.photos : newOrd.photos,
                checklist: existing.checklist && existing.checklist.length > 0 ? existing.checklist : newOrd.checklist,
                status:
                  existing.status === 'concluida' || existing.status === 'cancelada'
                    ? existing.status
                    : newOrd.status,
              });
            } else {
              existingMap.set(newOrd.id, newOrd);
            }
          });

          const merged = Array.from(existingMap.values());
          // Sync merged to server state so all clients get it
          fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: merged }),
          }).catch(() => {});

          return merged;
        });

        setLastAutoSyncTime(new Date());

        // Register missing clients from sheet
        result.orders.forEach((ord) => {
          if (ord.clientName) {
            setClients((prevClients) => {
              if (!prevClients.some((c) => c.name.toLowerCase() === ord.clientName.toLowerCase())) {
                return [
                  ...prevClients,
                  {
                    id: ord.clientId || `cli-${Date.now()}`,
                    name: ord.clientName,
                    tradeName: ord.clientName,
                    document: ord.clientDocument || '',
                    email: ord.clientEmail || 'contato@' + ord.clientName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com.br',
                    phone: ord.clientPhone || '(11) 98000-0000',
                    contactPerson: ord.filledBy || 'Fiscal de Pista',
                    address: {
                      street: ord.workLocation || 'Aeroporto / Pista',
                      number: '1',
                      neighborhood: 'Pista',
                      city: 'Guarulhos',
                      state: 'SP',
                      zipCode: '07190-100',
                      workSiteName: ord.workLocation || 'GRU',
                    },
                    paymentTermsDays: 15,
                    createdAt: new Date().toISOString(),
                  },
                ];
              }
              return prevClients;
            });
          }
        });

        return { success: true, message: result.message, count: result.orders.length };
      } else {
        return { success: false, message: result.message, count: 0 };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao sincronizar com Google Sheets.', count: 0 };
    } finally {
      if (!isBackground) {
        setIsSyncingSheets(false);
      }
    }
  };

  const importRawSheetData = (rawText: string): { success: boolean; message: string; count: number } => {
    try {
      const rows = parseCSVToRows(rawText);
      const parsed = parseSheetRowsToOrders(rows);
      if (parsed.length === 0) {
        return { success: false, message: 'Nenhuma ordem identificada no texto/CSV fornecido.', count: 0 };
      }
      setOrders((prev) => {
        const existingMap = new Map<string, ServiceOrder>();
        prev.forEach((o) => existingMap.set(o.id, o));
        parsed.forEach((newOrd) => existingMap.set(newOrd.id, newOrd));
        return Array.from(existingMap.values());
      });

      return {
        success: true,
        message: `${parsed.length} ordens de serviço importadas com sucesso nas 18 colunas!`,
        count: parsed.length,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao processar dados.', count: 0 };
    }
  };

  const pushOrdersToGoogleSheet = async (webhookUrl?: string): Promise<{ success: boolean; message: string }> => {
    setIsSyncingSheets(true);
    try {
      const res = await syncOrdersWithGoogleSheets(orders, webhookUrl);
      return res;
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Derived helpers & Indicadores Operacionais de Pista (Novas Colunas)
  const unbilledCompletedOrders = orders.filter(
    (o) => o.status === 'concluida' && !o.invoiceId
  );

  const pendingValidationOrders = orders.filter(
    (o) => o.status === 'aguardando_validacao'
  );

  const deletedOrders = orders.filter(
    (o) => o.status === 'cancelada'
  );

  const overdueBillingOrders = orders.filter((o) => {
    if (o.status !== 'concluida' || o.invoiceId || !o.completedAt) return false;
    const completedTime = new Date(o.completedAt).getTime();
    const hoursSince = (Date.now() - completedTime) / (1000 * 60 * 60);
    return hoursSince >= (company.billingAlertHours || 24);
  });

  // Indicadores Operacionais & Pista (Novas Colunas)
  const {
    totalFlightMinutes,
    totalFlightHoursFormatted,
    agentMetrics,
    flightServicesBreakdown,
    filledByMetrics,
    totalOperationsCount,
    avgOperationMinutes,
  } = React.useMemo(() => {
    let totalMin = 0;
    const agentMap = new Map<
      string,
      { badge?: string; count: number; totalMinutes: number; clients: Set<string>; lastService: string }
    >();
    const serviceMap = new Map<string, { count: number; totalMinutes: number }>();
    const filledMap = new Map<string, number>();
    let operationsCount = 0;

    orders.forEach((o) => {
      if (o.status === 'cancelada') return;
      operationsCount++;

      // Calculate minutes
      let min = o.durationMinutes || 0;
      if (!min && o.startTime && o.endTime) {
        const dur = calculateDuration(o.startTime, o.endTime);
        min = dur.minutes;
      }
      totalMin += min;

      // Agent stats
      const agName = o.agentName || o.technicianName || 'Operador de Pista';
      if (agName) {
        const existing = agentMap.get(agName) || {
          badge: o.agentBadge,
          count: 0,
          totalMinutes: 0,
          clients: new Set<string>(),
          lastService: o.title,
        };
        existing.count += 1;
        existing.totalMinutes += min;
        if (o.clientName) existing.clients.add(o.clientName);
        if (o.agentBadge && !existing.badge) existing.badge = o.agentBadge;
        existing.lastService = o.title;
        agentMap.set(agName, existing);
      }

      // Flight service breakdown
      const sTitle = o.title || 'Serviço Operacional';
      const sExisting = serviceMap.get(sTitle) || { count: 0, totalMinutes: 0 };
      sExisting.count += 1;
      sExisting.totalMinutes += min;
      serviceMap.set(sTitle, sExisting);

      // Filled by
      const filler = o.filledBy || o.createdBy || 'Amanda Aparecida Vasco Cortez';
      filledMap.set(filler, (filledMap.get(filler) || 0) + 1);
    });

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const formattedFlightHours = m > 0 ? `${h}h ${m < 10 ? '0' : ''}${m}m` : `${h}h 00m`;

    const metrics: AgentMetric[] = Array.from(agentMap.entries())
      .map(([name, data]) => {
        const agH = Math.floor(data.totalMinutes / 60);
        const agM = data.totalMinutes % 60;
        return {
          name,
          badge: data.badge,
          count: data.count,
          totalMinutes: data.totalMinutes,
          totalHoursFormatted: agM > 0 ? `${agH}h ${agM < 10 ? '0' : ''}${agM}m` : `${agH}h 00m`,
          uniqueClients: Array.from(data.clients),
          lastService: data.lastService,
        };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count);

    const flightServices = Array.from(serviceMap.entries())
      .map(([title, data]) => {
        const sH = Math.floor(data.totalMinutes / 60);
        const sM = data.totalMinutes % 60;
        return {
          title,
          count: data.count,
          totalMinutes: data.totalMinutes,
          totalHoursFormatted: sM > 0 ? `${sH}h ${sM < 10 ? '0' : ''}${sM}m` : `${sH}h 00m`,
        };
      })
      .sort((a, b) => b.count - a.count);

    const filledMetrics = Array.from(filledMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const avgMinutes = operationsCount > 0 ? Math.round(totalMin / operationsCount) : 0;

    return {
      totalFlightMinutes: totalMin,
      totalFlightHoursFormatted: formattedFlightHours,
      agentMetrics: metrics,
      flightServicesBreakdown: flightServices,
      filledByMetrics: filledMetrics,
      totalOperationsCount: operationsCount,
      avgOperationMinutes: avgMinutes,
    };
  }, [orders]);

  const resetToSampleData = () => {
    setCompanyState(initialCompany);
    setUsers(initialUsers);
    setClients(initialClients);
    setEquipments(initialEquipments);
    setLaborServices(initialLaborServices);
    setOrders(initialOrders);
    setInvoices(initialInvoices);
  };

  const clearOrders = () => {
    setOrders([]);
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}orders`, JSON.stringify([]));
  };

  const clearInvoices = () => {
    setInvoices([]);
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}invoices`, JSON.stringify([]));
  };

  const clearAllData = (scope: 'all' | 'orders_and_invoices' | 'empty_database' = 'all') => {
    if (scope === 'orders_and_invoices') {
      setOrders([]);
      setInvoices([]);
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}orders`, JSON.stringify([]));
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}invoices`, JSON.stringify([]));
    } else {
      setOrders([]);
      setInvoices([]);
      setClients([]);
      setEquipments([]);
      setLaborServices([]);
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}orders`, JSON.stringify([]));
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}invoices`, JSON.stringify([]));
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}clients`, JSON.stringify([]));
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}equipments`, JSON.stringify([]));
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}laborServices`, JSON.stringify([]));
    }
  };

  return (
    <AppContext.Provider
      value={{
        company,
        setCompany,
        clients,
        equipments,
        laborServices,
        orders,
        invoices,
        syncWithGoogleSheet,
        importRawSheetData,
        pushOrdersToGoogleSheet,
        isSyncingSheets,
        lastAutoSyncTime,
        isAutoSyncActive,
        users,
        currentUser,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        loginCorporateUser,
        changeUserPassword,
        resetUserPasswordByAdmin,
        logoutUser,
        addOrder,
        updateOrder,
        deleteOrder,
        supervisorDeleteOrder,
        restoreDeletedOrder,
        validateOrder,
        rejectOrderWithNotes,
        signOrder,
        addPhotoToOrder,
        deletePhotoFromOrder,
        toggleChecklistItem,
        updateOrderStatus,
        createInvoiceForOrder,
        createBatchInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        addClient,
        updateClient,
        deleteClient,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        addLaborService,
        updateLaborService,
        deleteLaborService,
        selectedOrderForDetail,
        setSelectedOrderForDetail,
        selectedOrderForFieldMode,
        setSelectedOrderForFieldMode,
        selectedOrderForPrint,
        setSelectedOrderForPrint,
        isCheckingGlobalStatus,
        systemStatus,
        isMaintenanceMode,
        setMaintenanceMode,
        reopenSystemGlobally,
        isSessionUnlocked,
        unlockSession,
        lockSession,
        changeMasterPassword,
        isExecutiveUnlocked,
        unlockExecutiveSession,
        lockExecutiveSession,
        unbilledCompletedOrders,
        pendingValidationOrders,
        deletedOrders,
        overdueBillingOrders,
        totalFlightMinutes,
        totalFlightHoursFormatted,
        agentMetrics,
        flightServicesBreakdown,
        filledByMetrics,
        totalOperationsCount,
        avgOperationMinutes,
        resetToSampleData,
        clearAllData,
        clearOrders,
        clearInvoices,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
