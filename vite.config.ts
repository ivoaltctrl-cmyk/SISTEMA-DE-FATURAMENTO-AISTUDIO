import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const MASTER_EMAIL = (process.env.MASTER_EMAIL || 'ivoaltctrl@gmail.com').toLowerCase().trim();
const RAW_MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin';
const SALT = '_WFS_GOVERNANCE_SALT_2026_';

const hashPassword = (plain: string): string => {
  if (!plain) return '';
  return crypto.createHash('sha256').update(plain.trim() + SALT).digest('hex');
};

const verifyPassword = (plain: string, storedHashOrPlain: string): boolean => {
  if (!plain || !storedHashOrPlain) return false;
  const trimmed = plain.trim();
  if (storedHashOrPlain === trimmed) return true;
  return hashPassword(trimmed) === storedHashOrPlain;
};

let devUsers: any[] = [
  {
    id: 'usr-master-ivo',
    name: 'Ivo (Master Administrador)',
    email: MASTER_EMAIL,
    section: 'Diretoria & Governança',
    roleTitle: 'Administrador Geral & Mestre',
    department: 'Governança & TI',
    password: hashPassword(RAW_MASTER_PASSWORD),
    privilege: 'administrador',
    privilegeLabel: 'Administrador Master Geral',
    role: 'master_ti',
    roleLabel: 'Administrador Geral',
    canValidateBilling: true,
    canDeleteOS: true,
    canAccessExecutive: true,
    canAccessSettings: true,
    mustChangePassword: false,
    firstAccess: false,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    phone: '(11) 99999-0000',
    avatarColor: 'bg-slate-900',
  },
];

function sanitizeUser(u: any) {
  const { password, ...safe } = u;
  return safe;
}

// Server-Sent Events (SSE) active client pool for instant cross-browser updates
const sseClients: any[] = [];

const broadcastSystemEvent = (eventData: Record<string, any>) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
};

// Central in-memory state shared across all sessions
let sharedAppState: any = {
  orders: [],
  invoices: [],
  clients: [],
  equipments: [],
  laborServices: [],
  company: null,
  updatedAt: new Date().toISOString(),
  lastSheetSync: null,
};

// CSV parsing helper
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseOrdersFromCsv(text: string): any[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parsedRows = lines.map(parseCsvLine);
  if (parsedRows.length === 0) return [];

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(parsedRows.length, 10); i++) {
    const rowStr = parsedRows[i].join(' ').toLowerCase();
    if (
      rowStr.includes('número os') ||
      rowStr.includes('numero os') ||
      (rowStr.includes('cliente') && (rowStr.includes('serviço') || rowStr.includes('valor') || rowStr.includes('status')))
    ) {
      headerIdx = i;
      break;
    }
  }

  const dataRows = headerIdx >= 0 ? parsedRows.slice(headerIdx + 1) : parsedRows;
  const orders: any[] = [];

  dataRows.forEach((row, idx) => {
    if (row.length < 2 || row.every((c) => !c || c.trim() === '')) return;
    if (row[0] && row[0].includes('SISTEMA WFS') && row.length === 1) return;

    const numOS = row[0]?.trim() || `OS-${31880 + idx}`;
    if (numOS.toLowerCase() === 'número os' || numOS.toLowerCase() === 'numero os') return;

    const dateTimeRaw = row[1] || '';
    const clientName = row[2] || 'Cliente WFS';
    const clientDoc = row[3] || '-';
    const location = row[4] || 'Aeroporto / Pista';
    const categoryRaw = row[5] || 'Serviços Auxiliares de Transporte';
    const title = row[6] || 'Atendimento Operacional';
    const itemsRaw = row[7] || title;
    const totalAmountRaw = row[8] || '0';
    const statusRaw = row[9] || 'CONCLUÍDA (CAMPO)';
    const agentName = row[10] || 'Operador GSE';
    const startTime = row[11] || '08:00';
    const endTime = row[12] || '17:00';
    const quantity = row[13] || '1';
    const filledBy = row[14] || 'Responsável de Campo';
    const signature = row[15] || '';
    const fotoUrl = row[16] || '';
    const invoiceNum = row[17] || '-';

    const cleanVal = totalAmountRaw.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
    const totalAmount = parseFloat(cleanVal) || 0;

    let status = 'aguardando_validacao';
    const sLow = statusRaw.toLowerCase();
    if (sLow.includes('faturada') || (invoiceNum && invoiceNum !== '-' && invoiceNum.trim() !== '')) {
      status = 'faturada';
    } else if (sLow.includes('paga')) {
      status = 'paga';
    } else if (sLow.includes('cancelada')) {
      status = 'cancelada';
    }

    orders.push({
      id: `sheet-os-${numOS.replace(/[^a-zA-Z0-9]/g, '')}-${idx + 1}`,
      osNumber: numOS,
      clientId: `cli-${clientName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
      clientName,
      clientDocument: clientDoc,
      workLocation: location,
      category: 'misto',
      title,
      description: itemsRaw,
      status,
      technicianName: agentName,
      agentName,
      startTime,
      endTime,
      quantity,
      filledBy,
      createdBy: filledBy,
      createdByRole: 'Encarregado de Campo',
      createdOrigin: 'campo_app',
      createdAt: new Date().toISOString(),
      scheduledDate: dateTimeRaw ? dateTimeRaw.split(' ')[0] : new Date().toISOString().split('T')[0],
      totalAmount,
      canhotoUrl: fotoUrl.startsWith('http') ? fotoUrl : undefined,
      photos: fotoUrl.startsWith('http')
        ? [{ id: `photo-${idx}`, url: fotoUrl, title: 'Foto Canhoto Drive', category: 'canhoto', timestamp: new Date().toISOString() }]
        : [],
      clientSignature: signature && !signature.includes('-') ? { signerName: signature, signedAt: new Date().toISOString() } : undefined,
      invoiceNumber: invoiceNum !== '-' ? invoiceNum : undefined,
    });
  });

  return orders;
}

function parseUsersFromCsv(text: string): any[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parsedRows = lines.map(parseCsvLine);
  if (parsedRows.length < 2) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(parsedRows.length, 5); i++) {
    const rowStr = parsedRows[i].join(' ').toUpperCase();
    if (rowStr.includes('NOME') && (rowStr.includes('EMAIL') || rowStr.includes('PERFIL') || rowStr.includes('CARGO'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const dataRows = parsedRows.slice(headerIdx + 1);
  const users: any[] = [];

  dataRows.forEach((r, idx) => {
    if (!r || r.length < 2) return;
    const name = r[0]?.trim();
    const email = r[1]?.trim();
    if (!name || !email || email.includes('@example.com')) return;

    const cargo = r[2]?.trim() || 'Operações GSE';
    const rawPass = r[3]?.trim() || '123';
    const perfilRaw = (r[4]?.trim() || 'OPERADOR').toUpperCase();
    const primeiroRaw = (r[5]?.trim() || '').toUpperCase();
    const ativoRaw = (r[6]?.trim() || 'SIM').toUpperCase();

    let privilege = 'operador';
    if (perfilRaw.includes('ADMIN') || perfilRaw.includes('MASTER')) {
      privilege = 'administrador';
    } else if (perfilRaw.includes('SUPERVISOR')) {
      privilege = 'supervisor';
    } else if (perfilRaw.includes('ANALISTA') || perfilRaw.includes('FATURAMENTO')) {
      privilege = 'analista';
    }

    const isMaster = email.toLowerCase() === MASTER_EMAIL;

    const user = {
      id: isMaster ? 'usr-master-ivo' : `usr-sheet-${idx + 1}`,
      name,
      email,
      section: cargo,
      roleTitle: cargo,
      department: cargo,
      password: isMaster ? hashPassword(RAW_MASTER_PASSWORD) : hashPassword(rawPass),
      privilege,
      privilegeLabel: isMaster
        ? 'Administrador Master Geral'
        : privilege === 'supervisor'
        ? 'Supervisor de Operações'
        : privilege === 'analista'
        ? 'Analista de Faturamento'
        : 'Operador de Campo',
      role: isMaster ? 'master_ti' : privilege === 'supervisor' ? 'supervisor' : privilege === 'analista' ? 'faturamento' : 'operador_campo',
      roleLabel: cargo,
      canValidateBilling: privilege === 'administrador' || privilege === 'supervisor' || privilege === 'analista',
      canDeleteOS: privilege === 'administrador' || privilege === 'supervisor',
      canAccessExecutive: privilege === 'administrador' || privilege === 'supervisor' || privilege === 'analista',
      canAccessSettings: privilege === 'administrador' || privilege === 'supervisor',
      mustChangePassword: primeiroRaw === 'SIM',
      firstAccess: primeiroRaw === 'SIM',
      active: ativoRaw !== 'NÃO' && ativoRaw !== 'NAO' && ativoRaw !== 'FALSE',
      createdAt: new Date().toISOString(),
      avatarColor: isMaster ? 'bg-slate-900' : 'bg-red-600',
    };

    users.push(user);
  });

  return users;
}

let lastUsersCsvHash = '';

async function autoSyncGoogleSheetUsers() {
  try {
    const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
    const gid = '2018208122';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return;
    const text = await res.text();
    if (!text || text.includes('<html') || text.includes('accounts.google.com')) return;

    const hash = `${text.length}_${text.slice(0, 80)}`;
    if (hash === lastUsersCsvHash && devUsers.length > 1) return;
    lastUsersCsvHash = hash;

    const parsedUsers = parseUsersFromCsv(text);
    if (parsedUsers.length > 0) {
      const existingMap = new Map<string, any>();
      devUsers.forEach((u: any) => existingMap.set(u.email.toLowerCase(), u));

      parsedUsers.forEach((newU: any) => {
        const key = newU.email.toLowerCase();
        const existing = existingMap.get(key);
        if (existing) {
          existingMap.set(key, { ...existing, ...newU, password: existing.password || newU.password });
        } else {
          existingMap.set(key, newU);
        }
      });

      const updated = Array.from(existingMap.values());
      devUsers = updated;

      broadcastSystemEvent({
        type: 'USERS_CHANGE',
        users: devUsers.map(sanitizeUser),
        source: 'google_sheets_auto_sync',
        timestamp: new Date().toISOString(),
      });
      console.log(`[AUTO-SYNC] Usuários da Planilha sincronizados: ${devUsers.length} usuários disponíveis.`);
    }
  } catch (err: any) {
    console.warn('[AUTO-SYNC] Aviso ao sincronizar usuários da Planilha:', err.message);
  }
}

let lastCsvHash = '';
let isAutoSyncing = false;

async function autoSyncGoogleSheets() {
  if (isAutoSyncing) return;
  isAutoSyncing = true;
  try {
    await autoSyncGoogleSheetUsers();

    const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
    const gid = '0';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return;
    const text = await res.text();
    if (!text || text.includes('<html') || text.includes('accounts.google.com')) return;

    const hash = `${text.length}_${text.slice(0, 100)}_${text.slice(-100)}`;
    const shouldUpdate = hash !== lastCsvHash || !sharedAppState.orders || sharedAppState.orders.length === 0;

    if (shouldUpdate) {
      lastCsvHash = hash;
      const parsed = parseOrdersFromCsv(text);
      if (parsed.length > 0) {
        const existingMap = new Map<string, any>();
        (sharedAppState.orders || [])
          .forEach((o: any) => existingMap.set(o.id, o));

        parsed.forEach((newOrd: any) => {
          const existing = existingMap.get(newOrd.id);
          if (existing) {
            existingMap.set(newOrd.id, {
              ...existing,
              ...newOrd,
              clientSignature: existing.clientSignature || newOrd.clientSignature,
              photos: existing.photos && existing.photos.length > 0 ? existing.photos : newOrd.photos,
              checklist: existing.checklist && existing.checklist.length > 0 ? existing.checklist : newOrd.checklist,
              status: (existing.status === 'faturada' || existing.status === 'paga' || existing.status === 'validada') ? existing.status : newOrd.status,
            });
          } else {
            existingMap.set(newOrd.id, newOrd);
          }
        });

        sharedAppState.orders = Array.from(existingMap.values());
        sharedAppState.updatedAt = new Date().toISOString();
        sharedAppState.lastSheetSync = new Date().toISOString();

        console.log(`[AUTO-SYNC] Google Sheets sincronizado com sucesso: ${sharedAppState.orders.length} ordens disponíveis. Notificando clientes via SSE...`);

        broadcastSystemEvent({
          type: 'STATE_CHANGE',
          appState: sharedAppState,
          source: 'google_sheets_auto_sync',
          lastSheetSync: sharedAppState.lastSheetSync,
          totalOrders: sharedAppState.orders.length,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err: any) {
    console.warn('[AUTO-SYNC] Aviso ao sincronizar com Google Sheets:', err.message);
  } finally {
    isAutoSyncing = false;
  }
}

function apiServerPlugin(): Plugin {
  let devIsMaintenance = false;
  let devStatus: 'ABERTO' | 'FECHADO' = 'ABERTO';

  const handler = async (req: any, res: any, next: any) => {
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const pathname = (req.url || '').split('?')[0].replace(/\/$/, '') || '/';

    // Auth login endpoint
    if ((pathname === '/api/auth/login' || req.url === '/api/auth/login') && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const { email, password, requiredArea } = JSON.parse(body || '{}');
          const cleanEmail = (email || '').trim().toLowerCase();
          const cleanPassword = (password || '').trim();

          let user = devUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
          if (!user && cleanEmail === MASTER_EMAIL) {
            user = {
              id: 'usr-master-ivo',
              name: 'Ivo (Master Administrador)',
              email: MASTER_EMAIL,
              section: 'Diretoria & Governança',
              roleTitle: 'Administrador Geral & Mestre',
              department: 'Governança & TI',
              password: hashPassword(RAW_MASTER_PASSWORD),
              privilege: 'administrador',
              privilegeLabel: 'Administrador Master Geral',
              role: 'master_ti',
              roleLabel: 'Administrador Geral',
              canValidateBilling: true,
              canDeleteOS: true,
              canAccessExecutive: true,
              canAccessSettings: true,
              mustChangePassword: false,
              firstAccess: false,
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              avatarColor: 'bg-slate-900',
            };
            devUsers.unshift(user);
          }

          if (!user) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado.' }));
            return;
          }

          const isPassValid =
            verifyPassword(cleanPassword, user.password) ||
            (cleanEmail === MASTER_EMAIL && (cleanPassword === RAW_MASTER_PASSWORD || cleanPassword === 'admin'));

          if (!isPassValid) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Senha incorreta.' }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: `Bem-vindo(a), ${user.name}!`,
            user: sanitizeUser(user),
            mustChangePassword: Boolean(user.mustChangePassword),
            isMaster: user.email.toLowerCase() === MASTER_EMAIL,
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // Change Password endpoint
    if (req.url === '/api/auth/change-password' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const { email, currentPassword, newPassword } = JSON.parse(body || '{}');
          const cleanEmail = (email || '').trim().toLowerCase();
          const cleanNewPass = (newPassword || '').trim();

          const user = devUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
          if (!user) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado.' }));
            return;
          }

          if (!user.mustChangePassword && currentPassword && !verifyPassword(currentPassword, user.password)) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Senha atual incorreta.' }));
            return;
          }

          user.password = hashPassword(cleanNewPass);
          user.mustChangePassword = false;
          user.firstAccess = false;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: 'Senha alterada com sucesso!',
            user: sanitizeUser(user),
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // Reset Password endpoint
    if (req.url === '/api/auth/reset-password' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const { adminEmail, adminPassword, targetUserId, newTemporaryPassword } = JSON.parse(body || '{}');
          const targetUser = devUsers.find((u) => u.id === targetUserId);
          if (!targetUser) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado.' }));
            return;
          }

          const tempPass = (newTemporaryPassword || '123456').trim();
          targetUser.password = hashPassword(tempPass);
          targetUser.mustChangePassword = true;
          targetUser.firstAccess = true;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: `Senha resetada com sucesso para "${tempPass}".`,
            temporaryPassword: tempPass,
            user: sanitizeUser(targetUser),
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // Users sync sheet
    if (req.url?.startsWith('/api/users/sync-sheet') && req.method === 'GET') {
      try {
        const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
        const gid = '2018208122';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (response.ok) {
          const csv = await response.text();
          if (csv && !csv.includes('<html') && !csv.includes('accounts.google.com')) {
            const parsedUsers = parseUsersFromCsv(csv);
            if (parsedUsers.length > 0) {
              const existingMap = new Map<string, any>();
              devUsers.forEach((u: any) => existingMap.set(u.email.toLowerCase(), u));

              parsedUsers.forEach((newU: any) => {
                const key = newU.email.toLowerCase();
                const existing = existingMap.get(key);
                if (existing) {
                  existingMap.set(key, { ...existing, ...newU, password: existing.password || newU.password });
                } else {
                  existingMap.set(key, newU);
                }
              });

              devUsers = Array.from(existingMap.values());

              broadcastSystemEvent({
                type: 'USERS_CHANGE',
                users: devUsers.map(sanitizeUser),
                source: 'google_sheets_sync',
                timestamp: new Date().toISOString(),
              });
            }
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, users: devUsers.map(sanitizeUser), count: devUsers.length, source: 'google_sheets_tab', gid }));
          return;
        }
      } catch (err: any) {
        console.warn('Error syncing users in vite dev:', err);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, users: devUsers.map(sanitizeUser), count: devUsers.length, source: 'memory' }));
      return;
    }
    // Server-Sent Events (SSE) Real-Time Synchronization Endpoint
    if (req.url === '/api/system/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const initPayload = JSON.stringify({
        type: 'INIT',
        status: devStatus,
        isMaintenanceMode: devIsMaintenance,
        masterEmail: MASTER_EMAIL,
        users: devUsers.map(sanitizeUser),
        appState: sharedAppState,
        lastSheetSync: sharedAppState.lastSheetSync,
        serverTime: new Date().toISOString(),
      });
      res.write(`data: ${initPayload}\n\n`);
      sseClients.push(res);

      const heartbeat = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.on('close', () => {
        clearInterval(heartbeat);
        const idx = sseClients.indexOf(res);
        if (idx !== -1) sseClients.splice(idx, 1);
      });
      return;
    }

    // Shared State sync endpoint (GET & POST)
    if (req.url === '/api/state' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          appState: sharedAppState,
          isMaintenanceMode: devIsMaintenance,
          lastSheetSync: sharedAppState.lastSheetSync,
          updatedAt: sharedAppState.updatedAt,
        })
      );
      return;
    }

    if (req.url === '/api/state' && req.method === 'POST') {
      let body = '';
      req.on('data', (c: any) => {
        body += c;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (Array.isArray(parsed.orders)) {
            sharedAppState.orders = parsed.orders;
          }
          if (Array.isArray(parsed.invoices)) sharedAppState.invoices = parsed.invoices;
          if (Array.isArray(parsed.clients)) sharedAppState.clients = parsed.clients;
          if (Array.isArray(parsed.equipments)) sharedAppState.equipments = parsed.equipments;
          if (Array.isArray(parsed.laborServices)) sharedAppState.laborServices = parsed.laborServices;
          if (parsed.company) sharedAppState.company = parsed.company;
          sharedAppState.updatedAt = new Date().toISOString();

          broadcastSystemEvent({
            type: 'STATE_CHANGE',
            appState: sharedAppState,
            source: 'client_state_update',
            timestamp: new Date().toISOString(),
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, message: 'Estado global sincronizado no servidor.' }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // Orders REST API
    if (req.url?.startsWith('/api/ordens') && req.method === 'GET') {
      if (!sharedAppState.orders || sharedAppState.orders.length === 0) {
        await autoSyncGoogleSheets();
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          orders: sharedAppState.orders || [],
          total: (sharedAppState.orders || []).length,
          lastSheetSync: sharedAppState.lastSheetSync,
          source: 'server_state',
        })
      );
      return;
    }

    if (req.url === '/api/ordens' && req.method === 'POST') {
      let body = '';
      req.on('data', (c: any) => {
        body += c;
      });
      req.on('end', () => {
        try {
          const newOrder = JSON.parse(body || '{}');
          if (!newOrder.id) newOrder.id = `os-${Date.now()}`;
          if (!sharedAppState.orders) sharedAppState.orders = [];
          sharedAppState.orders.unshift(newOrder);
          sharedAppState.updatedAt = new Date().toISOString();

          broadcastSystemEvent({
            type: 'STATE_CHANGE',
            appState: sharedAppState,
            source: 'order_create',
            orderId: newOrder.id,
            timestamp: new Date().toISOString(),
          });

          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, order: newOrder }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.url?.startsWith('/api/ordens/') && req.method === 'PUT') {
      const id = decodeURIComponent(req.url.replace('/api/ordens/', '').split('?')[0]);
      let body = '';
      req.on('data', (c: any) => {
        body += c;
      });
      req.on('end', () => {
        try {
          const updates = JSON.parse(body || '{}');
          if (!sharedAppState.orders) sharedAppState.orders = [];
          let updatedOrder: any = null;
          sharedAppState.orders = sharedAppState.orders.map((o: any) => {
            if (o.id === id) {
              updatedOrder = { ...o, ...updates };
              return updatedOrder;
            }
            return o;
          });
          sharedAppState.updatedAt = new Date().toISOString();

          broadcastSystemEvent({
            type: 'STATE_CHANGE',
            appState: sharedAppState,
            source: 'order_update',
            orderId: id,
            timestamp: new Date().toISOString(),
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, order: updatedOrder }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.url?.startsWith('/api/ordens/') && req.method === 'DELETE') {
      const id = decodeURIComponent(req.url.replace('/api/ordens/', '').split('?')[0]);
      if (!sharedAppState.orders) sharedAppState.orders = [];
      sharedAppState.orders = sharedAppState.orders.filter((o: any) => o.id !== id);
      sharedAppState.updatedAt = new Date().toISOString();

      broadcastSystemEvent({
        type: 'STATE_CHANGE',
        appState: sharedAppState,
        source: 'order_delete',
        orderId: id,
        timestamp: new Date().toISOString(),
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: 'OS removida com sucesso.' }));
      return;
    }

    // Users CRUD Endpoints
    if (req.url === '/api/users' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, users: devUsers.map(sanitizeUser) }));
      return;
    }

    if (req.url === '/api/users' && req.method === 'POST') {
      let body = '';
      req.on('data', (c: any) => {
        body += c;
      });
      req.on('end', () => {
        try {
          const newUser = JSON.parse(body || '{}');
          if (!newUser.id) newUser.id = `usr-${Date.now()}`;
          const plainPass = newUser.password || '123';
          newUser.password = hashPassword(plainPass);
          devUsers.push(newUser);

          broadcastSystemEvent({
            type: 'USERS_CHANGE',
            users: devUsers.map(sanitizeUser),
            source: 'user_create',
            timestamp: new Date().toISOString(),
          });

          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, user: sanitizeUser(newUser) }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.url?.startsWith('/api/users/') && req.method === 'PUT') {
      const id = decodeURIComponent(req.url.replace('/api/users/', '').split('?')[0]);
      let body = '';
      req.on('data', (c: any) => {
        body += c;
      });
      req.on('end', () => {
        try {
          const updates = JSON.parse(body || '{}');
          let updatedUser: any = null;
          devUsers = devUsers.map((u: any) => {
            if (u.id === id) {
              updatedUser = { ...u, ...updates };
              if (updates.password) {
                updatedUser.password = hashPassword(updates.password);
              }
              return updatedUser;
            }
            return u;
          });

          broadcastSystemEvent({
            type: 'USERS_CHANGE',
            users: devUsers.map(sanitizeUser),
            source: 'user_update',
            timestamp: new Date().toISOString(),
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, user: sanitizeUser(updatedUser) }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.url?.startsWith('/api/users/') && req.method === 'DELETE') {
      const id = decodeURIComponent(req.url.replace('/api/users/', '').split('?')[0]);
      devUsers = devUsers.filter((u: any) => u.id !== id);

      broadcastSystemEvent({
        type: 'USERS_CHANGE',
        users: devUsers.map(sanitizeUser),
        source: 'user_delete',
        timestamp: new Date().toISOString(),
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: 'Usuário removido com sucesso.' }));
      return;
    }

    // Health Check endpoint for connection testing
    if (req.url === '/api/system/health' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        server: 'online',
        message: 'Conexão Front-End ↔ Back-End 100% ativa e operacional!',
        isMaintenanceMode: devIsMaintenance,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // System Status endpoint
    if (req.url === '/api/system/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        status: devStatus,
        isMaintenanceMode: devIsMaintenance,
        masterEmail: 'ivoaltctrl@gmail.com',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // System Maintenance toggle endpoint
    if (req.url === '/api/system/maintenance' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const isClosed = parsed.status === 'FECHADO' || Boolean(parsed.active);
          devIsMaintenance = isClosed;
          devStatus = isClosed ? 'FECHADO' : 'ABERTO';
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            status: devStatus,
            isMaintenanceMode: devIsMaintenance,
            message: isClosed ? 'Sistema FECHADO' : 'Sistema ABERTO',
            timestamp: new Date().toISOString(),
          }));
        } catch {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, status: devStatus, isMaintenanceMode: devIsMaintenance }));
        }
      });
      return;
    }

    // Sheets System Status proxy endpoint
    if (req.url?.startsWith('/api/sheets/system-status') && req.method === 'GET') {
      try {
        const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Status`;
        const sheetRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (sheetRes.ok) {
          const text = await sheetRes.text();
          const isClosed = text.toUpperCase().includes('FECHADO') || text.toUpperCase().includes('BLOQUEADO') || text.toUpperCase().includes('OFFLINE');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            status: isClosed ? 'FECHADO' : 'ABERTO',
            isMaintenanceMode: isClosed,
            rawText: text.slice(0, 300),
            source: 'google_sheets',
          }));
          return;
        }
      } catch {}
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, status: 'ABERTO', isMaintenanceMode: false, source: 'fallback' }));
      return;
    }

    if ((pathname === '/api/digitize-os' || req.url === '/api/digitize-os') && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body);
            const { image, mimeType = 'image/jpeg' } = parsedBody;

            if (!image) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Nenhuma imagem enviada para digitalização.' }));
              return;
            }

            // Strip base64 prefix if present
            const cleanBase64 = image.includes('base64,')
              ? image.split('base64,')[1]
              : image;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY não configurada no ambiente.' }));
              return;
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const prompt = `Você é um perito em digitalização de Ordens de Serviço (OS) físicas, canhotos de papel, fichas de locação e relatórios de campo de prestação de serviços e equipamentos da WFS.
Analise a imagem da Ordem de Serviço física fornecida. Extraia minuciosamente todos os campos possíveis.

IMPORTANTE PARA CAMPOS COM DÚVIDA / ILEGÍVEIS:
- Se você identificar com clareza um dado, preencha o valor e marque o campo correspondente em "confidence" como true.
- Se algum texto estiver ilegível, borrado, rasurado, cortado ou faltante:
  1. Preencha com string vazia "" ou deixe em branco.
  2. Marque o campo em "confidence" como false.
  3. Adicione uma mensagem explicativa em "uncertainReasons" (ex: {"clientDocument": "CNPJ com caligrafia ilegível no papel", "totalAmount": "Valor final rasurado"}).
- Para equipamentos e mão de obra, tente identificar nomes, quantidades e valores. Se tiver dúvida em algum item, marque isUncertain: true nele.
- A categoria deve ser uma das: "locacao", "mao_de_obra", "servico_tecnico" ou "misto".
- Se a data não estiver legível, use a data de hoje no formato YYYY-MM-DD.`;

            const result = await ai.models.generateContent({
              model: 'gemini-flash-latest',
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: mimeType || 'image/jpeg',
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    osNumber: { type: Type.STRING },
                    clientName: { type: Type.STRING },
                    clientDocument: { type: Type.STRING },
                    clientPhone: { type: Type.STRING },
                    workLocation: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: ['locacao', 'mao_de_obra', 'servico_tecnico', 'misto'],
                    },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    scheduledDate: { type: Type.STRING },
                    technicianName: { type: Type.STRING },
                    equipmentItems: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          unit: {
                            type: Type.STRING,
                            enum: ['diaria', 'hora', 'mes', 'semana'],
                          },
                          quantity: { type: Type.NUMBER },
                          unitPrice: { type: Type.NUMBER },
                          notes: { type: Type.STRING },
                          isUncertain: { type: Type.BOOLEAN },
                        },
                        required: ['name', 'unit', 'quantity', 'unitPrice'],
                      },
                    },
                    laborItems: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          unit: {
                            type: Type.STRING,
                            enum: ['hora', 'diaria', 'homem_hora', 'servico'],
                          },
                          quantity: { type: Type.NUMBER },
                          unitPrice: { type: Type.NUMBER },
                          technicianName: { type: Type.STRING },
                          notes: { type: Type.STRING },
                          isUncertain: { type: Type.BOOLEAN },
                        },
                        required: ['name', 'unit', 'quantity', 'unitPrice'],
                      },
                    },
                    materialItems: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          unit: { type: Type.STRING },
                          quantity: { type: Type.NUMBER },
                          unitPrice: { type: Type.NUMBER },
                        },
                        required: ['name', 'unit', 'quantity', 'unitPrice'],
                      },
                    },
                    discount: { type: Type.NUMBER },
                    addition: { type: Type.NUMBER },
                    totalAmount: { type: Type.NUMBER },
                    observations: { type: Type.STRING },
                    confidence: {
                      type: Type.OBJECT,
                      properties: {
                        clientName: { type: Type.BOOLEAN },
                        clientDocument: { type: Type.BOOLEAN },
                        workLocation: { type: Type.BOOLEAN },
                        title: { type: Type.BOOLEAN },
                        scheduledDate: { type: Type.BOOLEAN },
                        technicianName: { type: Type.BOOLEAN },
                        totalAmount: { type: Type.BOOLEAN },
                        items: { type: Type.BOOLEAN },
                      },
                      required: [
                        'clientName',
                        'workLocation',
                        'title',
                        'scheduledDate',
                        'technicianName',
                        'totalAmount',
                      ],
                    },
                    uncertainReasons: {
                      type: Type.OBJECT,
                    },
                  },
                  required: [
                    'clientName',
                    'workLocation',
                    'title',
                    'scheduledDate',
                    'category',
                    'totalAmount',
                    'confidence',
                  ],
                },
              },
            });

            const rawJson = result.text || '';
            const jsonResponse = JSON.parse(rawJson || '{}');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(jsonResponse));
          } catch (innerErr: any) {
            console.error('OCR Processing error:', innerErr);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error:
                  innerErr.message ||
                  'Erro ao processar imagem da OS com o modelo de inteligência artificial.',
              })
            );
          }
        });
      } catch (e: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (req.url === '/api/sheets/fetch' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            const { sheetUrl, sheetId: customSheetId, gid: customGid } = parsedBody;
            let sheetId = customSheetId || '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
            let gid = customGid || '0';

            if (sheetUrl) {
              const matchId = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
              if (matchId && matchId[1]) sheetId = matchId[1];
              const matchGid = sheetUrl.match(/gid=([0-9]+)/);
              if (matchGid && matchGid[1]) gid = matchGid[1];
            }

            const urls = [
              `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
              `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`,
            ];

            let csvData = '';
            let lastError = '';

            for (const url of urls) {
              try {
                const response = await fetch(url, {
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  },
                  redirect: 'follow',
                });
                if (response.ok) {
                  const text = await response.text();
                  if (
                    text.includes('<html') ||
                    text.includes('accounts.google.com') ||
                    text.includes('ServiceLogin') ||
                    text.includes('Sign in - Google Accounts')
                  ) {
                    lastError =
                      'A planilha está com acesso "Restrito" no Google Drive. Para leitura direta, configure o link da planilha como "Qualquer pessoa com o link (Leitor)" ou use o botão "Importar / Colar Planilha".';
                    continue;
                  }
                  if (text.trim().length > 0) {
                    csvData = text;
                    break;
                  }
                } else {
                  lastError = `Google Sheets retornou status HTTP ${response.status}. Verifique se a planilha está compartilhada publicamente.`;
                }
              } catch (err: any) {
                lastError = err.message || 'Erro ao conectar ao Google Sheets.';
              }
            }

            if (csvData) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, csvText: csvData, sheetId, gid }));
            } else {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    lastError ||
                    'Não foi possível baixar os dados da planilha Google. Verifique o compartilhamento ou use a opção Colar Planilha.',
                })
              );
            }
          } catch (innerErr: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: innerErr.message }));
          }
        });
      } catch (e: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    next();
  };

  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
      setTimeout(() => {
        autoSyncGoogleSheets();
      }, 1000);
      setInterval(() => {
        autoSyncGoogleSheets();
      }, 15000);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
      setTimeout(() => {
        autoSyncGoogleSheets();
      }, 1000);
      setInterval(() => {
        autoSyncGoogleSheets();
      }, 15000);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
